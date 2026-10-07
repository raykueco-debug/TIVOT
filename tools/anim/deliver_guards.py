# 衛士／親衛隊中槍 → 原圖畫布座標。第 1 格＝遊戲原本的分層（不另交），交第 7、9、11、13、15 格（1 起算）
import glob, json, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); G = os.path.join(HERE, 'out', 'guards'); IN = os.path.join(HERE, 'in_guards')
T = r'C:\Users\Ray Ku\Desktop\TIVOT\resources'
PICK = [6, 8, 10, 12, 14]; W, H = 480, 720; summary = {}
for d in sorted(glob.glob(os.path.join(G, '*_guard_*'))):
    name = os.path.basename(d)
    if name.endswith('_8f') or not os.path.exists(os.path.join(d, 'meta.json')): continue
    sc, n = name.split('_guard_')
    src = Image.open(os.path.join(IN, name + '.png')).convert('RGBA')
    bb = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox(); w, h = bb[2] - bb[0], bb[3] - bb[1]
    s = min(W * 0.86 / w, H * 0.86 / h); w2, h2 = round(w * s), round(h * s); ox, oy = (W - w2) // 2, H - h2 - int(H * 0.05)
    canv = []
    for i in PICK:
        f = Image.open(os.path.join(d, f'frame_{i:02d}.webp')).convert('RGBA'); big = f.resize((round(W / s), round(H / s)), Image.LANCZOS)
        c = Image.new('RGBA', src.size, (0, 0, 0, 0)); c.paste(big, (round(bb[0] - ox / s), round(bb[1] - oy / s)), big); canv.append(c)
    box = None
    for c in canv:
        b = c.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        if b: box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    root = os.path.join(T, 'enemy', 'anim', 'man_misha_guards_hit_v1') if sc == 'misha' else os.path.join(T, 'background', 'capital', f'fight_{sc}_hit_v1')
    od = os.path.join(root, f'guard_{n}'); os.makedirs(od, exist_ok=True); tot = 0
    for j, c in enumerate(canv):
        p = os.path.join(od, f'frame_{j:02d}.webp'); c.crop(box).save(p, 'WEBP', quality=85, alpha_quality=90, method=6); tot += os.path.getsize(p)
    kind = 'forward' if 'forward' in json.load(open(os.path.join(d, 'meta.json'), encoding='utf-8'))['prompt'] else 'back'
    info = {'canvas': list(src.size), 'box': [box[0], box[1], box[2] - box[0], box[3] - box[1]], 'frames': 5, 'kind': kind,
            'note': '第 1 格先顯示原本的分層，再播這 5 格（原片第 7/9/11/13/15 格）'}
    json.dump(info, open(os.path.join(od, 'anim.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    summary[os.path.relpath(root, T).replace(os.sep, '/') + f'/guard_{n}'] = {**info, 'kb': tot // 1024}
    print(name, kind, info['box'], tot // 1024, 'KB')
json.dump(summary, open(os.path.join(T, 'enemy', 'anim', '_guards_hit_v1.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
