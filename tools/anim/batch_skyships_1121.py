# 2026-11-21 空戰動畫副理：空賊船 8 艘（mon_pirateship_n1~n8_side）側面待機。
# Ray 11-21：「可以，交件排待機」→「帆沒動啊 改正」→ 1 號 v3enh（強風帆提示詞＋TIVOT_LX2V=enh）Ray 剪 _cut 採用 ⇒ 2～8 號照 v3enh 跑。
# 橫式立繪 → TIVOT_GEN=720x480（16 整除）；交件 deliver_idle_lite.py（TIVOT_FIT=0.86、fps 24、scale 1.0）。
import os, subprocess, time
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r'C:\Users\User\Desktop\TIVOT\resources\enemy'
OUT = os.path.join(HERE, 'out', 'sky_ships')
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
BASE = ('Flying sky pirate airship, pure green background, side view, bow facing left. Strong wind. '
        'Black sails flapping hard, sail cloth billowing out and slackening again and again, big ripples running across every sail, '
        'sail edges whipping, ropes swaying{extra}. Static camera, ship centered, same size, smooth loop. Anime style, cel shading.')
EXTRA = {7: ', smoke streaming from the funnel', 8: ', smoke streaming from the funnels'}
env = {**os.environ, 'PYTHONIOENCODING': 'utf-8', 'TIVOT_GEN': '720x480', 'TIVOT_FIT': '0.86', 'TIVOT_LX2V': 'enh'}
for n in range(2, 9):
    name = f'mon_pirateship_n{n}_side'
    if os.path.exists(os.path.join(OUT, name + '_v3enh', 'meta.json')): continue
    print(time.strftime('%H:%M'), name, flush=True)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', os.path.join(SRC, name + '.webp'),
                    '--mode', 'idle', '--fps', '16', '--length', '49', '--out', OUT, '--suffix', '_v3enh',
                    '--prompt', BASE.format(extra=EXTRA.get(n, ''))], env=env)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'edge_check.py'), os.path.join(OUT, name + '_v3enh')], env=env)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'make_player.py')], env=env)
    if n < 8: time.sleep(30)
print('全部完成', flush=True)
