#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把一張地圖的**拓樸**排成可編輯的 PowerPoint（ver -1571，Ray：「拓樸出 ppt 給我，
   每一格要有地名跟背景縮圖一組，讓我可以編輯」）。

   一格 ＝ 一張背景縮圖 ＋ 一個地名文字框，**兩者是同一個 group**（在 PowerPoint 裡
   一起拖、一起縮），連線用真的 connector（拖動格子時線會跟著走）。

   ⚠⚠⚠ **版面與連線都從 `script/town.js` 讀**（鐵律 7：圖與遊戲不可能走鐘）——
     欄列位置沿用 `tools/map_layout.py` 的 `POS`（那是版面的唯一真相，那支工具
     畫完還會自動驗「`left` 的鄰居有沒有畫在左邊」）。
   ⚠ 背景縮圖走**真的候選鏈**（`bandNames` 那一套的 Python 版：時段 → 大小寫 →
     副檔名）—— 拿節點的 `bg` 去硬拼檔名會漏掉一半（§6.5.4 的 -910／-1293）。
   ⚠ 找不到圖的格子**照樣出**，只是縮圖換成一塊灰底 ＋「（無背景）」：
     缺圖不該讓整張表消失，而且那正是要看的資訊。

   用法：  python3 tools/map_pptx.py tomb
"""
import os, re, sys, json, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import map_layout as ML
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE

ROOT = ML.ROOT
BANDS = ['day','dusk','night','dawn','midnight']          # 縮圖優先拿白天那一張
EXTS  = ['.webp','.png','.jpg','.jpeg']

def bg_path(base):
    """節點的 `bg` → 真的存在的一個檔（走候選鏈；找不到回 None）。"""
    if not base: return None
    roots = [os.path.join(ROOT,'resources','background')]
    cands = []
    for b in BANDS: cands.append(base+'_'+b)
    cands.append(base)
    for nm in cands:
        for e in EXTS:
            for r in roots:
                hit = glob.glob(os.path.join(r,'**',nm+e), recursive=True)
                if hit: return hit[0]
                hit = glob.glob(os.path.join(r,'**',nm.lower()+e), recursive=True)
                if hit: return hit[0]
    return None

THUMB_DIR = os.path.join(os.environ.get('TMPDIR','/tmp'), 'tivot_map_thumbs')

def thumb(src, w=520):
    """WebP → PowerPoint 吃得下的 JPEG 縮圖。

    ⚠⚠ **python-pptx／PowerPoint 不吃 WebP**（只認 BMP/GIF/JPEG/PNG/TIFF/WMF）——
      直接塞進去會在 `add_picture` 當場丟 ValueError。而本專案的背景**全部是 WebP**
      （§5 的規約），所以這一步是必要的，不是最佳化。
    ⚠ 縮圖存在系統暫存夾、**不進版控**：它是產出物的中間檔，pptx 已經把像素包進去了。
    ⚠ 裁成 16:9：背景本來就是那個比例，但少數幾張不是 —— 不裁的話格子會高矮不一。"""
    from PIL import Image
    os.makedirs(THUMB_DIR, exist_ok=True)
    out = os.path.join(THUMB_DIR, re.sub(r'[^A-Za-z0-9_.-]','_',os.path.basename(src))+'.jpg')
    if os.path.exists(out): return out
    im = Image.open(src).convert('RGB')
    W,H = im.size; want = 16/9
    if W/H > want:                      # 太寬 → 裁左右
        nw = int(H*want); im = im.crop(((W-nw)//2,0,(W-nw)//2+nw,H))
    else:                               # 太高 → 裁上下
        nh = int(W/want); im = im.crop((0,(H-nh)//2,W,(H-nh)//2+nh))
    im.resize((w, int(w/want)), Image.LANCZOS).save(out, quality=86)
    return out

def main():
    town = (sys.argv[1] if len(sys.argv)>1 else 'tomb')
    T = ML.load(town)
    nodes = T.get('nodes') or {}
    pos = (ML.POS.get(town) or {})
    if not pos: print('✘ tools/map_layout.py 的 POS 沒有這張圖：', town); return 1

    # ── 版面：一格 = 縮圖 + 地名，格距由欄列推
    CW, CH = Emu(1_500_000), Emu(1_150_000)        # 一格的位置間距
    IW, IH = Emu(1_280_000), Emu(720_000)          # 縮圖大小（16:9）
    TH     = Emu(300_000)                          # 地名那一條
    MX, MY = Emu(300_000), Emu(700_000)
    cols = max(c for c,_ in pos.values())+1
    rows = max(r for _,r in pos.values())+1

    prs = Presentation()
    prs.slide_width  = MX*2 + CW*cols
    prs.slide_height = MY + Emu(300_000) + CH*rows
    s = prs.slides.add_slide(prs.slide_layouts[6])

    ttl = s.shapes.add_textbox(MX, Emu(160_000), CW*cols, Emu(420_000))
    tf = ttl.text_frame; tf.text = (T.get('name') or town) + '　拓樸'
    tf.paragraphs[0].runs[0].font.size = Pt(30)
    tf.paragraphs[0].runs[0].font.bold = True
    p2 = tf.add_paragraph()
    p2.text = ('%d 格・每一格是「縮圖＋地名」的群組，可以直接拖；連線是 connector，'
               '拖格子時會跟著走' % len(nodes))
    p2.runs[0].font.size = Pt(12); p2.runs[0].font.color.rgb = RGBColor(0x7a,0x78,0x7e)

    def xy(k):
        c,r = pos[k]
        return MX + CW*c, MY + Emu(300_000) + CH*r

    boxes = {}
    miss  = []
    for k,n in nodes.items():
        if k not in pos: continue
        x,y = xy(k)
        # 一格 ＝ 縮圖＋地名**同一個群組** —— 在 PowerPoint 裡一起拖、一起縮
        
        grp = s.shapes.add_group_shape()      # ⚠ 一格＝一個 group（Ray：「一組」）
        shapes = grp.shapes
        # ⚠⚠⚠ **借圖的一律畫綠方塊，不要放代圖**（ver -1637，Ray：「沒圖的不要用代圖，
        #   這樣美術比較容易知道哪些要補，沒圖的就用綠方塊」）——
        #   判準是節點上的 `bgPending`（＝資料自己宣告「這張還沒交件」），
        #   不是「bg 欄位是不是空的」：借圖的那幾格 `bg` 是**有值**的（同族的現有圖），
        #   照 `bg` 去畫的話美術看到的是一張看起來已經有的圖。
        pend = n.get('bgPending')
        src  = None if pend else bg_path(n.get('bg'))
        if src:
            shapes.add_picture(thumb(src), x, y, IW, IH)
        else:
            miss.append(k)
            ph = shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, IW, IH)
            ph.fill.solid(); ph.fill.fore_color.rgb = RGBColor(0x3f,0xb9,0x50)   # 綠方塊＝要補圖
            ph.line.color.rgb = RGBColor(0x2b,0x8a,0x3a)
            want = pend if isinstance(pend,str) else ''
            ph.text_frame.text = ('要補圖\n'+want) if want else '要補圖'
            for para in ph.text_frame.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(9); run.font.bold = True
                    run.font.color.rgb = RGBColor(0xff,0xff,0xff)

        tb = shapes.add_textbox(x, y+IH, IW, TH)
        t2 = tb.text_frame; t2.word_wrap = True
        t2.vertical_anchor = MSO_ANCHOR.TOP
        nm = (n.get('name') or k)
        nm = nm.split('　')[-1]                      # 去掉城名，只留地名
        t2.text = nm
        r0 = t2.paragraphs[0].runs[0]
        r0.font.size = Pt(13); r0.font.bold = True
        t2.paragraphs[0].alignment = PP_ALIGN.CENTER
        p3 = t2.add_paragraph(); p3.text = k
        p3.runs[0].font.size = Pt(8)
        p3.runs[0].font.color.rgb = RGBColor(0x9a,0x98,0x9e)
        p3.alignment = PP_ALIGN.CENTER
        boxes[k] = (x, y, grp)

    # ── 連線（無向、去重）
    seen=set(); nlines=0
    for k,n in nodes.items():
        if k not in boxes: continue
        for d,dst in (n.get('exits') or {}).items():
            if d=='back' or not isinstance(dst,str) or dst.startswith('@'): continue
            if dst not in boxes: continue
            key = tuple(sorted((k,dst)))
            if key in seen: continue
            seen.add(key)
            x1,y1,_ = boxes[k]; x2,y2,_ = boxes[dst]
            c = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT,
                    Emu(int(x1+IW/2)), Emu(int(y1+IH/2)),
                    Emu(int(x2+IW/2)), Emu(int(y2+IH/2)))
            c.line.color.rgb = RGBColor(0x33,0x33,0x38); c.line.width = Pt(1.5)
            nlines += 1

    out = os.path.join(ROOT,'resources','map','_layout_%s.pptx'%town)
    prs.save(out)
    print('✓ %s：%d 格・%d 條連線 → %s' % (town, len(boxes), nlines, os.path.relpath(out,ROOT)))
    if miss: print('  ⚠ 這幾格找不到背景圖（已放灰底佔位）：' + '・'.join(miss))
    return 0

if __name__ == '__main__':
    sys.exit(main())
