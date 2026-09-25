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
#   三帶：列 9~12＝**外壘與入口**（壕溝、壘牆、望樓）／列 5~8＝**廢城居住區**
#   （圓屋、市集、工坊、王廳）／列 0~4＝**聖域**（石環、聖林、塚原、祭壇）。
NODES = {
    # ── 聖域（列 0~4）
    'altar'      : (6, 0, '祭壇',       'goal'),
    'kingsbarrow': (2, 1, '王塚',       'end'),
    'barrowfield': (4, 1, '塚原',       'pass'),
    'nemeton'    : (6, 1, '聖林祭場',   'rest'),
    'altarcourt' : (8, 1, '祭壇前庭',   'pass'),
    'dolmen'     : (4, 2, '石棚墓',     'pass'),
    'triskele'   : (6, 2, '三曲紋廊',   'pass'),
    'sacredway'  : (8, 2, '聖道',       'pass'),
    'skullniche' : (10, 2, '顱骨壁龕',  'end'),
    'cairn'      : (2, 3, '積石塚',     'end'),
    'stonerow'   : (4, 3, '立石列',     'pass'),
    'springpool' : (6, 3, '泉池',       'pass'),
    'henge'      : (8, 3, '石環',       'pass'),
    'brochbase'  : (10, 3, '圓塔基座',  'pass'),
    'brochtop'   : (12, 3, '圓塔頂',    'end'),
    'headshrine' : (4, 4, '石首龕',     'pass'),
    'oakgrove'   : (6, 4, '橡樹林',     'rest'),
    'processway' : (8, 4, '儀式道',     'pass'),
    'bardsstep'  : (10, 4, '吟遊石階',  'pass'),
    'boglane'    : (12, 4, '泥沼小徑',  'pass'),
    'bogoffer'   : (14, 4, '沼澤獻祭處','end'),
    # ── 居住區（列 5~8）
    'cistgrave'  : (2, 5, '石棺墓',     'end'),
    'druidhouse' : (6, 5, '德魯伊居所', 'pass'),
    'boarstone'  : (8, 5, '野豬石',     'pass'),
    'hallcourt'  : (10, 5, '王廳中庭',  'pass'),
    'lakeshore'  : (12, 5, '湖岸',      'pass'),
    'crannog'    : (14, 5, '湖上木屋',  'end'),
    'fogou'      : (2, 6, '石砌暗道',   'pass'),
    'innerditch' : (4, 6, '內壕',       'pass'),
    'innergate'  : (6, 6, '內壘門',     'pass'),
    'lawstone'   : (8, 6, '律法石',     'pass'),
    'kingshall'  : (10, 6, '王廳廢墟',  'pass'),
    'treasury'   : (12, 6, '頸環寶庫',  'pass'),
    'souterrain' : (2, 7, '地下甬道口', 'pass'),
    'potters'    : (4, 7, '陶匠巷',     'pass'),
    'marketcross': (8, 7, '市集十字',   'pass'),
    'chariotshed': (12, 7, '戰車棚',    'pass'),
    'weaverhut'  : (2, 8, '織工圓屋',   'end'),
    'roundring'  : (4, 8, '圓屋環',     'pass'),
    'wellsq'     : (6, 8, '聖井廣場',   'rest'),
    'mainstreet' : (8, 8, '石板主街',   'pass'),
    'smithy'     : (10, 8, '鐵匠爐',    'pass'),
    'kilnyard'   : (12, 8, '陶窯場',    'pass'),
    'tannery'    : (14, 8, '鞣皮坊',    'end'),
    # ── 外壘與入口（列 9~12）
    'oghamrow'   : (4, 9, '歐甘石列',   'pass'),
    'gatecourt'  : (8, 9, '門內廣場',   'pass'),
    'granary'    : (12, 9, '穀倉遺址',  'pass'),
    'watchW'     : (2, 10, '西望樓',    'end'),
    'rampartW'   : (4, 10, '西壘牆',    'pass'),
    'ditchW'     : (6, 10, '西壕',      'pass'),
    'southgate'  : (8, 10, '南壘門',    'pass'),
    'ditchE'     : (10, 10, '東壕',     'pass'),
    'rampartE'   : (12, 10, '東壘牆',   'pass'),
    'watchE'     : (14, 10, '東望樓',   'end'),
    'causeway'   : (8, 11, '堤道',      'pass'),
    'gate'       : (8, 12, '跨圖出口',  'gate'),
}

# ── 邊（無向）───────────────────────────────────────────────────────────
EDGES = [
    # 主幹（入口 → 石環 → 祭壇前庭；⚠ 到前庭就停，祭壇在旁邊的聖林那一側）
    ('gate','causeway'), ('causeway','southgate'), ('southgate','gatecourt'),
    ('gatecourt','mainstreet'), ('mainstreet','marketcross'), ('marketcross','lawstone'),
    ('lawstone','boarstone'), ('processway','henge'),
    #   ⚠⚠ 野豬石 ↔ 儀式道**不通**：主幹在野豬石斷開，一直按↑會停在那裡 ——
    #     要上石環得繞德魯伊居所→橡樹林→儀式道，或王廳中庭→吟遊石階→圓塔基座。
    ('henge','sacredway'), ('sacredway','altarcourt'),
    # 外壘（列 10 一整排）＋ 兩側望樓
    ('watchW','rampartW'), ('rampartW','ditchW'), ('ditchW','southgate'),
    ('southgate','ditchE'), ('ditchE','rampartE'), ('rampartE','watchE'),
    # 西側上城之路：壘牆 → 歐甘石列 → 圓屋環 → 陶匠巷 → 內壕 →（跳過列 5）石首龕
    ('rampartW','oghamrow'), ('oghamrow','roundring'), ('roundring','potters'),
    ('potters','innerditch'), ('innerditch','headshrine'),
    # 東側上城之路：壘牆 → 穀倉 → 陶窯場 → 戰車棚 → 寶庫 → 湖岸 → 泥沼
    ('rampartE','granary'), ('granary','kilnyard'), ('kilnyard','chariotshed'),
    ('chariotshed','treasury'), ('treasury','lakeshore'), ('lakeshore','boglane'),
    # ⚠ 門內廣場 ↔ 穀倉**不通**：進城只有南壘門→門內廣場→主街一條，東西兩翼要繞壘牆
    # 列 8 居住區橫街
    ('weaverhut','roundring'), ('roundring','wellsq'), ('wellsq','mainstreet'),
    ('mainstreet','smithy'), ('kilnyard','tannery'),
    #   ⚠ 鐵匠爐 ↔ 陶窯場**不通**：東翼（穀倉→陶窯→戰車棚）要從東壘牆進
    # 列 7
    ('souterrain','potters'),   # ⚠ 陶匠巷 ↔ 市集十字**不通**
    # 西端地下線：甬道口 → 石砌暗道 → 石棺墓（死路）
    ('souterrain','fogou'), ('fogou','cistgrave'),
    # 列 6 內壘橫線
    ('fogou','innerditch'), ('innerditch','innergate'), ('innergate','lawstone'),
    ('lawstone','kingshall'),   # ⚠ 王廳 ↔ 寶庫**不通**：寶庫只從戰車棚那一側進
    # 中軸西（欄 6）：內壘門 → 德魯伊 → 橡樹林 → 泉池 → 三曲紋廊 → 聖林 → 祭壇
    #   ⚠ 聖井廣場**不直通**內壘門（那條會與陶匠巷—市集十字交叉）：進內壘只有內壕與律法石兩條路
    ('innergate','druidhouse'), ('druidhouse','oakgrove'),
    ('oakgrove','springpool'), ('springpool','triskele'), ('triskele','nemeton'),
    ('nemeton','altar'),
    # 中軸東（欄 10）：鐵匠爐 →（跳過列 7）王廳 → 中庭 → 吟遊石階 → 圓塔基座
    ('smithy','kingshall'), ('kingshall','hallcourt'), ('hallcourt','bardsstep'),
    ('bardsstep','brochbase'),
    # 列 5
    ('druidhouse','boarstone'), ('boarstone','hallcourt'),
    ('lakeshore','crannog'),   # ⚠ 中庭 ↔ 湖岸**不通**
    # 列 4（⚠ 儀式道與吟遊石階之間**不通**：中軸東西兩半在這一列斷開）
    ('headshrine','oakgrove'), ('oakgrove','processway'),
    ('bardsstep','boglane'), ('boglane','bogoffer'),
    # 列 3 石環那一排
    ('cairn','stonerow'), ('springpool','henge'),   # ⚠ 立石列 ↔ 泉池**不通**
    ('henge','brochbase'), ('brochbase','brochtop'),
    # 欄 4 聖域西線：石首龕 → 立石列 → 石棚墓 → 塚原
    ('headshrine','stonerow'), ('stonerow','dolmen'), ('dolmen','barrowfield'),
    # 列 2（⚠ 三曲紋廊與聖道之間**不通**）
    ('dolmen','triskele'), ('sacredway','skullniche'),
    # 列 1
    ('kingsbarrow','barrowfield'), ('barrowfield','nemeton'), ('nemeton','altarcourt'),
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
