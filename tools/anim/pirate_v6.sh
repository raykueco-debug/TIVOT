# 空賊攻擊 v6（11-09 Ray：GPT 四宮格 B「開槍、槍口上揚、有火光」→ 每人 A→B 一段 17 格，一個種子）
# 用法：pirate_v6.sh <組號>...   已有輸出的人跳過
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
K="C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/_neutral_refs/skypirate_kf/cells"
for g in "$@"; do for A in "$K"/sp${g}_pirate_*_A.png; do
  n=$(basename "$A" .png); [ -d "out/pirate_atk_v6/${n}_L17" ] && { echo "skip $n"; continue; }
  env TIVOT_LX2V=motionfix TIVOT_FIT=0.86 PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "$A" --end "${A%_A.png}_B.png" --mode idle --fps 16 --length 17 --seed 7 \
    --prompt "the pirate fires his gun at the viewer, the gun kicks up from recoil, muzzle flash, hair and coat keep swaying, camera completely fixed, plain green background, anime cel shading, clean lineart" \
    --suffix _L17 --out out/pirate_atk_v6 2>&1 | grep -E "✔|✘|Error|error" 
done; done; echo ALLDONE "$@"
