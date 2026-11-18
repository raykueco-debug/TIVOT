# 錨點對位頁（Ray 11-18：「把落鎚格跟待命格開成網頁給我 兩個疊一起 讓我調整 然後用我存好的落槌格當錨點」）
# 待命格（第 0 格）墊底、選一格疊上去，拖曳／方向鍵／滾輪調位置與大小，按「存」寫進 <格資料夾>/anchor.json：
#   {"frames":{"44":{"s":0.83,"dx":-12,"dy":40}, ...}}   ＝ 那一格要「乘 s 再平移 dx,dy（原始像素）」才對得上第 0 格
# 之後 apply_anchor.py 用這些錨點把整支片的變換內插出來。
# 用法：python anchor_tool.py <格資料夾> [--port 8141] [--frame 44]
import argparse, glob, json, os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
ap = argparse.ArgumentParser(); ap.add_argument('dir'); ap.add_argument('--port', type=int, default=8141); ap.add_argument('--frame', type=int, default=0)
a = ap.parse_args()
D = os.path.abspath(a.dir); AJ = os.path.join(D, 'anchor.json')
N = len(glob.glob(os.path.join(D, 'frame_*.webp')))
# 縮放的支點＝第 0 格的腳底中心（Ray：「不是改位置 是改大小」⇒ 調大小時腳不動）
import numpy as np
from PIL import Image
_a = np.asarray(Image.open(os.path.join(D, 'frame_00.webp')))[..., 3] > 128; _ys, _xs = np.where(_a); _by = int(_ys.max())
_bx = np.where(_a[_by - 60:_by + 1].any(0))[0]; PX, PY = int((_bx.min() + _bx.max()) / 2), _by
PAGE = r'''<!doctype html><html><head><meta charset="utf-8"><title>錨點對位</title><style>
body{margin:0;background:#1e1f26;color:#ddd;font:14px sans-serif;display:flex;height:100vh}
#side{width:300px;padding:12px;box-sizing:border-box;border-right:1px solid #333}
#side label{display:block;margin:10px 0 2px}#side input[type=range]{width:100%}
#wrap{flex:1;position:relative;overflow:hidden}#stage{position:absolute;left:50%;top:50%;transform-origin:0 0}
#stage img{position:absolute;left:0;top:0;image-rendering:auto}#top{cursor:move}
button{margin-top:12px;padding:8px 14px;font-size:15px}#msg{margin-top:8px;color:#8f8}.k{color:#999;font-size:12px}
</style></head><body><div id="side">
<div>待命格＝第 0 格（墊底）；大小以第 0 格腳底中心為支點</div>
<label>疊上去的格 <b id="fv"></b></label><input id="f" type="range" min="0" max="%N%" step="1">
<label>疊上格透明度 <b id="ov"></b></label><input id="o" type="range" min="0" max="1" step="0.01" value="0.55">
<label>大小 s <b id="sv"></b></label><input id="s" type="range" min="0.5" max="1.5" step="0.001">
<label>X <b id="xv"></b></label><input id="x" type="range" min="-400" max="400" step="1">
<label>Y <b id="yv"></b></label><input id="y" type="range" min="-600" max="600" step="1">
<label>檢視縮放</label><input id="z" type="range" min="0.2" max="1.5" step="0.01" value="0.6">
<button id="save">存這一格當錨點</button><button id="del">刪掉這一格的錨點</button><div id="msg"></div>
<p class="k">拖曳疊上格＝移動；方向鍵＝1px（Shift 10px）；滾輪／+ − ＝大小；PgDn／PgUp（或 . ,）＝下一格／上一格（沒存過的格＝原樣；按 C 套用前一個存過的格）；Enter＝存；已存的錨點：<span id="list"></span><br>已刪的格：<span id="drop"></span>（Delete＝把這一格從片子拿掉；Ctrl+Z＝救回最後刪的）</p>
</div><div id="wrap"><div id="stage"><img id="base"><img id="top"></div></div>
<script>
const N=%N%; let A=%A%; const PX=%PX%, PY=%PY%; const $=i=>document.getElementById(i);
let st={f:%F%,s:1,dx:0,dy:0};
const pad=n=>String(n).padStart(2,'0'), src=n=>'/frames/frame_'+pad(n)+'.webp';
const gone=n=>(A.drop||[]).includes(n);
function step(d){ let f=st.f; do{ f+=d; }while(f>=0 && f<=N && gone(f)); if(f>=0 && f<=N){ st.f=f; load(); } }   // 換格跳過已刪的格
function load(){ const r=(A.frames||{})[st.f]; if(r){st.s=r.s;st.dx=r.dx;st.dy=r.dy;} else {st.s=1;st.dx=0;st.dy=0;} draw(); }   // 沒存過的格＝原樣（Ray：「我存了後面的圖 為什麼前面的也跟著動」）；要沿用上一格的值按 C
function draw(){ $('base').src=src(0); $('top').src=src(st.f); $('f').value=st.f; $('fv').textContent=st.f;
  $('s').value=st.s; $('sv').textContent=st.s.toFixed(3); $('x').value=st.dx; $('xv').textContent=st.dx; $('y').value=st.dy; $('yv').textContent=st.dy;
  $('ov').textContent=$('o').value; $('top').style.opacity=$('o').value;
  $('top').style.transform=`translate(${st.dx}px,${st.dy}px) scale(${st.s})`; $('top').style.transformOrigin=PX+'px '+PY+'px';
  const z=+$('z').value, w=$('base').naturalWidth||700, h=$('base').naturalHeight||1100; $('stage').style.transform=`scale(${z}) translate(${-w/2}px,${-h/2}px)`;
  $('list').textContent=Object.keys(A.frames||{}).sort((a,b)=>a-b).join('、')||'（無）'; $('drop').textContent=(A.drop||[]).slice().sort((a,b)=>a-b).join('、')||'（無）';
  $('fv').textContent=st.f+'（剩 '+(N+1-(A.drop||[]).length)+' 格）'; }
$('f').oninput=e=>{st.f=+e.target.value; if(gone(st.f)) step(1); else load();}; $('o').oninput=draw; $('z').oninput=draw; $('base').onload=draw;
$('s').oninput=e=>{st.s=+e.target.value; draw();}; $('x').oninput=e=>{st.dx=+e.target.value; draw();}; $('y').oninput=e=>{st.dy=+e.target.value; draw();};
let drag=null; $('top').onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,dx:st.dx,dy:st.dy}; e.target.setPointerCapture(e.pointerId); e.preventDefault();};
$('top').onpointermove=e=>{ if(!drag) return; const z=+$('z').value; st.dx=Math.round(drag.dx+(e.clientX-drag.x)/z); st.dy=Math.round(drag.dy+(e.clientY-drag.y)/z); draw(); };
$('top').onpointerup=()=>drag=null;
$('wrap').onwheel=e=>{ e.preventDefault(); st.s=Math.max(0.3,st.s*(e.deltaY<0?1.005:0.995)); draw(); };
document.addEventListener('keydown', e=>{ if(document.activeElement && document.activeElement.tagName==='INPUT') document.activeElement.blur(); const k=e.shiftKey?10:1;
  if(e.key==='Delete'){ e.preventDefault(); if(st.f===0) return; const f=st.f; post({frame:f, drop:true}).then(()=>{ step(1); if(st.f===f) step(-1); }); return; }   // 刪＝這一格從片子裡拿掉，畫面直接換到下一格
  if(e.key==='z' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); const d=(A.drop||[]); if(d.length){ const f=d[d.length-1]; post({frame:f, drop:false}).then(()=>{ st.f=f; load(); }); } return; }   // Ctrl+Z＝救回最後刪的那一格
  if(e.key==='PageDown'){ e.preventDefault(); step(1); return; } if(e.key==='PageUp'){ e.preventDefault(); step(-1); return; } if(e.key==='ArrowLeft')st.dx-=k; else if(e.key==='ArrowRight')st.dx+=k; else if(e.key==='ArrowUp')st.dy-=k; else if(e.key==='ArrowDown')st.dy+=k;
  else if(e.key==='+'||e.key==='=')st.s*=1.002; else if(e.key==='-')st.s/=1.002;
  else if(e.key===','||e.key==='<'){ step(-1); return; } else if(e.key==='.'||e.key==='>'){ step(1); return; }
  else if(e.key==='Enter'){ $('save').click(); }
  else if(e.key==='c'||e.key==='C'){ const ks=Object.keys(A.frames||{}).map(Number).filter(k=>k<st.f).sort((a,b)=>b-a); if(ks.length){ const r=A.frames[ks[0]]; st.s=r.s; st.dx=r.dx; st.dy=r.dy; } } /* C＝套用前一個存過的格的值 */
  else return; e.preventDefault(); draw(); }, true);
async function post(body){ const r=await fetch('/save',{method:'POST',body:JSON.stringify(body)}); A=await r.json(); $('msg').textContent='已存（'+new Date().toLocaleTimeString()+'）'; draw(); return A; }
$('save').onclick=()=>post({frame:st.f,s:+st.s.toFixed(4),dx:st.dx,dy:st.dy});
$('del').onclick=()=>post({frame:st.f,del:true});
load();
</script></body></html>'''
def anchors():
    try: return json.load(open(AJ, encoding='utf-8'))
    except Exception: return {'frames': {}}
class H(SimpleHTTPRequestHandler):
    def log_message(self, *x): pass
    def do_GET(self):
        if self.path.startswith('/frames/'):
            f = os.path.join(D, os.path.basename(self.path.split('?')[0]))
            if os.path.exists(f):
                b = open(f, 'rb').read(); self.send_response(200); self.send_header('Content-Type', 'image/webp'); self.send_header('Cache-Control', 'no-store'); self.end_headers(); self.wfile.write(b); return
            self.send_error(404); return
        b = PAGE.replace('%N%', str(N - 1)).replace('%A%', json.dumps(anchors())).replace('%F%', str(a.frame)).replace('%PX%', str(PX)).replace('%PY%', str(PY)).encode('utf-8')
        self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.end_headers(); self.wfile.write(b)
    def do_POST(self):
        req = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        A = anchors(); A.setdefault('frames', {})
        if 'drop' in req:
            d = [x for x in A.get('drop', []) if x != int(req['frame'])]
            if req['drop']: d.append(int(req['frame']))
            A['drop'] = d
        elif req.get('del'): A['frames'].pop(str(req['frame']), None)
        else: A['frames'][str(req['frame'])] = {'s': req['s'], 'dx': req['dx'], 'dy': req['dy']}
        A['pivot'] = [PX, PY]
        json.dump(A, open(AJ, 'w', encoding='utf-8'), indent=1)
        b = json.dumps(A).encode(); self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(b)
print(f'http://localhost:{a.port}/  （{N} 格，錨點存在 {AJ}）', flush=True)
ThreadingHTTPServer(('127.0.0.1', a.port), H).serve_forever()
