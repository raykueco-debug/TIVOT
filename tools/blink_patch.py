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
        M[int(y0 + tt[i]):int(y0 + bb[i]) + 2, x0 + int(xr)] = True
    # 睫毛上緣往上 4px 內的暗點（往上翹的單根睫毛尖端）也要抹掉，不然閉眼後會留一排點線
    for i, xr in enumerate(xs):
        x = int(xr)
        for yy in range(max(0, int(tt[i]) - 5), max(0, int(tt[i]) - 1)):
            # 睫毛上緣的反鋸齒邊（緊貼的 2 列，比膚色暗就算）＋翹起的睫毛尖（真的暗）；淺色的雙眼皮摺線不算
            if dark[yy, x] or (yy >= int(tt[i]) - 2 and L[yy, x] < Ls - 25):
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
    # 只往下、左右外擴（不往上 —— 往上會吃掉雙眼皮的摺線）
    M1 = M.copy(); M1[1:] |= M[:-1]; M = M1
    # 眼角往左右多擴 2px（只水平，不往上 —— 往上會吃掉雙眼皮的摺線），清掉眼角殘留的眼白
    M0 = M.copy()
    for dx in (1, 2):
        M[:, dx:] |= M0[:, :-dx]
        M[:, :-dx] |= M0[:, dx:]
    # 眼角的眼白常常再多出幾格：往左右 3~5px 內「比膚色亮」的也抹掉（不亮的不動，不吃到皮膚與頭髮）
    bright = np.zeros(rgb.shape[:2], bool)
    bright[y0:y1, x0:x1] = L > Ls + 4
    M0 = M.copy()
    for dx in (3, 4, 5):
        M[:, dx:] |= M0[:, :-dx] & bright[:, dx:]
        M[:, :-dx] |= M0[:, dx:] & bright[:, :-dx]
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


def hair_alpha(rgb, pal, skin, M, eyes, pad=14, tol=48, soft=22, keeps=()):
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
        Ie = e['I'][y0:y1, x0:x1].copy()
        # 保留框（標註）：蓋在眼睛上的髮束 —— 框內不套眼睛內部的嚴格判定，像頭髮就蓋回原圖
        K = np.zeros(Ie.shape, bool)
        for kx0, ky0, kx1, ky1 in keeps:
            K[max(0, ky0 - y0):max(0, ky1 - y0), max(0, kx0 - x0):max(0, kx1 - x0)] = True
        Ie &= ~K
        a = np.where(Ie, np.minimum(a, strict), a)
        # 填色區的其他地方（睫毛上緣那一圈）：要比起眼睛的顏色（含睫毛的棕）更像頭髮 ——
        # 半透明的睫毛尖端混了膚色會接近淡色髮，不擋的話會被「蓋回去」成一排點
        a = np.where(m & ~Ie & ~K, a * np.clip((de - dh - 4) / 8.0, 0, 1), a)
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


def poisson_blend(guide, border, R, iters=500):
    """梯度域融合：R 裡保留 guide 的明暗（拉普拉斯），邊界接 border 的顏色。
    拉伸出來的眼皮整片偏某個色、邊緣又是硬的 ＝ 一塊眼睛形狀的補丁；這一步把它的色調
    逐點接到周圍原圖（上緣眼皮陰影、下緣臉頰、兩端眼角），紋理與陰影留著。"""
    if not R.any():
        return guide
    ys, xs = np.where(R)
    y0, y1, x0, x1 = ys.min() - 1, ys.max() + 2, xs.min() - 1, xs.max() + 2
    g = guide[y0:y1, x0:x1].astype(np.float32); m = R[y0:y1, x0:x1]
    b = border[y0:y1, x0:x1].astype(np.float32)
    f = np.where(m[..., None], g, b)
    # 紋理（梯度）只取 R 裡面的鄰居：R 外面緊鄰的是眼白／睫毛，那個落差不是眼皮的紋理
    sh = [(1, 0), (-1, 0), (1, 1), (-1, 1)]
    inn = [np.roll(m, k, a) for k, a in sh]
    gsum = sum(np.where(inn[j][..., None], g - np.roll(g, k, a), 0) for j, (k, a) in enumerate(sh))
    bsum = sum(np.where(~inn[j][..., None], np.roll(b, k, a), 0) for j, (k, a) in enumerate(sh))
    for _ in range(iters):
        fin = sum(np.where(inn[j][..., None], np.roll(f, k, a), 0) for j, (k, a) in enumerate(sh))
        f[m] = ((fin + bsum + gsum) / 4)[m]
    out = guide.copy()
    out[y0:y1, x0:x1][m] = f[m]
    return out


def frame(rgb, eye, s, skinfill):
    """s＝眼瞼線移到 t+(b-t-h)·s。skinfill＝眼睛與眼框內頭髮都抹成皮膚之後的圖。

    · 眼瞼皮膚：**把睫毛上方那幾列真的眼皮往下拉伸**到新的眼瞼線（動畫的閉眼就是上眼皮
      往下拉）—— 顏色與平塗陰影都是原圖的，不會變成一塊擴散抹平的色塊。
      拉伸的來源取 skinfill（眼皮上的髮絲已換成皮膚，免得把髮絲一起拉長；髮絲最後由原圖蓋回）。
    · 睫毛線：一整條圖層（alpha＝暗度×不是虹膜色）沿平滑曲線做次像素重取樣。
    · 半閉：睫毛下面再帶 SH 列「眼球上的陰影」一起搬，漸淡接回原圖 —— 不然露出來的是
      虹膜中段的亮色，讀成一條平切的色塊。
    · 全閉：新睫毛線（含）以下用 skinfill。"""
    out = rgb.astype(np.float32).copy()
    src = skinfill
    x0, y0, Ls = eye['x0'], eye['y0'], eye['Ls']
    xs = eye['xs']; n = len(xs)
    u = np.linspace(0, 1, n)
    xf = xs.astype(float)
    t = np.polyval(np.polyfit(xf, eye['t'], 2), xf)
    bb = np.polyval(np.polyfit(xf, eye['b'], 2), xf)
    hc = float(np.median(eye['h'])) + 1.5
    taper = np.sin(np.pi * u) ** 0.5
    d = np.maximum(0, (bb - t - hc) * s) * taper
    SH = 3 if s < 0.7 else 0                       # 半閉：眼球陰影帶幾列
    BH = int(np.ceil(hc)) + 3 + SH
    LID = 6                                        # 眼皮來源：睫毛上方幾列
    SHD = 2                                        # 其中貼著睫毛的眼影陰影（維持原寬度）
    rgbf = rgb.astype(np.float32)
    lidm = np.zeros(rgb.shape[:2], bool)              # 拉伸出來的眼皮（最後做水平平滑）
    wm = np.zeros(rgb.shape[:2], bool)                # 這一格改寫過的皮膚（做梯度域融合的範圍）
    lash = []

    def samp(img, x, yy):
        y_ = np.clip(yy, 0, img.shape[0] - 1.001); i0 = np.floor(y_).astype(int); f = (y_ - i0)[:, None]
        return img[i0, x] * (1 - f) + img[i0 + 1, x] * f

    for i, xr in enumerate(xs):
        x = x0 + int(xr)
        ty = y0 + t[i] - 1.0                       # 睫毛圖層的起點（上緣往上 1px）
        band = samp(rgbf, x, ty + np.arange(BH))
        Lb = lum(band)
        hue = np.maximum(np.clip((band[:, 0] - band[:, 1] - 6) / 8.0, 0, 1),   # 睫毛偏紅棕、虹膜暗部 R−G≈5
                         np.clip((45 - Lb) / 20.0, 0, 1))                  # 極暗的一律算睫毛（線芯）
        k = np.arange(BH)
        rw = np.clip(hc + 1.5 - k, 0, 1)                                    # 睫毛那幾列
        al = np.clip((Ls - 25 - Lb) / 70.0, 0, 1) * hue * rw
        if SH:
            sh = np.clip(1 - (k - (hc + 1.5)) / SH, 0, 1) * (k >= hc + 1.5) * 0.85   # 陰影帶：漸淡
            al = np.maximum(al, sh)

        # ① 眼皮：分兩段 —— 乾淨的眼皮 [top0, ty−SHD) 拉伸到 [top0, ty+d−SHD)；
        #    貼著睫毛的那條眼影陰影 [ty−SHD, ty) **維持原寬度**，只平移到新睫毛線正上方。
        #    （整段一起拉伸的話，1~2px 的粉色眼影會被拉成十幾 px，整片眼皮偏粉偏暗 ＝ 色差。）
        top0 = ty - LID
        mid_src = ty - SHD                     # 來源：乾淨眼皮的下緣
        mid_dst = ty + d[i] - SHD              # 目的：拉伸後的下緣
        dst0, dst1 = int(np.floor(top0)), int(np.ceil(ty + d[i] + 1))
        for yo in range(dst0, dst1):
            if yo < mid_dst:
                v = (yo - top0) / max(1e-3, (mid_dst - top0))
                sy = top0 + np.clip(v, 0, 1) * (mid_src - top0)
            else:
                sy = mid_src + (yo - mid_dst)   # 陰影帶：原樣平移
            if eye['M'][yo, x] or yo >= ty:
                out[yo, x] = samp(src, x, np.array([sy]))[0]
                wm[yo, x] = True
                if yo >= ty and yo < mid_dst:
                    lidm[yo, x] = True
        # ② 全閉：新睫毛線以下，遮罩裡剩下的用 skinfill（下眼瞼那一窄條）
        if s >= 0.7:
            rows = np.where(eye['M'][:, x])[0]
            rows = rows[rows >= ty + d[i]]            # 從睫毛線上緣就鋪：睫毛半透明的地方底下要是皮膚，不是原本的虹膜
            out[rows, x] = skinfill[rows, x]
            wm[rows, x] = True
        lash.append((x, ty + d[i], band, al))
    # 拉伸出來的眼皮做水平平滑（在畫睫毛之前，睫毛才不會被抹糊）
    out = hsmooth(out, lidm)
    out = poisson_blend(out, skinfill, wm)
    # ③ 睫毛（＋半閉的陰影帶）貼到新位置
    for x, top, band, al in lash:
        for yo in range(int(np.floor(top)), int(np.ceil(top + BH)) + 1):
            kk = yo - top
            if kk < 0 or kk > BH - 1:
                continue
            k0 = int(np.floor(kk)); f = kk - k0; k1 = min(BH - 1, k0 + 1)
            px = band[k0] * (1 - f) + band[k1] * f
            a_ = al[k0] * (1 - f) + al[k1] * f
            out[yo, x] = out[yo, x] * (1 - a_) + px * a_
    if s >= 0.7:
        cols = x0 + xs.astype(int)
        rest = eye['M'].copy(); rest[:, cols.min():cols.max() + 1] = False
        out[rest] = skinfill[rest]
    return out


def hsmooth(img, m, r=2):
    """只在 m 裡做水平方向的盒狀平滑 —— 逐欄拉伸會把欄與欄的小差異放大成直條紋。"""
    out = img.copy()
    acc = np.zeros_like(img); cnt = 0
    for dx in range(-r, r + 1):
        acc += np.roll(img, dx, 1); cnt += 1
    out[m] = (acc / cnt)[m]
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
    ap.add_argument('--keep', action='append', default=[], help='保留框 x0,y0,x1,y1：蓋在眼睛上的髮束（標註）')
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
    HA = hair_alpha(rgb, np.array(pal, np.float32).reshape(-1, 3), skin, Mall, eyes, keeps=[tuple(int(v) for v in k.split(',')) for k in A.keep]) if len(pal) else np.zeros(rgb.shape[:2], np.float32)
    # 填膚色時，眼框裡的頭髮也當成未知（不然髮色會被擴散進皮膚）
    hard = (HA > 0.04) & (np.array(Image.fromarray(Mall.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0)
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
