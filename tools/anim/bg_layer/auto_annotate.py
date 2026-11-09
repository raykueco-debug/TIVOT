"""背景線：沒註記的格，由我自動判斷「會動的範圍」寫成註記（Ray 11-10 睡前：「我自己判斷範圍跑」）。
寫進 notes/<key>/（與 Ray 自己塗的格式相同），標 auto:true、submitted:false、整體備註寫「自動判斷，待 Ray 確認」。
⚠ Ray 已經存過的格一律不碰（notes.json 存在且不是 auto）。
判斷（只做顏色看得出來的）：
  · 綠：葉、草、蕨（綠／黃綠、有彩度）→「樹葉草叢隨風搖曳」→ ABA
  · 橙：火（暖色、高彩度、很亮的小塊）→「火焰搖曳閃爍」→ ABA
  · 青：天空（從上緣連進來、亮、偏藍或灰白）→「雲湧動」→ 交給程式分層雲
  布、旗、水面靠顏色分不出來 → 不判（Ray 看到要的自己補塗）。
用法：python auto_annotate.py [--maps a,b,c] [--dry]
"""
import argparse, json, os, time
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BG = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'TIVOT', 'resources', 'background'))
COL = {'green': '#3ddc5a', 'orange': '#ff9a1f', 'cyan': '#2fe0e0'}


def foliage(rgb, hsv):
    h, s, v = [hsv[..., i].astype(int) for i in range(3)]
    g = ((h >= 30) & (h <= 95) & (s >= 70) & (v >= 35) & (rgb[..., 1].astype(int) > rgb[..., 0].astype(int) * 1.08)).astype(np.uint8)
    g = cv2.morphologyEx(g, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    g = cv2.morphologyEx(g, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(g)
    keep = np.zeros_like(g)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > 600: keep[lab == i] = 1
    return keep


def fire(rgb, hsv):
    h, s, v = [hsv[..., i].astype(int) for i in range(3)]
    f = (((h <= 22) | (h >= 172)) & (s >= 130) & (v >= 215)).astype(np.uint8)
    # 火要比周圍亮很多（陽光照到的地面是整片亮，不是一小團亮）
    vf = v.astype(np.float32); loc = cv2.GaussianBlur(vf, (0, 0), 25)
    f &= ((vf - loc) > 60).astype(np.uint8)
    if f.mean() > 0.012: return np.zeros_like(f)   # 亮的地方太多＝陽光／夕照，不是火
    n, lab, st, _ = cv2.connectedComponentsWithStats(f)
    keep = np.zeros_like(f)
    for i in range(1, n):
        a = st[i, cv2.CC_STAT_AREA]
        if 30 <= a <= 6000: keep[lab == i] = 1
    return cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))   # 火焰的晃動範圍＋光暈


def sky(rgb, hsv):
    H, W = rgb.shape[:2]
    r, g, b = [rgb[..., i].astype(int) for i in range(3)]
    s, v = hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    cand = ((v >= 110) & (b >= r - 8) & ((s <= 140) | (b > g))).astype(np.uint8)
    cand[int(H * 0.7):] = 0
    cand = cv2.morphologyEx(cand, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab = cv2.connectedComponents(cand)
    top = set(np.unique(lab[0:3])) - {0}
    m = np.isin(lab, list(top)).astype(np.uint8)
    # 天空要夠「平」：高頻太多的是建築或岩石
    lap = np.abs(cv2.Laplacian(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY), cv2.CV_32F))
    if m.sum() and float(lap[m > 0].mean()) > 14: return np.zeros_like(m)
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--maps', default=''); ap.add_argument('--dry', action='store_true')
    a = ap.parse_args()
    nodes = json.load(open(os.path.join(HERE, 'nodes.json'), encoding='utf8'))
    want = set(a.maps.split(',')) if a.maps else None
    stat = []
    for n in nodes:
        if want and n['map'] not in want: continue
        files = dict(n['files'])
        band = 'day' if 'day' in files else ('base' if 'base' in files else n['files'][0][0])
        key = f"{n['map']}__{n['id']}__{band}"; d = os.path.join(HERE, 'notes', key)
        nj = os.path.join(d, 'notes.json')
        if os.path.exists(nj) and not json.load(open(nj, encoding='utf8')).get('auto'): continue   # Ray 的不碰
        rgb = np.array(Image.open(os.path.join(BG, files[band])).convert('RGB')); hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        tot = rgb.shape[0] * rgb.shape[1]
        found = []
        for name, fn, text, minf in (('green', foliage, '樹葉草叢隨風搖曳', 0.01), ('orange', fire, '火焰搖曳閃爍', 0.0008), ('cyan', sky, '雲湧動', 0.02)):
            m = fn(rgb, hsv)
            fr = m.sum() / tot
            if name == 'green' and fr > 0.45: continue   # 滿牆發光苔那種，不是被風吹的葉子
            if fr >= minf: found.append((name, m, text))
        stat.append((key, [f[0] for f in found]))
        if a.dry or not found: continue
        os.makedirs(d, exist_ok=True)
        for f in os.listdir(d):
            if f.endswith('.png'): os.remove(os.path.join(d, f))   # 只清自動產生的舊遮罩（這一格本來就是 auto）
        colors = []
        for name, m, text in found:
            Image.fromarray(m * 255).save(os.path.join(d, name + '.png'))
            colors.append({'name': name, 'rgb': COL[name], 'text': text, 'mask': name + '.png'})
        json.dump({'key': key, 'map': n['map'], 'mapName': n['mapName'], 'node': n['id'], 'name': n['name'], 'band': band, 'file': files[band],
                   'general': '（自動判斷，待 Ray 確認）', 'submitted': False, 'auto': True, 'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'colors': colors},
                  open(nj, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    from collections import Counter
    print(len(stat), 'nodes;', Counter(tuple(x[1]) for x in stat).most_common(12))


if __name__ == '__main__':
    main()
