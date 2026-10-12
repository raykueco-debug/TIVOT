# 2026-10-12：縮到 0.72 仍出框的 3 隻 → 0.62 ＋ 小幅振翅提示詞（翅膀維持原大小、不張開到畫面外）。
import os, subprocess, time, json
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = r'C:\Users\Ray Ku\Desktop\TIVOT\resources\enemy'
OUT = os.path.join(HERE, 'out', 'monsters'); PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
P = ('一隻飛行的怪物在純綠色背景前的空中原地懸停，朝著鏡頭的姿勢與構圖不變：翅膀（或鰭、膜）維持原本的大小與形狀，'
     '只以小幅度、緩慢的節奏輕輕上下拍動，不要把翅膀張開得更大、不要伸出畫面外；身體隨拍動輕輕上下浮沉，尾巴緩慢擺動。'
     '不要飛走、不要轉身、不要靠近或遠離鏡頭。最後回到開始的姿勢。'
     '鏡頭完全固定不動，背景始終是純綠色，主體始終在畫面中央、大小不變、肢體數量不變。動漫風格，賽璐珞上色。')
for i, n in enumerate(['mon_sky_ribwhale', 'mon_sky_boneray', 'mon_sky_eyemoth']):
    seed = json.load(open(os.path.join(OUT, n, 'meta.json'), encoding='utf-8'))['seed']
    print(time.strftime('%H:%M'), n, seed, flush=True)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', os.path.join(SRC, n + '.webp'), '--mode', 'idle',
                    '--fps', '8', '--length', '49', '--seed', str(seed), '--suffix', '_fit62', '--out', OUT, '--prompt', P],
                   env={**os.environ, 'PYTHONIOENCODING': 'utf-8', 'TIVOT_FIT': '0.62'})
    if i < 2: time.sleep(60)
print('全部完成', flush=True)
