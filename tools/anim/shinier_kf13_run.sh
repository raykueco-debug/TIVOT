# 夏爾三區重做 第十三批（Ray 11-24：「再畫兩個不同的分離怪 包括 SPAWN 跟 IA」）：兩隻新分離怪的待機
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
T="thick milky liquid keeps slowly dripping and oozing down its body, camera fixed, plain green background, anime cel shading, clean lineart"
LOG=out/shinier_kf.log; echo "=== kf13 $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/shinier_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
W --files "$D/tspawn2_A.png" --loop --length 49 --seed 13401 --prompt "the crawling wax-like creature crouches on all fours, its arched back rises and falls with breathing, its long arms shift their grip on the ground, $T" --suffix _loop
W --files "$D/tspawn3_A.png" --loop --length 49 --seed 13403 --prompt "the tall melting veiled figure stands swaying slightly, its long veil ripples and sags, its body slowly rises and falls with breathing, $T" --suffix _loop
for d in out/shinier_kf/tspawn2_A_loop out/shinier_kf/tspawn3_A_loop; do n=sh_$(basename "$d"); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
