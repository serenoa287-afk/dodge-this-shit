@echo off
REM Dodge This Shit Game - Start Script (Windows)
REM =============================================

echo 🎮 Starting Dodge This Shit Game Server...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

REM Set port (default: 3000)
if "%PORT%"=="" set PORT=3000

echo 📦 Using Node.js version:
node --version
echo 🌐 Server will run on port: %PORT%
echo.
echo 🚀 Starting server...
echo ==========================================
echo.

node server.js