# 夏爾三區重做 第十批（Ray 11-24：「熊骸的 IDLE 重跑，身上的黑炎沒在動」）
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
LOG=out/shinier_kf.log; echo "=== kf10 $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/shinier_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
W --files "$D/bear_pounce_A.png" --loop --length 49 --seed 13101 --prompt "the dark purple-black flames rising from the skull-faced bear's back and ribcage writhe and flicker constantly like burning fire, the flame tendrils lash, curl and stream upward, the bear stands hunched breathing heavily, its fur sways, camera fixed, plain green background, anime cel shading, clean lineart" --suffix _idlefire
W --files "$D/bear_pounce_A.png" --loop --length 49 --seed 13103 --prompt "black and violet flames burn wildly along the skull-faced bear's spine and around its body, the flames flicker, twist and billow upward without stopping, the bear crouches breathing, camera fixed, plain green background, anime cel shading, clean lineart" --suffix _idlefire2
for d in out/shinier_kf/bear_pounce_A_idlefire out/shinier_kf/bear_pounce_A_idlefire2; do n=sh_bear_idle_$(basename "$d" | sed 's/bear_pounce_A_//'); [ -d "out/enemy_atk/$n" ] || cp -r "$d" "out/enemy_atk/$n"; done
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
