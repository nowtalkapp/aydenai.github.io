@echo off
title Ayden AI
cd /d "%~dp0"
if not exist ".env" (
 echo ERROR: .env is missing. Copy .env.example to .env and fill it in.
 pause
 exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
 echo ERROR: Node.js is not installed.
 pause
 exit /b 1
)
if not exist "node_modules" (
 echo Installing Ayden dependencies...
 call npm install
 if errorlevel 1 (
  echo.
  echo npm install failed.
  pause
  exit /b 1
 )
)
echo.
echo Ayden is starting...
start "" "http://localhost:3000"
call npm start
pause
