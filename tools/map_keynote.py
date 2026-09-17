#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/map_keynote.py —— 把**現有的拓樸**出成一份可以在 Keynote 裡自己排的簡報
（ver -1436，Ray：「把現有的拓樸出成 kenote 給我，**縮圖跟地名同一個物件**」）

    python3 tools/map_keynote.py                 # 全部探索地圖，一張圖一頁
    python3 tools/map_keynote.py belisar tomb    # 只出這幾張

輸出：`resources/map/_topology.pptx`（底線開頭＝遊戲不載入；**Keynote 直接開得了 .pptx**）

⚠⚠⚠ **連線與節點是從 `script/town.js` 讀出來的，不是手抄的**（借 `tools/_jsrun.py`，
  同 `map_layout.py`／`script_lint.py`）—— 手抄一份就是同一個拓樸兩個真相（鐵律 7）。

⚠⚠ **一格＝一個群組**（Ray 指定）：縮圖與地名包在同一個 `p:grpSp` 裡，
  在 Keynote 裡拖曳時**一定一起走**。python-pptx 沒有「建立群組」的 API，
  所以那一段是手寫 XML（見 `group_shapes`）。

⚠ **版面是自動排的，排完就交給 Ray 改**（憲法 -907：拓樸是他的設計，版面也是）——
  這支工具只保證「初始位置符合出口方向、而且不重疊」，好不好看由他在 Keynote 裡調。
  · `up` 往上、`down` 往下、`left`／`right` 往兩側（＝遊戲裡箭頭的方向）
  · 佔掉的格子用螺旋往外找最近的空位，所以密的圖會被撐開，不會疊在一起
⚠ 跨圖出口（`@<圖>:<格>`）畫成一個小方塊：那一格通到別張圖，Ray 排版時要看得見。
"""
import os, re, sys, collections, copy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _jsrun
try: import _utf8  # noqa: F401
except Exception: pass
from PIL import Image
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR
from pptx.oxml.ns import qn

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG   = os.path.join(ROOT, 'resources', 'background')
OUT  = os.path.join(ROOT, 'resources', 'map', '_topology.pptx')
CACHE= os.path.join(ROOT, 'resources', 'map', '_thumbs')

SLIDE_W, SLIDE_H = Emu(12192000), Emu(6858000)          # 16:9
THUMB_W, THUMB_H = Emu(1000000), Emu(560000)            # 一格的縮圖（約 2.6cm）
LABEL_H          = Emu(230000)
MARGIN           = Emu(420000)
TOP              = Emu(900000)

# ── 背景圖：從基底名找一張真的存在的檔（簡化版的候選鏈，白天優先）────────────
EXTS  = ('.webp', '.png', '.jpg', '.jpeg')
BANDS = ('_day', '_Day', '', '_dawn', '_Dawn', '_dusk', '_Dusk', '_night', '_Night')
_index = None
def bg_index():
    """整個 background/ 建一張「小寫檔名（去副檔名）→ 路徑」的表，只掃一次。"""
    global _index
    if _index is None:
        _index = {}
        for dp, _dn, fns in os.walk(BG):
            for fn in fns:
                stem, ext = os.path.splitext(fn)
                if ext.lower() in EXTS:
                    _index.setdefault(stem.lower(), os.path.join(dp, fn))
    return _index
def find_bg(base):
    if not base: return None
    ix = bg_index()
    for b in BANDS:
        p = ix.get((base + b).lower())
        if p: return p
    return None

def thumb(path, key):
    """縮圖快取 —— **JPEG 不是 PNG**：196 張 320px 的 PNG 讓檔案變成 24 MB
    （實測），JPEG q82 之後 3 MB 上下。webp 不直接嵌（pptx 相容性不好）。"""
    os.makedirs(CACHE, exist_ok=True)
    out = os.path.join(CACHE, key + '.jpg')
    if not os.path.exists(out):
        im = Image.open(path).convert('RGB')
        im.thumbnail((280, 280 * im.height // max(1, im.width)), Image.LANCZOS)
        im.save(out, 'JPEG', quality=82, optimize=True)
    return out

# ── 版面：照出口方向排格子 ────────────────────────────────────────────────
DIRV = { 'up':(0,-1), 'down':(0,1), 'left':(-1,0), 'right':(1,0) }
def layout(nodes, entry):
    """BFS 依方向配網格座標；位子被佔就螺旋往外找最近的空位。"""
    pos, used = {}, {}
    start = entry if (entry and entry in nodes) else next(iter(nodes))
    pos[start] = (0, 0); used[(0, 0)] = start
    q = collections.deque([start])
    while q:
        cur = q.popleft(); cx, cy = pos[cur]
        for d, to in (nodes[cur].get('exits') or {}).items():
            if d == 'back' or not isinstance(to, str) or to.startswith('@'): continue
            if to not in nodes or to in pos: continue
            dx, dy = DIRV.get(d, (1, 0))
            want = (cx + dx, cy + dy)
            if want in used:                       # 螺旋找最近的空位
                r = 1
                while want in used and r < 12:
                    for ox in range(-r, r + 1):
                        for oy in range(-r, r + 1):
                            if max(abs(ox), abs(oy)) != r: continue
                            c = (cx + dx * r + ox, cy + dy * r + oy)
                            if c not in used: want = c; break
                        if want not in used: break
                    r += 1
            pos[to] = want; used[want] = to; q.append(to)
    for nid in nodes:                              # 走不到的（資料有洞）也要有位子
        if nid in pos: continue
        c = (0, 0); r = 1
        while c in used: c = (r, -r); r += 1
        pos[nid] = c; used[c] = nid
    return pos

# ── 群組：python-pptx 沒有 API，手寫 `p:grpSp` ──────────────────────────────
def group_shapes(slide, shapes, name):
    """把既有的幾個 shape 搬進一個群組（Keynote 匯入後就是一個可拖曳的物件）。"""
    spTree = slide.shapes._spTree
    xs=[s.left for s in shapes]; ys=[s.top for s in shapes]
    x2=[s.left+s.width for s in shapes]; y2=[s.top+s.height for s in shapes]
    L,T2,R,B = min(xs), min(ys), max(x2), max(y2)
    grp = spTree.makeelement(qn('p:grpSp'), {})
    nv  = spTree.makeelement(qn('p:nvGrpSpPr'), {})
    c   = spTree.makeelement(qn('p:cNvPr'), {'id':str(9000+len(spTree)), 'name':name})
    nv.append(c); nv.append(spTree.makeelement(qn('p:cNvGrpSpPr'), {}))
    nv.append(spTree.makeelement(qn('p:nvPr'), {}))
    grp.append(nv)
    gsp = spTree.makeelement(qn('p:grpSpPr'), {})
    xfrm= spTree.makeelement(qn('a:xfrm'), {})
    for tag, a, b in (('a:off','x','y'), ('a:ext','cx','cy'), ('a:chOff','x','y'), ('a:chExt','cx','cy')):
        e = spTree.makeelement(qn(tag), {})
        e.set(a, str(L if 'off' in tag.lower() else R-L))
        e.set(b, str(T2 if 'off' in tag.lower() else B-T2))
        xfrm.append(e)
    gsp.append(xfrm); grp.append(gsp)
    for s in shapes:
        spTree.remove(s._element); grp.append(s._element)
    spTree.append(grp)
    return grp

def build(maps, T):
    prs = Presentation(); prs.slide_width, prs.slide_height = SLIDE_W, SLIDE_H
    blank = prs.slide_layouts[6]
    for tid in maps:
        t = T[tid]; nodes = t.get('nodes') or {}
        if not nodes: continue
        # ⚠ `firstEntry` 有的圖寫成物件（`{node, need}`）—— 兩種都要接得住。
        entry = t.get('firstEntry') or t.get('entry')
        if isinstance(entry, dict): entry = entry.get('node') or t.get('entry')
        if not isinstance(entry, str): entry = None
        pos = layout(nodes, entry)
        xs = [p[0] for p in pos.values()]; ys = [p[1] for p in pos.values()]
        # ══⚠⚠ **整張圖要塞得進一頁**（-1436 第一版沒做，37 格的貝利薩爾下緣被切掉）══
        #   格距先取「一格該有多大」，超出可用範圍就整體等比縮小（縮圖、字、間距一起）。
        #   ⚠ 縮的是**版面**不是拓樸：Ray 在 Keynote 裡照樣拖得動、拖到哪都行。
        cols = max(xs) - min(xs) + 1; rows = max(ys) - min(ys) + 1
        availW = SLIDE_W - MARGIN * 2; availH = SLIDE_H - TOP - Emu(260000)
        # ⚠ 字框**不跟著等比縮**（縮到讀不出來就沒意義），所以算 k 的時候要用
        #   **它真正會佔的高度**（`LAB_K`）—— 不然最底下那一排的標記會被切掉。
        LAB_K = 1.7
        k = min(1.0, availW / (cols * (THUMB_W + Emu(220000))),
                     availH / (rows * (THUMB_H + LABEL_H * LAB_K + Emu(200000))))
        tw = Emu(int(THUMB_W * k)); th = Emu(int(THUMB_H * k))
        lh = Emu(int(LABEL_H * max(k, 0.5) * LAB_K))
        cw = tw + Emu(int(220000 * k)); ch = th + lh + Emu(int(200000 * k))
        fs = max(6.0, 9 * (0.55 + 0.45 * k))         # 字級跟著縮，但有下限
        slide = prs.slides.add_slide(blank)
        # 頁首
        tb = slide.shapes.add_textbox(MARGIN, Emu(220000), SLIDE_W - MARGIN*2, Emu(500000))
        p = tb.text_frame.paragraphs[0]
        r = p.add_run(); r.text = f"{t.get('name', tid)}　（{tid}）　{len(nodes)} 格"
        r.font.size = Pt(22); r.font.bold = True
        # 整張圖在頁面上置中（k 多半由「高」決定 ⇒ 右邊會空一大片）
        offX = MARGIN + Emu(max(0, int((availW - cols * cw) / 2)))
        offY = TOP    + Emu(max(0, int((availH - rows * ch) / 2)))
        def xy(nid):
            gx, gy = pos[nid]
            return (offX + Emu(int((gx - min(xs)) * cw)), offY + Emu(int((gy - min(ys)) * ch)))
        # ① 每一格：縮圖 ＋ 地名 → **同一個群組**
        pics = {}
        for nid, nd in nodes.items():
            x, y = xy(nid)
            src = find_bg(nd.get('bg'))
            if src:
                pic = slide.shapes.add_picture(thumb(src, nd['bg']), x, y, tw, th)
            else:
                pic = slide.shapes.add_shape(1, x, y, tw, th)   # 沒有圖＝灰方塊
                pic.fill.solid(); pic.fill.fore_color.rgb = RGBColor(0xDD, 0xDD, 0xDD)
                pic.line.color.rgb = RGBColor(0x99, 0x99, 0x99)
            lab = slide.shapes.add_textbox(x, y + th, tw, lh)
            tf = lab.text_frame; tf.word_wrap = True
            pp = tf.paragraphs[0]
            nm = (nd.get('name') or nid)
            nm = nm.split('　')[-1] if '　' in nm else nm         # 去掉「城名　」前綴
            rr = pp.add_run(); rr.text = f"{nm}\n{nid}"
            rr.font.size = Pt(fs)
            mark = []
            if nid == entry: mark.append('入口')
            if nd.get('rest'): mark.append('休息處')
            if nd.get('inn'):  mark.append('旅店')
            for d, to in (nd.get('exits') or {}).items():
                if isinstance(to, str) and to.startswith('@'): mark.append('→'+to)
            if mark:
                r2 = pp.add_run(); r2.text = '\n' + '／'.join(mark)
                r2.font.size = Pt(max(5.5, fs - 1)); r2.font.color.rgb = RGBColor(0xC0, 0x30, 0x20)
            pics[nid] = pic
            group_shapes(slide, [pic, lab], f'{tid}:{nid}')
        # ② 連線：**綁在兩端的縮圖上**（ver -1436b）——
        #    ⚠⚠ 第一版沒綁，於是 Ray 在 Keynote 裡把格子拖開之後，線**留在原地**：
        #      圖看起來還是整齊的，但那幾條線與格子已經沒有關係了，
        #      **而且從圖上看不出來**（我因此在回推拓樸時判讀不出正確的邊）。
        #    ⚠ 要在**群組之後**綁：群組不改 shape 的 id，連接關係照樣成立。
        #    ⚠ 綁的是群組裡的**縮圖**（picture）—— 群組一起走，線自然跟著。
        seen = set()
        conns = []
        for nid, nd in nodes.items():
            for d, to in (nd.get('exits') or {}).items():
                if d == 'back' or not isinstance(to, str): continue
                if to.startswith('@') or to not in nodes: continue
                key = tuple(sorted((nid, to)))
                if key in seen: continue
                seen.add(key)
                (ax, ay), (bx, by) = xy(nid), xy(to)
                cn = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT,
                        ax + tw//2, ay + th//2, bx + tw//2, by + th//2)
                cn.line.color.rgb = RGBColor(0x99, 0x99, 0x99); cn.line.width = Pt(1.5)
                try:
                    cn.begin_connect(pics[nid], 0); cn.end_connect(pics[to], 0)
                except Exception:
                    pass          # 綁不上就只是一條擺對位置的線（不要因此不畫）
                conns.append(cn)
        # 線沉到最底層（在縮圖後面）
        spTree = slide.shapes._spTree
        for cn in conns:
            el = cn._element; spTree.remove(el); spTree.insert(2, el)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    prs.save(OUT)
    return OUT

def main():
    src = open(os.path.join(ROOT, 'script', 'town.js'), encoding='utf-8').read()
    src = re.sub(r'^\s*(import|export)\s.*$', lambda m: m.group(0)
                 .replace('export ', '').replace('import ', '//import '), src, flags=re.M)
    T = _jsrun.dump(src + "\nprint(JSON.stringify(TOWNS));\n", what='TOWNS')
    want = [a for a in sys.argv[1:] if not a.startswith('-')]
    maps = want or sorted(T.keys(), key=lambda k: -len((T[k].get('nodes') or {})))
    bad = [m for m in maps if m not in T]
    if bad: print('沒有這幾張圖：', bad); return 1
    out = build(maps, T)
    print('出好了：', out)
    print('  ', len(maps), '頁 ／', sum(len(T[m].get('nodes') or {}) for m in maps), '格')
    print('  Keynote 直接開它；一格是一個群組（縮圖＋地名），拖曳時一起走。')
    return 0

if __name__ == '__main__':
    sys.exit(main())
