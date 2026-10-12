# 2026-10-12：補做還沒有待機動畫的單隻怪（同 batch_monsters.py 的參數），每支後歇 90 秒。
import os, subprocess, time
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r'C:\Users\Ray Ku\Desktop\TIVOT\resources\enemy'
OUT = os.path.join(HERE, 'out', 'monsters')
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
JOBS = [('mon_canyon_colossus_dark', 'default'), ('mon_beast_altar', 'beast'), ('mon_shinierforest_deer', 'beast')] + \
       [(f'mon_sky_{n}', 'flyer') for n in ('twinwyvern', 'boneray', 'ribwhale', 'mawbat', 'eyemoth', 'eelswarm', 'gasjelly', 'armorcrab')]
for i, (name, st) in enumerate(JOBS):
    if os.path.exists(os.path.join(OUT, name, 'meta.json')): continue
    print(time.strftime('%H:%M'), name, st, flush=True)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', os.path.join(SRC, name + '.webp'), '--mode', 'idle',
                    '--style', st, '--fps', '8', '--length', '49', '--out', OUT], env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
    if i < len(JOBS) - 1: time.sleep(90)
print('全部完成', flush=True)
