# 夏爾三區重做 第十四批（Ray 11-24「都可以跑」）：兩隻新分離怪的撲抓 AB＋BA（BA＝出場用）
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
T="springy and dynamic, thick milky liquid keeps dripping, camera fixed, plain green background, anime cel shading, clean lineart"
LOG=out/shinier_kf.log; echo "=== kf14 $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/shinier_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
W --files "$D/tspawn2_lunge_A.png" --end "$D/tspawn2_lunge_B.png" --length 49 --seed 13501 --prompt "the crawling wax-like creature springs forward from all fours and lunges straight at the camera, one long arm stretching out to grab at the lens, sticky liquid flinging off in long strands, $T" --suffix _AB
W --files "$D/tspawn2_lunge_B.png" --end "$D/tspawn2_lunge_A.png" --length 33 --seed 13502 --prompt "the crawling wax-like creature pulls its arm back and sinks back down onto all fours, $T" --suffix _BA
W --files "$D/tspawn3_lunge_A.png" --end "$D/tspawn3_lunge_B.png" --length 49 --seed 13503 --prompt "the tall melting veiled figure leans forward and lunges at the camera, both long thin arms stretching out to grab at the lens, its veil whipping back, sticky liquid flinging off in long strands, $T" --suffix _AB
W --files "$D/tspawn3_lunge_B.png" --end "$D/tspawn3_lunge_A.png" --length 33 --seed 13504 --prompt "the tall melting veiled figure pulls its arms back and straightens up into its standing pose, its veil settling, $T" --suffix _BA
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/shinier_kf/tspawn2_lunge_*_AB out/shinier_kf/tspawn2_lunge_*_BA out/shinier_kf/tspawn3_lunge_*_AB out/shinier_kf/tspawn3_lunge_*_BA >> $LOG 2>&1
for d in out/shinier_kf/tspawn2_lunge_*_AB out/shinier_kf/tspawn2_lunge_*_BA out/shinier_kf/tspawn3_lunge_*_AB out/shinier_kf/tspawn3_lunge_*_BA; do n=sh_$(basename "$d"); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
