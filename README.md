# Legal Request Classification (NLP - DistilBERT)

## 1. Overview

This project implements a full NLP pipeline to classify legal text into predefined categories using transformer-based models.

It covers:

* Data preprocessing
* Feature engineering
* Model training
* Hyperparameter optimization
* Evaluation and inference

---

## 2. Architecture

Pipeline:

Dataset → Cleaning → Encoding → Tokenization → Model → Training → Evaluation → Inference

---

## 3. Dataset

Source:
jonathanli/law-stack-exchange

### Preprocessing

* Removed irrelevant metadata columns
* Renamed columns:

  * `body → text`
  * `text_label → label`
* Encoded labels using `ClassLabel`

### Labels

* criminal-law
* employment
* tax-law
* trademark

---

## 4. Data Pipeline

### Tokenization

```python
def tokenize_function(examples):
    return tokenizer(
        examples["text"],
        padding="max_length",
        truncation=True
    )
```

Applied with:

```python
dataset.map(tokenize_function, batched=True)
```

### Features

* input_ids
* attention_mask
* label

---

## 5. Model

Base model:
distilbert-base-cased

```python
AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=NUM_LABELS,
    id2label=id2label,
    label2id=label2id
)
```

---

## 6. Training

```python
TrainingArguments(
    output_dir="fast_model",
    learning_rate=2e-5,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    num_train_epochs=10,
    weight_decay=0.01,
    fp16=True,
    evaluation_strategy="epoch",
    save_strategy="epoch"
)
```

Trainer:

```python
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_train,
    eval_dataset=tokenized_val,
    compute_metrics=compute_metrics
)
```

---

## 7. Evaluation

Metric:
Accuracy

```python
metric = evaluate.load("accuracy")
```

---

## 8. Hyperparameter Optimization

Using Optuna:

* Learning rate
* Batch size
* Number of epochs

Best result:

* learning_rate ≈ 9e-5
* batch_size = 16
* epochs = 5

---

## 9. Results

* Accuracy: ~95%
* Stable convergence
* Good generalization

---

## 10. Inference

```python
from transformers import pipeline

classifier = pipeline(
    "text-classification",
    model="sailu4/legal-request-classification-nlp-model"
)

classifier("I need help with tax law")
```

---

## 11. Sample Evaluation

```python
result = classifier(sample_text)

print("True:", sample_label)
print("Pred:", result[0]["label"])
print("Score:", result[0]["score"])
```

---

## 12. Model Deployment

Hugging Face:
https://huggingface.co/sailu4/legal-request-classification-nlp-model

---

## 13. Project Structure

```
.
├── legal-request-classification-nlp/
    ├── legal-request-classifacation-nlp(1).ipynb
    ├── README.md
    └── .gitignore
```

---

## 14. Limitations

* Class imbalance
* Small dataset size
* Domain-specific scope

---

## 15. Future Work

* Add more classes
* Use larger models (BERT / RoBERTa)
* Deploy API (FastAPI)
* Add real-time inference

---

## 16. Author

Badr Joulali
