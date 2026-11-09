# KF 第二輪（Ray 11-09 Excel）：7 隻 A→B 49 ＋ B→A 33，natali rule
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s3_kf/redo/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
T="springy and dynamic: quick wind-up, explosive strike, bouncy recoil; throughout the whole clip the idle motion never stops, fur, smoke, cloth and loose parts keep flowing and the body keeps breathing, no frozen frames, no light, no glow, no flash, no sparks, no energy effects, no debris, camera completely fixed, plain green background, anime cel shading, clean lineart"
LOG=out/kf2.log; : > $LOG
W(){ G=$1; shift; env TIVOT_GEN=$G TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/kf2 >> $LOG 2>&1; echo "done $*" | cut -c1-120 >> $LOG; }
R(){ n=$1 g=$2 s=$3 ab=$4 ba=$5
  W $g --files "$D/${n}_A.png" --end "$D/${n}_B.png" --length 49 --seed $s --prompt "$ab, $T" --suffix _AB
  W $g --files "$D/${n}_B.png" --end "$D/${n}_A.png" --length 33 --seed $((s+1)) --prompt "$ba, $T" --suffix _BA; }
SW="exactly four legs only, the limb count never changes"
R bear_nightmare 720x720 7101 "a corrupted bear wreathed in writhing purple-black smoke tendrils rears its shoulders and rakes one front paw horizontally across in front of its chest in a heavy sideways claw slash, $SW" "the corrupted bear pulls its front paw back from the sideways swipe and settles into its low hunched stance, $SW"
R bear_husk 720x720 7111 "a rotting husk bear rears its shoulders and rakes one front paw horizontally across in front of its chest in a heavy sideways claw slash, $SW" "the husk bear pulls its front paw back from the sideways swipe and settles into its hunched stance, $SW"
R deernightmare 720x720 7121 "a pale corrupted deer lord with blossoming antlers lifts its head and throws it back, roaring up at the sky with its mouth wide open, petals and wisps swirling around it, $SW" "the deer lord lowers its head from the roar back into its proud standing stance, $SW"
R beast_bonemaw 720x720 7131 "a bone-armored beast crouches and rakes one front claw horizontally across in front of its body in a fast sideways slash, $SW" "the bone beast pulls its front claw back from the sideways slash and settles into its low crouch, $SW"
R stag_rot 720x720 7141 "a rotting stag lowers its head and lunges a short step toward the camera, thrusting its huge antlers forward at the viewer in a goring charge, $SW" "the rotting stag pulls its head up and steps back into its standing stance, $SW"
R gravekeeper_seal 720x720 7151 "a skeletal winged wyvern flares its wings and throws its head up, roaring at the sky with jaws wide open" "the skeletal wyvern lowers its head from the roar and folds back into its standing stance"
R saint_inspector 480x720 7161 "a winged reaper saint beats its mechanical golden wings forward hard toward the viewer in one strong flap, holding its scythes" "the reaper saint draws its wings back open into its hovering stance, holding its scythes"
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/kf2/* >> $LOG 2>&1
echo ALLDONE >> $LOG
