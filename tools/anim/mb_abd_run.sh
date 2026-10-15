cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"; L=in_mb
run(){ PYTHONIOENCODING=utf-8 TIVOT_GEN=720x992 TIVOT_LX2V=motionfix python tivot_wan.py --mode ci --files $L/$1.png --end $L/$2.png --length $3 --fps 16 --width 720 --seed 7 --out out/ci --suffix _$4 --prompt "$5" 2>&1 | tail -1; }
G="solid pure green background stays plain, anime illustration, close-up, a black-haired young man with a single-barrel pistol, strong wind makes his messy black hair whip and flutter strand by strand, his coat collar flaps, camera fixed"
run gA2 gB 9 abd1 "$G, he pulls the trigger once: one bright muzzle flash bursts from the single muzzle, the slide slams backward, the recoil kicks the muzzle upward, a brass shell casing pops out of the ejection port on top of the slide toward the upper left, only one shot"
run gB gC 9 abd2 "$G, right after the single shot the muzzle flash vanishes and does not return, the brass shell casing flies fast toward the upper left corner, the slide stays back, gun smoke curls from the muzzle, no second shot"
run gC gA2 33 abd3 "$G, after the shot the brass shell casing flies out of the frame at the upper left, the pistol slide slides forward and closes completely, the raised gun comes back down to aim at the viewer, thin gun smoke drifts from the muzzle, no muzzle flash at all, no more shots"
python - <<'EOF'
import glob, os, json, numpy as np, sys
sys.path.insert(0,'.'); import tivot_wan as tw
from PIL import Image
seq=[]
for k,n in enumerate(['gA2_abd1','gB_abd2','gC_abd3']):
    fs=sorted(glob.glob(f'out/ci/{n}/frame_*.webp')); seq+= fs if k==0 else fs[1:]
d='out/ci/ci_torsten_mb_abd'; da=d+'_alpha'
for x in (d,da): os.makedirs(x,exist_ok=True)
for i,f in enumerate(seq):
    im=Image.open(f).convert('RGB'); im.save(f'{d}/frame_{i:02d}.webp','WEBP',quality=92)
    tw.key(np.asarray(im).astype(np.float32)).save(f'{da}/frame_{i:02d}.webp','WEBP',quality=92)
for x in (d,da): json.dump({'fps':16},open(x+'/holds.json','w'))
print(len(seq))
EOF
PYTHONIOENCODING=utf-8 python make_player.py | tail -1
powershell -c 'Start-Process "http://127.0.0.1:8130/player.html#ci/ci_torsten_mb_abd_alpha"'
