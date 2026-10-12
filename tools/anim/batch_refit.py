# 2026-10-12：振翅出框的 4 隻飛行怪，縮到 0.72 重生（seed 沿用上一支，動作接近、只差留白）。
import os, subprocess, time, json
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = r'C:\Users\Ray Ku\Desktop\TIVOT\resources\enemy'
OUT = os.path.join(HERE, 'out', 'monsters'); PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
for i, n in enumerate(['mon_sky_ribwhale', 'mon_sky_eyemoth', 'mon_sky_boneray', 'mon_sky_mawbat']):
    seed = json.load(open(os.path.join(OUT, n, 'meta.json'), encoding='utf-8'))['seed']
    print(time.strftime('%H:%M'), n, seed, flush=True)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', os.path.join(SRC, n + '.webp'), '--mode', 'idle', '--style', 'flyer',
                    '--fps', '8', '--length', '49', '--seed', str(seed), '--suffix', '_fit72', '--out', OUT],
                   env={**os.environ, 'PYTHONIOENCODING': 'utf-8', 'TIVOT_FIT': '0.72'})
    if i < 3: time.sleep(60)
print('全部完成', flush=True)
