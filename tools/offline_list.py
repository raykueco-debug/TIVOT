"""產生離線包清單 offline_list.json（給 offline.js 的「下載全部」用，ver -2256）。
收 git 有追蹤、Pages 會發布、遊戲執行會讀到的檔；底線開頭的資料夾、工具、文件不收。

⚠ ver -2842：`tools/bust.py` 每次都會叫 `write()` —— 清單以前要手動跑，停在 ver -2260
  一個多月沒人更新（1.6 GB，實際已經 3.1 GB），新素材斷網時全部抓不到。
⚠ 一行一個檔（不是整份擠成一行）：每一版都會重寫，擠成一行的話 git 每版多一筆 1.2 MB 的 diff。"""
import json, os, re, subprocess, sys
ROOTS = ('resources/', 'flight/', 'modules/', 'script/', 'i18n/', 'css/')
ROOT_FILES = {'index.html', 'style.css', 'manifest.webmanifest', 'audio.js', 'config.js', 'i18n.js',
              'main.js', 'orientation.js', 'state.js', 'telemetry.js', 'offline.js', 'sw.js'}
SKIP_EXT = {'.md', '.py', '.xlsx', '.docx', '.pptx', '.psd', '.tsv', '.txt', '.sh', '.bat', '.log', '.kra', '.blend'}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def build(root=ROOT):
    files = subprocess.run(['git', 'ls-files', '-z'], cwd=root, capture_output=True).stdout.decode('utf-8').split('\0')
    lfs = set(subprocess.run(['git', 'lfs', 'ls-files', '-n'], cwd=root, capture_output=True).stdout.decode('utf-8').split('\n'))
    out, total = [], 0
    for f in files:
        if not f or f in lfs: continue
        if not (f in ROOT_FILES or f.startswith(ROOTS)): continue
        if any(seg.startswith('_') or seg == 'reference' for seg in f.split('/')[:-1]): continue
        if os.path.splitext(f)[1].lower() in SKIP_EXT: continue
        p = os.path.join(root, f)
        if not os.path.isfile(p): continue
        out.append(f); total += os.path.getsize(p)
    s = open(os.path.join(root, 'config.js'), encoding='utf-8').read()
    ver = re.search(r"export const VERSION = '([^']+)'", s).group(1)
    return {'version': ver, 'bytes': total, 'files': out}

def dump(path, d):
    """寫一份清單（主程式與試玩版 dist 共用這一個格式，offline.js 只認這一種）。"""
    body = ',\n'.join(json.dumps(f, ensure_ascii=False) for f in d['files'])
    txt = ('{"version": %s,\n"bytes": %d,\n"files": [\n%s\n]}\n'
           % (json.dumps(d['version'], ensure_ascii=False), d['bytes'], body))
    open(path, 'w', encoding='utf-8', newline='\n').write(txt)

def write(root=ROOT):
    d = build(root)
    dump(os.path.join(root, 'offline_list.json'), d)
    return d

if __name__ == '__main__':
    d = write()
    print(len(d['files']), 'files', round(d['bytes'] / 1e6), 'MB', d['version'])
