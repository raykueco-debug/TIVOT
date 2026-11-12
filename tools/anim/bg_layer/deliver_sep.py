"""背景線交件：out/<base>_sep_F/loop.mp4 → TIVOT/resources/background/anim/<資料夾>/<背景名>_sep_v1.mp4，
寫進 TO_CODE_bg_anim.md 與 delivered.json。用法：python deliver_sep.py <段落標題> <key[:後綴]>..."""
import os, sys, json, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
T = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'TIVOT')); A = os.path.join(T, 'resources', 'background', 'anim')
one = '--onecycle' in sys.argv
title, items = sys.argv[1], [x for x in sys.argv[2:] if not x.startswith('--')]
dj = os.path.join(HERE, 'delivered.json'); D = json.load(open(dj, encoding='utf8'))
rows = []
for it in items:
    key, suf = (it.split(':') + ['_sep_F'])[:2]
    if it.startswith('war:'):   # 戰地（war_run 的輸出，沒有 notes）：war:<名>:<資料夾>:<顯示名>
        _, nm_, fold, disp = it.split(':'); key = nm_
        src = os.path.join(HERE, 'out', nm_ + '_war', 'loop.mp4'); j = {'name': disp}; d, stem = fold, nm_
    else:
        src = os.path.join(HERE, 'out', key.replace('__', '_') + suf, 'loop.mp4')
        j = json.load(open(os.path.join(HERE, 'notes', key, 'notes.json'), encoding='utf8'))
        d, f = os.path.split(j['file']); stem = os.path.splitext(f)[0]
    rel = f'{d}/{stem}_sep_v1.mp4'; dst = os.path.join(A, rel); os.makedirs(os.path.dirname(dst), exist_ok=True)
    vf = []
    if one:   # 沒有程式雲的格子（室內）：影片其實是同一圈重複三次，只交一圈（手機省流量與記憶體）
        import cv2, numpy as np
        cap = cv2.VideoCapture(src); F = []
        while True:
            ok, fr = cap.read()
            if not ok: break
            F.append(cv2.resize(fr, (192, 128)).astype(np.float32))
        d = [float(np.abs(F[i] - F[0]).mean()) for i in range(len(F))]
        p = min(range(8, len(F) // 2 + 5), key=lambda i: d[i]); vf = ['-vf', f'select=lt(n\,{p})', '-vsync', '0']
        print('  一圈', p, '格（差', round(d[p], 2), '）')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src] + vf + [ '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
                    '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an', dst], check=True)
    n = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', dst],
                       capture_output=True, text=True).stdout.strip()
    D[key] = rel; rows.append(f"| {j['name']} | `anim/{rel}` | {n} | 不用（整張含天空都是影片） |")
    print('✔', key, rel, n, f'{os.path.getsize(dst)//1024} KB')
json.dump(D, open(dj, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
md = os.path.join(A, 'TO_CODE_bg_anim.md')
open(md, 'a', encoding='utf8').write(f'\n> {title}\n' + '\n'.join(rows) + '\n')
