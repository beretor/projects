#!/usr/bin/env python3
"""
Generate VAPID keys for Web Push notifications.
Run once: python generate_keys.py
"""
import json
from pathlib import Path

try:
    from py_vapid import Vapid
except ImportError:
    print("Install dependencies first: pip install -r requirements.txt")
    exit(1)

KEY_FILE = Path(__file__).parent / "vapid_keys.json"

if KEY_FILE.exists():
    print(f"Keys already exist at {KEY_FILE}")
    with open(KEY_FILE) as f:
        keys = json.load(f)
    print(f"Public key: {keys['publicKey']}")
else:
    vapid = Vapid()
    vapid.generate_keys()
    keys = {
        "publicKey":  vapid.public_key.public_bytes(
            encoding=__import__('cryptography.hazmat.primitives.serialization', fromlist=['Encoding']).Encoding.X962 if False else None,
        )
    }

    # Use the built-in serialization from py_vapid
    pub  = vapid.public_key_urlsafe_base64
    priv = vapid.private_key_urlsafe_base64

    keys = {"publicKey": pub, "privateKey": priv}
    with open(KEY_FILE, "w") as f:
        json.dump(keys, f, indent=2)

    print("VAPID keys generated!")
    print(f"Public key: {pub}")
    print(f"\nKeys saved to {KEY_FILE}")

print("\nNow run: python server.py")
