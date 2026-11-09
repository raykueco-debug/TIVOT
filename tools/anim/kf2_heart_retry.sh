# 心臟怪兩段 B→A 在 kf2_queue2 裡 OOM，等鹿主補跑完再補
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
until grep -q ALLDONE out/kf2_deer.log 2>/dev/null; do sleep 60; done
LOG=out/kf2_heart.log; : > $LOG
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s3_kf/redo/wan"
T=$(grep '^T=' "/c/Users/Ray Ku/Desktop/TIVOT/tools/anim/kf2_queue2.sh" | head -1 | sed 's/^T="//;s/"$//')
for p in "heart_bite 7262" "heart_claw 7264"; do set -- $p
  env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "$D/${1}_B.png" --end "$D/${1}_A.png" --length 33 --seed $2 --suffix _BA --mode idle --fps 16 --out out/kf2 --prompt "the monster pulls back into its standing stance, $T" >> $LOG 2>&1
  PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/kf2/${1}_B_BA >> $LOG 2>&1
done
echo ALLDONE >> $LOG
