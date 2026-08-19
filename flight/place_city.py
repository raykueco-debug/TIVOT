# -*- coding: utf-8 -*-
"""替有河的手繪城找一個「河道對得上」的落點。

薇拉馮德當初是拿插畫的水域去對**真實海岸線**掃出 (1366, 936, 1.40)。這支是同一
套方法的河川版：拿插畫的水域遮罩去對地圖上的**河道**，掃位置與旋轉，取吻合度
最高者。

▍為什麼不是單純比整片重疊
runtime 的「地形遷就插畫」本來就會照插畫把地形挖成水，所以城內部一定會吻合 ——
真正會穿幫的是**河進出城的地方**：城裡有河、城外沒有，就是一條斷頭河。

先試過「整片 Dice ＋ 邊緣環帶 Dice 各半」，不行：前三名全是「地圖的河只接得上
一端」的落點，因為環帶把所有開口混在一起做分母，接通兩個、漏掉一個，分數只掉
三分之一，仍然排在前面。改成**逐開口**判斷（mouths_of），接通率當**乘法門檻**：
少接一個開口就是一條斷頭河，再高的整片重疊率也補不回來。

▍判定式與 index.html 對齊（改了那邊要同步改這裡）
  地圖河道   b>r+16 and b>g+4 and 70<b<200        （loadWorld）
  插畫水域   b>r+8  and b>50                       （地形遷就插畫那段）

用法：  py flight/place_city.py stown [--planw 620,1000,1250]
"""
import argparse
import os

import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CITY = os.path.join(HERE, 'city')

MAP_SCALE = 20
CLOUD_H = 44
PEAK_SCALE = 520
SEA_GREY = CLOUD_H / PEAK_SCALE * 255.0

# 已定案、不可被覆蓋的城（落點要避開）：帝都、聖王廳、薇拉馮德港
KEEP = [(1005, 600, 1250), (934, 606, 1100), (1366, 936, 1050)]


def load_map():
    hm = np.asarray(Image.open(os.path.join(HERE, 'silvermoon_heightmap.png'))
                    .convert('L')).astype(np.float32)
    tr = np.asarray(Image.open(os.path.join(HERE, 'silvermoon_terrain.png'))
                    .convert('RGB')).astype(np.int16)
    r, g, b = tr[:, :, 0], tr[:, :, 1], tr[:, :, 2]
    riv = ((b > r + 16) & (b > g + 4) & (b > 70) & (b < 200)).astype(np.float32)
    land = (hm > SEA_GREY).astype(np.float32)
    return riv, land


def city_kernels(plan_path, planW, rot, SS=192):
    """回傳 (水域核, 覆蓋核)，都是地圖像素解析度的小方陣。

    取樣方式與 index.html 的「地形遷就插畫」逐行對齊：先把插畫縮到 SS²，
    再對每個地圖像素做旋轉的逆變換去查表。
    """
    im = Image.open(plan_path).convert('RGBA').resize((SS, SS), Image.LANCZOS)
    p = np.asarray(im).astype(np.int16)
    wet = (p[:, :, 2] > p[:, :, 0] + 8) & (p[:, :, 2] > 50) & (p[:, :, 3] >= 60)
    solid = p[:, :, 3] >= 60

    im0 = Image.open(plan_path)
    hw = planW * 0.5 / MAP_SCALE
    hh = hw * im0.height / im0.width
    rr = int(np.ceil(max(hw, hh))) + 2
    d = np.arange(-rr, rr + 1, dtype=np.float32)
    dx, dy = np.meshgrid(d, d)
    ca, sa = np.cos(rot), np.sin(rot)
    lx = dx * ca + dy * sa
    ly = -dx * sa + dy * ca
    u, v = lx / hw, ly / hh
    inside = (np.abs(u) <= 1) & (np.abs(v) <= 1)
    px = np.clip(np.round((u * 0.5 + 0.5) * (SS - 1)), 0, SS - 1).astype(np.int32)
    py = np.clip(np.round((v * 0.5 + 0.5) * (SS - 1)), 0, SS - 1).astype(np.int32)
    kw = (wet[py, px] & inside).astype(np.float32)
    kc = (solid[py, px] & inside).astype(np.float32)
    return kw, kc


def ring_of(kc, w=3):
    """覆蓋核的邊緣環帶：入城口／出城口就落在這一圈。"""
    er = cv2.erode(kc, np.ones((2 * w + 1, 2 * w + 1), np.uint8))
    return np.clip(kc - er, 0, 1)


def mouths_of(kwr):
    """把「水域∩環帶」切成各自獨立的開口。

    ⚠ 這是這支腳本的重點。整片重疊率高不代表河接得上 —— 實測前三名都是
      「地圖的河只接到一端」，城的河從另一端流出去就斷頭。要的是**每一個**
      開口都有地圖的河可接，所以開口必須分開算，不能混在一起做分母。
    """
    n, lab = cv2.connectedComponents((kwr > 0).astype(np.uint8), 8)
    out = []
    for i in range(1, n):
        m = (lab == i).astype(np.float32)
        if m.sum() >= 2:                      # 一兩個像素的雜點不算開口
            out.append(m)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('city', help='例如 stown')
    ap.add_argument('--planw', default='620,800,1000,1250')
    ap.add_argument('--rots', type=int, default=16)
    ap.add_argument('--top', type=int, default=8)
    ap.add_argument('--minsep', type=float, default=120.0, help='與既有城的最小距離（地圖像素）')
    a = ap.parse_args()

    plan = os.path.join(CITY, a.city + '_plan.webp')
    riv, land = load_map()
    # 河細，開口對位容許幾個像素的鬆弛（不放寬的話幾乎沒有解）
    rivD = cv2.dilate(riv, np.ones((7, 7), np.uint8))
    H, W = riv.shape
    print('地圖 %dx%d，河道像素 %.2f%%，陸地 %.1f%%'
          % (W, H, 100 * riv.mean(), 100 * land.mean()))

    # 與既有城的距離場（避免疊在帝都／聖王廳／薇拉馮德身上）
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    far = np.ones((H, W), bool)
    for (cx, cy, cw) in KEEP:
        far &= ((xx - cx) ** 2 + (yy - cy) ** 2) > (a.minsep + cw / MAP_SCALE) ** 2

    best = []
    for planW in [float(s) for s in a.planw.split(',')]:
        for ri in range(a.rots):
            rot = ri * 2 * np.pi / a.rots
            kw, kc = city_kernels(plan, planW, rot)
            kr = ring_of(kc)
            kwr = kw * kr
            nW = kw.sum()
            mouths = mouths_of(kwr)
            if nW < 8 or not mouths:
                continue
            # 相關：核落在每個位置時，命中多少河道像素
            hitA = cv2.filter2D(riv, -1, kw, borderType=cv2.BORDER_CONSTANT)
            rivA = cv2.filter2D(riv, -1, kc, borderType=cv2.BORDER_CONSTANT)
            seaU = cv2.filter2D(1.0 - land, -1, kc, borderType=cv2.BORDER_CONSTANT)
            dice_a = 2 * hitA / np.maximum(nW + rivA, 1e-6)

            # 開口接通率：每個開口附近有沒有地圖的河。河細，容許 rivD 的鬆弛。
            ok = np.zeros_like(dice_a)
            for m in mouths:
                h = cv2.filter2D(rivD, -1, m, borderType=cv2.BORDER_CONSTANT)
                ok += (h >= 1.0).astype(np.float32)
            ok /= len(mouths)

            # ⚠ 接通率是**門檻**不是加權項：少接一個開口就是一條斷頭河，
            #   再高的整片重疊率也補不回來。
            score = ok * (0.35 + 0.65 * dice_a)
            score[seaU > 0.02 * kc.sum()] = 0        # 城不能壓到雲海
            score[~far] = 0

            i = int(np.argmax(score))
            y0, x0 = divmod(i, W)
            best.append((float(score[y0, x0]), float(dice_a[y0, x0]),
                         float(ok[y0, x0]), x0, y0, rot, planW, len(mouths)))
            print('  planW=%-5.0f rot=%5.1f°  開口%d  best %.3f (接通 %.0f%%) @(%d,%d)'
                  % (planW, np.degrees(rot), len(mouths), score[y0, x0],
                     100 * ok[y0, x0], x0, y0))

    best.sort(reverse=True)
    print('\n=== 前 %d 名 ===' % a.top)
    for s, da, ok, x, y, rot, pw, nm in best[:a.top]:
        print('  分數 %.3f  開口 %d 個接通 %.0f%%  整片重疊 %.1f%%  '
              'x:%d y:%d  planRot:%.2f  planW:%.0f'
              % (s, nm, 100 * ok, 100 * da, x, y, rot, pw))
    return best


if __name__ == '__main__':
    main()
