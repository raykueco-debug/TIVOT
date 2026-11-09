cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
R="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs"
A="$R/mon_shinierforest_hog_neutral.png"; B="$R/mon_shinierforest_hog_B_ram.png"
T="exactly four legs only, the limb count never changes, its bristly fur and tail keep moving and its body keeps breathing the whole time, never frozen, no dust, no dirt splash, no light, no glow, camera completely fixed, plain green background, anime cel shading, clean lineart"
W(){ env TIVOT_GEN=720x480 TIVOT_FIT=0.72 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/enemy_atk >> out/hog.log 2>&1; }
: > out/hog.log
W --files "$A" --end "$B" --length 49 --seed 6711 --prompt "a huge wild boar lowers its head and paws the ground for an instant, then explosively charges and rams straight at the camera with its head and tusks, springy elastic motion, $T" --suffix _ramAB
W --files "$B" --end "$A" --length 33 --seed 6712 --prompt "a huge wild boar finishes a ramming charge, recoils and steps back, settling into its tense standing pose snorting, springy rebound, $T" --suffix _ramBA
W --files "$A" --length 49 --loop --seed 6713 --prompt "a huge wild boar standing tense and snorting in place, its body breathes heavily, its bristly fur and tail twitch, it stays in the same pose, seamless loop, $T" --suffix _idle
PYTHONIOENCODING=utf-8 python -X utf8 edge_check.py out/enemy_atk/mon_shinierforest_hog_neutral_ramAB out/enemy_atk/mon_shinierforest_hog_B_ram_ramBA out/enemy_atk/mon_shinierforest_hog_neutral_idle >> out/hog.log 2>&1
PYTHONIOENCODING=utf-8 python -X utf8 make_player.py > /dev/null 2>&1
echo ALLDONE >> out/hog.log
