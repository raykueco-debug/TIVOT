# -*- coding: utf-8 -*-
"""
碼頭素材 → 可用的貼圖
------------------------------------------------------------------
輸入：flight/_src/city/Dockbridge_iso.png（棧橋，橫向）
      flight/_src/city/BridgeEnd_iso.png（橋頭端片）
輸出：flight/city/dock_strip.webp / dock_end.webp

三件事：

1. **去白底**。美術給的圖 alpha 全不透明、背景是白的（實測 coverage 100%）。
   直接貼上去會是一塊白方框。用「離白色的距離」當 alpha，而不是單一門檻二值化——
   木頭邊緣有抗鋸齒，硬切會留下一圈白邊。

2. **切出整數個重複週期**。棧橋要沿長度方向接續鋪，接縫處的木紋與繫船柱必須對得上。
   用自相關找出週期（柱子的間距），再裁成整數倍，接縫就自動吻合。
   ⚠ 不能直接拿整張圖去鋪：兩端剛好被裁在半根柱子上的話，每一段接縫都會出現
     半根柱子疊半根柱子。

3. **縮放像素化**（同城的插畫與林草）：先縮再最近鄰放大，顆粒才與世界一致。

⚠ 不壓暗、不去飽和：曝光與色調由 runtime 統一套（見 index.html 的 LIT / 城的曝光對齊），
  這裡先壓的話會暗兩次。
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '_src', 'city')
DST = os.path.join(HERE, 'city')

STRIP_H = 48         # 棧橋輸出高度（貼圖像素）；長度由週期決定
END_MAX = 96         # 端片輸出的最長邊
PIX = 2              # 縮放像素化倍率
QUALITY = 92


def unwhite(im):
    """白底 → alpha。以「離白色的距離」當不透明度，保住抗鋸齒邊。"""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    d = 255.0 - a.min(axis=2)                 # 純白＝0，越暗越大
    al = np.clip(d / 42.0, 0, 1)              # 42：木頭最淺處也遠比這暗
    # 邊緣去白：把殘留的白邊往內收一點，免得貼上去有一圈亮邊
    rgb = a
    out = np.dstack([rgb, al * 255.0]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def crop_alpha(im, thr=24):
    a = np.asarray(im)[:, :, 3]
    ys, xs = np.where(a > thr)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def find_period(im):
    """自相關找橫向重複週期（柱子間距）。回傳像素數，找不到就回整寬。"""
    a = np.asarray(im.convert('RGBA')).astype(np.float32)
    col = (a[:, :, :3].mean(axis=2) * (a[:, :, 3] / 255.0)).mean(axis=0)
    col = col - col.mean()
    W = len(col)
    best, bestv = W, -1e18
    for p in range(int(W * 0.12), int(W * 0.55)):
        v = float((col[:W - p] * col[p:]).sum() / (W - p))
        if v > bestv:
            bestv, best = v, p
    return best


os.makedirs(DST, exist_ok=True)

# ── 棧橋 ──────────────────────────────────────────────────────────────
p = os.path.join(SRC, 'Dockbridge_iso.png')
if os.path.exists(p):
    im = crop_alpha(unwhite(Image.open(p)))
    per = find_period(im)
    reps = max(1, int(round(im.width / per)))
    w = per * reps
    im = im.crop((0, 0, min(w, im.width), im.height))
    scale = STRIP_H / im.height
    tw = max(8, int(round(im.width * scale)))
    im = im.resize((tw, STRIP_H), Image.LANCZOS)
    if PIX > 1:
        im = im.resize((max(4, tw // PIX), STRIP_H // PIX), Image.LANCZOS).resize((tw, STRIP_H), Image.NEAREST)
    im.save(os.path.join(DST, 'dock_strip.webp'), quality=QUALITY, method=6)
    print('Dockbridge → dock_strip.webp %dx%d（週期 %dpx × %d 段）' % (im.width, im.height, per, reps))

# ── 端片 ──────────────────────────────────────────────────────────────
p = os.path.join(SRC, 'BridgeEnd_iso.png')
if os.path.exists(p):
    im = crop_alpha(unwhite(Image.open(p)))
    im.thumbnail((END_MAX, END_MAX), Image.LANCZOS)
    if PIX > 1:
        w2, h2 = im.size
        im = im.resize((max(4, w2 // PIX), max(4, h2 // PIX)), Image.LANCZOS).resize((w2, h2), Image.NEAREST)
    im.save(os.path.join(DST, 'dock_end.webp'), quality=QUALITY, method=6)
    print('BridgeEnd  → dock_end.webp %dx%d' % (im.width, im.height))
