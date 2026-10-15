cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"; L=in_mb
G="anime illustration, solid pure black background stays plain, close-up, a black-haired young man with a single-barrel pistol aimed at the viewer, his soft messy black hair sways naturally in a gentle breeze, fine hair strands, no muzzle flash, no fire, no shell casing, camera fixed"
r(){ PYTHONIOENCODING=utf-8 TIVOT_GEN=720x992 TIVOT_LX2V=motionfix python tivot_wan.py --mode ci --files $L/$1.png --end $L/$2.png --length $3 --fps 16 --width 720 --seed 7 --out out/ci --suffix _$4 --prompt "$G, $5" 2>&1 | tail -1; }
r kA kB4 9 c2a "the pistol recoils sharply: only the slide on top snaps backward along the barrel in an instant and the recoil kicks the muzzle upward, the grip stays firmly in his hand"
r kB4 kB4 5 c2b "the slide stays locked back, the gun holds still"
r kB4 kA 9 c2c "the slide snaps forward and closes, the muzzle drops back down to aim at the viewer, the grip stays firmly in his hand"
python - <<'EOF'
import glob, os, shutil, json
a=sorted(glob.glob('out/ci/kA_c2a/frame_*.webp')); b=sorted(glob.glob('out/ci/kB4_c2b/frame_*.webp')); c=sorted(glob.glob('out/ci/kB4_c2c/frame_*.webp'))
d='out/ci/ci_torsten_mb_cycle2'; shutil.rmtree(d,ignore_errors=True); os.makedirs(d)
seq=[a[0]]*6+a+b[1:]+c[1:]+[c[-1]]*6
for i,f in enumerate(seq): shutil.copy(f,f'{d}/frame_{i:02d}.webp')
json.dump({'fps':16},open(d+'/holds.json','w')); print(len(a),len(b),len(c),len(seq))
EOF
PYTHONIOENCODING=utf-8 python make_player.py | tail -1
powershell -c 'Start-Process "http://127.0.0.1:8130/player.html#ci/ci_torsten_mb_cycle2"'
