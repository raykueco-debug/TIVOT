#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/map_layout.py —— 畫「給美術看的佈局簡圖」（ver -909）

    python3 tools/map_layout.py [地圖id]        # 預設 shinier_ruins

⚠⚠⚠ **連線是從 `script/town.js` 讀出來的，不是手抄的**（借 jsc，同 script_lint.py）。
  -908 那張是我把節點與邊手打進畫圖腳本裡的 —— 那等於同一份拓樸有兩個真相
  （鐵律 7），Ray 每改一次我就要記得兩邊都改，漏一次就是「圖跟遊戲不一樣」，
  而美術照著那張畫出來的小地圖會**永久錯下去**（他們沒有辦法驗）。

⚠ 唯一手維護的是 `POS`（每一格畫在哪一格網格）—— 那是**版面**，資料裡沒有。
  ⚠⚠ 但版面**不能亂擺**：出口的方向就是相對位置（`left` 的鄰居要畫在左邊…），
    所以擺完會**自動驗一次**，方向對不上就報錯不出圖。這樣圖與箭頭一定一致。

輸出：`resources/map/_layout_<地圖id>.png`（底線開頭＝遊戲不載入，是工單附件）。
"""
import json, os, subprocess, sys, re
import _font                # 字型解析的唯一一處（見 tools/_font.py）
import _utf8  # noqa: F401  # 主控台 UTF-8（中文 Windows 的 cp950），見 tools/_utf8.py
import _jsrun               # JS 資料的唯一引擎（jsc／node），見 tools/_jsrun.py

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── 版面：每一格畫在第幾欄第幾列（左上為原點）───────────────────────────
#    ⚠ 只有這一張表是手維護的；連線與名字都從資料讀。
#    ⚠ 改動之後跑一次就好 —— 方向驗不過會直接報錯。
POS = {
  # ── 帝都（ver -915）：廣場為中心，三個街區各帶自己的末端 ──────────────
  'capital': {
    'midtown':(5,3), 'cityhall':(3,3), 'church':(7,3),
    'dock':(2,4),    'inn':(8,4),
    'gunstore':(0,6),'oldtown':(2,6), 'square':(5,6), 'uptown':(8,6), 'tavern':(10,6),
    'guild':(2,8),   'grocery':(8,8),
  },
  # ── 貝利薩爾遺址（ver -1396）：38 格・41 邊・4 環 ────────────────────
  #   ⚠ 這一張**排不進標準的直角格**（見 BEND）：欄列之間刻意留空，
  #     版面只保證「方向的正負號」對（left 的鄰居欄號比較小），不保證剛好差 1。
  'belisar': {
    'crown':(0,0), 'throne':(1,0), 'offering':(2,0),
    'antecham':(1,1),
    'dragstair':(3,2),
    'starroom':(1,3), 'guardhall':(3,3), 'greathall':(5,3), 'lamphall':(6,3), 'ossuary':(7,3),
    'drywell':(0,4), 'forge':(1,4), 'incense':(2,4), 'mirrorpool':(3,4), 'wardtomb':(7,4),
    'rooffall':(0,5), 'muralwalk':(1,5), 'trihall':(2,5), 'culvert':(3,5), 'pillars':(6,5), 'dragonrace':(8,5), 'draincliff':(9,5),
    'cages':(2,6), 'oldtomb':(3,6), 'capstan':(4,6), 'waterjail':(6,6), 'bonerack':(7,6), 'bellroom':(8,6), 'stairwell':(9,6),
    'stelae':(3,7), 'stephall':(4,7), 'floodway':(5,7), 'candlewalk':(6,7), 'mirrorway':(7,7),
    'foyer':(4,8), 'altar':(5,8),
    'entrance':(4,9),
  },
  # ── 北方泊地（ver -915）──────────────────────────────────────────
  'northport': {
    'cemetery':(5,1),
    'cityhall':(3,3), 'north':(5,3), 'church':(7,3),
    'port':(2,4),     'inn':(8,4),
    'gunstore':(0,6), 'west':(2,6), 'entrance':(5,6), 'east':(8,6), 'tavern':(10,6),
    'guild':(2,8),    'grocery':(8,8),
  },
  # ── 夏爾村（ver -915）────────────────────────────────────────────
  'shinier': {
    'lakeside':(5,1),
    'chief':(3,3), 'north':(5,3), 'altar':(7,3),
    'wild':(2,4),  'sorahome':(8,4),
    'workshop':(0,6), 'west':(2,6), 'plaza':(5,6), 'east':(8,6), 'restaurant':(10,6),
    'hunter':(2,8),   'grocery':(8,8),
  },
  'shinier_ruins': {
    'deepaltar':(3,4), 'bridge':(3,5), 'colossus':(4,5), 'machine':(5,5),
    'collapsed':(2,6), 'brazier':(3,6), 'well':(4,6),
    'mural':(2,7), 'stairup':(3,7), 'crossway':(4,7),
    'corridora':(4,8), 'antechamber':(5,8), 'corridorb':(7,8),
    'stairdeep':(7,7), 'catacomb':(7,6), 'hollow':(7,5), 'deepspring':(7,4),
    'prison':(6,5),
    'mosschamber':(8,5), 'rift':(8,4), 'darkbridge':(8,3),
  },
  # ── 石製遺蹟（ver -1123）：一條主軸，中間一次岔路（左＝沉水石坑）──────
  'fallen': {
    'altar':(2,1),
    'basin':(0,2), 'fork':(2,2),
    'causeway':(2,3),
    'entry':(2,4),
  },
  # ══ 伊甸古墓（ver -1134）：三層・34 格・樹狀迷宮 ══════════════════════
  #   ⚠ (欄,列) 照美術提案期那份草圖抄（`tools/map_tomb_draft.py` 的 NODES）——
  #     那一支 ver -1141 已**回收**（拓樸進了 town.js，權威佈局改由這裡產，鐵律 7），
  #     所以現在**這一排就是版面的唯一真相**：`_layout_tomb.png` 與小地圖的合成器
  #     （`tools/map_compose.py`）都讀它。逐格的樣子見 `resources/map/_tomb_spec.md`。
  #   ⚠ **列越小＝越深**（第三層在最上面）：`up` 一律是「走進畫面裡」不是「往高處」
  #     （§6.5.4），所以往下挖的三層畫成由上而下的三段，正好對得上。
  #   ⚠⚠ 拓樸現在住在 `script/town.js`（這一支直接讀它）—— 草圖那一支是**提案期**
  #     的產物，它自己的檔頭就寫著「搬進去之後這一支要回收掉」（鐵律 7：同一個
  #     拓樸不留兩份）。回收由美術那一邊做（那是他們的檔）。
  'tomb': {
    'bonepit':(4,0),
    'crypt':(6,0),
    'vaultW':(4,1),
    'gallery3':(6,1),
    'landing3':(6,2),
    'stair2':(6,4),
    'cistern':(4,5),
    'ossuary':(6,5),
    'nichehall':(8,5),
    'kiln':(12,5),
    'hall2':(4,6),
    'corr2':(6,6),
    'rotunda':(8,6),
    'sarcE':(10,6),
    'ossuary2':(12,6),
    'landing2':(4,7),
    'sump':(6,7),
    'reliquary':(8,9),
    'stair1':(4,10),
    'cloister':(6,10),
    'apse':(8,10),
    'ambulatory':(10,10),
    'chantry':(6,11),
    'crossing':(8,11),
    'chapel':(10,11),
    'tombniche':(4,12),
    'aisleW':(6,12),
    'nave':(8,12),
    'cryptA':(12,12),
    'charnel':(4,13),
    'vestibule':(8,13),
    'lapidarium':(10,13),
    'ossuaryA':(12,13),
    'gate':(8,14),
  },
  # ── 東方泊地（ver -1255）：拓樸＝帝都 **＋ 大學一格**（Ray：「在中央區加一個
  #    大學分支」）。大學掛在中心區的 `up`，所以版面上它必須畫在中心區**正上方**
  #    —— 出口的方向就是相對位置，畫錯這支工具會直接報錯不出圖。
  'eastport': {
    'university':(5,1),
    'midtown':(5,3), 'cityhall':(3,3), 'church':(7,3),
    'dock':(2,4),    'inn':(8,4),
    'gunstore':(0,6),'oldtown':(2,6), 'square':(5,6), 'uptown':(8,6), 'tavern':(10,6),
    'guild':(2,8),   'grocery':(8,8),
  },
  # ── 聖索菲亞城（ver -1123）：拓樸＝帝都，所以版面直接沿用 capital 那一組 ──
  'santasofia': {
    'midtown':(5,3), 'cityhall':(3,3), 'church':(7,3),
    'dock':(2,4),    'inn':(8,4),
    'gunstore':(0,6),'oldtown':(2,6), 'square':(5,6), 'uptown':(8,6), 'tavern':(10,6),
    'guild':(2,8),   'grocery':(8,8),
  },
}
# 跨圖出口畫成一個虛線框（`@<圖>:<格>` → 標題）
OUT_POS = {
  'shinier_ruins': {'@shinier_forest:ruins': (5,9, '遺蹟\n入口')},
  'shinier':       {'@shinier_forest':      (2,2, '夏爾\n森林')},
}

def load(town):
    """把 TOWNS 真的跑出來（走 tools/_jsrun.py，不用 regex 猜資料）。"""
    src = open(os.path.join(ROOT,'script','town.js'), encoding='utf-8').read()
    src = re.sub(r'^\s*(import|export)\s.*$', lambda m: m.group(0)
                 .replace('export ','').replace('import ','//import '), src, flags=re.M)
    js = src + "\nprint(JSON.stringify(TOWNS[%s]));\n" % json.dumps(town)
    return _jsrun.dump(js, what='地圖資料')

# ══⚠⚠⚠ **彎線的例外清單**（ver -1396）══════════════════════════════════════
#   有些地圖排不進直角格子：一條邊的兩端方向對、但**環繞一圈的方向和不是零**，
#   於是無論怎麼擺，總有幾條邊的相對位置與它宣告的方向對不上。
#   那幾條就列在這裡，畫成**灰色虛線**（＝「這條是繞過去的，不要照它讀方向」）。
#
#   ⚠⚠⚠ **這是例外清單，不是關掉驗證** —— 沒列進來的邊照舊硬驗、對不上就不出圖。
#     （鐵律 13 的同一條：安全的那一側是預設。漏列的下場是「報錯」不是「靜靜畫歪」。）
#   ⚠ 列進來之前要先確認它**不是 bug**：`script_lint.py` 驗的「兩端相反」與
#     「一直按同一個方向會不會繞回來」都要先過。過不了就是資料錯，不是版面問題。
BEND = {
  # 貝利薩爾遺址（ver -1396 實測）：4 個環裡有 3 個的方向和不是零。
  # 兩端相反 41/41 通過、38 格 × 4 向都走得出去 ⇒ 玩起來沒問題，只是畫不直。
  'belisar': {('bonerack','mirrorway'), ('greathall','guardhall'), ('incense','muralwalk'), ('lamphall','ossuary')},
}
def bent(town, a, b):
    s = BEND.get(town) or set()
    return (a,b) in s or (b,a) in s

OPP = {'up':'down','down':'up','left':'right','right':'left'}
def main():
    town = sys.argv[1] if len(sys.argv)>1 else 'shinier_ruins'
    T = load(town); N = T['nodes']
    pos = POS[town]; outs = OUT_POS.get(town, {})
    miss = [k for k in N if k not in pos]
    if miss: print('POS 少了這幾格：', miss); sys.exit(1)

    # ── 邊（去重）＋ 方向驗證 ────────────────────────────────────────
    edges, err, bends = set(), [], set()
    for nid, n in N.items():
        for d, to in (n.get('exits') or {}).items():
            if d == 'back':                      # 由引擎現算成來時反向，畫線就好
                edges.add(tuple(sorted((nid,to)))) if to in N else None
                continue
            if isinstance(to,str) and to.startswith('@'):
                if to in outs: edges.add((nid,to))
                continue
            if to not in N: continue
            edges.add(tuple(sorted((nid,to))))
            # 方向＝相對位置：left 的鄰居要畫在左邊，up 的要畫在上面
            if bent(town, nid, to):          # 明寫的彎線：不驗方向，畫成虛線
                bends.add(tuple(sorted((nid,to)))); continue
            (c1,r1),(c2,r2) = pos[nid], pos[to]
            ok = {'left': c2<c1, 'right': c2>c1, 'up': r2<r1, 'down': r2>r1}[d]
            if not ok: err.append('%s.%s→%s：資料說在%s，版面卻不是' % (nid,d,to,d))
    if err:
        print('✗ 版面與資料的方向對不上（POS 要改）：'); [print('  ', e) for e in err]; sys.exit(1)

    from PIL import Image, ImageDraw, ImageFont
    CW,CH,BW,BH = 152,128,120,86
    cols=[c for c,_ in pos.values()]+[v[0] for v in outs.values()]
    rows=[r for _,r in pos.values()]+[v[1] for v in outs.values()]
    c0,r0 = min(cols), min(rows)
    cx=lambda c:100+(c-c0)*CW; cy=lambda r:96+(r-r0)*CH
    W,H = cx(max(cols))+BW//2+60, cy(max(rows))+BH//2+60
    im=Image.new('RGB',(W,H),(255,255,255)); d=ImageDraw.Draw(im)
    F=_font.cjk(27)

    def at(k):
        if k in pos: return pos[k]
        return outs[k][0], outs[k][1]
    def seg(x1,y1,x2,y2,col,w,dash):
        if not dash: d.line([x1,y1,x2,y2],fill=col,width=w); return
        n=max(1,int(((x2-x1)**2+(y2-y1)**2)**.5//18))    # 虛線：18px 一段
        for i in range(n):
            if i%2: continue
            t1,t2=i/n,(i+1)/n
            d.line([x1+(x2-x1)*t1, y1+(y2-y1)*t1, x1+(x2-x1)*t2, y1+(y2-y1)*t2], fill=col, width=w)
    for a,b in sorted(edges):
        (ac,ar),(bc,br) = at(a), at(b)
        x1,y1,x2,y2 = cx(ac),cy(ar),cx(bc),cy(br)
        dash = tuple(sorted((a,b))) in bends
        col,w = ((150,150,150),4) if dash else ((20,20,20),5)
        if ac==bc or ar==br: seg(x1,y1,x2,y2,col,w,dash)
        else:                                       # 轉角：垂直→水平→垂直
            my=(y1+y2)//2
            for s4 in ([x1,y1,x1,my],[x1,my,x2,my],[x2,my,x2,y2]):
                seg(s4[0],s4[1],s4[2],s4[3],col,w,dash)
    # 抉擇點（三向以上）標橘色，同 Ray 的佈局圖
    deg={}
    for a,b in edges: deg[a]=deg.get(a,0)+1; deg[b]=deg.get(b,0)+1
    def box(k,label,kind):
        c,r = at(k); bg,fg = ((232,168,56),(26,18,8)) if kind=='hub' else \
                             ((255,255,255),(20,20,20)) if kind=='out' else ((20,20,20),(255,255,255))
        x,y = cx(c)-BW//2, cy(r)-BH//2
        d.rectangle([x,y,x+BW,y+BH],fill=bg,outline=(20,20,20),width=(3 if kind=='out' else 0))
        L=label.split('\n')
        for i,ln in enumerate(L):
            bb=d.textbbox((0,0),ln,font=F)
            d.text((cx(c)-(bb[2]-bb[0])/2, cy(r)+(i-(len(L)-1)/2)*33-(bb[3]-bb[1])/2-4),ln,font=F,fill=fg)
    def short(nm):
        nm = nm.split('　')[-1]
        return nm if len(nm)<=3 else nm[:2]+'\n'+nm[2:]
    for k,n in N.items():
        box(k, short(n.get('name') or k), 'hub' if deg.get(k,0)>=3 else 'pass')
    for k,(c,r,lb) in outs.items(): box(k, lb, 'out')

    dst = os.path.join(ROOT,'resources','map','_layout_%s.png'%town)
    im.save(dst)
    ends=[k for k in N if deg.get(k,0)==1]
    hubs=[k for k in N if deg.get(k,0)>=3]
    print('✓ %s：%d 格・%d 邊・環數 %d' % (town,len(N),len(edges)-len(outs),
                                        len(edges)-len(outs)-len(N)+1))
    print('  末端 %d：%s' % (len(ends), '・'.join(N[k]['name'].split('　')[-1] for k in ends)))
    print('  抉擇點 %d：%s' % (len(hubs), '・'.join(
        '%s(%d)'%(N[k]['name'].split('　')[-1],deg[k]) for k in hubs)))
    print('  →', os.path.relpath(dst,ROOT))

if __name__ == '__main__':
    main()
