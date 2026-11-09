# KF 第二輪 11-10：Ray 審片後的修正＋Excel「用現有 B」的格子（natali：A→B 49＋B→A 33，FIT 0.78，motionfix，一個種子）
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s3_kf/redo/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
T="springy and dynamic: quick wind-up, explosive strike, bouncy recoil; throughout the whole clip the idle motion never stops, fur, smoke, cloth and loose parts keep flowing and the body keeps breathing, no frozen frames, no light, no glow, no flash, no sparks, no energy effects, no debris, camera completely fixed, plain green background, anime cel shading, clean lineart"
TG="springy and dynamic: quick wind-up, explosive strike, bouncy recoil; throughout the whole clip the idle motion never stops, fur, smoke, cloth and loose parts keep flowing and the body keeps breathing, no frozen frames, its own golden light bands stay as they are, no sparks, no debris, camera completely fixed, plain green background, anime cel shading, clean lineart"
SW="exactly four legs only, the limb count never changes"
LOG=out/kf2b.log; : > $LOG
W(){ G=$1; shift; env TIVOT_GEN=$G TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/kf2 >> $LOG 2>&1; echo "done $*" | cut -c1-120 >> $LOG; }
AB(){ W $2 --files "$D/${1}_A.png" --end "$D/${1}_B.png" --length 49 --seed $3 --prompt "$4" --suffix _AB; }
BA(){ W $2 --files "$D/${1}_B.png" --end "$D/${1}_A.png" --length 33 --seed $3 --prompt "$4" --suffix _BA; }
BITE="lunges forward toward the camera with jaws wide open in a pouncing bite"
BACK="pulls back from the lunge and settles into its standing stance"
SWIPE="rakes one front paw horizontally across in front of its chest in a heavy sideways claw slash"
SBACK="pulls its front paw back from the sideways swipe and settles into its stance"
# 修正
W 720x720 --files "$D/beast_bonemaw_B.png" --end "$D/beast_bonemaw_A.png" --length 33 --seed 7135 --suffix _BA2 --prompt "the bone beast lifts its clawed paw up off the ground and swings it back out to the side through the air in a wide arc, then sets it down into its low crouch; the paw never drags, scrapes or digs along the ground, $SW, $T"
AB deernightmare2 720x720 7125 "a pale corrupted deer lord with blossoming antlers lifts its head and throws it back, roaring up at the sky with its mouth wide open, petals and wisps swirling around it; the deer stays exactly the same size the whole time, it never shrinks or moves away, $SW, $T"
BA deernightmare2 720x720 7126 "the deer lord lowers its head from the roar back into its proud standing stance, the deer stays exactly the same size, $SW, $T"
# 現有 B
for p in "organ_bite|a flesh-torn beast $BITE|a flesh-torn beast $BACK|7201" "organ_claw|a flesh-torn beast $SWIPE|a flesh-torn beast $SBACK|7203" \
         "stagn_bite|a nightmare deer skeleton $BITE|the deer skeleton $BACK|7211" "stagn_claw|a nightmare deer skeleton sweeps one front hoof horizontally across in front of its chest|the deer skeleton pulls its hoof back and settles into its stance|7213" \
         "bearn_bite|a corrupted bear wreathed in smoke $BITE|the corrupted bear $BACK|7221" "bearn_claw|a corrupted bear wreathed in smoke $SWIPE|the corrupted bear $SBACK|7223" \
         "deer_bite|a pale corrupted deer lord with blossoming antlers lunges forward toward the camera, head low, antlers first|the deer lord $BACK|7231" \
         "bonemaw_bite|a bone-armored beast $BITE|the bone beast $BACK|7241"; do
  IFS='|' read n a b s <<< "$p"; AB $n 720x720 $s "$a, $SW, $T"; BA $n 720x720 $((s+1)) "$b, $SW, $T"; done
AB reliq_bite 720x720 7251 "a relic-encrusted holy beast $BITE, $SW, $TG"; BA reliq_bite 720x720 7252 "the relic beast $BACK, $SW, $TG"
AB reliq_claw 720x720 7253 "a relic-encrusted holy beast $SWIPE, $SW, $TG"; BA reliq_claw 720x720 7254 "the relic beast $SBACK, $SW, $TG"
AB heart_bite 480x720 7261 "a heart-ripping monster lunges forward toward the camera in a pouncing grab, $T"; BA heart_bite 480x720 7262 "the monster pulls back from the lunge into its standing stance, $T"
AB heart_claw 480x720 7263 "a heart-ripping monster raises one clawed arm high and slashes it diagonally down across its body, $T"; BA heart_claw 480x720 7264 "the monster pulls its clawed arm back up into its standing stance, $T"
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/kf2/beast_bonemaw_B_BA2 out/kf2/*2_A_AB out/kf2/*2_B_BA out/kf2/*_bite_* out/kf2/*_claw_* >> $LOG 2>&1
echo ALLDONE >> $LOG
