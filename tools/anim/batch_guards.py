# 帝都教廷衛士（4 場 16 人）＋米夏親衛隊（3 人）中槍倒下：生 1 秒（17 格）、每支歇 30 秒
import os, shutil, subprocess, time
HERE = os.path.dirname(os.path.abspath(__file__))
R = r'C:\Users\Ray Ku\Desktop\TIVOT\resources\_originals'
IN, OUT = os.path.join(HERE, 'in_guards'), os.path.join(HERE, 'out', 'guards')
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
os.makedirs(IN, exist_ok=True); os.makedirs(OUT, exist_ok=True)
CLEAN = ('No blood at all: no blood stains, drops, spray, red liquid or wounds; clothes stay clean. No gunfire at all: no muzzle flash, '
         'no bullets, no sparks, no smoke, no light effects. Pure green background. Camera completely static. Anime style, cel shading.')
P = {'back': 'Anime illustration. The armored soldier is shot in the chest: his upper body snaps backward, his head whips back, his weapon drops '
             'from his hand, and he falls backward onto the ground. ' + CLEAN,
     'forward': 'Anime illustration. The soldier is shot in the chest: he jerks, his knees buckle, his weapon drops, and he collapses forward '
                'face-down onto the ground toward the camera. ' + CLEAN}
JOBS = []
for sc, n in (('hotel', 3), ('uptown', 4), ('square', 5), ('downtown', 4)):
    for i in range(1, n + 1): JOBS.append((f'{sc}_guard_{i}', os.path.join(R, 'background', 'capital', '_battle_wip', 'layers', sc, f'guard_{i}.png'), 'back'))
for i in range(1, 4):
    JOBS.append((f'misha_guard_{i}', os.path.join(R, 'enemy', '_guards_layers', f'guard_{i}.png'), 'forward' if i == 1 else 'back'))
for name, src, kind in JOBS:
    if os.path.exists(os.path.join(OUT, name, 'meta.json')): continue
    dst = os.path.join(IN, name + '.png'); shutil.copy(src, dst)
    print(time.strftime('%H:%M'), name, kind, flush=True)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', dst, '--mode', 'hit', '--length', '17', '--frames', '0',
                    '--prompt', P[kind], '--out', OUT], env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
    time.sleep(30)
print('全部完成', flush=True)
