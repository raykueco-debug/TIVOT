cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"; L=in_mb
G="anime illustration, solid pure black background stays plain, close-up, a black-haired young man with a single-barrel pistol aimed at the viewer, strong wind makes his messy black hair whip and flutter strand by strand, no muzzle flash, no fire, no shell casing, camera fixed"
PYTHONIOENCODING=utf-8 TIVOT_GEN=720x992 TIVOT_LX2V=motionfix python tivot_wan.py --mode ci --files $L/kA.png --end $L/kB2.png --length 9 --fps 16 --width 720 --seed 7 --out out/ci --suffix _blow9 --prompt "$G, the pistol recoils sharply: the slide snaps backward along the barrel in an instant and the recoil kicks the muzzle upward" 2>&1 | tail -1
PYTHONIOENCODING=utf-8 TIVOT_GEN=720x992 TIVOT_LX2V=motionfix python tivot_wan.py --mode ci --files $L/kB2.png --end $L/kA.png --length 9 --fps 16 --width 720 --seed 7 --out out/ci --suffix _ret9 --prompt "$G, the slide immediately snaps forward and closes, the muzzle drops back down to aim at the viewer" 2>&1 | tail -1
python - <<'EOF'
import glob, os, shutil, json
a=sorted(glob.glob('out/ci/kA_blow9/frame_*.webp')); b=sorted(glob.glob('out/ci/kB2_ret9/frame_*.webp'))
d='out/ci/ci_torsten_mb_cycle'; shutil.rmtree(d,ignore_errors=True); os.makedirs(d)
seq=[a[0]]*6+a+b[1:]+[b[-1]]*6
for i,f in enumerate(seq): shutil.copy(f,f'{d}/frame_{i:02d}.webp')
json.dump({'fps':16},open(d+'/holds.json','w')); print(len(a),len(b),len(seq))
EOF
PYTHONIOENCODING=utf-8 python make_player.py | tail -1
powershell -c 'Start-Process "http://127.0.0.1:8130/player.html#ci/ci_torsten_mb_cycle"'
