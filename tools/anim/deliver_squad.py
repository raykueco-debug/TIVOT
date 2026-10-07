# 群戰中槍 5 格 → 轉回原圖畫布座標（1024×1536），每人裁成 5 格聯集的框，交 webp ＋ anim.json
import glob, json, os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
PICK = os.path.join(HERE, 'out', 'squad_pick'); SQ = os.path.join(HERE, 'out', 'squad')
SRC = r'C:\Users\Ray Ku\Desktop\TIVOT\resources\_originals\enemy\_thug_layers'
DST = r'C:\Users\Ray Ku\Desktop\TIVOT\resources\enemy\anim'
SCENE = {'hall': 'man_thug_squad', 'gate': 'man_thug_squad_gate', 'avenue': 'man_thug_squad_avenue',
         'fore': 'man_thug_squad_forecourt', 'carr': 'man_thug_squad_carriage'}
W, H = 480, 720
summary = {}
for d in sorted(glob.glob(os.path.join(PICK, '*_thug_*'))):
    name = os.path.basename(d); sc, n = name.split('_thug_')
    src = Image.open(os.path.join(SRC, sc, f'thug_{n}.png')).convert('RGBA')
    bb = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    s = min(W * 0.86 / w, H * 0.86 / h); w2, h2 = round(w * s), round(h * s)
    ox, oy = (W - w2) // 2, H - h2 - int(H * 0.05)
    canv = []
    for j in range(5):
        f = Image.open(os.path.join(d, f'frame_{j:02d}.webp')).convert('RGBA')
        # 動畫格 (fx,fy) → 畫布 (bb0 + (fx-ox)/s)
        cw, ch = round(W / s), round(H / s)
        big = f.resize((cw, ch), Image.LANCZOS)
        c = Image.new('RGBA', src.size, (0, 0, 0, 0))
        c.alpha_composite(big, (0, 0), (0, 0)) if False else None
        px, py = round(bb[0] - ox / s), round(bb[1] - oy / s)
        c.paste(big, (px, py), big)
        canv.append(c)
    box = None
    for c in canv:
        b = c.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        if b: box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    od = os.path.join(DST, f'{SCENE[sc]}_hit_v1', f'thug_{n}'); os.makedirs(od, exist_ok=True)
    tot = 0
    for j, c in enumerate(canv):
        p = os.path.join(od, f'frame_{j:02d}.webp'); c.crop(box).save(p, 'WEBP', quality=85, alpha_quality=90, method=6); tot += os.path.getsize(p)
    meta = json.load(open(os.path.join(SQ, name, 'meta.json'), encoding='utf-8'))
    kind = 'forward' if 'forward face-down' in meta['prompt'] else ('prone' if 'prone' in meta['prompt'] else 'back')
    info = {'canvas': list(src.size), 'box': [box[0], box[1], box[2] - box[0], box[3] - box[1]], 'frames': 5, 'kind': kind}
    json.dump(info, open(os.path.join(od, 'anim.json'), 'w'), indent=1)
    summary.setdefault(SCENE[sc], {})[f'thug_{n}'] = {**info, 'kb': tot // 1024}
    print(name, kind, info['box'], tot // 1024, 'KB')
json.dump(summary, open(os.path.join(DST, '_squad_hit_v1.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
