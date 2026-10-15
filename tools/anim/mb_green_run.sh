cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"; L=in_mb
PYTHONIOENCODING=utf-8 TIVOT_GEN=720x992 TIVOT_LX2V=motionfix python tivot_wan.py --mode ci --files $L/mb_A_green.png --end $L/mb_B_green.png --length 33 --fps 16 --width 720 --seed 7 --out out/ci --suffix _gslowab8 --prompt "anime illustration, solid pure green background, slow motion, close-up, a black-haired young man aims a single-barrel pistol at the viewer and fires exactly one shot: one bright muzzle flash bursts from the single muzzle, at the same instant the pistol slide slides backward and the recoil kicks the muzzle upward, the ejection port on top of the slide opens and one brass shell casing pops out of it toward the upper left, strong wind makes his messy black hair whip and flutter strand by strand, his coat collar flaps, only one shot, camera fixed, the green background stays plain" 2>&1 | tail -1
PYTHONIOENCODING=utf-8 TIVOT_GEN=720x992 TIVOT_LX2V=motionfix python tivot_wan.py --mode ci --files $L/mb_B_green.png --end $L/mb_A_green.png --length 49 --fps 16 --width 720 --seed 7 --out out/ci --suffix _gslowba8 --prompt "anime illustration, solid pure green background, slow motion, close-up, after the single gunshot, the one muzzle flash quickly fades away and does not fire again, the brass shell casing flies away toward the upper left and leaves the frame, the pistol slide slides forward and closes completely, the muzzle comes back down to aim at the viewer, thin gun smoke curls from the muzzle, strong wind makes his messy black hair whip and flutter strand by strand, his coat collar flaps, no second shot, camera fixed, the green background stays plain" 2>&1 | tail -1
python - <<'EOF'
import glob, os, json, numpy as np, sys
sys.path.insert(0,'.'); import tivot_wan as tw
from PIL import Image
a=sorted(glob.glob('out/ci/mb_A_green_gslowab8/frame_*.webp')); b=sorted(glob.glob('out/ci/mb_B_green_gslowba8/frame_*.webp'))
for d,fs in [('out/ci/ci_torsten_mb_gaba8',a+b[1:])]:
    os.makedirs(d,exist_ok=True); da=d+'_alpha'; os.makedirs(da,exist_ok=True)
    for i,f in enumerate(fs):
        im=Image.open(f).convert('RGB'); im.save(f'{d}/frame_{i:02d}.webp','WEBP',quality=92)
        tw.key(np.asarray(im).astype(np.float32)).save(f'{da}/frame_{i:02d}.webp','WEBP',quality=92)
    for x in (d,da): json.dump({'fps':16},open(x+'/holds.json','w'))
print(len(a),len(b))
EOF
PYTHONIOENCODING=utf-8 python make_player.py | tail -1
powershell -c 'Start-Process "http://127.0.0.1:8130/player.html#ci/ci_torsten_mb_gaba8_alpha"'
