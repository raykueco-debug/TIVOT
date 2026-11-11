#!/bin/bash
# 伊甸古墓跑完之後，接著跑 GPT 已摳好天空的格子（同一套 F 流程）
cd "$(dirname "$0")"
while ! grep -q DONE tomb_loop.log 2>/dev/null; do sleep 60; done
export SEP_REV=1 SEP_NOWAIT=1 SEP_F=1 SEP_SUFFIX=_F PYTHONIOENCODING=utf-8
for pass in 1 2; do
  for k in $(cat next_keys.txt); do
    b=${k//__/_}
    [ -f "out/${b}_sep_F/loop.mp4" ] && continue
    until curl -s -m 3 http://127.0.0.1:8188/queue >/dev/null; do sleep 20; done
    python sep_run.py "$k"
  done
done
echo DONE
