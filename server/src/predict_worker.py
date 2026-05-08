import json
import os
import sys

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("TRANSFORMERS_NO_TF", "1")
os.environ.setdefault("USE_TF", "0")

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


MODEL_ID = os.environ.get("MODEL_ID", "sailu4/legal-request-classification-nlp-model")
TOKENIZER = AutoTokenizer.from_pretrained(MODEL_ID)
MODEL = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
MODEL.eval()


def predict(text):
    inputs = TOKENIZER(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        return_token_type_ids=False,
    )

    with torch.no_grad():
        outputs = MODEL(**inputs)
        probabilities = torch.softmax(outputs.logits, dim=-1)[0]

    id2label = MODEL.config.id2label
    predictions = []

    for index, score in enumerate(probabilities.tolist()):
        predictions.append(
            {
                "label": str(id2label.get(index, f"LABEL_{index}")).lower(),
                "score": float(score),
            }
        )

    predictions.sort(key=lambda item: item["score"], reverse=True)
    return predictions


def handle_line(line):
    payload = json.loads(line)
    text = str(payload.get("text", "")).strip()
    request_id = str(payload.get("requestId", ""))

    if not text:
        raise ValueError("Text is required.")

    return {"requestId": request_id, "predictions": predict(text)}


for raw_line in sys.stdin:
    try:
        result = handle_line(raw_line)
    except Exception as exc:
        request_id = ""
        try:
            request_id = str(json.loads(raw_line).get("requestId", ""))
        except Exception:
            pass
        result = {"requestId": request_id, "error": str(exc)}

    print(json.dumps(result), flush=True)
