@echo off
echo ==========================================
echo SETUP DATABASE & LOAD DATA
echo ==========================================
echo.
echo 1. Recreating Database (DROP + CREATE)...
python recreate_db.py
if %ERRORLEVEL% NEQ 0 (
    echo Error recreating database. Check your .env password!
    pause
    exit /b
)

echo.
echo 2. Loading XLSX Data...
python run_load.py
if %ERRORLEVEL% NEQ 0 (
    echo Error loading data. Check error_detail.txt for info.
    pause
    exit /b
)

echo.
echo ==========================================
echo SETUP COMPLETE!
echo You can now run run_app.bat
echo ==========================================
pause
