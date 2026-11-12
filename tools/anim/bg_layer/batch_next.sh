#!/bin/bash
# Ray 11-12：瀑布不倒放；噴泉前庭遮人影；莊園門房換種子重跑；羅賽爾先停，跑下一批（室內不用 GPT 的格子）
cd "$(dirname "$0")"
export SEP_NOWAIT=1 PYTHONIOENCODING=utf-8 SEP_REV=1 SEP_F=1 SEP_SUFFIX=_F
python sep_run.py lake__cave__day --recomp
python sep_run.py lake__fallbase__day --recomp
SEP_PROTECT_BOX="0.54,0.30,0.63,0.53;0.69,0.48,0.79,0.66" python sep_run.py sofiaout__forecourt__base --recomp
mv out/sofiaout_lodge_base_sep_F out/sofiaout_lodge_base_sep_F_rej1 2>/dev/null
SEP_SEED=202 python sep_run.py sofiaout__lodge__base
echo FIX_DONE
export SEP_NOSKY=1
for pass in 1 2; do
  for k in $(tr -d '\r' < indoor_keys.txt); do
    b=${k//__/_}
    [ -f "out/${b}_sep_F/loop.mp4" ] && continue
    until curl -s -m 3 http://127.0.0.1:8188/queue >/dev/null; do sleep 20; done
    python sep_run.py "$k"
  done
done
echo DONE
