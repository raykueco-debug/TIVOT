#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/alpha_floor.py —— 把貼圖 alpha 的「底噪」削成 0（ver -1215）

  為什麼要它（Ray：「雙槍吊飾 alpha 不確實有殘影」）：
  幾張門的素材整張畫布都鋪著 alpha 1~7 的殘留（吊墜 40019 個像素、平均 3.1/255）——
  那是交件的 PNG 本來就有的（`_originals/kerberos/Kerberos_Pendant.png` 一模一樣，
  不是 cwebp 造成的）。肉眼在單張圖上看不出來，但在遊戲裡會放大成兩件事：
    ① `filter:drop-shadow(...)` 依 alpha 投影 → 整個**外接矩形**都有影子
    ② 高光那一層是 `mix-blend-mode:screen` ＋ 用同一張圖當 mask →
       每 9 秒掃過去的光帶會把整個矩形點亮一次 ＝ 會動的殘影

  判準（不要憑感覺挑門檻）：看 alpha 的直方圖有沒有**斷崖**。
  吊墜：1-7 有 40019 個、8-15 只有 2520、16-23 有 1211、24-31 有 861 ——
  8 以上就回到「真的抗鋸齒邊緣」該有的密度（每 8 格約一千個）。
  所以底噪整個落在 **1~7**，門檻取 8 既清得乾淨、又一根真正的邊緣像素都沒動到。

  ⚠ `bulletsrain.webp` 有 49% 的像素落在 1~25 —— 那是**真的**軟光暈，不要動它。
    這支工具一律逐檔指定，不做整批掃描。

  用法：
      python3 tools/alpha_floor.py resources/vfx/kerberos_pendant.webp [門檻]
  它會先把原檔走 tools/recycle.sh 回收（絕不覆蓋掉唯一的一份），再寫新的。
"""
import os, subprocess, sys
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run(path, thr=8):
    full = path if os.path.isabs(path) else os.path.join(ROOT, path)
    im = Image.open(full).convert('RGBA')
    a = np.array(im)
    al = a[..., 3].astype(int)
    hit = int(((al >= 1) & (al < thr)).sum())
    if not hit:
        print('%-44s 沒有底噪（<%d 的像素是 0 個），不動' % (path, thr)); return 0
    a[..., 3] = np.where(al < thr, 0, al).astype(np.uint8)
    # 回收原檔（CLAUDE.md：不准覆蓋掉唯一的一份）
    subprocess.run([os.path.join(ROOT, 'tools/recycle.sh'), '-m',
                    'alpha 底噪版（ver -1215 削掉 alpha<%d 的殘留）' % thr, full],
                   check=True, cwd=ROOT, stdout=subprocess.DEVNULL)
    out = Image.fromarray(a, 'RGBA')
    # ⚠ exact=True：不要讓編碼器去動「完全透明」那些像素的 RGB —— 動了的話
    #   下一次有人拿它當 mask 或做 premultiplied 合成就會看到彩邊。
    out.save(full, format='WEBP', quality=92, method=6, exact=True)
    print('%-44s 削掉 %6d 個底噪像素（alpha 1~%d）→ %d bytes'
          % (path, hit, thr - 1, os.path.getsize(full)))
    return hit

if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    t = int(sys.argv[2]) if len(sys.argv) > 2 else 8
    run(sys.argv[1], t)
