# 用法：bash sky2_run.sh <鍵> <seed> <尾綴> <FIT> <提示詞>
# 生成 → 量每格是否碰到畫面邊緣（振翅出框檢查）→ 更新 animechk 清單
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
K=$1; SD=$2; SUF=$3; FIT=$4; P=$5
TIVOT_GEN=${GEN:-576x864} TIVOT_OY=${OY:-0.5} TIVOT_FIT=$FIT TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/${SRC:-mon_sky2_$K}.webp" --mode idle --fps 8 --length 49 --width ${OUTW:-480} --loop --seed $SD --prompt "$P" --suffix "$SUF" --out out/monsters >> out/sky2_$K.log 2>&1
PYTHONIOENCODING=utf-8 python -X utf8 -c "
from PIL import Image;import glob,sys
d='out/monsters/${SRC:-mon_sky2_$K}$SUF';t=0
for f in sorted(glob.glob(d+'/frame_*.webp')):
  im=Image.open(f);b=im.getchannel('A').point(lambda v:255 if v>40 else 0).getbbox();W,H=im.size
  if b[0]<=2 or b[1]<=2 or b[2]>=W-2 or b[3]>=H-2: t+=1
print('EDGE',d,t,'frames touch edge')" >> out/sky2_$K.log
PYTHONIOENCODING=utf-8 python -X utf8 make_player.py > /dev/null
echo DONE $K$SUF >> out/sky2_$K.log
