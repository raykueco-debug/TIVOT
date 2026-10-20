"""產生離線包清單 offline_list.json（給 sw.js 的「下載全部」用，ver -2256）。
收 git 有追蹤、Pages 會發布、遊戲執行會讀到的檔；底線開頭的資料夾、工具、文件不收。"""
import json, os, subprocess, sys
ROOTS = ('resources/', 'flight/', 'modules/', 'script/', 'i18n/', 'css/')
ROOT_FILES = {'index.html', 'style.css', 'manifest.webmanifest', 'audio.js', 'config.js', 'i18n.js',
              'main.js', 'orientation.js', 'state.js', 'telemetry.js'}
SKIP_EXT = {'.md', '.py', '.xlsx', '.docx', '.pptx', '.psd', '.tsv', '.txt', '.sh', '.bat', '.log', '.kra', '.blend'}
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
files = subprocess.run(['git', 'ls-files', '-z'], capture_output=True).stdout.decode('utf-8').split('\0')
lfs = set(subprocess.run(['git', 'lfs', 'ls-files', '-n'], capture_output=True).stdout.decode('utf-8').split('\n'))
out, total = [], 0
for f in files:
    if not f or f in lfs: continue
    if not (f in ROOT_FILES or f.startswith(ROOTS)): continue
    if any(seg.startswith('_') or seg == 'reference' for seg in f.split('/')[:-1]): continue
    if os.path.splitext(f)[1].lower() in SKIP_EXT: continue
    if not os.path.isfile(f): continue
    out.append(f); total += os.path.getsize(f)
ver = open('config.js', encoding='utf-8').read().split("VERSION = '")[1].split("'")[0]
json.dump({'version': ver, 'bytes': total, 'files': out}, open('offline_list.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(len(out), 'files', round(total / 1e6), 'MB', ver)
