#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""索拉娜重製的四項驗收 —— `_sorana_regen_spec.md` §六 的唯一計算點。

⚠ 不要在別的腳本裡再寫一份（ver -1638 的教訓：兩份指標只差一個邊界條件就會誤報）。

    python3 resources/si/_sorana_check.py <新圖.png> [...]
"""
import sys, os, colorsys
import numpy as np
from PIL import Image

BASE = 'resources/_originals/SI_sorana_base/soranagpt_1.png'
PASS = dict(hue=220.0, nearwhite=1.5, diff=3.0)


def hair_hue(a):
    """不透明區、頭頂下 11% 那一帶，取 max>150 且飽和<0.30 的像素平均轉 HLS。"""
    al = a[:, :, 3]; rgb = a[:, :, :3].astype(float)
    ys, _ = np.where(al > 200)
    if len(ys) == 0: return None
    top = ys.min(); band = slice(top, top + int(a.shape[0] * 0.11))
    sub = rgb[band]; suba = al[band]
    mx = sub.max(axis=2); mn = sub.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    m = (suba > 200) & (mx > 150) & (sat < 0.30)
    if m.sum() == 0: return None
    px = sub[m] / 255.0
    hs = [colorsys.rgb_to_hls(*p)[0] * 360 for p in px[::max(1, len(px)//4000)]]
    return round(float(np.mean(hs)), 1)


def near_white(a):
    al = a[:, :, 3].astype(int); semi = (al > 8) & (al < 200)
    if semi.sum() == 0: return 0.0
    mn = a[:, :, :3].astype(int).min(axis=2)
    return round(100.0 * ((mn >= 235) & semi).sum() / semi.sum(), 2)


def check(path, base_img):
    im = Image.open(path).convert('RGBA'); a = np.asarray(im)
    al = a[:, :, 3]
    corner = int(max(al[0, 0], al[0, -1], al[-1, 0], al[-1, -1]))
    hue = hair_hue(a); nw = near_white(a)
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    d = float(np.abs(np.asarray(base_img.resize((64, 96)), float)
                     - np.asarray(bg.convert('RGB').resize((64, 96)), float)).mean())
    # ⚠ 角落容許 ≤8：1/255 是編碼捨入，不是白邊（與 near_white 的 SEMI_LO 同一條線）
    ok = (hue is not None and hue < PASS['hue']) and corner <= 8 \
         and nw < PASS['nearwhite'] and d > PASS['diff']
    return ok, hue, corner, nw, round(d, 1)


if __name__ == '__main__':
    base = Image.open(BASE).convert('RGB')
    print(f'{"檔":34s}{"色相":>7s}{"角α":>5s}{"近白%":>7s}{"與A差":>7s}  判定')
    for p in sys.argv[1:]:
        ok, hue, c, nw, d = check(p, base)
        print(f'{os.path.basename(p):34s}{str(hue):>7s}{c:5d}{nw:7.2f}{d:7.1f}  {"✔" if ok else "⚠"}')
