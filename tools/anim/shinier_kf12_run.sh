# 夏爾三區重做 第十二批（Ray 11-24：「鹿骸 IDLE 的問題一樣，火燄沒動」）—— 等 kf11 跑完才開始
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
LOG=out/shinier_kf.log
until grep -q "=== kf11" $LOG && tail -1 $LOG | grep -q ALLDONE; do sleep 20; done
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
echo "=== kf12 $(date)" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/shinier_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
W --files "$D/stag_roar_A.png" --loop --length 49 --seed 13301 --prompt "the dark purple-black flames wrapped around the skeletal stag's body, legs and antlers writhe and flicker constantly like burning fire, the flame tendrils lash, curl and stream upward, the stag stands breathing, its fur sways, camera fixed, plain green background, anime cel shading, clean lineart" --suffix _idlefire
W --files "$D/stag_roar_A.png" --loop --length 49 --seed 13303 --prompt "black and violet flames burn wildly all over the skeletal stag, the flames flicker, twist and billow upward without stopping, the stag stands breathing, camera fixed, plain green background, anime cel shading, clean lineart" --suffix _idlefire2
for d in out/shinier_kf/stag_roar_A_idlefire out/shinier_kf/stag_roar_A_idlefire2; do n=sh_stag_idle_$(basename "$d" | sed 's/stag_roar_A_//'); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
