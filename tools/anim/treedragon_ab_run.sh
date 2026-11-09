# 樹寄生石龍：側面→轉身、轉身→正面襲來（A→B，16fps 全格）
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_tree_dragon"
run(){ TIVOT_GEN=960x480 TIVOT_OY=0.5 TIVOT_FIT=0.86 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "$D/$1" --end "$D/$2" --mode idle --fps 16 --length 49 --width 960 --seed $3 --prompt "$4" --suffix "$5" --out out/monsters; }
run tree_dragon_flight_src.webp tree_dragon_turn_src.webp 5101 "a long serpentine stone dragon wrapped in tree roots flying in mid-air, it swims forward then curves its body around and turns its head toward the viewer, reaching out its branch claws, smooth continuous motion, anime cel shading, clean lineart, plain green background" _ab_turn
run tree_dragon_turn_src.webp tree_dragon_front_src.webp 5102 "a long serpentine stone dragon wrapped in tree roots lunges straight at the viewer, mouth opening wide, claws thrusting forward toward the camera, its body coiling behind it, fast aggressive attack, anime cel shading, clean lineart, plain green background" _ab_attack
echo ALLDONE
