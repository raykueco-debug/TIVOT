# -*- coding: utf-8 -*-
"""場景背景交件：生成的 PNG → resources/background/<base>.webp（對齊原檔大小），
   原 PNG → resources/_originals/background/<base>_raw.png。
   ⚠ 同名覆蓋 ⇒ 交件後要請程式端動 config.js 的 ASSET_VER（§5 的快取坑）。
   用法：py tools/bg_finish.py <base>
"""
import sys, os, glob, re, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _utf8  # noqa
from PIL import Image
base=sys.argv[1]
cands=[f for f in glob.glob('C:/Users/Kaede/Downloads/gen_%s*.png'%base)
       if re.fullmatch(re.escape(base)+r'(?: \(\d+\))?', os.path.basename(f)[4:-4])]
assert cands, '找不到 gen_%s*.png'%base
cands.sort(key=os.path.getmtime); gen=cands[-1]
# ⚠ ver -1376 起背景分成 15 個子資料夾 —— 先找既有檔在哪，找不到才用第 2 參數指定
import glob as _g
_hit=_g.glob('resources/background/**/%s.webp'%base, recursive=True)
if _hit: dst=_hit[0].replace(chr(92),'/')
else:
    sub=sys.argv[2] if len(sys.argv)>2 else ''
    assert sub, '新檔要指定子資料夾：py tools/bg_finish.py <base> <子資料夾>'
    os.makedirs('resources/background/'+sub, exist_ok=True)
    dst='resources/background/%s/%s.webp'%(sub,base)
ref=os.path.getsize(dst)/1024 if os.path.exists(dst) else 400
im=Image.open(gen).convert('RGB')
old=Image.open(dst).size if os.path.exists(dst) else im.size
if im.size!=old:
    print('⚠ 尺寸 %s != 原檔 %s —— 縮放對齊'%(im.size,old)); im=im.resize(old, Image.LANCZOS)
for q in (92,90,88,86,84,82,80):
    im.save(dst,'WEBP',quality=q,method=6)
    kb=os.path.getsize(dst)/1024
    if kb<=ref*1.25: break
od='resources/_originals/background'; os.makedirs(od, exist_ok=True)
shutil.copy2(gen, os.path.join(od, base+'_raw.png'))
for f in cands:
    try: os.remove(f)
    except Exception: pass
print('%-28s %s q=%d %.0fKB（原 %.0fKB）  ⚠ 同名覆蓋：要動 ASSET_VER'%(base,im.size,q,kb,ref))
