#!/bin/bash
# 伊甸古墓剩下的格子：ComfyUI 活著才跑；當掉就等它回來；沒跑完的再跑一輪（最多 3 輪）
cd "$(dirname "$0")"
export SEP_NOSKY=1 SEP_REV=1 SEP_NOWAIT=1 SEP_F=1 SEP_SUFFIX=_F PYTHONIOENCODING=utf-8
for pass in 1 2 3; do
  for k in $(ls notes | grep '^tomb__.*__base$'); do
    b=${k//__/_}
    [ -f "out/${b}_sep_F/loop.mp4" ] && continue
    until curl -s -m 3 http://127.0.0.1:8188/queue >/dev/null; do sleep 20; done
    python sep_run.py "$k"
  done
done
echo DONE
