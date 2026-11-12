#!/bin/bash
cd "$(dirname "$0")"
export SEP_NOWAIT=1 PYTHONIOENCODING=utf-8 SEP_REV=1 SEP_F=1 SEP_SUFFIX=_F
for pass in 1 2; do
  for k in $(tr -d '\r' < next_keys.txt); do
    b=${k//__/_}
    [ -f "out/${b}_sep_F/loop.mp4" ] && continue
    until curl -s -m 3 http://127.0.0.1:8188/queue >/dev/null; do sleep 20; done
    python sep_run.py "$k"
  done
done
echo DONE
