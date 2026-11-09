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
    print(s, flush=True); open(LOG, 'a', encoding='utf8').write(s + '\n')


def stopped(): return os.path.exists(os.path.join(HERE, 'STOP'))


def gpu_util():
    try:
        return int(subprocess.check_output(['nvidia-smi', '--query-gpu=utilization.gpu', '--format=csv,noheader,nounits']).decode().strip().split()[0])
    except Exception: return 0


def queue_busy(port):
    try:
        q = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/queue', timeout=3))
        return len(q['queue_running']) + len(q['queue_pending'])
    except Exception: return 0


def wait_gpu():
    calm = 0
    while calm < 4:
        if stopped(): return False
        if gpu_util() < 10 and queue_busy(8188) == 0 and queue_busy(8189) == 0: calm += 1
        else:
            if calm: log('GPU 有人在用，排隊等')
            calm = 0
        time.sleep(15)
    return True


def run(args):
    log('▶', ' '.join(os.path.basename(x) if os.sep in x else x for x in args[1:4]))
    r = subprocess.run(args, cwd=HERE, env=ENV, capture_output=True, text=True, encoding='utf8')
    if r.returncode: log('✘', (r.stderr or r.stdout)[-600:])
    return r.returncode == 0, r.stdout


def is_sky(c): return '雲' in (c.get('text') or '')


def plan(key):
    j = json.load(open(os.path.join(HERE, 'notes', key, 'notes.json'), encoding='utf8'))
    move = [c for c in j['colors'] if not is_sky(c)]
    sky = [c for c in j['colors'] if is_sky(c)]
    return j, move, sky


def wan_out(prefix): return sorted(glob.glob(os.path.join(COMFY, 'output', prefix + '_*.png')))


def do_one(key):
    j, move, sky = plan(key)
    base = key.replace('__', '_'); still = os.path.join(BG, j['file'])
    done = os.path.join(HERE, 'out', base + '_abacloth', 'meta.json')
    if not move:
        log('跳過（只有雲，交給程式）', key); return True
    if os.path.exists(done) and os.path.getmtime(done) > os.path.getmtime(os.path.join(HERE, 'notes', key, 'notes.json')):
        return True
    log('■', key, j.get('name'), '｜', '；'.join(c['text'] for c in move))
    soft = [f"{c['name']}=soft" for c in move if '光' in (c.get('text') or '')]
    ok, _ = run([PY, 'bg_refine.py', key] + soft)
    if not ok: return False
    inp = os.path.join(COMFY, 'input', f'bg_{base}.png')
    Image.open(still).convert('RGB').resize((768, 512), Image.LANCZOS).save(inp)
    desc = '；'.join(c['text'] for c in move)
    tail = '鏡頭完全固定不動，除此之外的景物（地面、岩石、建築、樹幹、天空）都完全不動。動漫風格，賽璐珞上色。'
    ab = f'bgl/{base}_s101'
    if len(wan_out(ab)) < 81:
        if not wait_gpu(): return False
        ok, _ = run([PY, 'bg_wan.py', os.path.basename(inp), ab, '81', f'動漫風格的背景。微風吹過：{desc}。{tail}', '101'])
        if not ok: return False
    # 挑 B：註記範圍內與第 0 格差最大的一格（16～48）
    fs = wan_out(ab)
    ms = [np.array(Image.open(p).convert('L').resize((768, 512))).astype(float) / 255
          for p in glob.glob(os.path.join(HERE, 'notes', key, 'refined', '*.png')) if os.path.basename(p)[:-4] in [c['name'] for c in move]]
    m = np.max(ms, axis=0)[..., None]
    a0 = np.array(Image.open(fs[0]).convert('RGB')).astype(float)
    k = max(range(16, 49), key=lambda i: float((np.abs(np.array(Image.open(fs[i]).convert('RGB')).astype(float) - a0) * m).sum()))
    Image.open(fs[k]).convert('RGB').save(os.path.join(COMFY, 'input', f'bg_{base}_B.png'))
    ba = f'bgl/{base}_ba'
    if len(wan_out(ba)) < 33:
        if not wait_gpu(): return False
        ok, _ = run([PY, 'bg_flf.py', f'bg_{base}_B.png', os.path.basename(inp), ba, '33',
                     f'風漸漸停下，{desc}，慢慢回到原本的位置。{tail}', '101'])
        if not ok: return False
    args = [PY, 'aba_comp.py', still, key, ab, str(k), ba, base + '_abacloth']
    skyc = [c['name'] for c in sky]
    if skyc: args += ['--sky', skyc[0], '--nosky']
    ok, outp = run(args)
    if ok: log('✔', key, outp.strip()[-200:])
    return ok


def main():
    log('排程開始（喊停：放 STOP 檔）')
    while not stopped():
        keys = sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(HERE, 'notes', '*', 'notes.json')))
        for key in keys:
            if stopped(): break
            try: do_one(key)
            except Exception as e: log('✘', key, repr(e)[:300])
        for _ in range(8):
            if stopped(): break
            time.sleep(15)
    log('收到 STOP，停止')


if __name__ == '__main__':
    main()
