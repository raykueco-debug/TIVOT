#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""despill.py — 去背後的**綠色溢色**補救（ver -581）

  python3 tools/despill.py <圖.webp|png> [更多...]

⚠⚠ 為什麼要獨立一支：`chroma_cut.py` 的去溢色只做在**半透明帶**（alpha 8~200），
   但綠幕的溢色會延伸到 **alpha=255 的輪廓內側好幾像素**——實測 13 張 Gemini 圖
   邊緣綠佔 10~29%、內部 0%，正是這一段沒處理到。
   這一支對「距 alpha 邊界 `R` 像素內」的所有像素做標準 despill（g 壓到 max(r,b)），
   壓的力道隨距離線性衰減，主體深處完全不動。

⚠ 判定溢色只看**邊緣**：植物怪本體是綠的也不會被洗掉（內部不碰）。
"""
import sys, os
from PIL import Image

R = 8          # 影響半徑（像素）
STRENGTH = 1.0 # 邊界處的壓制力道

def despill(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()
    # 距離場：BFS 從全透明像素往內擴 R 層
    INF = 999
    dist = [[INF]*w for _ in range(h)]
    from collections import deque
    q = deque()
    for y in range(h):
        for x in range(w):
            if px[x, y][3] < 8:
                dist[y][x] = 0; q.append((x, y))
    while q:
        x, y = q.popleft()
        d = dist[y][x]
        if d >= R: continue
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if 0 <= nx < w and 0 <= ny < h and dist[ny][nx] > d+1:
                dist[ny][nx] = d+1; q.append((nx, ny))
    fixed = 0
    for y in range(h):
        for x in range(w):
            d = dist[y][x]
            if d == 0 or d > R: continue
            r, g, b, a = px[x, y]
            cap = max(r, b)
            if g <= cap: continue
            k = STRENGTH * (1.0 - (d-1)/float(R))   # 越靠邊壓越重
            ng = int(g - (g-cap)*k)
            px[x, y] = (r, ng, b, a); fixed += 1
    im.save(path)
    return fixed, w*h

if __name__ == '__main__':
    for p in sys.argv[1:]:
        n, tot = despill(p)
        print('%-42s 修正 %d px (%.2f%%)' % (os.path.basename(p), n, 100.0*n/tot))
