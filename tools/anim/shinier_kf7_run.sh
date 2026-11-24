# 夏爾三區重做 第七批（Ray 11-24）
#  · 節制者分離怪＝minion_forming_liquid_mass（wan/tspawn_A.png）：待機 loop ＋ 向下融化消失（倒放＝出場）
#  · 熊骸黑炎改程式火：B 換成無火版（GPT 摳掉火、嘴照張），A→B＋B→A
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
T="camera fixed, plain green background, anime cel shading, clean lineart"
LOG=out/shinier_kf.log; echo "=== kf7 $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/shinier_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
W --files "$D/tspawn_A.png" --loop --length 49 --seed 12901 --prompt "the melting wax-like humanoid stands in place, thick milky liquid keeps slowly dripping and oozing down its body and arms, its body slowly rises and falls with breathing, $T" --suffix _loop
W --files "$D/tspawn_A.png" --length 49 --seed 12903 --prompt "the melting wax-like humanoid collapses downward, its whole body melts like hot wax and slumps into a spreading puddle of thick milky liquid, the puddle shrinks and seeps away into the ground until nothing is left, $T" --suffix _melt
W --files "$D/bear_roar_A.png" --end "$D/bear_roar_B.png" --length 49 --seed 12905 --prompt "the skull-faced bear thrusts its head forward and roars with its jaws wide open, the purple smoke tendrils behind it swirl, springy and dynamic, fur keeps swaying, $T" --suffix _AB
W --files "$D/bear_roar_B.png" --end "$D/bear_roar_A.png" --length 33 --seed 12906 --prompt "the skull-faced bear closes its jaws and pulls its head back into its low crouching stance, the purple smoke tendrils keep swirling, fur keeps swaying, $T" --suffix _BA
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/shinier_kf/tspawn_* out/shinier_kf/bear_roar_* >> $LOG 2>&1
for d in out/shinier_kf/tspawn_* out/shinier_kf/bear_roar_*; do n=sh_$(basename "$d"); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
