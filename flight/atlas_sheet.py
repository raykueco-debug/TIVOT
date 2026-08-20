# -*- coding: utf-8 -*-
"""出一張「銀月大陸總圖」：地形浮雕＋國界線＋城市與地標，給設計討論用。

▍與 map_sheet.py 的差別
map_sheet 是**工作底圖**（純地形＋格線＋紅點），為了在 3D 裡對座標。
這張是**總覽圖**：加了山影浮雕、海岸線、12 國的國界線與名稱、城市的真實佔地
半徑、以及 40 個隱藏點位的分布 —— 用來一眼看懂「現在世界上有什麼」。

⚠ 國界只畫**線**，不填色塊（Ray 指定）：底下是地形，填色會把山脈與林相蓋掉，
  而這張圖的重點就是地貌與勢力範圍要同時看得到。

▍所有資料都是讀既有檔案，不重新發明
  地形   silvermoon_terrain.png / silvermoon_heightmap.png
  國界   region_map.png（索引圖）＋ region_map.json（編號→國名）
  城     index.html 的 SETTLEMENTS（含 t 級別 / f 陣營 / c 臨海）
  地標   index.html 的 PLACES
  星點   starpoints.json
⚠ 座標系與遊戲同一套：地圖像素（2152×1200），1 px = MAP_SCALE(20) 世界單位。

用法：  py flight/atlas_sheet.py [--ss 2] [--no-star] [--out silvermoon_atlas.png]
"""
import argparse
import json
import os
import re

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
MAP_SCALE = 20
CLOUD_H = 44          # 雲海高度（世界單位），與 index.html 一致
PEAK_SCALE = 520      # 高度圖灰階 255 對應的世界單位
GRID = 100
GRID_MAJOR = 500
MAX_SPD_UPS = 360.0   # 滿油門 6.0/幀 × 60fps ＝ 世界單位/秒

# 聚落半徑（地圖像素），與 index.html 的 SETTLE_R 同值
SETTLE_R = {'city1': 22, 'city2': 15, 'city3': 10, 'town': 6, 'village': 3.5}
TIER_ZH = {'city1': '都市 I', 'city2': '都市 II', 'city3': '都市 III',
           'town': '市鎮', 'village': '村落'}
FACTION_ZH = {'church': '教廷', 'empire': '帝國', 'free': '自由市'}
FACTION_COL = {'church': (255, 214, 110), 'empire': (255, 120, 96),
               'free': (150, 226, 255)}
# 星點六類的顏色（與 build_starpoints.py 的分類同名）
STAR_COL = {'峰': (255, 200, 150), '崖': (230, 170, 200), '谷': (170, 225, 180),
            '岬': (200, 200, 255), '水': (140, 210, 240), '島': (245, 235, 160)}


def font(size, bold=False):
    for p in (('msjhbd.ttc' if bold else 'msjh.ttc'), 'msyh.ttc'):
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()


def parse_settlements(src):
    """撈 SETTLEMENTS。⚠ 不解析 JS，只用正規式抓穩定的欄位形狀。

    一筆聚落跨多行（plan/spurs 等），所以先用 `{ n:` 切塊再逐塊抓欄位。
    """
    m = re.search(r'const SETTLEMENTS\s*=\s*\[(.*?)\n\];', src, re.S)
    if not m:
        return []
    out = []
    for blk in re.split(r'\n\s*(?=\{\s*n\s*:)', m.group(1)):
        mm = re.search(r"n\s*:\s*'([^']+)'", blk)
        mx = re.search(r'\bx\s*:\s*(-?\d+)', blk)
        my = re.search(r'\by\s*:\s*(-?\d+)', blk)
        if not (mm and mx and my):
            continue
        mt = re.search(r"\bt\s*:\s*'([^']+)'", blk)
        mf = re.search(r"\bf\s*:\s*'([^']+)'", blk)
        out.append(dict(n=mm.group(1), x=int(mx.group(1)), y=int(my.group(1)),
                        t=mt.group(1) if mt else 'town',
                        f=mf.group(1) if mf else 'free',
                        c=bool(re.search(r'\bc\s*:\s*1', blk))))
    return out


def parse_places(src):
    m = re.search(r'const PLACES\s*=\s*\[(.*?)\n\];', src, re.S)
    if not m:
        return []
    out = []
    for line in m.group(1).split('\n'):
        mm = re.search(r"name\s*:\s*'([^']+)'", line)
        mx = re.search(r'\bx\s*:\s*(-?\d+)', line)
        my = re.search(r'\by\s*:\s*(-?\d+)', line)
        mt = re.search(r"type\s*:\s*'([^']+)'", line)
        if mm and mx and my:
            out.append(dict(n=mm.group(1), x=int(mx.group(1)), y=int(my.group(1)),
                            ty=mt.group(1) if mt else ''))
    return out


def hillshade(h, az=315.0, alt=45.0, z=3.2):
    """標準的 Horn 山影。z 是垂直誇張 —— 這張圖的高度差只有 520 世界單位，
    不誇張的話整片大陸是平的，看不出山脈走向。"""
    gy, gx = np.gradient(h * z)
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    a, A = np.radians(alt), np.radians(az)
    s = (np.sin(a) * np.cos(slope)
         + np.cos(a) * np.sin(slope) * np.cos(A - np.pi / 2 - aspect))
    return np.clip(s, 0, 1)


def outline_mask(mask, width=1):
    """回傳 mask 的邊界（往內縮的一圈）。用位移比對做，不依賴 cv2。"""
    e = mask.copy()
    for _ in range(width):
        s = np.ones_like(e)
        s[1:, :] &= e[:-1, :]
        s[:-1, :] &= e[1:, :]
        s[:, 1:] &= e[:, :-1]
        s[:, :-1] &= e[:, 1:]
        e = s
    return mask & ~e


def label_spot(mask):
    """國名要放在國土「最深處」，不是質心 —— 細長或彎曲的國家質心會落在國外。
    用距離變換取最大內接圓的圓心。"""
    from scipy import ndimage
    dt = ndimage.distance_transform_edt(mask)
    i = int(np.argmax(dt))
    return int(i % mask.shape[1]), int(i // mask.shape[1]), float(dt.flat[i])


def text(d, xy, s, f, fill, anchor='mm', halo=3, halo_col=(0, 0, 0, 235)):
    d.text(xy, s, font=f, fill=fill, anchor=anchor,
           stroke_width=halo, stroke_fill=halo_col)


class Placer:
    """名牌避讓：帝都與聖王廳只差 71 地圖像素，兩張名牌直接疊在一起看不懂。

    作法是最土也最可靠的一種 —— 依序試「上／下／左／右」四個位置，取第一個
    不與已放名牌相交的。⚠ 不做力導向鬆弛：這張圖只有十來張名牌，迭代解法的
    結果每次都不一樣，改圖時 diff 會整片跳動，反而難維護。
    """

    def __init__(self, draw):
        self.d = draw
        self.boxes = []

    @staticmethod
    def _hit(a, b):
        return not (a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1])

    def put(self, x, y, gap, lines):
        """lines = [(字串, 字型, 顏色)]，整組一起擺；回傳實際用的 anchor。"""
        sizes = [self.d.textbbox((0, 0), t, font=f) for t, f, _ in lines]
        w = max(b[2] - b[0] for b in sizes)
        hs = [b[3] - b[1] for b in sizes]
        h = sum(hs) + 3 * (len(lines) - 1)
        cand = [('ms', x, y - gap - h / 2), ('ma', x, y + gap + h / 2),
                ('rs', x - gap - w / 2, y), ('ls', x + gap + w / 2, y)]
        for _, cx, cy in cand:
            box = (cx - w / 2 - 2, cy - h / 2 - 2, cx + w / 2 + 2, cy + h / 2 + 2)
            if not any(self._hit(box, o) for o in self.boxes):
                break
        self.boxes.append(box)
        ty = cy - h / 2
        for (t, f, col), hh in zip(lines, hs):
            text(self.d, (cx, ty), t, f, col, 'ma', 4)
            ty += hh + 3
        return cx, cy


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ss', type=int, default=2, help='超取樣倍率（輸出解析度）')
    ap.add_argument('--no-star', action='store_true')
    ap.add_argument('--no-grid', action='store_true')
    ap.add_argument('--out', default='silvermoon_atlas.png')
    a = ap.parse_args()
    S = a.ss

    terr = Image.open(os.path.join(HERE, 'silvermoon_terrain.png')).convert('RGB')
    hgt = np.asarray(Image.open(os.path.join(HERE, 'silvermoon_heightmap.png'))
                     .convert('L')).astype(np.float32)
    W, H = terr.size
    land = hgt > (CLOUD_H / PEAK_SCALE * 255.0)

    # ── 底色：地形 × 山影；海壓暗並偏藍（大陸輪廓才跳得出來）────────────
    base = np.asarray(terr).astype(np.float32)
    # ⚠ 山影只調亮度、不吃掉顏色：第一版直接 base*(0.52+0.90*sh) 乘下去，
    #   整片大陸變成灰綠色 —— 因為那等於把三個通道一起往下拉，飽和度跟著沒了。
    #   改成「先把色相拉開（繞灰階外推 1.22 倍），再乘一個以 1.0 為中心的
    #   亮度係數」，山脈立體感在、林相與岩色仍分得出來。
    grey = base @ np.array([0.299, 0.587, 0.114], np.float32)
    base = np.clip(grey[..., None] + (base - grey[..., None]) * 1.22, 0, 255)
    sh = hillshade(hgt)[..., None]
    lit = np.clip(base * (0.70 + 0.62 * sh) + 14.0, 0, 255)
    base = np.where(land[..., None], lit,
                    base * 0.26 + np.array([8, 18, 36], np.float32) * 0.8)
    im = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).resize(
        (W * S, H * S), Image.LANCZOS)

    # ── 海岸線：陸地邊界一圈亮線，外加一圈暈開的淺灘光 ──────────────────
    coast = Image.fromarray((outline_mask(land, 1) * 255).astype(np.uint8)).resize(
        (W * S, H * S), Image.BILINEAR)
    glow = Image.fromarray((land * 255).astype(np.uint8)).resize(
        (W * S, H * S), Image.BILINEAR).filter(ImageFilter.GaussianBlur(6 * S))
    im = Image.composite(Image.new('RGB', im.size, (86, 150, 190)), im,
                         glow.point(lambda v: int(v * 0.30)))
    im = Image.composite(Image.new('RGB', im.size, (222, 240, 255)), im,
                         coast.point(lambda v: int(v * 0.62)))

    d = ImageDraw.Draw(im, 'RGBA')
    f_ttl = font(int(30 * S), True)
    f_nat = font(int(15 * S), True)
    f_city = font(int(21 * S), True)
    f_sub = font(int(11 * S))
    f_leg = font(int(11 * S))
    f_num = font(int(9 * S))

    # ── 格線 ────────────────────────────────────────────────────────────
    if not a.no_grid:
        for x in range(0, W + 1, GRID):
            maj = x % GRID_MAJOR == 0
            d.line([(x * S, 0), (x * S, H * S)],
                   fill=(255, 255, 255, 78 if maj else 26), width=(2 if maj else 1) * S)
        for y in range(0, H + 1, GRID):
            maj = y % GRID_MAJOR == 0
            d.line([(0, y * S), (W * S, y * S)],
                   fill=(255, 255, 255, 78 if maj else 26), width=(2 if maj else 1) * S)
        for x in range(0, W + 1, GRID_MAJOR):
            text(d, (x * S, 6 * S), str(x), f_num, (255, 232, 130, 255), 'ma', 3)
            text(d, (x * S, (H - 6) * S), str(x), f_num, (255, 232, 130, 255), 'md', 3)
        for y in range(0, H + 1, GRID_MAJOR):
            text(d, (6 * S, y * S), str(y), f_num, (255, 232, 130, 255), 'lm', 3)
            text(d, ((W - 6) * S, y * S), str(y), f_num, (255, 232, 130, 255), 'rm', 3)

    # ── 國界（只畫線，不填色塊）──────────────────────────────────────────
    #   ⚠ 邊界要**排除海岸**：region.png 的國土畫到海裡去，直接取相鄰不同色會
    #     把整條海岸線也當成國界，畫出來滿地都是線。只留「陸地上、兩國相接」
    #     的那些像素才是真的國界。
    nats = []
    rj = os.path.join(HERE, 'region_map.json')
    if os.path.exists(rj):
        J = json.load(open(rj, encoding='utf-8'))
        R = np.asarray(Image.open(os.path.join(HERE, 'region_map.png')).convert('L'))
        rh, rw = R.shape
        # 陸地遮罩降到國界圖的解析度
        lm = np.asarray(Image.fromarray((land * 255).astype(np.uint8))
                        .resize((rw, rh), Image.BILINEAR)) > 127
        Rl = np.where(lm, R, 0)
        edge = np.zeros(R.shape, bool)
        for dy, dx in ((1, 0), (0, 1)):
            aa = Rl[:rh - dy, :rw - dx]
            bb = Rl[dy:, dx:]
            diff = (aa != bb) & (aa > 0) & (bb > 0)     # 兩側都要是「某國」
            edge[:rh - dy, :rw - dx] |= diff
            edge[dy:, dx:] |= diff
        eim = Image.fromarray((edge * 255).astype(np.uint8)).resize(
            (W * S, H * S), Image.BILINEAR)
        im.paste(Image.new('RGB', im.size, (255, 244, 206)),
                 (0, 0), eim.point(lambda v: int(v * 0.85)))
        d = ImageDraw.Draw(im, 'RGBA')
        names = {r['id']: r['zh'] for r in J['regions']}
        for rid, zh in sorted(names.items()):
            if rid == 0 or not zh:
                continue
            m = Rl == rid
            if m.sum() < 400:
                continue
            lx, ly, rad = label_spot(m)
            nats.append((zh, lx * W / rw, ly * H / rh, rad, int(m.sum())))
        for zh, x, y, rad, px in nats:
            text(d, (x * S, y * S), zh, f_nat, (255, 250, 232, 245), 'mm', 4,
                 (20, 16, 8, 225))

    # ── 隱藏點位（★）────────────────────────────────────────────────────
    stars = []
    sj = os.path.join(HERE, 'starpoints.json')
    if not a.no_star and os.path.exists(sj):
        stars = json.load(open(sj, encoding='utf-8'))['points']
        for p in stars:
            x, y = p['x'] * S, p['y'] * S
            c = STAR_COL.get(p['kind'], (255, 255, 255))
            r = 4.0 * S
            pts = []
            for k in range(10):
                th = -np.pi / 2 + k * np.pi / 5
                rr = r if k % 2 == 0 else r * 0.42
                pts.append((x + rr * np.cos(th), y + rr * np.sin(th)))
            d.ellipse([x - r * 1.25, y - r * 1.25, x + r * 1.25, y + r * 1.25],
                      fill=(10, 12, 18, 88))
            d.polygon(pts, fill=c + (235,), outline=(0, 0, 0, 235))

    # ── 城與地標 ────────────────────────────────────────────────────────
    src = open(os.path.join(HERE, 'index.html'), encoding='utf-8').read()
    setts = parse_settlements(src)
    places = parse_places(src)
    # PLACES 有幾筆是城的名牌（同名同位置），不要標兩次
    named = {(s['n'], s['x'], s['y']) for s in setts}
    places = [p for p in places if (p['n'], p['x'], p['y']) not in named]

    place = Placer(d)
    # ⚠ 先放城再放地標：城的名牌比較重要，該佔到正上方那格
    for s in setts:
        x, y = s['x'] * S, s['y'] * S
        col = FACTION_COL.get(s['f'], (255, 255, 255))
        rr = SETTLE_R.get(s['t'], 6) * S
        tag = '%s · %s%s  (%d,%d)' % (TIER_ZH.get(s['t'], s['t']),
                                      FACTION_ZH.get(s['f'], s['f']),
                                      '・臨海' if s['c'] else '', s['x'], s['y'])
        cx, cy = place.put(x, y, rr + 8 * S,
                           [(s['n'], f_city, (255, 255, 255, 255)),
                            (tag, f_sub, (236, 230, 214, 250))])
        d.line([(x, y), (cx, cy)], fill=col + (110,), width=max(1, S // 2))

    for p in places:                       # 地標：藍菱形
        x, y, r = p['x'] * S, p['y'] * S, 5.5 * S
        d.polygon([(x, y - r), (x + r, y), (x, y + r), (x - r, y)],
                  fill=(120, 200, 255, 235), outline=(0, 0, 0, 235), width=S)
        place.put(x, y, r + 5 * S,
                  [(p['n'], f_sub, (222, 242, 255, 255)),
                   (p['ty'], f_num, (176, 210, 238, 245))])

    for s in setts:                        # 城：陣營色圓＋真實佔地環
        x, y = s['x'] * S, s['y'] * S
        col = FACTION_COL.get(s['f'], (255, 255, 255))
        rr = SETTLE_R.get(s['t'], 6) * S
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=col + (34,),
                  outline=col + (170,), width=S)
        r = 6.0 * S
        d.ellipse([x - r, y - r, x + r, y + r], fill=col + (240,),
                  outline=(0, 0, 0, 255), width=max(2, S))
        d.ellipse([x - r * .36, y - r * .36, x + r * .36, y + r * .36],
                  fill=(30, 22, 14, 255))

    # ── 標題 ────────────────────────────────────────────────────────────
    text(d, (18 * S, 16 * S), '銀月大陸 · 總圖', f_ttl, (255, 248, 228, 255), 'la', 5)
    text(d, (18 * S, 52 * S),
         '%d×%d 地圖像素   1 px = %d 世界單位   全境 %d×%d 世界單位   陸地 %.0f%%'
         % (W, H, MAP_SCALE, W * MAP_SCALE, H * MAP_SCALE, 100 * land.mean()),
         f_leg, (214, 226, 240, 245), 'la', 3)

    # ── 圖例 ────────────────────────────────────────────────────────────
    LW, LH = 306, 178
    lx, ly = 14, H - LH - 14
    d.rounded_rectangle([lx * S, ly * S, (lx + LW) * S, (ly + LH) * S], 8 * S,
                        fill=(14, 18, 26, 214), outline=(206, 190, 150, 210),
                        width=S)
    text(d, ((lx + 12) * S, (ly + 10) * S), '圖例', f_nat, (255, 240, 205, 255), 'la', 0)
    yy = ly + 36
    for fk in ('church', 'empire', 'free'):
        c = FACTION_COL[fk]
        cx = (lx + 22) * S
        d.ellipse([cx - 5 * S, yy * S - 5 * S, cx + 5 * S, yy * S + 5 * S],
                  fill=c + (240,), outline=(0, 0, 0, 255), width=S)
        n = sum(1 for s in setts if s['f'] == fk)
        d.text(((lx + 38) * S, yy * S), '%s 所屬城市（%d）' % (FACTION_ZH[fk], n),
               font=f_leg, fill=(232, 232, 232, 255), anchor='lm')
        yy += 20
    cx = (lx + 22) * S
    d.polygon([(cx, yy * S - 5 * S), (cx + 5 * S, yy * S),
               (cx, yy * S + 5 * S), (cx - 5 * S, yy * S)],
              fill=(120, 200, 255, 240), outline=(0, 0, 0, 235), width=S)
    d.text(((lx + 38) * S, yy * S), '地標／泊地（%d）' % len(places),
           font=f_leg, fill=(232, 232, 232, 255), anchor='lm')
    yy += 22
    d.line([((lx + 12) * S, yy * S), ((lx + 32) * S, yy * S)],
           fill=(255, 244, 206, 235), width=max(2, S))
    d.text(((lx + 38) * S, yy * S), '國界（%d 國）' % len(nats),
           font=f_leg, fill=(232, 232, 232, 255), anchor='lm')
    yy += 20
    if stars:
        d.text(((lx + 12) * S, yy * S),
               '★ 隱藏點位（%d，須長按感應才現形）' % len(stars),
               font=f_leg, fill=(236, 226, 190, 255), anchor='lm')
        yy += 19
    d.text(((lx + 12) * S, yy * S), '淡色環＝城市實際佔地半徑',
           font=f_leg, fill=(198, 198, 198, 255), anchor='lm')
    yy += 18
    d.text(((lx + 12) * S, yy * S),
           '格線 %d px（%d 世界單位；滿速約 %.1f 秒）'
           % (GRID, GRID * MAP_SCALE, GRID * MAP_SCALE / MAX_SPD_UPS),
           font=f_leg, fill=(198, 198, 198, 255), anchor='lm')

    # ── 比例尺 ──────────────────────────────────────────────────────────
    bl = 500
    bx, by = W - 14 - bl, H - 30
    d.line([(bx * S, by * S), ((bx + bl) * S, by * S)],
           fill=(255, 255, 255, 235), width=max(2, S))
    for k in range(6):
        x = (bx + bl * k / 5) * S
        d.line([(x, by * S), (x, (by - 7) * S)], fill=(255, 255, 255, 235),
               width=max(2, S))
        text(d, (x, (by - 9) * S), str(int(bl * k / 5)), f_num,
             (255, 255, 255, 240), 'md', 3)
    text(d, ((bx + bl) * S, (by + 5) * S),
         '地圖像素（%d 世界單位）' % (bl * MAP_SCALE),
         f_num, (232, 232, 232, 240), 'ra', 3)

    dst = os.path.join(HERE, a.out)
    im.save(dst)
    half = im.resize((W, H), Image.LANCZOS)
    dst2 = dst.replace('.png', '_half.png')
    half.save(dst2)
    print('%s  %dx%d' % (os.path.basename(dst), im.width, im.height))
    print('%s  %dx%d' % (os.path.basename(dst2), half.width, half.height))
    print('城 %d：%s' % (len(setts), '、'.join(s['n'] for s in setts)))
    print('地標 %d：%s' % (len(places), '、'.join(p['n'] for p in places)))
    print('國 %d：%s' % (len(nats), '、'.join(n[0] for n in nats)))
    print('星點 %d' % len(stars))


if __name__ == '__main__':
    main()
