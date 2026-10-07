@echo off
rem animechk: TIVOT animation checker (server + player)
cd /d "C:\Users\Ray Ku\Desktop\ComfyUI-master\tivot_wan"
rem kill any old server on 8130 so the newest code is always used
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:"127.0.0.1:8130 .*LISTENING"') do taskkill /f /pid %%p >nul 2>&1
start "animechk server" /min python -X utf8 serve_player.py
timeout /t 2 /nobreak >nul
start "" "http://localhost:8130/player.html"
