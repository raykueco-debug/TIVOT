# -*- coding: utf-8 -*-
"""
把 flight/Ship_FLIGHT.png（單張合成圖）拆成 SHIP_VISUAL 要的圖層。

切法（依實測的構圖，不是通用演算法）：
  · 船體是中央一根窄柱（桅杆→瞭望台→甲板→艉樓→舵），帆是左右外伸的翼。
    → 用「中央走廊」envelope 分：走廊內＝hull，走廊外＝帆。
    桁（橫桁）與側支索落在走廊外，會跟著該層帆一起甩——本來就該一起動。
  · y≥845 完全沒有帆布（實測 cloth=0），該區的不透明像素一律是 hull 或螺旋槳。
  · 三層帆的分界取「帆布量歸零的谷底」：y=258、y=455。
  · 螺旋槳只取葉片：y 1148..1258，扣掉該列中央那一段（＝船體/艉舵）。
    軸套與機艙留在 hull，葉片轉起來時露出的空隙本來就該是空氣。

⚠ 走廊邊界用「hull 外擴 6px」製造重疊帶：hull 先畫、帆後畫且不透明，
  重疊處由帆蓋掉，甩開時也不會露出接縫。
"""
import numpy as np
from PIL import Image

SRC = r"C:\Users\Ray Ku\Desktop\TIVOT\flight\Ship_FLIGHT.png"
DST = r"C:\Users\Ray Ku\Desktop\TIVOT\flight\ship"
OUT_W = 512                      # 輸出畫布寬（uk=CW/512=1 → 規格的 offset 數值可原樣沿用）

im = Image.open(SRC).convert("RGBA")
src = np.asarray(im)
H, W = src.shape[:2]
al = src[..., 3]
op = al > 24
CX = 595.5

# ── 中央走廊：half-width vs y（由實測輪廓讀出的錨點，線性內插）──────
ANCHORS = [(0, 14), (50, 20), (80, 26), (110, 30), (200, 34), (330, 44),
           (430, 44), (530, 46), (590, 52), (620, 66), (660, 90), (700, 104),
           (730, 118), (760, 128), (790, 136), (815, 156), (845, 164), (885, 172)]
ay = np.array([p[0] for p in ANCHORS], np.float32)
ah = np.array([p[1] for p in ANCHORS], np.float32)
half = np.interp(np.arange(H, dtype=np.float32), ay, ah)

xs = np.arange(W, dtype=np.float32)[None, :]
dx = np.abs(xs - CX)
corridor = dx <= half[:, None]

# 最下層帆的尖端垂到 y≈870，界線要壓在它下面，否則那截帆會被誤歸進 hull（不會甩）
CLOTH_END = 885                  # 此列以下沒有帆布 → 全歸 hull/螺旋槳
below = np.zeros((H, W), bool); below[CLOTH_END:, :] = True

# ── 螺旋槳葉片：y 1148..1258，扣掉每列中央那一段 ────────────────────
PROP_Y0, PROP_Y1 = 1148, 1259
central = np.zeros((H, W), bool)
for y in range(PROP_Y0, min(PROP_Y1, H)):
    r = op[y]
    if not r[int(CX)]:
        continue
    x0 = int(CX)
    while x0 > 0 and r[x0 - 1]: x0 -= 1
    x1 = int(CX)
    while x1 < W - 1 and r[x1 + 1]: x1 += 1
    central[y, x0:x1 + 1] = True
propband = np.zeros((H, W), bool); propband[PROP_Y0:PROP_Y1, :] = True
prop_all = op & propband & ~central
prop_l = prop_all & (xs < CX)
prop_r = prop_all & (xs >= CX)

# ── 船體：走廊內 ∪ 帆布結束線以下，扣掉葉片；再外擴 6px 做重疊帶 ────
hull_core = op & (corridor | below) & ~prop_all
grow = corridor.copy()
for _ in range(6):
    g = grow.copy()
    g[:, 1:] |= grow[:, :-1]; g[:, :-1] |= grow[:, 1:]
    g[1:, :] |= grow[:-1, :]; g[:-1, :] |= grow[1:, :]
    grow = g
hull = op & (grow | below) & ~prop_all

# ── 三層帆：走廊外、帆布結束線以上，依 y 分帶 ──────────────────────
outside = op & ~corridor & ~below
bands = {'sails_fore': (0, 258), 'sails_main': (258, 455), 'sails_aft': (455, CLOTH_END)}

import os
os.makedirs(DST, exist_ok=True)

def emit(name, mask):
    out = src.copy()
    out[..., 3] = (al * mask).astype(np.uint8)
    ys, xx = np.where(mask & op)
    if not ys.size:
        print("  %-11s  (空，略過)" % name); return None
    img = Image.fromarray(out).resize((OUT_W, round(H * OUT_W / W)), Image.LANCZOS)
    img.save(os.path.join(DST, name + ".png"), optimize=True)
    # 重心（給 pivot 用）
    w = al[ys, xx].astype(np.float32)
    cx, cy = (xx * w).sum() / w.sum(), (ys * w).sum() / w.sum()
    kb = os.path.getsize(os.path.join(DST, name + ".png")) / 1024
    print("  %-11s  bbox x %4d..%-4d y %4d..%-4d  重心(%.3f, %.3f)  %6.1f KB"
          % (name, xx.min(), xx.max(), ys.min(), ys.max(), cx / W, cy / H, kb))
    return cx / W, cy / H

print("輸出 %d×%d → %s\n" % (OUT_W, round(H * OUT_W / W), DST))
piv = {}
piv['hull'] = emit('hull', hull)
for k, (y0, y1) in bands.items():
    m = outside.copy(); m[:y0, :] = False; m[y1:, :] = False
    piv[k] = emit(k, m)
piv['prop_l'] = emit('prop_l', prop_l)
piv['prop_r'] = emit('prop_r', prop_r)

print("\n貼進 SHIP_VISUAL 的 artPivot：")
for k in ('prop_l', 'prop_r', 'hull', 'sails_aft', 'sails_main', 'sails_fore'):
    if piv.get(k):
        print("    %-11s artPivot:{x:%.3f,y:%.3f}" % (k, piv[k][0], piv[k][1]))
