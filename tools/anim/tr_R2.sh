cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
T="the chains swing and whip the whole time, its head stays steady, it never blinks, its body keeps breathing, never frozen, purely physical, no glow, camera completely fixed, plain green background, anime cel shading, clean lineart"
W(){ env TIVOT_FIT=1.0 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/enemy_atk >> out/tr_R2.log 2>&1; }
: > out/tr_R2.log
W --files in_tr/saint_tr_R_start.png --end in_tr/saint_tr_R_ft.png --length 13 --seed 2241 --prompt "a gaunt grey chained humanoid creature that just slashed forward with its claw can't stop its momentum: its clawing arm keeps swinging through past its body to the other side and its whole body lurches and twists off balance in the direction of the slash, follow-through inertia, $T" --suffix _ft
W --files in_tr/saint_tr_R_ft.png --end in_tr/saint_tr_R_end.png --length 29 --seed 2242 --prompt "the off-balance chained creature catches itself, swings its arm back around in a different arc, straightens up and settles back into its hunched standing pose with its arms hanging at its sides, springy recovery, $T" --suffix _rec
PYTHONIOENCODING=utf-8 python -X utf8 edge_check.py out/enemy_atk/saint_tr_R_start_ft out/enemy_atk/saint_tr_R_ft_rec >> out/tr_R2.log 2>&1
PYTHONIOENCODING=utf-8 python -X utf8 make_player.py > /dev/null 2>&1
echo ALLDONE >> out/tr_R2.log
