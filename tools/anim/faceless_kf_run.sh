# 地下聖徒（巨型聖徒）faceless：待機＋A 爪撲／M 上勾拳／D 直拳（Ray 11-20：「都過」）
# natali rule：A→B 49 ＋ B→A 33，一個種子；3060 走 FLF（--end）
# 輸入：resources/enemy/_neutral_refs/faceless_kf/wan/（kf_colormatch 對色、kf_align_bbox 對齊）
# 用法：bash tools/anim/faceless_kf_run.sh [idle atk miss delay ...]
D="C:/Users/User/Desktop/TIVOT/resources/enemy/_neutral_refs/faceless_kf/wan"
cd "/c/Users/User/Desktop/ComfyUI-master/tivot_wan"
T="idle motion keeps going, torn prayer cloth and broken chains keep swaying, camera fixed, plain green background, anime cel shading, clean lineart"
LOG=out/faceless_kf.log; echo "=== $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/faceless_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
SEG(){ W --files "$D/$1" --end "$D/$2" --length $3 --seed $4 --prompt "$5, $T" --suffix "$6"; }
want(){ [ -z "$ONLY" ] && return 0; for x in $ONLY; do [ "$x" = "$1" ] && return 0; done; return 1; }
ONLY="$*"
want idle  && env TIVOT_GEN=480x720 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "$D/faceless_A.png" --mode idle --loop --fps 16 --length 49 --seed 9201 --prompt "the giant masked saint stands coiled and ready to charge, heavy breathing, shoulders rising and falling, fists flexing, weight shifting on the front foot, menacing pressure, torn prayer cloth and broken chains swaying, camera completely fixed, plain green background, anime cel shading, clean lineart" --suffix _idle --out out/faceless_kf >> $LOG 2>&1
want atk   && { SEG atk_A.png atk_B.png 49 9211 "the giant masked saint lunges at the camera and rakes his huge claw diagonally down across his body" _AB; SEG atk_B.png atk_A.png 33 9212 "the giant masked saint pulls his claw back and settles into his ready stance" _BA; }
want miss  && { SEG miss_A.png miss_B.png 49 9221 "the giant masked saint drops low and drives a huge uppercut up toward the camera" _AB; SEG miss_B.png miss_A.png 33 9222 "the giant masked saint lowers his fist and settles into his ready stance" _BA; }
want delay && { SEG delay_A.png delay_B.png 49 9231 "the giant masked saint steps in and throws a huge straight punch right at the camera" _AB; SEG delay_B.png delay_A.png 33 9232 "the giant masked saint pulls his fist back and settles into his ready stance" _BA; }
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/faceless_kf/* >> $LOG 2>&1
echo ALLDONE >> $LOG
