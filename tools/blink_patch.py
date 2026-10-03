#!/usr/bin/env python3
"""立繪眨眼補丁（原型）—— 從**原圖自己的睜眼像素**推出「半閉」「全閉」兩格。

不生成任何新像素：上眼瞼那條線（含睫毛）整條剪下來往下搬，蓋過的地方用
上下兩側的膚色逐欄內插填掉。所以線的粗細、顏色、眼尾翹角都是原圖的。

頭髮保護：垂在眼睛前面的髮絲在畫裡本來就在最上層 —— 先挑出來（髮色＋跟眼框外的
頭髮連在一起），填膚色時當成未知區，最後用**原圖**的頭髮蓋回去，所以眨眼時髮絲不會糊。

用法：
  python3 tools/blink_patch.py resources/si/renna_si_front.webp --out <目錄>
    先在 .venv-face 跑 tools/face_parse.py <圖名>（臉部分割），這支會自動讀
    tools/_blink_seg/<圖名>/classes_s1.6.png：眼框自動找、膚色取臉類、模型判成頭髮的
    自動當保留框。沒有分割圖時要手給 --eye（舊作法，--no-seg 可強制走舊作法對照）：
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
from PIL import Image, ImageDraw, ImageFilter

HALF_S, CLOSED_S = 0.45, 0.92     # 眼瞼線移到（眼高−睫毛厚）的幾成


def lum(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def smooth(v, k=2):
    out = v.copy()
    for i in range(len(v)):
        lo, hi = max(0, i - k), min(len(v), i + k + 1)
        out[i] = np.median(v[lo:hi])
    return out


# ── 臉部分割（tools/face_parse.py 的輸出）────────────────────────────
# 類別：0 背景 1 頭髮 2 眼睛 3 嘴 4 臉 5 皮膚 6 衣服；255＝裁切框外。
# 模型的解析度大約是原圖 1:1，邊界會差 1~2px，而且**橫過臉的細髮絲常被判成臉** ——
# 所以它只負責「大範圍」：眼框在哪、哪一大片是頭髮；細髮絲照舊由顏色規則補。
SEG_HAIR, SEG_EYE, SEG_FACE = 1, 2, 4


def load_seg(path, shape):
    c = np.array(Image.open(path))
    if c.shape != tuple(shape[:2]):
        raise SystemExit(f'分割圖尺寸 {c.shape} 與原圖 {shape[:2]} 不符：{path}')
    return c


def _dil(m, r):
    return np.array(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(2 * r + 1))) > 0


def _ero(m, r):
    return np.array(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(2 * r + 1))) > 0


def seg_hair_core(seg):
    """模型判成頭髮、而且離眼睛類至少 2px 的像素（邊界會差 1~2px，貼著睫毛的那一圈不算）。"""
    return _ero(seg == SEG_HAIR, 1) & ~_dil(seg == SEG_EYE, 2)


def seg_skin(rgb, seg, box):
    """眼框外一圈的「臉」類像素中位數（比框上下兩列準：那兩列常常碰到頭髮或眉毛）。"""
    x0, y0, x1, y1 = box
    H, W = seg.shape
    r = np.zeros(seg.shape, bool)
    r[max(0, y0 - 8):min(H, y1 + 8), max(0, x0 - 8):min(W, x1 + 8)] = True
    r[y0:y1, x0:x1] = False
    m = r & _ero(seg == SEG_FACE, 1)
    if m.sum() < 40:
        return None
    px = rgb[m].astype(np.float32)
    L = lum(px)
    px = px[L > np.percentile(L, 35)]          # 去掉陰影與線稿，留平塗的膚色
    return np.median(px, axis=0)


def seg_lid_skin(rgb, seg, box):
    """眼皮該有的顏色：眼框**兩側、與上半部同高**的「臉」類像素中位數。
    瀏海壓著的那一帶皮膚本來就在陰影裡 —— 拿整張臉的亮膚色會亮出一塊（諾薇兒踩過）。"""
    x0, y0, x1, y1 = box
    H, W = seg.shape
    ym = (y0 + y1) // 2
    r = np.zeros(seg.shape, bool)
    r[max(0, y0 - 4):ym, max(0, x0 - 12):x0] = True
    r[max(0, y0 - 4):ym, x1:min(W, x1 + 12)] = True
    m = r & _ero(seg == SEG_FACE, 1)
    if m.sum() < 12:
        return None
    px = rgb[m].astype(np.float32)
    L = lum(px)
    px = px[L > np.percentile(L, 20)]          # 去掉線稿
    return np.median(px, axis=0)


def seg_eyes(seg, pad=(3, 6, 3, 5), rgb=None):
    """從眼睛類找兩隻眼睛的框（左、上、右、下各外擴 pad）。
    取最大的連通塊，第二塊要有最大塊的 1/4 以上、而且高度落在同一帶 —— 側臉只剩一隻就回一個。
    rgb 有給的話，整塊幾乎全黑的不算眼睛（露娜的眼罩會被模型判成眼睛，待修D）。"""
    from scipy import ndimage as nd
    lab, k = nd.label(seg == SEG_EYE)
    if k == 0:
        return []
    if rgb is not None:
        Lm = nd.mean(lum(rgb.astype(np.float32)), lab, range(1, k + 1))
        for j in range(k):
            if Lm[j] < 70:
                lab[lab == j + 1] = 0
    sz = nd.sum(np.ones_like(lab), lab, range(1, k + 1))
    order = np.argsort(-sz)
    sl = nd.find_objects(lab)
    boxes = []
    big = sz[order[0]]
    if big <= 0:
        return []
    for i in order[:4]:
        if sz[i] < big * 0.25:
            break
        ys, xs = sl[i]
        bx = (xs.start - pad[0], ys.start - pad[1], xs.stop + pad[2], ys.stop + pad[3])
        if boxes:
            b0 = boxes[0]
            h0 = b0[3] - b0[1]
            if abs((bx[1] + bx[3]) / 2 - (b0[1] + b0[3]) / 2) > h0 * 1.6:
                continue
        boxes.append(tuple(int(v) for v in bx))
        if len(boxes) == 2:
            break
    return sorted(boxes)


def analyse(rgb, box, seg=None, hs=None):
    """回傳這一隻眼睛在 box 裡的逐欄資料：上緣 t、下緣 b、睫毛厚 h、膚色、眼睛遮罩。
    seg＝臉部分割的類別圖、hs＝seg_hair_core(seg)（整張圖座標）；有的話膚色取眼睛周圍的
    「臉」類、睫毛偵測排除模型判成頭髮的像素（陰影裡的暗髮束不再被當成睫毛）。"""
    x0, y0, x1, y1 = box
    segmap = seg                               # ⚠ 下面有一個區域變數也叫 seg（欄位分段），先另存
    roi = rgb[y0:y1, x0:x1].astype(np.float32)
    L = lum(roi)
    ring = np.concatenate([roi[0], roi[-1]])
    skin = np.median(ring, axis=0)
    hairseg = None
    lid = None
    if seg is not None:
        sk = seg_skin(rgb, seg, box)
        if sk is not None:
            skin = sk
        lid = seg_lid_skin(rgb, seg, box)
        hairseg = hs[y0:y1, x0:x1]
    if lid is None:
        lid = skin * 0.94
    Ls = lum(skin[None])[0]
    dist = np.sqrt(((roi - skin) ** 2).sum(-1))
    green = roi[..., 1] - np.maximum(roi[..., 0], roi[..., 2])
    dark = L < min(Ls - 70, 105)               # 睫毛是真的暗；淡色頭髮的線條（安雅）不算
    if hairseg is not None:
        dark &= ~hairseg
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
    # 模型判成頭髮（且不是眼睛類）的不准長進去：深膚色＋白髮（索拉娜）時白髮「比膚色亮」，
    # 會被當成眼白一路長進頭髮，填成膚色就是一層灰霧（待修C）
    HN = None
    if segmap is not None:
        HN = (segmap == SEG_HAIR) & ~(segmap == SEG_EYE)
        E &= ~HN
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
    # 模型的眼睛類（含眼白、虹膜下緣）也一律算進眼睛：瞪大眼時從睫毛往下長的規則常常長不到底，
    # 閉眼後就殘留一截虹膜或眼白（待修A）。只取睫毛上緣以下，不吃雙眼皮。
    if segmap is not None:
        EY = segmap == SEG_EYE
        for i, xr in enumerate(xs):
            x = x0 + int(xr)
            col = EY[y0:y1, x]
            rows = np.where(col)[0]
            rows = rows[rows >= int(tt[i]) - 1]
            M[y0 + rows, x] = True
        for xr, i in ((xs[0], 0), (xs[-1], -1)):           # 眼角外 3px（眼白常常多出一點）
            for dx in (1, 2, 3):
                x = x0 + int(xr) + (dx if i == -1 else -dx)
                if 0 <= x < M.shape[1]:
                    col = EY[y0:y1, x]
                    rows = np.where(col)[0]
                    rows = rows[rows >= int(tt[i]) - 1]
                    M[y0 + rows, x] = True
    M1 = M.copy(); M1[1:] |= M[:-1]; M = M1
    # 眼角往左右多擴 2px（只水平，不往上 —— 往上會吃掉雙眼皮的摺線），清掉眼角殘留的眼白
    M0 = M.copy()
    for dx in (1, 2):
        M[:, dx:] |= M0[:, :-dx]
        M[:, :-dx] |= M0[:, dx:]
    # 眼角的眼白常常再多出幾格：往左右 3~5px 內「比膚色亮」的也抹掉（不亮的不動，不吃到皮膚與頭髮）
    bright = np.zeros(rgb.shape[:2], bool)
    bright[y0:y1, x0:x1] = L > Ls + 4
    if HN is not None:
        bright &= ~HN
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
    # ══ 第 1 層（Ray 10-03：「evaluate 右眼閉眼糊出去一大塊」）══ 要改的範圍 M 與眼瞼之間 I 只准在臉／眼睛裡：
    # M 是用顏色往外長的，遠側那隻眼會越過臉的輪廓長進頭髮；全閉時 M 裡睫毛線以下整塊塗成膚色 ⇒ 頭髮被塗成一塊皮。
    # 分割判成頭髮或背景的地方（貼著眼睛類 1px 以內除外）一律不准進來。
    if segmap is not None:
        outside = (segmap == SEG_HAIR) | (segmap == 0)
        # I（上下眼瞼之間）只留「這一欄真的有眼睛類」的欄（左右各寬 2）：遠側眼的睫毛欄會伸過臉的輪廓
        EYm = segmap == SEG_EYE
        # 這隻眼（框內）眼睛類的最左～最右整段欄位（髮絲蓋住、中間沒判出眼睛的欄也算），左右各寬 2
        ec = np.where(EYm[y0:y1, max(0, x0 - 4):x1 + 4].any(0))[0]
        if len(ec):
            eyecols = np.zeros(rgb.shape[1], bool)
            eyecols[max(0, x0 - 4) + ec[0] - 2: max(0, x0 - 4) + ec[-1] + 3] = True
            I &= eyecols[None, :]
        # M：在臉／眼睛裡，或在 I 裡（髮絲橫過眼睛時，底下的虹膜被判成頭髮，那些還是要抹掉 —— unbraid）
        keep = ~outside | _dil(EYm, 1) | I
        M &= keep
    # 眼角（上下眼瞼交會處）：分割的眼睛類最左／最右 3 欄的平均高度（box 座標）。閉眼線就拉在兩個眼角之間。
    corners = None
    if segmap is not None:
        ex0, ex1 = max(0, x0 - 4), min(rgb.shape[1], x1 + 4)
        EYb = segmap[y0:y1, ex0:ex1] == SEG_EYE
        cols = np.where(EYb.any(0))[0]
        if len(cols) >= 8:
            def cy(cs):
                ys_ = [np.where(EYb[:, c])[0].mean() for c in cs]
                return float(np.mean(ys_))
            corners = ((ex0 + cols[0] - x0, cy(cols[:3])), (ex0 + cols[-1] - x0, cy(cols[-3:])))
    # 眼底線（Ray 10-03：「眼外角好像也不對，用眼底線的話呢？」）：分割的眼睛類每一欄的最下緣（框座標）。
    # 只取中間 90% 的欄，兩端是眼角的尖，最下緣會往上收、不算眼底線。
    lower = None
    if segmap is not None and corners is not None:
        bx_ = ex0 + cols - x0
        by_ = np.array([np.where(EYb[:, c])[0].max() for c in cols], float)
        lower = (bx_.astype(float), by_)
    return dict(lower=lower, x0=x0, y0=y0, xs=xs, t=tt, b=bb, h=hh, skin=skin, lid=lid, Ls=Ls, M=M, I=I, corners=corners)


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


def hair_alpha(rgb, pal, skin, M, eyes, pad=14, tol=48, soft=22, keeps=(), segk=None):
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
        # 貫穿眼睛的髮絲（索拉娜：白髮橫過眼睛，顏色跟眼白分不開）—— 改看**形狀**：
        # 眼睛內部的髮色連通塊，若同時碰到眼睛內部的上緣與下緣 ＝ 從上面垂下來穿過去的髮絲
        # （眼白被睫毛線與下眼瞼圍住，不可能上下貫穿）。這種塊不套嚴格判定，照髮色算。
        from scipy import ndimage as nd
        cand = (a > 0.5) & Ie
        S = np.zeros(Ie.shape, bool)                  # 貫穿的髮絲（之後併進保留框 K）
        if cand.any():
            lab, k = nd.label(cand)
            cols = np.where(Ie.any(0))[0]
            ytop = np.full(Ie.shape[1], -1); ybot = np.full(Ie.shape[1], -1)
            for cx in cols:
                rr = np.where(Ie[:, cx])[0]; ytop[cx] = rr[0]; ybot[cx] = rr[-1]
            for j, sl in enumerate(nd.find_objects(lab), 1):
                ys_, xs_ = np.where(lab[sl] == j)
                ys_ = ys_ + sl[0].start; xs_ = xs_ + sl[1].start
                top_hit = (ys_ <= ytop[xs_] + 1).any()
                bot_hit = (ys_ >= ybot[xs_] - 1).any()
                # 要**細**：平均每一列不超過 4px —— 虹膜也是上下貫穿的一大塊（安雅藍眼配淡紫髮踩過）
                thin = len(ys_) / max(1, ys_.max() - ys_.min() + 1) <= 4.0
                if top_hit and bot_hit and thin:
                    S[ys_, xs_] = True
        # 保留框（標註）：蓋在眼睛上的髮束 —— 框內不套眼睛內部的嚴格判定，像頭髮就蓋回原圖
        K = np.zeros(Ie.shape, bool)
        for kx0, ky0, kx1, ky1 in keeps:
            K[max(0, ky0 - y0):max(0, ky1 - y0), max(0, kx0 - x0):max(0, kx1 - x0)] = True
        # 分割模型判成頭髮的（已扣掉貼著眼睛類的那一圈）＝自動的保留框
        if segk is not None:
            K |= segk[y0:y1, x0:x1]
        K |= _dil(S, 1) & (a > 0.3)                    # 貫穿的髮絲＋邊緣 1px（反鋸齒）
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
        a = a * conn
        # 模型說是頭髮的一律蓋回原圖（顏色規則認不出的陰影暗髮束就靠這一條；
        # 它已經扣掉貼著眼睛的那一圈，蓋回去的地方本來就沒被眨眼改到）
        if segk is not None:
            # 還要顏色大致像頭髮（放寬的容許值）：髮絲蓋在眼睛上時，旁邊的虹膜也常被分割判成頭髮，
            # 不擋的話墨綠的虹膜會被當頭髮蓋回去，閉眼時吊著一塊（unbraid）
            loose = np.clip((tol * 1.8 + soft - dh) / soft, 0, 1)
            a = np.maximum(a, segk[y0:y1, x0:x1].astype(np.float32) * loose)
        A[y0:y1, x0:x1] = np.maximum(A[y0:y1, x0:x1], a)
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


def frame(rgb, eye, s, skinfill, fa=None):
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
    # ══ 閉眼線要「躺在下眼瞼上」，眼角也要跟著下來（Ray 10-03：「沒有睜很大的眼睛，閉眼時內眼側偏高，
    #   半閉跟閉眼時眼睛成八字」）══
    # 舊版 d＝(bb−t−hc)·s·sin(πu)^0.5：兩端乘到 0 ⇒ 眼角留在上眼瞼原本的高度；
    # 上眼瞼內側本來就比較高的眼睛，閉起來就斜成八字。
    # 新版：用中段（20%~80%，偵測最穩）的下眼瞼擬合一條直線，延伸到兩端，再加一點往下的弧（閉眼的自然弧度）；
    # 睫毛線的上緣要移到「那條線往上 hc」，每一欄都移，兩端不再釘死。
    eh = float(np.median(bb - t))                       # 眼高（中段）
    # 閉眼線＝兩個眼角（分割的眼睛類左右端）之間的連線 ＋ 一點往下的弧；斜率夾在 ±0.3。
    # ⚠ 第一版用「中段下眼瞼的直線擬合」：遠側那隻眼的下眼瞼常被頭髮陰影帶歪，擬合出一條陡斜線（蕾娜 apologize 右眼）。
    if fa is not None and id(eye) in fa.get('span', {}):
        # Ray 10-03：閉眼線要跟著臉的角度 ⇒ 角度與彎度取「眼底線轉折點連線、以鼻樑為中心的弧」
        # （向量重畫睫毛／擴散填色那一版試過、品質明顯較差，已撤；眼皮與睫毛仍搬原圖的像素）
        xa_, xb_ = fa['span'][id(eye)]
        xx = np.linspace(min(xa_, xb_), max(xa_, xb_), 200)
        GX, GY = fa['to_img'](xx, 0.0)
        GX = np.asarray(GX) - x0; GY = np.asarray(GY) - y0
        o_ = np.argsort(GX)
        arcy = np.interp(xf, GX[o_], GY[o_])
        # 高度沿用舊版（兩眼角中點那條線），只換「角度與彎度」：弧整條平移到舊線的平均高度
        if eye.get('corners'):
            (ax, ay), (bx, by) = eye['corners']
            base = (ay + by) / 2
        else:
            base = float(np.median(eye['b'])) - hc * 0.5
        arcy = arcy - arcy.mean() + base
        target = arcy + eh * 0.12 * np.sin(np.pi * u) - hc * 0.5
    elif eye.get('corners'):
        (ax, ay), (bx, by) = eye['corners']
        k1 = (by - ay) / max(1.0, bx - ax)
        k1 = max(-0.3, min(0.3, k1))
        mx, my = (ax + bx) / 2, (ay + by) / 2
        line = my + k1 * (xf - mx)
        target = line + eh * 0.12 * np.sin(np.pi * u) - hc * 0.5
    else:
        mid = (u >= 0.2) & (u <= 0.8)
        if mid.sum() >= 3:
            k1, k0 = np.polyfit(xf[mid], eye['b'][mid], 1)
        else:
            k1, k0 = 0.0, float(np.median(eye['b']))
        k1 = max(-0.3, min(0.3, k1))
        target = k1 * xf + k0 + eh * 0.12 * np.sin(np.pi * u) - hc
    d = np.maximum(0, (target - t) * s)
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
        # 睫毛那幾列：用這一欄自己量到的厚度（上限是全體的 hc）—— 一律用 hc 的話，
        # 睫毛比較薄的那幾欄會把底下的虹膜暗部一起帶下去，閉眼時變成往下滴的黑點
        hcol = min(float(eye['h'][i]) + 1.0, hc)
        rw = np.clip(hcol + 1.5 - k, 0, 1)
        al = np.clip((Ls - 25 - Lb) / 70.0, 0, 1) * hue * rw
        # 虹膜邊緣很暗的墨綠／深藍會被當成睫毛一起搬下來，閉眼時吊著幾塊顏色（unbraid）——
        # 睫毛是棕黑（R ≥ G），綠或藍明顯多過紅的不算睫毛
        # 門檻：R 至少要跟 G/B 差不多（−4 以內開始淡、R≥G+2 才算全量）；橄欖色（R≈G）的暗虹膜邊緣也排掉
        gate = np.clip((band[:, 0] - np.maximum(band[:, 1], band[:, 2]) + 4) / 6.0, 0, 1)
        gate = np.maximum(gate, np.clip((60 - Lb) / 20.0, 0, 1))   # 接近黑的（灰黑睫毛：米夏、安雅）一律算睫毛
        al = al * gate
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
    # 睫毛 alpha 做水平中值（寬 5）：只有一兩欄往下突出的尖刺＝閉眼時往下滴的黑點，
    # 連續的睫毛線不受影響。只能壓低、不能抬高（取兩者較小）。
    if lash:
        Aal = np.stack([l[3] for l in lash])           # n×BH
        pad_ = np.pad(Aal, ((2, 2), (0, 0)), mode='edge')
        med = np.median(np.stack([pad_[j:j + len(Aal)] for j in range(5)]), 0)
        Aal = np.minimum(Aal, med)
        # 下緣抹平（Ray 10-03：「unbraid、commandsoft 睫毛鋸齒」）：原圖下緣一根根的睫毛搬下來，
        # 每欄厚度不同 ⇒ 梳齒狀。量每一欄的下緣（alpha>0.5 的最後一列），橫向取中位數（寬 9），
        # 超出平滑下緣的削掉，邊上留 1px 柔邊。
        nb = len(Aal)
        bot = np.array([(np.where(a > 0.5)[0][-1] if (a > 0.5).any() else -1) for a in Aal], np.float32)
        okb = bot >= 0
        if okb.sum() >= 3:
            bi = np.where(okb, bot, np.interp(np.arange(nb), np.where(okb)[0], bot[okb]))
            padb = np.pad(bi, 4, mode='edge')
            bs = np.median(np.stack([padb[j:j + nb] for j in range(9)]), 0)
            kk = np.arange(Aal.shape[1])[None, :]
            cut = np.clip(bs[:, None] + 1.0 - kk, 0, 1)        # 平滑下緣以下：0；下緣那一列：柔邊
            Aal = Aal * cut
        lash = [(x, top, band, Aal[j]) for j, (x, top, band, _) in enumerate(lash)]
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


def lower_fit(e):
    """眼底線：二次擬合（框座標的點 → 整張圖座標）；回傳 (左端, 右端, 多項式係數, x 範圍)。"""
    if not e.get('lower'):
        return None
    bx, by = e['lower']
    n = len(bx)
    if n < 8:
        return None
    k = max(1, int(n * 0.05))
    bx, by = bx[k:n - k], by[k:n - k]
    # 抗離群：先擬合、丟掉殘差最大的 15%，再擬合
    c = np.polyfit(bx, by, 2)
    res = np.abs(np.polyval(c, bx) - by)
    ok = res <= np.quantile(res, 0.85)
    c = np.polyfit(bx[ok], by[ok], 2)
    xa, xb = float(bx[0]), float(bx[-1])
    gx = lambda x: e['x0'] + x
    gy = lambda x: e['y0'] + float(np.polyval(c, x))
    return ((gx(xa), gy(xa)), (gx(xb), gy(xb)), c, (xa, xb))


ARC_KAPPA = 0.08    # 弧的彎度：離鼻樑 D/2 處比鼻樑高 0.02·D（D＝兩轉折點距離）


def turning_point(e):
    """眼底線的轉折點：把眼底點切成兩段各自擬合直線，總誤差最小的切點（整張圖座標）。"""
    if not e.get('lower'):
        return None
    bx, by = e['lower']
    n = len(bx)
    if n < 10:
        return None
    k = max(1, int(n * 0.05)); bx, by = bx[k:n - k], by[k:n - k]; n = len(bx)
    best = None
    for i in range(int(n * 0.2), int(n * 0.8)):
        c1 = np.polyfit(bx[:i + 1], by[:i + 1], 1); c2 = np.polyfit(bx[i:], by[i:], 1)
        sse = ((np.polyval(c1, bx[:i + 1]) - by[:i + 1]) ** 2).sum() + ((np.polyval(c2, bx[i:]) - by[i:]) ** 2).sum()
        if best is None or sse < best[0]:
            yb = (np.polyval(c1, bx[i]) + np.polyval(c2, bx[i])) / 2
            best = (sse, bx[i], yb)
    return (e['x0'] + float(best[1]), e['y0'] + float(best[2]))


def face_arc(eyes, seg):
    """Ray 10-03：「把眼底線轉折點連線，以鼻樑為中心畫成弧」。
    弧＝對稱於鼻樑中線的拋物線 y＝c − k·x²（x 從鼻樑量起、沿臉的橫軸），鼻樑處最低、往兩側上彎；
    k 固定（ARC_KAPPA/D），傾斜角 θ 解成「兩個轉折點都剛好落在弧上」。"""
    E = sorted([e for e in eyes if e.get('lowfit')], key=lambda e: e['lowfit'][0][0])
    if len(E) != 2:
        return None
    T = [turning_point(e) for e in E]
    if None in T:
        return None
    P1, P2 = np.array(T[0]), np.array(T[1])
    Li = np.array(E[0]['lowfit'][1]); Ri = np.array(E[1]['lowfit'][0])     # 內眼角（眼底線靠鼻端）
    nose = (Li + Ri) / 2
    warn = None
    if seg is not None and (seg == 3).any():
        my, mx = np.where(seg == 3)
        mouth = np.array([mx.mean(), my.mean()])
    else:
        mouth = None
    D = np.linalg.norm(P2 - P1)
    k = ARC_KAPPA / D
    def rot(P, th):
        c_, s_ = np.cos(-th), np.sin(-th); d = P - nose
        return np.array([c_ * d[0] - s_ * d[1], s_ * d[0] + c_ * d[1]])
    best = None
    for th in np.radians(np.arange(-45, 45, 0.05)):
        a, b = rot(P1, th), rot(P2, th)
        r = (a[1] + k * a[0] ** 2) - (b[1] + k * b[0] ** 2)
        if best is None or abs(r) < abs(best[1]):
            best = (th, r, a, b)
    th, _, a, b = best
    c = ((a[1] + k * a[0] ** 2) + (b[1] + k * b[0] ** 2)) / 2
    if mouth is not None:
        dm = rot(mouth, th)[0]
        if abs(dm) > 0.15 * D:
            warn = f'鼻樑（內眼角中點）與嘴中線差 {dm:.0f}px'
    c2, s2 = np.cos(th), np.sin(th)
    def to_img(x, lift):
        y = c - k * x ** 2 - lift
        return nose[0] + c2 * x - s2 * y, nose[1] + s2 * x + c2 * y
    def xr(P):
        return rot(np.array(P, float), th)[0]
    return {'roll': float(np.degrees(th)), 'warn': warn, 'T': (P1, P2), 'nose': nose, 'to_img': to_img, 'xr': xr,
            'span': {id(E[0]): (xr(E[0]['lowfit'][0]), xr(E[0]['lowfit'][1])),
                     id(E[1]): (xr(E[1]['lowfit'][0]), xr(E[1]['lowfit'][1]))}}


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
    ap.add_argument('--eye', action='append', default=[], help='x0,y0,x1,y1（原圖像素）；不給就由分割自動找')
    ap.add_argument('--seg', default='auto', help='分割類別圖；auto＝tools/_blink_seg/<圖名>/classes_s1.6.png（有就用）')
    ap.add_argument('--no-seg', action='store_true', help='不用分割（舊的純顏色規則，對照用）')
    ap.add_argument('--out', required=True)
    ap.add_argument('--face', help='驗收圖的裁切框 x0,y0,x1,y1（預設：兩眼外擴）')
    ap.add_argument('--no-hair', action='store_true', help='關掉頭髮保護（對照用）')
    ap.add_argument('--keep', action='append', default=[], help='保留框 x0,y0,x1,y1：蓋在眼睛上的髮束（標註）')
    ap.add_argument('--half-from', help='半閉改用這張整張合成圖（tools/_blink_base/<名>_half.png）')
    ap.add_argument('--closed-from', help='全閉改用這張整張合成圖（tools/_blink_base/<名>_closed.png，與原圖同尺寸同 alpha）')
    ap.add_argument('--glasses', action='store_true', help='戴眼鏡：鏡框（灰、低彩度、連到眼框外）一律保留原圖')
    ap.add_argument('--hairmask', action='store_true', help='另存 hairmask.png（頭髮 alpha 疊紅，除錯用）')
    A = ap.parse_args()
    im = Image.open(A.src).convert('RGBA')
    arr = np.array(im)
    rgb = arr[..., :3]
    name = os.path.splitext(os.path.basename(A.src))[0]
    seg = hs = None
    if not A.no_seg:
        sp = A.seg
        if sp == 'auto':
            sp = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_blink_seg', name, 'classes_s1.6.png')
            if not os.path.exists(sp):
                sp = None
        if sp:
            seg = load_seg(sp, arr.shape)
            hs = seg_hair_core(seg)
    boxes = [tuple(int(v) for v in e.split(',')) for e in A.eye]
    if not boxes:
        if seg is None:
            raise SystemExit('沒有 --eye，也沒有分割圖（先在 .venv-face 跑 tools/face_parse.py ' + name + '）')
        boxes = seg_eyes(seg, rgb=rgb)
        print('自動眼框', ' '.join('--eye ' + ','.join(map(str, b)) for b in boxes))
        if not boxes:
            raise SystemExit('分割圖裡找不到眼睛')
    eyes = [analyse(rgb, b, seg, hs) for b in boxes]
    od = os.path.join(A.out, name); os.makedirs(od, exist_ok=True)
    frames = {}
    skin = np.median(np.stack([e['skin'] for e in eyes]), 0)
    Mall = np.zeros(rgb.shape[:2], bool)
    for e in eyes:
        Mall |= e['M']
    pal = [] if A.no_hair else hair_palette(arr, eyes, skin)
    HA = hair_alpha(rgb, np.array(pal, np.float32).reshape(-1, 3), skin, Mall, eyes, keeps=[tuple(int(v) for v in k.split(',')) for k in A.keep], segk=hs) if len(pal) else np.zeros(rgb.shape[:2], np.float32)
    # 填膚色時，眼框裡的頭髮也當成未知（不然髮色會被擴散進皮膚）
    hard = (HA > 0.04) & (np.array(Image.fromarray(Mall.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0)
    # 眼框旁邊比膚色亮的（眼白、瀏海下露出的眼白、高光）也當未知：當成擴散的邊界值的話，填出來的眼皮會近乎白色
    # （諾薇兒 think：閉眼後瀏海下一條白帶）
    Lr = lum(rgb.astype(np.float32))
    bright = (Lr > lum(skin[None])[0] + 10) & (np.array(Image.fromarray(Mall.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(13))) > 0)
    hard = hard | bright
    # 比膚色暗很多的（眼睛的輪廓線、下眼瞼線、眼角的睫毛尾）也當未知：當成邊界值會把擴散填色拉灰，
    # 閉眼後眼睛下面一圈灰 ＝ 黑眼圈（Ray 10-03：「為何都會有黑眼圈？」）
    darkn = (Lr < lum(skin[None])[0] - 40) & (np.array(Image.fromarray(Mall.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(13))) > 0)
    hard = hard | darkn
    fills = {id(e): harmonic_fill(rgb.astype(np.float32), e['M'] | hard) for e in eyes}
    # 瀏海直接壓在睫毛上（諾薇兒）：眼皮的拉伸來源整片是頭髮，擴散填色會得到偏髮色的
    # 一塊補丁。來源是頭髮的地方一律換成這隻眼睛的膚色 —— 頭髮最後照樣由原圖蓋回最上層。
    # ⚠ 待修B（賽西莉）試過「壓暗＋混髮色」：白塊只變成灰塊 —— 毛病在那一塊的形狀與鋸齒邊，不在顏色，已撤回。
    # ⚠ 待修C（索拉娜白髮灰霧）試過且**無效**的三條（2026-10-03）：眼皮改用擴散填色混 60%、
    #   頭髮 alpha 二值化、眼睛遮罩不准長進頭髮（這條保留，修好了別的）。灰霧的來源還沒找到。
    # 瀏海下的眼皮色（Ray 10-03：「諾薇兒 front 有明顯超出的色塊」）：用固定的 e['lid'] 會比瀏海陰影下的皮膚亮一截，
    # 閉眼後瀏海下緣露出一條淡粉帶。改取「頭髮下緣往下 1~4px 的臉／皮膚類」的中位色（＝陰影裡的皮膚），取不到才用 e['lid']。
    hm = HA > 0.5
    for e in eyes:
        lidc = e['lid']
        if seg is not None and hm.any():
            ys, xs_ = np.where(e['M'])
            y0_, y1_ = max(0, ys.min() - 20), min(rgb.shape[0], ys.max() + 20)
            x0_, x1_ = max(0, xs_.min() - 20), min(rgb.shape[1], xs_.max() + 20)
            sub = hm[y0_:y1_, x0_:x1_]
            band = _dil(sub, 4) & ~_dil(sub, 1)
            sk = ((seg[y0_:y1_, x0_:x1_] == SEG_FACE) | (seg[y0_:y1_, x0_:x1_] == 5)) & ~e['M'][y0_:y1_, x0_:x1_]
            pick = band & sk
            if pick.sum() >= 20:
                lidc = np.median(rgb[y0_:y1_, x0_:x1_][pick].astype(np.float32), 0)
        f = fills[id(e)]
        f[HA > 0.3] = lidc
    # 閉眼線的角度：眼底線轉折點連線、以鼻樑為中心的弧（只有兩隻眼都找得到時；否則退回兩眼角連線）
    for e in eyes:
        e['lowfit'] = lower_fit(e)
    fa = face_arc(eyes, seg)
    if fa:
        print('face_arc roll %.1f°' % fa['roll'], fa['warn'] or '')
    GL = np.zeros(rgb.shape[:2], bool)
    if A.glasses:
        # 鏡框（Ray 10-03：「眼鏡框被抹掉一截」laurie）：低彩度、中高亮度的細線，而且連到眼框外 ——
        # 眼白被睫毛圍住連不出去，所以不會被當成鏡框
        from scipy import ndimage as nd
        rf = rgb.astype(np.float32); mx, mn = rf.max(-1), rf.min(-1)
        sat = (mx - mn) / np.maximum(mx, 1)
        Lg = lum(rf)
        zone = np.array(Image.fromarray(Mall.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(31))) > 0
        cand = zone & (sat < 0.16) & (Lg > 110) & (Lg < 238)
        lab, k = nd.label(cand, structure=np.ones((3, 3)))
        out_ = zone & ~(np.array(Image.fromarray(Mall.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0)
        keep_ids = np.unique(lab[out_ & (lab > 0)])
        GL = np.isin(lab, keep_ids[keep_ids > 0])
        GL = _dil(GL, 1) & (sat < 0.24)
        # 鏡框是細線：粗的一塊（眼角的眼白連到外面）不算；眼睛類裡很亮的（眼白）也不算
        GL &= ~_dil(_ero(GL, 2), 3)
        if seg is not None:
            GL &= ~((seg == SEG_EYE) & (Lg > 205))
        print('glasses px', int(GL.sum()))
    meta = {'w': im.width, 'h': im.height}
    for key, s in (('half', HALF_S), ('closed', CLOSED_S)):
        ext = A.closed_from if key == 'closed' else A.half_from
        if ext:
            # 全閉／半閉改用外部合成好的整張圖（Ray 10-03／10-04：GPT 畫 → 對位 → 只貼眼睛那塊，見 tools/blink_gpt.py）。
            # 合成時 alpha 沿用原圖、頭髮蓋回原圖；這裡只驗尺寸與 alpha 再切補丁。
            cf = np.array(Image.open(ext).convert('RGBA'))
            if cf.shape != arr.shape or not (cf[..., 3] == arr[..., 3]).all():
                raise SystemExit('外部合成圖的尺寸或 alpha 與原圖不符：' + ext)
            p, (x, y, w, h) = patch(rgb, cf[..., :3].astype(np.float32))
            p.save(os.path.join(od, key + '.png'))
            meta[key] = dict(x=x, y=y, w=w, h=h, src=key + '.png')
            full = im.copy(); full.alpha_composite(p, (x, y))
            frames[key] = full
            continue
        cur = rgb.astype(np.float32)
        for e in eyes:
            cur = frame(cur, e, s, fills[id(e)], fa)
        a3 = HA[..., None]
        cur = cur * (1 - a3) + rgb.astype(np.float32) * a3     # 原圖的頭髮蓋回最上層
        # 臉的輪廓線與臉外的頭髮一律不准動（Ray 10-03：「stare 右眼吃到臉外頭髮，有一塊糊，幾乎都有這個狀況」）——
        # 遠側那隻眼的外眼角常貼著臉的輪廓線，補丁範圍伸過去就把輪廓線抹掉。分割的頭髮類往外 2px（含輪廓線），扣掉眼睛類。
        if seg is not None:
            Iall = np.zeros(seg.shape, bool)
            for e in eyes:
                Iall |= e['I']
            # ⚠ 眼睛內部（上下眼瞼之間）不保護：橫過眼睛的髮絲旁邊就是虹膜，保護下去閉眼會吊著一塊虹膜（unbraid）。
            # ══ 第 2 層 ══ 以前連 M 一起排除 ⇒ M 越界長進頭髮的那段正好沒被保護（evaluate 右眼）。
            # 現在只排除 I（第 1 層已把 I 裁在臉裡），背景也一起保護 ⇒ 閉眼線畫到臉的輪廓就停，輪廓外保持原圖。
            # Ray 10-03：「色塊突出面部」⇒ 改動只准落在 臉／皮膚／眼睛 類上；
            # 例外只有「眼瞼之間、被細髮絲蓋住而判成頭髮的虹膜」（頭髮 alpha 低的）—— 不抹掉的話閉眼會吊著一塊虹膜（unbraid）。
            facek = (seg == SEG_EYE) | (seg == SEG_FACE) | (seg == 5)
            allow = facek | (Iall & (seg == SEG_HAIR) & (HA < 0.3))
            prot = ~allow
            # 眼瞼之間以外，顏色比起膚色更像頭髮的像素一律保留原圖：被分割判成「臉」的細髮絲（諾薇兒 front 外眼角）
            if len(pal):
                ch = np.abs(cur - rgb).sum(-1) > 3
                if ch.any():
                    yy, xx = np.where(ch & ~_dil(Iall, 1))
                    px = rgb[yy, xx].astype(np.float32)
                    dh = np.sqrt(((px[:, None, :] - np.array(pal, np.float32)[None]) ** 2).sum(-1)).min(1)
                    dsk = np.sqrt(((px - skin) ** 2).sum(-1))
                    hl = (dh < 40) & (dh < dsk - 10) & (seg[yy, xx] != SEG_EYE)   # 眼睛類不算（白髮配眼白：索拉娜 hug）
                    prot[yy[hl], xx[hl]] = True
            cur[prot] = rgb[prot]
        if A.glasses:
            cur[GL] = rgb[GL]
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
    if fa:
        ov = crop('open', z); dr = ImageDraw.Draw(ov)
        P = lambda q: ((q[0] - fb[0]) * z, (q[1] - fb[1]) * z)
        for e in eyes:
            if e.get('lower') is not None:
                for xx, yy in zip(*e['lower']):
                    x_, y_ = P((e['x0'] + xx, e['y0'] + yy)); dr.point((x_, y_), fill=(0, 255, 0))
        xs_ = [v for sp in fa['span'].values() for v in sp]
        xa = np.linspace(min(xs_) - 15, max(xs_) + 15, 120)
        ax_, ay_ = fa['to_img'](xa, 0.0)
        dr.line([P((ax_[i], ay_[i])) for i in range(len(xa))], fill=(0, 255, 255), width=3)
        for q in fa['T']:
            x_, y_ = P(q); dr.ellipse((x_ - 10, y_ - 10, x_ + 10, y_ + 10), outline=(255, 255, 0), width=4)
        nx_, ny_ = fa['nose']; r_ = np.radians(fa['roll']); d = 60
        dr.line([P((nx_ + np.sin(r_) * d, ny_ - np.cos(r_) * d)), P((nx_ - np.sin(r_) * d * 2, ny_ + np.cos(r_) * d * 2))], fill=(255, 0, 255), width=3)
        dr.text((6, 6), 'roll %.1f' % fa['roll'], fill=(255, 255, 0))
        ov.save(os.path.join(od, 'arc.png'))
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
