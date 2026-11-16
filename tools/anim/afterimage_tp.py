# 殘影瞬移攻擊（憲法 natali rule 第 13 條）：KF 資料夾的 ai_grid_<名>_alpha_v1.png（GPT 殘影四宮格）拆四格接在待機 idle_v1 後 → ComfyUI out/monsters/canyon_ai_<立繪名>，開 chk 剪
# 11-16 Ray：「不是魔法瞬移 是殘影瞬移」「拆好接在 IDLE 後 開 CHK」
# GPT 殘影四宮格（每隻一張）→ 拆四格 → 以第 1 格（本體完整）對齊待機最後一格（身高等比、重心對齊），四格用同一個變換 → 待機 48 ＋ 四格 ＋ 空 4
# 輸出座標＝待機 anim.json box 的 0.5 倍（交件鏈 to_portrait＝(x/0.5+x0, y/0.5+y0)）
import os, sys, json, glob, numpy as np
from PIL import Image
TIV = r'C:\Users\User\Desktop\TIVOT'; OUT = r'C:\Users\User\Desktop\ComfyUI-master\tivot_wan\out\monsters'
KF = os.path.join(TIV, 'resources', 'enemy', '_neutral_refs', 'canyon_kf', 'kf'); S = 0.5
def body(im, th=200):
    a = np.array(im)[..., 3]; ys, xs = np.nonzero(a > th); return xs.mean(), ys.mean(), ys.min(), ys.max()
for key in sys.argv[1:]:   # 例：python tools/anim/afterimage_tp.py mon_canyon_bonecrow_dark
    n = key.replace('mon_canyon_', '').replace('_dark', '')
    G = Image.open(os.path.join(KF, f'ai_grid_{n}_alpha_v1.png')).convert('RGBA'); cw, ch = G.width // 2, G.height // 2
    cells = [G.crop((cx * cw, cy * ch, cx * cw + cw, cy * ch + ch)) for cx, cy in ((0, 0), (1, 0), (0, 1), (1, 1))]
    D = os.path.join(TIV, 'resources', 'enemy', 'anim', key + '_idle_v1'); A = json.load(open(os.path.join(D, 'anim.json')))
    x0, y0, x1, y1 = A['box']; W, H = round((x1 - x0) * S), round((y1 - y0) * S)
    fr = [Image.open(f).convert('RGBA').resize((W, H), Image.LANCZOS) for f in sorted(glob.glob(os.path.join(D, 'frame_*.webp')))]
    ix, iy, it, ib = body(fr[-1]); gx, gy, gt, gb = body(cells[0])
    k = (ib - it) / (gb - gt)
    tps = []
    for c in cells:
        t = c.resize((round(cw * k), round(ch * k)), Image.LANCZOS); f = Image.new('RGBA', (W, H))
        f.alpha_composite(t, (round(ix - gx * k), round(iy - gy * k))); tps.append(f)
    seq = fr + tps + [Image.new('RGBA', (W, H))] * 4
    od = os.path.join(OUT, 'canyon_ai_' + key); os.makedirs(od, exist_ok=True)
    for f in glob.glob(os.path.join(od, 'frame_*')): os.remove(f)
    for i, im in enumerate(seq): im.save(os.path.join(od, f'frame_{i:03d}.webp'), quality=90)
    print(key, len(fr), '+4 殘影 +4 空 =', len(seq), 'k', round(k, 3))
