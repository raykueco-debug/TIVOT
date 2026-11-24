# 夏爾三區重做 第八批：裂肉獸待機第二個種子（loop2 第 30~36 格嘴還會微張）—— 等 kf7 跑完才開始
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
LOG=out/shinier_kf.log
until grep -q "=== kf7" $LOG && tail -1 $LOG | grep -q ALLDONE; do sleep 20; done
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
echo "=== kf8 $(date)" >> $LOG
env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "$D/organ_idle_A.png" --loop --length 49 --seed 12811 --prompt "the organ-pipe goat beast holds a tense crouching stance, its shaggy fur and the fleshy ridge along its back sway gently, its chest and shoulders slowly rise and fall with deep breaths, camera fixed, plain green background, anime cel shading, clean lineart" --mode idle --fps 16 --out out/shinier_kf --suffix _loop3 >> $LOG 2>&1
d=out/shinier_kf/organ_idle_A_loop3; [ -d out/enemy_atk/sh_organ_idle_A_loop3 ] || cp -r $d out/enemy_atk/sh_organ_idle_A_loop3
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
