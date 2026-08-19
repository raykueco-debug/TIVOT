#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_starpoints.py — 從地形挑出 ~40 個「地形特殊」的隱藏點，輸出 starpoints.json

  py flight/build_starpoints.py            出點位 + 預覽圖
  py flight/build_starpoints.py --n 48     改點數

⚠ 座標單位是**地圖像素**，與 SETTLEMENTS／PLACES 同一套（世界座標 = ×MAP_SCALE）。

挑法：先算五張「特殊度」分數場，各自取最強的那些，再用貪婪法加最小間距挑滿，
最後強制把獨立小島補進去（小島是天然的隱藏點，分數場不一定選得到那麼多）。
分散度靠 MIN_SEP 保證，不靠分數 —— 只照分數挑會全部擠在同一條山脈上。
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
HEIGHT = os.path.join(HERE, 'silvermoon_heightmap.png')
TERRAIN = os.path.join(HERE, 'silvermoon_terrain.png')
SHEET = os.path.join(HERE, 'silvermoon_sheet.png')          # 預覽底圖（可有可無）
OUT = os.path.join(HERE, 'starpoints.json')
PREVIEW = os.path.join(HERE, 'starpoints_preview.png')

# ⚠ 這兩個必須與 index.html 一致：CLOUD_H=44、PEAK_SCALE=520
CLOUD_H, PEAK_SCALE = 44, 520
SEA = CLOUD_H / PEAK_SCALE * 255
MAP_SCALE = 20

N_WANT = 40
MIN_SEP = 118          # 點與點的最小間距（地圖像素）。平均間距約 178，
                       # 取 2/3 讓它能貼著地形走又不會擠成一團。
CLEAR_PLACE = 70       # 離既有地標／城至少這麼遠（它們已經有自己的標記）

# 既有地標（index.html 的 PLACES + SETTLEMENTS），要避開
KNOWN = [(1005,600),(934,606),(1366,936),(985,858),(1000,300),(2030,590),(559,562)]


def norm(a, lo=1, hi=99):
    """把分數壓到 0..1，用百分位裁掉離群值——不裁的話單一個極端值會把整張圖壓平。"""
    a = a.astype(np.float32)
    p1, p9 = np.percentile(a, lo), np.percentile(a, hi)
    if p9 <= p1: return np.zeros_like(a)
    return np.clip((a - p1) / (p9 - p1), 0, 1)


def main():
    n_want = N_WANT
    if '--n' in sys.argv: n_want = int(sys.argv[sys.argv.index('--n') + 1])

    H = np.asarray(Image.open(HEIGHT).convert('L'), np.float32)
    C = np.asarray(Image.open(TERRAIN).convert('RGB'), np.float32)
    mh, mw = H.shape
    land = H > SEA
    print('地圖 %dx%d，陸地 %.1f%%' % (mw, mh, 100 * land.mean()))

    # ── 分數場 ────────────────────────────────────────────────────
    # ⚠ 全部只在陸地上算；海（雲海）是平的，任何梯度類的分數在岸邊都會爆掉。
    Hl = np.where(land, H, np.nan)

    # ① 起伏：15px 窗內的高差 —— 抓稜線、斷崖
    mx = ndi.maximum_filter(H, 15); mn = ndi.minimum_filter(H, 15)
    relief = norm(np.where(land, mx - mn, 0))

    # ② 孤峰：自身高度減掉半徑 40 的環最大值。正值＝這一帶最高的那一點。
    ring = ndi.maximum_filter(H, 81)
    prom = norm(np.where(land, H - ring + 1e-3, -1))
    peak = prom * norm(np.where(land, H, 0))

    # ③ 盆地／窪：反過來，被高地圍住的低點
    ring_min = ndi.minimum_filter(H, 81)
    basin = norm(np.where(land, ring_min - H + 1e-3, -1)) * relief

    # ④ 岬角／半島：周圍陸地比例低＝伸進雲海的細長地形
    frac = ndi.uniform_filter(land.astype(np.float32), 41)
    cape = np.where(land, np.clip(1 - frac / 0.55, 0, 1), 0)

    # ⑤ 水域：河／湖（地表色偏藍）。河口與湖畔是好點位。
    R, G, B = C[:,:,0], C[:,:,1], C[:,:,2]
    water = (B > R + 14) & (B > 90) & land
    near_water = ndi.uniform_filter(water.astype(np.float32), 25)
    wet = np.clip(near_water * 6, 0, 1) * (0.4 + 0.6 * relief)

    # ⚠ 「高於雲海」不等於「內陸」。第一版的谷／水有一半挑在灰階 47~63，
    #   那是雲海上緣的平坦灘地 —— 分數算對了（周圍確實比較高、附近確實有水），
    #   但飛過去看到的是一片平地，不是特殊地形。谷與水都要壓在內陸；
    #   崖則要往**崖頂**挑，不然點會落在崖腳，鏡頭裡只剩一面牆。
    inland = np.clip((H - 70) / 60.0, 0, 1)          # 灰階 70 起算＝世界高度 143
    basin = basin * inland
    wet = wet * inland
    relief = relief * (0.45 + 0.55 * norm(np.where(land, H, 0)))

    kinds = [('峰', peak, 1.00), ('崖', relief, 0.72), ('谷', basin, 0.92),
             ('岬', cape, 0.80), ('水', wet, 0.85)]

    # ── 候選：每張分數場各取局部極大 ───────────────────────────────
    cands = []
    for name, S, w in kinds:
        S = np.where(land, S, 0)
        loc = ndi.maximum_filter(S, 45)
        pk = (S >= loc - 1e-6) & (S > 0.45)
        ys, xs = np.where(pk)
        for y, x in zip(ys, xs):
            cands.append((float(S[y, x] * w), int(x), int(y), name))
    # ⚠ 不能把五類混在一起照分數排：各分數場的絕對值差很多，最密最高的那一張
    #   （起伏／崖）會把名額整碗端走 —— 實測第一版挑出 34 個全是「崖」。
    #   改成**每類各自排序、輪流取**，變化度就由挑法保證，不靠調權重。
    by_kind = {}
    for score, x, y, kind in cands:
        by_kind.setdefault(kind, []).append((score, x, y, kind))
    for k in by_kind: by_kind[k].sort(key=lambda t: -t[0])
    print('候選 %d 個（%s）' % (len(cands),
          '、'.join('%s%d' % (k, len(v)) for k, v in by_kind.items())))

    # ── 先把獨立小島放進去（天然的隱藏點）──────────────────────────
    lab, nlab = ndi.label(land)
    sizes = ndi.sum(land, lab, range(1, nlab + 1))
    main_id = int(np.argmax(sizes)) + 1
    picked = []
    for i in range(1, nlab + 1):
        if i == main_id or sizes[i-1] < 60: continue
        ys, xs = np.where(lab == i)
        # 島的最高點，不是形心 —— 形心可能落在水裡（環礁狀的島）
        k = int(np.argmax(H[ys, xs]))
        picked.append({'x': int(xs[k]), 'y': int(ys[k]), 'kind': '島'})
    print('獨立小島 %d 座（全部收錄）' % len(picked))

    def ok(x, y):
        for p in picked:
            if (p['x']-x)**2 + (p['y']-y)**2 < MIN_SEP**2: return False
        for kx, ky in KNOWN:
            if (kx-x)**2 + (ky-y)**2 < CLEAR_PLACE**2: return False
        return True

    order = [k for k, _, _ in kinds]
    cursor = {k: 0 for k in order}
    turn = 0
    while len(picked) < n_want and any(cursor[k] < len(by_kind.get(k, [])) for k in order):
        k = order[turn % len(order)]; turn += 1
        lst = by_kind.get(k, [])
        while cursor[k] < len(lst):
            score, x, y, kind = lst[cursor[k]]; cursor[k] += 1
            if ok(x, y):
                picked.append({'x': x, 'y': y, 'kind': kind}); break

    # 還不夠就放寬間距再掃一輪（地形太集中時會發生）
    sep = MIN_SEP
    while len(picked) < n_want and sep > 55:
        sep = int(sep * 0.85)
        for k in order:
            for score, x, y, kind in by_kind.get(k, []):
                if len(picked) >= n_want: break
                near = any((p['x']-x)**2 + (p['y']-y)**2 < sep**2 for p in picked)
                far = all((kx-x)**2 + (ky-y)**2 >= CLEAR_PLACE**2 for kx, ky in KNOWN)
                if not near and far: picked.append({'x': x, 'y': y, 'kind': kind})
    print('挑出 %d 點（最終最小間距 %d）' % (len(picked), sep))

    for i, p in enumerate(picked):
        p['id'] = 'sp%02d' % (i + 1)
        p['h'] = int(round(H[p['y'], p['x']] / 255 * PEAK_SCALE))

    from collections import Counter
    print('  類型分佈：' + '、'.join('%s×%d' % (k, v)
          for k, v in Counter(p['kind'] for p in picked).most_common()))
    d = [min(((a['x']-b['x'])**2 + (a['y']-b['y'])**2)**.5
             for b in picked if b is not a) for a in picked]
    print('  最近鄰間距 min/中位 = %.0f / %.0f 地圖像素（=%.0f / %.0f 世界單位）'
          % (min(d), np.median(d), min(d)*MAP_SCALE, np.median(d)*MAP_SCALE))

    json.dump({'mapScale': MAP_SCALE, 'points': picked},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('寫出 %s' % OUT)

    # ── 預覽 ──────────────────────────────────────────────────────
    base = Image.open(SHEET).convert('RGB') if os.path.exists(SHEET) \
           else Image.open(TERRAIN).convert('RGB')
    if base.size != (mw, mh): base = base.resize((mw, mh))
    dr = ImageDraw.Draw(base)
    for p in picked:
        x, y, r = p['x'], p['y'], 13
        dr.ellipse([x-r, y-r, x+r, y+r], outline=(255, 230, 60), width=4)
        dr.line([x-r-7, y, x+r+7, y], fill=(255, 230, 60), width=2)
        dr.line([x, y-r-7, x, y+r+7], fill=(255, 230, 60), width=2)
        dr.text((x+r+5, y-r-16), '%s %s' % (p['id'], p['kind']), fill=(255, 245, 170))
    for kx, ky in KNOWN:
        dr.ellipse([kx-9, ky-9, kx+9, ky+9], outline=(90, 200, 255), width=4)
    base.save(PREVIEW)
    print('預覽 %s' % PREVIEW)


main()
