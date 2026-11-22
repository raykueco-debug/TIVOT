# 夏爾森林缺的中立待機（Ray 11-22：「都補上 有缺的先補ABI」）：水蛇／山豬／腐鹿骸
# A 已有（中立站姿），待機不需 KF；一個種子、循環 49 格
R="C:/Users/User/Desktop/TIVOT/resources/enemy/_neutral_refs"
cd "/c/Users/User/Desktop/ComfyUI-master/tivot_wan"
LOG=out/s3_idle.log; echo "=== $(date)" >> $LOG
I(){ env TIVOT_GEN=480x720 PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "$1" --mode idle --loop --fps 16 --length 49 --seed $2 --prompt "$3, camera completely fixed, plain green background, anime cel shading, clean lineart" --suffix _idle --out out/s3_idle >> $LOG 2>&1; echo "done $1" >> $LOG; }
I "$R/mon_shinierforest_snake_neutral.png" 9401 "the giant water snake sways its raised head slowly side to side, coils tightening and loosening, tongue flicking, menacing, ready to strike"
I "$R/mon_shinierforest_hog_neutral.png" 9402 "the giant boar snorts and paws the ground, heavy breathing, shoulders heaving, bristles shivering, head low and ready to charge"
I "$R/s3_kf/redo/wan/stag_rot_A.png" 9403 "the rotting stag breathes heavily, head lowered with antlers forward, shoulders rising and falling, torn hide swaying, ready to charge"
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/s3_idle/* >> $LOG 2>&1
echo ALLDONE >> $LOG
