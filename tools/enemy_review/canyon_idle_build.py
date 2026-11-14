# 卡耶爾「Kling 第 0 格生的 idle」接上 Kling 攻擊的預覽：把 idle 格逆換算回 Kling 影片座標，與去背後的 Kling 格放進同一張畫布
# 輸出：ComfyUI out/kling_idle_preview/<名>/（frame_NNN.webp，360×640）＋ tools/enemy_review/canyon_idle_data.json
import glob, json, os, subprocess, tempfile
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
TIVOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(os.path.dirname(TIVOT), 'ComfyUI-master', 'tivot_wan', 'out')
K = os.path.join(TIVOT, 'resources', 'enemy', '_neutral_refs', 'canyon_kf', 'kling')
crop = json.load(open(os.path.join(K, 'idle_src', 'crop.json'), encoding='utf-8'))
NAMES = {'coffin': '石棺甲蟲 A', 'crab': '骸殼蟹 D', 'pilgrim': '朝聖者團塊 M', 'wyrm': '喪鐘蠕蟲 A', 'iron': '鐵衣苦修者 D', 'ribcage': '肋籠獸 A', 'stilt': '高蹺細影 M'}
GW, GH, FIT, PS = 480, 720, 0.92, 0.5   # tivot_wan idle 的生成尺寸與 fit；預覽縮半


def key(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    al = 1 - np.clip((g - np.maximum(r, b) - 25) / 70, 0, 1)
    g2 = np.minimum(g, (r + b) / 2 + 6)
    return Image.fromarray(np.dstack([r, g2, b, al * 255]).clip(0, 255).astype(np.uint8))


rows = []
for n, m in crop.items():
    VW, VH = m['video_size']; box = m['crop']
    src = Image.open(os.path.join(K, 'idle_src', f'{n}_kling0.png')).convert('RGBA')
    bb = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    w, h = bb[2] - bb[0], bb[3] - bb[1]; s = min(GW * FIT / w, GH * FIT / h)
    iw, ih = max(1, round(w * s)), max(1, round(h * s)); px, py = (GW - iw) // 2, round((GH - ih) * 0.5)
    ox, oy = box[0] + bb[0] - px / s, box[1] + bb[1] - py / s     # idle 格左上角 → 影片座標
    idle = sorted(glob.glob(os.path.join(OUT, 'kling_idle', f'{n}_kling0', 'frame_*.webp')))
    od = os.path.join(OUT, 'kling_idle_preview', n); os.makedirs(od, exist_ok=True)
    for f in glob.glob(os.path.join(od, '*.webp')): os.remove(f)
    CW, CH = round(VW * PS), round(VH * PS); frames, durs, k = [], [], 0

    def put(im, x, y, sc, ms):
        global k
        c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); t = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
        c.alpha_composite(t, (round(x), round(y))) if x >= 0 and y >= 0 else c.paste(t, (round(x), round(y)), t)
        fn = f'frame_{len(frames):03d}.webp'; c.save(os.path.join(od, fn), 'WEBP', quality=80); frames.append(fn); durs.append(ms)

    for rep in range(2):
        for f in idle: put(Image.open(f).convert('RGBA'), ox * PS, oy * PS, PS / s, 1000 / 16)
    n_idle = len(frames)
    tmp = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(K, m['video']), os.path.join(tmp, 'f_%03d.png')], check=True)
    for f in sorted(glob.glob(os.path.join(tmp, 'f_*.png'))):
        put(key(np.asarray(Image.open(f).convert('RGB')).astype(np.float32)), 0, 0, PS, 1000 / 24)
    rows.append({'id': n, 'name': NAMES[n], 'dir': 'kling_idle_preview/' + n, 'frames': frames, 'durs': durs, 'nIdle': n_idle,
                 'idleDir': f'kling_idle/{n}_kling0', 'idleFrames': [os.path.basename(f) for f in idle]})
    print(n, len(frames), 'idle', n_idle)
json.dump({'rows': rows}, open(os.path.join(HERE, 'canyon_idle_data.json'), 'w', encoding='utf-8'), ensure_ascii=False)
