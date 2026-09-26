#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/map_verafond_draft.py —— 薇拉馮德港（`verafond`）城鎮的**拓樸提案圖**

    python3 tools/map_verafond_draft.py

> Ray（2026-09-26）：「生成薇拉馮德城鎮拓樸 要有大教堂 碼頭 薇拉馮德莊園 沒有舊街區 舊街區是碼頭市集
>   該有的店全都要有 遊戲內的最大城鎮」

⚠⚠⚠ **提案階段的東西**（同其他 `map_*_draft.py`）：`script/town.js` 裡還沒有這座城，這一刻的唯一真相就是下面的
  `NODES`／`EDGES`。Ray 點頭之後 → 搬進 `script/town.js`、`map_layout.py` 的 `POS` 補一格、**把這支回收掉**。
⚠ 憲法 ver -907：拓樸是 Ray 的設計，這是提案。
⚠ 方位照飛行地圖上 Ray 的手繪平面圖（`flight/city/velafonte_plan.webp`）：西北山丘上的城堡＝莊園、正中大教堂、
  東南港灣、下半圓環廣場。`up`＝北＝列數變小。
⚠ 城鎮不是迷宮：同向直線上限放寬到 4（主大道本來就是直的；dunmor 那條 ≤2 是給迷宮的）。
輸出：`resources/map/_layout_verafond.png`
"""
import os, itertools
import _font
import _utf8  # noqa: F401
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NODES = {
 'harbor':(6,8,'碼頭','gate'),
 'lighthouse':(8,8,'燈塔防波堤','end'),
 'portmarket':(6,7,'碼頭市集','pass'),
 'customs':(8,7,'海關','pass'),
 'shipyard':(8,6,'造船廠','end'),
 'canalbridge':(6,6,'運河橋','pass'),
 'square':(4,6,'圓環廣場','pass'),
 'gunstore':(4,7,'武器店','end'),
 'craftrow':(2,6,'工匠街','pass'),
 'grocery':(0,6,'雜貨舖','end'),
 'guild':(2,7,'獵人公會','end'),
 'station':(2,5,'火車站','pass'),
 'inn':(0,5,'旅店','rest'),
 'midtown':(4,5,'中心區','pass'),
 'tavern':(6,5,'餐飲街','pass'),
 'restaurant':(8,5,'餐廳','end'),
 'cafe':(6,4,'咖啡廳','pass'),
 'bar':(8,4,'酒吧','pass'),
 'dessert':(8,3,'甜品店','end'),
 'cathedral':(4,4,'大教堂','pass'),
 'cityhall':(2,4,'市政廳','pass'),
 'avenue':(2,3,'林蔭大道','pass'),
 'university':(0,3,'大學','end'),
 'uptown':(2,2,'上城區','pass'),
 'opera':(4,2,'歌劇院','end'),
 'manorroad':(2,1,'莊園坡道','pass'),
 'manor':(0,1,'莊園','goal'),
}
EDGES = [
 ('harbor','lighthouse'),('harbor','portmarket'),('portmarket','customs'),('customs','shipyard'),
 ('portmarket','canalbridge'),('canalbridge','square'),('canalbridge','tavern'),
 ('square','gunstore'),('square','midtown'),('square','craftrow'),
 ('craftrow','grocery'),('craftrow','guild'),('craftrow','station'),('station','inn'),('station','midtown'),
 ('midtown','tavern'),('midtown','cathedral'),('tavern','restaurant'),('tavern','cafe'),('cafe','bar'),('bar','dessert'),
 ('cathedral','cityhall'),('cityhall','avenue'),('avenue','university'),('avenue','uptown'),
 ('uptown','opera'),('uptown','manorroad'),('manorroad','manor'),
]
REST_NOTE = '旅店'
CW, CH, BW, BH = 190, 134, 152, 116
PAD = 74
COL = {
    'pass': ((20, 20, 20),   (255,255,255), (150,150,150)),
    'end' : ((232,168, 56),  (255,255,255), (255,244,224)),
    'rest': (( 62,140, 92),  (255,255,255), (224,244,232)),
    'goal': ((176, 40, 48),  (255,255,255), (255,228,228)),
    'gate': ((255,255,255),  ( 20, 20, 20), ( 96, 96, 96)),
}
LINE = (20, 20, 20)
OPP = {'up':'down','down':'up','left':'right','right':'left'}

def main():
    deg, nb = {}, {}
    seen_e = set()
    for a, b in EDGES:
        assert a in NODES and b in NODES, (a, b)
        k = tuple(sorted((a, b))); assert k not in seen_e, ('重複的邊', a, b); seen_e.add(k)
        deg[a] = deg.get(a, 0) + 1; deg[b] = deg.get(b, 0) + 1
        (ac, ar), (bc, br) = NODES[a][:2], NODES[b][:2]
        if ac != bc and ar != br:
            raise SystemExit('✗ %s–%s 不同欄也不同列' % (a, b))
        # 穿格：中間不可以有別的格子
        for k2, v in NODES.items():
            if k2 in (a, b): continue
            c, r = v[:2]
            if ac == bc == c and min(ar, br) < r < max(ar, br): raise SystemExit('✗ %s–%s 穿過 %s' % (a, b, k2))
            if ar == br == r and min(ac, bc) < c < max(ac, bc): raise SystemExit('✗ %s–%s 穿過 %s' % (a, b, k2))
        da = 'right' if bc > ac else 'left' if bc < ac else 'down' if br > ar else 'up'
        assert da not in nb.setdefault(a, {}), ('%s 的 %s 已經接了 %s' % (a, da, nb[a][da]))
        assert OPP[da] not in nb.setdefault(b, {}), ('%s 的 %s 已經接了 %s' % (b, OPP[da], nb[b][OPP[da]]))
        nb[a][da] = b; nb[b][OPP[da]] = a
    # 交叉：水平邊 × 垂直邊
    H = [(NODES[a][1], *sorted((NODES[a][0], NODES[b][0]))) for a, b in EDGES if NODES[a][1] == NODES[b][1]]
    V = [(NODES[a][0], *sorted((NODES[a][1], NODES[b][1]))) for a, b in EDGES if NODES[a][0] == NODES[b][0]]
    for (r, c0, c1), (c, r0, r1) in itertools.product(H, V):
        if c0 < c < c1 and r0 < r < r1: raise SystemExit('✗ 列 %d 的橫線與欄 %d 的直線交叉' % (r, c))
    # ⚠⚠ 同向直線 ≤ 2 段（Ray：「同一方向不要有三次以上的直線」）
    MAXRUN = 4
    for k in NODES:
        for dd in OPP:
            if nb.get(k, {}).get(OPP[dd]): continue          # 只從一段的起點量
            n, cur, path = 0, k, [k]
            while nb.get(cur, {}).get(dd): cur = nb[cur][dd]; n += 1; path.append(cur)
            if n > MAXRUN: raise SystemExit('✗ 同向直線 %d 段：%s' % (n, '→'.join(NODES[q][2] for q in path)))
    over = [k for k in NODES if deg.get(k, 0) > 4]
    if over: raise SystemExit('✗ 超過四向：%s' % over)
    lone = [k for k in NODES if deg.get(k, 0) == 0]
    if lone: raise SystemExit('✗ 沒接線：%s' % lone)
    # 連通
    stack, vis = ['harbor'], {'harbor'}
    while stack:
        cur = stack.pop()
        for n in nb.get(cur, {}).values():
            if n not in vis: vis.add(n); stack.append(n)
    if len(vis) != len(NODES): raise SystemExit('✗ 走不到：%s' % sorted(set(NODES) - vis))

    cols = sorted({v[0] for v in NODES.values()}); rows = sorted({v[1] for v in NODES.values()})
    cx = lambda c: PAD + BW//2 + (c - cols[0]) // 2 * CW
    cy = lambda r: PAD + BH//2 + (r - rows[0]) * CH
    W = cx(cols[-1]) + BW//2 + PAD; Hh = cy(rows[-1]) + BH//2 + PAD + 120
    im = Image.new('RGB', (W, Hh), (255, 255, 255)); d = ImageDraw.Draw(im)
    FN, FS, FL = _font.cjk(31), _font.cjk(20), _font.cjk(22)
    for a, b in EDGES:
        d.line([cx(NODES[a][0]), cy(NODES[a][1]), cx(NODES[b][0]), cy(NODES[b][1])], fill=LINE, width=7)
    def label(nid):
        n = deg.get(nid, 0); kind = NODES[nid][3]
        if kind == 'gate': return '入城・出航'
        if kind == 'goal': return '終點・%d向' % n
        base = {1: '端末口', 2: '通道', 3: '三向口', 4: '四向口'}[n]
        return base + ('・休息處' if kind == 'rest' else '')
    for nid, (c, r, name, kind) in NODES.items():
        bg, fg, sub = COL[kind]; x, y = cx(c) - BW//2, cy(r) - BH//2
        d.rectangle([x, y, x+BW, y+BH], fill=bg, outline=LINE, width=(4 if kind == 'gate' else 0))
        bb = d.textbbox((0, 0), name, font=FN)
        d.text((cx(c)-(bb[2]-bb[0])/2, cy(r)-30-(bb[3]-bb[1])/2), name, font=FN, fill=fg)
        lb = label(nid); bb = d.textbbox((0, 0), lb, font=FS)
        d.text((cx(c)-(bb[2]-bb[0])/2, cy(r)+20-(bb[3]-bb[1])/2), lb, font=FS, fill=sub)
    ly, lx = Hh - 84, PAD
    for kind, txt in (('pass','通道／岔口'), ('end','端末口'), ('rest','旅店'), ('goal','薇拉馮德莊園'), ('gate','碼頭（入城・出航）')):
        bg = COL[kind][0]
        d.rectangle([lx, ly, lx+40, ly+30], fill=bg, outline=LINE, width=(3 if kind == 'gate' else 0))
        d.text((lx+52, ly+3), txt, font=FL, fill=(20,20,20))
        lx += 52 + d.textbbox((0,0), txt, font=FL)[2] + 46
    dst = os.path.join(ROOT, 'resources', 'map', '_layout_verafond.png'); im.save(dst)

    def walk(start, dd):
        path, cur, seen = [NODES[start][2]], start, {start}
        while True:
            nxt = nb.get(cur, {}).get(dd)
            if not nxt or nxt in seen: break
            path.append(NODES[nxt][2]); seen.add(nxt); cur = nxt
        return path
    # 入口 → 莊園的最短步數
    from collections import deque
    dist = {'harbor': 0}; q = deque(['harbor'])
    while q:
        cur = q.popleft()
        for n in nb[cur].values():
            if n not in dist: dist[n] = dist[cur] + 1; q.append(n)
    ends = [k for k in NODES if deg[k] == 1 and NODES[k][3] not in ('gate',)]
    hub3 = [k for k in NODES if deg[k] == 3]; hub4 = [k for k in NODES if deg[k] == 4]
    nm = lambda ks: '・'.join(NODES[k][2] for k in ks)
    print('✓ 薇拉馮德港 verafond：%d 格（含碼頭）・%d 邊・環數 %d' % (len(NODES), len(EDGES), len(EDGES)-len(NODES)+1))
    print('  四向口 %d：%s' % (len(hub4), nm(hub4)))
    print('  三向口 %d：%s' % (len(hub3), nm(hub3)))
    print('  通道 %d' % sum(1 for k in NODES if deg[k] == 2 and NODES[k][3] != 'gate'))
    print('  端末口 %d：%s' % (len(ends), nm(ends)))
    print('  休息處：%s' % nm([k for k in NODES if NODES[k][3] == 'rest']))
    print('  一直按↑（從入口）：' + '→'.join(walk('harbor', 'up')))
    print('  一直按→（從莊園）：' + '→'.join(walk('manor', 'right')))
    print('  碼頭→莊園最短 %d 步；最遠的一格：%s（%d 步）' % (dist['manor'], NODES[max(dist, key=dist.get)][2], max(dist.values())))
    print('  →', os.path.relpath(dst, ROOT), '%dx%d' % (W, Hh))
    # 逐格度數（給 spec 抄）
    for k, (c, r, name, kind) in NODES.items():
        print('    %-12s %-7s %d向 %s' % (k, name, deg[k], ','.join(sorted(nb[k]))))

main()
