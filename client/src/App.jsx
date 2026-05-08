import { AlertCircle, BadgeCheck, BrainCircuit, Loader2, Scale, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const labelMeta = {
  "criminal-law": {
    title: "Criminal Law",
    color: "#bf3f49",
    soft: "#fae8e9"
  },
  employment: {
    title: "Employment",
    color: "#2f7665",
    soft: "#e2f4ef"
  },
  "tax-law": {
    title: "Tax Law",
    color: "#9a681f",
    soft: "#fff1d7"
  },
  trademark: {
    title: "Trademark",
    color: "#4f67b0",
    soft: "#e9edff"
  }
};

const samples = [
  {
    label: "Tax",
    text: "I received a notice about unpaid income tax and I want to know whether deductions from last year can still be corrected."
  },
  {
    label: "Employment",
    text: "My employer ended my contract without notice after I reported unpaid overtime. What category does this request belong to?"
  },
  {
    label: "Trademark",
    text: "Another company is using a logo and brand name that look very close to mine for the same type of product."
  },
  {
    label: "Criminal",
    text: "A person was arrested after an alleged assault and needs to understand what kind of legal issue this is."
  }
];

function App() {
  const [text, setText] = useState(samples[0].text);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const characterCount = text.trim().length;
  const activeMeta = result ? labelMeta[result.label] || labelMeta[result.predictions?.[0]?.label] : null;

  const sortedPredictions = useMemo(() => {
    if (!result?.predictions) {
      return [];
    }

    return [...result.predictions].sort((a, b) => b.score - a.score);
  }, [result]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!text.trim()) {
      setError("Please enter a legal request.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Prediction failed.");
      }

      setResult(payload);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div className="brand-lockup">
            <div className="brand-mark">
              <Scale size={24} aria-hidden="true" />
            </div>
            <div>
              <h1>Legal Request Classification</h1>
              <p>DistilBERT model viewer</p>
            </div>
          </div>

          <div className="model-pill">
            <BrainCircuit size={18} aria-hidden="true" />
            <span>sailu4/legal-request-classification-nlp-model</span>
          </div>
        </header>

        <div className="layout-grid">
          <section className="panel input-panel" aria-label="Prediction input">
            <form onSubmit={handleSubmit}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Input</span>
                  <h2>Legal request</h2>
                </div>
                <span className="count">{characterCount}/4000</span>
              </div>

              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={4000}
                placeholder="Paste a legal question here..."
              />

              <div className="actions-row">
                <div className="sample-row" aria-label="Sample requests">
                  {samples.map((sample) => (
                    <button
                      className="sample-button"
                      key={sample.label}
                      type="button"
                      onClick={() => {
                        setText(sample.text);
                        setResult(null);
                        setError("");
                      }}
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>

                <button className="submit-button" type="submit" disabled={loading}>
                  {loading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
                  <span>{loading ? "Analyzing" : "Classify"}</span>
                </button>
              </div>
            </form>
          </section>

          <section className="panel result-panel" aria-label="Prediction result">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Output</span>
                <h2>Prediction</h2>
              </div>
              {result?.source && <span className={`source-badge ${result.source}`}>{result.source}</span>}
            </div>

            {error && (
              <div className="message error-message" role="alert">
                <AlertCircle size={20} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {!error && !result && (
              <div className="empty-state">
                <Sparkles size={34} aria-hidden="true" />
                <span>Ready</span>
              </div>
            )}

            {result && (
              <>
                <div
                  className="winner-card"
                  style={{
                    "--label-color": activeMeta?.color || "#1f2937",
                    "--label-soft": activeMeta?.soft || "#eef2f7"
                  }}
                >
                  <div className="winner-icon">
                    <BadgeCheck size={28} aria-hidden="true" />
                  </div>
                  <div>
                    <span className="winner-label">Top category</span>
                    <strong>{activeMeta?.title || result.label}</strong>
                  </div>
                  <span className="winner-score">{formatPercent(result.score)}</span>
                </div>

                <div className="score-list">
                  {sortedPredictions.map((prediction) => {
                    const meta = labelMeta[prediction.label] || {
                      title: prediction.label,
                      color: "#1f2937"
                    };

                    return (
                      <div className="score-item" key={prediction.label}>
                        <div className="score-label">
                          <span>{meta.title}</span>
                          <strong>{formatPercent(prediction.score)}</strong>
                        </div>
                        <div className="score-track">
                          <span
                            className="score-fill"
                            style={{
                              width: `${Math.max(prediction.score * 100, 3)}%`,
                              backgroundColor: meta.color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {result.warning && (
                  <div className="message warning-message">
                    <AlertCircle size={19} aria-hidden="true" />
                    <span>{result.warning}</span>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function formatPercent(score) {
  return `${Math.round(Number(score || 0) * 100)}%`;
}

export default App;
