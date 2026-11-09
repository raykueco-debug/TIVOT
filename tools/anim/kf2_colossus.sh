# 巨像拳砸地（強透視），等 kf2_run.sh 跑完再跑
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s3_kf/redo/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
until grep -q ALLDONE out/kf2.log; do sleep 30; done
T="springy and dynamic: quick wind-up, explosive strike, bouncy recoil; throughout the whole clip the idle motion never stops, tattered cloth, chains and loose parts keep flowing and the body keeps breathing, no frozen frames, no light, no glow, no flash, no sparks, no energy effects, no debris, camera completely fixed, plain green background, anime cel shading, clean lineart"
LOG=out/kf2_col.log; : > $LOG
W(){ env TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/kf2 >> $LOG 2>&1; }
W --files "$D/colossus_A.png" --end "$D/colossus_B.png" --length 49 --seed 7171 --prompt "a giant stone colossus raises one huge fist and leans forward, then smashes the fist down onto the ground right in front of the camera with strong forced perspective, the fist growing enormous as it slams down close to the lens, $T" --suffix _AB
W --files "$D/colossus_B.png" --end "$D/colossus_A.png" --length 33 --seed 7172 --prompt "the stone colossus lifts its huge fist back up from the ground in front of the camera and straightens into its standing stance, $T" --suffix _BA
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/kf2/colossus_* >> $LOG 2>&1
echo ALLDONE >> $LOG
