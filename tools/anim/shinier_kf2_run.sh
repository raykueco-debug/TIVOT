# 夏爾三區重做 第二批（Ray 11-24 審過 s4_kf）—— 規格同 shinier_kf_run.sh
# 用法：bash tools/anim/shinier_kf2_run.sh [只跑這些名字...]
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
T="springy and dynamic, the idle motion keeps going, fur, cloth, chains and loose parts keep swaying, the body keeps breathing, camera fixed, plain green background, anime cel shading, clean lineart"
NG="no light, no glow, no flash, no sparks, no energy effects"
LOG=out/shinier_kf.log; echo "=== kf2 $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/shinier_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
want(){ [ -z "$ONLY" ] && return 0; for x in $ONLY; do [ "$x" = "$1" ] && return 0; done; return 1; }
ONLY="$*"; S=12400
R(){ n=$1; S=$((S+2)); want $n || return 0
  W --files "$D/${n}_A.png" --end "$D/${n}_B.png" --length 49 --seed $S --prompt "$2, $T" --suffix _AB
  W --files "$D/${n}_B.png" --end "$D/${n}_A.png" --length 33 --seed $((S+1)) --prompt "$3, $T" --suffix _BA; }
L(){ n=$1; S=$((S+2)); want $n || return 0
  W --files "$D/${n}_A.png" --loop --length 49 --seed $S --prompt "$2, $T" --suffix _loop; }
R stag_flame      "the skeletal stag lowers its antlers and blasts a torrent of dark purple flame straight at the camera" "the flame dies down and the skeletal stag lifts its head back into its stance"
R shackle_bite    "the chained beast lunges straight at the camera and bites down at the lens, its chains swinging" "the chained beast pulls back and crouches into its stance, chains swaying"
R prison_claw     "the chained saint lunges forward and rakes its claws down at the camera, $NG" "the chained saint pulls its claws back and settles into its stance"
R temperance_grab "the many-handed saint lunges forward and all its pale hands grab straight at the camera" "the pale hands pull back and the saint settles into its stance"
R heart_claw      "the heartripper lunges forward and rakes one claw straight down at the camera, $NG" "the heartripper pulls its claw back and settles into its stance"
R bellreacher_slam "the bell creature heaves its huge bell and slams it straight at the camera" "the bell creature pulls the bell back and settles into its stance"
R bellwalker_slam "the bell creature raises its huge bell and slams it down hard in front of the camera" "the bell creature lifts the bell back up and settles into its stance"
L bellreacher_shake "the bell creature shudders and shakes violently, its whole body and the bell rattling hard, then calms back to its stance"
L bellwalker_shake  "the bell creature shudders and shakes violently, its whole body and the bell rattling hard, then calms back to its stance"
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/shinier_kf/*_AB out/shinier_kf/*_BA out/shinier_kf/*_loop >> $LOG 2>&1
for d in out/shinier_kf/*_AB out/shinier_kf/*_BA out/shinier_kf/*_loop; do n=sh_$(basename "$d"); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
