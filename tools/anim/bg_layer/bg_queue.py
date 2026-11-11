"""背景線：照 Ray 的註記自動跑背景動畫（Ray 11-10：「等他跑完就把所有需要跑的背景跑到我喊停或跑完為止」）。
規則（Ray 11-10 定案）：
  · 有方向性的（雲：說明裡有「雲」）→ 交給程式分層捲（不跑 Wan，這裡只記下來）。
  · 其他（布、燈籠、樹葉、天光…）→ ABA：A→B＝從原圖 I2V 81 格，B＝其中布動得最開的一格；B→A＝FLF 33 格；接成一圈。
  · 只換 Ray 註記的範圍（＋布實際掃過的範圍），其餘原圖。
GPU：每送一件之前等 GPU 閒下來（使用率 < 10% 連續 1 分鐘、兩個 ComfyUI 佇列都空）—— 別的專案在用就排隊。
喊停：在這個資料夾放一個 STOP 檔就停（跑到一半的那一件會先跑完）。
用法：python bg_queue.py           （常駐，掃 notes/，做完一輪等 2 分鐘再掃，看 Ray 有沒有新註記）
"""
import glob, json, os, subprocess, sys, time, urllib.request
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); COMFY = os.path.dirname(os.path.dirname(HERE))
BG = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'TIVOT', 'resources', 'background'))
PY = sys.executable
LOG = os.path.join(HERE, 'bg_queue.log')
ENV = dict(os.environ, PYTHONIOENCODING='utf-8')


def log(*a):
    s = time.strftime('%m-%d %H:%M:%S ') + ' '.join(str(x) for x in a)
    open(LOG, 'a', encoding='utf8').write(s + '\n')
    try: print(s, flush=True)
    except Exception: pass   # 主控台是 cp950 時印不出符號，不要讓整個排程死掉（11-10 夜裡踩過）


def stopped(): return os.path.exists(os.path.join(HERE, 'STOP'))


def gpu_util():
    try:
        return int(subprocess.check_output(['nvidia-smi', '--query-gpu=utilization.gpu', '--format=csv,noheader,nounits']).decode().strip().split()[0])
    except Exception: return 0


def queue_busy(port, need=False):
    try:
        q = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/queue', timeout=3))
        return len(q['queue_running']) + len(q['queue_pending'])
    except Exception: return 99 if need else 0   # 8188 連不上＝ComfyUI 掛了，要等它回來，不是「閒著」（11-10 踩過：整批送件失敗跳過）


def wait_gpu():
    calm = 0
    while calm < 4:
        if stopped(): return False
        if gpu_util() < 10 and queue_busy(8188, True) == 0 and queue_busy(8189) == 0: calm += 1
        else:
            if calm: log('GPU 有人在用（或 ComfyUI 沒開），排隊等')
            calm = 0
        time.sleep(15)
    return True


def run(args):
    log('▶', ' '.join(os.path.basename(x) if os.sep in x else x for x in args[1:4]))
    r = subprocess.run(args, cwd=HERE, env=ENV, capture_output=True, text=True, encoding='utf8')
    if r.returncode: log('✘', (r.stderr or r.stdout)[-600:])
    return r.returncode == 0, r.stdout


# 戶外先（風吹的層多、效果明顯），室內火把最後
ORDER = ['canyon', 'shinier_forest', 'plainsroad', 'lake', 'fallen', 'capital_outer', 'sofiaout', 'dunmor', 'winsmoor_siege',
         'shinier_ruins', 'holysee_g3', 'tomb', 'belisar']


def is_sky(c): return '雲' in (c.get('text') or '')


def plan(key):
    j = json.load(open(os.path.join(HERE, 'notes', key, 'notes.json'), encoding='utf8'))
    move = [c for c in j['colors'] if not is_sky(c)]
    sky = [c for c in j['colors'] if is_sky(c)]
    return j, move, sky


def first_desc(key):
    # 第一次送 Wan 的描述（從 log 撈）；沒尾碼的輸出就是用它生的；提示詞改了就要重跑，不能沿用舊輸出（11-10：拿掉誤判的火之後還在用含火的那一版）
    try:
        for ln in open(LOG, encoding='utf8').read().splitlines():   # 第一次送的那一版＝沒有尾碼的那組輸出
            if f'■ {key} ' in ln and '｜' in ln: return ln.split('｜', 1)[1].strip()
    except Exception: pass
    return None


def wan_out(prefix): return sorted(glob.glob(os.path.join(COMFY, 'output', prefix + '_*.png')))


DELIVERED = set(json.load(open(os.path.join(HERE, 'delivered.json'), encoding='utf8')))   # Ray 已說可交的（delivered.json），不要再動；每一輪重讀
SEG = 17   # Ray 11-10：「每一次用 16+1，這樣出人的機會就小」


def drift(pres):
    # 每段的整體水平漂移（光流，動得明顯的像素平均 dx）。往前三段一個方向、D→A 反過來 ⇒ 看起來就是倒車
    import cv2
    g = lambda p: cv2.cvtColor(np.array(Image.open(p).convert('RGB')), cv2.COLOR_RGB2GRAY)
    r = []
    for p in pres:
        fs = wan_out(p); f = cv2.calcOpticalFlowFarneback(g(fs[2]), g(fs[-3]), None, 0.5, 3, 25, 3, 5, 1.2, 0)
        k = np.linalg.norm(f, axis=2) > 1
        r.append(float(f[..., 0][k].mean()) if k.mean() > 0.02 else 0.0)
    return r


ANTI_DRIFT = '雲與霧只在原地緩緩翻湧起伏，整片不往左右任何方向漂移'
ANTI_CAM = '鏡頭是鎖死在三腳架上的固定機位，絕對不推近、不拉遠、不平移、不搖鏡，畫框邊緣的景物始終停在同一個位置'


def camshift(mp4):
    # 鏡位檢查（Ray 11-10：大廳「鏡位怎麼動了」）：每一格對第 0 格做 ECC 仿射，回傳最大縮放偏差與最大位移（原解析度 px）
    import cv2
    cap = cv2.VideoCapture(mp4); fr = []
    while True:
        ok, f = cap.read()
        if not ok: break
        fr.append(cv2.resize(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), None, fx=.5, fy=.5))
    sc = mv = 0.0
    for g in fr[1::3]:
        w = np.eye(2, 3, dtype=np.float32)
        try: _, w = cv2.findTransformECC(fr[0], g, w, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 60, 1e-4), None, 5)
        except Exception: continue
        sc = max(sc, abs(np.sqrt(abs(np.linalg.det(w[:2, :2]))) - 1)); mv = max(mv, 2 * float(np.hypot(w[0, 2], w[1, 2])))
    return sc, mv


def do_one(key, _retry=True):
    # 同一格只准一支在做（插隊的單跑與排程可能同時碰到同一格）：鎖 2 小時
    lk = os.path.join(HERE, 'notes', key, '.lock')
    if _retry and os.path.exists(lk) and time.time() - os.path.getmtime(lk) < 7200: return True
    if _retry: open(lk, 'w').write(str(os.getpid()))
    try: return _do_one(key, _retry)
    finally:
        if _retry and os.path.exists(lk): os.remove(lk)


def _do_one(key, _retry=True):
    """ABCD 真循環（Ray 11-10 定為標準作業）：A→B、B→C、C→D 三段 I2V 往前生（每段 16+1 格，從上一段最後一格接），
    D→A 用 FLF 收回原圖。只換註記範圍（＋布掃過的範圍），保護區一律原圖。
    逐格選項寫在 notes.json 的 opts：full（純 Wan 整張）／protect（遮罩檔名）／reach（布可飄出範圍幾像素）／extra（提示詞補充）。"""
    j, move, sky = plan(key)
    o = dict(j.get('opts') or {})
    # Ray 標「不要動／不動」的顏色＝保護區（一律原圖），不是要動的範圍（Ray 11-10 林間空地紅色「不要動」）
    keep = [c for c in j['colors'] if any(w in (c.get('text') or '') for w in ('不要動', '不動', '別動'))]
    if keep:
        move = [c for c in move if c not in keep]; sky = [c for c in sky if c not in keep]
        km = None
        for c in keep:
            m = np.array(Image.open(os.path.join(HERE, 'notes', key, c['mask'])).convert('L')) > 127
            km = m if km is None else (km | (m if m.shape == km.shape else np.array(Image.fromarray(m).resize(km.shape[::-1])) > 0))
        pp0 = o.get('protect') or ('protect.png' if os.path.exists(os.path.join(HERE, 'notes', key, 'protect.png')) else '')
        if pp0:
            m0 = np.array(Image.open(os.path.join(HERE, 'notes', key, pp0)).convert('L').resize(km.shape[::-1])) > 127; km |= m0
        Image.fromarray((km * 255).astype(np.uint8)).save(os.path.join(HERE, 'notes', key, 'protect_keep.png')); o['protect'] = 'protect_keep.png'
    if o.get('skip'): return True   # Ray 說先跳過的格（opts.skip）
    base = key.replace('__', '_'); still = os.path.join(BG, j['file'])
    done = os.path.join(HERE, 'out', base + '_abcd', 'meta.json')
    gen = (j.get('general') or '').strip()
    if gen.startswith('（'): gen = ''   # 我自動寫的那句備註不算
    o = dict(o)
    # 備註寫「（自動判斷…）」的範圍是我自動畫的，不是 Ray 的（Ray 11-10：「我沒畫大廳，那是你畫的」）
    if (j.get('general') or '').startswith('（自動'): j['auto'] = True
    if not j.get('auto'):
        # Ray 自己存的：只有整體備註、沒畫任何範圍 ⇒ 整張交給 Wan。
        # 有畫範圍就只動他畫的那幾塊，而且不往外長（reach 0）—— Ray 11-10：「inpaint 一概我來出」；
        # 舊版看到「自然光影／門扇」就整張交出去、範圍外再長 80px，結果固定燈與門全在亂動。
        if gen and not move: o['full'] = True
        elif move: o.setdefault('reach', 0)
    o['full'] = True; o.pop('reach', None)   # Ray 11-10：「都用全圖跑 ABCD」—— 每一格整張交給 Wan（保護區 protect 照舊）
    if not move and not o.get('full'):
        log('跳過（只有雲，交給程式）', key); return True
    desc = '；'.join([c['text'] for c in move] + ([gen] if gen else [])) + (('，' + o['extra']) if o.get('extra') else '')
    tail = '鏡頭完全固定不動，除此之外的景物（地面、岩石、建築、樹幹）都完全不動。動漫風格，賽璐珞上色。'
    if o.get('full'): tail = '地面、岩石、建築都不動，鏡頭完全固定不動。動漫風格，賽璐珞上色。'
    # Ray 11-10：「多塞 prompt 進去讓他沒空自作主張，好比風、葉、自然光影變化」—— 每一句都是畫面裡本來就有的東西在動，
    # 模型的「動態預算」花在這些上面，就比較不會自己長出走路的人。室外（有天空或樹葉）與室內（只有火）各一組。
    # ⚠ Ray 11-10：「火燄搖只限有燈、燭、火這一類的場景」—— 火的句子只給「註記裡真的有火」的格（橙色＝火，判過焰心＋肉眼複核）
    names = {c['name'] for c in j['colors']}
    texts = ''.join(c.get('text') or '' for c in j['colors'])
    parts = []
    if names & {'green', 'cyan'} or o.get('full') or any(w in texts for w in ('葉', '草', '布', '旗', '風')):
        parts.append('微風持續吹拂，枝葉與草叢沙沙晃動，幾片落葉被風捲起，雲影與樹影在地面上緩緩移動，陽光斑點隨枝葉輕輕閃動')
    if 'orange' in names or any(w in texts for w in ('火', '燭', '燈')):
        parts.append('燈火與燭焰微微跳動，附近牆上的光影跟著輕輕晃動')
    if not parts: parts.append('空氣中細小的塵埃緩緩飄浮，光影非常輕微地變化')
    busy = '；'.join(parts)
    fwd = f'動漫風格的背景。{busy}；{desc}。整個畫面持續自然地往前變化，不要倒退回放。{tail}'
    seed = str(o.get('seed', 101))   # 鏡位檢查兩次都過不了才換種子（提示詞壓不住推鏡時）
    tag = __import__('hashlib').md5((fwd + str(o.get('full')) + ('' if seed == '101' else seed)).encode('utf8')).hexdigest()[:6]
    pre = {s: f'bgl/{base}_q{tag}_{s}' for s in ('ab', 'bc', 'cd', 'da')}
    try:   # 這一版（同一組提示詞）已經合成過、而且比註記新 ⇒ 不重跑
        if f'_q{tag}_' in json.load(open(done, encoding='utf8'))['cut']['chain'] and os.path.getmtime(done) > os.path.getmtime(os.path.join(HERE, 'notes', key, 'notes.json')): return True
    except Exception: pass
    log('■', key, j.get('name'), '｜', desc, '｜ABCD')
    rd = os.path.join(HERE, 'notes', key, 'refined'); os.makedirs(rd, exist_ok=True)
    if j.get('auto'):   # 自動判斷的遮罩本來就精確，只羽化
        import cv2
        for c in j['colors']:
            m = np.array(Image.open(os.path.join(HERE, 'notes', key, c['mask'])).convert('L')).astype(np.float32)
            Image.fromarray(cv2.GaussianBlur(m, (0, 0), 2).clip(0, 255).astype(np.uint8)).save(os.path.join(rd, c['name'] + '.png'))
    elif move:
        soft = [f"{c['name']}=soft" for c in move if '光' in (c.get('text') or '')]
        ok, _ = run([PY, 'bg_refine.py', key] + soft)
        if not ok: return False
    inp = f'bg_{base}.png'
    Image.open(still).convert('RGB').resize((768, 512), Image.LANCZOS).save(os.path.join(COMFY, 'input', inp))
    src = inp
    for s in ('ab', 'bc', 'cd'):
        if len(wan_out(pre[s])) < SEG:
            if not wait_gpu(): return False
            ok, _ = run([PY, 'bg_wan.py', src, pre[s], str(SEG), fwd, seed])
            if not ok: return False
        src = f'bg_{base}_q{tag}_{s}_last.png'
        Image.open(wan_out(pre[s])[-1]).convert('RGB').save(os.path.join(COMFY, 'input', src))
    if len(wan_out(pre['da'])) < SEG:
        if not wait_gpu(): return False
        ok, _ = run([PY, 'bg_flf.py', src, inp, pre['da'], str(SEG), fwd.replace('不要倒退回放。', '不要倒退回放，最後回到畫面原本的樣子。'), seed])
        if not ok: return False
    args = [PY, 'aba_comp.py', still, key, '-', '0', '-', base + '_abcd', '--chain', ','.join(pre[s] for s in ('ab', 'bc', 'cd', 'da'))]
    if o.get('full'): args += ['--full']
    elif sky: args += ['--sky', sky[0]['name'], '--nosky']
    pp = o.get('protect') or ('protect.png' if os.path.exists(os.path.join(HERE, 'notes', key, 'protect.png')) else '')
    if pp: args += ['--protect', os.path.join(HERE, 'notes', key, pp)]
    if 'reach' in o: args += ['--reach', str(o['reach'])]
    ok, outp = run(args)
    if ok:
        log('✔', key, outp.strip()[-200:])
        subprocess.run([PY, 'make_sky_alpha.py'], cwd=HERE, env=ENV, capture_output=True)
        # 倒車檢查（Ray 11-10：斷崖邊 ABCD「還是往回跑」）：往前段平均往一邊漂、D→A 往另一邊漂得更多 ⇒ 加「原地翻湧」重跑一次
        try:
            d = drift([pre[s] for s in ('ab', 'bc', 'cd', 'da')]); fw = sum(d[:3]) / 3
            if abs(fw) > 0.8 and d[3] * fw < 0 and abs(d[3]) > 1.5:
                log('⚠ 倒車', key, [round(x, 2) for x in d])
                if _retry and ANTI_DRIFT not in (o.get('extra') or ''):
                    p = os.path.join(HERE, 'notes', key, 'notes.json'); jj = json.load(open(p, encoding='utf8'))
                    jj.setdefault('opts', {})['extra'] = ((o.get('extra') + '，') if o.get('extra') else '') + ANTI_DRIFT
                    json.dump(jj, open(p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
                    return _do_one(key, False)
        except Exception as e: log('倒車檢查失敗', key, repr(e)[:120])
        try:
            sc, mv = camshift(os.path.join(HERE, 'out', base + '_abcd', 'loop.mp4'))
            if sc > 0.006 or mv > 6:
                log('⚠ 鏡位動了', key, f'縮放 {sc*100:.1f}% 位移 {mv:.0f}px')
                p = os.path.join(HERE, 'notes', key, 'notes.json'); jj = json.load(open(p, encoding='utf8'))
                if ANTI_CAM not in (o.get('extra') or ''):   # 第一次：加鎖鏡頭句
                    jo = jj.get('opts') or {}; jj['opts'] = jo; jo['extra'] = ((jo.get('extra') + '，') if jo.get('extra') else '') + ANTI_CAM
                    json.dump(jj, open(p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
                    return _do_one(key, _retry)
                if 'seed' not in o:   # 第二次：句子壓不住（大廳 11-10 加了句子反而推 3.6%）⇒ 換種子
                    jj.setdefault('opts', {})['seed'] = 202
                    json.dump(jj, open(p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
                    return _do_one(key, False)
        except Exception as e: log('鏡位檢查失敗', key, repr(e)[:120])
    return ok


def main():
    import msvcrt   # 只准一支排程（11-10 看門狗 26 秒內開了兩支，兩支互搶 GPU、送件失敗）
    global _LOCKF; _LOCKF = open(os.path.join(HERE, 'bg_queue.lock'), 'a+')
    try: _LOCKF.seek(0); msvcrt.locking(_LOCKF.fileno(), msvcrt.LK_NBLCK, 1)
    except OSError: log('已經有一支排程在跑，這一支退出'); return
    log('排程開始（喊停：放 STOP 檔）')
    while not stopped():
        keys = sorted((os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(HERE, 'notes', '*', 'notes.json'))),
                      key=lambda k: (0 if (not json.load(open(os.path.join(HERE, 'notes', k, 'notes.json'), encoding='utf8')).get('auto')
                                           and time.time() - os.path.getmtime(os.path.join(HERE, 'notes', k, 'notes.json')) < 6 * 3600) else 1,   # Ray 剛存的最先
                                     0 if (json.load(open(os.path.join(HERE, 'notes', k, 'notes.json'), encoding='utf8')).get('opts') or {}).get('skip') is None and json.load(open(os.path.join(HERE, 'notes', k, 'notes.json'), encoding='utf8')).get('opts') else 1,   # Ray 點名修的先
                                     0 if not json.load(open(os.path.join(HERE, 'notes', k, 'notes.json'), encoding='utf8')).get('auto') else 1,   # Ray 自己塗的先
                                     ORDER.index(k.split('__')[0]) if k.split('__')[0] in ORDER else 99, k))
        for key in keys:
            if stopped(): break
            if key in set(json.load(open(os.path.join(HERE, 'delivered.json'), encoding='utf8'))): continue
            try: do_one(key)
            except Exception as e: log('✘', key, repr(e)[:300])
        for _ in range(8):
            if stopped(): break
            time.sleep(15)
    log('收到 STOP，停止')


if __name__ == '__main__':
    main()
