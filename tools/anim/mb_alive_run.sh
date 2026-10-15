cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"; L=in_mb
G="anime illustration, solid pure black background stays plain, close-up, a black-haired young man aims a single-barrel pistol at the viewer, a strong gusty wind blows hard the whole time, many separate soft locks of his messy black hair are blown hard by the wind, each lock flutters and flows on its own, light airy fluffy hair, his coat collar flaps, he breathes steadily so his shoulders and chest gently rise and fall, no muzzle flash, no fire, no shell casing, camera fixed"
r(){ end=""; [ -n "$3" ] && end="--end $3"; PYTHONIOENCODING=utf-8 TIVOT_GEN=720x992 TIVOT_LX2V=motionfix python tivot_wan.py --mode ci --files $2 $end --length $4 --fps 16 --width 720 --seed 7 --out out/ci --suffix _$1 --prompt "$G, $5" 2>&1 | tail -1; }
r al0 $L/kA.png "" 17 "he holds his aim still and steady, the gun does not move"
r al1 $L/kA.png $L/kB4.png 9 "the pistol recoils sharply: only the slide on top snaps backward along the barrel and the recoil kicks the muzzle upward, the grip stays firmly in his hand"
r al2 $L/kB4.png "" 9 "the slide stays locked back, he holds the gun steady"
python -c "
from PIL import Image; import glob
f=sorted(glob.glob('out/ci/kB4_al2/frame_*.webp'))[-1]; Image.open(f).convert('RGB').save('in_mb/kB4_al2last.png')"
r al3 $L/kB4_al2last.png $L/kA.png 9 "the slide snaps forward and closes, the muzzle drops back down to aim at the viewer, the grip stays firmly in his hand"
r al4 $L/kA.png "" 17 "he holds his aim still and steady, the gun does not move"
python - <<'EOF'
import glob, os, shutil, json
g=lambda n: sorted(glob.glob(f'out/ci/{n}/frame_*.webp'))
h=g('kA_al0')[::-1]; a=g('kA_al1'); b=g('kB4_al2'); c=g('kB4_al2last_al3'); t=g('kA_al4')
seq=h+a[1:]+b[1:]+c[1:]+t[1:]
d='out/ci/ci_torsten_mb_alive'; shutil.rmtree(d,ignore_errors=True); os.makedirs(d)
for i,f in enumerate(seq): shutil.copy(f,f'{d}/frame_{i:02d}.webp')
json.dump({'fps':16,'shot':len(h),'open':len(h)+len(a)-2},open(d+'/holds.json','w'))
print(len(h),len(a),len(b),len(c),len(t),len(seq),'shot frame',len(h),'open frame',len(h)+len(a)-2)
EOF
