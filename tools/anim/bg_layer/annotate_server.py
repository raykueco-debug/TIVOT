"""背景動畫註記頁的伺服器（背景線，4070）。
  python annotate_server.py [port]      → http://localhost:8132/
Ray 在背景圖上用各色半透明畫筆圈出「會動的那一塊」，每個顏色旁邊寫它怎麼動。
存檔：bg_layer/notes/<map>__<node>__<時段>/  notes.json ＋ 每色一張遮罩 <色名>.png（原圖解析度，白＝畫到的）
這些遮罩就是拆層用的遮罩（bg_comp.py 讀它，不再自動猜）。
"""
import base64, json, os, re, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

HERE = os.path.dirname(os.path.abspath(__file__))
BG = os.path.normpath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(HERE))), 'TIVOT', 'resources', 'background'))
NOTES = os.path.join(HERE, 'notes')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8132
SAFE = re.compile(r'^[A-Za-z0-9_\-]+$')


def note_dir(key):
    if not SAFE.match(key or ''): raise ValueError('bad key')
    return os.path.join(NOTES, key)


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=HERE, **k)
    def log_message(self, *a): pass

    def send_json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)

    def translate_path(self, path):
        p = unquote(urlsplit(path).path)
        if p.startswith('/bg/'):
            full = os.path.normpath(os.path.join(BG, p[4:]))
            if full.startswith(BG): return full
        if p.startswith('/notes/'):
            full = os.path.normpath(os.path.join(NOTES, p[7:]))
            if full.startswith(NOTES): return full
        return super().translate_path(path)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()

    def do_GET(self):
        p = urlsplit(self.path).path
        if p == '/': self.path = '/annotate.html'
        if p == '/api/loops':   # 每一格跑出來的循環：{key: [{var, frames, fps, seam, step}]}
            nodes = json.load(open(os.path.join(HERE, 'nodes.json'), encoding='utf8'))
            look = {}
            for n in nodes:
                for b, _f in n['files']: look[f"{n['map']}_{n['id']}_{b}"] = f"{n['map']}__{n['id']}__{b}"
            out = {}
            od = os.path.join(HERE, 'out')
            for dname in sorted(os.listdir(od)) if os.path.isdir(od) else []:
                mp = os.path.join(od, dname, 'meta.json')
                if not (os.path.isfile(mp) and os.path.isfile(os.path.join(od, dname, 'loop.mp4'))): continue
                base, _, var = dname.rpartition('_')
                if base not in look: continue
                m = json.load(open(mp, encoding='utf8'))
                out.setdefault(look[base], []).append({'var': var, 'dir': dname, 'frames': m.get('frames'), 'fps': m.get('fps'),
                    'seam': m.get('seam_diff'), 'step': m.get('mean_step_diff'), 't': int(os.path.getmtime(mp))})
            return self.send_json(out)
        if p == '/api/done':   # 哪些已經存過
            out = {}
            if os.path.isdir(NOTES):
                for k in os.listdir(NOTES):
                    f = os.path.join(NOTES, k, 'notes.json')
                    if os.path.isfile(f):
                        try:
                            j = json.load(open(f, encoding='utf8'))
                            out[k] = {'n': len(j.get('colors', [])), 'submitted': bool(j.get('submitted'))}
                        except Exception: pass
            return self.send_json(out)
        return super().do_GET()

    def do_POST(self):
        p = urlsplit(self.path).path
        n = int(self.headers.get('Content-Length', 0)); body = json.loads(self.rfile.read(n) or b'{}')
        if p == '/api/save':
            try:
                d = note_dir(body['key']); os.makedirs(d, exist_ok=True)
                for f in os.listdir(d):
                    if f.endswith('.png'): os.remove(os.path.join(d, f))   # 只清自己這一格先前存的遮罩（重存時同步）
                colors = []
                for c in body.get('colors', []):
                    if not SAFE.match(c['name']): continue
                    png = base64.b64decode(c['mask'].split(',', 1)[1])
                    open(os.path.join(d, c['name'] + '.png'), 'wb').write(png)
                    colors.append({'name': c['name'], 'rgb': c['rgb'], 'text': c.get('text', ''), 'mask': c['name'] + '.png'})
                meta = {k: body.get(k) for k in ('key', 'map', 'mapName', 'node', 'name', 'band', 'file', 'general', 'submitted', 'time')}
                meta['colors'] = colors
                json.dump(meta, open(os.path.join(d, 'notes.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
                return self.send_json({'ok': True, 'n': len(colors)})
            except Exception as e:
                return self.send_json({'ok': False, 'err': str(e)}, 400)
        return self.send_json({'ok': False}, 404)


if __name__ == '__main__':
    os.makedirs(NOTES, exist_ok=True)
    print(f'背景註記頁 http://localhost:{PORT}/   背景來源 {BG}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
