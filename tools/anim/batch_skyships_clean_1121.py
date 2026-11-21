# 2026-11-21 空戰動畫副理：空賊船 4、5 號「只動帆跟槳」（Ray：「讓 Wan inpaint 只動帆跟槳 這樣就不會有浪了吧」）。
# 輸入＝build_clean_in_1121.py 做的原立繪 49 格＋遮罩；第 0 格與最後一格都鎖原立繪（循環）。船身在遮罩外 ⇒ 逐像素照抄原圖。
import os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
SRC = r'C:\Users\User\Desktop\TIVOT\resources\enemy'
PROMPT = ('Sky pirate airship, black sails flapping hard in strong wind, big ripples running across every sail, '
          'brass propeller spinning fast, pure green background. Anime style, cel shading.')
env = {**os.environ, 'PYTHONIOENCODING': 'utf-8', 'TIVOT_GEN': '720x480', 'TIVOT_FIT': '0.86'}
for name in ['mon_pirateship_n4_side', 'mon_pirateship_n5_side']:
    if os.path.exists(os.path.join(HERE, 'out', 'sky_ships_clean', f'{name}_clean_s7', 'meta.json')): continue
    d = os.path.join(HERE, 'in_clean', name)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_vace_repaint.py'), os.path.join(d, 'frame_*.png'),
                    '--name', name + '_clean', '--prompt', PROMPT, '--maskimg', os.path.join(d, '_mask.png'),
                    '--last', os.path.join(SRC, name + '.webp'), '--out', os.path.join(HERE, 'out', 'sky_ships_clean')], env=env)
print('全部完成', flush=True)
