# 夏爾村／森林／木雅克 重做（Ray 11-23：「除了已接上的重做吧 技法有更新」），natali／tiger rule
# A→B 49 ＋ B→A 33，一個種子；輸出 out/shinier_kf，進 animechk 名＝sh_<名>_AB／_BA
# 輸入：resources/enemy/_neutral_refs/s4_kf/wan/（kf_colormatch 對色 → kf_align_bbox 對齊）
# 用法：bash tools/anim/shinier_kf_run.sh [只跑這些名字...]
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
T="springy and dynamic, the idle motion keeps going, fur and smoke tendrils keep swaying, the body keeps breathing, camera fixed, plain green background, anime cel shading, clean lineart"
NG="no light, no glow, no flash, no sparks, no energy effects"
LOG=out/shinier_kf.log; echo "=== $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/shinier_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
want(){ [ -z "$ONLY" ] && return 0; for x in $ONLY; do [ "$x" = "$1" ] && return 0; done; return 1; }
ONLY="$*"; S=12300
R(){ n=$1; S=$((S+2)); want $n || return 0
  W --files "$D/${n}_A.png" --end "$D/${n}_B.png" --length 49 --seed $S --prompt "$2, $T" --suffix _AB
  W --files "$D/${n}_B.png" --end "$D/${n}_A.png" --length 33 --seed $((S+1)) --prompt "$3, $T" --suffix _BA; }
R bear_pounce "the skull-faced bear crouches, then explosively pounces straight at the camera, both front paws thrown forward at the lens, jaws wide open, $NG" "the skull-faced bear pulls its paws back and settles into its low crouching stance"
R bear_flame  "the skull-faced bear thrusts its head forward and breathes a torrent of dark purple flame straight at the camera" "the flame dies down and the skull-faced bear pulls its head back into its low crouching stance"
R reliquary_chest "the reliquary bear rears up and throws its chest forward at the camera, the cabinet doors in its ribcage fly wide open and golden light ribbons and bone shards burst out straight at the lens" "the cabinet doors swing shut, the ribcage closes and the reliquary bear settles back into its stance"
R reliquary_swipe "the reliquary bear sweeps one huge front paw horizontally across in front of the camera, a wide sideways claw swipe, $NG" "the reliquary bear pulls its paw back and settles into its stance"
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/shinier_kf/* >> $LOG 2>&1
for d in out/shinier_kf/*_AB out/shinier_kf/*_BA; do n=sh_$(basename "$d"); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
