cd "/c/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan"; L=in_mb
PYTHONIOENCODING=utf-8 TIVOT_GEN=720x992 TIVOT_LX2V=motionfix python tivot_wan.py --mode ci --files $L/kA.png --end $L/kB.png --length 33 --fps 16 --width 720 --seed 7 --out out/ci --suffix _slowab7k --prompt "anime illustration, solid pure black background, slow motion, close-up, a black-haired young man aims a single-barrel pistol at the viewer and pulls the trigger once, in slow motion a bright muzzle flash bursts from the single muzzle, the pistol slide slides backward, the ejection port on top of the slide opens and one brass shell casing is pushed out of it and flies upward, the recoil lifts the muzzle upward, strong wind makes his messy black hair flutter strand by strand, camera fixed, the black background stays plain" 2>&1 | tail -1
PYTHONIOENCODING=utf-8 TIVOT_GEN=720x992 TIVOT_LX2V=motionfix python tivot_wan.py --mode ci --files $L/kB.png --end $L/kA.png --length 49 --fps 16 --width 720 --seed 7 --out out/ci --suffix _slowba7k --prompt "anime illustration, solid pure black background, slow motion, close-up, right after one gunshot, the muzzle flash shrinks and fades away, the brass shell casing keeps flying upward and out of the frame, the pistol slide slides forward and closes completely, the muzzle comes back down to aim at the viewer, thin gun smoke curls from the single muzzle, strong wind makes his messy black hair flutter strand by strand, camera fixed, the black background stays plain" 2>&1 | tail -1
python - <<'EOF'
import glob, os, shutil, json
a=sorted(glob.glob('out/ci/kA_slowab7k/frame_*.webp')); b=sorted(glob.glob('out/ci/kB_slowba7k/frame_*.webp'))
seq=a+b[1:]; d='out/ci/ci_torsten_mb_slowaba7k'; os.makedirs(d,exist_ok=True)
for i,f in enumerate(seq): shutil.copy(f,f'{d}/frame_{i:02d}.webp')
json.dump({'fps':16},open(d+'/holds.json','w'))
e=json.load(open('out/export/ci_torsten_mb_slowaba7_cut/export.json'))
dc=d+'_raycut'; os.makedirs(dc,exist_ok=True); j=0
for k,h in zip(e['kept_index'],e['holds']):
    for _ in range(h): shutil.copy(seq[k],f'{dc}/frame_{j:02d}.webp'); j+=1
json.dump({'fps':16},open(dc+'/holds.json','w')); print(len(seq), j)
EOF
PYTHONIOENCODING=utf-8 python make_player.py | tail -1
powershell -c 'Start-Process "http://127.0.0.1:8130/player.html#ci/ci_torsten_mb_slowaba7k_raycut"; Start-Process "http://127.0.0.1:8130/player.html#ci/ci_torsten_mb_slowaba7k"'
