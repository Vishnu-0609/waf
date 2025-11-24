from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from proxy_server import start_proxy, stop_proxy
import urllib.request
import urllib.parse
import sqlite3
import json
import asyncio
import requests
import joblib
import numpy as np
from pathlib import Path
from typing import Any, Dict, Optional, List
from pydantic import BaseModel
from datetime import datetime, timedelta
from collections import Counter

PHISHTANK_API_KEY = "9cddc71af137336b73a54cf876aeeb35"
active_clients = []
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # or ["*"] to allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def broadcast_new_request(request_obj):
    living_clients = []
    for ws in active_clients:
        try:
            await ws.send_json({
                "event": "new_request",
                "data": request_obj
            })
            living_clients.append(ws)
        except:
            pass

    active_clients[:] = living_clients


MODEL_PATH = Path(__file__).with_name("model.pkl")
MODEL = joblib.load(MODEL_PATH)
THRESHOLD = 0.35
BAD_WORDS = [
    "sleep", "drop", "uid", "select", "waitfor", "delay", "system", "union",
    "order by", "group by", "insert", "update", "delete", "benchmark",
    "and 1=1", "or 1=1", "--", "#", "<script", "alert(", "set /", ";", "&&", "|"
]
SQLI_KEYWORDS = ["select", "union", "drop", "insert", "update", "' or", "' and", "--", "benchmark"]
XSS_KEYWORDS = ["<script", "onerror", "onload", "alert(", "document.cookie"]
CMDI_KEYWORDS = [";","&&","||","|","$(", "`", "cat ", "sleep ", "rm ", "curl ", "wget "]

ATTACK_PATTERNS = {
    "SQL Injection": ["select", "union", "drop", "' or", "' and", "sleep(", "--", "benchmark"],
    "XSS": ["<script", "onerror", "onload", "alert(", "document.cookie"],
    "Command Injection": ["; rm", "&&", "||", "|", "$(", "`", "chmod", "cat /etc/passwd", "curl ", "wget "],
    "LFI": ["../", "..\\", "/etc/passwd", "system32", "php://"],
}


class AnalyzeRequestPayload(BaseModel):
    method: str
    url: str
    headers: Optional[Dict[str, str]] = None
    body: Optional[str] = ""


class ReplayRequestPayload(BaseModel):
    method: str
    url: str
    headers: Optional[Dict[str, str]] = None
    body: Optional[str] = ""


def _normalize_text(value: Optional[str]) -> str:
    if not value:
        return ""
    return urllib.parse.unquote(value)


def extract_features(url: str, body: Optional[str], headers: Optional[Dict[str, str]]) -> Dict[str, int]:
    decoded_url = _normalize_text(url)
    decoded_body = _normalize_text(body or "")
    header_blob = " ".join(f"{k}:{v}" for k, v in (headers or {}).items())
    combined = f"{decoded_url} {decoded_body} {header_blob}".strip()

    return {
        "single_q": combined.count("'"),
        "double_q": combined.count('"'),
        "dashes": combined.count("--"),
        "braces": combined.count("("),
        "spaces": combined.count(" "),
        "badwords": sum(combined.lower().count(word) for word in BAD_WORDS),
        "combined": combined
    }


def _safe_json_loads(value: Optional[str]) -> Dict[str, Any]:
    if not value:
        return {}
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return {}


def _parse_timestamp(value: Optional[str]) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value)
        except (ValueError, OSError):
            return None
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def _classify_attack(url: str, body: str) -> str:
    combined = f"{url} {body}".lower()
    scores = {key: 0 for key in ATTACK_PATTERNS.keys()}
    for attack_type, keywords in ATTACK_PATTERNS.items():
        scores[attack_type] = sum(1 for keyword in keywords if keyword in combined)
    best_type = max(scores, key=lambda k: scores[k])
    return best_type if scores[best_type] > 0 else "Normal"


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row[0],
        "method": row[1],
        "url": row[2],
        "body": row[3] or "",
        "headers": _safe_json_loads(row[4]),
        "malicious_prob": float(row[5] or 0.0),
        "malicious": bool(row[6]),
        "status": row[7] or "pending",
        "created_at": row[8],
    }

def predict_from_features(features: Dict[str, Any]) -> Dict[str, Any]:
    feature_vector = np.array([[
        features["single_q"],
        features["double_q"],
        features["dashes"],
        features["braces"],
        features["spaces"],
        features["badwords"],
    ]])

    if hasattr(MODEL, "predict_proba"):
        proba = MODEL.predict_proba(feature_vector)[0]
        malicious_prob = float(proba[0])  # class 0 assumed malicious
    else:
        prediction = MODEL.predict(feature_vector)[0]
        malicious_prob = 0.7 if prediction == 0 else 0.1

    blocked = malicious_prob >= THRESHOLD
    label = "Malicious" if blocked else "Normal"
    confidence = malicious_prob if blocked else 1 - malicious_prob

    combined = features["combined"].lower()
    sql_score = min(sum(combined.count(word) for word in SQLI_KEYWORDS) / 5, 1.0)
    xss_score = min(sum(combined.count(word) for word in XSS_KEYWORDS) / 5, 1.0)
    cmd_score = min(sum(combined.count(word) for word in CMDI_KEYWORDS) / 5, 1.0)
    probabilities = {
        "Normal": max(0.0, 1.0 - malicious_prob),
        "SQLi": max(sql_score, malicious_prob * 0.6),
        "XSS": xss_score,
        "Command Injection": cmd_score
    }

    patterns = [word for word in BAD_WORDS if word in combined]
    explanation = (
        f"Detected {features['badwords']} suspicious token(s). "
        f"Single quotes: {features['single_q']}, double quotes: {features['double_q']}, "
        f"dashes: {features['dashes']}."
    )

    return {
        "prediction": label,
        "confidence": round(confidence, 4),
        "probabilities": probabilities,
        "maliciousPatterns": patterns,
        "explanation": explanation,
        "maliciousProbability": malicious_prob
    }

def _build_dashboard_snapshot(limit: int = 1000) -> Dict[str, Any]:
    conn = sqlite3.connect("waf.db")
    c = conn.cursor()
    c.execute(
        "SELECT id, method, url, body, headers, malicious_prob, malicious, status, created_at "
        "FROM logs1 ORDER BY rowid DESC LIMIT ?",
        (limit,),
    )
    rows = c.fetchall()
    conn.close()

    entries = [_row_to_dict(row) for row in rows]
    total_requests = len(entries)
    blocked_count = sum(1 for entry in entries if entry["status"] == "blocked" or entry["malicious"])
    forwarded_count = sum(1 for entry in entries if entry["status"] == "forwarded")
    pending_count = total_requests - blocked_count - forwarded_count
    unique_targets = len({entry["url"] for entry in entries if entry["url"]})

    status_breakdown = {
        "blocked": blocked_count,
        "forwarded": forwarded_count,
        "pending": max(pending_count, 0),
    }

    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    hours = 12
    start = now - timedelta(hours=hours - 1)
    buckets = []
    for offset in range(hours):
        bucket_time = start + timedelta(hours=offset)
        buckets.append(
            {
                "label": bucket_time.strftime("%H:%M"),
                "start": bucket_time,
                "total": 0,
                "blocked": 0,
            }
        )

    attack_counter = Counter()
    blacklist_candidates: List[Dict[str, Any]] = []

    for entry in entries:
        ts = _parse_timestamp(entry["created_at"])
        if ts:
            ts_hour = ts.replace(minute=0, second=0, microsecond=0)
            if ts_hour >= start:
                index = int((ts_hour - start).total_seconds() // 3600)
                if 0 <= index < hours:
                    buckets[index]["total"] += 1
                    if entry["status"] == "blocked" or entry["malicious"]:
                        buckets[index]["blocked"] += 1

        attack_type = _classify_attack(entry["url"], entry["body"])
        attack_counter[attack_type] += 1

        if entry["malicious"] or entry["status"] == "blocked":
            blacklist_candidates.append({**entry, "attackType": attack_type})

    traffic_series = [
        {"label": bucket["label"], "total": bucket["total"], "blocked": bucket["blocked"]}
        for bucket in buckets
    ]

    attack_distribution = {
        "Normal": attack_counter.get("Normal", 0),
        "SQL Injection": attack_counter.get("SQL Injection", 0),
        "XSS": attack_counter.get("XSS", 0),
        "Command Injection": attack_counter.get("Command Injection", 0),
        "LFI": attack_counter.get("LFI", 0),
    }

    blacklist = sorted(
        blacklist_candidates,
        key=lambda entry: entry.get("malicious_prob", 0.0),
        reverse=True,
    )[:5]

    blacklist_payloads = [
        {
            "id": item["id"],
            "method": item["method"],
            "url": item["url"],
            "pattern": (item["body"] or item["url"])[:160],
            "probability": round(item["malicious_prob"], 4),
            "status": item["status"],
            "detected_at": item["created_at"],
            "attackType": item["attackType"],
        }
        for item in blacklist
    ]

    recent_requests = [
        {
            "id": entry["id"],
            "method": entry["method"],
            "url": entry["url"],
            "status": entry["status"],
            "malicious_prob": round(entry["malicious_prob"], 4),
            "malicious": entry["malicious"],
            "attackType": _classify_attack(entry["url"], entry["body"]),
            "created_at": entry["created_at"],
        }
        for entry in entries[:8]
    ]

    detection_rate = (blocked_count / total_requests) if total_requests else 0.0

    return {
        "totals": {
            "requests": total_requests,
            "blocked": blocked_count,
            "forwarded": forwarded_count,
            "pending": max(pending_count, 0),
            "detectionRate": round(detection_rate, 4),
            "uniqueTargets": unique_targets,
        },
        "trafficSeries": traffic_series,
        "attackDistribution": attack_distribution,
        "blacklist": blacklist_payloads,
        "recentRequests": recent_requests,
        "statusBreakdown": status_breakdown,
    }

@app.get("/dashboard-stats")
def dashboard_stats():
    try:
        return _build_dashboard_snapshot()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.post("/check-phish")
async def check_phish(data: dict):
    url_to_check = data.get("url")
    if not url_to_check:
        raise HTTPException(status_code=400, detail="URL not provided")

    try:
        phishtank_url = "https://checkurl.phishtank.com/checkurl/"

        # PhishTank requires POST form data, not JSON
        payload = {
            "url": url_to_check,
            "format": "json",
            "app_key": PHISHTANK_API_KEY
        }

        response = requests.post(phishtank_url, data=payload)
        result = response.json()

        return {
            "success": True,
            "phishtank_response": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-request")
async def analyze_request(payload: AnalyzeRequestPayload):
    features = extract_features(payload.url, payload.body, payload.headers)
    prediction = predict_from_features(features)

    return {
        **prediction,
        "features": {k: v for k, v in features.items() if k != "combined"},
        "requestDetails": {
            "method": payload.method.upper(),
            "url": payload.url,
            "headers": payload.headers or {},
            "body": payload.body or ""
        }
    }


@app.post("/replay-request")
async def replay_request(payload: ReplayRequestPayload):
    method = (payload.method or "GET").upper()
    if method not in {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}:
        raise HTTPException(status_code=400, detail="Unsupported HTTP method")

    if not payload.url:
        raise HTTPException(status_code=400, detail="URL is required")

    try:
        response = requests.request(
            method=method,
            url=payload.url,
            headers=payload.headers or {},
            data=payload.body.encode() if payload.body else None,
            timeout=15,
        )

        body_preview = response.text
        if len(body_preview) > 20000:
            body_preview = body_preview[:20000] + "\n...[truncated]"

        return {
            "status": response.status_code,
            "headers": dict(response.headers),
            "body": body_preview,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.get("/pendingRequests")
def get_pending():
    conn = sqlite3.connect("waf.db")
    c = conn.cursor()
    c.execute("SELECT * FROM logs1 ORDER BY rowid DESC")  # latest first
    rows = c.fetchall()
    conn.close()

    # Convert rows to list of dicts
    pending_list = []
    for row in rows:
        pending_list.append({
            "id": row[0],
            "method": row[1],
            "url": row[2],
            "body": row[3],
            "headers": json.loads(row[4]),
            "malicious_prob": row[5],
            "malicious": bool(row[6]),
            "status": row[7],
            "created_at": row[8]
        })

    return pending_list


@app.post("/startproxy")
def start_proxy_api():
    ok = start_proxy()
    return {"running": ok}


@app.post("/stopproxy")
def stop_proxy_api():
    ok = stop_proxy()
    return {"stopped": ok}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_clients.append(websocket)

    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        active_clients.remove(websocket)

