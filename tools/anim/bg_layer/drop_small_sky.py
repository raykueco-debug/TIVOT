"""背景線：雲少的格子不動雲（Ray 11-10：「雲的比例不多的就不用動雲了」「主體是樹的就弄樹就好」）。
自動判斷的格子：天空佔畫面 < 10%、或夏爾森林（斷崖邊除外，它走純 Wan）⇒ 拿掉青色那一層與挖空圖（天空維持原圖）。
Ray 自己塗的格不碰（卡耶爾山谷那幾格要 Ray 決定）。"""
import glob, json, os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
for nj in sorted(glob.glob(os.path.join(HERE, 'notes', '*', 'notes.json'))):
    d = os.path.dirname(nj); key = os.path.basename(d); j = json.load(open(nj, encoding='utf8'))
    if not j.get('auto'): continue
    sky = [c for c in j['colors'] if '雲' in (c.get('text') or '')]
    if not sky: continue
    fr = float((np.array(Image.open(os.path.join(d, sky[0]['mask'])).convert('L')) > 127).mean())
    forest = key.startswith('shinier_forest__') and key != 'shinier_forest__cliff__day'
    if fr >= 0.10 and not forest: continue
    j['colors'] = [c for c in j['colors'] if c not in sky]
    json.dump(j, open(nj, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    for f in [os.path.join(d, 'refined', 'sky_alpha.webp')]:
        if os.path.exists(f): os.remove(f)   # 自動產生的中間檔
    print('不動雲', key, round(fr, 3), '森林' if forest else '')
