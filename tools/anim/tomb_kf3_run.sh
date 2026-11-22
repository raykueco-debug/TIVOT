# 伊甸古墓 第三輪（Ray 11-22 晚：墓犬「最後一格根本用跳的」→ 換種子＋提示詞重跑；墓香爐／拱門守衛新 B 審過再跑）
# natali rule A→B 49 ＋ B→A 33，一個種子；3060 FLF。輸出 out/tomb_kf3，進 animechk 名＝tomb3_<名>_A_AB／_B_BA
# 輸入：resources/enemy/_neutral_refs/tomb_kf/wan/（對色、對齊；吊鍊屍對齊加倍率 1.27 保持 B 原比例，Ray 退過「尺寸縮小了」）
# 用法：bash tools/anim/tomb_kf2_run.sh [只跑這些名字...]
D="C:/Users/User/Desktop/TIVOT/resources/enemy/_neutral_refs/tomb_kf/wan"
cd "/c/Users/User/Desktop/ComfyUI-master/tivot_wan"
T="idle motion keeps going, cloth and chains keep swaying, camera fixed, plain green background, anime cel shading, clean lineart"
NG="no light, no glow, no flash, no sparks, no energy effects"
LOG=out/tomb_kf3.log; echo "=== $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/tomb_kf3 >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
want(){ [ -z "$ONLY" ] && return 0; for x in $ONLY; do [ "$x" = "$1" ] && return 0; done; return 1; }
ONLY="$*"; S=9700
R(){ n=$1; S=$((S+2)); want $n || return 0
  W --files "$D/${n}_A.png" --end "$D/${n}_B.png" --length 49 --seed $S --prompt "$2, $T" --suffix _AB
  W --files "$D/${n}_B.png" --end "$D/${n}_A.png" --length 33 --seed $((S+1)) --prompt "$3, $T" --suffix _BA; }
R arch_warden    "a skeletal monster bursts out of the dark arch and thrusts one huge claw straight at the camera, jaws gaping, the stone arch stays still, $NG" "the skeletal monster pulls its claw back and sinks back into the dark arch, the stone arch stays still"
R crypt_hound    "the crypt hound smoothly lunges forward at the camera and bites down, its paws staying planted, jaws snapping toward the viewer" "the crypt hound pulls back and crouches into its stance"
R chain_hanged   "the hanged corpse swings forward on its chains toward the camera, coming closer, and rakes both claws down at the viewer, $NG" "the hanged corpse swings back on its chains and hangs ready"
R grave_censer   "the grave censer lunges at the camera and swings a heavy censer on its chain straight into the lens" "the censer swings back on its chain and she straightens up into her stance"
R reliquary_hand "the giant reliquary hand bends forward and slams down toward the camera, its claws raking into the ground in front" "the giant hand lifts its claws off the ground and rises back upright into its stance"
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/tomb_kf3/* >> $LOG 2>&1
for d in out/tomb_kf3/*_AB out/tomb_kf3/*_BA; do n=tomb3_$(basename "$d"); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
