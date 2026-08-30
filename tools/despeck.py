#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""despeck.py — 清掉去背留下的**微小殘渣**（ver -581）

  python3 tools/despeck.py <圖...>

只清掉面積 < `MIN_AREA` 的孤立連通塊 —— 那個尺度只可能是去背殘渣。
⚠⚠ **飛散的碎片、能量粒子、飄浮的小物件是設計的一部分，不能清**：
   實測 bladewing 的冰晶、pulpit 的火星、glasskeys 的鑰匙都是幾千像素的
   獨立塊，把「所有非主體的連通塊」當雜訊清掉會把它們一起殺掉。
"""
import sys, os
from collections import deque
from PIL import Image

MIN_AREA = 30

def despeck(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size; px = im.load()
    seen = [[False]*w for _ in range(h)]
    removed = 0; blocks = 0
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 16 and not seen[y][x]:
                q = deque([(x, y)]); seen[y][x] = True; cells = []
                while q:
                    cx, cy = q.popleft(); cells.append((cx, cy))
                    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
                        nx, ny = cx+dx, cy+dy
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny][3] > 16:
                            seen[ny][nx] = True; q.append((nx, ny))
                if len(cells) < MIN_AREA:
                    for (cx, cy) in cells:
                        r, g, b, _ = px[cx, cy]; px[cx, cy] = (r, g, b, 0)
                    removed += len(cells); blocks += 1
    if removed: im.save(path)
    return blocks, removed

if __name__ == '__main__':
    for p in sys.argv[1:]:
        b, n = despeck(p)
        print('%-42s 清掉 %d 塊 / %d px' % (os.path.basename(p), b, n))
