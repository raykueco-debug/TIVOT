# -*- coding: utf-8 -*-
"""從出口方向自動推版面，畫成「縮圖＋名字」的拓樸圖（美術參考用）。

    py tools/map_thumbs.py <地圖id> [--patch resources/map/_<id>_patch.json]

⚠ --patch ＝「提案」版：疊上一份出口改動再畫（改動的線畫粗紅）。
   patch 只是疊在真資料上，**不是另一份拓樸**（鐵律 7）—— 施工完就把 patch 刪掉。

⚠ 連線與方向從 script/town.js 真的跑出來（走 _jsrun），不是手抄 —— 同 map_layout.py 的理由。
⚠ 版面不是手維護的：從 entry 出發 BFS，照 up/down/left/right 的位移擺格子。
   撞格（兩個節點被推到同一格）會回報，那通常代表資料上有方向不一致。
輸出：resources/map/_thumbs_<地圖id>.png
"""
import json, os, re, sys, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _utf8   # noqa
import _font
import _jsrun
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRV = {'up':(0,-1), 'down':(0,1), 'left':(-1,0), 'right':(1,0)}

def load(town):
    src = open(os.path.join(ROOT,'script','town.js'), encoding='utf-8').read()
    src = re.sub(r'^\s*(import|export)\s.*$', lambda m: m.group(0)
                 .replace('export ','').replace('import ','//import '), src, flags=re.M)
    return _jsrun.dump(src + "\nprint(JSON.stringify(TOWNS[%s]));\n" % json.dumps(town),
                       what='地圖資料')

def apply_patch(N, patch):
    """疊上出口改動。回傳 (改動過的邊集合, 被拆掉的出口清單)。值為 null＝拆掉那個出口。"""
    newe=set(); gone=[]
    for nid in (patch.get('_remove') or []):          # 整格拿掉（連指向它的出口一起清）
        if nid in N:
            N.pop(nid)
            for o in N.values():
                ex=o.get('exits') or {}
                for d in [k for k,v in ex.items() if v==nid]:
                    gone.append('%s→%s（該格已移除）'%(d,nid)); ex.pop(d,None)
    for nid,ch in patch.items():
        if nid.startswith('_') or nid not in N: continue
        ex = N[nid].setdefault('exits', {})
        for d,to in ch.items():
            old = ex.get(d)
            if to is None:
                if old: gone.append('%s.%s→%s'%(nid,d,old)); ex.pop(d,None)
                continue
            if old and old != to: gone.append('%s.%s→%s'%(nid,d,old))
            ex[d]=to; newe.add(frozenset((nid,to)))
    return newe, gone


def degrees(N):
    nb={k:set() for k in N}
    for nid,n in N.items():
        for d,to in (n.get('exits') or {}).items():
            if isinstance(to,str) and to in N: nb[nid].add(to); nb[to].add(nid)
    return nb


def place(N, entry):
    pos = {entry:(0,0)}; order=[entry]; clash=[]
    qi=0
    while qi < len(order):
        nid = order[qi]; qi+=1
        cx,cy = pos[nid]
        for d,to in (N[nid].get('exits') or {}).items():
            if d not in DIRV or not isinstance(to,str) or to.startswith('@') or to not in N:
                continue
            dx,dy = DIRV[d]; want=(cx+dx, cy+dy)
            if to in pos:
                if pos[to]!=want: clash.append('%s.%s→%s 位置與既有不符'%(nid,d,to))
                continue
            if want in pos.values():
                # 已被別人佔走：往外推一格，畫得出來就好
                k=2
                while (cx+dx*k, cy+dy*k) in pos.values(): k+=1
                want=(cx+dx*k, cy+dy*k)
                clash.append('%s.%s→%s 撞格，外推到 %s'%(nid,d,to,want))
            pos[to]=want; order.append(to)
    miss=[k for k in N if k not in pos]
    return pos, clash, miss

def thumb(bg, w, h):
    if not bg: return None
    for pat in (bg+'.webp', bg+'_day.webp', bg+'_dawn.webp', bg+'_dusk.webp',
                bg+'_night.webp', bg+'_Day.webp', bg+'*.webp'):
        hit = glob.glob(os.path.join(ROOT,'resources','background','**',pat), recursive=True)
        if hit:
            try: return Image.open(hit[0]).convert('RGB').resize((w,h), Image.LANCZOS)
            except Exception: return None
    return None

def main():
    args=[a for a in sys.argv[1:] if not a.startswith('--')]
    town = args[0]
    pf = sys.argv[sys.argv.index('--patch')+1] if '--patch' in sys.argv else None
    T = load(town); N = T['nodes']; entry = T.get('entry') or list(N)[0]
    newe=set(); gone=[]; okdead=set()
    if pf:
        patch=json.load(open(pf,encoding='utf-8'))
        okdead=set(patch.get('_ok_dead') or [])
        newe,gone = apply_patch(N, patch)
    nb = degrees(N)
    pos, clash, miss = place(N, entry)
    for m in miss: pos[m] = (max(x for x,_ in pos.values())+2, 0)
    TW,TH = 176,117           # 縮圖
    CW,CH = TW+58, TH+52      # 格距
    xs=[p[0] for p in pos.values()]; ys=[p[1] for p in pos.values()]
    x0,y0 = min(xs), min(ys)
    cx=lambda gx: 60+(gx-x0)*CW; cy=lambda gy: 56+(gy-y0)*CH
    W = cx(max(xs))+TW+60; H = cy(max(ys))+TH+70
    im = Image.new('RGB',(W,H),(250,249,246)); d=ImageDraw.Draw(im)
    F=_font.cjk(19); F2=_font.cjk(15)
    # 連線先畫
    for nid,n in N.items():
        for dd,to in (n.get('exits') or {}).items():
            if dd not in DIRV or to not in pos or nid not in pos: continue
            ax,ay=pos[nid]; bx,by=pos[to]
            hot = frozenset((nid,to)) in newe
            d.line([cx(ax)+TW//2, cy(ay)+TH//2, cx(bx)+TW//2, cy(by)+TH//2],
                   fill=(200,40,40) if hot else (150,150,150), width=7 if hot else 4)
    # 再畫格子
    for nid,(gx,gy) in pos.items():
        x,y = cx(gx), cy(gy)
        t = thumb((N.get(nid) or {}).get('bg'), TW, TH)
        if t: im.paste(t,(x,y))
        else: d.rectangle([x,y,x+TW,y+TH], fill=(228,228,228), outline=(150,150,150), width=2)
        deg = len(nb[nid])
        bad = deg<=1 and nid not in okdead
        col = (200,40,40) if bad else ((40,90,190) if deg<=1 else (40,40,40))
        d.rectangle([x-2,y-2,x+TW+2,y+TH+2], outline=col, width=5 if deg<=1 else 2)
        nm=((N.get(nid) or {}).get('name') or nid).split('　')[-1]
        tag = '　← 死路' if bad else ('　← 刻意的死路' if deg<=1 else '')
        d.text((x, y+TH+5), nm+tag, font=F, fill=col)
        d.text((x, y+TH+26), '%s・%d 條路'%(nid,deg), font=F2, fill=(120,120,120))
    dst=os.path.join(ROOT,'resources','map','_thumbs_%s%s.png'%(town,'_proposal' if pf else ''))
    im.save(dst)
    print('✓ %s：%d 格　圖 %dx%d' % (town, len(N), W, H))
    if clash: print('⚠ 版面衝突 %d：' % len(clash)); [print('   ',c) for c in clash[:8]]
    if gone: print('· patch 拆掉的出口 %d：'%len(gone), '　'.join(gone))
    bads=[k for k in N if len(nb[k])<=1 and k not in okdead]
    print('· 死路 %d 格：%s' % (len(bads), '、'.join(
        ((N[k].get('name') or k).split('　')[-1]) for k in bads) or '無'))
    if miss:  print('⚠ 走不到的節點：', miss)
    print('  →', os.path.relpath(dst,ROOT))

if __name__ == '__main__':
    main()
