# Model Training, Frontend (Vite), and Backend (FastAPI) Setup

This README provides complete documentation for your **model training workflow**, **feature extraction system**, **Vite frontend setup**, and **FastAPI backend setup with Uvicorn**.

---

## 📁 Project Structure

```
project/
│
├── backend/
│   ├── feature_extractor.py
│   ├── main.py
│   ├── model.pkl
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── components/
│   └── vite.config.js
│
└── README.md
```

---

# 🚀 1. Feature Extractor (model_training)

The **feature_extractor.py** file contains a function that converts an HTTP request into numeric features that match your ML model’s training order.

### 📌 File: `feature_extractor.py`

```python
import urllib.parse
import pandas as pd

badwords = [
    'sleep','drop','uid','select','waitfor','delay','system',
    'union','order by','group by','insert','update','delete',
    'benchmark','and 1=1','or 1=1','--','#'
]

def ExtractFeatures(method: str, path: str, body: str = "") -> pd.DataFrame:
    """
    Return a single-row DataFrame with the numeric features in the same order as training.
    """
    # combine path and body for checking (decode percent-encoding first)
    path = urllib.parse.unquote(path or "")
    body = urllib.parse.unquote(body or "")

    combined = path + " " + body

    single_q = combined.count("'")
    double_q = combined.count('"')
    dashes   = combined.count("--")
    braces   = combined.count("(")
    spaces   = combined.count(" ")
    badwords_count = sum(combined.lower().count(w) for w in badwords)

    return pd.DataFrame([[single_q, double_q, dashes, braces, spaces, badwords_count]],
                        columns=["single_q","double_q","dashes","braces","spaces","badwords"])
```

---

# 📦 2. Model Training Workflow

### 🧠 Steps

1. **Collect dataset**
2. **Extract features** using `ExtractFeatures()`
3. **Train ML model** (e.g., RandomForest, XGBoost)
4. Save the model:

   ```python
   import joblib
   joblib.dump(model, "model.pkl")
   ```

### 📁 Output

* `model.pkl` — Your trained ML model

---

# ⚙️ 3. Backend Setup (FastAPI + Uvicorn)

## 📌 Install requirements

Create `backend/requirements.txt`:

```
fastapi
uvicorn
pandas
scikit-learn
joblib
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## ▶️ FastAPI main file (`main.py`)

```python
from fastapi import FastAPI, Request
import joblib
from feature_extractor import ExtractFeatures

app = FastAPI()
model = joblib.load("model.pkl")

@app.post("/predict")
async def predict(request: Request):
    data = await request.json()

    method = data.get("method", "GET")
    path = data.get("path", "")
    body = data.get("body", "")

    features = ExtractFeatures(method, path, body)
    prediction = model.predict(features)[0]

    return {"prediction": int(prediction)}
```

---

## ▶️ Run the server

```bash
uvicorn main:app --reload
```

Server starts at:

```
http://127.0.0.1:8000
```

---

# 🌐 4. Frontend Setup (Vite + React)

### 📌 Install Vite project

```bash
npm create vite@latest frontend --template react
cd frontend
npm install
```

---

## 📄 Example frontend API call

In `src/App.jsx`:

```jsx
import { useState } from "react";

function App() {
  const [result, setResult] = useState(null);

  const scan = async () => {
    const res = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "GET",
        path: "/api/test?name='admin'",
        body: ""
      })
    });

    const data = await res.json();
    setResult(data.prediction);
  };

  return (
    <div>
      <h1>Scanner</h1>
      <button onClick={scan}>Scan</button>
      {result !== null && <p>Prediction: {result}</p>}
    </div>
  );
}

export default App;
```

---

# ⚙️ 5. Vite Dev Server

Run the frontend:

```bash
npm run dev
```

Default URL:

```
http://localhost:5173
```

If you face CORS errors, enable CORS in FastAPI:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

# 🎯 Final Notes

* Your **ML pipeline → FastAPI backend → Vite frontend** is completely integrated.
* The feature extractor ensures consistency with model training.
* You can extend this for XSS, SQLi, malware detection, or anomaly detection.

---

If you want, I can also create:
✅ API documentation
✅ Swagger examples
✅ Dockerfile for backend + frontend
