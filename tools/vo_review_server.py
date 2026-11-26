"""語音重生試聽頁的伺服器（11-25 Ray：「開頁面給我聽　附 textbox 寫意見」）。
  python tools/vo_review_server.py [port] [資料夾]   → http://localhost:8137/tools/vo_review.html
靜態檔＝整個 TIVOT 根目錄；意見存在 resources/audio/_raw/vo_regen_1125/notes.json（{項目: {text, time}}），提交存 submit.json。"""
import json, os, sys, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'resources', 'audio', '_raw', sys.argv[2] if len(sys.argv) > 2 else 'vo_regen_1125')   # 第二個參數＝哪一批（11-26 讚聲：vo_cheer_1126）
NOTES = os.path.join(DIR, 'notes.json')
SUBMIT = os.path.join(DIR, 'submit.json')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8137


def load(p):
    try: return json.load(open(p, encoding='utf8'))
    except Exception: return {}


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
    def end_headers(self): self.send_header('Cache-Control', 'no-store'); super().end_headers()

    def send_json(self, o):
        b = json.dumps(o, ensure_ascii=False).encode(); self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def do_GET(self):
        if self.path.startswith('/api/vo_notes'): return self.send_json(load(NOTES))
        if self.path.startswith('/api/vo_submit'): return self.send_json(load(SUBMIT))
        return super().do_GET()

    def do_POST(self):
        d = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
        if self.path.startswith('/api/vo_submit'):
            j = {'time': time.strftime('%Y-%m-%d %H:%M'), 'count': len(load(NOTES))}
            json.dump(j, open(SUBMIT, 'w', encoding='utf8'), ensure_ascii=False); return self.send_json(j)
        if not self.path.startswith('/api/vo_notes'): self.send_error(404); return
        k, t = str(d.get('key', '')), str(d.get('text', ''))
        if not k: self.send_error(400); return
        n = load(NOTES)
        if t.strip(): n[k] = {'text': t, 'time': time.strftime('%Y-%m-%d %H:%M')}
        else: n.pop(k, None)
        json.dump(n, open(NOTES, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        self.send_json({'ok': True, 'time': n.get(k, {}).get('time')})


if __name__ == '__main__':
    print(f'http://localhost:{PORT}/tools/vo_review.html', flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
