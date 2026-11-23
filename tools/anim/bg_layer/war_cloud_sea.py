"""守城戰：地平線以下那片「不移動的雲海」拆成一層（11-23 Ray：「橋的下方要一直有雲」「不移動的雲就讓他稍微改變形狀」）。
從原圖取天空遮罩內、地平線（live.json 的 bottom）以下的像素，上緣羽化，存成 <格>_cloud_sea.webp（RGBA，原圖尺寸），
並在 <格>_live.json 的 files 記 sea —— war_live_batch.py --emit 看到就加 sea 層（不捲動，只由 bgfx 的 def／wob 讓形狀起伏）。
用法：python war_cloud_sea.py ws_0_1_dusk [...]"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
_r = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
ROOT = _r if os.path.isfile(os.path.join(_r, 'script', 'bg_fx.js')) else os.path.normpath(os.path.join(HERE, '..', '..', '..', 'TIVOT'))
BG = os.path.join(ROOT, 'resources', 'background')
OUT = os.path.join(BG, 'anim', 'winsmoor_siege')
FEATHER = 0.035   # 地平線上下羽化（畫面高的比例）
for n in sys.argv[1:]:
    o = Image.open(os.path.join(BG, 'winsmoor_siege', n + '.webp')).convert('RGB'); W, H = o.size
    lj = os.path.join(OUT, n + '_live.json'); j = json.load(open(lj, encoding='utf8'))
    m = np.asarray(Image.open(os.path.join(OUT, n + '_skymask.png')).convert('L').resize((W, H), Image.BILINEAR), np.float32) / 255
    yh = j.get('bottom', 0.4) * H; y = np.arange(H, dtype=np.float32)[:, None]
    f = np.clip((y - (yh - FEATHER * H)) / (2 * FEATHER * H), 0, 1); f = f * f * (3 - 2 * f)
    a = (m * f * 255).astype(np.uint8)
    rgba = np.dstack([np.asarray(o), a]); Image.fromarray(rgba, 'RGBA').save(os.path.join(OUT, n + '_cloud_sea.webp'), quality=88, method=6)
    j['files']['sea'] = 'cloud_sea.webp'; json.dump(j, open(lj, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(n, W, H, 'horizon', round(yh), 'alpha px', int((a > 8).sum()))
