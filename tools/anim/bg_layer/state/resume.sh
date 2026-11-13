#!/bin/bash
# Ray 11-12：「GPU 空出來就繼續跑」—— 不設 SEP_NOWAIT：每一段 Wan 送出前都等 GPU 閒（使用率 <10% 連續 30 秒、佇列空）
cd "$(dirname "$0")"
export PYTHONIOENCODING=utf-8 SEP_REV=1 SEP_F=1 SEP_SUFFIX=_F
python sep_run.py dunmor__bogoffer__base --recomp
SEP_SEED=202 SEP_STAB=1 SEP_TRIM=0.4 python sep_run.py plainsroad__cairn__day --recomp
echo FIX7_DONE
for k in $(tr -d '\r' < indoor_keys.txt); do
  b=${k//__/_}; [ -f "out/${b}_sep_F/loop.mp4" ] && continue
  SEP_NOSKY=1 python sep_run.py "$k"
done
echo INDOOR_DONE
for k in belisar__forge__day belisar__greathall__day belisar__starroom__day belisar__stephall__day belisar__throne__day shinier_forest__glade__day shinier_forest__nest__day shinier_ruins__antechamber__day shinier_ruins__collapsed__day shinier_ruins__corridora__day shinier_ruins__corridorb__day shinier_ruins__crossway__day tomb__gate__day; do
  b=${k//__/_}; [ -f "out/${b}_sep_F/loop.mp4" ] && continue
  python sep_run.py "$k"
done
SEP_NOSKY=1 python sep_run.py belisar__offering__day
SEP_NOSKY=1 python sep_run.py tomb__nitrepit__base --recomp
echo DONE
