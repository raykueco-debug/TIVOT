# 夏爾三區重做 第三批（Ray 11-24：監查者鐮刀斬、巨型聖徒直拳＋砸地；上勾拳拿掉）—— 規格同 shinier_kf_run.sh
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
T="springy and dynamic, the idle motion keeps going, cloth, wings and chains keep swaying, the body keeps breathing, camera fixed, plain green background, anime cel shading, clean lineart"
NG="no light, no glow, no flash, no sparks, no energy effects"
LOG=out/shinier_kf.log; echo "=== kf3 $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/shinier_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
want(){ [ -z "$ONLY" ] && return 0; for x in $ONLY; do [ "$x" = "$1" ] && return 0; done; return 1; }
ONLY="$*"; S=12500
R(){ n=$1; S=$((S+2)); want $n || return 0
  W --files "$D/${n}_A.png" --end "$D/${n}_B.png" --length 49 --seed $S --prompt "$2, $T" --suffix _AB
  W --files "$D/${n}_B.png" --end "$D/${n}_A.png" --length 33 --seed $((S+1)) --prompt "$3, $T" --suffix _BA; }
R inspector_scythe "the winged inspector swings its great scythe in a wide arc straight at the camera, $NG" "the winged inspector pulls the scythe back and settles into its stance"
R thug_punch "the giant saint winds up and throws a huge straight punch at the camera, the fist rushing into the lens" "the giant saint pulls its fist back and settles into its stance"
R thug_slam "the giant saint raises both fists and smashes them down onto the ground right in front of the camera, debris flying" "the giant saint lifts its fists off the ground and straightens up into its stance"
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/shinier_kf/inspector_* out/shinier_kf/thug_* >> $LOG 2>&1
for d in out/shinier_kf/*_AB out/shinier_kf/*_BA out/shinier_kf/*_loop; do n=sh_$(basename "$d"); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
