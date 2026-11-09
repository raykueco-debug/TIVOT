cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"
P="solid pure green background stays plain, anime illustration, low angle shot, static locked-off camera, the framing stays exactly the same, a pale-haired young man in a black coat holds his firm braced stance aiming a huge heavy machine gun at the upper left, his body and the gun stay still and keep exactly the same shape, he does not fire, a strong wind blows hard, his messy white hair whips and flutters strand by strand, his long black coat billows and flaps wildly behind him, the ammunition belt sways slightly, he breathes so his shoulders rise and fall"
PYTHONIOENCODING=utf-8 TIVOT_GEN=960x640 TIVOT_LX2V=motionfix python tivot_wan.py --mode ci --files in_nemo/k88.png --end in_nemo/k87.png --length 17 --fps 16 --width 960 --seed 7 --out out/ci --suffix _flutter87s --prompt "$P" 2>&1 | tail -1
python - <<'PY'
import glob, os, json, numpy as np, sys
sys.path.insert(0,'.'); import tivot_wan as tw
from PIL import Image
src=sorted(glob.glob('out/ci/ci_nemo_barrage/frame_*.webp'))
fl=sorted(glob.glob('out/ci/k88_flutter87s/frame_*.webp'))[1:]
d='out/ci/ci_nemo_barrage_fl87s'; da=d+'_alpha'
for x in (d,da): os.makedirs(x,exist_ok=True)
seq=src+fl
for k,f in enumerate(seq):
    im=Image.open(f).convert('RGB'); im.save(f'{d}/frame_{k:03d}.webp','WEBP',quality=92)
    tw.key(np.asarray(im).astype(np.float32)).save(f'{da}/frame_{k:03d}.webp','WEBP',quality=92)
for x in (d,da): json.dump({'fps':16},open(x+'/holds.json','w'))
n=len(src)
print('total',n+len(fl))
PY
PYTHONIOENCODING=utf-8 python make_player.py | tail -1
