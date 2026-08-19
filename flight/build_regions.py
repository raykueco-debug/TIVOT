# -*- coding: utf-8 -*-
"""從 Reference/region.png 抽出國界，輸出執行期用的查表。

▍為什麼抽得出來
region.png 是**疊在 silvermoon_sheet.png 上**畫的，兩張同尺寸，所以疊色是線性的：
    region = sheet×(1-k) + C×k
解出 k 之後，`region - sheet×(1-k)` 在同一國之內就是定值（每國一個 C×k）。
實測 k=0.40 時，前 14 群涵蓋 77.2% 的覆蓋像素（其餘是邊界、標籤文字、湖與河線）。

▍為什麼還要連通標記
光靠顏色分不出 11 國 —— 有兩組金、兩組綠、兩組藍，k-means 會把它們併起來
（實測瓦爾士與薩梅爾同色、法爾登與達爾馬提亞同色）。但同色的國在空間上是分開的，
所以逐色群再做連通標記就拆得開。實測拆出 12 塊：11 國 ＋ 1 個高山頂大湖的圓。

▍輸出
  region_map.png   半解析度(1076x600)的索引圖，每像素一個國家編號（0=無主/雲海）
  region_map.json  編號 → 名稱

用法：  py flight/build_regions.py
"""
import io
import json
import os

import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
K_MIX = 0.40          # 疊色的 alpha（見檔頭）
N_CLUSTER = 16
MIN_AREA = 9000       # 小於這個面積不算一國
SEA_GREY = 44 / 520 * 255

# 國名錨點：從 region.png 的標籤位置讀出來的（地圖像素）。
# ⚠ 這是**人讀的**，不是 OCR —— 標籤是燒進圖裡的文字，沒有可靠的自動來源。
#   改了 region.png 的國界不用動這裡；改了國名或新增國家才要。
ANCHORS = [
    ('薩梅爾帝國',     'Samael Empire',              1154, 709),
    ('瓦爾士大公國',   'Grand Duchy of Vals',        1589, 228),
    ('阿斯佩里亞王國', 'Kingdom of Asperia',          365, 436),
    ('東埃爾比斯公國', 'Principality of East Elbis',  923, 312),
    ('埃爾比斯王國',   'Kingdom of Elbis',            620, 260),
    ('達爾馬提亞王國', 'Kingdom of Dalmaria',         612, 677),
    ('澤維利亞王國',   'Kingdom of Zevelia',         1835, 588),
    ('瓦爾德尼亞王國', 'Kingdom of Valdenia',        1661, 691),
    ('恩雅王國',       'Kingdom of Enya',             369, 777),
    ('法爾登王國',     'Kingdom of Falden',          1266, 375),
    ('馬爾維恩王國',   'Kingdom of Malvien',         1553, 428),
]


def main():
    reg = np.asarray(Image.open(os.path.join(HERE, 'Reference/region.png'))
                     .convert('RGB')).astype(np.float32)
    sheet = np.asarray(Image.open(os.path.join(HERE, 'silvermoon_sheet.png'))
                       .convert('RGB')).astype(np.float32)
    hgt = np.asarray(Image.open(os.path.join(HERE, 'silvermoon_heightmap.png'))
                     .convert('L')).astype(np.float32)
    if reg.shape != sheet.shape:
        raise SystemExit('region.png 與 silvermoon_sheet.png 尺寸不同，無法差分。'
                         '請用同一張 sheet 重畫，或先跑 map_sheet.py。')
    H, W = reg.shape[:2]
    land = hgt > SEA_GREY

    diff = np.abs(reg - sheet).max(axis=2)
    covered = (diff > 12) & land
    Ck = (reg - sheet * (1 - K_MIX)).reshape(-1, 3).astype(np.float32)
    Z = Ck[covered.reshape(-1)]
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 1.0)
    _, lab, _ = cv2.kmeans(Z, N_CLUSTER, None, crit, 6, cv2.KMEANS_PP_CENTERS)
    full = np.full(H * W, -1, np.int32)
    full[covered.reshape(-1)] = lab.ravel()
    full = full.reshape(H, W)

    cands = []
    for i in range(N_CLUSTER):
        mm = cv2.morphologyEx((full == i).astype(np.uint8), cv2.MORPH_CLOSE,
                              np.ones((9, 9), np.uint8))
        n, cc, st, cen = cv2.connectedComponentsWithStats(mm, 8)
        for j in range(1, n):
            if st[j, cv2.CC_STAT_AREA] < MIN_AREA:
                continue
            cands.append((int(st[j, cv2.CC_STAT_AREA]), cc == j,
                          float(cen[j][0]), float(cen[j][1])))
    cands.sort(reverse=True, key=lambda c: c[0])
    print('連通標記後的候選 %d 塊' % len(cands))

    # 每個錨點認領最近的候選（一塊只能被認領一次）
    idx = np.zeros((H, W), np.uint8)
    names = [{'id': 0, 'zh': '無主之地', 'en': ''}]
    used = set()
    for k, (zh, en, ax, ay) in enumerate(ANCHORS, start=1):
        best, bi = None, -1
        for ci, (ar, mask, cx, cy) in enumerate(cands):
            if ci in used:
                continue
            dd = (cx - ax) ** 2 + (cy - ay) ** 2
            if best is None or dd < best:
                best, bi = dd, ci
        if bi < 0:
            print('  ⚠ %s 找不到對應的區塊' % zh)
            continue
        used.add(bi)
        ar, mask, cx, cy = cands[bi]
        idx[mask] = k
        names.append({'id': k, 'zh': zh, 'en': en})
        print('  %2d %-16s %7d px  中心(%4.0f,%4.0f)  離錨點 %.0f px'
              % (k, zh, ar, cx, cy, best ** 0.5))
    for ci, (ar, mask, cx, cy) in enumerate(cands):
        if ci not in used:
            print('  · 未認領的區塊 %7d px 中心(%4.0f,%4.0f)（多半是湖或標記，忽略）'
                  % (ar, cx, cy))

    # 未覆蓋的陸地：補成最近的國家（邊界抗鋸齒、標籤文字挖掉的洞）
    hole = land & (idx == 0)
    if hole.any():
        _, near = cv2.distanceTransformWithLabels(
            (idx == 0).astype(np.uint8), cv2.DIST_L2, 3,
            labelType=cv2.DIST_LABEL_PIXEL)
        ys, xs = np.where(idx > 0)
        lut = np.zeros(near.max() + 1, np.uint8)
        lab0 = near[idx > 0]
        lut[lab0] = idx[idx > 0]
        filled = lut[near]
        idx[hole] = filled[hole]
        print('補洞：陸地上未覆蓋 %d px → 併入最近的國家' % hole.sum())

    idx[~land] = 0
    for n in names[1:]:
        n['px'] = int((idx == n['id']).sum())
    print()
    print('最終覆蓋：陸地 %d px，已歸屬 %.1f%%'
          % (land.sum(), 100.0 * (idx[land] > 0).mean()))

    # 半解析度輸出就夠：1 像素 = 2 地圖像素 = 40 世界單位
    small = Image.fromarray(idx).resize((W // 2, H // 2), Image.NEAREST)
    small.save(os.path.join(HERE, 'region_map.png'))
    json.dump({'w': W // 2, 'h': H // 2, 'mapW': W, 'mapH': H, 'regions': names},
              io.open(os.path.join(HERE, 'region_map.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print('→ region_map.png %dx%d   region_map.json（%d 國）'
          % (small.width, small.height, len(names) - 1))


if __name__ == '__main__':
    main()
