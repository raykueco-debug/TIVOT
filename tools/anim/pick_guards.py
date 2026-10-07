# 群戰每人 5 格：前 1/3 密抽（0、15%、33%、60%、100%），48 格原片
import glob, json, os, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out')
SQ, DST = os.path.join(OUT, 'guards'), os.path.join(OUT, 'guards_pick')
REL = [2/15, 7/15, 9/15, 12/15, 1]   # Ray：16 格抽第 3、8、10、13、16 格（1 起算）
os.makedirs(DST, exist_ok=True); rows = []
for d in sorted(glob.glob(os.path.join(SQ, '*_guard_*'))):
    if d.endswith('_8f') or not os.path.exists(os.path.join(d, 'meta.json')): continue
    name = os.path.basename(d); L = sorted(glob.glob(os.path.join(d, 'frame_*.webp'))); n = len(L)
    # Ray：前快後慢 —— 第 1 格＝原圖（Wan 第 0 格近似）、第 3 格起手、一口氣跳到衝擊最大處（第 7～10 格，看這人實際動多快）、之後平均倒到最後
    import numpy as np
    from PIL import Image
    A = [np.asarray(Image.open(q).convert('RGBA'))[..., 3] > 60 for q in L]
    mv = np.array([(a ^ A[0]).sum() for a in A], float); mv = mv / max(mv[-1], 1)
    J = 7 if mv[7] >= 0.55 else 8   # 第 8 或 9 格（1 起算）：衝擊快的人跳到 8、慢的跳到 9
    idx = [0, 6, 8, 10, 12, 14]   # Ray：原圖 → 直接跳第 7 格，之後 9、11、13、15（1 起算）

    od = os.path.join(DST, name); os.makedirs(od, exist_ok=True)
    for j, i in enumerate(idx): shutil.copy(L[i], os.path.join(od, f'frame_{j:02d}.webp'))
    kind = json.load(open(os.path.join(d, 'meta.json'), encoding='utf-8')).get('prompt', '')
    k = '往前倒' if 'forward face-down' in kind else ('垂頭' if 'prone' in kind else '往後倒')
    rows.append((name, k, idx))
cards = ''.join(f'''<div class=r><b>{n}</b> <small>{k}｜原格 {ix}</small><div class=s>
<img class=a data-n="{n}" src="{n}/frame_00.webp">{''.join(f'<img src="{n}/frame_{j:02d}.webp">' for j in range(len(idx)))}</div></div>''' for n, k, ix in rows)
open(os.path.join(DST, 'index.html'), 'w', encoding='utf-8').write(f'''<!doctype html><meta charset="utf-8"><title>衛士中槍 5 格</title>
<style>body{{margin:0;background:#15151b;color:#ccc;font:14px sans-serif;padding:10px}}.r{{margin:10px 0}}.s{{display:flex;gap:6px;margin-top:4px}}
img{{width:130px;height:195px;object-fit:contain;background:#2a2730}}img.a{{outline:2px solid #fc6}}small{{color:#999}}</style>
<p>衛士／親衛隊中槍（{len(rows)}／19）　黃框播一次（空白鍵／點圖／<button id=rp>▶ 重播</button>）　速度 <input id=f type=range min=4 max=16 value=10> <b id=fv>10</b> fps</p>{cards}
<script>let fps=10,t=null;const as=[...document.querySelectorAll('img.a')];let k=0;
function go(){{clearInterval(t);k=0;as.forEach(a=>a.src=a.dataset.n+'/frame_00.webp');t=setInterval(()=>{{if(k>=5){{clearInterval(t);return}}k++;as.forEach(a=>a.src=a.dataset.n+'/frame_0'+k+'.webp')}},1000/fps)}}
document.getElementById('f').oninput=e=>{{fps=+e.target.value;document.getElementById('fv').textContent=fps;go()}};
document.getElementById('rp').onclick=go;document.addEventListener('keydown',e=>{{if(e.key===' '){{e.preventDefault();go()}}}});
as.forEach(a=>a.onclick=go);go();</script>''')
print(len(rows), [r[0] for r in rows])
