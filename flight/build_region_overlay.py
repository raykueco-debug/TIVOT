# -*- coding: utf-8 -*-
"""出「國界劃分圖」—— Reference/region.png 的**替代候選**（ver -735，Ray：
「出一張清楚畫分國界的圖，我看過正確就取代舊的 region」）。

⚠⚠ 合成法必須與舊 region.png 相同：`sheet×(1-K_MIX) + 國色×K_MIX`（K_MIX=0.40，
   見 build_regions.py 檔頭）—— 這樣核可之後把它放進 Reference/region.png，
   build_regions.py 的線性差分抽取**照跑不用改**。
⚠ 島群不在 silvermoon_sheet 上（那張是舊地形的成品圖）：島的底改鋪
   silvermoon_terrain 的實地色再疊國色。抽取端不受影響 —— 島本來就不走
   色彩抽取，走 ISLAND_REGIONS 的幾何劃界（見 build_regions.py）。
⚠ 國界、國名、國色全部讀 **runtime 的 region_map.json/png**（鐵律 7）。
   標籤文字會污染抽取的那幾個像素 —— 舊圖也一樣，補洞那一步會收拾。

輸出：flight/region_overlay.png（審閱用；核可後由人搬進 Reference/region.png，
      搬之前照規矩先 tools/recycle.sh 舊圖）。
用法：py flight/build_region_overlay.py
"""
import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
K_MIX = 0.40

# 13 國各給一個「線性混色後仍分得開」的平色（k-means 抽取要靠它們互相遠離）。
# id → RGB。0（無主）不上色。
REGION_COLORS = {
    1:  (196,  74,  74),   # 薩梅爾帝國
    2:  (222, 158,  62),   # 瓦爾士大公國
    3:  ( 96, 156, 219),   # 伊斯維亞王國
    4:  (105, 199, 155),   # 諾爾維亞王國
    5:  ( 68, 116, 196),   # 埃爾比斯王國
    6:  (176,  96, 196),   # 瓦勒里亞王國
    7:  (219, 199,  76),   # 澤維利亞王國
    8:  ( 88, 176,  70),   # 瓦爾德尼亞王國
    9:  (219, 108, 158),   # 羅賽爾王國
    10: (140, 116,  76),   # 法爾登王國
    11: ( 76, 190, 199),   # 馬爾維恩王國
    12: (232, 232, 148),   # 埃蘭王國
    13: (120,  92, 199),   # 阿斯佩里亞聯合王國
}
# 國都（ver -735，Ray 指定；與 export_mapref.py 的 PLACES 互指）
CAPITALS = [(9, '羅賽爾都城', 420, 764), (13, '阿斯佩里亞聯合王國國都', 295, 979)]
# 標籤位置：本土沿用 build_regions.py 的錨點（那是舊圖標籤的家）；島群與
# 羅賽爾另指（羅賽爾錨點在改劃後太靠海）。沒列的用區域重心。
LABEL_AT = {1: (1154, 709), 2: (1589, 228), 3: (365, 436), 4: (923, 312),
            5: (620, 260), 6: (612, 677), 7: (1835, 588), 8: (1661, 691),
            9: (330, 790), 10: (1266, 375), 11: (1553, 428),
            12: (105, 590), 13: (250, 1030)}


def load_font(size):
    for path in ([os.path.join(r"C:\Windows\Fonts", n)
                  for n in ("msjh.ttc", "msyh.ttc", "simhei.ttf")]
                 + ["/System/Library/Fonts/PingFang.ttc",
                    "/System/Library/Fonts/STHeiti Medium.ttc"]):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    sheet = np.asarray(Image.open(os.path.join(HERE, 'silvermoon_sheet.png'))
                       .convert('RGB')).astype(np.float64)
    terr = np.asarray(Image.open(os.path.join(HERE, 'silvermoon_terrain.png'))
                      .convert('RGB')).astype(np.float64)
    hgt = np.asarray(Image.open(os.path.join(HERE, 'silvermoon_heightmap.png'))
                     .convert('L'))
    J = json.load(open(os.path.join(HERE, 'region_map.json'), encoding='utf-8'))
    rm = np.asarray(Image.open(os.path.join(HERE, 'region_map.png')))
    H, W = hgt.shape
    rmU = np.kron(rm, np.ones((2, 2), dtype=rm.dtype))[:H, :W]

    # 底：sheet；島群那幾塊 sheet 上是海 → 換鋪實地色（見檔頭）
    base = sheet.copy()
    # 「sheet 上是海」直接用 rmU 的島 id 判：12/13 兩國整片都不在 sheet 上
    isl = np.isin(rmU, [12, 13])
    base[isl] = terr[isl]

    out = base.copy()
    for rid, c in REGION_COLORS.items():
        m = rmU == rid
        out[m] = base[m] * (1 - K_MIX) + np.array(c, dtype=np.float64) * K_MIX

    # 國界描邊（深色細線，看得清楚但蓋不掉底色）
    edge = np.zeros((H, W), dtype=bool)
    edge[:-1, :] |= rmU[:-1, :] != rmU[1:, :]
    edge[:, :-1] |= rmU[:, :-1] != rmU[:, 1:]
    out[edge] = out[edge] * 0.35

    im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    f_zh, f_en = load_font(30), load_font(16)
    for r in J['regions']:
        rid = r['id']
        if rid == 0:
            continue
        if rid in LABEL_AT:
            cx, cy = LABEL_AT[rid]
        else:
            ys, xs = np.where(rmU == rid)
            if not len(xs):
                continue
            cx, cy = int(xs.mean()), int(ys.mean())
        zh, en = r['zh'], r.get('en', '')
        for dx in (-2, 0, 2):
            for dy in (-2, 0, 2):
                d.text((cx - d.textlength(zh, font=f_zh) / 2 + dx, cy - 20 + dy),
                       zh, font=f_zh, fill=(10, 10, 14))
        d.text((cx - d.textlength(zh, font=f_zh) / 2, cy - 20), zh,
               font=f_zh, fill=(255, 252, 240))
        if en:
            d.text((cx - d.textlength(en, font=f_en) / 2, cy + 16), en,
                   font=f_en, fill=(235, 230, 214))
    for rid, name, x, y in CAPITALS:
        d.ellipse([x - 7, y - 7, x + 7, y + 7], outline=(255, 240, 120), width=3)
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(255, 240, 120))
        d.text((x + 12, y - 10), '★ ' + name + f' ({x},{y})',
               font=f_en, fill=(255, 240, 120), stroke_width=2, stroke_fill=(10, 10, 14))

    outp = os.path.join(HERE, 'region_overlay.png')
    im.save(outp)
    print('→', outp, im.size)


if __name__ == '__main__':
    main()
