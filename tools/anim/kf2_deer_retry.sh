# 鹿主 A→B 在 kf2_queue2 裡 OOM 中斷，等佇列跑完再補一次
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
until grep -q ALLDONE out/kf2b.log; do sleep 60; done
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s3_kf/redo/wan"
T=$(grep '^T=' "/c/Users/Ray Ku/Desktop/TIVOT/tools/anim/kf2_queue2.sh" | head -1 | sed 's/^T="//;s/"$//')
env TIVOT_GEN=720x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "$D/deernightmare2_A.png" --end "$D/deernightmare2_B.png" --length 49 --seed 7125 --suffix _AB --mode idle --fps 16 --out out/kf2 --prompt "a pale corrupted deer lord with blossoming antlers lifts its head and throws it back, roaring up at the sky with its mouth wide open, petals and wisps swirling around it; the deer stays exactly the same size the whole time, it never shrinks or moves away, exactly four legs only, the limb count never changes, $T" > out/kf2_deer.log 2>&1
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/kf2/deernightmare2_A_AB >> out/kf2_deer.log 2>&1; echo ALLDONE >> out/kf2_deer.log
