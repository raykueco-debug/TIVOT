"""tiger rule 初剪（CLAUDE.md natali rule §12）：有爪牙的獸的標準剪法，範本＝山貓 E065 的四支 cut。
用法：python tiger_cut.py <pounce|hswipe> <AB 格資料夾> <BA 格資料夾> <名字> [--out out/auto]（不要哪段就給 -）
輸出：<out>/<名字>_AB_tiger、<名字>_BA_tiger，各含選中的格 frame_NN.webp ＋ holds.json ＋ export.json（animechk 讀得到當預設停格）。
AB 必須 49 格、BA 必須 33 格（規則：段長不對先問 Ray，這裡直接報錯）。打到＝AB 段最後一格。fps 24。"""
import argparse, glob, json, os, shutil, sys

T = {
    'hswipe': {'AB': ([0, 1, 36, 37, 41, 42, 44, 47, 48], [1, 1, 1, 1, 2, 1, 1, 1, 1]),
               'BA': ([0, 1, 3, 5, 6, 10, 11, 12, 13, 17, 18, 22, 23, 24, 25, 29, 30, 31, 32], None)},
    'pounce': {'AB': ([0, 1, 6, 11, 13, 18, 23, 25, 30, 35, 37, 42, 47, 48], None),
               'BA': ([0, 1, 4, 8, 11, 12, 13, 18, 23, 24, 25, 30, 32], None)},
}
def ba_holds(kind, n):
    h = [1] * n
    for k in ({'hswipe': (6, 11, 16), 'pounce': (3, 4)}[kind]):  # 第 k 個（1 起算）×2
        h[k - 1] = 2
    return h

ap = argparse.ArgumentParser()
ap.add_argument('kind', choices=['pounce', 'hswipe']); ap.add_argument('ab'); ap.add_argument('ba'); ap.add_argument('name')
ap.add_argument('--out', default='out/auto')
a = ap.parse_args()

for seg, src, need in (('AB', a.ab, 49), ('BA', a.ba, 33)):
    if src == '-': continue
    fs = sorted(glob.glob(os.path.join(src, 'frame_*.webp'))) or sorted(glob.glob(os.path.join(src, 'frame_*.png')))
    if len(fs) != need:
        sys.exit(f'{src} 有 {len(fs)} 格，tiger rule 的 {seg} 要 {need} 格 → 先問 Ray')
    kept, holds = T[a.kind][seg]
    holds = holds or ([1] * len(kept) if seg == 'AB' else ba_holds(a.kind, len(kept)))
    od = os.path.join(a.out, f'{a.name}_{seg}_tiger')
    os.makedirs(od, exist_ok=True)
    for j, i in enumerate(kept):
        shutil.copyfile(fs[i], os.path.join(od, f'frame_{j:02d}' + os.path.splitext(fs[i])[1]))
    json.dump({'holds': holds, 'fps': 24}, open(os.path.join(od, 'holds.json'), 'w'))
    json.dump({'from': src.replace('\\', '/'), 'kept_index': kept, 'holds': holds, 'fps': 24, 'accents': [], 'smear': -1,
               'note': f'tiger rule {a.kind} {seg} 初剪'}, open(os.path.join(od, 'export.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print(f'{od}：{len(kept)} 張 {sum(holds)} 格 {sum(holds) / 24:.2f} 秒')
