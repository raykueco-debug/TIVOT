#!/bin/bash
# Ray 11-13 01:30：「半小時後開始跑，跑到完」—— 30 分鐘後開跑；每段 Wan 都等顯存空、ComfyUI 連得上；跑兩輪（第一輪失敗的第二輪補）
cd "$(dirname "$0")"
# sleep 1800（Ray 01:3x「開跑」：不等了）
./resume.sh > resume4.log 2>&1
./resume.sh > resume5.log 2>&1
echo ALLDONE
