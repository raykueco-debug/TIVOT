# -*- coding: utf-8 -*-
"""收一張生成圖：驗尺寸/alpha/取景值/平均差 → webp 進交件夾、原PNG進_originals
   蕾娜髮飾換裝產線（見 resources/SI/renna_newhair/ 與 HANDOFF.md）。
"""
import sys, os, shutil, colorsys
sys.path.insert(0, os.path.join(os.getcwd(), 'tools'))
import _utf8  # noqa
from _dl import dl
from PIL import Image, ImageChops
base=sys.argv[1]
import glob, re
# ⚠ Chrome 檔名重複不覆蓋，會存成 "xxx (1).png" —— 一律取「最新的那一個」
cands=[f for f in glob.glob(dl('gen_%s*.png'%base))
       if re.fullmatch(re.escape(base)+r'(?: \(\d+\))?', os.path.basename(f)[4:-4])]
cands.sort(key=os.path.getmtime)
assert cands, '找不到 gen_%s*.png'%base
gen=cands[-1]
orig='resources/SI/%s.webp'%base
outw='resources/SI/renna_newhair/%s.webp'%base
origdir='resources/_originals/SI/renna_newhair'
im=Image.open(gen).convert('RGBA')
o=Image.open(orig).convert('RGBA')
warn=[]
if im.size!=o.size: warn.append('尺寸 %s != %s'%(im.size,o.size))
h=im.getchannel('A').histogram(); W,H=im.size
tr=100*h[0]/(W*H)
if tr<40: warn.append('alpha 只有 %.0f%% 全透（疑似沒去背）'%tr)
def edges(img,thr=40):
    al=img.getchannel('A'); W,H=img.size; px=al.load()
    t=next(y for y in range(H) if any(px[x,y]>thr for x in range(0,W,2)))
    b=next(y for y in range(H-1,-1,-1) if any(px[x,y]>thr for x in range(0,W,2)))
    return t,b
t1,b1=edges(o); t2,b2=edges(im)
if abs((b2-t2)-(b1-t1))>25: warn.append('人物高差 %d'%((b2-t2)-(b1-t1)))
def flat(img):
    bg=Image.new('RGBA',img.size,(255,255,255,255))
    return Image.alpha_composite(bg,img).convert('RGB')
d=ImageChops.difference(flat(o),flat(im)).convert('L')
mean=sum(d.histogram()[i]*i for i in range(256))/(W*H)
ref=os.path.getsize(orig)/1024
for q in (92,90,88,86,84,82):
    im.save(outw,'WEBP',quality=q,method=6)
    kb=os.path.getsize(outw)/1024
    if kb<=ref*1.30: break
os.makedirs(origdir,exist_ok=True); shutil.copy2(gen, os.path.join(origdir,base+'_raw.png'))
print('%-30s %s alpha%.0f%% top %d→%d bot %d→%d 高%d→%d 差%.1f %.0fKB%s'
 % (base, im.size, tr, t1,t2, b1,b2, b1-t1, b2-t2, mean, kb,
    ('  ⚠ '+'; '.join(warn)) if warn else ''))
# 用完把 Downloads 裡這一組清掉，避免下次撿到舊檔
for f in cands:
    try: os.remove(f)
    except Exception: pass
