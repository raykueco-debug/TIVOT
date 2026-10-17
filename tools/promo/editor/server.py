# TIVOT 宣傳片剪輯器 —— 本機伺服器（只綁 127.0.0.1）
#
#   py tools/promo/editor/server.py [port]        預設 8130，瀏覽器開 http://localhost:8130/
#
# 提供：
#   GET  /                    剪輯器頁面（editor/web/）
#   GET  /m/<專案內相對路徑>    素材檔（支援 Range，影片才能拖時間軸跳轉）
#   GET  /api/library         素材庫清單
#   GET  /api/probe?p=        長度／尺寸／有沒有聲音（快取）
#   GET  /api/thumb?p=&t=     影片縮圖（快取）
#   GET  /api/beats?p=        音樂的拍點（快取）
#   GET  /api/storyboards     分鏡表清單（tools/promo 底下的 .xlsx）；GET /api/storyboard?p=  讀成 cut 清單
#   POST /api/upload          上傳（標頭 X-Name；存進 editor/media/uploads/）
#   GET  /api/projects        專案清單；GET/POST /api/project?name=  讀／存
#   POST /api/export          開始輸出 mp4；GET /api/job?id= 進度
import os, sys, re, json, glob, time, uuid, threading, subprocess, urllib.parse, mimetypes, hashlib
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
WEB = os.path.join(HERE, 'web')
MEDIA = os.path.join(HERE, 'media')
CACHE = os.path.join(HERE, 'cache')
PROJ = os.path.join(HERE, 'projects')
OUT = os.path.join(HERE, 'out')
for d in (MEDIA, CACHE, PROJ, OUT, os.path.join(MEDIA, 'uploads')): os.makedirs(d, exist_ok=True)
sys.path.insert(0, HERE)
import render   # noqa: E402

mimetypes.add_type('image/webp', '.webp'); mimetypes.add_type('audio/mp4', '.m4a'); mimetypes.add_type('text/javascript', '.js')

def rel(p): return os.path.relpath(p, ROOT).replace('\\', '/')
def absp(r):
    p = os.path.abspath(os.path.join(ROOT, r))
    if not (p == ROOT or p.startswith(ROOT + os.sep)): raise ValueError('outside project')
    return p

VID = ('.mp4', '.webm', '.mov', '.m4v'); IMG = ('.webp', '.png', '.jpg', '.jpeg'); AUD = ('.m4a', '.mp3', '.wav', '.ogg', '.aac')
def kind_of(p):
    e = os.path.splitext(p)[1].lower()
    return 'video' if e in VID else 'image' if e in IMG else 'audio' if e in AUD else None

# 素材庫的分類：(分類名, glob 樣式)
LIB = [
    ('實機錄影', 'tools/promo/editor/media/footage/*.mp4'),
    ('生成', 'tools/promo/editor/media/generated/*'),
    ('上傳', 'tools/promo/editor/media/uploads/*'),
    ('CI 影片', 'resources/ci/video/*.mp4'),
    ('插圖動畫', 'resources/illustration/video/*.mp4'),
    ('插圖', 'resources/illustration/*'),
    ('CI 圖', 'resources/ci/*'),
    ('背景', 'resources/background/*/*'),
    ('背景（根）', 'resources/background/*'),
    ('敵人', 'resources/enemy/*'),
    ('BGM', 'resources/audio/bgm/*'),
    ('音效', 'resources/audio/se/*'),
    ('語音', 'resources/audio/vo/*'),
]
def library():
    out = []
    for cat, pat in LIB:
        items = []
        for f in sorted(glob.glob(os.path.join(ROOT, pat), recursive=True)):
            b = os.path.basename(f)
            if b.startswith('_') or b.startswith('.') or not os.path.isfile(f): continue
            if any(part.startswith('_') for part in rel(f).split('/')[:-1]): continue
            k = kind_of(f)
            if k: items.append({'p': rel(f), 'name': b, 'kind': k})
        out.append({'cat': cat, 'items': items})
    return out

_probe_lock = threading.Lock()
def probe(r):
    p = absp(r); st = os.stat(p)
    key = hashlib.md5(('%s|%d|%d' % (r, st.st_size, st.st_mtime)).encode()).hexdigest()
    cf = os.path.join(CACHE, 'probe_' + key + '.json')
    if os.path.exists(cf): return json.load(open(cf))
    j = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,r_frame_rate',
                                   '-of', 'json', p], capture_output=True, text=True).stdout or '{}')
    info = {'dur': float(j.get('format', {}).get('duration') or 0), 'w': 0, 'h': 0, 'audio': False, 'video': False, 'fps': 0}
    for s in j.get('streams', []):
        if s.get('codec_type') == 'video':
            info['video'] = True; info['w'] = s.get('width', 0); info['h'] = s.get('height', 0)
            try: a, b = s.get('r_frame_rate', '0/1').split('/'); info['fps'] = round(int(a) / max(1, int(b)), 3)
            except Exception: pass
        if s.get('codec_type') == 'audio': info['audio'] = True
    if kind_of(p) == 'image': info['dur'] = 0
    with _probe_lock: json.dump(info, open(cf, 'w'))
    return info

def thumb(r, t):
    p = absp(r); key = hashlib.md5(('%s|%s|%d' % (r, t, os.path.getmtime(p))).encode()).hexdigest()
    cf = os.path.join(CACHE, 'th_' + key + '.jpg')
    if not os.path.exists(cf):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', p, '-frames:v', '1', '-vf', 'scale=180:-2', '-q:v', '4', cf])
    return cf

def beats(r):
    p = absp(r); key = hashlib.md5(('%s|%d' % (r, os.path.getmtime(p))).encode()).hexdigest()
    cf = os.path.join(CACHE, 'beats_' + key + '.json')
    if not os.path.exists(cf):
        # -X utf8：beats2 會印中文，主控台是 cp1252／cp950 時整支在寫檔前就掛掉（10-17 Windows 實測）
        subprocess.run([sys.executable, '-X', 'utf8', os.path.join(ROOT, 'tools', 'promo', 'beats2.py'), p, cf], capture_output=True)
    d = json.load(open(cf))
    return {'bpm': d['bpm'], 'period': d['period'], 'phase': d['phase'], 'beats': d['beats'], 'accent': d['accent']}

def storyboard_files():
    '''分鏡表：tools/promo 底下的 .xlsx（檔名有「分鏡」或 storyboard 的排前面）。'''
    fs = [rel(f) for f in glob.glob(os.path.join(ROOT, 'tools', 'promo', '**', '*.xlsx'), recursive=True)
          if not os.path.basename(f).startswith(('~$', '_'))]
    return sorted(fs, key=lambda p: (0 if ('分鏡' in p or 'storyboard' in p.lower()) else 1, p))

def storyboard(r):
    '''讀分鏡表（不靠 openpyxl：xlsx 是 zip＋xml）。第一張工作表、第一列是表頭。
       認得的欄：cut／秒數始／秒數終／影像／音效／語音／運鏡／備註（沒有的欄就空著）；沒有始終秒數的列略過。'''
    import zipfile, xml.etree.ElementTree as ET
    M = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
    z = zipfile.ZipFile(absp(r))
    ss = []
    if 'xl/sharedStrings.xml' in z.namelist():
        ss = [''.join(t.text or '' for t in si.iter(M + 't')) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall(M + 'si')]
    sheets = sorted(n for n in z.namelist() if re.match(r'xl/worksheets/sheet\d+\.xml$', n))
    def col_of(ref):
        c = re.match(r'[A-Z]+', ref).group(0); n = 0
        for ch in c: n = n * 26 + ord(ch) - 64
        return n - 1
    rows = []
    for row in ET.fromstring(z.read(sheets[0])).iter(M + 'row'):
        vals = {}
        for c in row.findall(M + 'c'):
            v = c.find(M + 'v'); i = c.find(M + 'is')
            if v is not None: val = ss[int(v.text)] if c.get('t') == 's' else v.text
            elif i is not None: val = ''.join(t.text or '' for t in i.iter(M + 't'))
            else: continue
            vals[col_of(c.get('r'))] = (val or '').strip()
        rows.append(vals)
    if not rows: return {'cuts': []}
    head = rows[0]
    KEYS = {'cut': ('cut', '鏡'), 'start': ('秒數始', '開始', 'start'), 'end': ('秒數終', '結束', 'end'),
            'video': ('影像', '畫面'), 'se': ('音效',), 'vo': ('語音', '台詞'), 'cam': ('運鏡',), 'note': ('備註',)}
    idx = {}
    for k, names in KEYS.items():
        for ci, h in head.items():
            if any(n.lower() in h.lower() for n in names): idx[k] = ci; break
    cuts = []
    for vals in rows[1:]:
        g = lambda k: vals.get(idx.get(k, -1), '')
        try: s = float(g('start')); e = float(g('end'))
        except ValueError: continue
        if e <= s: continue
        cuts.append({'no': g('cut'), 'start': round(s, 4), 'end': round(e, 4), 'video': g('video'), 'se': g('se'),
                     'vo': g('vo'), 'cam': g('cam'), 'note': g('note')})
    return {'path': r, 'cuts': cuts}

JOBS = {}
def stash_text_pngs(project):
    '''文字片段：前端把畫好的透明 PNG（data URL）放在 `_png`，這裡寫進 cache、換成路徑交給 render。'''
    import base64
    for t in project.get('tracks', []):
        for c in t.get('clips', []):
            d = c.get('_png')
            if c.get('kind') == 'text' and d and d.startswith('data:image/png;base64,'):
                b = base64.b64decode(d.split(',', 1)[1])
                f = os.path.join(CACHE, 'text_' + hashlib.md5(b).hexdigest() + '.png')
                if not os.path.exists(f): open(f, 'wb').write(b)
                c['_png'] = f

def start_export(project):
    stash_text_pngs(project)
    jid = uuid.uuid4().hex[:8]
    d = (project.pop('_outDir', '') or '').strip().strip('"')
    nm = (project.pop('_outName', '') or '').strip()
    nm = re.sub(r'[<>:"/\|?*]+', '_', nm) or (re.sub(r'[^\w\-]+', '_', project.get('name') or 'pv') + '_' + time.strftime('%m%d_%H%M%S'))
    if not nm.lower().endswith('.mp4'): nm += '.mp4'
    d = os.path.abspath(os.path.expanduser(d)) if d else OUT
    os.makedirs(d, exist_ok=True)
    out = os.path.join(d, nm)
    job = {'id': jid, 'state': 'running', 'progress': 0.0, 'msg': '準備中', 'path': out, 'log': ''}
    JOBS[jid] = job
    def work():
        try:
            render.render(project, out, ROOT, lambda f, m=None: job.update({'progress': f, **({'msg': m} if m else {})}))
            job.update(state='done', progress=1.0, msg='完成')
        except Exception as e:
            job.update(state='error', msg=str(e)[-2000:])
    threading.Thread(target=work, daemon=True).start()
    return job

PICK = r'''
import sys, tkinter as tk
from tkinter import filedialog
r = tk.Tk(); r.withdraw(); r.attributes('-topmost', True)
p = filedialog.askdirectory(initialdir=sys.argv[1] or None, title='選擇輸出資料夾', parent=r)
sys.stdout.write(p or '')
'''
def pick_dir(init):
    # 在跑伺服器的這台電腦上跳出原生的「選擇資料夾」視窗（另開程序：tkinter 不能在執行緒裡跑）
    r = subprocess.run([sys.executable, '-c', PICK, init or ''], capture_output=True, text=True, encoding='utf-8')
    p = (r.stdout or '').strip()
    return os.path.normpath(p) if p else None

def list_dir(path):
    '''網頁裡的資料夾瀏覽：path 空白＝常用位置＋磁碟機。'''
    home = os.path.expanduser('~')
    if not path:
        places = [('桌面', os.path.join(home, 'Desktop')), ('文件', os.path.join(home, 'Documents')),
                  ('影片', os.path.join(home, 'Videos')), ('下載', os.path.join(home, 'Downloads')), ('剪輯器 out', OUT)]
        drives = [d + ':' + os.sep for d in 'CDEFGHIJKLMNOPQRSTUVWXYZ' if os.path.exists(d + ':' + os.sep)]
        return {'path': '', 'parent': None, 'places': [{'name': n, 'path': q} for n, q in places if os.path.isdir(q)],
                'dirs': [{'name': d, 'path': d} for d in drives]}
    path = os.path.abspath(path)
    dirs = []
    try:
        for e in sorted(os.scandir(path), key=lambda e: e.name.lower()):
            try:
                if e.is_dir() and not e.name.startswith(('.', '$')): dirs.append({'name': e.name, 'path': e.path})
            except OSError: pass
    except OSError as ex:
        return {'path': path, 'parent': os.path.dirname(path) if os.path.dirname(path) != path else '', 'dirs': [], 'error': str(ex)}
    par = os.path.dirname(path)
    return {'path': path, 'parent': par if par != path else '', 'dirs': dirs}

class H(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def log_message(self, *a): pass
    def send_json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b))); self.send_header('Cache-Control', 'no-store'); self.end_headers(); self.wfile.write(b)
    def send_file(self, p, ctype=None):
        size = os.path.getsize(p); ctype = ctype or mimetypes.guess_type(p)[0] or 'application/octet-stream'
        rng = self.headers.get('Range'); start, end = 0, size - 1; code = 200
        m = rng and re.match(r'bytes=(\d*)-(\d*)', rng)
        if m:
            if m.group(1): start = int(m.group(1))
            if m.group(2): end = min(size - 1, int(m.group(2)))
            if not m.group(1) and m.group(2): start = max(0, size - int(m.group(2))); end = size - 1
            code = 206
        self.send_response(code); self.send_header('Content-Type', ctype); self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(end - start + 1))
        if code == 206: self.send_header('Content-Range', 'bytes %d-%d/%d' % (start, end, size))
        self.send_header('Cache-Control', 'no-cache'); self.end_headers()
        with open(p, 'rb') as f:
            f.seek(start); left = end - start + 1
            while left > 0:
                buf = f.read(min(1 << 20, left))
                if not buf: break
                try: self.wfile.write(buf)
                except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError): return
                left -= len(buf)
    def do_GET(self):
        u = urllib.parse.urlparse(self.path); q = dict(urllib.parse.parse_qsl(u.query)); path = urllib.parse.unquote(u.path)
        try:
            if path in ('/', '/index.html'): return self.send_file(os.path.join(WEB, 'index.html'), 'text/html; charset=utf-8')
            if path.startswith('/web/'):
                f = os.path.abspath(os.path.join(WEB, path[5:]))
                if f.startswith(WEB) and os.path.isfile(f): return self.send_file(f)
                return self.send_error(404)
            if path.startswith('/m/'):
                f = absp(path[3:])
                if os.path.isfile(f): return self.send_file(f)
                return self.send_error(404)
            if path == '/api/library': return self.send_json(library())
            if path == '/api/probe': return self.send_json(probe(q['p']))
            if path == '/api/thumb': return self.send_file(thumb(q['p'], float(q.get('t', 0.5))), 'image/jpeg')
            if path == '/api/beats': return self.send_json(beats(q['p']))
            if path == '/api/storyboards': return self.send_json(storyboard_files())
            if path == '/api/storyboard': return self.send_json(storyboard(q['p']))
            if path == '/api/projects':
                return self.send_json(sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(PROJ, '*.json'))))
            if path == '/api/project':
                f = os.path.join(PROJ, re.sub(r'[^\w\-]+', '_', q['name']) + '.json')
                return self.send_json(json.load(open(f, encoding='utf-8'))) if os.path.exists(f) else self.send_json({'error': 'not found'}, 404)
            if path == '/api/job': return self.send_json(JOBS.get(q['id'], {'state': 'missing'}))
            if path == '/api/pickdir': return self.send_json({'path': pick_dir(q.get('init', ''))})
            if path == '/api/ls': return self.send_json(list_dir(q.get('path', '')))
            if path == '/api/out':
                j = JOBS.get(q['id'])
                if j and j.get('state') == 'done' and os.path.isfile(j['path']): return self.send_file(j['path'], 'video/mp4')
                return self.send_error(404)
            if path == '/api/reveal':
                j = JOBS.get(q['id'])
                if j and os.path.isfile(j['path']): subprocess.Popen(['explorer', '/select,', os.path.normpath(j['path'])])
                return self.send_json({'ok': True})
            self.send_error(404)
        except Exception as e:
            self.send_json({'error': str(e)}, 500)
    def do_POST(self):
        u = urllib.parse.urlparse(self.path); q = dict(urllib.parse.parse_qsl(u.query)); path = u.path
        n = int(self.headers.get('Content-Length') or 0); body = self.rfile.read(n) if n else b''
        try:
            if path == '/api/upload':
                name = os.path.basename(urllib.parse.unquote(self.headers.get('X-Name') or 'upload.bin'))
                name = re.sub(r'[<>:"/\\|?*]+', '_', name)
                f = os.path.join(MEDIA, 'uploads', name)
                b, e = os.path.splitext(f); k = 1
                while os.path.exists(f): f = '%s_%d%s' % (b, k, e); k += 1
                open(f, 'wb').write(body)
                return self.send_json({'p': rel(f), 'name': os.path.basename(f), 'kind': kind_of(f)})
            if path == '/api/mkdir':
                d = os.path.join(os.path.abspath(q['path']), re.sub(r'[<>:"/\|?*]+', '_', q['name']).strip())
                os.makedirs(d, exist_ok=True)
                return self.send_json({'path': d})
            if path == '/api/project':
                f = os.path.join(PROJ, re.sub(r'[^\w\-]+', '_', q['name']) + '.json')
                open(f, 'w', encoding='utf-8').write(body.decode('utf-8'))
                return self.send_json({'ok': True})
            if path == '/api/export':
                return self.send_json(start_export(json.loads(body.decode('utf-8'))))
            self.send_error(404)
        except Exception as e:
            self.send_json({'error': str(e)}, 500)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8130
    print('TIVOT 剪輯器： http://localhost:%d/' % port, flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
