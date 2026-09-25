#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/map_dunmor_draft.py —— 無人廢城（暫名 `dunmor`，古凱爾特丘堡）的**拓樸提案圖**

    python3 tools/map_dunmor_draft.py

> Ray（2026-09-25）：「先交一份無人廢城拓樸方案，50～60 格，含一個祭壇終點，
>   古凱爾特風格，迷宮與岔路」

⚠⚠⚠ **提案階段的東西**（同 `map_undercity_draft.py` 那一支的地位）：
  `script/town.js` 裡還沒有這張圖，所以這一刻的唯一真相就是下面的 `NODES`／`EDGES`。
  Ray 點頭之後 → 拓樸搬進 `script/town.js`、`map_layout.py` 的 `POS` 補一格、
  **把這支回收掉**（鐵律 7：同一個拓樸不留兩份）。
⚠ 憲法 ver -907：拓樸是 Ray 的設計。這一版是他交辦的**提案**，形狀／房間名／
  休息處／終點全部等他改。

**規矩（全部由 main() 自檢，錯了不出圖）**：
  · ⚠⚠ **同一方向連續不超過兩段**（Ray 2026-09-25：「同一方向不要有三次以上的直線」）
    ⇒ 整張圖是之字形：走兩格一定要轉彎。長直線的格網版（第一版，13 環）已作廢。
  · 只連同一欄或同一列、而且中間沒有別的格子的兩點（畫直線，讀起來才是通道）
  · 邊與邊不交叉（交叉在小地圖上讀不出誰接誰）
  · 每格最多 4 向（背景圖畫得出的上限）
  · 全圖連通；`up`＝往畫面深處＝列數變小
  · 「一直按↑」從入口走要**停在半路**，不可以直達祭壇（憲法 ver -902 的自檢）

輸出：`resources/map/_layout_dunmor.png`（底線開頭＝遊戲不載入，是工單附件）
"""
import os, itertools
import _font                # 字型解析的唯一一處（見 tools/_font.py）
import _utf8  # noqa: F401
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── 節點：id → (欄, 列, 名字, 類別) ───────────────────────────────────────
#   類別  pass=通道／岔口  end=末端  rest=休息處（走進去閉棺結算）
#         goal=祭壇（終點）  gate=跨圖出口
#   欄用偶數（同 map_undercity_draft.py 的座標系），列 0 在最上（最深處）。
#   ⚠ 南壘門的門道是塌的（gate→堤道→壘門已是兩段↑，第三段不准）：進城要走兩側壕溝的坡道。
#   三帶：列 9~12＝**外壘與入口**（壕溝、壘牆、望樓）／列 5~8＝**廢城居住區**
#   （圓屋、市集、工坊、王廳）／列 0~4＝**聖域**（石環、聖林、塚原、祭壇）。
NODES = {
 'gate':(8,14,'跨圖出口','gate'),'causeway':(8,13,'堤道','pass'),'southgate':(8,12,'南壘門','pass'),
 'ditchW':(6,12,'西壕','pass'),'rampartW':(6,13,'西壘牆','pass'),'watchW':(4,13,'西望樓','end'),
 'ditchE':(10,12,'東壕','pass'),'rampartE':(10,13,'東壘牆','pass'),'watchE':(12,13,'東望樓','end'),
 'oghamrow':(6,11,'歐甘石列','pass'),'gatecourt':(8,11,'門內廣場','pass'),'granary':(10,11,'穀倉遺址','pass'),
 'mainstreet':(8,10,'石板主街','pass'),'wellsq':(6,10,'聖井廣場','rest'),'smithy':(10,10,'鐵匠爐','pass'),
 'roundring':(4,10,'圓屋環','pass'),'weaverhut':(2,10,'織工圓屋','pass'),'potters':(4,9,'陶匠巷','pass'),
 'souterrain':(2,9,'地下甬道口','pass'),'fogou':(2,8,'石砌暗道','pass'),'cistgrave':(0,9,'石棺墓','pass'),
 'innerditch':(4,8,'內壕','pass'),'innergate':(6,8,'內壘門','pass'),'boarstone':(6,9,'野豬石','pass'),
 'marketcross':(8,9,'市集十字','pass'),'kingshall':(10,9,'王廳廢墟','pass'),'chariotshed':(12,9,'戰車棚','pass'),
 'kilnyard':(12,10,'陶窯場','pass'),'tannery':(12,11,'鞣皮坊','end'),'treasury':(12,8,'頸環寶庫','pass'),
 'lawstone':(8,8,'律法石','pass'),'hallcourt':(10,8,'王廳中庭','pass'),
 'henge':(8,7,'石環','pass'),'brochbase':(10,7,'圓塔基座','pass'),'boglane':(12,7,'泥沼小徑','pass'),
 'lakeshore':(14,7,'湖岸','pass'),'crannog':(14,8,'湖上木屋','end'),'bogoffer':(14,6,'沼澤獻祭處','end'),
 'brochtop':(12,6,'圓塔頂','end'),'cairn':(16,7,'積石塚','end'),
 'druidhouse':(6,7,'德魯伊居所','pass'),'oakgrove':(4,7,'橡樹林','rest'),'stonerow':(2,7,'立石列','pass'),
 'dolmen':(2,6,'石棚墓','pass'),'headshrine':(0,6,'石首龕','end'),'barrowfield':(2,5,'塚原','pass'),'kingsbarrow':(0,5,'王塚','end'),
 'nemeton':(4,6,'聖林祭場','rest'),'altar':(4,5,'祭壇','goal'),'triskele':(6,6,'三曲紋廊','pass'),
 'sacredway':(8,6,'聖道','pass'),'springpool':(6,5,'泉池','pass'),'altarcourt':(8,5,'祭壇前庭','pass'),'skullniche':(10,5,'顱骨壁龕','pass'),'bardsstep':(10,6,'吟遊石階','pass'),'ossuary':(0,8,'骨龕','end'),
}

# ── 邊（無向）───────────────────────────────────────────────────────────
EDGES = [
 ('gate','causeway'),('causeway','southgate'),('southgate','ditchW'),('southgate','ditchE'),
 ('ditchW','rampartW'),('rampartW','watchW'),('ditchW','oghamrow'),
 ('ditchE','rampartE'),('rampartE','watchE'),('ditchE','granary'),
 ('oghamrow','gatecourt'),('gatecourt','granary'),('gatecourt','mainstreet'),
 ('mainstreet','smithy'),('mainstreet','marketcross'),
 ('wellsq','roundring'),('roundring','weaverhut'),('roundring','potters'),
 ('potters','innerditch'),('souterrain','cistgrave'),('souterrain','fogou'),('fogou','innerditch'),
 ('innerditch','innergate'),('innergate','boarstone'),('boarstone','marketcross'),('innergate','druidhouse'),
 ('smithy','kingshall'),('kingshall','chariotshed'),
 ('smithy','kilnyard'),('kilnyard','tannery'),('chariotshed','treasury'),
 ('lawstone','hallcourt'),('henge','brochbase'),('kingshall','hallcourt'),('treasury','boglane'),('lakeshore','cairn'),('potters','boarstone'),('souterrain','weaverhut'),('lawstone','henge'),
 ('henge','sacredway'),('brochbase','bardsstep'),('bardsstep','brochtop'),('bardsstep','skullniche'),('cistgrave','ossuary'),
 ('boglane','lakeshore'),('lakeshore','crannog'),('lakeshore','bogoffer'),
 ('druidhouse','oakgrove'),('oakgrove','stonerow'),('oakgrove','nemeton'),
 ('stonerow','dolmen'),('dolmen','headshrine'),('dolmen','barrowfield'),('barrowfield','kingsbarrow'),
 ('nemeton','altar'),('nemeton','triskele'),('triskele','sacredway'),('triskele','springpool'),
 ('springpool','altarcourt'),('altarcourt','skullniche'),
]

REST_NOTE = '休息處'
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
    MAXRUN = 2
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
    stack, vis = ['gate'], {'gate'}
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
        if kind == 'gate': return '跨圖出口'
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
    for kind, txt in (('pass','通道／岔口'), ('end','端末口'), ('rest','休息處（閉棺結算）'), ('goal','祭壇（終點）'), ('gate','跨圖出口')):
        bg = COL[kind][0]
        d.rectangle([lx, ly, lx+40, ly+30], fill=bg, outline=LINE, width=(3 if kind == 'gate' else 0))
        d.text((lx+52, ly+3), txt, font=FL, fill=(20,20,20))
        lx += 52 + d.textbbox((0,0), txt, font=FL)[2] + 46
    dst = os.path.join(ROOT, 'resources', 'map', '_layout_dunmor.png'); im.save(dst)

    def walk(start, dd):
        path, cur, seen = [NODES[start][2]], start, {start}
        while True:
            nxt = nb.get(cur, {}).get(dd)
            if not nxt or nxt in seen: break
            path.append(NODES[nxt][2]); seen.add(nxt); cur = nxt
        return path
    # 入口 → 祭壇的最短步數
    from collections import deque
    dist = {'gate': 0}; q = deque(['gate'])
    while q:
        cur = q.popleft()
        for n in nb[cur].values():
            if n not in dist: dist[n] = dist[cur] + 1; q.append(n)
    ends = [k for k in NODES if deg[k] == 1 and NODES[k][3] not in ('gate',)]
    hub3 = [k for k in NODES if deg[k] == 3]; hub4 = [k for k in NODES if deg[k] == 4]
    nm = lambda ks: '・'.join(NODES[k][2] for k in ks)
    print('✓ 廢城 dunmor：%d 格（含跨圖出口）・%d 邊・環數 %d' % (len(NODES), len(EDGES), len(EDGES)-len(NODES)+1))
    print('  四向口 %d：%s' % (len(hub4), nm(hub4)))
    print('  三向口 %d：%s' % (len(hub3), nm(hub3)))
    print('  通道 %d' % sum(1 for k in NODES if deg[k] == 2 and NODES[k][3] != 'gate'))
    print('  端末口 %d：%s' % (len(ends), nm(ends)))
    print('  休息處：%s' % nm([k for k in NODES if NODES[k][3] == 'rest']))
    print('  一直按↑（從入口）：' + '→'.join(walk('gate', 'up')))
    print('  一直按↓（從祭壇）：' + '→'.join(walk('altar', 'down')))
    print('  入口→祭壇最短 %d 步；最遠的一格：%s（%d 步）' % (dist['altar'], NODES[max(dist, key=dist.get)][2], max(dist.values())))
    print('  →', os.path.relpath(dst, ROOT), '%dx%d' % (W, Hh))
    # 逐格度數（給 spec 抄）
    for k, (c, r, name, kind) in NODES.items():
        print('    %-12s %-7s %d向 %s' % (k, name, deg[k], ','.join(sorted(nb[k]))))

main()
