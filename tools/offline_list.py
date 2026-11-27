"""產生離線包清單 offline_list.json（給 offline.js 的「下載全部」用，ver -2256）。
收 git 有追蹤、Pages 會發布、遊戲執行會讀到的檔；底線開頭的資料夾、工具、文件不收。

⚠ ver -2842：`tools/bust.py` 每次都會叫 `write()` —— 清單以前要手動跑，停在 ver -2260
  一個多月沒人更新（1.6 GB，實際已經 3.1 GB），新素材斷網時全部抓不到。
⚠ 一行一個檔（不是整份擠成一行）：每一版都會重寫，擠成一行的話 git 每版多一筆 1.2 MB 的 diff。"""
import json, os, re, subprocess, sys
ROOTS = ('resources/', 'flight/', 'modules/', 'script/', 'i18n/', 'css/')
ROOT_FILES = {'index.html', 'style.css', 'manifest.webmanifest', 'audio.js', 'config.js', 'i18n.js',
              'main.js', 'orientation.js', 'state.js', 'telemetry.js', 'offline.js', 'sw.js',
              'build.js'}   # 建置設定（ver -3073，試玩版旗標；dist/demo 打包時換成 demo:true）
# 留在 repo、不進遊戲包的工作素材（ver -2853 之後，Ray：「收掉留著 不要進遊戲包」）：
#   resources/ci/layers/ ＝做 CI 影片用的 GPT 圖層／修補片／Wan 輸出／對位資料（365 MB），遊戲播的是 resources/ci/video/ 的成品，執行時一張都不讀。
SKIP_DIRS = ('resources/ci/layers/',)
# 零星的工作檔（Ray：「排除零星垃圾檔」）：檔名底線開頭（審閱拼圖、參考圖、預覽 gif…）／「未命名」／resources/si/old/ ——
#   **只有程式沒引用的才排除**（地圖的 _spots_／_layout_、飛行頁的 _rooms_map 這些底線檔是真的在讀的）。
#   判準：檔名（含或不含副檔名）與路徑都不出現在執行時的程式裡；config.js 裡版號工具自動產生的雜湊表那幾行不算引用。
STRAY = lambda f: os.path.basename(f).startswith('_') or '未命名' in f or f.startswith('resources/si/old/')
def _runtime_code(root):
    import glob
    out = []
    pats = ['config.js', 'main.js', 'index.html', 'style.css', 'modules/*.js', 'script/**/*.js', 'flight/*.js', 'flight/*.html', 'i18n/**/*.js']
    for pat in pats:
        for p in glob.glob(os.path.join(root, pat), recursive=True):
            t = open(p, encoding='utf-8', errors='ignore').read()
            if os.path.basename(p) == 'config.js' and os.path.dirname(p) == root:
                t = '\n'.join(l for l in t.split('\n') if not re.match(r"\s*'[^']+':\s*'[0-9a-f]{8}',?\s*$", l))
            out.append(t)
    return '\n'.join(out)
def _referenced(f, code):
    if f.startswith('resources/si/old/'): return 'si/old' in code
    b = os.path.basename(f)
    return b in code or os.path.splitext(b)[0] in code or f in code
SKIP_EXT = {'.md', '.py', '.xlsx', '.docx', '.pptx', '.psd', '.tsv', '.txt', '.sh', '.bat', '.log', '.kra', '.blend'}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def build(root=ROOT):
    files = subprocess.run(['git', 'ls-files', '-z'], cwd=root, capture_output=True).stdout.decode('utf-8').split('\0')
    lfs = set(subprocess.run(['git', 'lfs', 'ls-files', '-n'], cwd=root, capture_output=True).stdout.decode('utf-8').split('\n'))
    out, total = [], 0
    code = None
    for f in files:
        if not f or f in lfs: continue
        if not (f in ROOT_FILES or f.startswith(ROOTS)): continue
        if f.startswith(SKIP_DIRS): continue
        if any(seg.startswith('_') or seg == 'reference' for seg in f.split('/')[:-1]): continue
        if os.path.splitext(f)[1].lower() in SKIP_EXT: continue
        p = os.path.join(root, f)
        if not os.path.isfile(p): continue
        if STRAY(f):
            if code is None: code = _runtime_code(root)
            if not _referenced(f, code): continue
        out.append(f); total += os.path.getsize(p)
    s = open(os.path.join(root, 'config.js'), encoding='utf-8').read()
    ver = re.search(r"export const VERSION = '([^']+)'", s).group(1)
    return {'version': ver, 'bytes': total, 'files': out, 'hash': _hashes(root, out)}

def _hashes(root, files):
    """每支檔的內容雜湊（ver -3078，離線版更新「雜湊不同才重抓」）：git 的 blob 雜湊前 10 碼。
    已提交／已暫存的讀索引（快）；工作區改過還沒 add 的現算（git hash-object），清單永遠對得上磁碟上的內容。"""
    idx = {}
    for row in subprocess.run(['git', 'ls-files', '-s', '-z'], cwd=root, capture_output=True).stdout.decode('utf-8').split('\0'):
        if '\t' in row:
            meta, path = row.split('\t', 1); idx[path] = meta.split()[1]
    dirty = set(subprocess.run(['git', 'diff', '--name-only', '-z'], cwd=root, capture_output=True).stdout.decode('utf-8').split('\0'))
    need = [f for f in files if f in dirty or f not in idx]
    if need:
        got = subprocess.run(['git', 'hash-object', '--stdin-paths'], cwd=root, input='\n'.join(need).encode('utf-8'),
                             capture_output=True).stdout.decode().split()
        idx.update(dict(zip(need, got)))
    return [idx.get(f, '')[:10] for f in files]

def dump(path, d):
    """寫一份清單（主程式與試玩版 dist 共用這一個格式，offline.js 只認這一種）。
    `hash`＝與 files 同順序的內容雜湊（ver -3078）；沒有這一欄的清單 offline.js 照舊能讀。"""
    body = ',\n'.join(json.dumps(f, ensure_ascii=False) for f in d['files'])
    hs = d.get('hash')
    hpart = (',\n"hash": [%s]' % ','.join(json.dumps(h) for h in hs)) if hs else ''
    txt = ('{"version": %s,\n"bytes": %d,\n"files": [\n%s\n]%s}\n'
           % (json.dumps(d['version'], ensure_ascii=False), d['bytes'], body, hpart))
    open(path, 'w', encoding='utf-8', newline='\n').write(txt)

def write(root=ROOT):
    d = build(root)
    dump(os.path.join(root, 'offline_list.json'), d)
    return d

if __name__ == '__main__':
    d = write()
    print(len(d['files']), 'files', round(d['bytes'] / 1e6), 'MB', d['version'])
