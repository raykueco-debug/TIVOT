#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/map_undercity_draft.py —— 地宮迷宮的**拓樸提案圖**（ver -1047，Ray 交辦）

    python3 tools/map_undercity_draft.py

> Ray：「生成地圖，參考 reference/maze 同風格，**廣大的地宮迷宮**，
>   **某些端末點是戶外**，**有很多三岔口**，**不要都畫一樣，要有辨視度**」

⚠⚠⚠ **這支是「提案階段」的東西，不是 `tools/map_layout.py` 的兄弟。**
  · `map_layout.py`（ver -909）**從 `script/town.js` 讀連線**，因為那時拓樸已經是
    資料、圖只是它的投影 —— 那條規矩（鐵律 7）現在照樣成立。
  · 但**這張圖是設計本身**：`script/town.js` 裡還沒有這張地圖，所以沒有第一份真相
    可讀。這一刻的唯一真相就是下面那張 `NODES`／`EDGES`。
  ⚠⚠ **Ray 點頭之後**：把拓樸搬進 `script/town.js`、`map_layout.py` 的 `POS` 補一格，
    **然後把這支回收掉**（`tools/recycle.sh`）—— 留著就是同一個拓樸有兩份，
    而那正是 -908 犯過、-909 修掉的錯。

⚠ 憲法 ver -907：「地圖的拓樸是 **Ray 的設計**，不是我的」。這一版是他明確交辦的，
  所以這張圖是**提案**：形狀、房間名、哪幾個端末是戶外，全部等他改。

輸出：`resources/map/_layout_undercity.png`（底線開頭＝遊戲不載入，是工單附件）
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = '/System/Library/Fonts/PingFang.ttc'
IDX  = 7        # PingFang TC Semibold —— 對齊 reference/maze.png 那種粗黑字

# ── 節點：id → (欄, 列, 名字, 類別) ───────────────────────────────────────
#   類別  pass=通道／岔口（黑）  end=室內末端（橘）  sky=**戶外**末端（藍）
#         gate=跨圖出口（白框）
#   ⚠ 欄列就是**相對位置＝方向**（左邊的鄰居畫在左邊…），同 map_layout.py 的規矩：
#     這樣小地圖與畫面上的箭頭才會一致（憲法 §6.5.4.3 那條）。
#   ⚠⚠ **名字都不一樣、而且各有各的樣子**（Ray：「不要都畫一樣，要有辨視度」）——
#     逐格的特徵寫在 `resources/map/_undercity_spec.md`，那份才是給產圖用的。
#   ⚠⚠⚠ **不要東方元素**（ver -1048，Ray 指定）：房間名整批換過一次 ——
#     玉座／冕旒／龍紋／龍口／藻井／碑林／沉香／渾儀那一批**全部撤掉**，
#     改成古代**歐式皇宮**的詞（王座廳・謁見前廳・甲冑廊・枝燈長廊・鏡廊・石棺廊…）。
#     ⚠ 名字就是給美術的第一道指示，取錯字整張圖就會漂到唐風去。
#   ⚠⚠ **三帶**（Ray：「某些地方看得出是古代皇宮」）：越深越華麗 ——
#     列 0~3＝**宮殿本體**（被埋起來的正殿）／列 5~7＝**地下設施**／
#     列 8~12＝**入口側的服務區**。玩家從最粗糙的地方一路走進最華麗的地方。
NODES = {
    # 深處・玉座區（走到底才到得了）
    # ⚠⚠ **它掛在西側的儀衛廊，不掛在中央大殿** —— 這樣「從入口一路按上」會**停在
    #   中央大殿**，玩家得自己找到往西那一轉才上得去（憲法 ver -902 的自檢：
    #   一直按同一個方向要走到終點就停，而**不該直達 BOSS**）。
    #   掛中央大廳的話主幹就是一條直通王座的電梯，十一個岔路口全白設計了。
    'throne'   : (4, 0, '王座廳',  'end'),
    'crown'    : (2, 1, '寶冠室',  'end'),
    'antecham' : (4, 1, '謁見前廳','pass'),
    'offering' : (6, 1, '聖物室',  'end'),
    'dragstair': (4, 2, '獅階',    'pass'),
    # 大殿層
    'starroom' : (2, 3, '星象室',  'end'),
    'guardhall': (4, 3, '甲冑廊',  'pass'),
    'greathall': (6, 3, '中央大廳','pass'),
    'lamphall' : (8, 3, '枝燈長廊','pass'),
    'ossuary'  : (10,3, '納骨堂',  'end'),
    'mirrorpool':(4, 4, '靜水池',  'pass'),
    'courtyard': (8, 4, '下沉中庭','sky'),
    # 柱林層
    'rooffall' : (0, 5, '崩頂坡',  'sky'),
    'muralwalk': (2, 5, '壁畫長廊','pass'),
    'stairwell': (4, 5, '旋梯井',  'pass'),
    'pillars'  : (6, 5, '千柱廳',  'pass'),
    'dragonrace':(8, 5, '獅口水道','pass'),
    'draincliff':(10,5, '排水崖口','sky'),
    'incense'  : (4, 6, '聖油室',  'pass'),
    'bellroom' : (8, 6, '鐘室',    'end'),
    # 水牢層
    'drywell'  : (0, 7, '枯井底',  'sky'),
    'forge'    : (2, 7, '兵器工坊','pass'),
    'trihall'  : (4, 7, '三拱廳',  'pass'),
    'waterjail': (6, 7, '水牢',    'pass'),
    'bonerack' : (8, 7, '石棺廊',  'pass'),
    'wardtomb' : (10,7, '近衛墓室','end'),
    'culvert'  : (4, 8, '暗渠',    'pass'),
    'mirrorway': (8, 8, '鏡廊',    'pass'),
    # 入口層
    'cages'    : (2, 9, '獸欄',    'end'),
    'oldtomb'  : (4, 9, '地下墓道','pass'),
    'capstan'  : (6, 9, '絞盤室',  'pass'),
    'candlewalk':(8, 9, '燭廊',    'pass'),
    'stelae'   : (4,10, '銘碑廊',  'pass'),
    'stephall' : (6,10, '階梯大廳','pass'),
    'floodway' : (8,10, '積水甬道','pass'),
    # ⚠⚠ **古代祭壇**（ver -1049，Ray：「至少要生一個古代祭壇，因為**很靠近入口**
    #   所以**風格不要差太多**」）——掛在入口側的積水甬道下面：
    #   入口→前廳→階梯大廳→積水甬道→祭壇，**四步就到**。
    #   ⚠ 它在 **C 帶**（入口側服務區），所以材質與光線**跟著 C 帶走**（素石、低彩度、
    #     燭火與苔），**不要**用 A 帶那套大理石鍍金 —— 那正是 Ray 說的「風格不要差太多」。
    'altar'    : (8,11, '古代祭壇','end'),
    'foyer'    : (6,11, '前廳',    'pass'),
    'entrance' : (6,12, '地宮入口','gate'),
}

# ── 邊（無向）───────────────────────────────────────────────────────────
#   ⚠ 只連「同一欄或同一列、而且中間沒有別的格子」的兩點 —— 全部畫直線，
#     同 reference/maze.png（沒有轉角線，讀起來才像通道）。
EDGES = [
    # 主幹（入口 → 玉座）
    ('entrance','foyer'), ('foyer','stephall'), ('stephall','capstan'),
    ('capstan','waterjail'), ('waterjail','pillars'), ('pillars','greathall'),
    ('dragstair','antecham'), ('antecham','throne'),
    # 玉座區的兩側室
    ('crown','antecham'), ('antecham','offering'),
    # 大殿層橫向
    ('starroom','guardhall'), ('guardhall','greathall'), ('guardhall','dragstair'),
    ('greathall','lamphall'), ('lamphall','ossuary'),
    ('lamphall','courtyard'),
    # 西側直落（大殿 → 入口層）
    ('guardhall','mirrorpool'), ('mirrorpool','stairwell'),
    ('stairwell','incense'), ('incense','trihall'),
    ('trihall','culvert'), ('culvert','oldtomb'), ('oldtomb','stelae'),
    # 柱林層橫向（**斷成兩段**：階梯井與柱林之間沒有路）
    ('rooffall','muralwalk'), ('muralwalk','stairwell'),
    ('pillars','dragonrace'), ('dragonrace','draincliff'),
    ('dragonrace','bellroom'),
    # 最西側的縱向支線
    ('muralwalk','forge'),
    # 水牢層橫向（**斷成兩段**：三岔廳與水牢之間沒有路）
    ('drywell','forge'), ('forge','trihall'),
    ('waterjail','bonerack'), ('bonerack','wardtomb'),
    # 東側直落
    ('bonerack','mirrorway'), ('mirrorway','candlewalk'),
    ('candlewalk','floodway'),
    # 入口層橫向
    ('cages','oldtomb'), ('oldtomb','capstan'),
    ('stelae','stephall'), ('stephall','floodway'),
    ('floodway','altar'),          # ver -1049：古代祭壇（積水甬道因此變三向口）
]

# ── 版面 ────────────────────────────────────────────────────────────────
CW, CH, BW, BH = 190, 134, 152, 116     # 格距／盒子
PAD = 74
COL = {
    'pass': ((20, 20, 20),   (255,255,255), (150,150,150)),   # 底、名字、副標
    'end' : ((232,168, 56),  (255,255,255), (255,244,224)),
    'sky' : (( 72,142,196),  (255,255,255), (226,240,255)),
    'gate': ((255,255,255),  ( 20, 20, 20), ( 96, 96, 96)),
}
LINE = (20, 20, 20)

def main():
    deg = {}
    for a, b in EDGES:
        assert a in NODES and b in NODES, (a, b)
        deg[a] = deg.get(a, 0) + 1
        deg[b] = deg.get(b, 0) + 1

    # 直線驗證：兩端必須同欄或同列（不同就是我畫錯了，不要靜靜出一張歪圖）
    bad = []
    for a, b in EDGES:
        (ac, ar), (bc, br) = NODES[a][:2], NODES[b][:2]
        if ac != bc and ar != br:
            bad.append('%s–%s 不同欄也不同列' % (a, b))
    if bad:
        print('✗ 邊畫不成直線：'); [print('  ', e) for e in bad]; raise SystemExit(1)

    cols = sorted({v[0] for v in NODES.values()})
    rows = sorted({v[1] for v in NODES.values()})
    cx = lambda c: PAD + BW//2 + (c - cols[0]) // 2 * CW
    cy = lambda r: PAD + BH//2 + (r - rows[0]) * CH
    W = cx(cols[-1]) + BW//2 + PAD
    H = cy(rows[-1]) + BH//2 + PAD + 120          # 底下留一條圖例

    im = Image.new('RGB', (W, H), (255, 255, 255))
    d = ImageDraw.Draw(im)
    FN = ImageFont.truetype(FONT, 31, index=IDX)   # 名字
    FS = ImageFont.truetype(FONT, 20, index=IDX)   # 副標（向數）
    FL = ImageFont.truetype(FONT, 22, index=IDX)   # 圖例

    for a, b in EDGES:
        d.line([cx(NODES[a][0]), cy(NODES[a][1]),
                cx(NODES[b][0]), cy(NODES[b][1])], fill=LINE, width=7)

    def label(nid):
        n = deg.get(nid, 0)
        if NODES[nid][3] == 'gate': return '跨圖出口'
        return {1: '端末口', 2: '通道', 3: '三向口', 4: '四向口'}.get(n, '%d向口' % n)

    for nid, (c, r, name, kind) in NODES.items():
        bg, fg, sub = COL[kind]
        x, y = cx(c) - BW//2, cy(r) - BH//2
        d.rectangle([x, y, x+BW, y+BH], fill=bg,
                    outline=LINE, width=(4 if kind == 'gate' else 0))
        bb = d.textbbox((0, 0), name, font=FN)
        d.text((cx(c)-(bb[2]-bb[0])/2, cy(r)-30-(bb[3]-bb[1])/2), name, font=FN, fill=fg)
        lb = label(nid)
        bb = d.textbbox((0, 0), lb, font=FS)
        d.text((cx(c)-(bb[2]-bb[0])/2, cy(r)+20-(bb[3]-bb[1])/2), lb, font=FS, fill=sub)

    # 圖例
    ly = H - 84
    lx = PAD
    for kind, txt in (('pass','通道／岔口'), ('end','端末口（室內）'),
                      ('sky','端末口（戶外）'), ('gate','跨圖出口')):
        bg, _, _ = COL[kind]
        d.rectangle([lx, ly, lx+40, ly+30], fill=bg, outline=LINE,
                    width=(3 if kind == 'gate' else 0))
        d.text((lx+52, ly+3), txt, font=FL, fill=(20,20,20))
        lx += 52 + d.textbbox((0,0), txt, font=FL)[2] + 46

    dst = os.path.join(ROOT, 'resources', 'map', '_layout_undercity.png')
    im.save(dst)

    # ══⚠⚠ **實走一次「一直按同一個方向」**（憲法 ver -902 的自檢）══
    #   要的結果是「走到某一格就停」，而且**不該一路直達 BOSS** ——
    #   直達的話這張圖十一個岔路口等於白設計（那正是把玉座區移到西側的理由）。
    nb = {}
    for a, b in EDGES:
        (ac, ar), (bc, br) = NODES[a][:2], NODES[b][:2]
        da = 'right' if bc > ac else 'left' if bc < ac else 'down' if br > ar else 'up'
        nb.setdefault(a, {})[da] = b
        nb.setdefault(b, {})[{'up':'down','down':'up','left':'right','right':'left'}[da]] = a
    def walk(start, d):
        path, cur, seen = [NODES[start][2]], start, {start}
        while True:
            nxt = nb.get(cur, {}).get(d)
            if not nxt or nxt in seen: break
            path.append(NODES[nxt][2]); seen.add(nxt); cur = nxt
        return path
    print('  一直按↑（從入口）：' + '→'.join(walk('entrance','up')))
    print('  一直按↓（從玉座）：' + '→'.join(walk('throne','down')))

    ends = [k for k in NODES if deg.get(k,0) == 1 and NODES[k][3] != 'gate']
    hub3 = [k for k in NODES if deg.get(k,0) == 3]
    hub4 = [k for k in NODES if deg.get(k,0) >= 4]
    sky  = [k for k in NODES if NODES[k][3] == 'sky']
    nm = lambda ks: '・'.join(NODES[k][2] for k in ks)
    print('✓ 地宮：%d 格・%d 邊・環數 %d' % (len(NODES), len(EDGES),
                                          len(EDGES)-len(NODES)+1))
    print('  四向口 %d：%s' % (len(hub4), nm(hub4)))
    print('  三向口 %d：%s' % (len(hub3), nm(hub3)))
    print('  端末口 %d（其中戶外 %d）：%s' % (len(ends), len(sky), nm(ends)))
    print('  戶外：%s' % nm(sky))
    print('  →', os.path.relpath(dst, ROOT), '%dx%d' % (W, H))

main()
