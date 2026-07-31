@echo off
echo ============================================
echo  KrishiMind - Global Agricultural AI App
echo  Starting All Services...
echo ============================================
echo.

echo [1/3] Starting ML Service (FastAPI on port 8000)...
start "KrishiMind ML Service" cmd /k "cd /d c:\Users\aksha\OneDrive\Desktop\KrishiMind\ml-service && .\.venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo Waiting 5 seconds for ML service to initialize...
ping 127.0.0.1 -n 6 > nul

echo [2/3] Starting Backend API (Node.js on port 5000)...
start "KrishiMind Backend API" cmd /k "cd /d c:\Users\aksha\OneDrive\Desktop\KrishiMind\backend && node server.js"

echo Waiting 3 seconds for backend to start...
ping 127.0.0.1 -n 4 > nul

echo [3/3] Starting KrishiMind Expo App (Web on port 8081)...
start "KrishiMind Expo App" cmd /k "cd /d c:\Users\aksha\OneDrive\Desktop\KrishiMind\app && npm run web"

echo.
echo ============================================
echo  All Services Starting:
echo    ML Service   : http://localhost:8000
echo    Backend API  : http://localhost:5000
echo    Expo App     : http://localhost:8081
echo    Health Check : http://localhost:8000/health
echo ============================================
echo.
echo All services launched! Opening application in 8 seconds...
ping 127.0.0.1 -n 9 > nul
start http://localhost:8081
echo.
echo Press any key to exit this launcher...
pause > nul
