# -*- coding: utf-8 -*-
"""群戰分層 → 原立繪的對位表（ver -2623）。

群戰的每一張分層（`resources/enemy/canyon_swarm/fly<n>/guard_<k>.webp`）是某一隻怪的立繪縮放、位移（可能左右翻）排版上去的；
逐隻的待機／動作動畫是用**原立繪**生成的（anim.json 的 box 是立繪畫布座標）⇒ 要知道每一層「是誰、縮多少、擺在哪」才疊得準。
這支把每一層拿去跟候選立繪比 alpha（外框對齊後的差異最小者勝），寫成 `script/group_members.js`：

    GROUP_MEMBERS['<分層資料夾>'][<k>] = { stem, map:[k, ox, oy, flip], canvas:[W,H], err }

  · stem  ＝動畫表（config 的 ENEMY_IDLE／ATK／DELAY／MISS）的鑰匙。`NEUTRAL` 裡的怪改指中立立繪（動畫是用它生成的），
           map 照「腳底中點對齊、身高相同」從深色版換算過去。
  · map   ＝立繪畫布座標 × k ＋ (ox, oy) ＝分層畫布座標；flip＝1 表示分層是左右翻過的（先翻再縮）。
  · err   ＝對位後兩張 alpha 不一致的比例（>3% 的會印出來，要人看）。

用法：py tools/group_member_map.py     （分層或立繪換了就重跑；`--check` 只比對不寫檔）
"""
import os, sys, json, glob
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'script', 'group_members.js')
GROUPS = ['resources/enemy/canyon_swarm/fly*/']
CANDS = 'resources/enemy/mon_canyon_*_dark.webp'
EXTRA = ['resources/enemy/mon_canyon_houndbeast.webp']
NEUTRAL = {   # 深色版 → 動畫用的中立立繪（TO_CODE_canyon 11-15：鐵衣苦修者、高蹺細影換新立繪）
    'mon_canyon_ironpenitent_dark': 'mon_canyon_ironpenitent_neutral',
    'mon_canyon_stilt_dark': 'mon_canyon_stilt_neutral',
}


def alpha(p):
    return np.array(Image.open(os.path.join(ROOT, p)).convert('RGBA'))[:, :, 3]


def bbox(a):
    ys, xs = np.where(a > 40)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def fit(src, dst, flip):
    """src 立繪 alpha、dst 分層 alpha → (k, ox, oy, err)；用高度定縮放、外框中心定位移（分層可能被畫面邊裁掉，寬度不可靠）。"""
    s = src[:, ::-1] if flip else src
    A, B = bbox(s), bbox(dst)
    k = (B[3] - B[1]) / (A[3] - A[1])
    H, W = dst.shape
    # 被左右邊裁掉時用沒被裁的那一邊對齊
    if B[0] <= 1 and B[2] < W - 1: ox = B[2] - A[2] * k
    elif B[2] >= W - 1 and B[0] > 1: ox = B[0] - A[0] * k
    else: ox = (B[0] + B[2]) / 2 - (A[0] + A[2]) / 2 * k
    oy = B[1] - A[1] * k
    sm = Image.fromarray(s).resize((max(1, round(s.shape[1] * k)), max(1, round(s.shape[0] * k))), Image.BILINEAR)
    can = Image.new('L', (W, H)); can.paste(sm, (round(ox), round(oy)))
    c = np.array(can) > 60; d = dst > 60
    err = (c ^ d).sum() / max(1, d.sum())
    return k, ox, oy, err


def main(check=False):
    cands = sorted(glob.glob(os.path.join(ROOT, CANDS))) + [os.path.join(ROOT, p) for p in EXTRA]
    cands = [os.path.relpath(p, ROOT).replace('\\', '/') for p in cands]
    calpha = {p: alpha(p) for p in cands}
    out = {}
    for gd in GROUPS:
        for d in sorted(glob.glob(os.path.join(ROOT, gd)), key=lambda x: int(''.join(c for c in os.path.basename(x.rstrip('/\\')) if c.isdigit()) or 0)):
            rel = os.path.relpath(d, ROOT).replace('\\', '/').rstrip('/') + '/'
            for f in sorted(glob.glob(os.path.join(d, 'guard_*.webp'))):
                n = int(os.path.basename(f)[6:-5]); dst = alpha(os.path.relpath(f, ROOT))
                best = None
                for p, a in calpha.items():
                    for flip in (0, 1):
                        k, ox, oy, err = fit(a, dst, flip)
                        if best is None or err < best[0]: best = (err, p, flip, k, ox, oy)
                err, p, flip, k, ox, oy = best
                stem = os.path.basename(p)[:-5]
                if stem in NEUTRAL:   # 腳底中點對齊、身高相同 → 換到中立立繪
                    a0 = calpha[p]; nb = bbox(alpha('resources/enemy/' + NEUTRAL[stem] + '.webp')); db = bbox(a0)
                    W0 = a0.shape[1]
                    if flip: db = (W0 - db[2], db[1], W0 - db[0], db[3]); nb = (W0 - nb[2], nb[1], W0 - nb[0], nb[3])
                    feet = ((db[0] + db[2]) / 2 * k + ox, db[3] * k + oy); hh = (db[3] - db[1]) * k
                    k2 = hh / (nb[3] - nb[1]); ox = feet[0] - (nb[0] + nb[2]) / 2 * k2; oy = feet[1] - nb[3] * k2; k = k2
                    stem = NEUTRAL[stem]
                out.setdefault(rel, {})[n] = {'stem': stem, 'map': [round(k, 4), round(ox, 1), round(oy, 1), flip],
                                              'canvas': [dst.shape[1], dst.shape[0]], 'err': round(float(err), 3)}
                if err > 0.03: print('⚠ %sguard_%d → %s 差異 %.1f%%（要人看）' % (rel, n, stem, err * 100))
    lines = ['/* ══ 群戰分層 → 原立繪的對位表（ver -2623）══ 自動產生，不要手改：`py tools/group_member_map.py`',
             '   每一層是哪一隻怪（stem＝動畫表的鑰匙）、立繪畫布 → 分層畫布的 map:[k, ox, oy, flip]（flip＝分層左右翻過）。',
             '   用在 `modules/enemy.js` 的群戰逐人動畫（待機／攻擊／延時／點錯照 stem 查 config 的 ENEMY_* 表）。 */',
             'export const GROUP_MEMBERS = {']
    for g in out:
        lines.append('  %s: {' % json.dumps(g))
        for n in sorted(out[g]):
            lines.append('    %d: %s,' % (n, json.dumps(out[g][n], ensure_ascii=False)))
        lines.append('  },')
    lines.append('};')
    text = '\n'.join(lines) + '\n'
    if check:
        cur = open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
        print('✔ group_members 同步' if cur == text else '✘ script/group_members.js 不同步 —— 跑 py tools/group_member_map.py')
        return 0 if cur == text else 1
    open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
    print('寫入 script/group_members.js：%d 組 %d 層' % (len(out), sum(len(v) for v in out.values())))
    return 0


if __name__ == '__main__':
    sys.exit(main('--check' in sys.argv))
