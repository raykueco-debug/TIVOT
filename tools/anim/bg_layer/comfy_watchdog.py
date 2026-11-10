"""背景線：ComfyUI（8188）看門狗 —— 讓排程可以整夜無人看管（Ray 11-10：「重點是可以自動化，睡一覺就做好大半」）。
11-10 白天 8188 在載入模型時 segfault 兩次；排程會等它回來，但沒人重開就等到天亮。
① 連續 1 分鐘連不上就用省記憶體的參數重開一個（--disable-smart-memory --cache-none，那組至今沒當過）。
② 排程（bg_queue.py）沒在跑、又沒有 STOP 檔 ⇒ 重開它（11-10 凌晨排程隨對話結束一起被關掉過）；防睡（keepawake）同理。
STOP_WATCHDOG 檔出現或 36 小時後結束。只負責「沒有在跑就開一個」，不會去關任何東西。"""
import os, subprocess, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); COMFY = os.path.dirname(os.path.dirname(HERE))
LOG = os.path.join(HERE, 'comfy_watchdog.log')


def up():
    try: urllib.request.urlopen('http://127.0.0.1:8188/queue', timeout=5); return True
    except Exception: return False


def running(name):
    try:
        out = subprocess.check_output(['powershell', '-NoProfile', '-Command',
            "(Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | ? {$_.CommandLine -match '%s'}).Count" % name], timeout=60)
        return int(out.decode().strip() or 0) > 0
    except Exception: return True   # 查不到就當作在跑，寧可不重開也不要開兩個


def spawn(args, outname):
    out = open(os.path.join(HERE, outname), 'a', encoding='utf8')
    env = dict(os.environ, PYTHONIOENCODING='utf-8')
    subprocess.Popen(args, cwd=HERE, stdout=out, stderr=subprocess.STDOUT, env=env, creationflags=0x00000008 | 0x00000200)


def log(s): open(LOG, 'a', encoding='utf8').write(time.strftime('%m-%d %H:%M:%S ') + s + '\n')


t0 = time.time(); bad = 0; log('看門狗開始')
while time.time() - t0 < 36 * 3600 and not os.path.exists(os.path.join(HERE, 'STOP_WATCHDOG')):
    bad = 0 if up() else bad + 1
    if bad >= 4:
        log('8188 連不上一分鐘，重開 ComfyUI')
        out = open(os.path.join(HERE, 'comfy8188.log'), 'a', encoding='utf8')
        subprocess.Popen([os.path.join(COMFY, '.venv', 'Scripts', 'python.exe'), 'main.py', '--lowvram', '--fp16-vae', '--disable-smart-memory',
                          '--cache-none', '--listen', '127.0.0.1', '--port', '8188'], cwd=COMFY, stdout=out, stderr=subprocess.STDOUT,
                         creationflags=0x00000008 | 0x00000200)   # DETACHED_PROCESS | NEW_PROCESS_GROUP
        bad = 0; time.sleep(120)   # 給它時間起來
    if not os.path.exists(os.path.join(HERE, 'STOP')):
        if not running('bg_queue.py'): log('排程沒在跑，重開'); spawn(['python', 'bg_queue.py'], 'bg_queue.stdout'); time.sleep(10)
        if not running('keepawake.py'): log('防睡沒在跑，重開'); spawn(['python', 'keepawake.py'], 'keepawake.out')
    time.sleep(15)
log('看門狗結束')
