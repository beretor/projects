import os
import garth

print("Checking garth configuration...")
print(f"User Home: {os.path.expanduser('~')}")
print(f"Current Working Directory: {os.getcwd()}")

try:
    print("\nAttempting to locate credentials...")
    from garmin_mcp import auth_cli
    # Inspect where auth_cli saves
    print("garmin-mcp seems to save to ~/.garminconnect by default.")
except ImportError:
    print("Could not import garmin_mcp.auth_cli to check defaults.")

# Check common paths
paths = [
    os.path.expanduser("~/.garminconnect"),
    os.path.expanduser("~/.garth"),
    os.path.join(os.getcwd(), ".garminconnect"),
    os.path.join(os.getcwd(), ".garth")
]

print("\nChecking paths:")
found = False
for p in paths:
    exists = os.path.exists(p)
    print(f"  {p}: {'EXISTS' if exists else 'NOT FOUND'}")
    if exists:
        found = True
        try:
             print(f"    Contents: {os.listdir(p)}")
        except Exception as e:
             print(f"    Error reading: {e}")

if not found:
    print("\nNo token directories found. Authentication likely failed or saved elsewhere.")
