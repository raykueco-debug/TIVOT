# 夏爾三區重做 第四批（Ray 11-24：裂肉獸去煙、森林熊骸重去背、王的容器內縮，＋兩隻新 A 的待機）—— 規格同 shinier_kf_run.sh
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
T="springy and dynamic, the idle motion keeps going, fur, cloth and loose parts keep swaying, the body keeps breathing, camera fixed, plain green background, anime cel shading, clean lineart"
NG="no light, no glow, no flash, no sparks, no energy effects"
LOG=out/shinier_kf.log; echo "=== kf4 $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/shinier_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
want(){ [ -z "$ONLY" ] && return 0; for x in $ONLY; do [ "$x" = "$1" ] && return 0; done; return 1; }
ONLY="$*"; S=12600
R(){ n=$1; S=$((S+2)); want $n || return 0
  W --files "$D/${n}_A.png" --end "$D/${n}_B.png" --length 49 --seed $S --prompt "$2, $T" --suffix _AB
  W --files "$D/${n}_B.png" --end "$D/${n}_A.png" --length 33 --seed $((S+1)) --prompt "$3, $T" --suffix _BA; }
L(){ n=$1; S=$((S+2)); want $n || return 0
  W --files "$D/${n}_A.png" --loop --length 49 --seed $S --prompt "$2, $T" --suffix _loop; }
R organ_bite "the organ-pipe goat beast lunges straight at the camera and bites at the lens, front legs reaching forward" "the organ-pipe goat beast pulls back and settles into its stance"
R organ_charge "the organ-pipe goat beast crouches low and braces all four legs, its back arches and the organ pipes rise and tremble as it gathers power" "the organ-pipe goat beast relaxes and rises back into its stance"
R husk_pounce "the skull-faced bear lunges and pounces straight at the camera, both front paws thrown forward at the lens, $NG" "the skull-faced bear pulls its paws back and settles into its hunched stance"
R husk_claw "the skull-faced bear sweeps one front paw horizontally across in front of the camera while the other paw stays planted, $NG" "the skull-faced bear pulls its paw back and settles into its hunched stance"
R halo_contract "the halo creature curls its white robes and sleeves tightly inward toward its glowing core, drawing everything in and folding its hands over the core" "the halo creature slowly unfurls its robes and sleeves back out into its stance"
L organ_idle "the organ-pipe goat beast stands in place breathing, fur swaying slightly, head shifting a little, a calm idle loop"
L husk_idle "the skull-faced bear stands hunched in place breathing heavily, fur swaying slightly, head shifting a little, a calm idle loop"
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/shinier_kf/organ_* out/shinier_kf/husk_* out/shinier_kf/halo_* >> $LOG 2>&1
for d in out/shinier_kf/*_AB out/shinier_kf/*_BA out/shinier_kf/*_loop; do n=sh_$(basename "$d"); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
