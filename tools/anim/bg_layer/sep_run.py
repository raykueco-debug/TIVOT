"""背景線：雲與其他分開跑（Ray 11-11：「用預處理的圖做，草樹先不挖，把圖分成雲及其他下去給 Wan 跑，Wan 跑完再給程式合成雲上去」）。
每一格：
  1. 其他層＝GPT 預處理圖（天空／雲挖成洋紅）；洋紅那塊鋪回原圖的天空底色（平的縱向漸層，沒有任何雲）。
  2. 其他層交給 Wan 跑 ABCD（17 格 ×3 往前 ＋ D→A），提示詞不提雲；合成時天空那塊鎖成平的底色（--protect），Wan 碰不到。
  3. 程式雲（GPT 九宮格雲塊，只往前湧）＋ 其他層的循環（天空那塊挖掉）合成 → out/<base>_sep/loop.mp4。
雲從不經過 Wan ⇒ 不可能倒車。
用法：python sep_run.py <key>...（停：放 SEP_STOP 檔）"""
import re, os, sys, json, time, subprocess, hashlib
import numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import bg_queue as Q
import cloud_sprites as CS
LG = r'C:/Users/Ray Ku/Desktop/TIVOT/resources/background/_layers_gpt/out/'
DL = r'C:/Users/Ray Ku/Desktop/ComfyUI-master/tivot_wan/bg_layer/clouds/'   # 11-13：Downloads 被清空，雲九宮格改放這裡（由 cloudgrid_v2.png 預覽圖切回）
W, H = CS.W, CS.H
SEP_LOG = os.path.join(HERE, 'sep_run.log')


def log(*a):
    s = time.strftime('%m-%d %H:%M:%S ') + ' '.join(str(x) for x in a)
    open(SEP_LOG, 'a', encoding='utf8').write(s + '\n')
    try: print(s, flush=True)
    except Exception: pass


def stop(): return os.path.exists(os.path.join(HERE, 'SEP_STOP'))


def gpu_free():
    """Ray 11-13：「GPU 空出來」＝ Ray 的 Unity／遊戲沒開，而且 ComfyUI 連得上（Unity 佔著顯存時 Wan 會 OOM、ComfyUI 一直重開）。"""
    try:
        out = subprocess.run(['tasklist'], capture_output=True, text=True, errors='replace').stdout.lower()
        if 'questzombie.exe' in out: return False
        mem = int(subprocess.run(['nvidia-smi', '--query-gpu=memory.used', '--format=csv,noheader,nounits'], capture_output=True, text=True).stdout.split()[0])
        if mem > 3500: return False   # Unity 待機就佔 5.6 GB，Wan 會 OOM ⇒ 顯存要真的空
        import urllib.request; urllib.request.urlopen('http://127.0.0.1:8188/queue', timeout=3)
        return True
    except Exception:
        return False


def wait_gpu():
    if os.environ.get('SEP_NOWAIT'): return not stop()   # Ray 11-11：直接跑，不等 GPU 閒
    calm = 0
    while calm < 3:
        if stop(): return False
        if Q.gpu_util() < 10 and Q.queue_busy(8188, True) == 0 and gpu_free(): calm += 1
        else: calm = 0
        time.sleep(10)
    return True


def run(args):
    log('▶', ' '.join(os.path.basename(x) for x in args[1:4]))
    r = subprocess.run(args, cwd=HERE, env=Q.ENV, capture_output=True, text=True, encoding='utf8')
    if r.returncode: log('✘', (r.stderr or r.stdout)[-600:])
    return r.returncode == 0


def gpt_path(key):
    m = key.split('__')[0]
    for suf in ('__sky', '__cut'):
        p = LG + f'{m}/{key}{suf}.png'
        if os.path.exists(p): return p
    return None


def prep(key):
    """回傳（其他層＝天空鋪底色的圖, 天空 alpha, 天空底色圖, (天空上緣, 下緣), 地平線色）"""
    j = json.load(open(os.path.join(HERE, 'notes', key, 'notes.json'), encoding='utf8'))
    orig = np.array(Image.open(os.path.join(Q.BG, j['file'])).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
    g = np.array(Image.open(gpt_path(key)).convert('RGB').resize((W, H), Image.LANCZOS))
    _, fa = CS.key_magenta(g)                                     # 1＝不是洋紅（前景）
    sky_a = cv2.GaussianBlur(np.clip(((1 - fa) - 0.15) / 0.7, 0, 1), (0, 0), 1.0)
    m = sky_a > 0.5; ys = np.where(m.any(1))[0]
    yt, yb = (int(ys.min()), int(ys.max())) if len(ys) else (0, H // 3)
    yy = np.arange(H)[:, None]
    sk = orig[m]
    if len(sk) > 100:   # 底色＝原圖天空的藍（不是雲的白、也不是雲影的灰）：取天空裡藍色明顯的像素
        blue = m & (orig[..., 2] - orig[..., 0] > 14) & (orig[..., 2] - orig[..., 1] > 4)
        v = sk.max(1); dark = blue if blue.sum() > 200 else (m & (orig.max(2) < np.percentile(v, 45)))
        up = dark & (yy < yt + (yb - yt) * 0.4); lo = dark & (yy > yt + (yb - yt) * 0.6)
        top_c = np.median(orig[up], 0) if up.sum() > 50 else np.median(orig[dark], 0)
        hor_c = np.median(orig[lo], 0) if lo.sum() > 50 else top_c * 0.7 + 255 * 0.3 * np.array([0.85, 0.9, 1.0])
    else:
        top_c = np.array((130, 160, 200), np.float32); hor_c = np.array((200, 214, 230), np.float32)
    gg = np.clip((np.arange(H) - yt) / max(1, yb - yt), 0, 1)[:, None, None]
    sky = np.broadcast_to(top_c * (1 - gg) + hor_c * gg, (H, W, 3)).astype(np.float32)
    other = g.astype(np.float32) * (1 - sky_a[..., None]) + sky * sky_a[..., None]
    return other, sky_a, sky, (yt, yb), hor_c


ORIG = [None]


def tint(sprs, orig, sky_a):
    """Ray 11-11：「雲太藍了，色調不對」—— 雲塊照原圖天空裡的雲色重新上色：
    雲塊自己的明暗（亮度）對應到原圖天空的「暗部→亮部」兩色之間，色相全部來自原圖。"""
    m = sky_a > 0.5
    s = orig[m] if m.sum() > 500 else orig[:H // 4].reshape(-1, 3)
    L = s.mean(1); lo = np.median(s[L < np.percentile(L, 40)], 0); hi = np.median(s[L > np.percentile(L, 85)], 0)
    out = []
    for sp in sprs:
        a = sp[..., 3] > 20; l = sp[..., :3].mean(-1)
        p0, p1 = (np.percentile(l[a], 5), np.percentile(l[a], 98)) if a.any() else (0, 255)
        t = np.clip((l - p0) / max(1, p1 - p0), 0, 1)[..., None] ** 0.8
        out.append(np.dstack([lo * (1 - t) + hi * t, sp[..., 3:]]).astype(np.float32))
    return out


def clouds(sky_a, yb_yt, hor_c):
    yt, yb = yb_yt; m = sky_a > 0.5; xs = np.where(m.any(0))[0]
    x0, x1 = (int(xs.min()), int(xs.max())) if len(xs) else (0, W); sw = max(200, x1 - x0); hgt = max(80, yb - yt)
    V2 = tint(CS.cut_grid(DL + 'cloudgrid_v2_a.png') + CS.cut_grid(DL + 'cloudgrid_v2_b.png'), ORIG[0], sky_a)   # Ray 11-11：換成 GPT 新出的兩張灰白雲九宮格
    S_far = S_mid = S_near = V2
    hi = tint([np.full((2, 2, 4), 255, np.float32)], ORIG[0], sky_a)[0][0, 0, :3]
    fogc = lambda k: tuple(hi * (1 - k) + hor_c * k)
    xr = (x0 - sw * 0.15, x1 + sw * 0.15); k = max(1.0, sw / 500); sz = min(sw, 900)
    return [CS.Layer(S_far, 2, yb - hgt * 0.10, hgt * 0.30, int(6 * k), sz * 0.18, sz * 0.34, 70, 3, haze_col=hor_c, haze=0.30, fog_col=fogc(0.6), xr=xr, fog=0.4, keep_in=True, opa=0.8),
            CS.Layer(S_mid, 3, yb - hgt * 0.32, hgt * 0.50, int(5 * k), sz * 0.26, sz * 0.48, 54, 5, haze_col=hor_c, haze=0.12, fog_col=fogc(0.3), xr=xr, fog=0.0, keep_in=True, opa=0.8),
            CS.Layer(S_near, 4, yb - hgt * 0.58, hgt * 0.70, int(3 * k), sz * 0.38, sz * 0.66, 44, 7, fog_col=fogc(0.0), xr=xr, fog=0.0, keep_in=True, opa=0.8)]


def mwarp(key, still):
    """原圖 → GPT 預處理圖的對位（ECC 透視），存 npy 給 aba_comp 把 Ray 的註記遮罩搬過去。"""
    j = json.load(open(os.path.join(HERE, 'notes', key, 'notes.json'), encoding='utf8'))
    o = cv2.cvtColor(np.array(Image.open(os.path.join(Q.BG, j['file'])).convert('RGB').resize((768, 512))), cv2.COLOR_RGB2GRAY).astype(np.float32)
    g = cv2.cvtColor(np.array(Image.open(still).convert('RGB').resize((768, 512))), cv2.COLOR_RGB2GRAY).astype(np.float32)
    w = np.eye(3, dtype=np.float32)
    try: _, w = cv2.findTransformECC(o, g, w, cv2.MOTION_HOMOGRAPHY, (3, 200, 1e-5), None, 5)
    except Exception: w = np.eye(3, dtype=np.float32)
    S = np.diag([W / 768, H / 512, 1.0]); M = S @ w.astype(np.float64) @ np.linalg.inv(S)
    p = os.path.join(os.path.dirname(still), 'mwarp.npy'); np.save(p, M); return p


SEGS = tuple(os.environ.get('SEP_SEGS', 'ab,bc,cd').split(','))
if os.environ.get('SEP_LEN'): Q.SEG = int(os.environ['SEP_LEN'])   # Ray 11-11：段長可縮（9 格）


def comp_fg(key, still, prot, pre):
    """Ray 11-11：「只有布在飄才對」—— 只有 Ray 註記的範圍（布）取 Wan 的像素，其餘一律靜止（＝F 版的作法），天空鎖底色。"""
    _, move, sky = Q.plan(key); base = key.replace('__', '_')
    if os.environ.get('SEP_WHOLE'):   # Ray 11-11：「分成雲跟其他兩個就好」—— 其他層整張用 Wan，不用遮罩拼（拼起來就是 inpaint 失誤）
        return run([Q.PY, 'aba_comp.py', still, key, '-', '0', '-', base + '_sepfg', '--chain', ','.join(pre[s] for s in SEGS + ('da',)), '--full', '--nosky'])
    mw = mwarp(key, still); M = np.load(mw)
    # 保護區＝天空 ∪ Ray 的「不要動」（notes 的 opts.protect，搬到 GPT 圖座標）
    P = np.array(Image.open(prot).convert('L')) > 127
    j = json.load(open(os.path.join(HERE, 'notes', key, 'notes.json'), encoding='utf8')); pp = (j.get('opts') or {}).get('protect')
    if pp and os.path.exists(os.path.join(HERE, 'notes', key, pp)):
        q = np.array(Image.open(os.path.join(HERE, 'notes', key, pp)).convert('L').resize((W, H))).astype(np.float32)
        P |= cv2.warpPerspective(q, M, (W, H)) > 127
    pall = os.path.join(os.path.dirname(still), 'protect_all.png'); Image.fromarray(P.astype(np.uint8) * 255).save(pall)
    args = [Q.PY, 'aba_comp.py', still, key, '-', '0', '-', base + '_sepfg', '--chain', ','.join(pre[s] for s in SEGS + ('da',)),
            '--protect', pall, '--mwarp', mw, '--reach', '0']   # 不往外長：只有 Ray 畫的那幾塊會動
    if sky: args += ['--sky', sky[0]['name'], '--nosky']
    return run(args)


NOREV_KEYS = {'lake__cave__day', 'lake__fallbase__day'}   # 有瀑布／水流的格子
TRIM_KEYS = {'tomb__censerroom__base': 0.4, 'tomb__lowaltar__base': 0.4}   # Ray 11-12：鏡位動了的格子，截到偏移 0.4px 前
CUR = ['']
PROTECT_DARK = {'tomb__stair1__base': 45}   # key → 亮度門檻（0~255）


def f_prompt(png):
    p = json.loads(Image.open(png).info['prompt'])
    return next(n['inputs']['text'] for k, n in sorted(p.items()) if n['class_type'] == 'CLIPTextEncode')


def f_fg(key, base, still, inp):
    """F 系列（*_abacloth）的跑法：A→B 81 格取前 k 格、B→A 首尾幀 33 格、只在 Ray 的範圍取 Wan（reach 照 F 的預設）。
    參數（k、提詞）從那一格 F 版的 meta 與輸出 PNG 讀回來；提詞拿掉雲那一句（天空已摳掉，雲交給程式）。"""
    _, move, sky = Q.plan(key)
    mv = [c for c in move if c.get('text') and '雲' not in c['text']]
    jauto = json.load(open(os.path.join(HERE, 'notes', key, 'notes.json'), encoding='utf8')).get('auto')
    rng = [] if jauto else mv   # 自動判斷的不算 Ray 畫的範圍 ⇒ 雲以外全圖
    fmp = os.path.join(HERE, 'out', base + '_abacloth', 'meta.json')
    if os.path.exists(fmp):
        fm = json.load(open(fmp, encoding='utf8'))
        k = int(fm.get('k_src') or fm['k'])
        fab = Q.wan_out(fm['ab'])[0]; fba = Q.wan_out(fm['ba'])[0]
        cut = lambda t: re.sub(r'[；，]?天空的雲[^。；]*', '', t)
        noname = lambda t: re.sub(r'^動漫風格的[^。]*。', '動漫風格的背景。', t)   # Ray 11-12：不要給 Wan 圖名（「塌陷」「碎石陷落」會被演出來）
        pab, pba = noname(cut(f_prompt(fab))), noname(cut(f_prompt(fba)))
    else:   # Ray 11-11：沒有 F 版的格子「照 F 的寫法」
        name = json.load(open(os.path.join(HERE, 'notes', key, 'notes.json'), encoding='utf8')).get('name', '').replace('　', '')
        what = '；'.join(c['text'] for c in mv) if mv else '微風吹拂，草木輕輕搖曳'
        pab = pba = f'動漫風格的背景。{what}。鏡頭完全固定不動，岩石、山壁、地面、石柱、建築、骨頭與雕像都完全不動。動漫風格，賽璐珞上色。'
        k = 23
    SD = os.environ.get('SEP_SEED', '101')
    nfx = 'nf' if os.path.exists(os.path.join(Q.BG, '_layers_gpt', 'out', key.split('__')[0], key + '__nofire.png')) else ''
    ph = hashlib.md5((pab + pba + ('' if SD == '101' else SD) + nfx).encode('utf8')).hexdigest()[:5]   # 提詞改了就是新的一組 Wan 輸出
    ab, ba = f'bgl/{base}_sepF{ph}_ab', f'bgl/{base}_sepF{ph}_ba'
    log('F 提詞', pab)
    if len(Q.wan_out(ab)) < 81:
        if not wait_gpu() or not run([Q.PY, 'bg_wan.py', inp, ab, '81', pab, SD]): return False
    B = f'bgsep_{base}_F{ph}_B.png'
    Image.open(Q.wan_out(ab)[k]).convert('RGB').save(os.path.join(Q.COMFY, 'input', B))
    if len(Q.wan_out(ba)) < 33:
        if not wait_gpu() or not run([Q.PY, 'bg_flf.py', B, inp, ba, '33', pba, SD]): return False
    args = [Q.PY, 'aba_comp.py', still, key, ab, str(k), ba, base + '_sepfg', '--mwarp', mwarp(key, still)]
    if not rng: args += ['--full']
    bx = os.environ.get('SEP_PROTECT_BOX')   # Ray 11-12：人影那一塊遮掉 ⇒ 框內一律原圖（"x0,y0,x1,y1;…" 0~1）
    if bx:
        pm = np.zeros((H, W), np.uint8)
        for b in bx.split(';'):
            x0, y0, x1, y1 = [float(v) for v in b.split(',')]; pm[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = 255
        pp = os.path.join(os.path.dirname(still), 'protect_box.png'); cv2.imwrite(pp, pm); args += ['--protect', pp]; log('遮掉', bx)
    spp = os.path.join(HERE, 'out', base + '_smoke_protect.png')
    if os.path.exists(spp): args += ['--protect', spp]   # 煙那一塊固定原圖
    dk = PROTECT_DARK.get(key)
    if dk:   # Ray 11-12：暗處（往下的黑洞）會冒出影子 ⇒ 暗的地方一律用原圖
        g = cv2.cvtColor(cv2.imread(still), cv2.COLOR_BGR2GRAY)
        pm = cv2.dilate((g < dk).astype(np.uint8) * 255, np.ones((15, 15), np.uint8))
        pp = os.path.join(os.path.dirname(still), 'protect_dark.png'); cv2.imwrite(pp, pm); args += ['--protect', pp]
        log('暗處保護', f'{(pm > 0).mean():.0%}')   # Ray 11-11：沒畫範圍的格子＝雲以外全圖跑（天空已摳掉，雲交給程式）
    if sky: args += ['--sky', sky[0]['name'], '--nosky']
    return run(args)


def rev_seam(FR, fgm):
    """Ray 11-11：「前景可以用倒放到最接近的一格再續放」—— 0..N 播完不直接跳回 0，
    先倒放回到「跟第 0 格最像」的那一格 j 再接回 0。j 取倒放最短、而且差異不超過平常一步 1.5 倍的那一格（找不到就取最像的）。
    只對前景（天空以外）算差異；雲不經過這一支（雲照舊只往前）。"""
    if os.environ.get('SEP_STAB'):   # Ray 11-12：截短還是移鏡 ⇒ 每格對齊回第 0 格（ECC 平移＋旋轉＋縮放），把鏡頭飄移扣掉
        g0 = cv2.cvtColor(cv2.resize(FR[0], (480, 320)).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
        out = [FR[0]]; hh, ww = FR[0].shape[:2]
        for f in FR[1:]:
            g = cv2.cvtColor(cv2.resize(f, (480, 320)).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
            M = np.eye(2, 3, dtype=np.float32)
            try: _, M = cv2.findTransformECC(g0, g, M, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 60, 1e-5), None, 3)
            except cv2.error: pass
            M[:, 2] *= ww / 480
            out.append(cv2.warpAffine(f, M, (ww, hh), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT))
        FR = out; log('穩定', f'{len(FR)} 格對齊回第 0 格')
    thr = float(os.environ.get('SEP_TRIM', 0) or 0) or TRIM_KEYS.get(CUR[0], 0)
    if thr > 0:   # Ray 11-11：「有一點鏡位偏移，把頭尾縮一下找最接近的 f 接上」—— 從第 0 格起，鏡位偏移超過 thr 像素就截掉後面
        g = [cv2.cvtColor(cv2.resize(f, (768, 512)).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32) for f in FR]
        hw = cv2.createHanningWindow((768, 512), cv2.CV_32F)
        sh = [2 * float(np.hypot(*cv2.phaseCorrelate(g[0], x, hw)[0])) for x in g]
        cut = next((i for i, v in enumerate(sh) if v > thr), len(FR))
        cut = max(cut, 12); log('鏡位截短', f'{len(FR)} → {cut} 格（門檻 {thr}px）'); FR = FR[:cut]
    sm = cv2.resize(fgm, (192, 128))[..., None]
    if CUR[0] in NOREV_KEYS or os.environ.get('SEP_NOREV'):   # Ray 11-12：瀑布要不斷往下流 ⇒ 不倒放，往後找跟第 0 格最像的那一格直接接回
        q = [cv2.resize(f, (192, 128)) * sm for f in FR]
        d = [np.abs(q[j] - q[0]).mean() for j in range(len(q))]
        n = len(q); best = (1e9, 0, n)
        for a in range(0, max(1, n // 3)):
            for e in range(a + max(12, n // 3), n):
                v = np.abs(q[e] - q[a]).mean()
                if v < best[0]: best = (v, a, e)
        v, a, e = best
        log('不倒放接縫', f'播 {a}..{e - 1} 接回 {a}（第 {e} 格跟第 {a} 格差 {v:.2f}）'); return FR[a:e]
    q = [cv2.resize(f, (192, 128)) * sm for f in FR]
    step = np.median([np.abs(q[i + 1] - q[i]).mean() for i in range(len(q) - 1)])
    d = [np.abs(q[j] - q[0]).mean() for j in range(len(q))]
    N = len(FR) - 1; ok = [j for j in range(N, 0, -1) if d[j] <= step * 1.5]
    j = ok[0] if ok else int(np.argmin(d[1:])) + 1
    log('倒放接縫', f'播 0..{N} → 倒放到 {j}（差 {d[j]:.2f}，一步 {step:.2f}，直跳是 {d[N]:.2f}）')
    return FR + FR[N - 1:j - 1:-1] if j < N else FR


def sky_backdrop(sky, sky_a, yb_yt, hor_c):
    """Ray 11-11：「天空的灰太沒有層次，弄個基礎的遠景背景雲，不用動」—— 一層靜止的遠雲（GPT 九宮格雲塊），
    淡進天空色，鋪在動態雲之下。只算一次。"""
    yt, yb = yb_yt; m = sky_a > 0.5; xs = np.where(m.any(0))[0]
    x0, x1 = (int(xs.min()), int(xs.max())) if len(xs) else (0, W); sw = max(200, x1 - x0); hgt = max(80, yb - yt)
    S_far = tint(CS.cut_grid(DL + 'cloudgrid_v2_a.png') + CS.cut_grid(DL + 'cloudgrid_v2_b.png'), ORIG[0], sky_a); xr = (x0 - sw * 0.1, x1 + sw * 0.1); k = max(1.0, sw / 400)
    img = sky.copy()
    for i, (frac, haze, a) in enumerate(((0.15, 0.55, 0.55), (0.45, 0.45, 0.65), (0.80, 0.35, 0.75))):
        L = CS.Layer(S_far, 40 + i, yt + hgt * frac, hgt * 0.25, int(7 * k), min(sw, 900) * 0.20, min(sw, 900) * 0.42, 60, 0,
                     haze_col=hor_c, haze=haze, fog_col=hor_c, xr=xr, fog=0.0, keep_in=True)
        c, al = L.render(30.0); al = al * a
        img = img * (1 - al[..., None]) + c * al[..., None]
    return img


# 會轉的扇葉（Ray 11-11：「把車葉拆掉另外給程式跑，讓它有轉不太動的效果」）。座標是 1536×1024 的 GPT 圖。
BLADES = {'capital_outer__windmill__base': dict(hub=(440, 125), tips=[(290, 0), (540, 0), (645, 330), (300, 370)], w=34, amp=1.6,
                                                tower=[(262, 100), (470, 100), (535, 505), (200, 505)])}


def blades(key, other, sky_a):
    """扇葉層＝前景裡、離四支葉臂中線 w 像素以內的像素（GPT 圖）。原位的扇葉：落在天空的改畫天空（交給雲層），
    落在塔身上的留著（晃幅小，殘影只有幾像素）；轉動的那一份疊在最上面。"""
    b = BLADES.get(key)
    if not b: return None
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); hx, hy = b['hub']; m = np.zeros((H, W), np.float32)
    for tx, ty in b['tips']:
        dx, dy = tx - hx, ty - hy; L2 = dx * dx + dy * dy
        t = np.clip(((xx - hx) * dx + (yy - hy) * dy) / L2, 0, 1)
        d = np.hypot(xx - hx - t * dx, yy - hy - t * dy); m = np.maximum(m, (d < b['w']).astype(np.float32))
    m = m * (1 - sky_a); m = cv2.GaussianBlur(m, (0, 0), 0.8)
    tw = np.zeros((H, W), np.uint8); cv2.fillPoly(tw, [np.array(b['tower'], np.int32)], 1)
    sa = np.maximum(sky_a, m * (1 - tw))
    log('扇葉', f'{(m > 0.5).sum()} px，晃幅 ±{b["amp"]}°')
    return dict(rgb=other.astype(np.float32), a=m, hub=(float(hx), float(hy)), amp=b['amp'], sky_a=sa)


def smoke_layer(key, other):
    """Ray 11-12：香爐室「煙要摳掉留給程式跑」—— GPT 把煙塗成洋紅（_layers_gpt/out/<圖>/<key>__smoke.png）。
    不准補畫煙後面的東西，所以煙那一塊固定用原圖（Wan 不動它），程式煙從那一塊的底部冒上去疊在最上面。"""
    p = os.path.join(Q.BG, '_layers_gpt', 'out', key.split('__')[0], key + '__smoke.png')
    if not os.path.exists(p): return None
    import war_run as WR
    g = np.array(Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS))
    _, a = CS.key_magenta(g); m = ((1 - a) > 0.5).astype(np.uint8)
    M = WR.align(other, g.astype(np.float32), m == 0) if False else np.eye(3)
    WR.W, WR.H = W, H
    m = cv2.dilate(m, np.ones((21, 21), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m); srcs = []
    for i in sorted(range(1, n), key=lambda i: -st[i, 4])[:3]:
        x, y, w_, h_, a_ = st[i]
        if a_ > 300: srcs.append((x + w_ / 2, y + h_ * 0.85, max(24, min(90, w_ * 0.6))))
    pp = os.path.join(HERE, 'out', key.replace('__', '_') + '_smoke_protect.png'); cv2.imwrite(pp, m * 255)
    SM = WR.Smoke(srcs, CS.cut_grid(DL + 'cloudgrid_v2_a.png'), (150, 140, 135), seed=11)
    log('程式煙', f'{len(srcs)} 個源頭')
    return dict(SM=SM, protect=pp)


def do(key):
    base = key.replace('__', '_'); outd = os.path.join(HERE, 'out', base + '_sep' + os.environ.get('SEP_SUFFIX', ''))
    if os.path.exists(os.path.join(outd, 'loop.mp4')) and '--recomp' not in sys.argv: log('已有', key); return True
    if gpt_path(key):
        other, sky_a, sky, yy, hor_c = prep(key)
        nf = os.path.join(Q.BG, '_layers_gpt', 'out', key.split('__')[0], key + '__nofire.png')
        if os.path.exists(nf):   # Ray 11-12：「不要有火」⇒ GPT 去火版當底圖（天空遮罩照舊）
            o2 = np.array(Image.open(nf).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
            other = o2 * (1 - sky_a[..., None]) + other * sky_a[..., None]; log('用去火版底圖', key)
    elif os.environ.get('SEP_NOSKY'):   # 室內（沒有天空）：不用 GPT，原圖直接跑
        jn0 = json.load(open(os.path.join(HERE, 'notes', key, 'notes.json'), encoding='utf8'))
        other = np.array(Image.open(os.path.join(Q.BG, jn0['file'])).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
        sky_a = np.zeros((H, W), np.float32); sky = other.copy(); yy = (0, 0); hor_c = np.array([128, 128, 128], np.float32)
        nf = os.path.join(Q.BG, '_layers_gpt', 'out', key.split('__')[0], key + '__nofire.png')
        if os.path.exists(nf): other = np.array(Image.open(nf).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32); log('用去火版底圖', key)
    else: log('沒有預處理圖', key); return False
    jn = json.load(open(os.path.join(HERE, 'notes', key, 'notes.json'), encoding='utf8'))
    ORIG[0] = np.array(Image.open(os.path.join(Q.BG, jn['file'])).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
    os.makedirs(outd, exist_ok=True)
    still = os.path.join(outd, 'other.png'); Image.fromarray(other.clip(0, 255).astype(np.uint8)).save(still)
    prot = os.path.join(outd, 'sky_lock.png')
    Image.fromarray(cv2.dilate((sky_a > 0.3).astype(np.uint8), np.ones((5, 5), np.uint8)) * 255).save(prot)
    j, move, _ = Q.plan(key)
    texts = '；'.join(c['text'] for c in move if c.get('text') and '雲' not in c['text'])
    war = key.startswith(('winsmoor', 'northport'))
    busy = ('微風吹過，碎布與旗幟輕輕擺動，地上的灰燼與塵土被風捲起' if war else
            '微風持續吹拂，枝葉與草叢沙沙晃動，幾片落葉被風捲起，陽光斑點隨枝葉輕輕閃動')
    fwd = (f'動漫風格的背景。{busy}' + (f'；{texts}' if texts else '') +
           '。天空是一片乾淨平整的顏色，沒有任何雲。整個畫面持續自然地往前變化，不要倒退回放。地面、岩石、建築都不動，鏡頭完全固定不動。動漫風格，賽璐珞上色。')
    if os.environ.get('SEP_PROMPT'): fwd = os.environ['SEP_PROMPT']   # Ray 11-11：提詞只寫「顏色標的＋動作」
    tag = hashlib.md5((fwd + ','.join(SEGS) + str(Q.SEG)).encode('utf8')).hexdigest()[:6]
    pre = {s: f'bgl/{base}_s{tag}_{s}' for s in ('ab', 'bc', 'cd', 'da')}
    log('■', key, j.get('name'))
    inp = f'bgsep_{base}.png'
    Image.fromarray(other.clip(0, 255).astype(np.uint8)).resize((768, 512), Image.LANCZOS).save(os.path.join(Q.COMFY, 'input', inp))
    src = inp
    for s in (() if os.environ.get('SEP_F') else SEGS):   # Ray 11-11：SEP_SEGS=ab ⇒ 單段 A→B→A（只跑一段 I2V＋FLF 回 A，漂移少）
        if len(Q.wan_out(pre[s])) < Q.SEG:
            if not wait_gpu() or not run([Q.PY, 'bg_wan.py', src, pre[s], str(Q.SEG), fwd, '101']): return False
        src = f'bgsep_{base}_{s}_last.png'
        Image.open(Q.wan_out(pre[s])[-1]).convert('RGB').save(os.path.join(Q.COMFY, 'input', src))
    if not os.environ.get('SEP_F') and len(Q.wan_out(pre['da'])) < Q.SEG:
        if not wait_gpu() or not run([Q.PY, 'bg_flf.py', src, inp, pre['da'], str(Q.SEG),
                                      fwd.replace('不要倒退回放。', '不要倒退回放，最後回到畫面原本的樣子。'), '101']): return False
    CUR[0] = key; SMK = smoke_layer(key, other)
    GLW = None; gw = os.environ.get('SEP_GLOW')
    if gw:
        cx, cy, rx, ry = [float(v) for v in gw.split(',')]
        yy_, xx_ = np.mgrid[0:H, 0:W].astype(np.float32)
        r = ((xx_ / W - cx) / rx) ** 2 + ((yy_ / H - cy) / ry) ** 2
        GLW = (np.exp(-r * 2.2)[..., None] * np.array([40, 110, 255], np.float32) * 0.55).astype(np.float32)
    if os.environ.get('SEP_F'):   # Ray 11-11：「用 f 系列跑 wan，圖用摳過的」—— F 的段長／提詞／合成照抄，只把輸入換成摳過天空的圖
        if not f_fg(key, base, still, inp): return False
    elif not comp_fg(key, still, prot, pre): return False
    sc, mv = Q.camshift(os.path.join(HERE, 'out', base + '_sepfg', 'loop.mp4'))
    log('鏡位', key, f'{sc*100:.1f}% {mv:.0f}px')
    cap = cv2.VideoCapture(os.path.join(HERE, 'out', base + '_sepfg', 'loop.mp4')); FR = []
    while True:
        ok, f = cap.read()
        if not ok: break
        FR.append(cv2.resize(cv2.cvtColor(f, cv2.COLOR_BGR2RGB), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32))
    if os.environ.get('SEP_STATIC'): FR = [other.astype(np.float32)]   # Ray 11-11：城外「圖不用動，整張不動就動雲」
    if os.environ.get('SEP_REV') and len(FR) > 1: FR = rev_seam(FR, 1 - sky_a)
    BL = blades(key, other, sky_a)
    if BL: sky_a = BL['sky_a']
    nosky = sky_a.max() < 0.01
    mn = os.environ.get('SEP_MOON')   # Ray 11-12：月亮放在最後景（天空底色上、雲的後面）：從原圖剪下那一圈貼回去
    if mn and not nosky:
        cx, cy, rr = [float(v) for v in mn.split(',')]; o = ORIG[0] if ORIG[0] is not None else other
        yy_, xx_ = np.mgrid[0:H, 0:W].astype(np.float32); dd = np.hypot(xx_ - cx * W, yy_ - cy * H) / (rr * W)
        ma = np.clip((1.25 - dd) / 0.25, 0, 1)[..., None]; sky = sky * (1 - ma) + o * ma; log('月亮', mn)
    if not nosky and os.environ.get('SEP_BACKDROP', '1') == '1': sky = sky_backdrop(sky, sky_a, yy, hor_c)
    L = [] if nosky else clouds(sky_a, yy, hor_c); fg = 1 - sky_a; FPS = 16; T = max(12.0, len(FR) / FPS * 3)
    outp = os.path.join(outd, 'loop.mp4')
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', outp], stdin=subprocess.PIPE)
    for fi in range(int(T * FPS)):
        img = sky.copy()
        for Ly in L:
            c, a = Ly.render(30 + fi / FPS); img = img * (1 - a[..., None]) + c * a[..., None]
        img = img * sky_a[..., None] + FR[fi % len(FR)] * fg[..., None]
        if GLW is not None:   # Ray 11-12：底層祭壇「發藍光就好」—— 程式在祭壇上方疊一層緩慢呼吸的藍光（加亮混合）
            k = 0.55 + 0.45 * np.sin(2 * np.pi * fi / FPS / 3.0)
            img = np.clip(img + GLW * k, 0, 255)
        if SMK:
            sr, sa = np.zeros((H, W, 3), np.float32), np.zeros((H, W), np.float32); SMK['SM'].render(30 + fi / FPS, sr, sa)
            img = img * (1 - sa[..., None]) + sr * sa[..., None]
        if BL:   # 扇葉：程式繞軸小幅晃（轉不太動）
            tt = fi / FPS; ang = BL['amp'] * (0.75 * np.sin(2 * np.pi * 3 * tt / T) + 0.25 * np.sin(2 * np.pi * 7 * tt / T + 1.3))
            Mr = cv2.getRotationMatrix2D(BL['hub'], ang, 1.0)
            c = cv2.warpAffine(BL['rgb'], Mr, (W, H), flags=cv2.INTER_LINEAR); a = cv2.warpAffine(BL['a'], Mr, (W, H), flags=cv2.INTER_LINEAR)[..., None]
            img = img * (1 - a) + c * a
        p.stdin.write(img.clip(0, 255).astype(np.uint8).tobytes())
        if fi == 40: Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(os.path.join(outd, 'f40.jpg'))
    p.stdin.close(); p.wait()
    json.dump({'key': key, 'gpt': gpt_path(key), 'fg_frames': len(FR), 'cam': [float(sc), float(mv)], 'prompt': fwd},
              open(os.path.join(outd, 'meta.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    log('✔', key, outp); return True


if __name__ == '__main__':
    for k in [x for x in sys.argv[1:] if not x.startswith('--')]:
        if stop(): break
        try: do(k)
        except Exception as e: log('✘', k, repr(e)[:300])
