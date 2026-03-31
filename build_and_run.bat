@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo IronClaw Robot Health Monitor - Build ^& Run Script
echo ===================================================
echo.

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH. Please install Python 3.9+.
    pause
    exit /b 1
)

:: Check for Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH. Please install Node.js 18+.
    pause
    exit /b 1
)

:: Step 1: Setup Backend
echo [1/4] Setting up Python Backend...
cd backend
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing backend requirements...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend requirements.
    pause
    exit /b 1
)

:: Start Backend in Background
echo Starting FastAPI Backend...
start "IronClaw Backend" cmd /c "call venv\Scripts\activate & uvicorn app.main:app --host 127.0.0.1 --port 8000"
cd ..

:: Step 2: Setup Frontend
echo [2/4] Setting up React Frontend...
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
)

:: Step 3: Start Frontend Server
echo [3/4] Starting Vite Frontend Server...
start "IronClaw Frontend" cmd /c "npm run dev"
cd ..

:: Step 4: Open Browser
echo [4/4] Launching Browser...
timeout /t 5 /nobreak >nul
start http://localhost:5173/

echo.
echo ===================================================
echo The application is now running!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo.
echo Note: Two command prompt windows have been opened for the servers.
echo To stop the application, simply close those command prompt windows.
echo ===================================================
pause
