# KF 第二輪交件（11-10）：Ray 剪的那一段＋另一段「照同樣剪法」→ 同一生成空間首尾相接 → 轉回遊戲立繪畫布，交 webp＋anim.json
# 用法：python deliver_kf2.py <name> <立繪> <dst資料夾> <cut段 AB|BA>
#  · Wan 輸入（redo/wan/<name>_A.png）＝立繪原尺寸貼在對齊畫布上（kf_align_ab：A 不縮放），所以「生成空間→立繪」＝ to_green 的逆變換＋一個平移
#  · 平移由兩張 alpha>128 的 bbox 左上角求（同尺寸才成立，會先檢查）
#  · 另一段的剪法：把 Ray 那一段的 kept/holds 套到另一段的格數上（超出的截掉、不足的照週期往後補），最後一格一定保留（收回段要回到中立／撲出段要打到 B）
#  · 接點：AB 最後一格＝B＝BA 第 0 格，只留一張
import json, os, sys
from PIL import Image
name, portrait, dst, cutseg = sys.argv[1:5]
FIT = 0.78; FPS = 24; PAD = 600
WAN = r'C:\Users\Ray Ku\Desktop\ComfyUI-master\tivot_wan\out'
REDO = os.path.join(os.path.dirname(__file__), '..', '..', 'resources', 'enemy', '_neutral_refs', 's3_kf', 'redo')
raw = {'AB': os.path.join(WAN, 'kf2', f'{name}_A_AB'), 'BA': os.path.join(WAN, 'kf2', f'{name}_B_BA')}
cut = json.load(open(os.path.join(WAN, 'export', f'{name}_{"A" if cutseg == "AB" else "B"}_{cutseg}_cut', 'export.json'), encoding='utf-8'))
W, H = Image.open(os.path.join(raw['AB'], 'frame_00.webp')).size   # 輸出格的尺寸（生成尺寸等比縮過；fit 的換算與尺度無關）
nraw = {k: len([f for f in os.listdir(v) if f.startswith('frame_')]) for k, v in raw.items()}

def apply(kept, holds, n):
    K, Hd = [], []
    if kept[-1] < n - 1:   # 另一段比較長：照「最後一個週期」往後補
        per = kept[-1]
        i = 0
        while True:
            for k, h in zip(kept[1:], holds[1:]):
                v = k + per * (i + 1)
                if v >= n: break
                K.append(v); Hd.append(h)
            else:
                i += 1; continue
            break
        K = kept + K; Hd = holds + Hd
    else:
        for k, h in zip(kept, holds):
            if k < n: K.append(k); Hd.append(h)
    if K[-1] != n - 1: K.append(n - 1); Hd.append(1)
    return K, Hd

other = 'BA' if cutseg == 'AB' else 'AB'
seg = {cutseg: (cut['kept_index'], cut['holds']), other: apply(cut['kept_index'], cut['holds'], nraw[other])}
print(name, {k: v[0] for k, v in seg.items()})

wanA = Image.open(os.path.join(REDO, 'wan', f'{name}_A.png')).convert('RGBA')
por = Image.open(portrait).convert('RGBA')
bbw = wanA.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
bbp = por.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
assert (bbw[2] - bbw[0], bbw[3] - bbw[1]) == (bbp[2] - bbp[0], bbp[3] - bbp[1]), (bbw, bbp)
dx, dy = bbp[0] - bbw[0], bbp[1] - bbw[1]   # 對齊畫布 → 立繪
s = min(W * FIT / wanA.width, H * FIT / wanA.height); w2, h2 = round(wanA.width * s), round(wanA.height * s)
ox, oy = (W - w2) // 2, round((H - h2) * 0.5)

seq = []   # (檔案, 是否打到)
for k in ('AB', 'BA'):
    K, Hd = seg[k]
    for j, (i, h) in enumerate(zip(K, Hd)):
        if k == 'BA' and j == 0: continue   # 接點只留一張
        seq += [os.path.join(raw[k], f'frame_{i:02d}.webp')] * h
hit = sum(h for h in seg['AB'][1]) - 1

# 程式端版（同 deliver_idle_lite）：格子不放大回立繪解析度，在生成座標裁聯集框、原尺寸存；box 換算回立繪畫布、px＝實際像素
fr = [Image.open(p).convert('RGBA') for p in seq]
assert all(f.size == (W, H) for f in fr)
fb = None
for f in fr:
    b = f.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if b: fb = b if fb is None else (min(fb[0], b[0]), min(fb[1], b[1]), max(fb[2], b[2]), max(fb[3], b[3]))
os.makedirs(dst, exist_ok=True); tot = 0
for j, f in enumerate(fr):
    p = os.path.join(dst, f'frame_{j:02d}.webp'); f.crop(fb).save(p, 'WEBP', quality=85, alpha_quality=90, method=6); tot += os.path.getsize(p)
cw, ch = fb[2] - fb[0], fb[3] - fb[1]
box = [round(dx + (fb[0] - ox) / s), round(dy + (fb[1] - oy) / s), round(cw / s), round(ch / s)]
json.dump({'canvas': list(por.size), 'box': box, 'frames': len(fr), 'fps': FPS, 'loop': False, 'px': [cw, ch]},
          open(os.path.join(dst, 'anim.json'), 'w'), indent=1)
print(f'  {len(fr)} 格／{len(fr)/FPS:.2f} 秒，打到＝第 {hit} 格，box {box}，px {cw}x{ch}，{tot//1024} KB')
