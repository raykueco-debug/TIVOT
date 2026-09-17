#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/band_audit.py —— 時段差分的「有沒有被偷改」稽核（ver -1416 美術線）

    py tools/band_audit.py             # 全部
    py tools/band_audit.py Plains East # 只驗這幾個前綴

⚠⚠ 為什麼要這一支（`ART_HANDOVER.md` §二之一）：時段差分的規約是
   **「構圖、視角、每一件物體的位置形狀比例完全不變，只換光與色溫」**。
   「只換光」是**量得出來的**：把兩張的**梯度圖**各自正規化之後逐塊比對，
   純粹換光的塊相關度很高；被加了東西／搬動過的塊會掉下來。

量什麼（三項，各自獨立）：
  1. `corr`   day 與該時段的梯度圖逐塊相關度（中位數）＋ 低於門檻的塊數
  2. `line`   夜景天空裡的**長直線**（＝星座線那一族）
  3. `warm`   夜景裡新增的**暖色亮斑**（＝營火那一族），day 同一塊沒有的才算
  ⚠⚠ 2 與 3 是**參考欄不是旗子**（ver -1416 實測）：`line` 會吃到雲緣、屋脊、
     樹枝、柵欄（分數最高的那四張調出來看，一條星座線都沒有）；`warm` 會吃到
     夜裡本來就該亮的窗與街燈。要當旗子用得先加「day 在同一處是平的天空」那道遮罩。

⚠ 數字只用來**挑出可疑的那幾張**，最後一律肉眼並排下判斷（憲法 §5）。
⚠ 校準點：同一批裡本來就乾淨的那些 —— 不要拿絕對門檻下結論。
"""
import io, os, re, sys, math
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG   = os.path.join(ROOT, 'resources', 'background')
BANDS = ('dawn', 'day', 'dusk', 'night', 'midnight')
EXT = ('.webp', '.png', '.jpg', '.jpeg')
W, H = 512, 341          # 比對用的縮圖（3:2）
GX, GY = 16, 11          # 塊網格
LOW = 0.25               # 「這一塊結構不同」的相關度門檻

def load(p, w=W, h=H):
    im = Image.open(p).convert('RGB').resize((w, h), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255.0

def gray(a): return a[...,0]*0.299 + a[...,1]*0.587 + a[...,2]*0.114

def grad(g):
    gy = np.zeros_like(g); gx = np.zeros_like(g)
    gx[:,1:-1] = g[:,2:] - g[:,:-2]
    gy[1:-1,:] = g[2:,:] - g[:-2,:]
    m = np.hypot(gx, gy)
    # 每張各自正規化 —— 夜景整體對比低，不正規化會變成「暗＝改過」
    s = m.std() + 1e-6
    return (m - m.mean()) / s

# ---------------------------------------------------------------- HOG（主判準）
GX_H, GY_H, NBIN = 16, 11, 9

def hog(a):
    """逐塊的梯度**方向**直方圖（L2 正規化）。
    ⚠⚠ 為什麼不用梯度**強度**相關（ver -1416 第一版就是那樣，判錯一整排）：
      夜景把整片牆變黑、把人與攤棚收掉，強度圖本來就會不一樣 ——
      實測肉眼確認同構圖的 `Capital_Midtown_night` 只拿到 0.10，
      與真的畫成另一張的 `East_Dining_dawn`（0.00）分不開。
      **方向**對打光免疫：同一棟樓的邊在哪裡、朝哪個角度，白天晚上都一樣。
    """
    g = gray(a)
    gx = np.zeros_like(g); gy = np.zeros_like(g)
    gx[:,1:-1] = g[:,2:] - g[:,:-2]
    gy[1:-1,:] = g[2:,:] - g[:-2,:]
    mag = np.hypot(gx, gy)
    b = np.clip(((np.arctan2(gy,gx) % np.pi)/np.pi*NBIN).astype(int), 0, NBIN-1)
    hs, ws = g.shape[0]//GY_H, g.shape[1]//GX_H
    out = np.zeros((GY_H, GX_H, NBIN))
    for j in range(GY_H):
        for i in range(GX_H):
            mb = mag[j*hs:(j+1)*hs, i*ws:(i+1)*ws].ravel()
            bb = b[j*hs:(j+1)*hs, i*ws:(i+1)*ws].ravel()
            out[j,i] = np.bincount(bb, weights=mb, minlength=NBIN)
    n = np.linalg.norm(out, axis=2, keepdims=True) + 1e-6
    return out/n, n[:,:,0]

def hog_sim(day, band):
    """回 (相似度中位數, 細節保留比)。
    校準點（實測，不要改成絕對門檻之前先重量一次）：
      · 完全無關的兩張圖      0.889
      · 真的被畫成另一張      0.930 ~ 0.932（East_Dining 那一組）
      · 同構圖、只換光        0.968 ~ 0.994
      ⇒ **0.955 以下就要調圖出來看**。
    """
    A, na = hog(day); B, nb = hog(band)
    w = np.minimum(na, nb)
    keep = w > np.percentile(w, 30)          # 兩邊都有東西的塊才算
    sim = float(np.median((A*B).sum(2)[keep]))
    hf  = float(np.median((nb[keep] + 1e-6) / (na[keep] + 1e-6)))
    return sim, hf

def blockcorr(a, b):
    """逐塊 Pearson 相關；回 (中位數, 低塊數, 最差的幾塊座標)"""
    hs, ws = a.shape[0]//GY, a.shape[1]//GX
    out = []
    for j in range(GY):
        for i in range(GX):
            x = a[j*hs:(j+1)*hs, i*ws:(i+1)*ws].ravel()
            y = b[j*hs:(j+1)*hs, i*ws:(i+1)*ws].ravel()
            sx, sy = x.std(), y.std()
            if sx < 1e-3 and sy < 1e-3: c = 1.0          # 兩邊都平坦＝一致
            elif sx < 1e-3 or sy < 1e-3: c = 0.0         # 一邊平坦一邊有東西
            else: c = float(((x-x.mean())*(y-y.mean())).mean()/(sx*sy))
            out.append((c, i, j))
    cs = np.array([o[0] for o in out])
    worst = sorted(out)[:4]
    return float(np.median(cs)), int((cs < LOW).sum()), worst

def erode_dir(m, dx, dy, n):
    """沿 (dx,dy) 方向做 n 步最小值侵蝕：長直線活得下來，星點活不下來"""
    out = m.copy()
    for k in range(1, n+1):
        out &= np.roll(np.roll(m, k*dy, 0), k*dx, 1)
        out &= np.roll(np.roll(m, -k*dy, 0), -k*dx, 1)
    return out

def sky_lines(a, frac=0.42):
    """夜空裡的長直線像素數（星座線那一族）。回 (線像素, 亮像素)"""
    g = gray(a)[:int(a.shape[0]*frac)]
    thr = max(0.42, float(np.percentile(g, 99.3)))
    m = g > thr
    if m.sum() == 0: return 0, 0
    lines = np.zeros_like(m)
    for dx, dy in ((1,0),(0,1),(1,1),(1,-1)):
        lines |= erode_dir(m, dx, dy, 4)     # 直線長度 ≥9 px（縮圖上）
    return int(lines.sum()), int(m.sum())

def warm_blobs(day, band):
    """band 有、day 同一塊沒有的暖色亮斑（營火那一族）
    ⚠ 只看**地表那一段**（下 60%）：夕陽把整片天染暖是本來就該有的，
      把天算進來的話每一張 dusk 都會誤報（ver -1416 第一版踩過）。"""
    def mask(a):
        r,g,b = a[...,0], a[...,1], a[...,2]
        mx, mn = a.max(2), a.min(2)
        sat = (mx-mn)/(mx+1e-6)
        hue_warm = (r >= g) & (g >= b) & (sat > 0.45)
        return hue_warm & (mx > 0.72)
    cut = int(band.shape[0]*0.40)
    mb, md = mask(band)[cut:], mask(day)[cut:]
    hs, ws = mb.shape[0]//GY, mb.shape[1]//GX
    n = 0
    for j in range(GY):
        for i in range(GX):
            b = mb[j*hs:(j+1)*hs, i*ws:(i+1)*ws].sum()
            d = md[j*hs:(j+1)*hs, i*ws:(i+1)*ws].sum()
            if b > 18 and d < 3: n += 1
    return n

def scan(prefixes):
    sets = {}
    for dirpath, _, files in os.walk(BG):
        for f in files:
            stem, ext = os.path.splitext(f)
            if ext.lower() not in EXT: continue
            m = re.search(r'_(%s)$' % '|'.join(BANDS), stem, re.I)
            base = stem[:m.start()] if m else stem
            band = m.group(1).lower() if m else None
            if prefixes and not any(base.lower().startswith(p.lower()) for p in prefixes): continue
            sets.setdefault(base, {})[band] = os.path.join(dirpath, f)
    return sets

def main():
    prefixes = sys.argv[1:]
    sets = scan(prefixes)
    rows, incomplete = [], []
    for base in sorted(sets):
        d = sets[base]
        have = [b for b in BANDS if b in d]
        if not have: continue                       # 單張（室內），不吃這條
        if 'day' not in d:
            incomplete.append((base, have, '沒有 day，無從比對'))
            continue
        if len(have) == 1:
            incomplete.append((base, have, '只有 day'))
            continue
        missing = [b for b in ('dawn','dusk','night') if b not in d]
        if missing: incomplete.append((base, have, '欠 ' + '/'.join(missing)))
        day = load(d['day']); gday = grad(gray(day))
        for b in have:
            if b == 'day': continue
            a = load(d[b]); ga = grad(gray(a))
            med, low, worst = blockcorr(gday, ga)
            sim, hf = hog_sim(day, a)
            ln, br = sky_lines(a) if b in ('night','midnight') else (0, 0)
            wb = warm_blobs(day, a) if b in ('night','midnight') else 0
            rows.append(dict(base=base, band=b, corr=med, low=low, line=ln,
                             bright=br, warm=wb, worst=worst, sim=sim, hf=hf))
    rows.sort(key=lambda r: r['sim'])
    print('=== 疑似被改動（相關度低者在前）===')
    print('%-32s %-9s %6s %6s %6s %5s' % ('基底', '時段', '構圖', '細節', 'corr', '暖斑'))
    for r in rows:
        flag = ''
        if r['sim'] < 0.955: flag += ' ⚠⚠ 構圖可能被重畫'
        # ⚠⚠ 細節比只對 dawn/dusk 有意義：夜景本來就少掉一大半梯度能量，
        #    在 night/midnight 上這一欄**每一張都會低**（ver -1416 實測），不要當旗子。
        elif r['band'] in ('dawn','dusk') and r['hf'] < 0.62: flag += ' ⚠ 細節被抹平'
        if not flag and r['sim'] >= 0.975: continue   # 乾淨的不印
        print('%-32s %-9s %6.3f %6.2f %6.3f %5d%s' % (r['base'], r['band'], r['sim'],
              r['hf'], r['corr'], r['warm'], flag))
    if incomplete:
        print('\n=== 時段不齊 ===')
        for base, have, why in incomplete:
            print('%-34s 有 %-28s %s' % (base, '/'.join(have), why))
    ok = sum(1 for r in rows if r['sim'] >= 0.975 and r['hf'] >= 0.62)
    print('\n比對 %d 組、%d 張（其中 %d 張乾淨，沒有印出來）。' % (len(sets), len(rows), ok))
    print('校準：完全無關的兩張＝0.889／真的被重畫＝0.93／同構圖只換光＝0.97~0.99。')

if __name__ == '__main__':
    main()
