#!/usr/bin/env python3
"""怪圖交件前的補白 —— ver -1501 §八第 1 條那一支，ver -1630 改成「不重取樣」定版。

   為什麼要有這一支：「頂到畫面上緣」與「四周留白」是互相矛盾的兩句，
   寫進提示詞只會兩邊都做不到（-1501 實測四邊留白 0.0~1.2%）。這是一行程式的事。

   ⚠⚠⚠ **補白一律靠「把畫布撐大」，不要把內容縮小**（ver -1630）：
   內容縮小一定要重取樣，而 cel 圖是硬邊 —— 實測 0.86 倍縮放之後，
   平坦區雜點（＝顆粒指標）從 6.87 被拉到 **LANCZOS 9.05／BOX 8.77／BICUBIC 8.01**，
   全部**比原圖還髒**（那是硬邊上的振鈴）。BILINEAR 雖然是 6.73，但它是靠糊掉換來的，
   而 Ray 這一輪退稿的兩個字正是「模糊」。
   ⇒ 撐大畫布 ＝ **一個像素都不動**，顆粒與銳利度都不會被這一步改到。
   ⚠ 長寬比保持不變（等比撐），怪圖尺寸本來就不統一（實測 9 種），不必硬湊 1024×1536。

   用法：python3 tools/mon_pad.py <in.png> <out.png> [target=0.86]
"""
import sys
from PIL import Image
import numpy as np


def pad(src, dst, target=0.86):
    im = Image.open(src).convert('RGBA')
    a = np.array(im)[:, :, 3] > 8
    ys, xs = np.where(a)
    sub = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    # 畫布 = 主體外框 / target，兩軸取較大的那個倍率 → 長寬比跟著主體走
    W = max(im.width,  round(sub.width  / target))
    H = max(im.height, round(sub.height / target))
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.paste(sub, ((W - sub.width) // 2, (H - sub.height) // 2))
    out.save(dst)
    return (im.size, out.size)


if __name__ == '__main__':
    t = float(sys.argv[3]) if len(sys.argv) > 3 else 0.86
    print(pad(sys.argv[1], sys.argv[2], t))
