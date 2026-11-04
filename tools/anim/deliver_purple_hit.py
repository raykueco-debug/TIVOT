# 紫月軍小隊 1～7 中槍倒地 → 遊戲交件（2026-11-04，Ray：「s1_s1_cut 用這個當標準剪完」「士兵全過可交件」）
# 來源：out/export/sN_sK_cut（animechk 剪好、照節拍展開的 15 張，24fps）
# 輸出：TIVOT/resources/enemy/anim/man_purple_squad_N_hit_v1/soldier_K/frame_XX.webp ＋ anim.json
#   座標轉回分層畫布（1254²，同 man_purple_squad_N_layers/soldier_K.webp），裁成 15 張的聯集框。
#   ⚠ 生成時的貼法＝tivot_wan.py 的 to_green（hit 模式：FIT 0.86、底部留 5%），這裡照它反算。
import glob, json, os, re
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
EXP = os.path.join(HERE, 'out', 'export'); IN = os.path.join(HERE, 'in_purple')
DST = r'C:\Users\Ray Ku\Desktop\TIVOT\resources\enemy\anim'
W, H, FIT = 480, 720, 0.86
FWD = {(1, 1), (1, 4), (1, 5), (2, 2), (2, 3), (3, 1), (3, 3), (4, 1), (4, 2), (5, 2), (5, 4), (6, 2), (6, 3), (7, 2), (7, 3)}   # ＝ batch_purple.py
summary = {}
for d in sorted(glob.glob(os.path.join(EXP, 's*_s*_cut'))):
    m = re.match(r's(\d+)_s(\d+)_cut$', os.path.basename(d))
    if not m: continue
    sq, k = int(m.group(1)), int(m.group(2))
    src = Image.open(os.path.join(IN, f's{sq}_s{k}.png')).convert('RGBA')
    bb = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    s = min(W * FIT / w, H * FIT / h); w2, h2 = round(w * s), round(h * s)
    ox, oy = (W - w2) // 2, H - h2 - int(H * 0.05)
    fs = sorted(glob.glob(os.path.join(d, 'frame_*.webp')))
    canv = []
    for f in fs:
        im = Image.open(f).convert('RGBA').resize((round(W / s), round(H / s)), Image.LANCZOS)
        c = Image.new('RGBA', src.size, (0, 0, 0, 0))
        c.paste(im, (round(bb[0] - ox / s), round(bb[1] - oy / s)), im)
        canv.append(c)
    box = None
    for c in canv:
        b = c.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        if b: box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    od = os.path.join(DST, f'man_purple_squad_{sq}_hit_v1', f'soldier_{k}'); os.makedirs(od, exist_ok=True)
    tot = 0
    for j, c in enumerate(canv):
        p = os.path.join(od, f'frame_{j:02d}.webp'); c.crop(box).save(p, 'WEBP', quality=85, alpha_quality=90, method=6); tot += os.path.getsize(p)
    info = {'canvas': list(src.size), 'box': [box[0], box[1], box[2] - box[0], box[3] - box[1]], 'frames': len(canv),
            'kind': 'forward' if (sq, k) in FWD else 'back', 'fps': 24}
    json.dump(info, open(os.path.join(od, 'anim.json'), 'w'), indent=1)
    summary.setdefault(f'man_purple_squad_{sq}', {})[f'soldier_{k}'] = {**info, 'kb': tot // 1024}
    print(f's{sq}_s{k}', info['kind'], info['box'], len(canv), 'frames', tot // 1024, 'KB')
json.dump(summary, open(os.path.join(DST, '_purple_hit_v1.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('總計', sum(len(v) for v in summary.values()), '人')
