@echo off
cls
echo ======================================
echo        SENSACALL LAUNCHER
echo ======================================
echo.
echo Choose how to run SensaCall:
echo.
echo 1) Open standalone HTML app (no server needed)
echo 2) Run with integrated server (full features)
echo 3) Run backend TypeScript server
echo.
set /p choice="Enter your choice (1-3, default is 1): "

if "%choice%"=="" set choice=1

if "%choice%"=="1" (
    echo Opening SensaCall standalone app...
    start sensacall-app.html
    echo.
    echo SensaCall is ready!
    echo If the browser didn't open, manually open: sensacall-app.html
    pause
) else if "%choice%"=="2" (
    echo Starting integrated server...
    where node >nul 2>nul
    if %errorlevel% neq 0 (
        echo Node.js is not installed. Please install Node.js first.
        pause
        exit /b 1
    )
    node integrated-server.js
) else if "%choice%"=="3" (
    echo Starting TypeScript backend...
    cd backend
    npm run dev
) else (
    echo Invalid choice. Opening standalone app...
    start sensacall-app.html
    pause
)