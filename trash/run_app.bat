@echo off
echo ==========================================
echo STARTING LOCAL DEVELOPMENT
echo ==========================================
echo.
echo Launching Backend (Port 8000)...
start "Backend API (Python)" cmd /k "python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo Launching Frontend (Next.js)...
cd frontend
start "Frontend (Next.js)" cmd /k "npm run dev"

echo.
echo ==========================================
echo SERVERS STARTED!
echo - Backend: http://localhost:8000/docs
echo - Frontend: http://localhost:3000 (Uses 3001 if 3000 busy)
echo ==========================================
pause
