"""自動選格（初剪）：把 Wan 的等速原片剪成「日式 TV 動畫」的停格節奏，給 Ray 在 animechk 修。

⭐ 預設 --style ray：Ray 的剪法（頓→衝跳格→頓→之後 ×1 帶過，約 1.4~1.5 倍速），見程式內註解。
舊規則 --style even（參考 resources/ci/layers/_ref_timing_DemVAMPS.md；方法參考筑波大學 2013 Motion Frame Omission：快的中抜き、微動凍結）：
  · 量每一格與前一格的變化量 m(i)（縮圖平均像素差），以中位數正規化成速度 v(i)
  · 一般 → 2 格一張；慢（v<0.55）→ 3 格一張；幾乎不動（v<0.25）→ 4 格一張
  · 最快的那一下（v 為全片最大且 >1.6）→ 那一張只停 1 格（單張速度模糊格）
  · 重拍：快動作（v>1.3）之後變化量驟降（<峰值 45%）的那一格 ＝ 姿勢落定 → 選它、停 3 格
  · 最後一張停 3 格以上（補滿總長）
  · 總長＝原片秒數（--dur 可改）；輸出 24fps（--fps）
時間對應：輸出第 t 格對應原片 t × src_fps / out_fps；每一張圖取它開始那一刻的原片格（重拍會吸附到落定格）。

輸出：<out>/frame_NN.webp（只放選中的圖，每張一份）＋ holds.json（每張停幾格）＋ export.json（kept_index／holds，與 animechk 輸出同格式）
      animechk 打開時會把 holds.json 當預設停格；Ray 改完按「⬇ 輸出」就是展開後的完整 24fps 序列。

用法：python auto_cut.py <原片格資料夾 frame_*.webp> <輸出資料夾> [--src-fps 16] [--fps 24] [--dur 秒] [--region x0 y0 x1 y1]
      --region：只用這一塊算變化量（例如只看人物、不看特效），座標是 0~1 比例
"""
import argparse, glob, json, os, shutil
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--src-fps', type=float, default=16); ap.add_argument('--fps', type=float, default=24)
ap.add_argument('--dur', type=float, default=0); ap.add_argument('--region', type=float, nargs=4)
ap.add_argument('--style', default='ray', choices=['ray', 'even'], help='ray＝Ray 的頓衝頓剪法（預設）；even＝舊的等速規則')
a = ap.parse_args()

fs = sorted(glob.glob(os.path.join(a.src, 'frame_*.webp'))) or sorted(glob.glob(os.path.join(a.src, 'frame_*.png')))
N = len(fs)
def load(p):
    im = Image.open(p).convert('RGBA'); bg = Image.new('RGBA', im.size, (0, 0, 0, 255)); bg.alpha_composite(im)
    x = np.asarray(bg.convert('RGB').resize((96, 144))).astype(np.float32)
    if a.region:
        x0, y0, x1, y1 = a.region; h, w = x.shape[:2]; x = x[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]
    return x
X = [load(p) for p in fs]
m = np.array([0.0] + [np.abs(X[i] - X[i - 1]).mean() for i in range(1, N)])
# 平滑一點（Wan 的變化量逐格會跳）：3 格移動平均
ms = np.convolve(np.pad(m, 1, mode='edge'), np.ones(3) / 3, mode='valid')
med = float(np.median(ms[1:])) or 1.0
v = ms / med

# 重拍（落定格）：快動作之後變化量驟降
accents = set()
for i in range(2, N - 1):
    peak = max(v[max(1, i - 4):i])
    if peak > 1.3 and v[i] < 0.45 * peak and v[i] <= v[i + 1]:
        accents.add(i)
# 單張速度模糊格：全片最快那一格
fastest = int(np.argmax(v)) if v.max() > 1.6 else -1

dur = a.dur or N / a.src_fps
T = int(round(dur * a.fps))
plan = []                 # [[原片格, 停幾格]]
if a.style == 'ray':
    # ⭐ Ray 的剪法（2026-10-09 Bullet Rain 盲測歸納）：頓 → 衝（跳格）→ 頓 → 之後 ×1 一路帶（約 1.4～1.5 倍速）
    r = m / (m.max() or 1)
    act = [i for i in range(1, N) if r[i] > 0.3]
    a0, a1 = (act[0], act[-1]) if act else (1, 1)
    p = int(np.argmax(m))                                   # 到位格（變化量最大＝甩到定位／速度模糊）
    lm = [i for i in range(a0 + 1, p) if m[i] >= m[i - 1] and m[i] >= m[i + 1]]   # 到位前第一個局部峰＝最快那一下
    q = lm[0] if lm else max(a0 + 2, p - 3)
    seq = []
    seq += [(i, 1) for i in range(0, max(0, q - 2))]          # 起手 ×1
    seq += [(i, 2) for i in range(max(0, q - 2), q)]          # 蓄力 2 張 ×2（頓）
    seq += [(i, 1) for i in range(q + 2, p)]                  # 跳掉 q、q+1（中抜き），到位前 ×1
    seq += [(i, 2) for i in (p, p + 1) if i < N]              # 到位 2 張 ×2（頓）
    nxt = min(N, p + 2)
    t = sum(h for _, h in seq)
    while t > T and seq: seq.pop(); t = sum(h for _, h in seq)
    while t < T and nxt < N: seq.append((nxt, 1)); nxt += 1; t += 1   # 之後 ×1
    if t < T and seq: s, h = seq[-1]; seq[-1] = (s, h + T - t)
    plan = [list(x) for x in seq]
else:
  t = 0
  while t < T:
    s = min(N - 1, int(round(t * a.src_fps / a.fps)))
    for d in (0, 1, -1):
        if 0 <= s + d < N and (s + d) in accents and (not plan or s + d > plan[-1][0]): s = s + d; break
    if plan and s <= plan[-1][0]:
        s = plan[-1][0] + 1
        if s >= N: break
    sp = v[s]
    if s in accents: h = 3
    elif s == fastest: h = 1
    elif sp < 0.25: h = 4
    elif sp < 0.55: h = 3
    else: h = 2
    h = min(h, T - t)
    plan.append([s, h]); t += h
  if plan and plan[-1][1] < 3 and len(plan) > 1:
    need = 3 - plan[-1][1]
    for k in range(len(plan) - 2, -1, -1):
        take = min(need, plan[k][1] - 1)
        if take > 0: plan[k][1] -= take; plan[-1][1] += take; need -= take
        if need == 0: break
  if t < T and plan: plan[-1][1] += T - t

os.makedirs(a.out, exist_ok=True)
for f in glob.glob(os.path.join(a.out, 'frame_*')): os.remove(f)
for k, (s, h) in enumerate(plan):
    ext = os.path.splitext(fs[s])[1]; shutil.copy(fs[s], os.path.join(a.out, f'frame_{k:02d}{ext}'))
holds = [h for _, h in plan]
json.dump({'holds': holds, 'fps': a.fps}, open(os.path.join(a.out, 'holds.json'), 'w'))
json.dump({'from': a.src, 'kept_index': [s for s, _ in plan], 'holds': holds, 'fps': a.fps,
           'accents': sorted(accents), 'smear': fastest, 'note': 'auto_cut.py 初剪'},
          open(os.path.join(a.out, 'export.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{N} 格 → {len(plan)} 張、{sum(holds)} 格 @{a.fps:g}fps（{sum(holds) / a.fps:.2f} 秒）')
print('原片格:', [s for s, _ in plan]); print('停格  :', holds); print('重拍:', sorted(accents), ' 速度模糊格:', fastest)
