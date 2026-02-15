#!/bin/bash

# Configuration
PROJECT_DIR="/Users/pierreberet/Documents/projects"
VENV_DIR="$PROJECT_DIR/.venv"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
TOKEN_DIR="$HOME/.garminconnect"

echo "Checking for Garmin tokens in $TOKEN_DIR..."

if [ ! -d "$TOKEN_DIR" ]; then
    echo "Tokens not found. Starting authentication..."
    "$VENV_DIR/bin/garmin-mcp-auth"
    
    if [ ! -d "$TOKEN_DIR" ]; then
        echo "Authentication failed or cancelled (Tokens still missing)."
        exit 1
    fi
    echo "Authentication successful."
else
    echo "Tokens found."
fi

echo "Starting Workout Sync..."
cd "$SCRIPTS_DIR"
"$VENV_DIR/bin/python3" "$SCRIPTS_DIR/sync_garmin.py"
