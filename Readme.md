# TA-2 Assigment :- AI POWERED WAF [WEB APPLICATION FIREWALL]
NAME:- VISHNU KETANKUMAR MANDLESARA <br>
ENROLLMENT NO:- 250103002026 <br>
Course Name:- MSc Cyber Security <br>

This README provides complete documentation for **model training workflow**, **feature extraction system**, **Vite frontend setup**, and **FastAPI backend setup with Uvicorn**.

---

## 📁 Project Structure

```
WAF_PROJECT/
│
├── model_training/
│   ├── burpsuite_sample_log.log
│   ├── logparser.py
│   ├── randomforest.ipynb
│   ├── rf_model.pkl
│   ├── train_data.csv
│   ├── test_data.csv
│   ├── test_result.csv
│   └── requirements.txt
|
├── python_backend/
│   ├── proxy_server.py
│   ├── app.py
│   ├── model.pkl
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── .env
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── vite.config.js
│
└── README.md
```

---

# 🚀 1. Feature Extractor 

The **feature_extractor.py** file contains a function that converts an HTTP request into numeric features that match your ML model’s training order.


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

1. **Collect dataset from BurpSuite You can check raw data in model_training/burpsuite_sample_log.log**
2. **Extract features** using `ExtractFeatures()`
3. **Train ML model** (e.g., RandomForest [Good Accuracy], XGBoost, Sklearn)
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

Create `python_backend/requirements.txt`:

```
fastapi==0.115.0
uvicorn[standard]==0.30.3
numpy==1.26.4
joblib==1.4.2
pandas==2.2.3
scikit-learn==1.4.2
httpx==0.27.2

```

Install dependencies:

```bash
cd python_backend
```

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
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Server starts at:

```
http://127.0.0.1:8000
```

---

# 🌐 4. Frontend Setup (Vite + React)

### 📌 Install Vite project

```bash
cd frontend
npm install
```

---

## 📄 Example frontend API call

In `src/App.jsx`:

```jsx
function App() {
  return (
    <Router>
      <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
        <Header />
        <div className="flex-1 min-h-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/intercepter" element={<Intercepter />} />
            <Route path="/request-analyzer" element={<RequestAnalyzer />} />
          </Routes>
        </div>
      </div>
    </Router>
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
