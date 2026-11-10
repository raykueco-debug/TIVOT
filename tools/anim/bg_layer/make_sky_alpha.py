"""背景線：每一格的天空挖空圖（refined/sky_alpha.webp）。bgchk 與遊戲用它把影片裡的天空挖掉，讓程式捲的雲透出來。
alpha＝天空（青色那一塊，往內收 1px 不碰山壁、羽化 1.5px）。沒有天空的格子不做。
11-10：自動判斷的那批漏了這一張 ⇒ 影片蓋住雲，Ray 回報「幾乎看不到雲在動」。
用法：python make_sky_alpha.py [--force]"""
import glob, json, os, sys
import numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
n = 0
for nj in glob.glob(os.path.join(HERE, 'notes', '*', 'notes.json')):
    d = os.path.dirname(nj); j = json.load(open(nj, encoding='utf8'))
    sky = [c for c in j['colors'] if '雲' in (c.get('text') or '')]
    out = os.path.join(d, 'refined', 'sky_alpha.webp')
    if not sky or (os.path.exists(out) and '--force' not in sys.argv): continue
    os.makedirs(os.path.dirname(out), exist_ok=True)
    src = os.path.join(d, 'refined', sky[0]['name'] + '.png')
    if not os.path.exists(src): src = os.path.join(d, sky[0]['mask'])
    m = (np.array(Image.open(src).convert('L')) > 127).astype(np.uint8)
    m = cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))   # 自動遮罩是逐像素的，只收 1px（收太多會在石柱邊留一圈亮邊）
    a = cv2.GaussianBlur(m.astype(np.float32) * 255, (0, 0), 1.0).clip(0, 255).astype(np.uint8)
    H, W = a.shape; H -= H % 2; W -= W % 2
    rgba = np.dstack([np.full((H, W, 3), 255, np.uint8), a[:H, :W]])
    Image.fromarray(rgba, 'RGBA').save(out, lossless=True); n += 1
print('made', n)
