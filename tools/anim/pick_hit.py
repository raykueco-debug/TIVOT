# 中槍倒下：依「階段」抽 4 格（Ray 的 bounty_ep 剪法，倒地只留 1 格）
#  往後倒：中槍 → 打飛到最開（輪廓最寬）→ 墜落（中間）→ 著地（高度第一次落到最終值附近）
#  往前跪：中槍 → 膝蓋一軟（高度下降 30%）→ 跪地（下降 70%）→ 倒地（落到最終值附近）
# 有 alpha 的看輪廓；整張含背景的（ci 模式）沒有 alpha，退回平均抽。
import glob, json, os, shutil, subprocess, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out')
HIT, DST = os.path.join(OUT, 'hit'), os.path.join(OUT, 'hit_pick')
SRC = r'C:\Users\Ray Ku\Desktop\TIVOT\resources\enemy'
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
os.makedirs(DST, exist_ok=True)
rows = []
for d in sorted(glob.glob(os.path.join(HIT, 'man_*'))):
    name = os.path.basename(d)
    if name.endswith(('_dense', '_all')) or not os.path.exists(os.path.join(d, 'meta.json')): continue
    m = json.load(open(os.path.join(d, 'meta.json'), encoding='utf-8'))
    kneel = m.get('style') != 'back'
    # Ray 的 bounty_ep 剪法在 10 格版上是 0、3、4、7（倒地只留 1 格）—— 依比例套到每一隻
    L = sorted(glob.glob(os.path.join(d, 'frame_*.webp'))); n = len(L)
    rel = [0, 0.15, 0.33, 0.6, 1]   # Ray：5 格、不均抽 —— 中彈到大仰（前 1/3）密抽 3 格，之後墜落 1 格＋倒地 1 格
    idx = [round(r * (n - 1)) for r in rel]
    od = os.path.join(DST, name)
    if os.path.exists(od): shutil.rmtree(od)
    os.makedirs(od)
    for j, i in enumerate(idx): shutil.copy(L[i], os.path.join(od, f'frame_{j:02d}.webp'))
    json.dump({'from': os.path.relpath(os.path.dirname(L[0]), OUT), 'kept_index': idx, 'kneel': kneel, 'mode': m['mode']},
              open(os.path.join(od, 'pick.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    rows.append((name, kneel, m['mode'], idx))
    print(name, 'kneel' if kneel else 'back', m['mode'], idx, flush=True)
# 總覽頁：每隻 4 格靜態並排 ＋ 一個循環播放
cards = ''.join(f'''<div class=r><b>{n}</b> <small>{'往前跪' if k else '往後倒'}｜{md}｜原格 {ix}</small><div class=s>
<img class=a data-n="{n}" src="{n}/frame_00.webp">{''.join(f'<img src="{n}/frame_{j:02d}.webp">' for j in range(5))}</div></div>''' for n, k, md, ix in rows)
open(os.path.join(DST, 'index.html'), 'w', encoding='utf-8').write(f'''<!doctype html><meta charset="utf-8"><title>中槍倒下 4 格</title>
<style>body{{margin:0;background:#15151b;color:#ccc;font:14px sans-serif;padding:10px}}.r{{margin:10px 0}}.s{{display:flex;gap:6px;margin-top:4px}}
img{{width:150px;height:225px;object-fit:contain;background:#2a2730}}img.a{{outline:2px solid #fc6}}small{{color:#999}}</style>
<p>黃框＝播一次（空白鍵／點圖／<button id=rp>▶ 重播</button>）（速度 <input id=f type=range min=4 max=16 value=10> <b id=fv>10</b> fps）；右邊 4 格＝抽出的關鍵格</p>{cards}
<script>let fps=10,t=null;const as=[...document.querySelectorAll('img.a')];let k=0;
function go(){{clearInterval(t);k=0;as.forEach(a=>a.src=a.dataset.n+'/frame_00.webp');t=setInterval(()=>{{if(k>=4){{clearInterval(t);return}}k++;as.forEach(a=>a.src=a.dataset.n+'/frame_0'+k+'.webp')}},1000/fps)}}
document.getElementById('f').oninput=e=>{{fps=+e.target.value;document.getElementById('fv').textContent=fps;go()}};
document.getElementById('rp').onclick=go;document.addEventListener('keydown',e=>{{if(e.key===' '){{e.preventDefault();go()}}}});
as.forEach(a=>a.onclick=go);go();</script>''')
print('done', len(rows))
