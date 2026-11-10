"""背景線：重判自動格子的天空（11-10：舊判法只收「從上緣連進來」的天空，拱門裡、樹冠縫裡的天空都漏了 ⇒ 雲被影片蓋住）。
新判法：上方 75% 內，① 藍天（色相偏藍、有彩度、夠亮、平滑）② 跟藍天連在一起的白雲（很亮、低彩度、平滑）。
只改天空那一色（cyan.png、refined/cyan.png、refined/sky_alpha.webp）；Ray 自己塗的格不碰。
沒有天空的格子若判到天空，就加一色「雲湧動」（不影響 ABA，雲本來就交給程式）。
用法：python sky_fix.py [--dry] [key...]"""
import glob, json, os, sys
import numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
BG = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'TIVOT', 'resources', 'background'))


def sky(rgb):
    H, W = rgb.shape[:2]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV); h, s, v = [hsv[..., i].astype(int) for i in range(3)]
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    lap = cv2.GaussianBlur(np.abs(cv2.Laplacian(gray, cv2.CV_32F)), (0, 0), 3)
    smooth = lap < 9
    blue = (h >= 92) & (h <= 128) & (s >= 45) & (v >= 205) & smooth   # 天空很亮；遠山遠景偏暗（v<195）
    r_, g_, b_ = [rgb[..., i].astype(int) for i in range(3)]
    white = (v >= 215) & (s <= 100) & (b_ >= r_ - 4) & (lap < 40)   # 雲：偏冷的白（石頭偏灰暖）；有線稿，平滑門檻放寬
    blue = cv2.morphologyEx(blue.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(blue)
    keep = np.zeros((H, W), np.uint8)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > H * W * 0.002 and st[i, cv2.CC_STAT_TOP] < H * 0.5 and cen[i][1] < H * 0.5: keep[lab == i] = 1   # 湖面的藍在下半，不算
    if not keep.any(): return keep
    # 白雲：跟藍天連在一起的才算（地上的白石頭不算）
    cand = ((keep > 0) | white).astype(np.uint8); cand[int(H * 0.75):] = 0
    bridge = cv2.dilate(cand, np.ones((7, 7), np.uint8))   # 雲有描邊，描邊會把白雲跟藍天切開 ⇒ 連通時跨過細線
    n, lab = cv2.connectedComponents(bridge)
    ids = set(np.unique(lab[keep > 0])) - {0}
    m = (np.isin(lab, list(ids)) & (cand > 0)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)))
    # 填掉天空裡的小洞（雲裡的陰影）
    inv = (1 - m).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(inv)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] < H * W * 0.003: m[lab == i] = 1
    return m


def main():
    dry = '--dry' in sys.argv; only = [a for a in sys.argv[1:] if not a.startswith('--')]
    for nj in sorted(glob.glob(os.path.join(HERE, 'notes', '*', 'notes.json'))):
        d = os.path.dirname(nj); key = os.path.basename(d)
        if only and key not in only: continue
        j = json.load(open(nj, encoding='utf8'))
        if not j.get('auto'): continue
        rgb = np.array(Image.open(os.path.join(BG, j['file'])).convert('RGB'))
        m = sky(rgb); fr = m.mean()
        old = [c for c in j['colors'] if '雲' in (c.get('text') or '')]
        print(key, 'sky', round(float(fr), 3), 'had' if old else 'new', flush=True)
        if dry: continue
        os.makedirs(os.path.join(d, 'refined'), exist_ok=True)
        if fr < 0.01: continue   # 新判法沒判到（黃昏、紫天那種不藍的天空）⇒ 保留舊的，不要把天空拿掉
        Image.fromarray(m * 255).save(os.path.join(d, 'cyan.png'))
        Image.fromarray(cv2.GaussianBlur(m.astype(np.float32) * 255, (0, 0), 2).clip(0, 255).astype(np.uint8)).save(os.path.join(d, 'refined', 'cyan.png'))
        if not old:
            j['colors'].append({'name': 'cyan', 'rgb': '#2fe0e0', 'text': '雲湧動', 'mask': 'cyan.png'})
            json.dump(j, open(nj, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        sa = os.path.join(d, 'refined', 'sky_alpha.webp')
        if os.path.exists(sa): os.remove(sa)
    if not dry:
        import subprocess; subprocess.run([sys.executable, 'make_sky_alpha.py'], cwd=HERE)


if __name__ == '__main__':
    main()
