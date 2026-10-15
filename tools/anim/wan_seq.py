"""Wan 整段播放：從中彈到跪倒取 N 格（6 / 12 / 24），綠幕去背，嵌進播放頁比較；印出每種的總大小。"""
import base64, io, os, glob
import numpy as np
from PIL import Image

OUT = r'C:\Users\Ray Ku\Desktop\ComfyUI-master\output\wan'
D = r'C:\Users\Ray Ku\Desktop\TIVOT\resources\_originals\enemy\_churchsquad'
BG = r'C:\Users\Ray Ku\Desktop\TIVOT\resources\_originals\background\capital\_battle_wip\capital_hotel_battle_v2.png'
ps = sorted(glob.glob(os.path.join(OUT, 'guard_hit_*.png')))
A, Z = 8, 44            # 中彈開始 → 跪定（0 起算）

def key(im):
    a = np.asarray(im.convert('RGB')).astype(float)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    gex = g - np.maximum(r, b)
    al = 1 - np.clip((gex - 25) / 70, 0, 1)
    g2 = np.minimum(g, (r + b) / 2 + 6)          # 去溢色加強
    return Image.fromarray(np.dstack([r, g2, b, al * 255]).clip(0, 255).astype(np.uint8))

def uri(im, q=82):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q); d = b.getvalue()
    return 'data:image/webp;base64,' + base64.b64encode(d).decode(), len(d)

W = 512
stand_u, _ = uri(key(Image.open(ps[0])).resize((W, int(W * 1.5)), Image.LANCZOS))
sets, sizes = {}, {}
for n in ('half',):
    idx = list(range(A, Z + 1, 4))
    us, tot = [], 0
    for i in idx:
        u, sz = uri(key(Image.open(ps[i])).resize((W, int(W * 1.5)), Image.LANCZOS)); us.append(u); tot += sz
    sets[n] = us; sizes[n] = tot

bg = Image.open(BG).convert('RGB'); H = 768; s = max(W / bg.width, H / bg.height)
bgr = bg.resize((round(bg.width * s), round(bg.height * s))); x0 = (bgr.width - W) // 2
bg_u, _ = uri(bgr.crop((x0, 0, x0 + W, H)), 78)

import json
html = f'''<!doctype html><html><head><meta charset="utf-8"><title>Wan 整段播放</title>
<style>body{{margin:0;background:#15151b;color:#ddd;font-family:sans-serif;text-align:center}}
.stage{{position:relative;width:340px;height:510px;margin:10px auto;overflow:hidden;background:url({bg_u}) center/cover;border:1px solid #444}}
.stage img{{position:absolute;left:0;bottom:-6%;width:100%}}.flash{{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}}
button{{margin:6px;padding:8px 16px;font-size:14px}} p{{font-size:12px;color:#999;margin:4px}}</style></head><body>
<div><button data-n="half" data-t="1200">1.2 秒（{len(sets['half'])} 格，{sizes['half']//1024} KB）</button><button data-n="half" data-t="900">0.9 秒（定案）</button><button data-n="half" data-t="600">0.6 秒</button></div>
<div><label><input type="checkbox" id="slow"> 慢速 ×3</label></div>
<div class="stage"><img id="im" src="{stand_u}"><div class="flash"></div></div>
<p>中彈 → 跪倒每 4 格取一張，照格播放，動畫一開始就同時淡出（淡完＝播完）。程式不做任何變形。</p>
<p>大小＝這一段的格子總和（512 寬 WebP，正式版解析度另計）</p>
<script>
const SETS={json.dumps(sets)}, STAND="{stand_u}";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// 預先解碼，避免播放時閃
for(const n in SETS) SETS[n].forEach(u=>{{const i=new Image(); i.src=u;}});
async function play(n,T){{const k=document.getElementById('slow').checked?3:1, im=document.getElementById('im'), st=document.querySelector('.stage');
 im.getAnimations().forEach(a=>a.cancel()); im.style.opacity=1; im.src=STAND; await sleep(500*k);
 st.querySelector('.flash').animate([{{opacity:.85}},{{opacity:0}}],{{duration:140*k}});
 const fr=SETS[n], dt=T/fr.length*k;
 im.animate([{{opacity:1}},{{opacity:0}}],{{duration:T*k,easing:'ease-in',fill:'forwards'}});   // 動畫一開始就同時淡出
 for(const u of fr){{ im.src=u; await sleep(dt); }} }}
document.querySelectorAll('button[data-n]').forEach(b=>b.onclick=()=>play(b.dataset.n,+b.dataset.t));
</script></body></html>'''
out = os.path.join(D, 'wan_seq_test.html'); open(out, 'w', encoding='utf-8').write(html)
print('ok', len(sets['half']), sizes['half']//1024,'KB')
