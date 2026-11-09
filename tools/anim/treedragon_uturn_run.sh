# 樹寄生石龍：橫游（頭朝左）轉身成水平翻轉（頭朝右）的過渡（A→B，960x480 同畫布）
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
D="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_tree_dragon"
env TIVOT_GEN=960x480 TIVOT_OY=0.5 TIVOT_FIT=0.86 TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "$D/tree_dragon_flight_src.webp" --end "$D/tree_dragon_flight_src_mirror.webp" --mode idle --fps 16 --length 49 --width 960 --seed 7301 --prompt "a long serpentine stone dragon wrapped in tree roots flying sideways in mid-air turns around: its head curves back in a smooth U-turn and the long body follows like a snake, until it faces the opposite direction, flying to the right, smooth continuous motion, anime cel shading, clean lineart, plain green background" --suffix _uturn --out out/monsters
echo ALLDONE
