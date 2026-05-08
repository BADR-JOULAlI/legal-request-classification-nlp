# Legal Request Classification with DistilBERT

This repository contains a text classification project for categorizing legal questions into a small set of practice areas. The model is based on `distilbert-base-cased` and is trained with the Hugging Face `transformers` and `datasets` libraries.

The work is implemented in a notebook and covers the full experimentation flow: dataset preparation, label encoding, tokenization, model fine-tuning, evaluation, hyperparameter search, and inference with a published Hugging Face model.

## Project Scope

The classifier is trained on a subset of the `jonathanli/law-stack-exchange` dataset. Four legal categories are used:

- `criminal-law`
- `employment`
- `tax-law`
- `trademark`

The goal is to build a compact NLP model that can route short legal questions to the most relevant category. This type of classification can be useful as a first step in legal support triage, document routing, or topic-based search.

## Repository Structure

```text
.
├── legal-request-classification-nlp-ipynb (1).ipynb
├── README.md
├── LICENSE
└── .gitignore
```

## Workflow

The notebook follows a standard supervised text classification pipeline:

```text
Dataset -> Cleaning -> Label encoding -> Tokenization -> Training -> Evaluation -> Inference
```

During preprocessing, unused metadata columns are removed and the dataset is reduced to the fields required by the model:

- `text`: the legal question content
- `label`: the target legal category

Labels are converted with Hugging Face `ClassLabel`, and the text is tokenized with the DistilBERT tokenizer using truncation and fixed-length padding.

## Model

The model uses `AutoModelForSequenceClassification` with `distilbert-base-cased` as the base checkpoint. The classification head is configured for the four selected labels, with explicit `id2label` and `label2id` mappings to keep predictions readable during inference.

Main training setup:

- Base model: `distilbert-base-cased`
- Task: multi-class text classification
- Evaluation metric: accuracy
- Trainer API: Hugging Face `Trainer`
- Hyperparameter tuning: Optuna

## Training and Optimization

Initial fine-tuning was run with:

- Learning rate: `2e-5`
- Batch size: `8`
- Epochs: `10`
- Weight decay: `0.01`
- Evaluation strategy: per epoch

Optuna was then used to search over learning rate, batch size, and number of epochs. The best configuration found in the notebook was:

```text
learning_rate: 9.001905212697694e-05
per_device_train_batch_size: 16
num_train_epochs: 5
```

## Results

The model reached approximately `95%` validation accuracy during the initial training run. In the Optuna search, the best trial reached about `96.4%` accuracy.

These results should be interpreted in the context of the selected four-class subset and the sampled dataset size. Further validation on a larger and more diverse legal dataset would be needed before using the model in a production setting.

## Inference

A trained version of the model is available on Hugging Face:

[sailu4/legal-request-classification-nlp-model](https://huggingface.co/sailu4/legal-request-classification-nlp-model)

Example usage:

```python
from transformers import pipeline

classifier = pipeline(
    "text-classification",
    model="sailu4/legal-request-classification-nlp-model"
)

result = classifier("I need help with tax law")
print(result)
```

## Requirements

The notebook uses the following main libraries:

- `transformers`
- `datasets`
- `evaluate`
- `torch`
- `optuna`
- `pandas`

Install the core dependencies with:

```bash
pip install transformers datasets evaluate torch optuna pandas
```

If you are running the notebook in a GPU environment, make sure that the installed PyTorch version matches your CUDA setup.

## Limitations

- The classifier is trained on only four legal categories.
- The dataset subset is relatively small.
- The model predicts broad categories, not legal advice or legal outcomes.
- Performance may drop on longer, noisier, or jurisdiction-specific legal questions.

## Next Steps

Potential improvements include:

- Expanding the number of legal categories
- Training on a larger and more balanced dataset
- Comparing DistilBERT with BERT, RoBERTa, or legal-domain language models
- Adding precision, recall, F1-score, and confusion matrix analysis
- Packaging the model behind a small API for real-time inference

## License

This project is released under the MIT License.

## Author

Badr Joulali
