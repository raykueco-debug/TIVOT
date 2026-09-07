#!/usr/bin/env python3
"""三座城的小地圖 feed 圖（給 GPT 當構圖規格）。

座標直接抄 resources/map/_layout_<城>.png 上量到的位置，線性縮到 1536×1024 ——
**相對位置就是遊戲裡的箭頭方向**，不可以為了構圖重排。

用法： python3 mkfeed_city.py capital|shinier|northport
"""
import sys, json
from PIL import Image, ImageDraw, ImageFont

W, H = 1536, 1024
MX, MY = 150, 135

CITY = {}

# ── 帝都 12 格 11 邊 ──（raw 座標＝佈局圖上的像素）
CITY['capital'] = dict(
    raw={
        'cityhall': (556, 96), 'midtown': (860, 96), 'church': (1164, 96),
        'dock': (404, 224), 'inn': (1316, 224),
        'gunstore': (100, 481), 'oldtown': (404, 481), 'square': (860, 481),
        'uptown': (1316, 481), 'tavern': (1620, 481),
        'guild': (404, 737), 'grocery': (1316, 737),
    },
    hub={'square', 'midtown', 'oldtown', 'uptown'},
    edges=[('cityhall', 'midtown'), ('midtown', 'church'), ('midtown', 'square'),
           ('dock', 'oldtown'), ('gunstore', 'oldtown'), ('oldtown', 'square'),
           ('oldtown', 'guild'), ('square', 'uptown'), ('inn', 'uptown'),
           ('uptown', 'tavern'), ('uptown', 'grocery')],
    label={'square': 'Square', 'midtown': 'Midtown', 'oldtown': 'OldTown',
           'uptown': 'UpTown', 'church': 'Church', 'cityhall': 'CityHall',
           'gunstore': 'Firearm', 'dock': 'Dock', 'guild': 'Guild',
           'tavern': 'Bistro', 'grocery': 'Grocery', 'inn': 'Hotel'},
    sail='square',
)

# ── 夏爾村 13 格 12 邊（＋Forest 跨圖出口，同神殿的 Entrance）──
CITY['shinier'] = dict(
    raw={
        'lakeside': (860, 96), 'forest': (404, 224),
        'chief': (556, 352), 'north': (860, 352), 'altar': (1164, 352),
        'wilds': (404, 481), 'sorahome': (1316, 481),
        'workshop': (100, 737), 'west': (404, 737), 'plaza': (860, 737),
        'east': (1316, 737), 'restaurant': (1620, 737),
        'hunter': (404, 993), 'grocery': (1316, 993),
    },
    hub={'plaza', 'north', 'west', 'east'},
    edges=[('lakeside', 'north'), ('chief', 'north'), ('north', 'altar'),
           ('north', 'plaza'), ('forest', 'wilds'), ('wilds', 'west'),
           ('workshop', 'west'), ('west', 'plaza'), ('west', 'hunter'),
           ('plaza', 'east'), ('sorahome', 'east'), ('east', 'restaurant'),
           ('east', 'grocery')],
    label={'plaza': 'Plaza', 'north': 'North', 'west': 'West', 'east': 'East',
           'lakeside': 'Lakeside', 'chief': 'Chief', 'altar': 'Altar',
           'wilds': 'Wilds', 'workshop': 'Workshop', 'hunter': 'Hunter',
           'sorahome': 'SoraHome', 'grocery': 'Grocery',
           'restaurant': 'Restaurant', 'forest': 'Forest'},
    sail='plaza',
    outside={'forest'},
)

# ── 北方泊地 13 格 12 邊 ──
CITY['northport'] = dict(
    raw={
        'cemetery': (860, 96),
        'cityhall': (556, 352), 'north': (860, 352), 'church': (1164, 352),
        'port': (404, 481), 'inn': (1316, 481),
        'gunstore': (100, 737), 'west': (404, 737), 'square': (860, 737),
        'east': (1316, 737), 'tavern': (1620, 737),
        'guild': (404, 993), 'grocery': (1316, 993),
    },
    hub={'square', 'north', 'west', 'east'},
    edges=[('cemetery', 'north'), ('cityhall', 'north'), ('north', 'church'),
           ('north', 'square'), ('port', 'west'), ('gunstore', 'west'),
           ('west', 'square'), ('west', 'guild'), ('square', 'east'),
           ('inn', 'east'), ('east', 'tavern'), ('east', 'grocery')],
    label={'square': 'Square', 'north': 'North', 'west': 'West', 'east': 'East',
           'port': 'Port', 'gunstore': 'Gunstore', 'guild': 'Guild',
           'cityhall': 'CityHall', 'church': 'Church', 'cemetery': 'Cemetery',
           'grocery': 'Grocery', 'tavern': 'Tavern', 'inn': 'Hotel'},
    sail='square',
)

name = sys.argv[1]
C = CITY[name]
raw = C['raw']
xs = [p[0] for p in raw.values()]
ys = [p[1] for p in raw.values()]
sx = (W - 2 * MX) / (max(xs) - min(xs))
sy = (H - 2 * MY) / (max(ys) - min(ys))


def pos(k):
    x, y = raw[k]
    return (MX + (x - min(xs)) * sx, MY + (y - min(ys)) * sy)


img = Image.new('RGB', (W, H), 'white')
d = ImageDraw.Draw(img)
FB = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
f = ImageFont.truetype(FB, 27)
fn = ImageFont.truetype(FB, 19)

for a, b in C['edges']:
    d.line([pos(a), pos(b)], fill='#111111', width=8)

deg = {k: 0 for k in raw}
for a, b in C['edges']:
    deg[a] += 1
    deg[b] += 1

R = 18
for k in raw:
    x, y = pos(k)
    if k in C.get('outside', ()):
        col = '#ffffff'
    else:
        col = '#e8a33d' if k in C['hub'] else ('#c8482f' if deg[k] == 1 else '#2b2b2b')
    d.ellipse([x - R, y - R, x + R, y + R], fill=col, outline='#111', width=4)
    t = C['label'][k]
    tw = d.textlength(t, font=f)
    ty = y + R + 8
    d.rectangle([x - tw / 2 - 8, ty - 5, x + tw / 2 + 8, ty + 34], fill='white')
    d.text((x - tw / 2, ty), t, font=f, fill='#111')

sx_, sy_ = pos(C['sail'])
d.line([(sx_, sy_ + R), (sx_, sy_ + R + 62)], fill='#1f8a5a', width=6)
d.text((sx_ + 14, sy_ + R + 46), 'sail out (not a node)', font=fn, fill='#1f8a5a')

ly = 26   # 左上角是空的；擺左下會撞到節點標籤
for txt, c in [('orange = junction / crossroads (draw NO landmark, just the road)', '#e8a33d'),
               ('red = DEAD END, a place you can enter (draw its landmark)', '#c8482f')]:
    d.ellipse([26, ly + 2, 44, ly + 20], fill=c, outline='#111', width=3)
    d.text((54, ly), txt, font=fn, fill='#111')
    ly += 30

img.save(f'feed_{name}.png')
img.save(f'feed_{name}.jpg', quality=93)
print(name, len(raw), 'nodes', len(C['edges']), 'edges',
      'tree' if len(C['edges']) == len(raw) - 1 else 'NOT TREE')
for k in sorted(raw, key=lambda k: -deg[k]):
    print('   %-10s deg=%d %s' % (k, deg[k], 'hub' if k in C['hub'] else ''))
json.dump({k: [round(pos(k)[0] / W, 4), round(pos(k)[1] / H, 4)] for k in raw},
          open(f'plan_{name}.json', 'w'), indent=1)
