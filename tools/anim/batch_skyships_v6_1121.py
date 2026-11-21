# 2026-11-21 空戰動畫副理：空賊船 4、5 號重跑待機（Ray：「inpaint 走不通 在 prompt 加入飛空船 這樣就不會出水」）。
# Ray 剪 4 號 v6airship_cut 交件 →「其他同方式處理」⇒ 1、2、3、5、6、7、8 號都照這一句跑。
# 同 v3enh 設定（強風帆＋TIVOT_LX2V=enh），只把開頭換成「飛空船、浮在半空」。一次一支，跑完先給 Ray 看。
import os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r'C:\Users\User\Desktop\TIVOT\resources\enemy'
OUT = os.path.join(HERE, 'out', 'sky_ships')
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
PROMPT = ('Flying airship floating in mid-air, steampunk sky ship, pure green background, side view, bow facing left. Strong wind. '
          'Black sails flapping hard, sail cloth billowing out and slackening again and again, big ripples running across every sail, '
          'sail edges whipping, ropes swaying, propeller spinning{extra}. Static camera, ship centered, same size, smooth loop. Anime style, cel shading.')
EXTRA = {'7': ', smoke streaming from the funnel', '8': ', smoke streaming from the funnels'}   # 同 v3enh
env = {**os.environ, 'PYTHONIOENCODING': 'utf-8', 'TIVOT_GEN': '720x480', 'TIVOT_FIT': '0.86', 'TIVOT_LX2V': 'enh'}
for n in sys.argv[1:]:
    name = f'mon_pirateship_n{n}_side'
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', os.path.join(SRC, name + '.webp'),
                    '--mode', 'idle', '--fps', '16', '--length', '49', '--out', OUT, '--suffix', '_v6airship', '--prompt', PROMPT.format(extra=EXTRA.get(n, ''))], env=env)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'edge_check.py'), os.path.join(OUT, name + '_v6airship')], env=env)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'make_player.py')], env=env)
    print('完成', name, flush=True)
