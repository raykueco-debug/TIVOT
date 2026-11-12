@echo off
title TIVOT Editor (8140)
cd /d "%~dp0..\..\.."
rem port 8130 is animechk, so the editor uses 8140
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:"127.0.0.1:8140 .*LISTENING"') do taskkill /f /pid %%p >nul 2>&1
start "" cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:8140/?project=pv_v4_board"
echo TIVOT Editor : http://localhost:8140/
echo Close this window to stop the editor.
py tools\promo\editor\server.py 8140
pause
