# 2026-11-21 空戰動畫副理：空賊船待機的螺旋槳 VACE 重畫（Ray：「螺旋槳的部份inpaint重跑」）。
# 原片 48 格（out/sky_ships/<名>）＋第 0 格接尾＝49 格（in_prop/<名>）；固定框只罩螺旋槳，第 0 格整格照抄當外觀參考。
import os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
JOBS = {'mon_pirateship_n8_side_v3enh': '0.855,0.59,0.955,0.83',
        'mon_pirateship_n4_side_v4air': '0.865,0.63,0.955,0.86',
        'mon_pirateship_n5_side_v4air': '0.855,0.60,0.955,0.85',
        'mon_pirateship_n5_side_v3enh': '0.855,0.60,0.955,0.85',
        'mon_pirateship_n4_side_v3enh': '0.865,0.63,0.955,0.86'}
PROMPT = 'A brass six-blade ship propeller spinning steadily at the stern, same blade shape in every frame, crisp clean blades, pure green background. Anime style, cel shading.'
env = {**os.environ, 'PYTHONIOENCODING': 'utf-8', 'TIVOT_GEN': '720x480'}
for name, box in JOBS.items():
    if os.path.exists(os.path.join(HERE, 'out', 'sky_ships_prop', f'{name}_prop_s7', 'meta.json')): continue
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_vace_repaint.py'), os.path.join(HERE, 'in_prop', name, 'frame_*.webp'),
                    '--name', name + '_prop', '--prompt', PROMPT, '--rgba', '--box', box, '--out', os.path.join(HERE, 'out', 'sky_ships_prop')], env=env)
print('全部完成', flush=True)
