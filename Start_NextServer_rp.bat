@echo off
setlocal

cd /d "%~dp0"

start "Recruit Portal Server" /min cmd /c "npm.cmd run start"

start "" "http://localhost:3000"

exit /b 0
