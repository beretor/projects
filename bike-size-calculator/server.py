#!/usr/bin/env python3
"""
Strava OAuth Server
Handles the OAuth flow automatically for the bike-size-calculator app.
Run this instead of the simple http.server.
"""

import http.server
import json
import os
import urllib.parse
import urllib.request
import webbrowser
import sys
from pathlib import Path

# ⚠️ CONFIGURE THESE WITH YOUR STRAVA API CREDENTIALS
CLIENT_ID = "90376"
CLIENT_SECRET = "6fc0efc941ef6e31714f77b04e154e13245a10f0"
REDIRECT_URI = "http://localhost:8000/oauth/callback"

PORT = 8000
STATIC_DIR = Path(__file__).parent


class RobustHTTPServer(http.server.HTTPServer):
    """Server that allows address reuse."""
    allow_reuse_address = True


class OAuthHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler that adds OAuth endpoints."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        print(f"DEBUG: Request path: {parsed.path}")

        if parsed.path == "/oauth/authorize":
            # Redirect to Strava OAuth
            self.redirect_to_strava()
        elif parsed.path == "/oauth/callback":
            # Handle Strava callback
            self.handle_callback(parsed.query)
        elif parsed.path == "/api/token":
            # Return stored token
            self.serve_token()
        elif parsed.path == "/api/logout":
            # Handle logout
            self.handle_logout()
        elif parsed.path == "/api/garmin/sync":
            # Garmin Sync is POST only for safety/cleanliness, 
            # but I'll return 405 if GET.
            self.send_error(405, "Method Not Allowed")
        else:
            # Serve static files
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        print(f"DEBUG: POST Request path: {parsed.path}")

        if parsed.path == "/api/garmin/sync":
            self.handle_garmin_sync()
        else:
            self.send_error(404, "Not Found")

    def handle_garmin_sync(self):
        """Handle Garmin workout sync request."""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            plan_data = json.loads(post_data.decode('utf-8'))

            import garmin_sync
            result = garmin_sync.sync_workouts(plan_data)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            print(f"ERROR in garmin sync: {e}")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def redirect_to_strava(self):
        """Redirect user to Strava authorization page."""
        auth_url = (
            f"https://www.strava.com/oauth/authorize"
            f"?client_id={CLIENT_ID}"
            f"&response_type=code"
            f"&redirect_uri={urllib.parse.quote(REDIRECT_URI)}"
            f"&scope=read,activity:read_all"
            f"&approval_prompt=auto"
        )
        self.send_response(302)
        self.send_header("Location", auth_url)
        self.end_headers()

    def handle_callback(self, query_string):
        """Exchange authorization code for access token."""
        params = urllib.parse.parse_qs(query_string)

        if "error" in params:
            self.send_error_page(params.get("error", ["Unknown error"])[0])
            return

        code = params.get("code", [None])[0]
        if not code:
            self.send_error_page("No authorization code received")
            return

        # Exchange code for token
        try:
            token_data = self.exchange_code(code)
            self.save_token(token_data)
            self.send_success_page(token_data)
        except Exception as e:
            self.send_error_page(str(e))

    def exchange_code(self, code):
        """Exchange authorization code for access token."""
        data = urllib.parse.urlencode({
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code"
        }).encode()

        req = urllib.request.Request(
            "https://www.strava.com/oauth/token",
            data=data,
            method="POST"
        )

        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())

    def save_token(self, token_data):
        """Save token to a local file for persistence."""
        token_file = STATIC_DIR / ".strava_token.json"
        with open(token_file, "w") as f:
            json.dump(token_data, f)

    def serve_token(self):
        """Serve the stored token via API, refreshing if expired."""
        token_file = STATIC_DIR / ".strava_token.json"
        
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        if not token_file.exists():
            self.wfile.write(b'{"error": "No token stored"}')
            return

        try:
            with open(token_file, "r") as f:
                token_data = json.load(f)

            # Check expiration (expires_at is unix timestamp)
            # Refresh if expired or will expire in < 5 minutes
            import time
            expires_at = token_data.get("expires_at", 0)
            now = time.time()
            
            if now + 300 > expires_at:
                print("DEBUG: Token expired or expiring soon. Refreshing...")
                refresh_token = token_data.get("refresh_token")
                if refresh_token:
                    new_token_data = self.refresh_access_token(refresh_token)
                    if new_token_data and "access_token" in new_token_data:
                        # Merge new data (sometimes refresh response doesn't include athlete)
                        token_data.update(new_token_data)
                        self.save_token(token_data)
                        print("DEBUG: Token refreshed successfully.")
                    else:
                         print("ERROR: Failed to refresh token.")
            
            self.wfile.write(json.dumps(token_data).encode())

        except Exception as e:
            print(f"ERROR serving token: {e}")
            self.wfile.write(b'{"error": "Internal Server Error"}')

    def handle_logout(self):
        """Delete user token to log out."""
        token_file = STATIC_DIR / ".strava_token.json"
        try:
            if token_file.exists():
                os.remove(token_file)
                print("DEBUG: Token file deleted.")
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status": "logged_out"}')
        except Exception as e:
            print(f"ERROR logging out: {e}")
            self.send_error(500, f"Error deleting token: {e}")

    def refresh_access_token(self, refresh_token):
        """Use refresh_token to get a new access_token."""
        try:
            data = urllib.parse.urlencode({
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token"
            }).encode()

            req = urllib.request.Request(
                "https://www.strava.com/oauth/token",
                data=data,
                method="POST"
            )

            with urllib.request.urlopen(req) as response:
                return json.loads(response.read().decode())
        except Exception as e:
            print(f"ERROR refreshing token: {e}")
            return None

    def send_success_page(self, token_data):
        """Send success page that auto-closes and updates the app."""
        athlete = token_data.get("athlete", {})
        name = f"{athlete.get('firstname', '')} {athlete.get('lastname', '')}"
        access_token = token_data.get("access_token", "")

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Connexion Strava réussie !</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
        }}
        .container {{
            text-align: center;
            padding: 3rem;
            background: rgba(255,255,255,0.1);
            border-radius: 16px;
            backdrop-filter: blur(10px);
        }}
        .success {{ font-size: 4rem; margin-bottom: 1rem; }}
        h1 {{ margin: 0 0 1rem 0; }}
        p {{ opacity: 0.8; }}
        .countdown {{ font-weight: bold; color: #FC4C02; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="success">✅</div>
        <h1>Bienvenue, {name} !</h1>
        <p>Connexion Strava réussie.</p>
        <p>Retour à l'application dans <span class="countdown" id="countdown">3</span>s...</p>
    </div>
    <script>
        // Pass token to opener window
        if (window.opener) {{
            window.opener.postMessage({{
                type: 'STRAVA_TOKEN',
                token: '{access_token}',
                athlete: {json.dumps(athlete)}
            }}, '*');
        }}
        
        // Countdown and close
        let count = 3;
        const interval = setInterval(() => {{
            count--;
            document.getElementById('countdown').textContent = count;
            if (count <= 0) {{
                clearInterval(interval);
                window.close();
            }}
        }}, 1000);
    </script>
</body>
</html>
"""
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode())

    def send_error_page(self, error):
        """Send error page."""
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Erreur Strava</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #1a1a2e;
            color: white;
        }}
        .container {{ text-align: center; padding: 3rem; }}
        .error {{ font-size: 4rem; margin-bottom: 1rem; }}
        .message {{ color: #ff6b6b; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="error">❌</div>
        <h1>Erreur de connexion</h1>
        <p class="message">{error}</p>
        <p><a href="/" style="color: #FC4C02;">Retour à l'application</a></p>
    </div>
</body>
</html>
"""
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode())


def main():
    print(f"🚴 Bike Size Calculator with Strava OAuth")
    print(f"📡 Server running at http://localhost:{PORT}")
    print(f"🔐 OAuth callback at {REDIRECT_URI}")
    print(f"\nPress Ctrl+C to stop.\n")

    try:
        with RobustHTTPServer(("", PORT), OAuthHandler) as httpd:
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n👋 Server stopped.")
    except OSError as e:
        if e.errno == 48:
            print(f"❌ Error: Port {PORT} is already in use.")
            print(f"💡 Try running: lsof -i :{PORT} to find the process ID, then kill it.")
            sys.exit(1)
        else:
            raise


if __name__ == "__main__":
    main()
