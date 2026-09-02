# -*- coding: utf-8 -*-
"""
出一張「規劃用」的大陸總覽：地貌色 + 座標網格 + 現有地標 + 高度圖縮圖。

用途：要加地形／城鎮時，先在這張圖上讀出地圖像素座標，再回去改兩張來源圖
      （silvermoon_heightmap.png / silvermoon_terrain.png）與 index.html 的 PLACES。
      這張圖本身**不會**被遊戲讀取，純參考。

跑法：python flight/export_mapref.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
HEIGHT = os.path.join(HERE, "silvermoon_heightmap.png")
COLOR  = os.path.join(HERE, "silvermoon_terrain.png")
OUT    = os.path.join(HERE, "map_reference.png")

# 與 index.html 的 PLACES 同步（座標＝地圖像素）
# ⚠ ver -313 整組對回 index.html：
#   · 帝都與聖王廳原本併成一筆，實際是兩座城（1005,600 / 934,606）。
#   · 薇拉馮德港的 (1310,965) 是**已知錯的**舊值（落在海上，且與 SETTLEMENTS
#     差 60px，地圖上城與名牌會分家）—— index.html 早就改成 (1366,936)。
#   · 北方泊地由 (1000,300) 移到 (1496,160)（Ray 在現場指定）。
# ⚠ ver -734：北方泊地對回 (1516,150)（-444 城的插畫落地座標，index.html 已改）；
#   加 (1094,808) 的無名村落（ver -733，Ray：「備著」）。
PLACES = [
    (1005, 600, "帝都",         "教廷・中樞"),
    (934,  606, "聖王廳",       "教廷・聖座"),
    (1366, 936, "薇拉馮德港",   "帝國・港灣"),
    (985,  858, "卡耶爾山谷",   "險地"),
    (1516, 150, "北方泊地",     "泊地"),
    (2030, 590, "東方泊地",     "泊地"),
    (1094, 808, "村落",         "聚落・未命名（備用）"),
    # ver -735（Ray 指定）：兩座國都的預定地，城還沒建 —— 只在參考圖上標。
    (420,  764, "羅賽爾都城",   "國都・預定地"),
    (295,  979, "阿斯佩里亞聯合王國國都", "國都・預定地（臨岸）"),
]

GRID      = 100        # 網格間距（地圖像素）
GRID_MAJOR= 500        # 粗線間距
CLOUD_H   = 44         # 與 index.html 同值
PEAK_SCALE= 520
GOLD  = (201, 162, 39)
PARCH = (232, 224, 205)


def load_font(size):
    # Windows 與 macOS 的 CJK 字型都試（ver -734：這支現在也在 mac 上跑）
    cands = [os.path.join(r"C:\Windows\Fonts", n)
             for n in ("msjh.ttc", "msyh.ttc", "simhei.ttf", "mingliu.ttc")]
    cands += ["/System/Library/Fonts/PingFang.ttc",
              "/System/Library/Fonts/STHeiti Medium.ttc",
              "/System/Library/Fonts/Hiragino Sans GB.ttc"]
    for path in cands:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


col = Image.open(COLOR).convert("RGB")
hgt = Image.open(HEIGHT).convert("L")
W, H = col.size
if hgt.size != (W, H):
    raise SystemExit(f"兩張圖尺寸不一致：{col.size} vs {hgt.size}")

PAD_T, PAD_L, PAD_B = 78, 60, 250       # 上：標題　左：座標　下：高度圖＋圖例
THUMB_H = 150                            # 高度圖縮圖高度
sheet = Image.new("RGB", (W + PAD_L + 20, H + PAD_T + PAD_B), (14, 15, 22))
sheet.paste(col, (PAD_L, PAD_T))
d = ImageDraw.Draw(sheet, "RGBA")
f_small, f_mid, f_big = load_font(15), load_font(19), load_font(26)

# ── 網格 ───────────────────────────────────────────────────────────
for x in range(0, W + 1, GRID):
    major = x % GRID_MAJOR == 0
    d.line([(PAD_L + x, PAD_T), (PAD_L + x, PAD_T + H)],
           fill=(255, 255, 255, 70 if major else 28), width=2 if major else 1)
    if major:
        d.text((PAD_L + x + 3, PAD_T - 22), str(x), font=f_small, fill=PARCH)
for y in range(0, H + 1, GRID):
    major = y % GRID_MAJOR == 0
    d.line([(PAD_L, PAD_T + y), (PAD_L + W, PAD_T + y)],
           fill=(255, 255, 255, 70 if major else 28), width=2 if major else 1)
    if major:
        d.text((6, PAD_T + y - 8), str(y), font=f_small, fill=PARCH)

# ── 國界與國名（ver -734，Ray：「flight reference 也要更新」）──────────
# ⚠ 名字與界線讀 **runtime 的 region_map.json/png**（鐵律 7：真相只有那一份，
#   這裡不另抄國名表）。Reference/region.png 上燒的舊國名不再是依據。
import json as _json
import numpy as _np
_rj = _json.load(open(os.path.join(HERE, "region_map.json"), encoding="utf-8"))
_rm = _np.array(Image.open(os.path.join(HERE, "region_map.png")))
_rmU = _np.kron(_rm, _np.ones((2, 2), dtype=_rm.dtype))[:H, :W]     # 半解析 → 全解析
_edge = _np.zeros_like(_rmU, dtype=bool)
_edge[:-1, :] |= _rmU[:-1, :] != _rmU[1:, :]
_edge[:, :-1] |= _rmU[:, :-1] != _rmU[:, 1:]
_ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
_ovpx = _np.array(_ov)
_ovpx[_edge] = (255, 90, 90, 170)
sheet.paste(Image.fromarray(_ovpx), (PAD_L, PAD_T), Image.fromarray(_ovpx))
for _r in _rj["regions"]:
    if _r["id"] == 0:
        continue
    _ys, _xs = _np.where(_rmU == _r["id"])
    if not len(_xs):
        continue
    _cx, _cy = PAD_L + int(_xs.mean()), PAD_T + int(_ys.mean())
    _zh, _en = _r["zh"], _r.get("en", "")
    _tw = max(d.textlength(_zh, font=f_big), d.textlength(_en, font=f_small))
    d.rectangle([_cx - _tw / 2 - 8, _cy - 22, _cx + _tw / 2 + 8, _cy + 24],
                fill=(8, 9, 14, 150))
    d.text((_cx - d.textlength(_zh, font=f_big) / 2, _cy - 20), _zh,
           font=f_big, fill=(240, 232, 210))
    if _en:
        d.text((_cx - d.textlength(_en, font=f_small) / 2, _cy + 8), _en,
               font=f_small, fill=(200, 195, 180))

# ── 地標 ───────────────────────────────────────────────────────────
for px, py, name, kind in PLACES:
    cx, cy = PAD_L + px, PAD_T + py
    d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], outline=GOLD, width=3)
    d.line([(cx - 16, cy), (cx - 10, cy)], fill=GOLD, width=3)
    d.line([(cx + 10, cy), (cx + 16, cy)], fill=GOLD, width=3)
    label = f"{name}  ({px},{py})"
    tw = max(d.textlength(label, font=f_mid), d.textlength(kind, font=f_small))
    bx, by = cx + 22, cy - 24
    if bx + tw > PAD_L + W:                       # 靠右邊界就翻到左側
        bx = cx - 22 - tw
    d.rectangle([bx - 7, by - 5, bx + tw + 7, by + 46], fill=(8, 9, 14, 220), outline=GOLD)
    d.text((bx, by), label, font=f_mid, fill=GOLD)
    d.text((bx, by + 25), kind, font=f_small, fill=(*PARCH, 180))

d.text((PAD_L, 20), f"銀月大陸 — 地圖參考　{W}×{H} 地圖像素　"
                    f"（世界 {W*20}×{H*20}，MAP_SCALE=20）", font=f_big, fill=GOLD)

# ── 下方：高度圖縮圖 + 圖例 ────────────────────────────────────────
th = THUMB_H
tw_ = int(W / H * th)
sheet.paste(hgt.convert("RGB").resize((tw_, th), Image.LANCZOS), (PAD_L, PAD_T + H + 16))
d.rectangle([PAD_L, PAD_T + H + 16, PAD_L + tw_, PAD_T + H + 16 + th], outline=(90, 95, 110))
d.text((PAD_L, PAD_T + H + 16 + th + 4), "高度圖（灰階）", font=f_small, fill=PARCH)

lx = PAD_L + tw_ + 34
cloud_gray = round(CLOUD_H / PEAK_SCALE * 255)
rim_gray   = round(145 / PEAK_SCALE * 255)
legend = [
    ("要改的是這兩張，尺寸必須一致：", GOLD),
    (f"  silvermoon_heightmap.png  灰階＝高度，255 → 世界高 {PEAK_SCALE}", PARCH),
    (f"  silvermoon_terrain.png    地貌色（反照率），只影響外觀", PARCH),
    ("", PARCH),
    (f"灰階 ≤ {cloud_gray} → 雲海（大陸之外）；> {cloud_gray} 才是陸地", PARCH),
    (f"距雲海 34 像素內、灰階 < {rim_gray} 的陸地會被墊到 {rim_gray} → 邊緣斷崖", PARCH),
    (f"巡航高度 700 對應灰階 {round(700/PEAK_SCALE*255)}；峰頂請低於此值否則會撞山", PARCH),
    ("河流靠地貌色偵測：藍明顯高於紅（b>r+16 且 b>g+4 且 70<b<200）", PARCH),
    ("  基準色 RGB(88,116,132)。河道走到邊緣斷崖處會自動變成瀑布。", PARCH),
    ("城鎮／地標：改 index.html 的 PLACES，座標就是這張圖的網格值。", GOLD),
]
for i, (t, c) in enumerate(legend):
    d.text((lx, PAD_T + H + 18 + i * 22), t, font=f_mid if i in (0, 9) else f_small, fill=c)

sheet.save(OUT)
print(f"→ {OUT}  {sheet.size[0]}×{sheet.size[1]}")
