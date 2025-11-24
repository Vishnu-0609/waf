import socketserver
import http.server
import urllib.request
import urllib.parse
import joblib
import numpy as np
import json
import threading
import sqlite3
import uuid
from datetime import datetime

MODEL_PATH = "model.pkl"
THRESHOLD = 0.25

MODEL = joblib.load(MODEL_PATH)

BAD_WORDS = [
    "sleep", "drop", "uid", "select", "waitfor", "delay",
    "system", "union", "order by", "group by",
    "insert", "update", "delete", "benchmark",
    "and 1=1", "or 1=1", "--", "#"
]

# Initialize SQLite database
conn = sqlite3.connect("waf.db")
c = conn.cursor()
c.execute("""
CREATE TABLE IF NOT EXISTS logs1 (
    id TEXT PRIMARY KEY,
    method TEXT,
    url TEXT,
    body TEXT,
    headers TEXT,
    malicious_prob REAL,
    malicious INTEGER,
    status TEXT,
    created_at TEXT
)
""")
conn.commit()
conn.close()


def extract_features(path: str, body: str):
    decoded_path = urllib.parse.unquote(path or "")
    decoded_body = urllib.parse.unquote(body or "")
    combined = f"{decoded_path} {decoded_body}"

    features = {
        "single_q": combined.count("'"),
        "double_q": combined.count('"'),
        "dashes": combined.count("--"),
        "braces": combined.count("("),
        "spaces": combined.count(" "),
        "badwords": sum(combined.lower().count(word) for word in BAD_WORDS)
    }
    return features


def waf_predict(features):
    vec = np.array([[
        features["single_q"],
        features["double_q"],
        features["dashes"],
        features["braces"],
        features["spaces"],
        features["badwords"],
    ]])

    malicious_prob = MODEL.predict_proba(vec)[:, 0][0]
    is_malicious = int(malicious_prob > THRESHOLD)  # 1 = malicious, 0 = normal
    return is_malicious, malicious_prob


class AIProxy(http.server.SimpleHTTPRequestHandler):

    def do_GET(self):
        self.handle_proxy("GET")

    def do_POST(self):
        self.handle_proxy("POST")

    def handle_proxy(self, method):
        url = self.path

        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len).decode("utf-8") if content_len else ""

        # ---------- AI Prediction ----------
        is_malicious, mp = waf_predict(extract_features(url, body))
        created_at = datetime.utcnow().isoformat()

        req_id = str(uuid.uuid4())

        try:
            import asyncio
            from app import broadcast_new_request

            asyncio.run(broadcast_new_request({
                "id": req_id,
                "method": method,
                "url": url,
                "body": body,
                "headers": dict(self.headers),
                "malicious_prob": mp,
                "malicious": bool(is_malicious),
                "status": "pending",
                "created_at": created_at
            }))

        except Exception as e:
            print("WebSocket broadcast error:", e)

        # ---------- Save to DB ----------
        conn = sqlite3.connect("waf.db")
        c = conn.cursor()
        c.execute(
            "INSERT INTO logs1 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                req_id,
                method,
                url,
                body,
                json.dumps(dict(self.headers)),
                mp,
                is_malicious,
                "pending",
                created_at
            )
        )
        conn.commit()
        conn.close()

        if is_malicious:
            conn = sqlite3.connect("waf.db")
            c = conn.cursor()
            c.execute("UPDATE logs1 SET status = ? WHERE id = ?", ("blocked", req_id))
            conn.commit()
            conn.close()
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "blocked",
                "reason": f"malicious_prob={mp}"
            }).encode())
            return

        try:
            req = urllib.request.Request(
                url,
                data=body.encode() if body else None,
                method=method
            )
            resp = urllib.request.urlopen(req)
            data = resp.read()

            self.send_response(resp.status)
            for k, v in resp.headers.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(data)

        except Exception as e:
            self.send_error(500, f"Proxy error: {e}")


# GLOBAL PROXY INSTANCE
proxy_server = None
proxy_thread = None


def start_proxy():
    global proxy_server, proxy_thread

    if proxy_server:
        return False  # already running

    def run():
        global proxy_server
        with socketserver.ThreadingTCPServer(("0.0.0.0", 8888), AIProxy) as httpd:
            proxy_server = httpd
            print("🚀 Proxy started on port 8888")
            httpd.serve_forever()

    proxy_thread = threading.Thread(target=run, daemon=True)
    proxy_thread.start()
    return True


def stop_proxy():
    global proxy_server
    if proxy_server:
        proxy_server.shutdown()
        proxy_server = None
        print("🛑 Proxy stopped")
        return True
    return False
