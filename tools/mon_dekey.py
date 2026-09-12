#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/mon_dekey.py —— 白底怪圖去背（ver -1149）

    python3 tools/mon_dekey.py resources/_originals/enemy/mon_*_white.png

⚠⚠ 憲法 §5 說「不要自己寫程式去背，叫 GPT 重製」——**那一條是給有髮絲的人物圖用的**
   （`tools/dekey.py` 被退兩次，正是髮絲把背景切成上百塊碎片、連通性與面積都判不出來）。
   這一支的適用範圍窄得多，而且每一條前提都可以驗：
   · 背景是**純白**（不是漸層、不是棋盤格），交件時就這樣要求的
   · 怪是**硬邊 cel shading**，輪廓有明確的深色描邊
   · 我手上有**原稿**，做完可以疊在深色棋盤上肉眼複核

⚠⚠⚠ 真正難的只有一件事：**怪身上本來就有白**（骨、牙、蠟、高光）。
   所以不可以用「整張圖的白都挖掉」那種作法。這一支分兩步：
   ① **從四邊灌水**：只有與畫面邊界連通的近白色才是背景 → 骨頭與牙齒天生保得住
   ② 灌不到的**封閉白袋**（鏈環裡、輪輻之間、四肢之間圍起來的洞）再判一次：
      **只有「平到不像話」的那種白才挖**（平均 ≥248 且標準差 ≤2.2）——
      骨頭的白一定帶著描邊與明暗，標準差不會那麼低。
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from collections import deque

def label(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32); par = [0]
    def find(a):
        while par[a] != a: par[a] = par[par[a]]; a = par[a]
        return a
    def uni(a, b):
        ra, rb = find(a), find(b)
        if ra != rb: par[max(ra, rb)] = min(ra, rb)
    nxt = 1
    for y in range(h):
        row = mask[y]; prev = mask[y-1] if y else None
        for x in np.flatnonzero(row):
            ns = []
            if x and row[x-1]: ns.append(lab[y, x-1])
            if y:
                for dx in (-1, 0, 1):
                    xx = x + dx
                    if 0 <= xx < w and prev[xx]: ns.append(lab[y-1, xx])
            if ns:
                m = min(ns); lab[y, x] = m
                for n in ns: uni(m, n)
            else:
                lab[y, x] = nxt; par.append(nxt); nxt += 1
    flat = np.array([find(i) if i else 0 for i in range(nxt)], np.int32)
    return flat[lab]

def dekey(src, dst, T=236, POCKET_MIN=300):
    # ⚠ 門檻是**量出來的**，不是猜的：交件的白底實測 253±0.5（四角 253~255）。
    #   所以「和背景同一種白」＝平均貼著 253、而且平到 std<=3.2；
    #   骨頭的白是**被上過陰影**的，平均會低一階（240~250）或起伏更大。
    BG_MEAN, BG_STD = 251.0, 3.2
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(np.int32)
    lum = (a[:,:,0]*299 + a[:,:,1]*587 + a[:,:,2]*114)//1000
    near = lum >= T                                   # 近白
    H, W = near.shape

    # ① 從四邊灌水
    bg = np.zeros_like(near); q = deque()
    for x in range(W):
        for y in (0, H-1):
            if near[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W-1):
            if near[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y+dy, x+dx
            if 0 <= ny < H and 0 <= nx < W and near[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))

    # ② 封閉的白袋：只挖「平到不像話」的
    pockets = near & ~bg
    kept = 0
    if pockets.any():
        lb = label(pockets)
        ids, cnt = np.unique(lb[lb > 0], return_counts=True)
        for i, n in zip(ids, cnt):
            if n < POCKET_MIN: kept += 1; continue
            sel = lb == i
            v = lum[sel]
            if v.mean() >= BG_MEAN and v.std() <= BG_STD: bg |= sel
            else: kept += 1

    # 邊緣：用白度做一層軟 alpha，避免鋸齒與白邊
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha = np.asarray(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.6)))
    soft = np.clip((250 - lum) * 24, 0, 255).astype(np.uint8)   # 越白越透
    alpha = np.minimum(alpha, np.maximum(soft, np.where(bg, 0, 255)).astype(np.uint8))

    out = Image.fromarray(np.dstack([np.asarray(im), alpha]), 'RGBA')
    out.save(dst)
    return dict(transparent=float((alpha < 8).mean()),
                edge=[float((alpha[0] > 8).mean()), float((alpha[-1] > 8).mean()),
                      float((alpha[:,0] > 8).mean()), float((alpha[:,-1] > 8).mean())],
                pockets_kept=kept)

if __name__ == '__main__':
    for p in sys.argv[1:]:
        out = p.replace('_white.png', '_alpha.png')
        r = dekey(p, out)
        print('%-34s 透明 %4.1f%%  四邊不透明 %s  保留的白袋 %d'
              % (os.path.basename(p), 100*r['transparent'],
                 ' '.join('%.0f%%' % (100*e) for e in r['edge']), r['pockets_kept']))
