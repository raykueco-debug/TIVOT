# 2026-11-21 空戰動畫副理：空賊船 8 艘（mon_pirateship_n1~n8_side）側面待機。
# Ray 11-21：「可以，交件排待機」。空戰剪法＝Wan 48 格全留、24fps（Ray 在 animechk 剪）。
# 橫式立繪 → TIVOT_GEN=720x480（16 整除）；帆鼓動為主（同 mon_pirateship_side_v2 的待機）。
import os, subprocess, time
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r'C:\Users\User\Desktop\TIVOT\resources\enemy'
OUT = os.path.join(HERE, 'out', 'sky_ships')
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
BASE = ('Flying sky pirate airship hovering in place, pure green background, side view, bow facing left. '
        'Black sails billowing and rippling in the wind, ropes swaying, brass propeller turning, '
        'hull gently bobbing up and down{extra}. Static camera, ship centered, same size, smooth loop. Anime style, cel shading.')
EXTRA = {7: ', smoke rising from the funnel, paddle wheel turning', 8: ', smoke rising from the funnels'}
env = {**os.environ, 'PYTHONIOENCODING': 'utf-8', 'TIVOT_GEN': '720x480', 'TIVOT_FIT': '0.86'}
for n in range(1, 9):
    name = f'mon_pirateship_n{n}_side'
    if os.path.exists(os.path.join(OUT, name, 'meta.json')): continue
    print(time.strftime('%H:%M'), name, flush=True)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', os.path.join(SRC, name + '.webp'),
                    '--mode', 'idle', '--fps', '16', '--length', '49', '--out', OUT,
                    '--prompt', BASE.format(extra=EXTRA.get(n, ''))], env=env)
    if n < 8: time.sleep(60)
print('全部完成', flush=True)
