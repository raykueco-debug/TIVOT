"""背景線：重判自動格子的「火」（Ray 11-10：「火光還是在提詞裡」—— 地上的反光、夕照的天空、陽光斑都被當成火）。
新判法：逐塊看，只留「有白熱的焰心」的小塊（燭火、火把、火盆）；反光、夕照天空沒有焰心 ⇒ 丟掉。
沒有一塊留下來 ⇒ 那一格的橙色整個拿掉。Ray 自己塗的格不碰。
用法：python fire_fix.py [--dry] [--sheet 路徑前綴]"""
import glob, json, os, sys
import numpy as np, cv2
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
BG = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'TIVOT', 'resources', 'background'))


def fire(rgb):
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV); h, s, v = [hsv[..., i].astype(int) for i in range(3)]
    warm = (((h <= 30) | (h >= 172)) & (s >= 60) & (v >= 200)).astype(np.uint8)
    core = ((v >= 250) & (s <= 120) & ((h <= 35) | (h >= 172))).astype(np.uint8)   # 焰心：近白的黃
    vf = v.astype(np.float32); loc = cv2.GaussianBlur(vf, (0, 0), 25)
    warm &= ((vf - loc) > 50).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(cv2.dilate(warm, np.ones((5, 5), np.uint8)))
    keep = np.zeros_like(warm); blobs = []
    for i in range(1, n):
        a = st[i, cv2.CC_STAT_AREA]; w, hh = st[i, cv2.CC_STAT_WIDTH], st[i, cv2.CC_STAT_HEIGHT]
        if not (40 <= a <= 5000): continue
        if w > hh * 2.2: continue                       # 火是直的；橫向攤開的是反光或天邊
        if core[lab == i].sum() < 4: continue          # 沒有焰心
        keep[lab == i] = 1; blobs.append(cen[i])
    return cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))), blobs


# 肉眼複核（11-10，看過逐塊裁圖）：這幾格判到的是月亮、夕照、陽光、地上反光、沒點亮的燈罩，不是火
NOFIRE = ['belisar__greathall', 'belisar__offering', 'belisar__starroom',
          'dunmor__boarstone', 'dunmor__bogoffer', 'dunmor__brochtop', 'dunmor__causeway', 'dunmor__dolmen', 'dunmor__druidhouse',
          'dunmor__granary', 'dunmor__kingsbarrow', 'dunmor__marketcross', 'dunmor__nemeton', 'dunmor__oghamrow', 'dunmor__triskele',
          'shinier_ruins__corridor', 'shinier_ruins__prison', 'sofiaout__forecourt', 'sofiaout__lodge',
          'tomb__adit', 'tomb__cloister', 'tomb__cryptwalk', 'tomb__graveldrop', 'tomb__shaft']


def main():
    dry = '--dry' in sys.argv; sheet = sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else None
    crops = []; drop = 0; keepn = 0
    for nj in sorted(glob.glob(os.path.join(HERE, 'notes', '*', 'notes.json'))):
        d = os.path.dirname(nj); key = os.path.basename(d); j = json.load(open(nj, encoding='utf8'))
        if not j.get('auto') or not any(c['name'] == 'orange' for c in j['colors']): continue
        im = Image.open(os.path.join(BG, j['file'])).convert('RGB'); rgb = np.array(im)
        m, blobs = fire(rgb)
        if any(key.startswith(p + '__') for p in NOFIRE): blobs = []
        if sheet:
            for cx, cy in blobs[:2]:
                x0 = int(max(0, min(im.width - 160, cx - 80))); y0 = int(max(0, min(im.height - 160, cy - 80)))
                crops.append((key, im.crop((x0, y0, x0 + 160, y0 + 160)).resize((120, 120))))
        if not blobs: drop += 1
        else: keepn += 1
        if dry: continue
        if not blobs:
            j['colors'] = [c for c in j['colors'] if c['name'] != 'orange']
            for f in [os.path.join(d, 'orange.png'), os.path.join(d, 'refined', 'orange.png')]:
                if os.path.exists(f): os.remove(f)
        else:
            Image.fromarray(m * 255).save(os.path.join(d, 'orange.png'))
            Image.fromarray(cv2.GaussianBlur(m.astype(np.float32) * 255, (0, 0), 2).clip(0, 255).astype(np.uint8)).save(os.path.join(d, 'refined', 'orange.png'))
        j['fire_v2'] = True
        json.dump(j, open(nj, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('留火', keepn, '拿掉', drop)
    if sheet:
        for s in range(0, len(crops), 80):
            sh = Image.new('RGB', (120 * 10, 132 * 8), 'black'); dr = ImageDraw.Draw(sh)
            for i, (k, c) in enumerate(crops[s:s + 80]):
                x, y = (i % 10) * 120, (i // 10) * 132; sh.paste(c, (x, y)); dr.text((x + 2, y + 120), k[:20], fill='white')
            sh.save(f'{sheet}{s // 80}.jpg', quality=80)


if __name__ == '__main__':
    main()
