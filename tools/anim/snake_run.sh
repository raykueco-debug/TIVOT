cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
R="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs"
A="$R/mon_shinierforest_snake_neutral.png"; B="$R/mon_shinierforest_snake_B_bite.png"
T="its coiled body keeps slithering and breathing the whole time, the reeds on its body sway, never frozen, no water splash, no light, no glow, camera completely fixed, plain green background, anime cel shading, clean lineart"
W(){ env TIVOT_FIT=0.72 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py "$@" --mode idle --fps 16 --out out/enemy_atk >> out/snake.log 2>&1; }
: > out/snake.log
W --files "$A" --end "$B" --length 49 --seed 6611 --prompt "a coiled swamp snake draws its head back into an S curve for an instant, then explosively strikes straight at the camera, its jaws opening wide to bite with fangs bared, the body uncoiling forward like a spring, springy elastic motion, $T" --suffix _biteAB
W --files "$B" --end "$A" --length 33 --seed 6612 --prompt "a swamp snake finishes its strike, snaps its jaws shut and pulls its head back, recoiling into its coiled S-curve pose, springy rebound, $T" --suffix _biteBA
W --files "$A" --length 49 --loop --seed 6613 --prompt "a coiled swamp snake raised in an S curve, swaying slowly in place, flicking its tongue, its body breathes and slowly shifts its coils, it stays in the same pose, seamless loop, $T" --suffix _idle
PYTHONIOENCODING=utf-8 python -X utf8 edge_check.py out/enemy_atk/mon_shinierforest_snake_neutral_biteAB out/enemy_atk/mon_shinierforest_snake_B_bite_biteBA out/enemy_atk/mon_shinierforest_snake_neutral_idle >> out/snake.log 2>&1
PYTHONIOENCODING=utf-8 python -X utf8 make_player.py > /dev/null 2>&1
echo ALLDONE >> out/snake.log
