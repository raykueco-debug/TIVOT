"""守城戰（winsmoor_siege）的**臨時**小地圖（ver -2326）。
   美術的手繪版還沒交之前先用這一張：連線從 script/town.js 讀（鐵律 7：圖與遊戲不會走鐘），
   每一格的座標＝格子 (x,y)（節點 id `wX_Y`，具名的那幾格看 bg `ws_X_Y`）。
   產出：resources/map/map_winsmoor_siege.webp ＋ 印出 spots（貼進 town.js 的 map.spots）。"""
import os, re, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import map_layout
from PIL import Image, ImageDraw

ROOT = map_layout.ROOT
T = map_layout.load('winsmoor_siege'); N = T['nodes']
# 具名格的座標：bg 名（w2_3 例外：它借 ws_2_1 的圖，但 id 就是座標）
pos = {}
for k, n in N.items():
    m = re.fullmatch(r'w(\d+)_(\d+)', k) or re.search(r'ws_(\d+)_(\d+)', n.get('bg', ''))
    pos[k] = (int(m.group(1)), int(m.group(2)))
G = 11; S = 1100; pad = S / G / 2
xy = lambda c: (pad + c[0] * S / G, pad + c[1] * S / G)
im = Image.new('RGB', (S, S), (214, 178, 128)); d = ImageDraw.Draw(im)
seen = set()
for k, n in N.items():
    for dr, to in (n.get('exits') or {}).items():
        if to not in N: continue
        e = tuple(sorted((k, to)))
        if e in seen: continue
        seen.add(e)
        (x1, y1), (x2, y2) = xy(pos[k]), xy(pos[to])
        d.line([x1, y1, x2, y2], fill=(70, 46, 26), width=9)
dst = os.path.join(ROOT, 'resources', 'map', 'map_winsmoor_siege.webp')
im.save(dst, 'WEBP', quality=82)
spots = {k: [round((pos[k][0] + .5) / G, 4), round((pos[k][1] + .5) / G, 4)] for k in N}
print(len(N), 'nodes', len(seen), 'edges ->', os.path.relpath(dst, ROOT))
print(json.dumps(spots, separators=(',', ':')).replace('"', "'"))
