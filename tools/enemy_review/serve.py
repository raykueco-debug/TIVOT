# 敵人動畫審閱頁：http://localhost:8150/tools/enemy_review/index.html
# 根目錄＝TIVOT（素材照原路徑讀，唯讀）。
#   GET  /tools/enemy_review/data.json  每次重掃（build.py）
#   POST /review/save    → 草稿存 resources/enemy/anim/_review/draft.json（覆蓋）
#   POST /review/submit  → 提交存 resources/enemy/anim/_review/submit_<時間>.json（不覆蓋），敵人副理讀這裡
import json, os, sys, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'resources', 'enemy', 'anim', '_review')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8150
sys.path.insert(0, HERE)
import build


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()

    def do_GET(self):
        if self.path.split('?')[0] == '/tools/enemy_review/data.json':
            build.build()
        elif self.path.split('?')[0] == '/review/draft':
            p = os.path.join(OUT, f'draft{self.page()}.json')
            return self.reply(json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {})
        return super().do_GET()

    def page(self):
        """?page=canyon → '_canyon'（各審閱頁的草稿與提交分開存）。"""
        from urllib.parse import urlsplit, parse_qs
        v = parse_qs(urlsplit(self.path).query).get('page', [''])[0]
        v = ''.join(c for c in v if c.isalnum() or c in '_-')
        return '_' + v if v else ''

    def reply(self, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)

    def do_POST(self):
        try:
            data = json.loads(self.rfile.read(int(self.headers['Content-Length'])).decode('utf-8'))
            os.makedirs(OUT, exist_ok=True)
            route = self.path.split('?')[0]
            if route == '/review/save':
                p = os.path.join(OUT, f'draft{self.page()}.json')
            elif route == '/review/submit':
                p = os.path.join(OUT, time.strftime(f'submit{self.page()}_%Y%m%d_%H%M%S.json'))
                n = 2
                while os.path.exists(p):
                    p = p[:-5] + f'_{n}.json'; n += 1
            else:
                self.send_error(404); return
            json.dump(data, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            self.reply({'ok': True, 'path': os.path.relpath(p, ROOT).replace('\\', '/')})
        except Exception as e:
            self.reply({'ok': False, 'error': str(e)})


print(f'http://localhost:{PORT}/tools/enemy_review/index.html', flush=True)
ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
