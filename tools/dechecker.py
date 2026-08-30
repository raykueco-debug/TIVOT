#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""dechecker.py — 清掉「畫出來的棋盤格假背景」（ver -583）

  python3 tools/dechecker.py <圖...>

⚠⚠ GPT 有時會**把透明的棋盤格畫進圖裡**（灰白交替的方格），看起來像去背、
   實際 alpha 全是 255。這一支從四邊 flood fill，把與邊界相連的
   「淺色低飽和」像素設成透明 —— 只走相連區域，主體內部的白色（骨、布、金屬高光）
   碰不到。
"""
import sys, os
from collections import deque
from PIL import Image

LIGHT_MIN = 178      # 三通道最小值要大於它才算「淺色」
SAT_MAX   = 42       # max-min 小於它才算「低飽和」（棋盤格是灰階）
MIN_POCKET = 6       # 封閉的棋盤格區塊要幾像素以上才清（見下方第二道）

def clean(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size; px = im.load()
    def isbg(x, y):
        r, g, b, a = px[x, y]
        if a < 16: return True
        return min(r, g, b) >= LIGHT_MIN and (max(r, g, b) - min(r, g, b)) <= SAT_MAX
    seen = [[False]*w for _ in range(h)]
    q = deque()
    for x in range(w):
        for y in (0, h-1):
            if not seen[y][x] and isbg(x, y): seen[y][x] = True; q.append((x, y))
    for y in range(h):
        for x in (0, w-1):
            if not seen[y][x] and isbg(x, y): seen[y][x] = True; q.append((x, y))
    n = 0
    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]; px[x, y] = (r, g, b, 0); n += 1
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and isbg(nx, ny):
                seen[ny][nx] = True; q.append((nx, ny))
    # ⚠ 第二道：**被主體包圍的封閉棋盤格**（披風破口、鎧甲縫隙）與邊界不相連，
    #   上面那道 flood fill 進不去。連通塊 >= MIN_POCKET 才清 —— 太小的可能是
    #   金屬高光或白色細節，留著。
    seen2 = [[False]*w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 16 and isbg(x, y) and not seen2[y][x]:
                q2 = deque([(x, y)]); seen2[y][x] = True; cells = []
                while q2:
                    cx, cy = q2.popleft(); cells.append((cx, cy))
                    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                        nx, ny = cx+dx, cy+dy
                        if 0 <= nx < w and 0 <= ny < h and not seen2[ny][nx] \
                           and px[nx, ny][3] > 16 and isbg(nx, ny):
                            seen2[ny][nx] = True; q2.append((nx, ny))
                if len(cells) >= MIN_POCKET:
                    for (cx, cy) in cells:
                        r, g, b, _ = px[cx, cy]; px[cx, cy] = (r, g, b, 0)
                    n += len(cells)
    im.save(path)
    return n, w*h

if __name__ == '__main__':
    for p in sys.argv[1:]:
        n, tot = clean(p)
        print('%-40s 清掉 %.1f%%' % (os.path.basename(p), 100.0*n/tot))
