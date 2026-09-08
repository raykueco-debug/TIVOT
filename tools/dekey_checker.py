#!/usr/bin/env python3
"""棋盤格去背（ver -734，Ray 的作法）

Gemini 被要求「畫透明背景」時，會畫出**視覺上的棋盤格**（假 alpha）。
那個格子是**合成的規則圖樣**，所以比「白底」可靠太多：

  · 白底會與角色身上的白撞色（白銀髮、白布料、高光）—— 那正是白底去背一直失敗的原因
  · 棋盤格有**兩個特定灰階 ＋ 固定週期**，可以用「這一小塊區域符不符合棋盤」來判斷，
    角色身上任何一塊區域都不會剛好長成棋盤

作法：
  1. 從畫面四邊取樣，找出棋盤的兩個顏色與格子邊長（用自相關找週期）
  2. 逐像素算「它所在的視窗有多像棋盤」→ 相似度高的才是背景
  3. 邊緣柔化 ＋ 去除格子色殘留

用法：
    python3 tools/dekey_checker.py <輸入圖> [輸出.png] [--tol 18] [--win 12] [--check]
"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage


def detect_checker(rgb):
    """從四邊的邊框取樣，找棋盤的兩個顏色與格子邊長。"""
    h, w, _ = rgb.shape
    band = np.concatenate([
        rgb[:8, :, :].reshape(-1, 3), rgb[-8:, :, :].reshape(-1, 3),
        rgb[:, :8, :].reshape(-1, 3), rgb[:, -8:, :].reshape(-1, 3),
    ])
    # 棋盤是灰的：三通道接近相等
    grayish = band[(band.max(axis=1) - band.min(axis=1)) < 12]
    if len(grayish) < 100:
        return None
    lum = grayish.mean(axis=1)
    lo_c = np.median(grayish[lum <= np.median(lum)], axis=0)
    hi_c = np.median(grayish[lum > np.median(lum)], axis=0)
    if abs(float(hi_c.mean()) - float(lo_c.mean())) < 8:
        return None      # 兩色太接近 = 不是棋盤，是純色底

    # 沿著上緣掃一條線，用「顏色翻轉的間隔」估格子邊長
    line = rgb[3, :, :].mean(axis=1)
    mid = (float(hi_c.mean()) + float(lo_c.mean())) / 2
    b = line > mid
    flips = np.where(np.diff(b.astype(np.int8)) != 0)[0]
    cell = int(np.median(np.diff(flips))) if len(flips) > 3 else 8
    cell = max(2, min(cell, 64))
    return lo_c, hi_c, cell


def dekey_checker(path, tol=18, win=12):
    im = Image.open(path).convert("RGB")
    rgb = np.array(im).astype(np.int16)
    det = detect_checker(rgb)
    if det is None:
        raise SystemExit("找不到棋盤格 —— 這張圖的底不是棋盤（可能是純白／純色）。"
                         "純白底請改用 tools/dekey.py，或確認 Gemini 真的畫了格子。")
    lo_c, hi_c, cell = det

    # 像素「是不是棋盤的兩色之一」
    d_lo = np.abs(rgb - lo_c).max(axis=2)
    d_hi = np.abs(rgb - hi_c).max(axis=2)
    is_checker_color = (np.minimum(d_lo, d_hi) <= tol)

    # ⚠ 只看顏色不夠（角色身上也可能有那個灰）——
    #    再看「它周圍一整片是不是都符合棋盤色」。角色身上不會有整片棋盤。
    frac = ndimage.uniform_filter(is_checker_color.astype(np.float32), size=win)
    bg = frac > 0.90

    # 補：與邊緣相連的那一大塊才算背景（去掉零星誤判）
    lab, n = ndimage.label(bg)
    if n:
        border = np.concatenate([lab[0, :], lab[-1, :], lab[:, 0], lab[:, -1]])
        keep = set(int(x) for x in np.unique(border) if x != 0)
        sizes = ndimage.sum(bg, lab, range(1, n + 1))
        # 被主體包住的大塊鏤空（髮束縫隙）也要算背景
        for i, s in enumerate(sizes, start=1):
            if s >= cell * cell * 6:
                keep.add(i)
        bg = np.isin(lab, list(keep)) if keep else bg

    alpha = np.where(bg, 0, 255).astype(np.uint8)

    # 邊緣柔化：在背景外擴 2px 的帶內，用「有多像棋盤」決定半透明
    grown = ndimage.binary_dilation(bg, iterations=2)
    band = grown & ~bg
    if band.any():
        alpha[band] = np.clip((1.0 - frac[band]) * 255, 0, 255).astype(np.uint8)

    out = np.dstack([np.array(im), alpha])
    return Image.fromarray(out, "RGBA"), {
        "cell": cell,
        "lo": tuple(int(x) for x in lo_c),
        "hi": tuple(int(x) for x in hi_c),
        "transparent_pct": round(float((alpha < 8).mean()) * 100, 1),
        "size": im.size,
    }


def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    flags = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(1)

    def opt(name, d):
        for i, f in enumerate(flags):
            if f == "--" + name and i + 1 < len(flags):
                return int(flags[i + 1])
        return d

    src = args[0]
    out, info = dekey_checker(src, opt("tol", 18), opt("win", 12))
    print(f"{os.path.basename(src)}  {info['size'][0]}x{info['size'][1]}  "
          f"格子邊長 {info['cell']}px  兩色 {info['lo']}/{info['hi']}  "
          f"透明 {info['transparent_pct']}%")
    if "--check" in flags:
        return
    dst = args[1] if len(args) > 1 else os.path.splitext(src)[0] + "_alpha.png"
    out.save(dst)
    print("→", dst)


if __name__ == "__main__":
    main()
