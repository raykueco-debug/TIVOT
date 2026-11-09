# 用法：atk_one.sh <圖檔> <suffix> <seed> "<prompt>"   —— 敵人攻擊／延時，首尾鎖回原圖（--loop）
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
env TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "$1" --mode idle --loop --fps 16 --length 49 --seed "$3" --prompt "$4, the attack is springy and dynamic with a quick wind-up, an explosive strike and a bouncy recoil, throughout the whole clip the idle motion never stops: hair, cloth, robes and loose parts keep flowing and swaying and the body keeps breathing, no frozen frames, the creature starts in its neutral stance and returns to exactly the same neutral stance at the end, camera completely fixed, plain green background, anime cel shading, clean lineart" --suffix "$2" --out out/enemy_atk
echo ALLDONE
