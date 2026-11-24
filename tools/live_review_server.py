"""背景即時版審閱頁的伺服器（11-24 Ray：「遊戲內即時跑每一個要給我 textbox 寫修正意見」）。
  python tools/live_review_server.py [port]   → http://localhost:8136/tools/live_review.html
靜態檔＝整個 TIVOT 根目錄；意見存在 tools/anim/bg_layer/live_notes.json（{格名: {text, time}}），背景副理照它修。"""
import json, os, sys, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOTES = os.path.join(ROOT, 'tools', 'anim', 'bg_layer', 'live_notes.json')
FIRE = os.path.join(ROOT, 'tools', 'anim', 'bg_layer', 'fire_place.json')   # 戰地放火：{格: [[x, y底, 寬]…]}（畫面比例）
SUBMIT = os.path.join(ROOT, 'tools', 'anim', 'bg_layer', 'live_submit.json')   # 提交紀錄：{time, count}，提交＝這一輪意見寫完了
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8136


def load():
    try: return json.load(open(NOTES, encoding='utf8'))
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
        if self.path.startswith('/api/live_notes'): return self.send_json(load())
        if self.path.startswith('/api/fire_place'):
            try: return self.send_json(json.load(open(FIRE, encoding='utf8')))
            except Exception: return self.send_json({})
        if self.path.startswith('/api/live_submit'):
            try: return self.send_json(json.load(open(SUBMIT, encoding='utf8')))
            except Exception: return self.send_json({})
        return super().do_GET()

    def do_POST(self):
        d = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
        if self.path.startswith('/api/fire_place'):
            try: f = json.load(open(FIRE, encoding='utf8'))
            except Exception: f = {}
            k, sp = str(d.get('key', '')), d.get('spots') or []
            if not k: self.send_error(400); return
            if sp: f[k] = [[round(float(v), 4) for v in s_[:3]] for s_ in sp]
            else: f.pop(k, None)
            json.dump(f, open(FIRE, 'w', encoding='utf8'), indent=0); return self.send_json({'ok': True, 'time': time.strftime('%Y-%m-%d %H:%M'), 'n': len(sp)})
        if self.path.startswith('/api/live_submit'):
            j = {'time': time.strftime('%Y-%m-%d %H:%M'), 'count': len(load())}
            json.dump(j, open(SUBMIT, 'w', encoding='utf8'), ensure_ascii=False); return self.send_json(j)
        if not self.path.startswith('/api/live_notes'): self.send_error(404); return
        k, t = str(d.get('key', '')), str(d.get('text', ''))
        if not k: self.send_error(400); return
        n = load()
        if t.strip(): n[k] = {'text': t, 'time': time.strftime('%Y-%m-%d %H:%M')}
        else: n.pop(k, None)
        json.dump(n, open(NOTES, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        self.send_json({'ok': True, 'time': n.get(k, {}).get('time')})


if __name__ == '__main__':
    print(f'http://localhost:{PORT}/tools/live_review.html', flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
