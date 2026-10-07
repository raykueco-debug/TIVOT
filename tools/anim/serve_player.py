# 播放器的本機伺服器：http://localhost:8130/player.html
# 「輸出」鈕 POST /export → 把保留的格照順序重新編號，複製到 out/export/<名字>/frame_00.webp…
import json, os, shutil, subprocess, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out')
PORT = 8130
GAME = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'TIVOT', 'resources', 'ci', 'anim')   # /gameanim/ → 遊戲交件

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=OUT, **k)
    def log_message(self, *a): pass
    def translate_path(self, path):
        from urllib.parse import unquote, urlsplit
        p = unquote(urlsplit(path).path)
        if p.startswith('/gameanim/'):
            return os.path.join(GAME, *[x for x in p[len('/gameanim/'):].split('/') if x not in ('', '.', '..')])
        return super().translate_path(path)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def do_GET(self):
        if self.path.startswith('/player_list.js'):      # 每次重新掃，新動檔不必手動跑 make_player
            subprocess.run([sys.executable, os.path.join(HERE, 'make_player.py')], capture_output=True)
        return super().do_GET()
    def do_POST(self):
        if self.path != '/export': self.send_error(404); return
        try:
            req = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            d = req['dir']
            src = os.path.join(GAME, d[len('gameanim/'):]) if d.startswith('gameanim/') else os.path.normpath(os.path.join(OUT, d))
            miss = [f for f in req['frames'] if not os.path.exists(os.path.join(src, f))]
            if miss: raise FileNotFoundError(f'來源資料夾已不存在或被移走（{req["dir"]}，缺 {len(miss)} 格）—— 請重新整理播放器')
            name = ''.join(c for c in req['name'] if c.isalnum() or c in '_-.') or 'export'
            dst = os.path.join(OUT, 'export', name)
            if os.path.exists(dst):                       # 不覆蓋：自動加尾碼
                n = 2
                while os.path.exists(f'{dst}_{n}'): n += 1
                dst = f'{dst}_{n}'
            os.makedirs(dst)
            for j, f in enumerate(req['frames']):
                shutil.copy(os.path.join(src, f), os.path.join(dst, f'frame_{j:02d}.webp'))
            json.dump({'from': req['dir'], 'kept_index': req['keep'], 'fps': req.get('fps')},
                      open(os.path.join(dst, 'export.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            sys.path.insert(0, HERE); import export_preview; export_preview.write(dst, req.get('fps') or 16)
            body = json.dumps({'ok': True, 'path': dst, 'count': len(req['frames'])}, ensure_ascii=False).encode()
        except Exception as e:
            body = json.dumps({'ok': False, 'error': str(e)}, ensure_ascii=False).encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)

print(f'http://localhost:{PORT}/player.html', flush=True)
ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
