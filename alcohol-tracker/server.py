#!/usr/bin/env python3
"""
Dry Days — Server
Sert les fichiers statiques + gère les push notifications à 21h.

Setup:
    pip install -r requirements.txt
    python generate_keys.py   # une seule fois
    python server.py
"""

import http.server
import json
import os
import threading
import time
import urllib.parse
from datetime import datetime, timedelta
from pathlib import Path

try:
    from pywebpush import webpush, WebPushException
except ImportError:
    webpush = None
    print("⚠️  pywebpush non installé — notifications push désactivées")
    print("   pip install -r requirements.txt\n")

PORT      = 8001
BASE_DIR  = Path(__file__).parent
KEY_FILE  = BASE_DIR / "vapid_keys.json"
SUBS_FILE = BASE_DIR / ".subscriptions.json"

NOTIFY_HOUR   = 21   # heure de la notification
NOTIFY_MINUTE = 0
VAPID_CLAIMS  = {"sub": "mailto:dry-days@local.app"}

# ============================
# VAPID keys
# ============================
def load_vapid_keys():
    if not KEY_FILE.exists():
        print("⚠️  Clés VAPID manquantes. Lance: python generate_keys.py")
        return None, None
    with open(KEY_FILE) as f:
        keys = json.load(f)
    return keys.get("publicKey"), keys.get("privateKey")

VAPID_PUBLIC, VAPID_PRIVATE = load_vapid_keys()

# ============================
# Subscriptions
# ============================
def load_subscriptions():
    if not SUBS_FILE.exists():
        return []
    with open(SUBS_FILE) as f:
        return json.load(f)

def save_subscription(sub):
    subs = load_subscriptions()
    # Avoid duplicates by endpoint
    endpoints = {s.get("endpoint") for s in subs}
    if sub.get("endpoint") not in endpoints:
        subs.append(sub)
        with open(SUBS_FILE, "w") as f:
            json.dump(subs, f, indent=2)
        print(f"  Subscription enregistrée ({len(subs)} au total)")

# ============================
# Send push
# ============================
def send_push_to_all(title="Dry Days", body="As-tu saisi ta conso d'aujourd'hui ?"):
    if webpush is None:
        print("  Push ignoré (pywebpush non installé)")
        return
    if not VAPID_PRIVATE or not VAPID_PUBLIC:
        print("  Push ignoré (clés VAPID manquantes)")
        return

    subs = load_subscriptions()
    if not subs:
        print("  Aucun abonné")
        return

    payload = json.dumps({"title": title, "body": body})
    dead = []

    for sub in subs:
        try:
            webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=VAPID_PRIVATE,
                vapid_claims=VAPID_CLAIMS,
            )
            print(f"  Push envoyé → {sub['endpoint'][:60]}...")
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                dead.append(sub["endpoint"])
            else:
                print(f"  Erreur push: {e}")

    # Clean expired subscriptions
    if dead:
        active = [s for s in subs if s.get("endpoint") not in dead]
        with open(SUBS_FILE, "w") as f:
            json.dump(active, f, indent=2)

# ============================
# Daily cron
# ============================
def seconds_until(hour, minute):
    now = datetime.now()
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()

def cron_loop():
    print(f"  Cron actif — notification chaque jour à {NOTIFY_HOUR:02d}h{NOTIFY_MINUTE:02d}")
    while True:
        wait = seconds_until(NOTIFY_HOUR, NOTIFY_MINUTE)
        h, m = int(wait // 3600), int((wait % 3600) // 60)
        print(f"  Prochain push dans {h}h{m:02d}m")
        time.sleep(wait)
        print(f"  Envoi push ({datetime.now().strftime('%H:%M')})")
        send_push_to_all()

# ============================
# HTTP Handler
# ============================
class Handler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def log_message(self, fmt, *args):
        # Silence asset logs, keep API logs
        if any(x in args[0] for x in ['.css', '.js', '.png', '.ico']):
            return
        super().log_message(fmt, *args)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path in ('/alcohol-tracker/api/vapid-key', '/api/vapid-key'):
            self._serve_vapid_key()
        else:
            # Strip /alcohol-tracker prefix for local serving
            if parsed.path.startswith('/alcohol-tracker'):
                self.path = self.path[len('/alcohol-tracker'):] or '/'
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path in ('/alcohol-tracker/api/push/subscribe', '/api/push/subscribe'):
            self._handle_subscribe()
        else:
            self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def _serve_vapid_key(self):
        if not VAPID_PUBLIC:
            self._json({"error": "No VAPID keys. Run generate_keys.py"}, 503)
            return
        self._json({"publicKey": VAPID_PUBLIC})

    def _handle_subscribe(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body   = self.rfile.read(length)
            sub    = json.loads(body)
            save_subscription(sub)
            self._json({"status": "ok"})
        except Exception as e:
            self._json({"error": str(e)}, 400)

    def _json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")


class ReuseServer(http.server.HTTPServer):
    allow_reuse_address = True


# ============================
# Main
# ============================
def main():
    print("🥤 Dry Days Server")
    print(f"   http://localhost:{PORT}/alcohol-tracker/\n")

    # Start cron in background thread
    t = threading.Thread(target=cron_loop, daemon=True)
    t.start()

    try:
        with ReuseServer(("", PORT), Handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServeur arrêté.")


if __name__ == "__main__":
    main()
