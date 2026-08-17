# -*- coding: utf-8 -*-
"""求舵輪的真正軸心並輸出成「轉起來不偏」的正方形圖。

⚠ 為什麼不能用重心或外接框中心
   舵輪有八根把手，美術繪製時長度／粗細不會完全一致，於是
     · 外接框中心   → 被最長的那根把手拉偏
     · 不透明像素重心 → 被最粗的那幾根拉偏
   實測兩者相差 6px，加上原圖 1262×1246 不是正方形（塞進正方形又拉伸 1.2%），
   轉起來就是繞著偏掉的點跑。

作法：利用舵輪本身的**八重旋轉對稱**。真正的軸心，是「把圖繞它轉 45°
      之後與原圖差異最小」的那一點。掃一遍候選點取最小值即可，
      這個判準不受把手長短影響。
順便量水平／垂直半徑：若不等（圖本身被壓扁），輸出時一併補正成圓。
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "_src", "Wheel.png")
DST = os.path.join(HERE, "Wheel.webp")

im = Image.open(SRC).convert("RGBA")
im = im.crop(im.getbbox())
W0, H0 = im.width, im.height
al0 = np.asarray(im)[..., 3].astype(np.float32) / 255.0

# 搜尋解析度。⚠ 這個值直接決定軸心的精度：SS=256 時一個搜尋像素等於原圖
#   4.9px，細搜到 0.25 也只有 1.2px 的解析度 —— 實測轉起來仍有 ±2.5px 殘留偏移。
#   384 配合 0.1 的細步長，量化誤差降到 0.33px。
SS = 384
small = np.asarray(Image.fromarray((al0 * 255).astype(np.uint8))
                   .resize((SS, SS), Image.BOX), np.float32) / 255.0


def sym_err(m, cx, cy):
    """把 m 繞 (cx,cy) 轉 45°，回傳與原圖的平均絕對差"""
    sh = ndi.shift(m, (SS / 2 - cy, SS / 2 - cx), order=1, mode="constant")
    rot = ndi.rotate(sh, 45, reshape=False, order=1, mode="constant")
    return float(np.abs(sh - rot).mean())


best, bc = 1e9, (SS / 2, SS / 2)
for cy in np.arange(SS / 2 - 10, SS / 2 + 10.01, 1.0):
    for cx in np.arange(SS / 2 - 10, SS / 2 + 10.01, 1.0):
        e = sym_err(small, cx, cy)
        if e < best:
            best, bc = e, (cx, cy)
for span, stp in ((1.0, 0.25), (0.3, 0.1)):          # 兩段細搜
    c0 = bc
    for cy in np.arange(c0[1] - span, c0[1] + span + 1e-9, stp):
        for cx in np.arange(c0[0] - span, c0[0] + span + 1e-9, stp):
            e = sym_err(small, cx, cy)
            if e < best:
                best, bc = e, (cx, cy)

cx = bc[0] / SS * W0
cy = bc[1] / SS * H0
bbc = (W0 / 2, H0 / 2)
ys, xs = np.where(al0 > 0.1)
wgt = al0[ys, xs]
cen = ((xs * wgt).sum() / wgt.sum(), (ys * wgt).sum() / wgt.sum())
print("原圖 %dx%d" % (W0, H0))
print("  外接框中心 (%.1f, %.1f)" % bbc)
print("  像素重心   (%.1f, %.1f)" % cen)
print("  對稱軸心   (%.1f, %.1f)   ← 採用（45° 旋轉差 %.5f）" % (cx, cy, best))

# 量半徑：沿四個方向找最遠的不透明像素
m = al0 > 0.1
rx = max(cx - xs.min(), xs.max() - cx)
ry = max(cy - ys.min(), ys.max() - cy)
print("  水平半徑 %.1f　垂直半徑 %.1f　橢圓度 %.3f" % (rx, ry, rx / ry))

# 以對稱軸心為中心補成正方形；若不圓，縱向補正回圓
R = int(np.ceil(max(rx, ry))) + 2
out = Image.new("RGBA", (R * 2, R * 2), (0, 0, 0, 0))
src2 = im
if abs(rx / ry - 1) > 0.004:                      # 圖本身被壓扁 → 先拉回圓
    ny = int(round(H0 * (rx / ry)))
    src2 = im.resize((W0, ny), Image.LANCZOS)
    cy = cy * (rx / ry)
    print("  → 縱向補正 %d → %d 像素，使其成圓" % (H0, ny))
out.paste(src2, (int(round(R - cx)), int(round(R - cy))))
out = out.resize((512, 512), Image.LANCZOS)

# ⚠ 殘差修正：45° 對稱搜尋看不見「週期剛好是 45° 的整數倍」那一類偏差
#   —— 那正是舵輪的對稱週期。改用輪圈環帶的重心當第二把尺：若軸心正確，
#   環帶重心不論轉到幾度都該落在正中心；實測它繞著一個偏離的點跑，
#   偏離量就是還要補的位移。迭代兩次即收斂。
def rim_bias(arr):
    N = arr.shape[0]
    c = (N - 1) / 2
    yy, xx = np.mgrid[0:N, 0:N]
    rr = np.hypot(xx - c, yy - c)
    band = (rr > N * 0.30) & (rr < N * 0.44)
    # ⚠ 取樣角度必須繞滿 360°：輪圈重心裡有一個「跟著圖轉」的分量，
    #   只掃 180° 的話它不會抵消，平均出來的偏移是錯的
    #   （實測用 0..150° 平均，修正後反而從 1.8px 惡化到 4.4px）。
    angs = np.arange(0, 360, 30)
    ox = oy = 0.0
    for ang in angs:
        m = ndi.rotate(arr, float(ang), reshape=False, order=1, mode="constant") * band
        s = m.sum()
        ox += (m * xx).sum() / s - c
        oy += (m * yy).sum() / s - c
    return ox / len(angs), oy / len(angs)


for it in range(2):
    A = np.asarray(out)[..., 3].astype(np.float32) / 255.0
    dx, dy = rim_bias(A)
    print("  殘差修正 #%d：輪圈偏移 (%+.2f, %+.2f) px" % (it + 1, dx, dy))
    if abs(dx) < 0.1 and abs(dy) < 0.1:
        break
    sh = np.stack([ndi.shift(np.asarray(out)[..., i].astype(np.float32),
                             (-dy, -dx), order=1, mode="constant") for i in range(4)], -1)
    out = Image.fromarray(np.clip(sh, 0, 255).astype(np.uint8), "RGBA")

out.save(DST, "WEBP", quality=88, method=6)
print("→ %s  512x512（軸心＝正中心、已補圓）  %dKB" % (DST, os.path.getsize(DST) // 1024))

