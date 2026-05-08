import cors from "cors";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import express from "express";
import morgan from "morgan";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 5000);
const MODEL_ID = process.env.MODEL_ID || "sailu4/legal-request-classification-nlp-model";
const HF_API_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
const ALLOW_DEMO_FALLBACK = process.env.ALLOW_DEMO_FALLBACK !== "false";
const INFERENCE_ENGINE = process.env.INFERENCE_ENGINE || "python";
const PYTHON_BIN = process.env.PYTHON_BIN || "python";
const PYTHON_SCRIPT = path.join(__dirname, "predict_worker.py");
let pythonWorker = null;
let pythonStdoutBuffer = "";
let pythonLastStderr = "";
let pythonRequestId = 0;
const pythonPending = new Map();

const LABELS = ["criminal-law", "employment", "tax-law", "trademark"];

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    modelId: MODEL_ID,
    inferenceEngine: INFERENCE_ENGINE,
    hasToken: Boolean(HF_TOKEN)
  });
});

app.post("/api/predict", async (req, res) => {
  const text = String(req.body?.text || "").trim();

  if (!text) {
    return res.status(400).json({ error: "Text is required." });
  }

  if (text.length > 4000) {
    return res.status(413).json({ error: "Text is too long. Please keep it under 4,000 characters." });
  }

  try {
    const prediction = await classify(text);
    return res.json(prediction);
  } catch (error) {
    if (ALLOW_DEMO_FALLBACK) {
      return res.json({
        ...classifyWithDemoFallback(text),
        warning: error.message,
        source: "demo-fallback"
      });
    }

    return res.status(error.status || 502).json({
      error: error.message || "Prediction request failed."
    });
  }
});

async function classify(text) {
  if (INFERENCE_ENGINE === "huggingface") {
    return classifyWithHuggingFace(text);
  }

  if (INFERENCE_ENGINE === "auto") {
    try {
      return await classifyWithLocalPython(text);
    } catch {
      return classifyWithHuggingFace(text);
    }
  }

  return classifyWithLocalPython(text);
}

async function classifyWithLocalPython(text) {
  const payload = await runPythonPredictor({ text, modelId: MODEL_ID });
  const predictions = normalizePredictions(payload.predictions);
  const topPrediction = predictions[0];

  if (!topPrediction) {
    throw new Error("The local model returned an empty prediction.");
  }

  return {
    label: topPrediction.label,
    score: topPrediction.score,
    predictions,
    source: "local-python",
    modelId: MODEL_ID
  };
}

function runPythonPredictor(input) {
  return new Promise((resolve, reject) => {
    const child = getPythonWorker();
    const requestId = String(++pythonRequestId);

    const timeout = setTimeout(() => {
      pythonPending.delete(requestId);
      reject(new Error("Local model inference timed out."));
    }, 180000);

    pythonPending.set(requestId, {
      resolve: (payload) => {
        clearTimeout(timeout);
        resolve(payload);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    });

    child.stdin.write(`${JSON.stringify({ ...input, requestId })}\n`);
  });
}

function getPythonWorker() {
  if (pythonWorker && !pythonWorker.killed) {
    return pythonWorker;
  }

  pythonLastStderr = "";
  pythonStdoutBuffer = "";
  pythonWorker = spawn(PYTHON_BIN, [PYTHON_SCRIPT], {
    env: {
      ...process.env,
      MODEL_ID,
      TF_CPP_MIN_LOG_LEVEL: "3",
      TRANSFORMERS_NO_TF: "1",
      USE_TF: "0"
    },
    stdio: ["pipe", "pipe", "pipe"]
  });

  pythonWorker.stdout.on("data", (chunk) => {
    pythonStdoutBuffer += chunk.toString();
    const lines = pythonStdoutBuffer.split(/\r?\n/);
    pythonStdoutBuffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      let payload;

      try {
        payload = JSON.parse(line);
      } catch {
        continue;
      }

      const pending = pythonPending.get(String(payload.requestId));
      if (!pending) {
        continue;
      }

      pythonPending.delete(String(payload.requestId));

      if (payload.error) {
        pending.reject(new Error(payload.error));
      } else {
        pending.resolve(payload);
      }
    }
  });

  pythonWorker.stderr.on("data", (chunk) => {
    pythonLastStderr += chunk.toString();
  });

  pythonWorker.on("error", (error) => {
    for (const pending of pythonPending.values()) {
      pending.reject(error);
    }
    pythonPending.clear();
  });

  pythonWorker.on("close", (code) => {
    const message = pythonLastStderr.trim() || `Python predictor exited with code ${code}.`;
    for (const pending of pythonPending.values()) {
      pending.reject(new Error(message));
    }
    pythonPending.clear();
    pythonWorker = null;
  });

  return pythonWorker;
}

async function classifyWithHuggingFace(text) {
  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {})
    },
    body: JSON.stringify({
      inputs: text,
      options: {
        wait_for_model: true
      }
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.error || `Hugging Face API returned ${response.status}.`);
    error.status = response.status;
    throw error;
  }

  const predictions = normalizePredictions(payload);
  const topPrediction = predictions[0];

  if (!topPrediction) {
    throw new Error("The model returned an empty prediction.");
  }

  return {
    label: topPrediction.label,
    score: topPrediction.score,
    predictions,
    source: "huggingface",
    modelId: MODEL_ID
  };
}

function normalizePredictions(payload) {
  const rawPredictions = Array.isArray(payload?.[0]) ? payload[0] : payload;

  if (!Array.isArray(rawPredictions)) {
    return [];
  }

  return rawPredictions
    .map((item) => ({
      label: String(item.label || "").toLowerCase(),
      score: Number(item.score || 0)
    }))
    .filter((item) => item.label)
    .sort((a, b) => b.score - a.score);
}

function classifyWithDemoFallback(text) {
  const lowerText = text.toLowerCase();
  const keywordMap = {
    "criminal-law": ["crime", "criminal", "police", "arrest", "court", "prison", "charge", "assault"],
    employment: ["job", "employee", "employer", "salary", "fired", "work", "contract", "workplace"],
    "tax-law": ["tax", "irs", "income", "deduction", "refund", "vat", "audit", "payment"],
    trademark: ["brand", "logo", "trademark", "copyright", "name", "registered", "infringement"]
  };

  const scores = LABELS.map((label) => {
    const matches = keywordMap[label].filter((keyword) => lowerText.includes(keyword)).length;
    return {
      label,
      score: 0.12 + matches * 0.24
    };
  });

  const total = scores.reduce((sum, item) => sum + item.score, 0);
  const predictions = scores
    .map((item) => ({
      label: item.label,
      score: item.score / total
    }))
    .sort((a, b) => b.score - a.score);

  return {
    label: predictions[0].label,
    score: predictions[0].score,
    predictions,
    modelId: MODEL_ID
  };
}

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
