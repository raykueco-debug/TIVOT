"""在「已剪好的人物序列」周圍用 VACE 生成特效，特效跟著人物的時間走（Ray：「紫燄要從她身上冒出」）。
人物像素每格照抄（mask 0），但輪廓往內收 --edge 像素那一圈放開（mask 1），火焰才能從身上長出來；人物以外全部生成。
control：人物貼在純黑上（輪廓那一圈與外面填灰）。

序列：人物資料夾的格（去背 RGBA，原始 480×720 生成空間）依 holds 展開，最後一張停到 --length 格。
用法：python tivot_vace_fx.py <人物格資料夾> --holds <export.json> --length 49 --name xxx --prompt "…" [--edge 6]
輸出：out/vace/<name>_s<seed>/frame_NN.webp（完整畫面：黑底＋人物＋特效，不去背）＋ char_alpha/（每格人物 alpha，之後拆層用）
"""
import os, sys, json, glob, argparse
import numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import tivot_wan as tw, tivot_vace as tv
ap = argparse.ArgumentParser()
ap.add_argument('char'); ap.add_argument('--holds'); ap.add_argument('--length', type=int, default=49)
ap.add_argument('--edge', type=int, default=6); ap.add_argument('--seed', type=int, default=7); ap.add_argument('--name', default='fx')
ap.add_argument('--prompt', required=True); ap.add_argument('--steps', type=int, default=4); ap.add_argument('--cfg', type=float, default=1.0)
ap.add_argument('--shift', type=float, default=5.0); ap.add_argument('--strength', type=float, default=1.0)
ap.add_argument('--pre', type=int, default=0); ap.add_argument('--pre-cfg', type=float, default=3.0); ap.add_argument('--hi-end', type=int, default=0); ap.add_argument('--neg-extra', default='')
ap.add_argument('--lora-high', default='wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors')
ap.add_argument('--lora-low', default='wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors')
ap.add_argument('--out', default=os.path.join(HERE, 'out', 'vace'))
ap.add_argument('--fx-ref', help='特效參考圖（黑底火焰，整張畫面）：人物外面的 control 不填灰、改填它（乘上強度曲線）＝給 VACE 結構提示，不然 cfg=1 下它只會畫空背景')
ap.add_argument('--fx-keys', type=int, nargs='*', help='只有這幾格給特效參考，其餘人物外面填灰（讓 VACE 自己動，不會被參考圖釘死）')
ap.add_argument('--silhouette', type=float, default=0, help='⭐ 剪影模式：不給人物細節，只把人物剪影填成這個亮度的紫光（0~1），整張都生成 ⇒ 純特效層、火焰可以蓋在身上、跟著剪影的時間走')
ap.add_argument('--ellipse', type=float, nargs=4, help='⭐ 範圍模式（Ray：不要遮罩，大概指定一個範圍）：cx cy rx ry 的橢圓填淡紫光當提示，整張生成；不看人物形狀')
ap.add_argument('--halo-keys', type=int, nargs='*', help='⭐ 鎖人物模式＋這幾格在人物外面給「全身淡紫光暈」當起點（照該格人物的剪影現算），其餘格人物外面填灰讓 Wan 自己往上帶')
ap.add_argument('--wisps', type=int, default=0, help='⭐ 氣流導引：在人物輪廓上撒 N 條往上飄的紫色氣流線（每格往上移），當 VACE 的 control（它會照這個動作畫成動漫氣流）')
ap.add_argument('--wisp-speed', type=float, default=9, help='氣流每格上升幾 px')
ap.add_argument('--fx-video', help='⭐ 特效動態導引：一個特效影片的格資料夾（黑底），每格人物外面填它的對應格（會動 ⇒ VACE 照著動、不會像單張參考圖那樣被釘死）')
ap.add_argument('--fx-video-gain', type=float, default=1.0)
ap.add_argument('--ramp', type=float, nargs=3, default=[0.15, 1.0, 5], help='特效強度：起始、最終、第幾格到最終（之間線性）')
a = ap.parse_args()
if (a.length - 1) % 4: sys.exit('length 必須 4n+1')
fs = sorted(glob.glob(os.path.join(a.char, 'frame_*.webp')))
hs = json.load(open(a.holds, encoding='utf-8'))['holds'] if a.holds else [1] * len(fs)
seq = [fs[k] for k, h in enumerate(hs) for _ in range(h)]
seq = (seq + [seq[-1]] * a.length)[:a.length]
tag = f'{a.name}_s{a.seed}'; inp = os.path.join(tw.COMFY, 'input'); od = os.path.join(a.out, tag)
os.makedirs(os.path.join(od, 'char_alpha'), exist_ok=True)
ctrl, mask, cache = [], [], {}
FXV = sorted(glob.glob(os.path.join(a.fx_video, 'frame_*.webp'))) if a.fx_video else []
rng = np.random.default_rng(3); WISPS = []
def wisp_layer(al, t):
    # 從人物輪廓上的點出發、往上飄、左右擺動、越高越淡的氣流線（每條有自己的出生時間，循環）
    global WISPS
    if not WISPS:
        edge = cv2.Canny((al > 0.5).astype(np.uint8) * 255, 50, 150); ys, xs = np.nonzero(edge)
        idx = rng.choice(len(xs), a.wisps, replace=False)
        WISPS = [dict(x=float(xs[i]), y=float(ys[i]), ph=rng.uniform(0, 6.28), born=rng.uniform(-40, 0), life=rng.uniform(26, 44),
                      amp=rng.uniform(10, 26), ln=rng.uniform(50, 110), w=rng.uniform(3, 7)) for i in idx]
    L = np.zeros((tw.H, tw.W), np.float32)
    for w in WISPS:
        age = (t - w['born']) % w['life']; f = age / w['life']
        y0 = w['y'] - age * a.wisp_speed; pts = []
        for k in range(12):
            yy = y0 - k * w['ln'] / 11; xx = w['x'] + w['amp'] * np.sin(w['ph'] + yy * 0.035 + t * 0.15)
            pts.append((xx, yy))
        pts = np.array(pts, np.int32).reshape(-1, 1, 2)
        cv2.polylines(L, [pts], False, float(np.sin(np.pi * f)), int(w['w']), cv2.LINE_AA)
    return cv2.GaussianBlur(L, (0, 0), 4)
fxr = np.asarray(Image.open(a.fx_ref).convert('RGB').resize((tw.W, tw.H), Image.LANCZOS)).astype(np.float32) if a.fx_ref else None
def ramp(t):
    s0, s1, n = a.ramp; return s1 if t >= n else s0 + (s1 - s0) * t / max(1, n)
for t, f in enumerate(seq):
    use_fx = fxr is not None and (a.fx_keys is None or t in a.fx_keys)
    key = ('w', t) if (a.wisps or FXV) else (f, round(ramp(t), 3)) if use_fx else ((f, 'halo', t) if (a.halo_keys is not None and t in a.halo_keys) else f)
    if key not in cache:
        im = Image.open(f).convert('RGBA').resize((tw.W, tw.H), Image.LANCZOS); x = np.asarray(im).astype(np.float32)
        al = x[..., 3] / 255.; keep = (al > 0.5).astype(np.uint8)
        core = cv2.erode(keep, np.ones((a.edge * 2 + 1, a.edge * 2 + 1), np.uint8))     # 輪廓往內收：邊緣一圈放開給火焰
        outside = fxr * ramp(t) if use_fx else np.full((tw.H, tw.W, 3), 128, np.float32)
        if FXV:
            fv = FXV[min(len(FXV) - 1, int(t * len(FXV) / a.length))]
            outside = np.asarray(Image.open(fv).convert('RGB').resize((tw.W, tw.H), Image.LANCZOS)).astype(np.float32) * a.fx_video_gain
        if a.wisps:
            g = np.clip(wisp_layer(al, t) + (cv2.GaussianBlur(al, (0, 0), 9) - al * 0.6).clip(0, 1) * 0.35, 0, 1)
            outside = np.dstack([g * 170, g * 90, g * 255])
        if a.halo_keys is not None and t in a.halo_keys:
            halo = cv2.GaussianBlur(al, (0, 0), 9) - al * 0.6; up = np.zeros_like(halo)
            for dy in range(0, 30, 3): up = np.maximum(up, np.roll(halo, -dy, axis=0) * (1 - dy / 35))
            g = np.clip(up, 0, 1) * 0.75; outside = np.dstack([g * 158, g * 82, g * 255])
            key = (f, 'halo', t)
        if a.ellipse:
            cx, cy, rx, ry = a.ellipse; yy, xx = np.mgrid[0:tw.H, 0:tw.W].astype(np.float32)
            g = np.clip(1 - np.hypot((xx - cx) / rx, (yy - cy) / ry), 0, 1) ** 0.7 * (a.silhouette or 0.4)
            c = np.dstack([g * 170, g * 90, g * 255]); core = np.zeros_like(core)
        elif a.silhouette:
            g = cv2.GaussianBlur(al, (0, 0), 3) * a.silhouette * (ramp(t) if a.fx_keys is None and fxr is None else 1)
            c = np.dstack([g * 170, g * 90, g * 255]) + (fxr * ramp(t) if use_fx else 0)    # 黑底＋紫色剪影光
            core = np.zeros_like(core)                                                     # 整張都生成
        else:
            c = np.where(core[..., None] > 0, x[..., :3] * al[..., None], outside)
        k = len(cache); cn, mn = f'vfx_{tag}_c{k:02d}.png', f'vfx_{tag}_m{k:02d}.png'
        Image.fromarray(c.clip(0, 255).astype(np.uint8)).save(os.path.join(inp, cn))
        Image.fromarray(((1 - core) * 255).astype(np.uint8)).convert('RGB').save(os.path.join(inp, mn))
        cache[key] = (cn, mn, (al * 255).astype(np.uint8))
    cn, mn, al8 = cache[key]; ctrl.append(cn); mask.append(mn)
    Image.fromarray(al8).save(os.path.join(od, 'char_alpha', f'a_{t:02d}.png'))
tw.ensure_server()
print(f'▶ {tag}  length={a.length}  人物 {len(hs)} 張（holds {hs}）', flush=True)
paths, secs = tv.run(tv.graph(ctrl, mask, a.length, a.prompt, a.seed, f'tivotvace/{tag}', a))
for j, p in enumerate(paths):
    Image.open(p).convert('RGB').save(os.path.join(od, f'frame_{j:02d}.webp'), 'WEBP', quality=92)
json.dump({'name': tag, 'char': a.char, 'holds': hs, 'length': a.length, 'edge': a.edge, 'seed': a.seed, 'wan_seconds': round(secs), 'prompt': a.prompt},
          open(os.path.join(od, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'  ✔ {len(paths)} 格，VACE {round(secs)} 秒 → {od}', flush=True)
