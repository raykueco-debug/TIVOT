# 卡耶爾 I／A／I+A 檢視頁的資料（Ray 11-15：「檢視頁要AI跟A+I都放上」）
# · I＝Kling 第 0 格生的 Wan idle（逆換算回 Kling 影片座標，與 A 同一張畫布）；飛行型（聖面鷲、骨鴉）只有 I
# · A＝Kling 攻擊（去綠幕）；喪鐘蠕蟲、朝聖者團塊另有「鎖體積」版（lock_scale.py，固定點＝腳底中心）
# · 兩種模式：raw（原片：idle 16fps、Kling 24fps）／cut（快剪：auto_cut 的 holds）
# · R：鐵衣苦修者＝倒放（Ray 11-15）；其餘未定 ⇒ I+A 連播是 I→A→（R）→I
# 輸出：ComfyUI out/canyon_prev/<模式>/<名>/I_###.webp、A_###.webp（360×640）＋ canyon_idle_data.json
import glob, json, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
TIVOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(os.path.dirname(TIVOT), 'ComfyUI-master', 'tivot_wan', 'out')
K = os.path.join(TIVOT, 'resources', 'enemy', '_neutral_refs', 'canyon_kf', 'kling')
crop = json.load(open(os.path.join(K, 'idle_src', 'crop.json'), encoding='utf-8'))
NAMES = {'coffin': '石棺甲蟲 A', 'crab': '骸殼蟹 D', 'pilgrim': '朝聖者團塊 M', 'wyrm': '喪鐘蠕蟲 A', 'iron': '鐵衣苦修者 D',
         'ribcage': '肋籠獸 A', 'stilt': '高蹺細影 M', 'vulture': '聖面鷲（飛行）', 'crow': '骨鴉（飛行）'}
R = {'iron': 'reverse'}
LOCK = {'wyrm', 'pilgrim'}
FLY = {'vulture': 'mon_canyon_saintvulture_dark', 'crow': 'mon_canyon_bonecrow_dark'}
GW, GH, PS = 480, 720, 0.5


def holds(d):
    h = json.load(open(os.path.join(d, 'holds.json')))
    fs = sorted(glob.glob(os.path.join(d, 'frame_*.webp')))
    return [(f, k * 1000 / h.get('fps', 24)) for f, k in zip(fs, h['holds'])]


def render(items, d, tag, place):
    out = []
    for i, (f, ms) in enumerate(items):
        fn = f'{tag}_{i:03d}.webp'; place(Image.open(f).convert('RGBA')).save(os.path.join(d, fn), 'WEBP', quality=80); out.append([fn, round(ms, 1)])
    return out


def run_auto(src, dst, extra=()):
    if not os.path.exists(os.path.join(OUT, dst, 'holds.json')):
        import subprocess
        subprocess.run([os.path.join(OUT, '..', '..', '.venv', 'Scripts', 'python.exe'), '-X', 'utf8', os.path.join(OUT, '..', 'auto_cut.py'),
                        os.path.join(OUT, src), os.path.join(OUT, dst), '--src-fps', '16', *extra], env={**os.environ, 'PYTHONIOENCODING': 'utf-8'}, capture_output=True)
    return holds(os.path.join(OUT, dst))


rows = []
for n in list(crop) + [k for k in FLY if os.path.exists(os.path.join(OUT, 'kling_idle', FLY[k], 'meta.json'))]:
    if n in FLY:
        idir = os.path.join(OUT, 'kling_idle', FLY[n]); CW, CH = round(GW * 1.5 * PS), round(GH * 1.5 * PS)   # 飛行型：沒有 Kling 片，畫布＝idle 生成畫布
        placeI = lambda im: im.resize((CW, CH), Image.LANCZOS); m = None
    else:
        m = crop[n]; VW, VH = m['video_size']; box = m['crop']; CW, CH = round(VW * PS), round(VH * PS)
        src = Image.open(os.path.join(K, 'idle_src', f'{n}_kling0.png')).convert('RGBA')
        bb = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        w, h = bb[2] - bb[0], bb[3] - bb[1]; s = min(GW * 0.92 / w, GH * 0.92 / h)
        iw, ih = max(1, round(w * s)), max(1, round(h * s)); px, py = (GW - iw) // 2, round((GH - ih) * 0.5)
        ox, oy = box[0] + bb[0] - px / s, box[1] + bb[1] - py / s
        idir = os.path.join(OUT, 'kling_idle', f'{n}_kling0')

        def placeI(im, ox=ox, oy=oy, s=s, CW=CW, CH=CH):
            c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); t = im.resize((round(im.width * PS / s), round(im.height * PS / s)), Image.LANCZOS)
            c.paste(t, (round(ox * PS), round(oy * PS)), t); return c
    placeA = lambda im, CW=CW, CH=CH: im.resize((CW, CH), Image.LANCZOS)
    row = {'id': n, 'name': NAMES[n], 'R': R.get(n), 'modes': {}}
    iraw = [(f, 62.5) for f in sorted(glob.glob(os.path.join(idir, 'frame_*.webp')))]
    icut = run_auto(os.path.relpath(idir, OUT), f'auto/kling_{n}_idle' if n not in FLY else f'auto/{FLY[n]}_idle', ('--dur', '2.0'))
    variants = [('', 'kling_atk', 'kling_{}_atk')] + ([('_lock', 'kling_atk_lock', 'kling_{}_atklock')] if n in LOCK else [])
    for mode in ('raw', 'cut'):
        d = os.path.join(OUT, 'canyon_prev', mode, n); os.makedirs(d, exist_ok=True)
        for f in glob.glob(os.path.join(d, '*.webp')): os.remove(f)
        md = {'dir': f'canyon_prev/{mode}/{n}', 'I': render(iraw if mode == 'raw' else icut, d, 'I', placeI), 'A': {}}
        if n not in FLY:
            for suf, rawdir, cutdir in variants:
                items = [(f, 1000 / 24) for f in sorted(glob.glob(os.path.join(OUT, rawdir, n, 'frame_*.webp')))] if mode == 'raw' else holds(os.path.join(OUT, 'auto', cutdir.format(n)))
                md['A'][suf or 'orig'] = render(items, d, 'A' + suf, placeA)
        row['modes'][mode] = md
    rows.append(row); print(n, {k: (len(v['I']), {a: len(b) for a, b in v['A'].items()}) for k, v in row['modes'].items()})
json.dump({'rows': rows}, open(os.path.join(HERE, 'canyon_idle_data.json'), 'w', encoding='utf-8'), ensure_ascii=False)
