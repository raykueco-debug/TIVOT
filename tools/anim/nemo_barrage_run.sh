cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"; L=in_nemo
# 051 尼莫彈幕支援：7 張關鍵格 k0..k6，6 段 A→B 串接（每段鎖下一格），綠幕，橫幅 960x640
run(){ PYTHONIOENCODING=utf-8 TIVOT_GEN=960x640 TIVOT_LX2V=motionfix python tivot_wan.py --mode ci --files $L/$1.png --end $L/$2.png --length $3 --fps 16 --width 960 --seed 7 --out out/ci --suffix _$4 --prompt "$5" 2>&1 | tail -1; }
G="solid pure green background stays plain, anime illustration, low angle shot, camera fixed, a pale-haired young man in a black coat holds a huge heavy machine gun with a long ammunition belt, the gun keeps exactly the same shape and length and does not bend or deform, his messy white hair flutters strand by strand in a strong wind, his coat hem flaps, he breathes so his shoulders rise and fall, he does not fire"
run k0 k1 17 nb1 "$G, he bends his knees and starts to lift the heavy gun, the muzzle tilts up slightly and turns a little to the left"
run k1 k2 13 nb2 "$G, he swings the heavy gun fast toward the left with great force, strong motion blur along the swing, the ammunition belt whips"
run k2 k3 13 nb3 "$G, the fast swing stops, the gun is now level pointing to the left, his stance widens and he grins with clenched teeth"
run k3 k4 17 nb4 "$G, he sinks lower into a wide braced stance, bracing the heavy gun against his hip, the gun barely moves"
run k4 k5 17 nb5 "$G, he raises the muzzle toward the upper left, his coat starts to blow back behind him"
run k5 k6 17 nb6 "$G, he braces the gun firmly aiming at the upper left, ready to fire, his coat billows behind him in the wind"
python - <<'EOF'
import glob, os, json, numpy as np, sys
sys.path.insert(0,'.'); import tivot_wan as tw
from PIL import Image
seq=[]
for k in range(1,7):
    fs=sorted(glob.glob(f'out/ci/k{k-1}_nb{k}/frame_*.webp')); seq+= fs if k==1 else fs[1:]
d='out/ci/ci_nemo_barrage'; da=d+'_alpha'
for x in (d,da): os.makedirs(x,exist_ok=True)
for i,f in enumerate(seq):
    im=Image.open(f).convert('RGB'); im.save(f'{d}/frame_{i:02d}.webp','WEBP',quality=92)
    tw.key(np.asarray(im).astype(np.float32)).save(f'{da}/frame_{i:02d}.webp','WEBP',quality=92)
for x in (d,da): json.dump({'fps':16},open(x+'/holds.json','w'))
print('frames',len(seq))
EOF
PYTHONIOENCODING=utf-8 python make_player.py | tail -1
