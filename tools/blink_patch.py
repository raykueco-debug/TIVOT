#!/usr/bin/env python3
"""立繪眨眼補丁（原型）—— 從**原圖自己的睜眼像素**推出「半閉」「全閉」兩格。

不生成任何新像素：上眼瞼那條線（含睫毛）整條剪下來往下搬，蓋過的地方用
上下兩側的膚色逐欄內插填掉。所以線的粗細、顏色、眼尾翹角都是原圖的。

頭髮保護：垂在眼睛前面的髮絲在畫裡本來就在最上層 —— 先挑出來（髮色＋跟眼框外的
頭髮連在一起），填膚色時當成未知區，最後用**原圖**的頭髮蓋回去，所以眨眼時髮絲不會糊。

用法：
  python3 tools/blink_patch.py resources/si/renna_si_front.webp \
      --eye 480,100,522,126 --eye 540,118,578,144 --out <目錄>

輸出（<目錄>/<圖名>/）：
  half.png / closed.png    補丁（RGBA，只有改到的那一塊；座標在 blink.json）
  blink.json               {"w","h","half":{x,y,w,h,src},"closed":{...}}
  sheet.png                睜／半／閉 三格放大對照（驗收用）
  blink.gif                睜→半→閉→半→睜 的實際節奏（原寸＋放大）
"""
import argparse, json, os
import numpy as np
from PIL import Image, ImageFilter

HALF_S, CLOSED_S = 0.45, 0.92     # 眼瞼線移到（眼高−睫毛厚）的幾成


def lum(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def smooth(v, k=2):
    out = v.copy()
    for i in range(len(v)):
        lo, hi = max(0, i - k), min(len(v), i + k + 1)
        out[i] = np.median(v[lo:hi])
    return out


def analyse(rgb, box):
    """回傳這一隻眼睛在 box 裡的逐欄資料：上緣 t、下緣 b、睫毛厚 h、膚色、眼睛遮罩。"""
    x0, y0, x1, y1 = box
    roi = rgb[y0:y1, x0:x1].astype(np.float32)
    L = lum(roi)
    ring = np.concatenate([roi[0], roi[-1]])
    skin = np.median(ring, axis=0)
    Ls = lum(skin[None])[0]
    dist = np.sqrt(((roi - skin) ** 2).sum(-1))
    green = roi[..., 1] - np.maximum(roi[..., 0], roi[..., 2])
    dark = L < min(Ls - 70, 105)               # 睫毛是真的暗；淡色頭髮的線條（安雅）不算
    eyeish = (dist > 26) | (L > Ls + 6)          # 非膚色，或比膚色亮（眼白）
    H, W = L.shape
    t = np.full(W, -1.0); b = np.full(W, -1.0); h = np.zeros(W)
    for x in range(W):
        ys = np.where(dark[:, x])[0]
        if len(ys) == 0:
            continue
        t[x] = ys[0]
        run = 0
        while ys[0] + run < H and dark[ys[0] + run, x] and green[ys[0] + run, x] < 8:
            run += 1
        h[x] = max(1, run)
        y = ys[0]; last = y
        while y < min(H, ys[0] + 22):            # 往下走到眼睛結束（連續 2 格膚色就停）
            if eyeish[y, x]:
                last = y
            elif y - last >= 2:
                break
            y += 1
        b[x] = last
    cols = np.where(t >= 0)[0]
    segs, cur = [], [cols[0]]
    for c in cols[1:]:
        if c - cur[-1] <= 2:
            cur.append(c)
        else:
            segs.append(cur); cur = [c]
    segs.append(cur)
    seg = max(segs, key=len)
    xs = np.arange(seg[0], seg[-1] + 1)
    tt = smooth(np.interp(xs, cols, t[cols])); bb = smooth(np.interp(xs, cols, b[cols]))
    hh = smooth(np.interp(xs, cols, h[cols]))
    hh = np.minimum(hh, np.median(hh) + 1)
    bb = np.maximum(bb, tt + hh + 1)
    # 眼睛遮罩（整張圖座標），外擴 1px
    M = np.zeros(rgb.shape[:2], bool)
    for i, xr in enumerate(xs):
        M[int(y0 + tt[i]) - 1:int(y0 + bb[i]) + 2, x0 + int(xr)] = True   # 往上多 1px：睫毛上緣的反鋸齒邊
    # 睫毛上緣往上 4px 內的暗點（往上翹的單根睫毛尖端）也要抹掉，不然閉眼後會留一排點線
    for i, xr in enumerate(xs):
        x = int(xr)
        for yy in range(max(0, int(tt[i]) - 5), max(0, int(tt[i]) - 1)):
            if dark[yy, x]:                       # 跟睫毛同一個暗度標準（淡色髮絲的陰影不算）
                M[y0 + yy, x0 + x] = True
    # 再從睫毛往下做連通擴展：凡是「非膚色／比膚色亮」而且連到眼睛的都算（虹膜、眼白的下緣）
    E = np.zeros(rgb.shape[:2], bool)
    E[y0:y1, x0 + xs[0]:x0 + xs[-1] + 1] = eyeish[:, xs[0]:xs[-1] + 1]
    from collections import deque
    q = deque(zip(*np.where(M & E))); seen = M.copy()
    ylim = {x0 + int(xr): y0 + int(bb[i]) + 3 for i, xr in enumerate(xs)}   # 每一欄最多往下 3px（不溢進頭髮）
    ytop = {x0 + int(xr): y0 + int(tt[i]) - 2 for i, xr in enumerate(xs)}   # 每一欄最多往上到自己的睫毛上緣（不吃雙眼皮那一塊）
    while q:
        yy, xx = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = yy + dy, xx + dx
            if nx in ylim and ytop[nx] <= ny <= ylim[nx] and E[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    M = seen
    M = np.array(Image.fromarray(M.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))) > 0
    # 眼角往左右多擴 2px（只水平，不往上 —— 往上會吃掉雙眼皮的摺線），清掉眼角殘留的眼白
    M0 = M.copy()
    for dx in (1, 2):
        M[:, dx:] |= M0[:, :-dx]
        M[:, :-dx] |= M0[:, dx:]
    # 眼睛內部（上下眼瞼之間）：這裡一律不算頭髮 —— 眼白、虹膜亮部與淡色頭髮常常同色
    I = np.zeros(rgb.shape[:2], bool)
    xf = xs.astype(float)
    tp = np.polyval(np.polyfit(xf, tt, 2), xf); bp = np.polyval(np.polyfit(xf, bb, 2), xf)
    for i, xr in enumerate(xs):
        I[int(round(y0 + tp[i])):int(round(y0 + max(bp[i], bb[i]))) + 1, x0 + int(xr)] = True
    return dict(x0=x0, y0=y0, xs=xs, t=tt, b=bb, h=hh, skin=skin, Ls=Ls, M=M, I=I)


def kmeans(a, k, iters=15, seed=0):
    rng = np.random.default_rng(seed)
    if len(a) > 20000:
        a = a[rng.choice(len(a), 20000, replace=False)]
    c = a[rng.choice(len(a), min(k, len(a)), replace=False)].astype(np.float32)
    for _ in range(iters):
        l = ((a[:, None, :] - c[None]) ** 2).sum(-1).argmin(1)
        for j in range(len(c)):
            if (l == j).any():
                c[j] = a[l == j].mean(0)
    share = np.bincount(l, minlength=len(c)) / len(a)
    return c, share


def hair_palette(arr, eyes, skin):
    """這個角色的髮色（幾種深淺）：頭頂一帶＋各眼框正上方，扣掉膚色、透明、太暗（線稿）的。"""
    rgb = arr[..., :3].astype(np.float32); al = arr[..., 3]
    rows = np.where((al > 200).any(1))[0]
    top = rows[0] if len(rows) else 0
    samp = []
    band = rgb[top + 8:top + 90]; ab = al[top + 8:top + 90]
    samp.append(band[ab > 200])
    for e in eyes:
        x0, y0 = e['x0'], e['y0']
        xa, xb = x0 + int(e['xs'][0]) - 10, x0 + int(e['xs'][-1]) + 10
        blk = rgb[max(0, y0 - 28):y0 - 2, max(0, xa):xb]
        samp.append(blk.reshape(-1, 3))
    a = np.concatenate(samp)
    ds = np.sqrt(((a - skin) ** 2).sum(-1))
    a = a[(ds > 40) & (lum(a) > 55)]
    if len(a) < 50:
        return np.zeros((0, 3), np.float32)
    c, share = kmeans(a, 6)
    keep = (share > 0.06) & (np.sqrt(((c - skin) ** 2).sum(-1)) > 40)
    return c[keep]


def hair_alpha(rgb, pal, skin, M, eyes, pad=14, tol=48, soft=22):
    """回傳整張圖大小的頭髮 alpha（0~1）。只在眼框外擴 pad 的範圍內算。
    條件：顏色接近某一種髮色、比膚色更像頭髮，而且**連到眼框外的頭髮**
    （眼白／虹膜被睫毛線圍住，連不出去 —— 白髮角色才不會把眼白當頭髮）。"""
    A = np.zeros(rgb.shape[:2], np.float32)
    if len(pal) == 0:
        return A
    for e in eyes:
        ys, xs = np.where(e['M'])
        y0, y1 = max(0, ys.min() - pad), min(rgb.shape[0], ys.max() + pad + 1)
        x0, x1 = max(0, xs.min() - pad), min(rgb.shape[1], xs.max() + pad + 1)
        sub = rgb[y0:y1, x0:x1].astype(np.float32)
        dh = np.sqrt(((sub[:, :, None, :] - pal[None, None]) ** 2).sum(-1)).min(-1)
        dsk = np.sqrt(((sub - skin) ** 2).sum(-1))
        a = np.clip((tol + soft - dh) / soft, 0, 1) * np.clip((dsk - dh) / 20.0, 0, 1)
        m = M[y0:y1, x0:x1]
        # 眼框裡面：還要「比像眼睛更像頭髮」—— 藍眼配淡紫髮（安雅）會把虹膜當頭髮，
        # 那樣眼睛就閉不起來。眼睛的顏色取眼框內的 k-means（虹膜／眼白／睫毛）。
        ec, _ = kmeans(sub[e['I'][y0:y1, x0:x1]], 6)
        de = np.sqrt(((sub[:, :, None, :] - ec[None, None]) ** 2).sum(-1)).min(-1)
        # 頭髮自己也會被算進眼睛的色群裡，所以比的是「髮色明顯更近」而不是「一定更近」
        # 眼睛內部：只有「非常接近髮色、而且明顯不像眼睛」的才算（穿過眼睛的髮絲），其餘一律不是頭髮
        strict = np.clip((22 - dh) / 8.0, 0, 1) * np.clip((de - dh - 12) / 8.0, 0, 1)
        Ie = e['I'][y0:y1, x0:x1]
        a = np.where(Ie, np.minimum(a, strict), a)
        # 填色區的其他地方（睫毛上緣那一圈）：要比起眼睛的顏色（含睫毛的棕）更像頭髮 ——
        # 半透明的睫毛尖端混了膚色會接近淡色髮，不擋的話會被「蓋回去」成一排點
        a = np.where(m & ~Ie, a * np.clip((de - dh - 4) / 8.0, 0, 1), a)
        core = a > 0.5
        seen = core & ~m                          # 種子：眼框外的頭髮
        from collections import deque
        q = deque(zip(*np.where(seen)))
        H, W = core.shape
        while q:
            yy, xx = q.popleft()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                ny, nx = yy + dy, xx + dx
                if 0 <= ny < H and 0 <= nx < W and core[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; q.append((ny, nx))
        conn = np.array(Image.fromarray(seen.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))) > 0
        A[y0:y1, x0:x1] = np.maximum(A[y0:y1, x0:x1], a * conn)
    return A


def harmonic_fill(img, M, iters=400):
    """遮罩內用周圍像素做擴散內插（拉普拉斯），平滑、不會有直條紋。"""
    out = img.copy()
    ys, xs = np.where(M)
    y0, y1, x0, x1 = ys.min() - 1, ys.max() + 2, xs.min() - 1, xs.max() + 2
    sub = out[y0:y1, x0:x1]; m = M[y0:y1, x0:x1]
    # 初值：遮罩內先放周圍平均
    sub[m] = sub[~m].mean(0)
    for _ in range(iters):
        avg = (np.roll(sub, 1, 0) + np.roll(sub, -1, 0) + np.roll(sub, 1, 1) + np.roll(sub, -1, 1)) / 4
        sub[m] = avg[m]
    out[y0:y1, x0:x1] = sub
    return out


def frame(rgb, eye, s, skinfill):
    """s＝眼瞼線移到 t+(b-t-h)·s。skinfill＝整隻眼睛抹成皮膚之後的圖。

    睫毛線當成**一整條圖層**剪下來（alpha＝暗度×不是綠色），再沿一條平滑的
    位移曲線做次像素的垂直重取樣 —— 逐欄取整數會變成鋸齒。"""
    out = rgb.astype(np.float32).copy()
    x0, y0, Ls = eye['x0'], eye['y0'], eye['Ls']
    xs = eye['xs']; n = len(xs)
    u = np.linspace(0, 1, n)
    xf = xs.astype(float)
    t = np.polyval(np.polyfit(xf, eye['t'], 2), xf)
    bb = np.polyval(np.polyfit(xf, eye['b'], 2), xf)
    hc = float(np.median(eye['h'])) + 1.5
    taper = np.sin(np.pi * u) ** 0.5
    d = np.maximum(0, (bb - t - hc) * s) * taper
    BH = int(np.ceil(hc)) + 3
    for i, xr in enumerate(xs):
        x = x0 + int(xr)
        ty = y0 + t[i] - 1.0                     # 圖層從睫毛上緣往上 1px 起
        ys = ty + np.arange(BH)
        # 原圖垂直線性取樣出這一欄的睫毛圖層
        def samp(img, yy):
            y_ = np.clip(yy, 0, img.shape[0] - 1.001); i0 = np.floor(y_).astype(int); f = (y_ - i0)[:, None]
            return img[i0, x] * (1 - f) + img[i0 + 1, x] * f
        band = samp(rgb.astype(np.float32), ys)
        Lb = lum(band)
        hue = np.maximum(np.clip((band[:, 0] - band[:, 1] - 6) / 8.0, 0, 1),   # 睫毛偏紅棕（R−G≥12）、虹膜暗部 R−G≈5
                         np.clip((45 - Lb) / 20.0, 0, 1))                  # 極暗的一律算睫毛（線芯）
        rw = np.clip(hc + 1.5 - np.arange(BH), 0, 1)        # 只取睫毛那幾列（再往下是虹膜）
        al = np.clip((Ls - 25 - Lb) / 70.0, 0, 1) * hue * rw
        col = eye['M'][:, x]
        rows = np.where(col)[0]
        if s < 0.7:
            rows = rows[rows < y0 + t[i] + d[i] + hc]
        out[rows, x] = skinfill[rows, x]
        # 貼到新位置：輸出列 y 對應圖層座標 (y - (ty + d))
        for yo in range(int(np.floor(ty + d[i])), int(np.ceil(ty + d[i] + BH)) + 1):
            k = yo - (ty + d[i])
            if k < 0 or k > BH - 1:
                continue
            k0 = int(np.floor(k)); f = k - k0; k1 = min(BH - 1, k0 + 1)
            px = band[k0] * (1 - f) + band[k1] * f
            a_ = al[k0] * (1 - f) + al[k1] * f
            out[yo, x] = out[yo, x] * (1 - a_) + px * a_
    if s >= 0.7:
        cols = x0 + xs.astype(int)
        rest = eye['M'].copy(); rest[:, cols.min():cols.max() + 1] = False
        out[rest] = skinfill[rest]
    return out


def patch(orig, new, pad=2):
    diff = np.abs(new - orig.astype(np.float32)).sum(-1) > 3
    ys, xs = np.where(diff)
    x0, x1 = xs.min() - pad, xs.max() + pad + 1
    y0, y1 = ys.min() - pad, ys.max() + pad + 1
    m = diff[y0:y1, x0:x1].astype(np.float32)
    # 改到的地方 alpha 255，外圍 2px 羽化
    from PIL import ImageFilter
    mi = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    a = np.maximum(np.array(mi), (m * 255)).astype(np.uint8)
    rgba = np.dstack([np.clip(new[y0:y1, x0:x1], 0, 255).astype(np.uint8), a])
    return Image.fromarray(rgba, 'RGBA'), (int(x0), int(y0), int(x1 - x0), int(y1 - y0))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--eye', action='append', required=True, help='x0,y0,x1,y1（原圖像素）')
    ap.add_argument('--out', required=True)
    ap.add_argument('--face', help='驗收圖的裁切框 x0,y0,x1,y1（預設：兩眼外擴）')
    ap.add_argument('--no-hair', action='store_true', help='關掉頭髮保護（對照用）')
    ap.add_argument('--hairmask', action='store_true', help='另存 hairmask.png（頭髮 alpha 疊紅，除錯用）')
    A = ap.parse_args()
    im = Image.open(A.src).convert('RGBA')
    arr = np.array(im)
    rgb = arr[..., :3]
    eyes = [analyse(rgb, tuple(int(v) for v in e.split(','))) for e in A.eye]
    name = os.path.splitext(os.path.basename(A.src))[0]
    od = os.path.join(A.out, name); os.makedirs(od, exist_ok=True)
    frames = {}
    skin = np.median(np.stack([e['skin'] for e in eyes]), 0)
    Mall = np.zeros(rgb.shape[:2], bool)
    for e in eyes:
        Mall |= e['M']
    pal = [] if A.no_hair else hair_palette(arr, eyes, skin)
    HA = hair_alpha(rgb, np.array(pal, np.float32).reshape(-1, 3), skin, Mall, eyes) if len(pal) else np.zeros(rgb.shape[:2], np.float32)
    # 填膚色時，眼框裡的頭髮也當成未知（不然髮色會被擴散進皮膚）
    hard = (HA > 0.25) & (np.array(Image.fromarray(Mall.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0)
    fills = {id(e): harmonic_fill(rgb.astype(np.float32), e['M'] | hard) for e in eyes}
    meta = {'w': im.width, 'h': im.height}
    for key, s in (('half', HALF_S), ('closed', CLOSED_S)):
        cur = rgb.astype(np.float32)
        for e in eyes:
            cur = frame(cur, e, s, fills[id(e)])
        a3 = HA[..., None]
        cur = cur * (1 - a3) + rgb.astype(np.float32) * a3     # 原圖的頭髮蓋回最上層
        p, (x, y, w, h) = patch(rgb, cur)
        p.save(os.path.join(od, key + '.png'))
        meta[key] = dict(x=x, y=y, w=w, h=h, src=key + '.png')
        full = im.copy(); full.alpha_composite(p, (x, y))
        frames[key] = full
    frames['open'] = im
    json.dump(meta, open(os.path.join(od, 'blink.json'), 'w'), indent=1)
    if A.hairmask:
        dbg = rgb.astype(np.float32).copy()
        dbg = dbg * (1 - HA[..., None] * 0.6) + np.array([255, 0, 0]) * (HA[..., None] * 0.6)
        Image.fromarray(dbg.astype(np.uint8)).save(os.path.join(od, 'hairmask.png'))

    if A.face:
        fb = tuple(int(v) for v in A.face.split(','))
    else:
        xs = [e['x0'] + e['xs'][0] for e in eyes] + [e['x0'] + e['xs'][-1] for e in eyes]
        ys = [e['y0'] for e in eyes]
        cx, cy = (min(xs) + max(xs)) / 2, min(ys) + 12
        fb = (int(cx - 70), int(cy - 45), int(cx + 70), int(cy + 45))

    def crop(k, z):
        c = frames[k].crop(fb)
        bg = Image.new('RGBA', c.size, (40, 40, 48, 255)); bg.alpha_composite(c)
        return bg.convert('RGB').resize((c.width * z, c.height * z), Image.LANCZOS)

    z = 4
    tiles = [crop(k, z) for k in ('open', 'half', 'closed')]
    sheet = Image.new('RGB', (tiles[0].width * 3 + 20, tiles[0].height), (20, 20, 24))
    for i, t in enumerate(tiles):
        sheet.paste(t, (i * (t.width + 10), 0))
    sheet.save(os.path.join(od, 'sheet.png'))

    # GIF：左＝實際大小（手機上臉約這麼大），右＝放大 3 倍
    seq = [('open', 1400), ('half', 50), ('closed', 90), ('half', 50), ('open', 1800),
           ('half', 50), ('closed', 80), ('half', 50), ('open', 160), ('half', 50), ('closed', 80), ('half', 50), ('open', 1600)]
    gif = []
    for k, ms in seq:
        a = crop(k, 1); b = crop(k, 3)
        g = Image.new('RGB', (a.width + b.width + 10, b.height), (20, 20, 24))
        g.paste(a, (0, (b.height - a.height) // 2)); g.paste(b, (a.width + 10, 0))
        gif.append((g, ms))
    gif[0][0].save(os.path.join(od, 'blink.gif'), save_all=True,
                   append_images=[g for g, _ in gif[1:]], duration=[ms for _, ms in gif], loop=0)
    print(json.dumps(meta))
    for e in eyes:
        print('eye', e['x0'] + e['xs'][0], '..', e['x0'] + e['xs'][-1], 't', np.round(e['t'], 1).tolist()[:6], 'b', np.round(e['b'], 1).tolist()[:6])


if __name__ == '__main__':
    main()
