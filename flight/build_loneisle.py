#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""孤舟島（ver -2225，Ray 指定 (2012,1150)：「把整座島依 background 畫村落地形」）。

世界觀（resources/background/loneisle/_spec.md）：雲海中的一座孤島，四面懸崖落進雲裡，
畫面上沒有海水；工匠村落（船匠、槍匠）。地形照那 13 張日景排：

    北端  雲海崖（cliff）—— 崖邊木欄，島的最北尖
    東北  引航燈塔（lighthouse）—— 坡頂石造燈塔，全島最高的小丘
    西北  工匠頭領之家（chief）／島緣荒地（wild，風蝕岩＋矮草）
    中央  島心廣場（plaza）—— 石鋪小廣場，北面往上坡（north）
    西    船匠街（west）→ 船匠船台（slipway）懸在西崖外
    東    東坡（east）：旅舍、食堂、材料舖
    西南  槍匠工坊（gunsmith）

整座島是一塊**往北抬升的高台**：南緣最低、往北一路上坡（north 那一格就是上坡路），
東北再隆起一個燈塔丘；四周一律是陡崖（崖腳直接是雲海，高度 0）。

▍為什麼是獨立一支、而不是加進 build_terrain.py
現行的 silvermoon_*.png **重跑 build_terrain.py 重現不出來**（實測差 60590 px —— 之後還有
別的修改直接蓋在輸出上）。所以這一支只動「島」那一小塊，其餘一個像素都不碰。

▍可重跑（冪等）
第一次跑時把那一塊的原狀存進 `_src/terrain/loneisle_before_{h,t}.png`，之後每次都先
**還原那一塊再重畫** —— 改參數重跑不會一層一層疊上去。
要整個拿掉：`python3 flight/build_loneisle.py --remove`。

用法：  python3 flight/build_loneisle.py [--remove]
跑完：  TERRAIN_V 自動 +1（同 build_terrain.py 的 bump_terrain_v）；再跑 `python3 tools/bust.py --bump`。
地表的量體（房屋／燈塔／船台）在 index.html 的 `RUIN_ART.loneisle`，⚠ 那邊的位置與這裡的
地形是同一組局部座標（1 地圖像素＝20 世界單位、原點＝島心 (2012,1150)）—— 改一邊要改另一邊。
"""
import argparse
import os
import re

import numpy as np
from PIL import Image
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_H = os.path.join(HERE, 'silvermoon_heightmap.png')
OUT_T = os.path.join(HERE, 'silvermoon_terrain.png')
SNAP_H = os.path.join(HERE, '_src/terrain/loneisle_before_h.png')
SNAP_T = os.path.join(HERE, '_src/terrain/loneisle_before_t.png')

CX, CY = 2012, 1150          # 島心（＝PLACES 那一筆、RUIN_ART.loneisle 的原點）
R = 40                       # 這一支能動的方框半徑（地圖像素）
X0, Y0 = CX - R, CY - R      # 方框左上
SEA_GREY = 44 / 520 * 255.0  # 21.6：雲海線（CLOUD_H / PEAK_SCALE）


def vnoise(shape, cell, seed):
    r = np.random.default_rng(seed)
    g = r.random((shape[0] // cell + 3, shape[1] // cell + 3)).astype(np.float32)
    big = cv2.resize(g, (g.shape[1] * cell, g.shape[0] * cell), interpolation=cv2.INTER_CUBIC)
    return big[:shape[0], :shape[1]].astype(np.float64)


def fbm(shape, cell, octaves, seed):
    out, amp, tot = np.zeros(shape), 1.0, 0.0
    for o in range(octaves):
        out += amp * vnoise(shape, max(2, cell >> o), seed + o)
        tot += amp
        amp *= 0.5
    return out / tot


def gauss(u, v, cx, cy, rx, ry):
    return np.exp(-(((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2))


def build(h, t):
    S = 2 * R + 1
    v, u = np.mgrid[0:S, 0:S].astype(np.float64)
    u -= R; v -= R                         # 局部座標：u 往東、v 往南（地圖像素）

    # ── 島的輪廓：一顆略扁的主體 ＋ 北尖（雲海崖）＋ 東北燈塔岬 ＋ 西側船台岬 ──
    f = gauss(u, v, 0, 2, 17, 14) \
        + 0.95 * gauss(u, v, -2, -17, 5, 6) \
        + 0.95 * gauss(u, v, 14, -12, 6, 5) \
        + 0.90 * gauss(u, v, -21, 1, 6, 3.2) \
        + 0.70 * gauss(u, v, -15, -11, 6, 5) \
        + 0.55 * gauss(u, v, 13, 6, 6, 5)
    # 海岸線的碎形感（崖線不是圓規畫的）
    wx = (fbm((S, S), 12, 3, 41) - 0.5) * 6
    wy = (fbm((S, S), 12, 3, 42) - 0.5) * 6
    f = cv2.remap(f.astype(np.float32), np.clip(u + R + wx, 0, S - 1).astype(np.float32),
                  np.clip(v + R + wy, 0, S - 1).astype(np.float32), cv2.INTER_LINEAR).astype(np.float64)
    isle = f > 0.50
    n, lab, st, _ = cv2.connectedComponentsWithStats(isle.astype(np.uint8), connectivity=8)
    if n > 2:
        isle = lab == (1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])))
    # 補洞：從方框邊緣灌水，灌不到的就是島裡的洞
    ff = (~isle).astype(np.uint8)
    cv2.floodFill(ff, None, (0, 0), 2)
    isle = ff != 2

    # ── 高度：往北抬升的高台 ＋ 燈塔丘 ＋ 西北荒地的起伏 ──
    # ⚠ 崖頂要遠高於雲海線（21.6）：這是一座**浮在雲上**的島，崖要讀得出來。
    din = cv2.distanceTransform(isle.astype(np.uint8), cv2.DIST_L2, 5).astype(np.float64)
    # ⚠⚠ 整座島（含崖緣）一律要高過引擎的海岸台地 RIM_H（145 世界單位＝灰階 71）：
    #   低於它的格子開機時會被**抬平成 145**（index.html 的 RIM_H），南半部就變成
    #   一圈平平的台地圍著島（第一版實測就是這樣，看起來像島外多一塊圓盤）。
    tilt = 100 + np.clip(-v, -20, 22) * 0.9           # 南緣 ~82、北端 ~120
    knoll = 26 * gauss(u, v, 13, -13, 4.5, 4.0)       # 燈塔丘
    rough = (fbm((S, S), 8, 3, 51) - 0.5) * 6         # 全島微起伏
    wild = (fbm((S, S), 4, 2, 61) - 0.5) * 14 * gauss(u, v, -15, -13, 6, 5)   # 西北荒地的風蝕岩
    hz = tilt + knoll + rough + wild
    # 廣場：中央一小塊整平（石鋪廣場要是平的）
    plaza = gauss(u, v, 0, 0, 4.0, 3.5)
    hz = hz * (1 - plaza) + 101 * plaza
    # 崖緣：最外 1.5 px 是崖面（直接落到雲海），往內 2 px 收一點點肩
    edge = np.clip((din - 0.5) / 2.0, 0, 1)
    hz = np.where(isle, 70 + (hz - 70) * (0.82 + 0.18 * edge), 0)

    # ── 地表色：草坡／石鋪村落／崖面岩／荒地 ──
    grass = np.array([104, 128, 72], float)
    grass2 = np.array([128, 140, 82], float)
    rock = np.array([138, 128, 112], float)
    pave = np.array([170, 152, 120], float)
    roofy = np.array([150, 104, 78], float)           # 屋群（紅瓦＋木屋，從空中看是一片暖褐）
    gn = fbm((S, S), 6, 3, 71)[..., None]
    col = grass * (1 - gn) + grass2 * gn
    # 村落：廣場＋西街＋東坡＋北坡，石鋪與屋群混著
    village = np.clip(1.25 * np.maximum.reduce([
        gauss(u, v, 0, 0, 7, 6),            # 廣場與一圈工坊
        gauss(u, v, -10, 1, 7, 3.5),        # 船匠街
        gauss(u, v, 10, 1, 7, 5),           # 東坡住家／旅舍／食堂
        gauss(u, v, -1, -8, 3.5, 6),        # 北坡上坡路
        gauss(u, v, -7, 9, 4, 3.5),         # 槍匠工坊
    ]), 0, 1)[..., None]
    vn = fbm((S, S), 3, 2, 81)[..., None]
    vcol = pave * (1 - vn) + roofy * vn
    col = col * (1 - village * 0.85) + vcol * village * 0.85
    # 荒地與燈塔丘頂：岩多草少
    rk = np.clip(1.4 * gauss(u, v, -15, -13, 6, 5) + 0.9 * gauss(u, v, 13, -13, 3.5, 3), 0, 1)[..., None]
    col = col * (1 - rk * 0.6) + rock * rk * 0.6
    # 崖緣一圈岩面
    cl = (1 - np.clip((din - 0.5) / 1.5, 0, 1))[..., None]
    col = col * (1 - cl * 0.55) + rock * cl * 0.55

    hb = h[Y0:Y0 + S, X0:X0 + S].astype(np.float64)
    tb = t[Y0:Y0 + S, X0:X0 + S].astype(np.float64)
    hb2 = np.where(isle, hz, hb)
    tb2 = np.where(isle[..., None], col, tb)
    h[Y0:Y0 + S, X0:X0 + S] = np.clip(hb2, 0, 255)
    t[Y0:Y0 + S, X0:X0 + S] = np.clip(tb2, 0, 255)

    land = isle
    print('島面積 %d px（約 %d×%d 世界單位）；高度 %d～%d（雲海線 %.1f）'
          % (int(land.sum()), int(np.ptp(np.where(land)[1]) + 1) * 20,
             int(np.ptp(np.where(land)[0]) + 1) * 20,
             int(hz[land].min()), int(hz[land].max()), SEA_GREY))
    ys, xs = np.where(land)
    print('外框（地圖像素）x %d～%d、y %d～%d' % (xs.min() + X0, xs.max() + X0, ys.min() + Y0, ys.max() + Y0))
    return h, t


def bump_terrain_v():
    """同 build_terrain.py 那一支：蓋掉兩張同名圖就把 TERRAIN_V 加一（§5）。"""
    p = os.path.join(HERE, 'index.html')
    s = open(p, encoding='utf-8').read()
    m = re.search(r"const TERRAIN_V\s*=\s*'\?v=(\d+)'", s)
    if not m:
        print('  ⚠ 找不到 TERRAIN_V，版本號沒跳 —— 瀏覽器會拿到舊的地形圖！')
        return
    n = int(m.group(1)) + 1
    s = s[:m.start()] + ("const TERRAIN_V  = '?v=%d'" % n) + s[m.end():]
    open(p, 'w', encoding='utf-8').write(s)
    print('  TERRAIN_V → ?v=%d' % n)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--remove', action='store_true', help='還原成沒有孤舟島的原狀')
    a = ap.parse_args()
    h = np.asarray(Image.open(OUT_H).convert('L')).copy()
    t = np.asarray(Image.open(OUT_T).convert('RGB')).copy()
    S = 2 * R + 1
    if not os.path.exists(SNAP_H):
        # ⚠ 安全檢查只在第一次（存原狀時）做：方框裡除了雲海不能有既有陸地 ——
        #   (1990~2020,1150) 原本有一撮 23~24 的殘渣（剛好高出雲線 1~2），那不算陸地。
        blk = h[Y0:Y0 + S, X0:X0 + S]
        assert (blk > 30).sum() == 0, '方框裡有既有陸地，不能直接蓋！'
        Image.fromarray(blk).save(SNAP_H)
        Image.fromarray(t[Y0:Y0 + S, X0:X0 + S]).save(SNAP_T)
        print('存原狀 →', os.path.relpath(SNAP_H, HERE))
    h[Y0:Y0 + S, X0:X0 + S] = np.asarray(Image.open(SNAP_H))
    t[Y0:Y0 + S, X0:X0 + S] = np.asarray(Image.open(SNAP_T))
    if not a.remove:
        h, t = build(h, t)
    Image.fromarray(h.astype(np.uint8), 'L').save(OUT_H)
    Image.fromarray(t.astype(np.uint8), 'RGB').save(OUT_T)
    bump_terrain_v()
    # 預覽（底線開頭，遊戲不載）
    pv = t[Y0:Y0 + S, X0:X0 + S].copy()
    pv[h[Y0:Y0 + S, X0:X0 + S] <= SEA_GREY] = [214, 222, 232]
    Image.fromarray(pv).resize((S * 6, S * 6), Image.NEAREST).save(os.path.join(HERE, '_loneisle_preview.png'))
    print('→ 兩張 silvermoon PNG 已更新；預覽 _loneisle_preview.png')


if __name__ == '__main__':
    main()
