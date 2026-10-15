cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"; L=in_mb
G="anime illustration, solid pure black background stays plain, close-up, a black-haired young man with a single-barrel pistol, strong wind makes his messy black hair whip and flutter strand by strand, camera fixed"
PYTHONIOENCODING=utf-8 TIVOT_GEN=720x992 TIVOT_LX2V=motionfix python tivot_wan.py --mode ci --files $L/kA.png --end $L/kB.png --length 5 --fps 16 --width 720 --seed 7 --out out/ci --suffix _fire5k --prompt "$G, he fires one shot: in the very same instant the muzzle flash bursts, the slide slams back, the recoil kicks the muzzle up and an empty brass shell casing pops out of the ejection port, all at once" 2>&1 | tail -1
PYTHONIOENCODING=utf-8 TIVOT_GEN=720x992 TIVOT_LX2V=motionfix python tivot_wan.py --mode ci --files $L/kB.png --end $L/kA.png --length 33 --fps 16 --width 720 --seed 7 --out out/ci --suffix _ret33k --prompt "$G, right after the single shot the muzzle flash disappears at once and never comes back, the empty brass shell casing, a hollow open brass tube with no bullet, tumbles away toward the upper left and leaves the frame, the slide slides forward and closes, the gun comes back down to aim at the viewer, a thin wisp of gun smoke rises from the single muzzle, no second shot" 2>&1 | tail -1
python - <<'EOF'
import glob, os, shutil, json
a=sorted(glob.glob('out/ci/kA_fire5k/frame_*.webp')); b=sorted(glob.glob('out/ci/kB_ret33k/frame_*.webp'))
d='out/ci/ci_torsten_mb_black2'; os.makedirs(d,exist_ok=True)
for i,f in enumerate(a+b[1:]): shutil.copy(f,f'{d}/frame_{i:02d}.webp')
json.dump({'fps':16},open(d+'/holds.json','w')); print(len(a),len(b))
EOF
PYTHONIOENCODING=utf-8 python make_player.py | tail -1
powershell -c 'Start-Process "http://127.0.0.1:8130/player.html#ci/ci_torsten_mb_black2"'
