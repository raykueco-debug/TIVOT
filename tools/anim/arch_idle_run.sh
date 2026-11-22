# 拱門守衛待機重畫（Ray 11-22：「拱門 IDLE 重畫 出框了」）：舊 mon_arch_warden_idle_v2 的 box 超出立繪寬（-8～1058）
# 主體縮到 0.78 留邊；一個種子、循環 49 格
R="C:/Users/User/Desktop/TIVOT/resources/enemy/_neutral_refs/tomb_kf/src"
cd "/c/Users/User/Desktop/ComfyUI-master/tivot_wan"
LOG=out/arch_idle.log; echo "=== $(date)" >> $LOG
env TIVOT_GEN=480x720 TIVOT_FIT=0.78 PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "$R/mon_arch_warden.png" --mode idle --loop --fps 16 --length 49 --seed 9801 --prompt "the stone arch stays completely still, the skeletal arms hanging from the arch sway slowly, chains and censers swing gently, the hanging bones inside the dark opening drift, camera completely fixed, plain green background, anime cel shading, clean lineart" --suffix _idle --out out/arch_idle >> $LOG 2>&1
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/arch_idle/* >> $LOG 2>&1
for d in out/arch_idle/*_idle; do n=tomb_$(basename "$d"); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
