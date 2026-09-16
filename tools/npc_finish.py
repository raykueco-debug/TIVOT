# -*- coding: utf-8 -*-
"""NPC 立繪去背重做交件：驗 alpha → webp 覆蓋 resources/SI/NPC/<base>.webp，
   原 PNG → resources/_originals/SI/NPC/<base>_raw.png。
   ⚠ 同名覆蓋 ⇒ 要請程式端動 ASSET_VER。用法：py tools/npc_finish.py <base>
"""
import sys, os, glob, re, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _utf8  # noqa
import numpy as np
from PIL import Image
base=sys.argv[1]
c=[f for f in glob.glob('C:/Users/Kaede/Downloads/gen_%s*.png'%base)
   if re.fullmatch(re.escape(base)+r'(?: \(\d+\))?', os.path.basename(f)[4:-4])]
assert c, '找不到 gen_%s*.png'%base
c.sort(key=os.path.getmtime); gen=c[-1]
im=Image.open(gen).convert('RGBA')
a=np.asarray(im).astype(np.float32); al=a[...,3]; W,H=im.size
tr=100*float((al<8).sum())/(W*H)
lum=a[...,:3].max(2); br=lum>200
ma=float(al[br].mean()) if br.any() else 0
old='resources/SI/NPC/%s.webp'%base
osz=Image.open(old).size if os.path.exists(old) else im.size
warn=[]
if tr<15: warn.append('⚠ 全透只有 %.1f%% —— 去背失敗，不要入庫'%tr)
if im.size!=osz: warn.append('尺寸 %s != %s'%(im.size,osz))
print('%-34s %s 全透%.1f%% 亮部α%.0f %s'%(base,im.size,tr,ma,('  '+'; '.join(warn)) if warn else '✔'))
if tr<15: sys.exit(1)
ref=os.path.getsize(old)/1024 if os.path.exists(old) else 200
for q in (92,90,88,86,84,82):
    im.save(old,'WEBP',quality=q,method=6)
    kb=os.path.getsize(old)/1024
    if kb<=ref*1.6: break
od='resources/_originals/SI/NPC'; os.makedirs(od,exist_ok=True)
shutil.copy2(gen, os.path.join(od, base+'_raw.png'))
for f in c:
    try: os.remove(f)
    except Exception: pass
print('  → %s  q=%d  %.0fKB（原 %.0fKB）  ⚠ 同名覆蓋：要動 ASSET_VER'%(old,q,kb,ref))
