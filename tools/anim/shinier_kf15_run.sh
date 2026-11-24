# 夏爾三區重做 第十五批（Ray 11-24：修女型 B 去背失敗 → GPT 重製後重跑）。用法：bash shinier_kf15_run.sh [tspawn2|tspawn3]
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
T="springy and dynamic, thick milky liquid keeps dripping, camera fixed, plain green background, anime cel shading, clean lineart"
LOG=out/shinier_kf.log; echo "=== kf15 $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/shinier_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
for n in $*; do
 if [ "$n" = tspawn3 ]; then
  W --files "$D/tspawn3_lunge_A.png" --end "$D/tspawn3_lunge_B.png" --length 49 --seed 13603 --prompt "the tall melting veiled figure leans forward and lunges at the camera, both long thin arms stretching out to grab at the lens, its veil whipping back, sticky liquid flinging off in long strands, $T" --suffix _AB2
  W --files "$D/tspawn3_lunge_B.png" --end "$D/tspawn3_lunge_A.png" --length 33 --seed 13604 --prompt "the tall melting veiled figure pulls its arms back and straightens up into its standing pose, its veil settling, $T" --suffix _BA2
 else
  W --files "$D/tspawn2_lunge_A.png" --end "$D/tspawn2_lunge_B.png" --length 49 --seed 13601 --prompt "the crawling wax-like creature springs forward from all fours and lunges straight at the camera, one long arm stretching out to grab at the lens, sticky liquid flinging off in long strands, $T" --suffix _AB2
  W --files "$D/tspawn2_lunge_B.png" --end "$D/tspawn2_lunge_A.png" --length 33 --seed 13602 --prompt "the crawling wax-like creature pulls its arm back and sinks back down onto all fours, $T" --suffix _BA2
 fi
 PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 edge_check.py out/shinier_kf/${n}_lunge_A_AB2 out/shinier_kf/${n}_lunge_B_BA2 >> $LOG 2>&1
 for d in out/shinier_kf/${n}_lunge_A_AB2 out/shinier_kf/${n}_lunge_B_BA2; do m=sh_$(basename "$d"); [ -d "out/enemy_atk/$m" ] || cp -r "$d" "out/enemy_atk/$m"; done
done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
