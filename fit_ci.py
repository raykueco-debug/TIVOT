# -*- coding: utf-8 -*-
"""從截圖反解安雅立繪的算繪尺寸與位置（開發用工具，不進遊戲）。

  py fit_ci.py start.png end.png

⚠ 兩條走不通的路，先記下來免得再試一次：
  ① 「抓手套的重心＋展幅」：遮罩會把金鏈、束腰、星飾一起抓進去，而且**兩張
     截圖的可見範圍不同**（起始那張大半在畫面外）—— 部分可見時矩量根本不可比。
  ② 一般的 NCC：立繪多半在畫面外，場景要補零才放得下樣板，而補零區的區域
     變異數趨近 0，分母爆掉，最佳解全跑到補零區（實測 score 71，NCC 上限是 1）。

正解是**遮罩式 NCC**：把「樣板的 alpha」與「場景的有效範圍」兩個遮罩都算進
統計量，每個位移各自用自己的重疊區域算平均與變異數。六次相關（用 FFT）就夠。
比的是梯度圖 —— 立繪是半透明疊上去的，顏色被底下的場景拉走，但邊緣結構還在。
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from scipy.signal import fftconvolve

# 遊戲載的是同名 .webp；這支工具要的是**未壓縮的來源** PNG，兩者同目錄。
ART = 'resources/partner/Anya_CI_Search.png'

def grad(a):
    return np.hypot(ndi.sobel(a, 1), ndi.sobel(a, 0))

def xcorr(a, b):
    """相關（不是摺積）：把核翻轉再摺積。'valid' → 只留完全重疊的位移。"""
    return fftconvolve(a, b[::-1, ::-1], mode='valid')

def masked_ncc(S, V, T, M):
    """S=場景, V=場景有效遮罩, T=樣板, M=樣板遮罩。回傳每個位移的 NCC。"""
    TM, T2M = T*M, (T*T)*M
    n   = xcorr(V, M)
    sS  = xcorr(S*V, M)
    sS2 = xcorr((S*S)*V, M)
    sT  = xcorr(V, TM)
    sT2 = xcorr(V, T2M)
    sST = xcorr(S*V, TM)
    n = np.maximum(n, 1e-6)
    cov = sST - sS*sT/n
    vS  = np.maximum(sS2 - sS*sS/n, 0)
    vT  = np.maximum(sT2 - sT*sT/n, 0)
    r = cov/np.sqrt(np.maximum(vS*vT, 1e-9))
    return r, n

def load_art():
    a = np.asarray(Image.open(ART).convert('RGBA')).astype(np.float32)
    lum = a[:,:,0]*0.299 + a[:,:,1]*0.587 + a[:,:,2]*0.114
    return lum, a[:,:,3]/255.0

ART_LUM, ART_A = load_art()

def fit(path, scales, ds=1, min_overlap=0.22, verbose=False):
    """ds＝降取樣倍率。補邊後的畫布是 (視窗+2×最大樣板)²，全解析度做 FFT 會
       跑到分鐘等級 —— 粗搜先縮 6~8 倍，鎖定範圍再逐步回到全解析度。"""
    im = Image.open(path).convert('L'); W, H = im.size
    if ds > 1: im = im.resize((max(8, W//ds), max(8, H//ds)), Image.BILINEAR)
    w, h = im.size
    scene = np.asarray(im).astype(np.float32)
    ss = [max(6, int(round(x/ds))) for x in scales]
    pad = max(ss) + 4
    Sg = np.zeros((h+2*pad, w+2*pad), np.float32)
    V  = np.zeros_like(Sg)
    Sg[pad:pad+h, pad:pad+w] = grad(scene)
    V [pad:pad+h, pad:pad+w] = 1.0
    best = None
    for s0, s in zip(scales, ss):
        lum = np.asarray(Image.fromarray(ART_LUM).resize((s, s), Image.BILINEAR))
        al  = np.asarray(Image.fromarray(ART_A ).resize((s, s), Image.BILINEAR))
        T = grad(lum); M = (al > 0.35).astype(np.float32)
        r, n = masked_ncc(Sg, V, T, M)
        r = np.where(n >= min_overlap*M.sum(), r, -1)
        i = int(np.argmax(r)); dy, dx = np.unravel_index(i, r.shape)
        sc = float(r[dy, dx]); left, top = (dx-pad)*ds, (dy-pad)*ds
        if verbose: print('   S=%5d  ncc=%.4f  左上=(%6d,%6d)' % (s0, sc, left, top))
        if best is None or sc > best[0]: best = (sc, s0, left, top)
    return best, W, H

def report(path, floor_frac=0.66):
    coarse, W, H = fit(path, range(400, 2001, 100), ds=8)
    c = coarse[1]
    mid, _, _ = fit(path, range(max(300, c-120), c+121, 20), ds=4)
    m = mid[1]
    best, _, _ = fit(path, range(max(300, m-30), m+31, 6), ds=2)
    ncc, S, L, T = best
    floor = int(round(H*floor_frac))
    print()
    print('%s  視窗 %dx%d（3D 區 0..%d）' % (path, W, H, floor))
    print('  ncc=%.4f   算繪尺寸 S=%d px  ＝ 視窗寬×%.3f ＝ 3D區高×%.3f'
          % (ncc, S, S/W, S/floor))
    print('  左上 (%d,%d)  右下 (%d,%d)' % (L, T, L+S, T+S))
    print('  下緣相對 3D 區底 %+d px' % (T+S-floor))
    print('  手在畫面 (%.0f,%.0f)   胸針在畫面 (%.0f,%.0f)'
          % (L+0.5029*S, T+0.5756*S, L+0.4934*S, T+0.3864*S))
    return dict(W=W, H=H, floor=floor, S=S, L=L, T=T, ncc=ncc)

if __name__ == '__main__':
    for p in sys.argv[1:]: report(p)
