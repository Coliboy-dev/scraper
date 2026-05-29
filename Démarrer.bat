@echo off
cd /d "%~dp0"

:: Libère le port 3456 si occupé
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3456 "') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Lance le serveur en arrière-plan
start "" /B node src/server.js

:: Attends 2 secondes que le serveur démarre
timeout /t 2 /nobreak >nul

:: Ouvre le navigateur
start http://localhost:3456
