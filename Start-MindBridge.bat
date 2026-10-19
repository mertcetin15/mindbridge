@echo off
cd /d "%~dp0"
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
where python >nul 2>nul
if errorlevel 1 (
  echo Install Python 3.11 or newer from python.org, then run this file again.
  echo During setup, tick "Add python.exe to PATH".
  pause
  exit /b 1
)
if not exist .venv (
  python -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install -r requirements.txt
echo.
echo Open http://127.0.0.1:8000 in your browser after the server starts.
echo Enter your new Groq key below; it will not be displayed or saved to a file.
echo.
python build_frontend.py
python run.py --ai
pause
