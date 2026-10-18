# record.py 錄影前的準備：把遊戲會播的 CI／插畫動畫 mp4 拆成逐格圖（record.py 的假影片物件照虛擬時間挑格畫）。
#   py -X utf8 tools/promo/cifr.py           → tools/promo/_cifr/<檔名>/0001.jpg…＋ manifest.json（{名字:{n,fps}}）
# 已經拆過、而且來源沒變的會跳過。_cifr 在 .gitignore。
import os, json, glob, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, '_cifr'); os.makedirs(OUT, exist_ok=True)
MAN = os.path.join(OUT, 'manifest.json')
man = json.load(open(MAN)) if os.path.exists(MAN) else {}
srcs = glob.glob(os.path.join(ROOT, 'resources', 'ci', 'video', '*.mp4')) + glob.glob(os.path.join(ROOT, 'resources', 'illustration', 'video', '*.mp4'))
for p in sorted(srcs):
    name = os.path.splitext(os.path.basename(p))[0]; d = os.path.join(OUT, name)
    if name in man and man[name].get('mt') == int(os.path.getmtime(p)) and os.path.isdir(d): continue
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', p], capture_output=True, text=True)
    a, b = (r.stdout.strip() or '24/1').split('/'); fps = round(int(a) / max(1, int(b)), 3)
    os.makedirs(d, exist_ok=True)
    for f in glob.glob(os.path.join(d, '*.jpg')): os.remove(f)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', p, '-q:v', '3', os.path.join(d, '%04d.jpg')], check=True)
    n = len(glob.glob(os.path.join(d, '*.jpg')))
    man[name] = {'n': n, 'fps': fps, 'mt': int(os.path.getmtime(p))}
    print('%-40s %4d 格 %g fps' % (name, n, fps), flush=True)
json.dump(man, open(MAN, 'w'), indent=1)
print('manifest:', len(man))
