# 樹寄生石龍：正面游→放大的正面襲來（A→B，16fps 全格）
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_tree_dragon"
env TIVOT_GEN=960x480 TIVOT_OY=0.5 TIVOT_FIT=0.86 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "$D/tree_dragon_front_swim_src.webp" --end "$D/tree_dragon_front_big_src.png" --mode idle --fps 16 --length 49 --width 960 --seed 5301 --prompt "a long serpentine stone dragon wrapped in tree roots suddenly lunges straight at the camera, rushing closer and growing huge until it nearly fills the whole frame, mouth opening wide, claws thrusting toward the viewer, fast aggressive attack, anime cel shading, clean lineart, plain green background" --suffix _ab_fswim_attack --out out/monsters
echo ALLDONE
