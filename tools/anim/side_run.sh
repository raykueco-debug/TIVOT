# 用法：GEN=WxH OY=.. bash side_run.sh <src鍵(mon_x_side)> <seed> <FIT> <提示詞>
cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
K=$1; SD=$2; FIT=$3; P=$4
TIVOT_GEN=${GEN:-960x640} TIVOT_OY=${OY:-0.5} TIVOT_FIT=$FIT TIVOT_LX2V=motionfix PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe -X utf8 tivot_wan.py --files "C:/Users/Ray Ku/Desktop/TIVOT/resources/enemy/$K.webp" --mode idle --fps 16 --length 49 --width 960 --loop --seed $SD --prompt "$P" --suffix _idle --out out/monsters >> out/side_$K.log 2>&1
PYTHONIOENCODING=utf-8 python -X utf8 -c "
from PIL import Image;import glob
d='out/monsters/${K}_idle';t=[]
for i,f in enumerate(sorted(glob.glob(d+'/frame_*.webp'))):
  im=Image.open(f);b=im.getchannel('A').point(lambda v:255 if v>40 else 0).getbbox();W,H=im.size
  if b[0]<=2 or b[1]<=2 or b[2]>=W-2 or b[3]>=H-2: t.append(i)
print('EDGE',d,len(t),t[:10])" >> out/side_edges.log
echo DONE $K >> out/side_edges.log
