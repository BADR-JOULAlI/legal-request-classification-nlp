# Project Documentation

## 1. Project Overview

Legal Request Classification is an NLP project that classifies legal questions into predefined legal practice areas. The project combines two parts:

- A machine learning notebook used to prepare data, train, evaluate, and publish a DistilBERT-based model.
- A full-stack web application that lets users test the trained model through a browser interface.

The web application uses React for the frontend, Node.js with Express for the backend, and a local Python inference worker to run the Hugging Face model.

## 2. Main Objective

The goal is to classify a legal request into one of four categories:

- `criminal-law`
- `employment`
- `tax-law`
- `trademark`

The application helps visualize:

- The predicted category
- The confidence score of the top prediction
- The confidence distribution across all classes

This makes the model easier to demonstrate, test, and present.

## 3. Repository Structure

```text
.
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── index.js
│   │   └── predict_worker.py
│   └── package.json
├── legal-request-classification-nlp-ipynb (1).ipynb
├── .env.example
├── .gitignore
├── LICENSE
├── package-lock.json
├── package.json
├── PROJECT_DOCUMENTATION.md
└── README.md
```

## 4. Machine Learning Workflow

The notebook contains the model development process.

### Dataset

The project uses the Hugging Face dataset:

```text
jonathanli/law-stack-exchange
```

The selected labels are:

```text
criminal-law
employment
tax-law
trademark
```

### Preprocessing

The notebook prepares the dataset by:

- Removing metadata columns that are not needed for classification
- Keeping the text content and label fields
- Renaming fields into a cleaner format
- Encoding labels with Hugging Face `ClassLabel`
- Tokenizing the text for DistilBERT

### Model

The model is based on:

```text
distilbert-base-cased
```

It is loaded with:

```python
AutoModelForSequenceClassification
```

The model is configured for four output labels using `id2label` and `label2id` mappings.

### Training

Training is handled with the Hugging Face `Trainer` API.

Initial training setup:

```text
learning_rate: 2e-5
batch_size: 8
epochs: 10
weight_decay: 0.01
evaluation: each epoch
```

### Hyperparameter Optimization

Optuna is used to search for better hyperparameters.

Best configuration found in the notebook:

```text
learning_rate: 9.001905212697694e-05
per_device_train_batch_size: 16
num_train_epochs: 5
```

### Results

The model reached approximately:

```text
95% validation accuracy
96.4% best Optuna trial accuracy
```

These results are based on the selected four-class dataset subset and should be validated further before any production use.

## 5. Published Model

The trained model is available on Hugging Face:

```text
https://huggingface.co/sailu4/legal-request-classification-nlp-model
```

Model ID:

```text
sailu4/legal-request-classification-nlp-model
```

The current backend uses local Python inference because the model is not deployed through a Hugging Face Inference Provider.

## 6. Full-Stack Application Architecture

The application has three layers:

```text
React frontend -> Node.js Express API -> Python inference worker -> Hugging Face model
```

### Frontend

Location:

```text
client/
```

Main files:

- `client/src/App.jsx`: main React interface and prediction flow
- `client/src/main.jsx`: React entry point
- `client/src/styles.css`: application styling
- `client/vite.config.js`: Vite configuration with React plugin

The frontend provides:

- A text area for entering a legal request
- Sample legal requests
- A classify button
- A result panel with the top category
- Score bars for all categories
- API error and warning display

### Backend

Location:

```text
server/
```

Main file:

```text
server/src/index.js
```

The backend provides:

- An Express API
- CORS support for the local React app
- Request validation
- Communication with the Python inference worker
- Optional fallback behavior if inference fails

### Python Inference Worker

Location:

```text
server/src/predict_worker.py
```

The worker:

- Loads the tokenizer and model once
- Waits for prediction requests from Node.js through standard input
- Runs inference with PyTorch
- Returns predictions as JSON

Keeping the worker alive avoids reloading the model for every request, which makes predictions faster after the first load.

## 7. Environment Configuration

Example environment file:

```text
.env.example
```

Available variables:

```env
PORT=5000
MODEL_ID=sailu4/legal-request-classification-nlp-model
INFERENCE_ENGINE=python
PYTHON_BIN=python
HUGGINGFACE_API_TOKEN=
ALLOW_DEMO_FALLBACK=true
```

### Variable Explanation

`PORT`

Backend port. Default: `5000`.

`MODEL_ID`

Hugging Face model ID used by the Python worker.

`INFERENCE_ENGINE`

Default value is `python`. This uses local inference with `transformers`.

`PYTHON_BIN`

Python executable used by Node.js. Usually `python` on Windows.

`HUGGINGFACE_API_TOKEN`

Reserved for Hugging Face API usage. It is empty by default because local inference is used.

`ALLOW_DEMO_FALLBACK`

If set to `true`, the backend can return a simple keyword-based demo result if the real model fails.

## 8. Installation

Install JavaScript dependencies:

```bash
npm install
```

Install Python dependencies:

```bash
pip install transformers torch
```

Create a local `.env` file:

```powershell
copy .env.example .env
```

The `.env` file is ignored by Git and should not be pushed to GitHub.

## 9. Running the Project

From the repository root:

```bash
npm run dev
```

This starts:

- The backend API on `http://localhost:5000`
- The frontend app on `http://127.0.0.1:5173`

Open the frontend in the browser:

```text
http://127.0.0.1:5173
```

## 10. API Documentation

### Health Check

Endpoint:

```http
GET /api/health
```

Example response:

```json
{
  "status": "ok",
  "modelId": "sailu4/legal-request-classification-nlp-model",
  "inferenceEngine": "python",
  "hasToken": false
}
```

### Prediction

Endpoint:

```http
POST /api/predict
```

Request body:

```json
{
  "text": "I need help with tax law and income deductions."
}
```

Example response:

```json
{
  "label": "tax-law",
  "score": 0.975083589553833,
  "predictions": [
    {
      "label": "tax-law",
      "score": 0.975083589553833
    },
    {
      "label": "employment",
      "score": 0.009185430593788624
    },
    {
      "label": "criminal-law",
      "score": 0.00903885904699564
    },
    {
      "label": "trademark",
      "score": 0.006692118942737579
    }
  ],
  "source": "local-python",
  "modelId": "sailu4/legal-request-classification-nlp-model"
}
```

Example request with PowerShell:

```powershell
$body = @{
  text = "I need help with tax law and income deductions."
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:5000/api/predict" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Example request with curl:

```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"I need help with tax law and income deductions.\"}"
```

## 11. Frontend User Flow

1. The user enters or selects a legal request.
2. The user clicks `Classify`.
3. React sends a `POST /api/predict` request to the backend.
4. Express validates the text.
5. Node.js sends the text to the Python inference worker.
6. The Python worker tokenizes the text and runs the model.
7. The backend returns all class scores.
8. React displays the top prediction and confidence bars.

## 12. Scripts

Root scripts:

```json
{
  "dev": "concurrently \"npm run dev --workspace server\" \"npm run dev --workspace client\"",
  "build": "npm run build --workspace client",
  "start": "npm run start --workspace server",
  "lint": "npm run lint --workspace client"
}
```

Useful commands:

```bash
npm run dev
npm run build
npm run lint
npm run start
```

## 13. Git and GitHub Notes

The `.gitignore` file excludes:

- `node_modules/`
- `dist/`
- `.env`
- logs
- notebook checkpoints
- Python cache files
- heavy model artifacts

Files that should be committed:

- Source code
- `package.json`
- `package-lock.json`
- `.env.example`
- documentation files

Files that should not be committed:

- `.env`
- `node_modules/`
- `client/dist/`
- local logs
- downloaded model files

## 14. Validation Performed

The project was tested with:

```bash
npm run lint --workspace client
npm run build --workspace client
```

The API was also tested with real local inference from the Hugging Face model.

Example successful prediction:

```text
Input: My employer fired me without notice after I asked about unpaid salary.
Output: employment
Source: local-python
```

## 15. Limitations

- The model currently supports only four legal categories.
- It is a classifier, not a legal advice system.
- Model quality depends on the dataset used during training.
- The first local prediction can be slow because the model must be loaded.
- CPU inference is slower than GPU inference.
- The model may perform poorly on very long, unclear, or jurisdiction-specific questions.

## 16. Possible Improvements

Future improvements could include:

- Adding more legal categories
- Training with a larger and more balanced dataset
- Adding precision, recall, F1-score, and confusion matrix reporting
- Saving prediction history in a database
- Adding authentication for private usage
- Deploying the backend with a persistent model server
- Adding Docker support
- Adding automated tests for the API and frontend
- Improving model latency with ONNX or a dedicated inference service

## 17. Troubleshooting

### The frontend does not load

Check that Vite is running:

```bash
npm run dev --workspace client
```

Open:

```text
http://127.0.0.1:5173
```

### The backend does not respond

Check:

```text
http://localhost:5000/api/health
```

Run only the backend:

```bash
npm run dev --workspace server
```

### Python inference is slow

The first request can be slow because the model is loaded into memory. After that, the Python worker stays alive and predictions should be much faster.

### Python cannot find dependencies

Install the required packages:

```bash
pip install transformers torch
```

If multiple Python versions are installed, update `.env`:

```env
PYTHON_BIN=python
```

or set it to the full path of the Python executable.

### The Hugging Face API returns an error

The application does not rely on the public Hugging Face Inference API by default. It uses local inference because the model is not deployed through an Inference Provider.

## 18. License

This project is released under the MIT License.

## 19. Author

Badr Joulali
