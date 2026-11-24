# 夏爾三區重做 第五批（Ray 11-24 早：「節制者分離怪是要用節制者的 I 跑的，從它身上像是黏稠液體凝結滴下」）
# I（節制者原立繪）→ B（黏液滴下、腳邊凝出無臉怪）49 格；只跑一段，不跑回程（之後切到分離怪自己的卡）
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
T="the idle motion keeps going, cloth, chains and loose parts keep swaying, the body keeps breathing, camera fixed, plain green background, anime cel shading, clean lineart"
LOG=out/shinier_kf.log; echo "=== kf5 $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/shinier_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
W --files "$D/temperance_split_A.png" --end "$D/temperance_split_B.png" --length 49 --seed 12701 \
  --prompt "thick viscous milky white liquid slowly oozes out of the many-armed saint's chest and belly, sagging down like melting wax and dripping in long sticky strands to the ground, pooling at its feet, the pool swells and congeals upward into a faceless humanoid figure, head and shoulders forming, $T" --suffix _AB
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/shinier_kf/temperance_split_* >> $LOG 2>&1
for d in out/shinier_kf/temperance_split_*_AB; do n=sh_$(basename "$d"); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
