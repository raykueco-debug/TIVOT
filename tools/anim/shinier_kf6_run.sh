# 夏爾三區重做 第六批（Ray 11-24：裂肉獸待機「嘴巴一直在唸什麼 重出」）—— 換種子、提示詞不寫頭部動作
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/s4_kf/wan"
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
LOG=out/shinier_kf.log; echo "=== kf6 $(date) $*" >> $LOG
W(){ env TIVOT_GEN=480x720 TIVOT_FIT=0.78 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/shinier_kf >> $LOG 2>&1; echo "done $*" | cut -c1-140 >> $LOG; }
W --files "$D/organ_idle_A.png" --loop --length 49 --seed 12801 --prompt "the organ-pipe goat beast stands its ground in a tense stance, its shaggy fur sways in the wind, its body slowly rises and falls with deep breaths, camera fixed, plain green background, anime cel shading, clean lineart" --suffix _loop2
d=out/shinier_kf/organ_idle_A_loop2; [ -d out/enemy_atk/sh_organ_idle_A_loop2 ] || cp -r $d out/enemy_atk/sh_organ_idle_A_loop2
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 make_player.py >/dev/null 2>&1
echo ALLDONE >> $LOG
