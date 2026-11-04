# 地下古城的樹（ver -2402）：GPT 畫的透明背景 PNG → 裁到內容框（底邊＝樹根，貼地用）→ webp
# 原圖放 resources/_originals/undercity/（不進遊戲、不進版控）；用法：python flight/undercity_trees.py
import os, hashlib
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'resources', '_originals', 'undercity')
DST = os.path.join(HERE, 'undercity')
H = {'tree_a': 640, 'tree_b': 640, 'tree_c': 640, 'tree_giant': 1024}   # 輸出高（像素）：巨樹在畫面上大很多，給高一點
for n, h in H.items():
    p = os.path.join(SRC, 'uc_' + n + '.png')
    if not os.path.exists(p): print('缺', n); continue
    im = Image.open(p).convert('RGBA')
    a = im.getchannel('A').point(lambda v: 255 if v > 24 else 0)
    im = im.crop(a.getbbox())
    im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    im.save(os.path.join(DST, n + '.webp'), 'WEBP', quality=88, alpha_quality=95, method=6)
    print(n, im.size, os.path.getsize(os.path.join(DST, n + '.webp')) // 1024, 'KB')
v = hashlib.md5(b''.join(open(os.path.join(DST, n + '.webp'), 'rb').read() for n in H if os.path.exists(os.path.join(DST, n + '.webp')))).hexdigest()[:8]
print('treeV', v)
