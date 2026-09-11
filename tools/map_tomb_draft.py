#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/map_tomb_draft.py —— 帝王墓遺跡的拓樸草圖（提案階段）

    python3 tools/map_tomb_draft.py

⚠⚠ 提案階段的產生器：拓樸還沒搬進 `script/town.js`。搬進去之後由
   `tools/map_layout.py` 接手（它直接讀 town.js，圖與遊戲不可能走鐘），
   **這一支就要回收掉** —— 同一個拓樸不留兩份（鐵律 7）。

⚠⚠⚠ 憲法「地圖的拓樸是 Ray 的設計，不是我的」（ver -907）：這是**提案**。
   Ray 給的條件：**西方陵寢／迷宮型／要找到樓梯才下得去／格數多／分三層／
   金字塔形收縮，地越深圖越小**。
"""
import os, sys, math
from PIL import Image, ImageDraw, ImageFont

FONT = '/System/Library/Fonts/PingFang.ttc'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# id → (欄, 列, 中文名, 種類, 層)
#   kind: end=末端 / pass=過道 / hub=樞紐（3 向以上）/ stair=階梯 / sky=降落
#   ⚠ 列越小＝越深（`up` 一律是「走進畫面裡」，不是「往高處」，憲法 §6.5.4）
NODES = {
  # ══ 第三層・玄室層（5 格，最小）══════════════════════════════
  'bonepit'    : ( 4,  0, '骨坑',       'end',   3),
  'crypt'      : ( 6,  0, '石棺主室',   'end',   3),
  'vaultW'     : ( 4,  1, '側墓穴',     'pass',  3),
  'gallery3'   : ( 6,  1, '玄室前廊',   'hub',   3),
  'landing3'   : ( 6,  2, '三層梯廳',   'pass',  3),
  # ══ 第二層・中層（12 格）════════════════════════════════════
  'stair2'     : ( 6,  4, '第二道階梯', 'stair', 2),
  'cistern'    : ( 4,  5, '蓄水池',     'end',   2),
  'ossuary'    : ( 6,  5, '骨室',       'pass',  2),
  'nichehall'  : ( 8,  5, '壁龕廊',     'pass',  2),
  'kiln'       : (12,  5, '焚化窯',     'end',   2),
  'hall2'      : ( 4,  6, '柱廳',       'hub',   2),
  'corr2'      : ( 6,  6, '長廊',       'hub',   2),
  'rotunda'    : ( 8,  6, '圓廳',       'hub',   2),
  'sarcE'      : (10,  6, '石棺室',     'pass',  2),
  'ossuary2'   : (12,  6, '甕棺室',     'pass',  2),
  'landing2'   : ( 4,  7, '二層梯廳',   'pass',  2),
  'sump'       : ( 6,  7, '積水坑',     'end',   2),
  # ══ 第一層・上層（17 格，最大）══════════════════════════════
  'reliquary'  : ( 8,  9, '聖骨匣室',   'end',   1),
  'stair1'     : ( 4, 10, '第一道階梯', 'stair', 1),
  'cloister'   : ( 6, 10, '迴廊',       'pass',  1),
  'apse'       : ( 8, 10, '後殿',       'hub',   1),
  'ambulatory' : (10, 10, '繞行廊',     'pass',  1),
  'chantry'    : ( 6, 11, '誦經室',     'end',   1),
  'crossing'   : ( 8, 11, '十字交會',   'hub',   1),
  'chapel'     : (10, 11, '禮拜堂',     'pass',  1),
  'tombniche'  : ( 4, 12, '墓龕',       'pass',  1),
  'aisleW'     : ( 6, 12, '側廊',       'pass',  1),
  'nave'       : ( 8, 12, '中殿',       'hub',   1),
  'cryptA'     : (12, 12, '家族墓室',   'end',   1),
  'charnel'    : ( 4, 13, '藏骨所',     'end',   1),
  'vestibule'  : ( 8, 13, '前庭',       'hub',   1),
  'lapidarium' : (10, 13, '碑廊',       'pass',  1),
  'ossuaryA'   : (12, 13, '骨甕廊',     'pass',  1),
  'gate'       : ( 8, 14, '墓門',       'end',   1),
  'sky'        : ( 8, 15, '天空\n（降落）', 'sky', 1),
}

# (a, b, a 這一端的方向) —— 另一端一定是相反方向（憲法 §6.5.4）
EDGES = [
  ('sky','gate','up'), ('gate','vestibule','up'),
  # ══ 第一層 ══ ★＝唯一正確的路；其餘每一條都是走進去才知道是死胡同
  ('vestibule','nave','up'),                                    # ★
  ('vestibule','lapidarium','right'),                           # ┐ 死胡同 A（三格深）
  ('lapidarium','ossuaryA','right'), ('ossuaryA','cryptA','up'), # ┘
  ('nave','crossing','up'),                                     # ★
  ('nave','aisleW','left'),                                     # ┐ 死胡同 B（三格深）
  ('aisleW','tombniche','left'), ('tombniche','charnel','down'), # ┘
  ('crossing','chapel','right'),                                # ★
  ('crossing','chantry','left'),                                # 死胡同 C（一格）
  ('chapel','ambulatory','up'),                                 # ★
  ('ambulatory','apse','left'),                                 # ★
  ('apse','reliquary','up'),                                    # 死胡同 D（一格）
  ('apse','cloister','left'),                                   # ★
  ('cloister','stair1','left'),                                 # ★ 第一道階梯在迴廊的盡頭
  ('stair1','landing2','up'),
  # ══ 第二層 ══
  ('landing2','hall2','up'),                                    # ★
  ('hall2','cistern','up'),                                     # 死胡同 E（一格）
  ('hall2','corr2','right'),                                    # ★
  ('corr2','sump','down'),                                      # 死胡同 F（一格）
  ('corr2','rotunda','right'),                                  # ★
  ('rotunda','sarcE','right'),                                  # ┐ 死胡同 G（三格深）
  ('sarcE','ossuary2','right'), ('ossuary2','kiln','up'),        # ┘
  ('rotunda','nichehall','up'),                                 # ★
  ('nichehall','ossuary','left'),                               # ★
  ('ossuary','stair2','up'),                                    # ★ 第二道階梯在骨室的深處
  ('stair2','landing3','up'),
  # ══ 第三層 ══
  ('landing3','gallery3','up'),                                 # ★
  ('gallery3','vaultW','left'), ('vaultW','bonepit','up'),       # 死胡同 H（兩格深）
  ('gallery3','crypt','up'),                                    # ★ 終點
]

SUN = {'gate', 'apse'}
# ★ 從墓門到石棺主室的**唯一**那一條路（樹狀圖裡本來就只有一條，列出來是為了畫粗線）
PATH = ['gate','vestibule','nave','crossing','chapel','ambulatory','apse','cloister',
        'stair1','landing2','hall2','corr2','rotunda','nichehall','ossuary','stair2',
        'landing3','gallery3','crypt']   # 19 格；樹狀圖裡本來就只有這一條走得到終點
PATH_E = {tuple(sorted(t)) for t in zip(PATH, PATH[1:])}                       # 有室外光 → 要四時段差分
LEVEL_NAME = {1:'第一層・上層', 2:'第二層・中層', 3:'第三層・玄室層'}
OPP = {'up':'down','down':'up','left':'right','right':'left'}

def main():
    err = []
    for a, b, d in EDGES:
        (ca, ra), (cb, rb) = NODES[a][:2], NODES[b][:2]
        ok = {'left': cb < ca, 'right': cb > ca, 'up': rb < ra, 'down': rb > ra}[d]
        if not ok: err.append('%s.%s→%s：方向與版面不符' % (a, d, b))
    seen = {}
    for a, b, d in EDGES:
        for k, dd, other in ((a, d, b), (b, OPP[d], a)):
            if (k, dd) in seen:
                err.append('%s 有兩條 %s 出口（%s 與 %s）' % (k, dd, seen[(k, dd)], other))
            seen[(k, dd)] = other
    if err: [print('✗', e) for e in err]; sys.exit(1)

    CW, CH, BW, BH = 162, 108, 130, 76
    cols = [c for c,_,_,_,_ in NODES.values()]; rows = [r for _,r,_,_,_ in NODES.values()]
    cx = lambda c: 150 + (c - min(cols)) * CW
    cy = lambda r: 100 + (r - min(rows)) * CH
    W = cx(max(cols)) + BW//2 + 70; H = cy(max(rows)) + BH//2 + 50
    im = Image.new('RGB', (W, H), (255, 255, 255)); d = ImageDraw.Draw(im)
    F  = ImageFont.truetype(FONT, 23, index=4)
    FB = ImageFont.truetype(FONT, 26, index=4)

    # 層的底色帶（金字塔形：越深越窄）
    for lv, col in ((1,(248,246,242)), (2,(242,240,250)), (3,(246,238,238))):
        ns = [v for v in NODES.values() if v[4] == lv and v[3] != 'sky']
        x0 = min(cx(v[0]) for v in ns)-BW//2-26; x1 = max(cx(v[0]) for v in ns)+BW//2+26
        y0 = min(cy(v[1]) for v in ns)-BH//2-22; y1 = max(cy(v[1]) for v in ns)+BH//2+22
        d.rectangle([x0,y0,x1,y1], fill=col)
        d.text((x0+4, y0-34), LEVEL_NAME[lv], font=FB, fill=(150,146,140))

    for a, b, _ in EDGES:
        (ca, ra), (cb, rb) = NODES[a][:2], NODES[b][:2]
        x1, y1, x2, y2 = cx(ca), cy(ra), cx(cb), cy(rb)
        if a == 'sky' or b == 'sky':
            n = 12
            for i in range(0, n, 2):
                d.line([x1+(x2-x1)*i/n, y1+(y2-y1)*i/n,
                        x1+(x2-x1)*(i+1)/n, y1+(y2-y1)*(i+1)/n], fill=(20,20,20), width=5)
        elif ca == cb or ra == rb:
            onpath = tuple(sorted((a, b))) in PATH_E
            d.line([x1,y1,x2,y2], fill=((20,20,20) if onpath else (176,176,182)),
                   width=(11 if onpath else 5))
        else:                                            # 轉角：垂直→水平→垂直
            my = (y1+y2)//2
            for seg in ([x1,y1,x1,my],[x1,my,x2,my],[x2,my,x2,y2]):
                d.line(seg, fill=(20,20,20), width=5)

    COL = {'hub':((232,168,56),(26,18,8)), 'sky':((255,255,255),(20,20,20)),
           'end':((20,20,20),(255,255,255)), 'pass':((90,90,96),(255,255,255)),
           'stair':((196,64,64),(255,255,255))}
    for k, (c, r, nm, kind, lv) in NODES.items():
        bg, fg = COL[kind]
        x, y = cx(c)-BW//2, cy(r)-BH//2
        d.rectangle([x, y, x+BW, y+BH], fill=bg, outline=(20,20,20), width=(3 if kind=='sky' else 0))
        L = nm.split('\n')
        for i, ln in enumerate(L):
            bb = d.textbbox((0,0), ln, font=F)
            d.text((cx(c)-(bb[2]-bb[0])/2, cy(r)+(i-(len(L)-1)/2)*28-(bb[3]-bb[1])/2-4), ln, font=F, fill=fg)
        if k in SUN:
            sx, sy, rr = x+BW-21, y+21, 9
            d.ellipse([sx-rr,sy-rr,sx+rr,sy+rr], fill=(240,176,48), outline=(20,20,20), width=2)
            for t in range(8):
                ang = t*math.pi/4
                d.line([sx+math.cos(ang)*(rr+3), sy+math.sin(ang)*(rr+3),
                        sx+math.cos(ang)*(rr+8), sy+math.sin(ang)*(rr+8)], fill=(240,176,48), width=3)

    deg = {}
    for a, b, _ in EDGES:
        if 'sky' in (a, b): continue
        deg[a] = deg.get(a,0)+1; deg[b] = deg.get(b,0)+1
    dst = os.path.join(ROOT, 'resources', 'map', '_layout_tomb.png')
    im.save(dst)
    n = len(NODES)-1; e = len(EDGES)-1
    print('✓ 帝王墓遺跡（提案・西方陵寢／迷宮型）：%d 格・%d 邊・環數 %d' % (n, e, e-n+1))
    for lv in (1,2,3):
        ks = [k for k,v in NODES.items() if v[4]==lv and v[3]!='sky']
        ee = [1 for a,b,_ in EDGES if a!='sky' and b!='sky'
              and NODES[a][4]==lv and NODES[b][4]==lv]
        print('   %s：%2d 格・%2d 邊・層內環數 %d' % (LEVEL_NAME[lv], len(ks), len(ee), len(ee)-len(ks)+1))
    print('   末端 %d：%s' % (sum(1 for k in NODES if deg.get(k)==1),
                             '・'.join(NODES[k][2] for k in NODES if deg.get(k)==1)))
    print('   樞紐 %d：%s' % (sum(1 for k in NODES if deg.get(k,0)>=3),
                             '・'.join('%s(%d)'%(NODES[k][2],deg[k]) for k in NODES if deg.get(k,0)>=3)))
    print('   階梯（層與層之間唯一的通路）：%s'
          % '・'.join(NODES[k][2] for k,v in NODES.items() if v[3]=='stair'))
    print('   有室外光（四時段差分）%d：%s' % (len(SUN), '・'.join(NODES[k][2] for k in SUN)))
    print('   圖量：%d 格單張 ＋ %d 格 ×4 ＝ %d 張' % (n-len(SUN), len(SUN), (n-len(SUN))+len(SUN)*4))
    print('   →', os.path.relpath(dst, ROOT))
main()
