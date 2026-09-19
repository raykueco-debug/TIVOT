#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/matting_eval.py —— 去背工具的評測台（ver -1516）

  為什麼要它（`resources/SI/_alpha_matting_eval.md`）：
  ver -1503 交了 78 張白霧立繪，**而當時的驗收是假的** —— 疊了深色棋盤沒錯，
  但是縮成 220px 縮圖看的，那個尺寸白霧根本看不見。
  ⇒ 這支工具存在的意義是**把驗收從眼睛的印象換成寫死的數字 ＋ 100% 裁切**，
    而且**過關線在跑之前就訂好**（Ray 面前先寫死，不要事後才訂）。

  Ground truth ＝ Ray 自己交的 22 張（產圖端直接輸出的 alpha，近白 0.0%）：
    Cecilie 9 ／ Laurie 5 ／ Nemo 6 ／ Sorana_drink ／ Sorana_shy

  流程：GT 的 RGBA →**合成到純白底**（= 我們手上會有的輸入）→ 丟給待測工具
        → 與 GT 的 alpha 逐像素比對。

  用法：
      python3 tools/matting_eval.py prep              # 產白底輸入（跑一次就好）
      python3 tools/matting_eval.py score  <候選目錄>  # 三個指標 ＋ 過關判定
      python3 tools/matting_eval.py crops  <候選目錄>  # 深色棋盤 100% 裁切

  ⚠⚠ 三個數字全過**也還不算過** —— 最後一定要把 `crops` 的圖貼給 Ray 看
    （蘿芮的長捲髮、賽西莉的長髮、尼莫的銀髮）。數字過了但眼睛看得出白邊，就是沒過。
"""
import os, sys, glob
import _utf8  # noqa: F401  # 主控台 UTF-8（中文 Windows 的 cp950），見 tools/_utf8.py
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, 'resources', '_originals', '_matting_eval')  # _originals/ 是 gitignore
SRC = os.path.join(ROOT, 'resources', 'SI')

# Ground truth：Ray 自己交的那 22 張（產圖端出的 alpha）
GT_GLOBS = ['Cecilie_SI_*.webp', 'Laurie_SI_*.webp', 'Nemo_SI_*.webp',
            'Sorana_SI_drink.webp', 'Sorana_SI_shy.webp']

# 過關線：跑之前就寫死，不准事後調（_alpha_matting_eval.md 第三節）
PASS_NEARWHITE = 1.0    # 近白比例 %（半透明像素中 min(RGB)>=235 的比例）
PASS_MAE = 3.0          # alpha 平均絕對誤差（0~255 尺度）
PASS_IOU = 0.97         # 髮絲區 IoU（alpha>16 的二值 IoU）

SEMI_LO, SEMI_HI = 8, 200   # 「半透明」的定義
NEAR_WHITE = 235            # min(RGB) 到這個值以上就算「近白」
BIN_TH = 16                 # 二值化門檻


def gt_files():
    out = []
    for g in GT_GLOBS:
        out += sorted(glob.glob(os.path.join(SRC, g)))
    return out


def near_white_pct(rgba):
    """半透明像素中『近白』的比例 —— 白霧的直接量度。

    這是整套評測的核心指標：ver -1503 那 78 張是 18~65%，Ray 交的是 0.0%。
    病灶是「只把邊緣像素變半透明，沒有把它的顏色修掉」⇒ 邊緣留著半透明的白。
    """
    a = rgba[:, :, 3].astype(np.int32)
    semi = (a > SEMI_LO) & (a < SEMI_HI)
    n = int(semi.sum())
    if n == 0:
        return float('nan'), 0
    mn = rgba[:, :, :3].astype(np.int32).min(axis=2)
    return 100.0 * float(((mn >= NEAR_WHITE) & semi).sum()) / n, n


def cmd_prep():
    files = gt_files()
    if len(files) != 22:
        print('⚠ ground truth 應該是 22 張，實際找到 %d 張 —— 先確認檔案' % len(files))
    os.makedirs(os.path.join(WORK, 'input'), exist_ok=True)
    os.makedirs(os.path.join(WORK, 'gt'), exist_ok=True)
    print('%-28s%12s%8s%8s' % ('檔名', '尺寸', '透明%', '近白%'))
    for f in files:
        name = os.path.splitext(os.path.basename(f))[0]
        im = Image.open(f).convert('RGBA')
        arr = np.asarray(im).astype(np.float64)
        a = arr[:, :, 3:4] / 255.0
        # 合成到純白底 —— 這就是「我們手上會有的輸入」
        white = arr[:, :, :3] * a + 255.0 * (1.0 - a)
        Image.fromarray(np.clip(white, 0, 255).astype(np.uint8)).save(
            os.path.join(WORK, 'input', name + '.png'))
        im.save(os.path.join(WORK, 'gt', name + '.png'))
        nw, _ = near_white_pct(np.asarray(im))
        tr = 100.0 * float((np.asarray(im)[:, :, 3] < 8).sum()) / (im.width * im.height)
        print('%-28s%7dx%-5d%8.1f%8.2f' % (name, im.width, im.height, tr, nw))
    print('\n✔ 白底輸入 → %s' % os.path.relpath(os.path.join(WORK, 'input'), ROOT))
    print('✔ GT       → %s' % os.path.relpath(os.path.join(WORK, 'gt'), ROOT))
    print('⚠ 上面 GT 那一欄的「近白%」就是對照組，應該全部是 0.00')


def load_rgba(path):
    return np.asarray(Image.open(path).convert('RGBA'))


def cmd_score(cand_dir):
    gt_dir = os.path.join(WORK, 'gt')
    rows, miss = [], []
    for g in sorted(glob.glob(os.path.join(gt_dir, '*.png'))):
        name = os.path.basename(g)[:-4]
        c = None
        for ext in ('.png', '.webp'):
            p = os.path.join(cand_dir, name + ext)
            if os.path.exists(p):
                c = p
                break
        if c is None:
            miss.append(name)
            continue
        G, C = load_rgba(g), load_rgba(c)
        if G.shape[:2] != C.shape[:2]:
            print('⛔ %s 尺寸不符 gt%s vs 候選%s' % (name, G.shape[:2], C.shape[:2]))
            continue
        ga = G[:, :, 3].astype(np.float64)
        ca = C[:, :, 3].astype(np.float64)
        mae = float(np.abs(ga - ca).mean())
        gb, cb = ga > BIN_TH, ca > BIN_TH
        inter = float((gb & cb).sum())
        union = float((gb | cb).sum())
        iou = inter / union if union else 1.0
        nw, nsemi = near_white_pct(C)
        rows.append((name, nw, mae, iou, nsemi))

    if miss:
        print('⚠ 候選目錄少了 %d 張：%s%s' % (len(miss), ', '.join(miss[:6]),
                                          ' …' if len(miss) > 6 else ''))
    if not rows:
        print('⛔ 沒有可比對的圖')
        return 1

    print('\n%-28s%9s%9s%9s   判定' % ('檔名', '近白%', 'αMAE', 'IoU'))
    print('-' * 68)
    for name, nw, mae, iou, _ in rows:
        ok = (nw <= PASS_NEARWHITE) and (mae <= PASS_MAE) and (iou >= PASS_IOU)
        print('%-28s%9.2f%9.2f%9.4f   %s' % (name, nw, mae, iou, '✔' if ok else '⛔'))
    print('-' * 68)
    nws = np.array([r[1] for r in rows])
    maes = np.array([r[2] for r in rows])
    ious = np.array([r[3] for r in rows])
    print('%-28s%9.2f%9.2f%9.4f' % ('平均', nws.mean(), maes.mean(), ious.mean()))
    print('%-28s%9.2f%9.2f%9.4f' % ('最差', nws.max(), maes.max(), ious.min()))
    print()
    checks = [
        ('近白比例 <= %.1f%%' % PASS_NEARWHITE, nws.max() <= PASS_NEARWHITE,
         '最差 %.2f%%' % nws.max()),
        ('alpha 平均絕對誤差 <= %.1f' % PASS_MAE, maes.mean() <= PASS_MAE,
         '平均 %.2f' % maes.mean()),
        ('髮絲區 IoU >= %.2f' % PASS_IOU, ious.min() >= PASS_IOU,
         '最差 %.4f' % ious.min()),
    ]
    for label, ok, detail in checks:
        print('  %s %-26s（%s）' % ('✔' if ok else '⛔', label, detail))
    allok = all(c[1] for c in checks)
    print('\n' + ('✔ 三個指標都過 —— 但還沒結束：跑 crops 把最難的幾張 100% 裁切貼給 Ray 看'
                  if allok else '⛔ 沒過'))
    return 0 if allok else 1


def checker(h, w, size=16, c1=(32, 32, 40), c2=(44, 44, 54)):
    """深色棋盤 —— 白霧只有疊在深色上才看得見（憲法 §5）。"""
    yy, xx = np.mgrid[0:h, 0:w]
    m = ((yy // size + xx // size) % 2).astype(bool)
    bg = np.zeros((h, w, 3), np.float64)
    bg[m] = c1
    bg[~m] = c2
    return bg


def cmd_crops(cand_dir, box=340, names=()):
    """自動挑「半透明像素最密」的區塊裁出來 —— 那就是髮絲邊緣，白霧的案發現場。

    ⚠ 每個角色各挑一張，不要讓張數多的角色把名額吃光（蘿芮有 5 張、尼莫只有 6 張，
      照檔名排序的話銀髮那個一張都切不到 —— 而銀髮正是近白指標最難的）。
    """
    out = os.path.join(WORK, 'crops_' + os.path.basename(cand_dir.rstrip('/\\')))
    os.makedirs(out, exist_ok=True)
    cands = sorted(glob.glob(os.path.join(cand_dir, '*.png'))
                   + glob.glob(os.path.join(cand_dir, '*.webp')))
    if names:
        picks = [p for p in cands if os.path.splitext(os.path.basename(p))[0] in names]
    else:
        # 最難的三個角色（長捲髮／長髮／銀髮）各一張
        picks, seen = [], set()
        for who in ('Laurie', 'Cecilie', 'Nemo', 'Sorana'):
            for p in cands:
                if os.path.basename(p).startswith(who) and who not in seen:
                    picks.append(p)
                    seen.add(who)
    for p in picks:
        name = os.path.splitext(os.path.basename(p))[0]
        C = load_rgba(p).astype(np.float64)
        a = C[:, :, 3]
        semi = ((a > SEMI_LO) & (a < SEMI_HI)).astype(np.float64)
        H, W = a.shape
        # 積分圖找 semi 最密的 box
        ii = semi.cumsum(0).cumsum(1)
        best, by, bx = -1, 0, 0
        for y in range(0, max(1, H - box), 40):
            for x in range(0, max(1, W - box), 40):
                y2, x2 = min(y + box, H - 1), min(x + box, W - 1)
                s = ii[y2, x2] - (ii[y - 1, x2] if y else 0) - (ii[y2, x - 1] if x else 0) \
                    + (ii[y - 1, x - 1] if y and x else 0)
                if s > best:
                    best, by, bx = s, y, x
        y2, x2 = min(by + box, H), min(bx + box, W)
        sub = C[by:y2, bx:x2]
        al = sub[:, :, 3:4] / 255.0
        bg = checker(sub.shape[0], sub.shape[1])
        comp = sub[:, :, :3] * al + bg * (1.0 - al)      # 100%，不縮圖
        f = os.path.join(out, '%s_%d_%d.png' % (name, bx, by))
        Image.fromarray(np.clip(comp, 0, 255).astype(np.uint8)).save(f)
        print('%-28s 半透明像素 %7d @ (%d,%d)  → %s' % (name, int(best), bx, by,
                                                    os.path.basename(f)))
    print('\n✔ → %s' % os.path.relpath(out, ROOT))
    print('⚠⚠ 一律用原尺寸看（縮圖看不見白霧，ver -1503 就是這樣放行 78 張的）')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'prep':
        cmd_prep()
    elif cmd == 'score' and len(sys.argv) > 2:
        sys.exit(cmd_score(sys.argv[2]))
    elif cmd == 'crops' and len(sys.argv) > 2:
        cmd_crops(sys.argv[2], names=tuple(sys.argv[3:]))
    else:
        print(__doc__)
