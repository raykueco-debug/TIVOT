#!/usr/bin/env python3
"""把一張材質圖做成「四邊真的接得起來」的平鋪 tile，並驗收。

用法：
    python3 tools/tile_seamless.py <來源.png> <輸出.webp> [--size 256] [--target 180,183,176]

⚠⚠ 為什麼要這一支：圖像模型**不會**真的給你無縫的邊
（它只是「沒有畫邊框」而已）—— 直接貼上去左右一定有一條線。
作法是**邊界交叉淡化**（border cross-fade）：把對邊的內容以羽化權重疊進來，
數學上保證 f(0)==f(W)，代價是邊界帶有一點點重影。
在這個專案裡那個代價是看不見的：一張 256px 的 tile 覆蓋 179 個世界單位。

⚠ 驗收看兩件事，兩件都印出來：
  ① **接縫**：把圖左右（上下）接起來，量跨越接縫那一欄的梯度，
     要與「內部隨便一欄」同量級 —— 大很多就是還有縫。
  ② **方向性**：上半/下半、左半/右半的平均亮度差。
     這種 tile 會被貼在牆與頂面兩個方向，**有上下之分就會穿幫**。
"""
import sys, numpy as np
from PIL import Image


def crossfade_seamless(a, band=0.22):
    """把 (H,W,3) 做成四邊連續的 tile。**會縮小一個帶寬**（那是這個作法的代價）。

    作法（標準的 border cross-fade）：
      ① 左邊那一帶與**右邊那一帶**交叉淡化，權重 0→1（raised cosine，不是線性）
      ② 然後把右邊那一帶**砍掉**
    砍完之後：新的第 0 欄 ＝ 原圖的第 (W-bw) 欄（權重 0），
    而新的最後一欄 ＝ 原圖的第 (W-bw-1) 欄 —— 兩者在原圖裡本來就相鄰，
    所以接起來是連續的。上下同理。

    ⚠⚠ **不要寫成「左右兩帶各自往對方靠」**（第一版就是這樣，接縫從 12 變成 35）：
      那只是把兩邊都弄糊，兩條邊界的值仍然不相等。
    ⚠ 權重用 raised cosine 不用線性：線性在帶的兩端有折角，會留下兩條淡淡的直線。
    """
    H, W = a.shape[:2]
    bw = max(2, int(W * band))
    bh = max(2, int(H * band))
    t = (0.5 * (1 - np.cos(np.pi * np.arange(bw) / (bw - 1))))[None, :, None]
    o = a.copy()
    o[:, :bw] = a[:, W - bw:] * (1 - t) + a[:, :bw] * t
    o = o[:, :W - bw]
    th = (0.5 * (1 - np.cos(np.pi * np.arange(bh) / (bh - 1))))[:, None, None]
    p = o.copy()
    o[:bh] = p[H - bh:] * (1 - th) + p[:bh] * th
    o = o[:H - bh]
    return o


def seam_report(a, tag=''):
    f = a.astype(float)
    lum = f @ np.array([0.299, 0.587, 0.114])
    H, W = lum.shape
    seam_x = np.abs(lum[:, 0] - lum[:, -1]).mean()
    seam_y = np.abs(lum[0, :] - lum[-1, :]).mean()
    inner_x = np.abs(np.diff(lum, axis=1)).mean()
    inner_y = np.abs(np.diff(lum, axis=0)).mean()
    print('%s接縫 左右 %.2f / 內部 %.2f　上下 %.2f / 內部 %.2f'
          % (tag, seam_x, inner_x, seam_y, inner_y))
    print('%s方向性 上半-下半 %.2f　左半-右半 %.2f'
          % (tag, lum[:H // 2].mean() - lum[H // 2:].mean(),
             lum[:, :W // 2].mean() - lum[:, W // 2:].mean()))
    return seam_x, inner_x, seam_y, inner_y


def main():
    src, dst = sys.argv[1], sys.argv[2]
    size = 256
    target = None
    band = 0.25
    for i, a in enumerate(sys.argv):
        if a == '--size':   size = int(sys.argv[i + 1])
        if a == '--target': target = [int(x) for x in sys.argv[i + 1].split(',')]
        if a == '--band':   band = float(sys.argv[i + 1])

    im = Image.open(src).convert('RGB')
    n = min(im.size)
    l, t = (im.width - n) // 2, (im.height - n) // 2
    a = np.asarray(im.crop((l, t, l + n, t + n))).astype(float)

    print('原圖 %dx%d  平均 RGB (%.0f,%.0f,%.0f)' % (im.width, im.height, *a.reshape(-1, 3).mean(0)))
    seam_report(a, '原圖 ')

    a = crossfade_seamless(a, band)

    if target:                       # 逐通道平移到目標底色（不動對比）
        cur = a.reshape(-1, 3).mean(0)
        a = a + (np.array(target, float) - cur)
    a = a.clip(0, 255)

    out = Image.fromarray(a.astype(np.uint8)).resize((size, size), Image.LANCZOS)
    b = np.asarray(out).astype(float)
    print('成品 %dx%d  平均 RGB (%.0f,%.0f,%.0f)' % (size, size, *b.reshape(-1, 3).mean(0)))
    seam_report(b, '成品 ')
    out.save(dst, quality=92, method=6)
    print('→', dst)


if __name__ == '__main__':
    main()
