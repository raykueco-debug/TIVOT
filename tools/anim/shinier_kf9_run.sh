# 夏爾三區重做 第九批（Ray 11-24「可跑wan」）：節制者分離怪 攻擊（撲抓）＋鹿骸黑炎無火版（程式火）
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
T="springy and dynamic, the idle motion keeps going, camera fixed, plain green background, anime cel shading, clean lineart"
LOG=out/shinier_kf.log; echo "=== kf9 $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/shinier_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
W --files "$D/tspawn_lunge_A.png" --end "$D/tspawn_lunge_B.png" --length 49 --seed 13001 --prompt "the melting wax-like humanoid lunges forward straight at the camera, both long arms stretching out to grab at the lens, sticky liquid flinging off its body in long strands, thick liquid keeps dripping, $T" --suffix _AB
W --files "$D/tspawn_lunge_B.png" --end "$D/tspawn_lunge_A.png" --length 33 --seed 13002 --prompt "the melting wax-like humanoid pulls its arms back and sags back into its dripping stance, thick liquid keeps dripping, $T" --suffix _BA
W --files "$D/stag_roar_A.png" --end "$D/stag_roar_B.png" --length 49 --seed 13003 --prompt "the skeletal stag lowers its head and antlers toward the camera and opens its jaws wide, the purple smoke tendrils around its body swirl, fur keeps swaying, $T" --suffix _AB
W --files "$D/stag_roar_B.png" --end "$D/stag_roar_A.png" --length 33 --seed 13004 --prompt "the skeletal stag closes its jaws and lifts its head back into its stance, the purple smoke tendrils keep swirling, fur keeps swaying, $T" --suffix _BA
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/shinier_kf/tspawn_lunge_*_AB out/shinier_kf/tspawn_lunge_*_BA out/shinier_kf/stag_roar_*_AB out/shinier_kf/stag_roar_*_BA >> $LOG 2>&1
for d in out/shinier_kf/tspawn_lunge_*_AB out/shinier_kf/tspawn_lunge_*_BA out/shinier_kf/stag_roar_*_AB out/shinier_kf/stag_roar_*_BA; do n=sh_$(basename "$d"); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
