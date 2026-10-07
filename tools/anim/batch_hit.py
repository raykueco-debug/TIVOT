# 人類敵人中彈倒下批次：3/4 往後倒（--style back）、1/4 往前跪（預設 hit）；每張歇 60 秒。
import glob, os, subprocess, time
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r'C:\Users\Ray Ku\Desktop\TIVOT\resources\enemy'
OUT = os.path.join(HERE, 'out', 'hit')
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
os.makedirs(OUT, exist_ok=True)
files = sorted(glob.glob(os.path.join(SRC, 'man_*.webp')))
BACK = 'Anime illustration. The character is shot in the chest and blown backward by the impact: upper body snaps back, head whips back, arms fling out, feet leave the ground, and the body falls backward onto the ground. Absolutely no blood anywhere: no blood stains, no blood drops, no blood spray, no red liquid, no wounds. Absolutely no gunfire: no muzzle flash, no bullets, no impact sparks or flashes, no smoke, no explosions, no light effects. Clothes and body stay clean; only the motion of the character. Camera completely static. Anime style, cel shading.'
KNEEL = 'Anime illustration. The character is shot in the chest: upper body jerks back, then knees buckle, drops to one knee and slumps forward toward the camera. Absolutely no blood anywhere: no blood stains, no blood drops, no blood spray, no red liquid, no wounds. Absolutely no gunfire: no muzzle flash, no bullets, no impact sparks or flashes, no smoke, no explosions, no light effects. Clothes and body stay clean; only the motion of the character. Camera completely static. Anime style, cel shading.'
for k, f in enumerate(files):
    name = os.path.splitext(os.path.basename(f))[0]
    if os.path.exists(os.path.join(OUT, name, 'meta.json')): continue
    fwd = (k % 4 == 3)
    from PIL import Image
    rgb = 'A' not in Image.open(f).mode            # 有背景的整張圖：走 ci 模式（不轉綠底）
    cmd = [PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', f, '--out', OUT]
    if rgb: cmd += ['--mode', 'ci', '--fps', '16', '--length', '33', '--prompt', KNEEL if fwd else BACK]
    else:   cmd += ['--mode', 'hit'] + ([] if fwd else ['--style', 'back'])
    print(time.strftime('%H:%M'), name, 'kneel' if fwd else 'back', 'ci' if rgb else 'hit', flush=True)
    subprocess.run(cmd, env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
    time.sleep(60)
print('全部完成', flush=True)
