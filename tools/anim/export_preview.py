# 給輸出資料夾寫一份獨立的 preview.html（雙擊就能播：一次／循環／逐格／倍速）
import glob, json, os, sys
def write(d, fps=16):
    fs = sorted(os.path.basename(f) for f in glob.glob(os.path.join(d, 'frame_*.webp')))
    name = os.path.basename(d)
    html = f'''<!doctype html><meta charset="utf-8"><title>{name}</title>
<style>body{{margin:0;background:#15151b;color:#ccc;font:14px sans-serif;text-align:center}}img{{width:420px;height:630px;object-fit:contain;background:#2a2730}}button{{padding:5px 12px;font-size:14px}}#n{{font:15px monospace;color:#fc6}}</style>
<p>{name}｜{len(fs)} 格</p>
<p><button id=pv>◀</button> <button id=pp>▶ 播放</button> <button id=nx>▶|</button>
<label><input type=checkbox id=lp> 循環</label>
倍速 <input id=sp type=range min=0.1 max=3 step=0.05 value=1 style="width:160px"> <b id=spv>1.00×</b>（基準 {fps:g} fps）</p>
<div id=n></div><img id=im>
<p><small>空白＝播放/暫停・← →＝逐格</small></p>
<script>const F={json.dumps(fs)},B={fps};let i=0,t=null;const $=x=>document.getElementById(x),im=$('im');
F.forEach(u=>{{new Image().src=u}});
function show(){{im.src=F[i];$('n').textContent=`第 ${{i}} / ${{F.length-1}} 格　${{(B*$('sp').value).toFixed(1)}} fps`}}
function stop(){{clearInterval(t);t=null;$('pp').textContent='▶ 播放'}}
function play(){{if(i>=F.length-1)i=0;show();clearInterval(t);$('pp').textContent='⏸ 暫停';
 t=setInterval(()=>{{if(i>=F.length-1){{if($('lp').checked)i=0;else{{stop();return}}}}else i++;show()}},1000/(B*$('sp').value))}}
function step(d){{stop();i=Math.max(0,Math.min(F.length-1,i+d));show()}}
$('pp').onclick=()=>t?stop():play();$('pv').onclick=()=>step(-1);$('nx').onclick=()=>step(1);
$('sp').oninput=()=>{{$('spv').textContent=(+$('sp').value).toFixed(2)+'×';show();if(t)play()}};
document.addEventListener('keydown',e=>{{if(e.key===' '){{e.preventDefault();t?stop():play()}}else if(e.key==='ArrowRight')step(1);else if(e.key==='ArrowLeft')step(-1)}});
show();</script>'''
    open(os.path.join(d, 'preview.html'), 'w', encoding='utf-8').write(html)
if __name__ == '__main__':
    for d in sys.argv[1:]: write(d)
