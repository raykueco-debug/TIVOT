"""背景線：把 Ray 在註記頁畫的「大概範圍」收斂成精確遮罩。
作法：筆觸內＝可能是前景、筆觸外圍一圈＝可能是背景、更外面＝確定是背景 → GrabCut 依顏色切出物件邊緣。
  布／燈籠／雲這種與周圍顏色差得開的東西切得很乾淨；「天光」這種沒有邊的東西不切（soft=True，照筆觸羽化）。
切完再往外擴一點（布擺動時會超出原本的輪廓），但不超出筆觸本身太多。
用法：python bg_refine.py <notes 資料夾名> [色名=soft ...]
產出：notes/<key>/refined/<色>.png ＋ refined/check.jpg
"""
import json, os, sys
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BG = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'TIVOT', 'resources', 'background'))


def chroma_pick(img, s):
    """布：在灰石頭上的有色布 —— 筆觸內彩度高於「筆觸外圈石頭」彩度上緣的像素。"""
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV); sat = hsv[..., 1].astype(np.float32)
    ring = cv2.dilate(s, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (81, 81))) - s
    thr = max(45.0, float(np.percentile(sat[ring > 0], 90)) + 8) if ring.any() else 60.0
    fg = ((sat > thr) & (s > 0)).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    return fg


def refine(img, stroke, soft=False, grow=10, method='grabcut'):
    H, W = stroke.shape
    s = (stroke > 127).astype(np.uint8)
    if soft or s.sum() == 0:
        return cv2.GaussianBlur(s.astype(np.float32), (0, 0), 6)
    if method == 'chroma':
        fg = chroma_pick(img, s)
        n, lab, stats, _ = cv2.connectedComponentsWithStats(fg)
        keep = np.zeros_like(fg)
        for i in range(1, n):
            if stats[i, cv2.CC_STAT_AREA] >= 150: keep[lab == i] = 1
        keep = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1)))
        return cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 2.5)
    ring = cv2.dilate(s, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61)))
    gc = np.full((H, W), cv2.GC_BGD, np.uint8)
    gc[ring > 0] = cv2.GC_PR_BGD
    gc[s > 0] = cv2.GC_PR_FGD
    # 縮一半跑（快，邊緣再放大回來）
    sc = 0.5
    img_s = cv2.resize(img, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
    gc_s = cv2.resize(gc, (img_s.shape[1], img_s.shape[0]), interpolation=cv2.INTER_NEAREST)
    bgd = np.zeros((1, 65), np.float64); fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(cv2.cvtColor(img_s, cv2.COLOR_RGB2BGR), gc_s, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
    fg = ((gc_s == cv2.GC_FGD) | (gc_s == cv2.GC_PR_FGD)).astype(np.uint8)
    fg = cv2.resize(fg, (W, H), interpolation=cv2.INTER_LINEAR)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # 只留跟筆觸有交集的連通塊（GrabCut 偶爾會在外圈撿到同色的雜塊）
    n, lab = cv2.connectedComponents(fg)
    keep = np.zeros_like(fg)
    for i in range(1, n):
        blob = lab == i
        if (s[blob] > 0).mean() > 0.3: keep[blob] = 1
    keep = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1)))
    keep &= cv2.dilate(s, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
    return cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 2.5)


def main():
    key = sys.argv[1]; soft = {a.split('=')[0] for a in sys.argv[2:] if a.endswith('=soft')}
    d = os.path.join(HERE, 'notes', key); j = json.load(open(os.path.join(d, 'notes.json'), encoding='utf8'))
    img = np.array(Image.open(os.path.join(BG, j['file'])).convert('RGB'))
    os.makedirs(os.path.join(d, 'refined'), exist_ok=True)
    chk = img.astype(np.float32) * 0.5
    for c in j['colors']:
        st = np.array(Image.open(os.path.join(d, c['mask'])).convert('L').resize((img.shape[1], img.shape[0])))
        meth = 'chroma' if '布' in (c.get('text') or '') else 'grabcut'
        m = refine(img, st, soft=c['name'] in soft, method=meth)
        Image.fromarray((m.clip(0, 1) * 255).astype(np.uint8)).save(os.path.join(d, 'refined', c['name'] + '.png'))
        col = np.array([int(c['rgb'][i:i + 2], 16) for i in (1, 3, 5)], np.float32)
        chk = chk * (1 - m[..., None] * 0.6) + (img * 0.5 + col * 0.5) * m[..., None] * 0.6 / 0.6 * 0.6 + 0
    Image.fromarray(chk.clip(0, 255).astype(np.uint8)).resize((img.shape[1] // 2, img.shape[0] // 2)).save(os.path.join(d, 'refined', 'check.jpg'), quality=85)
    print(key, 'ok')


if __name__ == '__main__':
    main()
