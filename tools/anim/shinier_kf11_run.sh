# 夏爾三區重做 第十一批（Ray 11-24：「聖骨獸 IDLE 沒有呼吸感 重跑」）—— 等 kf10 跑完才開始
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
LOG=out/shinier_kf.log
until grep -q "=== kf10" $LOG && tail -1 $LOG | grep -q ALLDONE; do sleep 20; done
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
echo "=== kf11 $(date)" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/shinier_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
W --files "$D/reliquary_chest_A.png" --loop --length 49 --seed 13201 --prompt "the reliquary bear breathes deeply and heavily, its huge chest and ribcage swell out and sink back with each slow breath, its shoulders rise and fall, its head lifts and lowers with the breathing, its fur sways, camera fixed, plain green background, anime cel shading, clean lineart" --suffix _breathe
W --files "$D/reliquary_chest_A.png" --loop --length 49 --seed 13203 --prompt "the reliquary bear pants heavily, its whole body heaves up and down with deep labored breaths, chest expanding and contracting, its back arches slightly with each breath, its fur sways, camera fixed, plain green background, anime cel shading, clean lineart" --suffix _breathe2
for d in out/shinier_kf/reliquary_chest_A_breathe out/shinier_kf/reliquary_chest_A_breathe2; do n=sh_reliquary_idle_$(basename "$d" | sed 's/reliquary_chest_A_//'); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
