#!/usr/bin/env python3
"""眨眼的全閉格改用 GPT 畫閉眼（Ray 10-03 定）：3×3 拼圖 → GPT → 拆格對位 → 只貼眼睛那塊。

  py -3.11 tools/blink_gpt.py grid  <批名> <立繪名> x9      # → tools/_blink_base/grid_<批名>.png（上傳給 GPT 的）＋ .json
  py -3.11 tools/blink_gpt.py merge <批名> <GPT 回來的圖>    # → tools/_blink_base/<名>_closed.png（blink_build 會自動用）
  py -3.11 tools/blink_gpt.py todo                         # 表上還沒有 GPT 全閉的立繪（依角色排好）

為什麼這樣做（試過、輸掉的不要再試）：
  · 本機把眼睛抹成皮膚（擴散填色／拉伸眼皮）：瀏海下白帶、黑眼圈、外眼角色塊，一直修不乾淨。
  · SD 去眼：模型堅持把眼睛畫回去。GPT 去眼：重新構圖、用瀏海把眼睛蓋掉。
  · GPT「閉眼差分」就很穩（構圖不動），而且 3×3 拼一張（每格 340px≈原圖臉部解析度）一次出九張。

合成：每格縮回原尺寸 → ECC affine（只看眼睛以外、alpha 不透明的地方）對到原圖 → 依眼外一圈皮膚平均色差校色
→ 眼睛那塊（M∪I 外擴 6、扣頭髮）羽化 1.5px 貼回原圖。alpha 一律原圖。
品質門檻：對位相關 cc ≥ 0.985、眼外平均差 ≤ 12，不過就不寫檔（那一格留給下一批重出）。
GPT 給的提示詞見 PROMPT（每一批都整段照貼 —— 憲法 §5：畫風那一句每一則都要寫）。
⚠ 閉眼線要在下眼瞼（Ray 10-03：「應該是上眼往下眼闔」）—— 寫在提示詞裡讓 GPT 畫對；
  本機事後搬線（整欄拉伸／抽出線圖層平移）兩種都試過，會糊成黑塊或留灰影，已撤。
"""
import json, os, re, sys
import numpy as np
import cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import blink_patch as bp

BASE = os.path.join(HERE, '_blink_base')
CELL, GAP, N = 340, 2, 3
CC_MIN, OUT_MAX = 0.985, 12.0

PROMPT = ("這是同一個角色（或幾個角色）的 9 張頭像拼成的 3×3 拼圖（每格之間有細白線）。請做一張「閉眼」的表情差分："
          "每一格都只把兩隻眼睛改成自然、輕鬆地閉上 —— ⚠ 是「上眼瞼整片往下蓋到底」：閉起來的那條睫毛弧線要落在原本「下眼瞼／眼睛下緣」的那條線上（原本眼睛最下面的位置），不是停在原本上眼瞼的高度；弧線跟著那一格臉的角度，眼睛原本的位置全部變成蓋下來的眼皮（皮膚）。"
          "其餘一切 100% 保留原圖 —— 3×3 的格線位置、每一格的構圖、裁切、人物位置與大小、瀏海與每一根髮絲、眉毛、嘴、臉紅、"
          "眼淚以外的部分、服裝、配件、手全部不變，不要重新設計角色，不要拉遠、不要改變構圖或格子大小，輸出同樣是 1024×1024 的 3×3 拼圖。"
          "anime style, cel shading, clean lineart，絕不要顆粒感、不要雜訊噪點、不要油畫質感。")


def src(n):
    for p in (os.path.join(ROOT, 'resources', 'si', n + '.webp'), os.path.join(ROOT, 'resources', 'si', 'npc', n + '.webp')):
        if os.path.exists(p):
            return p
    raise SystemExit('找不到立繪：' + n)


def load(n):
    O = np.array(Image.open(src(n)).convert('RGBA'))
    seg = bp.load_seg(os.path.join(HERE, '_blink_seg', n, 'classes_s1.6.png'), O.shape)
    return O, seg


def grid(tag, names):
    if not 1 <= len(names) <= N * N:
        raise SystemExit(f'一批 1~{N * N} 張')
    os.makedirs(BASE, exist_ok=True)
    canvas = Image.new('RGB', (N * CELL + (N - 1) * GAP,) * 2, (255, 255, 255))
    meta = []
    for i, n in enumerate(names):
        O, seg = load(n)
        boxes = bp.seg_eyes(seg, rgb=O[..., :3])
        if not boxes:
            raise SystemExit('分割找不到眼睛：' + n)
        xs = [b[0] for b in boxes] + [b[2] for b in boxes]
        ys = [b[1] for b in boxes] + [b[3] for b in boxes]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        side = int(max(300, (max(xs) - min(xs)) * 2.4))
        x0, y0 = int(cx - side / 2), int(cy - side * 0.42)
        im = Image.fromarray(O)
        crop = Image.new('RGBA', (side, side), (255, 255, 255, 255))
        crop.alpha_composite(im.crop((x0, y0, x0 + side, y0 + side)))
        r, c = divmod(i, N)
        px, py = c * (CELL + GAP), r * (CELL + GAP)
        canvas.paste(crop.convert('RGB').resize((CELL, CELL), Image.LANCZOS), (px, py))
        meta.append({'name': n, 'box': [x0, y0, x0 + side, y0 + side], 'cell': [px, py, CELL]})
    canvas.save(os.path.join(BASE, f'grid_{tag}.png'))
    json.dump(meta, open(os.path.join(BASE, f'grid_{tag}.json'), 'w'), indent=1)
    print(os.path.join(BASE, f'grid_{tag}.png'))


def refine(orig, ga, ez, al):
    """把 ga（已整體對位的 GPT 格）再局部對到 orig。回傳 (精對位後的 ga, 接縫環平均差 前, 後)。"""
    g0 = cv2.cvtColor(orig, cv2.COLOR_RGB2GRAY)
    g1 = cv2.cvtColor(ga, cv2.COLOR_RGB2GRAY)
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    dis.setFinestScale(0); dis.setGradientDescentIterations(40); dis.setPatchSize(8); dis.setPatchStride(2)
    flow = dis.calc(g0, g1, None)                     # orig 的像素 (x,y) 在 ga 裡位於 (x,y)+flow
    bad = bp._dil(ez, 14) | (al < 250)               # 眼睛附近（睜／閉內容不同，光流會亂配）一律不信，由外面補
    # 眼睛那塊與透明處：位移由周圍擴散補上（平滑、連續）
    f3 = np.dstack([flow[..., 0], flow[..., 1], np.zeros_like(flow[..., 0])]).astype(np.float32)
    f3 = bp.harmonic_fill(f3, bad, iters=600)
    flow = f3[..., :2]
    flow = np.clip(flow, -3, 3)                        # 只修小偏移：超過 3px 的一定是亂配
    flow = cv2.GaussianBlur(flow, (0, 0), 6)          # 平滑成整體的小位移，不改形狀（ver -1950 用 2：眼皮與髮絲被扭成波浪）
    h, w = g0.shape
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    out = cv2.remap(ga, gx + flow[..., 0], gy + flow[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    ring = bp._dil(ez, 14) & ~bp._dil(ez, 2) & (al > 250)
    d0 = float(np.abs(ga.astype(float) - orig.astype(float)).mean(-1)[ring].mean()) if ring.any() else 0.0
    d1 = float(np.abs(out.astype(float) - orig.astype(float)).mean(-1)[ring].mean()) if ring.any() else 0.0
    return (out if d1 <= d0 else ga), d0, min(d0, d1)


def merge(tag, gpath):
    meta = json.load(open(os.path.join(BASE, f'grid_{tag}.json')))
    GG = np.array(Image.open(gpath).convert('RGB'))
    sc = GG.shape[1] / float(meta[0].get('canvas', N * CELL + (N - 1) * GAP))
    ok, bad = [], []
    for m in meta:
        n = m['name']; x0, y0, x1, y1 = m['box']; bw, bh = x1 - x0, y1 - y0
        px, py, cw = m['cell'][:3]; ch = m['cell'][3] if len(m['cell']) > 3 else cw   # 拼圖格是正方；整張單送時是長方
        O, seg = load(n); rgb = O[..., :3]; Hh, Ww = rgb.shape[:2]
        gc = GG[int(round(py * sc)):int(round((py + ch) * sc)), int(round(px * sc)):int(round((px + cw) * sc))]
        gc = cv2.resize(gc, (bw, bh), interpolation=cv2.INTER_LANCZOS4)
        orig = np.full((bh, bw, 3), 255, np.uint8); al = np.zeros((bh, bw), np.uint8)
        sx0, sy0, sx1, sy1 = max(0, x0), max(0, y0), min(Ww, x1), min(Hh, y1)
        orig[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = rgb[sy0:sy1, sx0:sx1]
        al[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = O[sy0:sy1, sx0:sx1, 3]
        hs = bp.seg_hair_core(seg)
        eyes = [bp.analyse(rgb, b, seg, hs) for b in bp.seg_eyes(seg, rgb=rgb)]
        Mall = np.zeros(rgb.shape[:2], bool); Iall = Mall.copy()
        for e in eyes:
            Mall |= e['M']; Iall |= e['I']
        ez = np.zeros((bh, bw), bool)
        ez[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = bp._dil(Mall | Iall, 10)[sy0:sy1, sx0:sx1]
        a = cv2.cvtColor(orig, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
        b = cv2.cvtColor(gc, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
        msk = ((~ez) & (al > 250)).astype(np.uint8)
        warp = np.eye(2, 3, dtype=np.float32)
        try:
            cc, warp = cv2.findTransformECC(a, b, warp, cv2.MOTION_AFFINE,
                                            (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 400, 1e-6), msk, 5)
        except cv2.error:
            bad.append((n, 'ECC 不收斂')); continue
        ga = cv2.warpAffine(gc, warp, (bw, bh), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
        outside = float(np.abs(ga.astype(float) - orig.astype(float)).mean(-1)[msk.astype(bool)].mean())
        # 局部精對位（Ray 10-03：「合成有一點沒對準，額頭在閉眼時會大一點點，要嚴絲合縫」）：
        # 整格 affine 對得到整體，但 GPT 常把眼睛附近畫大／偏 1~2px —— 貼回去的邊就會跳。
        # 用密集光流（DIS）算每個像素的位移；眼睛那塊（GPT 改過、光流不可信）的位移由周圍擴散補上，再依位移重取樣。
        seam0 = seam1 = 0.0
        if not os.environ.get('BLINK_NOREFINE'):
            ga, seam0, seam1 = refine(orig, ga, ez, al)
        if not ((cc >= CC_MIN and outside <= OUT_MAX) or (cc >= 0.975 and outside <= 9.0)):   # 次門檻：對位略差但眼外幾乎一致（白髮／兩人同框）
            bad.append((n, f'cc {cc:.4f} 眼外差 {outside:.1f}')); continue
        Gf = rgb.copy(); Gf[sy0:sy1, sx0:sx1] = ga[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0]
        mk = bp._dil(Mall | Iall, 6) & ~((seg == bp.SEG_HAIR) & ~bp._dil(Iall, 1)) & (seg != 0)
        ring = bp._dil(mk, 10) & ~bp._dil(mk, 3) & ((seg == bp.SEG_FACE) | (seg == 5))
        d = (rgb[ring].astype(float) - Gf[ring].astype(float)).mean(0) if ring.any() else np.zeros(3)
        Gc = np.clip(Gf.astype(float) + d, 0, 255)
        mf = cv2.GaussianBlur(mk.astype(np.float32), (0, 0), 1.5)[..., None]
        C = rgb.astype(float) * (1 - mf) + Gc * mf
        out = O.copy(); out[..., :3] = np.clip(C, 0, 255).astype(np.uint8)
        assert (out[..., 3] == O[..., 3]).all()
        Image.fromarray(out).save(os.path.join(BASE, n + '_closed.png'))
        ok.append(n)
        print(f'✔ {n}  cc {cc:.4f}  眼外差 {outside:.1f}  接縫差 {seam0:.2f}→{seam1:.2f}  校色 {np.round(d, 1).tolist()}')
    for n, why in bad:
        print(f'✘ {n}  {why}')
    print(f'成功 {len(ok)}／{len(meta)}')
    return ok


def todo():
    t = open(os.path.join(ROOT, 'script', 'blink.js'), encoding='utf-8').read()
    tab = json.loads(re.search(r'BLINK\s*=\s*(\{.*\});', t, re.S).group(1))
    names = sorted(n for n in tab if not os.path.exists(os.path.join(BASE, n + '_closed.png')))
    print(len(names)); print(' '.join(names))


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a:
        raise SystemExit(__doc__)
    if a[0] == 'grid':
        grid(a[1], a[2:])
    elif a[0] == 'merge':
        merge(a[1], a[2])
    elif a[0] == 'todo':
        todo()
    elif a[0] == 'prompt':
        print(PROMPT)
