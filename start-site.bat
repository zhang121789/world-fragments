@echo off
cd /d "%~dp0"
echo World Fragments local website
echo.
echo Frontend: http://localhost:3000
echo Admin:    http://localhost:3000/admin
echo.
start "World Fragments Server" cmd /k node server.js
timeout /t 2 /nobreak > nul
start "" "http://localhost:3000"
