#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Install Python 3.11 or newer from python.org, then run this file again."
  read -r -p "Press Enter to close."
  exit 1
fi
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
python3 -m pip install -r requirements.txt
printf '\nOpen http://127.0.0.1:8000 in your browser after the server starts.\nEnter your new Groq key below; it will not be displayed or saved to a file.\n\n'
python3 build_frontend.py
python3 run.py --ai
