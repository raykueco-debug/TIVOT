"""已出未交的格子＋每格一個修改意見框（存到 review.json，經 annotate_server 的 /api/review）。"""
import os, json, glob, time
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
dl = json.load(open('delivered.json', encoding='utf8')); items = []
for d in glob.glob('out/*_sep_F') + glob.glob('out/*_sep_Frev4'):
    if not os.path.exists(d + '/loop.mp4'): continue
    m = json.load(open(d + '/meta.json', encoding='utf8')) if os.path.exists(d + '/meta.json') else {}
    k = m.get('key')
    if not k or k in dl: continue
    n = json.load(open(f'notes/{k}/notes.json', encoding='utf8'))['name'] if os.path.exists(f'notes/{k}/notes.json') else k
    items.append((os.path.getmtime(d + '/loop.mp4'), n, d))
for d in glob.glob('out/*_war*'):
    if '_rej' in d or not os.path.exists(d + '/loop.mp4'): continue
    nm = os.path.basename(d).split('_war')[0]
    if nm in dl: continue
    items.append((os.path.getmtime(d + '/loop.mp4'), nm, d))
items.sort(reverse=True)
cards = ''.join(f'<div class=c><video src="{d}/loop.mp4?t={int(t)}" muted loop playsinline preload=none></video><div class=t>{n}<small>　{time.strftime("%m-%d %H:%M", time.localtime(t))}　{os.path.basename(d)}</small></div><textarea data-id="{os.path.basename(d)}" placeholder="修改意見（空白＝可交）"></textarea></div>' for t, n, d in items)
js = '''<script>
const io=new IntersectionObserver(es=>es.forEach(e=>{const v=e.target;if(e.isIntersecting){v.preload='auto';v.play().catch(()=>{})}else v.pause()}));
document.querySelectorAll('video').forEach(v=>io.observe(v));
fetch('/api/review').then(r=>r.json()).then(d=>{document.querySelectorAll('textarea').forEach(t=>{if(d[t.dataset.id])t.value=d[t.dataset.id].text})});
async function save(){const items={};document.querySelectorAll('textarea').forEach(t=>{if(t.value.trim())items[t.dataset.id]=t.value.trim()});
 const r=await (await fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})})).json();
 document.getElementById('st').textContent=r.ok?('已儲存提交 '+r.n+' 則　'+new Date().toLocaleTimeString()):'儲存失敗';}
</script>'''
h = ('<!doctype html><meta charset=utf-8><title>已出未交 審閱</title><style>body{background:#141418;color:#ddd;font:14px sans-serif;margin:0}'
     '.bar{position:sticky;top:0;z-index:5;background:#1b1b22;padding:10px 12px;display:flex;gap:12px;align-items:center;border-bottom:1px solid #333}'
     'h1{font-size:17px;color:#e8c46a;margin:0}button{background:#e8c46a;color:#111;border:0;border-radius:6px;padding:8px 18px;font-size:15px;cursor:pointer}'
     '#st{color:#9c9}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:10px;padding:12px}.c{background:#1e1e24;border-radius:6px;overflow:hidden}'
     'video{width:100%;display:block;aspect-ratio:3/2;background:#000}.t{padding:5px 8px}small{color:#888}'
     'textarea{width:calc(100% - 16px);margin:0 8px 8px;min-height:44px;background:#111;color:#eee;border:1px solid #444;border-radius:4px;padding:6px;font-size:14px;box-sizing:border-box}</style>'
     f'<div class=bar><h1>已出未交（{len(items)} 支，最新在前）</h1><button onclick="save()">儲存提交</button><span id=st></span></div><div class=g>')
open('review.html', 'w', encoding='utf-8').write(h + cards + '</div>' + js); print(len(items))
