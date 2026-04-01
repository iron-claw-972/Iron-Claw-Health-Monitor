@echo off
:: Force the script to run from its own directory
cd /d "%~dp0"

echo [1/4] Setting up Python Environment...
if not exist "backend\venv" (
    echo Creating virtual environment...
    python -m venv backend\venv
)

echo [2/4] Installing Backend Dependencies...
cd backend
call venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cd ..

echo [3/4] Building Frontend...
cd frontend
if not exist "node_modules" (
    echo Installing node modules...
    call npm install
)
echo Compiling React app...
:: Note: npm is case-sensitive on some systems, using lowercase 'build'
call npm run build
cd ..

echo [4/4] Starting Dashboard Server...
echo ========================================
echo Dashboard is now starting!
echo Open your browser to: http://localhost:8000
echo ========================================
cd backend
call venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
