from xml.etree import ElementTree as ET
from urllib.parse import unquote, unquote_plus
import os
import base64
import csv
import json
import re
import sys

log_path = 'burpsuite_sample_log.log'
output_path = 'train_data.csv'

badwords = [
    'sleep','drop','uid','select','waitfor','delay','system',
    'union','order by','group by','insert','update','delete',
    'benchmark','and 1=1','or 1=1'
]

def decode_log(log_path):
    """
    Parses Burp Suite exported XML log file.
    Returns:
        result = { raw_request_base64 : raw_response }
    """
    if not os.path.exists(log_path):
        print("[+] Error:", log_path, "does not exist.")
        # sys.exit()

    try:
        tree = ET.parse(log_path)
    except Exception:
        print("[+] Error: Cannot parse XML. Remove binary data like images.")
        # sys.exit()

    root = tree.getroot()
    result = {}

    for item in root.findall('item'):
        raw_req = item.findtext('request')
        raw_resp = item.findtext('response')

        if raw_req:
            raw_req = unquote(raw_req)

        result[raw_req] = raw_resp

    return result


def parse_log(rawreq):
    """Parses raw HTTP request string."""
    if isinstance(rawreq, bytes):
        rawreq = rawreq.decode("utf-8", errors="ignore")

    parts = re.split(r"\r?\n\r?\n", rawreq, maxsplit=1)
    head = parts[0]
    body = parts[1] if len(parts) > 1 else ""

    lines = head.split("\n")
    request_line = lines[0].strip()

    try:
        method, path, *_ = request_line.split(" ")
    except:
        method, path = None, None

    headers = {}
    for line in lines[1:]:
        if ": " in line:
            key, value = line.split(": ", 1)
            headers[key.strip()] = value.strip()

    return {
        "method": method,
        "path": path,
        "headers": headers,
        "body": body
    }



# ============================
# ⭐ CLASSIFICATION LOGIC ⭐
# ============================

def classify_request(single_q, double_q, dashes, braces, spaces, badwords_count, threshold=5):
    score = 0
    score += badwords_count * 3
    score += single_q * 1
    score += double_q * 1
    score += dashes * 2
    score += braces * 1

    # Your logic: suspicious -> 0, normal -> 1
    return "bad" if score >= threshold else "good"


# -------------------------
# ExtractFeatures (no .encode(), return strings)
# -------------------------
def ExtractFeatures(method, path_enc, body_enc, headers):
    # Ensure inputs are strings (not None)
    method = method or ""
    path_enc = path_enc or ""
    body_enc = body_enc or ""
    headers = headers or {}

    # decode URL-encoding for counting (do not re-encode)
    path = unquote_plus(path_enc)
    body = unquote(body_enc)

    single_q = path.count("'") + body.count("'")
    double_q = path.count('"') + body.count('"')
    dashes = path.count("--") + body.count("--")
    braces = path.count("(") + body.count("(")
    spaces = path.count(" ") + body.count(" ")

    # badwords counting (case-insensitive)
    badwords_count = 0
    for word in badwords:
        if not word:
            continue
        badwords_count += path.lower().count(word.lower())
        badwords_count += body.lower().count(word.lower())

    # count badwords in headers too
    for hname, hval in headers.items():
        val = (hval or "").lower()
        for word in badwords:
            badwords_count += val.count(word.lower())

    # classify: returns int 0 or 1
    class_value = classify_request(single_q, double_q, dashes, braces, spaces, badwords_count)

    # Return types: keep path & body AS STRINGS (no bytes)
    return [
        method,
        path_enc.strip(),
        body_enc.strip(),
        single_q,
        double_q,
        dashes,
        braces,
        spaces,
        badwords_count,
        class_value
    ]


# ============================
# PROCESS FILE & SAVE CSV
# ============================

results = decode_log(log_path)
parsed_requests = []

for raw_base64 in results:
    decoded = base64.b64decode(raw_base64)
    parsed_requests.append(parse_log(decoded))

# write CSV
# with open(output_path, "w", newline="", encoding="utf-8") as f:
#     writer = csv.writer(f)
#     writer.writerow([
#         "method","path","body","single_q","double_q","dashes",
#         "braces","spaces","badwords","class"
#     ])

#     for item in parsed_requests:
#         row = ExtractFeatures(
#             item['method'],
#             item['path'],
#             item['body'],
#             item['headers']
#         )
#         writer.writerow(row)

# print("[+] CSV saved:", output_path)

with open(output_path, "w", newline="", encoding="utf-8") as f:
    # Improved writer with quoting
    writer = csv.writer(
        f,
        delimiter=",",
        quotechar='"',         # wrap fields in double quotes when necessary
        quoting=csv.QUOTE_MINIMAL,  # only quote fields that need it
        escapechar='\\'        # escape quotes inside fields
    )

    # Write header
    writer.writerow([
        "method", "path", "body", "single_q", "double_q", "dashes",
        "braces", "spaces", "badwords", "class"
    ])

    # Write data rows
    for item in parsed_requests:
        row = ExtractFeatures(
            item['method'],
            item['path'],
            item['body'],
            item['headers']
        )
        # Ensure all elements are strings
        row = [str(i) for i in row]
        writer.writerow(row)

print("[+] CSV saved:", output_path)
