@echo off
chcp 65001 >nul
:: TIVOT Wan tool: put transparent PNG/WebP into in\  then double-click.
:: Default mode = hit. For idle: run_idle.bat, or put "mode=idle" in a same-name .txt
cd /d "%~dp0"
"..\.venv\Scripts\python.exe" tivot_wan.py %*
pause
