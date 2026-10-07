# 怪物待機（idle）批量：逐張跑 tivot_wan.py，每張後歇 90 秒、每 10 張歇 10 分鐘，每 10 張重寫總檢查頁。
import glob, json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r'C:\Users\Ray Ku\Desktop\TIVOT\resources\enemy'
OUT = os.path.join(HERE, 'out', 'monsters')
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
REST_EACH, REST_TEN = 90, 600
os.makedirs(OUT, exist_ok=True)
files = sorted(glob.glob(os.path.join(SRC, 'mon_*.webp')))

def page():
    metas = [json.load(open(p, encoding='utf-8')) for p in sorted(glob.glob(os.path.join(OUT, '*', 'meta.json')))]
    cards = ''.join(f'<div class=c><img data-f=\'{json.dumps([m["name"]+"/"+f for f in m["frames"]])}\' '
                    f'data-fps="{m["fps"]}" src="{m["name"]}/{m["frames"][0]}"><p>{i+1}. {m["name"]}<br>{m.get("style","")}｜seed {m["seed"]}</p></div>'
                    for i, m in enumerate(metas))
    html = f'''<!doctype html><meta charset="utf-8"><title>怪物待機總檢查</title>
<style>body{{margin:0;background:#15151b;color:#ccc;font:13px sans-serif}}h1{{font-size:16px;padding:10px}}
.g{{display:flex;flex-wrap:wrap;gap:8px;padding:8px}}.c{{width:240px;background:#24222b;text-align:center}}
.c img{{width:240px;height:360px;object-fit:contain;background:#3a3642}}p{{margin:4px}}</style>
<h1>怪物待機（idle）{len(metas)}／{len(files)}｜更新 {time.strftime("%m-%d %H:%M")}</h1><div class=g>{cards}</div>
<script>document.querySelectorAll('img[data-f]').forEach(im=>{{const F=JSON.parse(im.dataset.f);let i=0;
F.forEach(u=>{{new Image().src=u}});setInterval(()=>{{i=(i+1)%F.length;im.src=F[i]}},1000/im.dataset.fps)}});</script>'''
    open(os.path.join(OUT, 'check.html'), 'w', encoding='utf-8').write(html)

def style(name):
    n = name[4:]
    if n.startswith(('relic_', 'reliquary_', 'gravekeeper', 'rictus_')) or n in EERIE: return 'eerie'
    if n.startswith(('bear_', 'beast_', 'stag_', 'shinierforest_', 'wolf_')) or n in BEAST: return 'beast'
    return 'default'
EERIE = {'arch_warden','bellfounder','candelabra_fiend','chain_hanged','choir_organ','choir_pale','grave_censer','iron_maiden',
         'kneeling_penitent','ossuary_wheel','pall_bearers','sarcoph_crawler','shroud_widow','skull_cairn','slab_creeper',
         'spiral_veil','halo_ring'}
BEAST = {'pallid_stag','crypt_hound','twin_skull_hound','tomb_bear','ossuary_rats','vault_bat','stone_adder','gorge_toad',
         'bug_mantis','crypt_centipede'}
n = 0
# 接手時若上一個 tivot_wan.py 還在跑，等它跑完
while 'tivot_wan.py' in subprocess.run(['powershell','-NoProfile','-c',
        "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | % CommandLine"],capture_output=True,text=True).stdout:
    time.sleep(15)
for f in files:
    name = os.path.splitext(os.path.basename(f))[0]
    if os.path.exists(os.path.join(OUT, name, 'meta.json')): continue
    print(time.strftime('%H:%M'), name, flush=True)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', f, '--mode', 'idle', '--style', style(name), '--fps', '8', '--length', '49', '--out', OUT],
                   env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
    n += 1
    if n % 10 == 0:
        page(); print('— 檢查頁已更新，休息 10 分鐘', flush=True); time.sleep(REST_TEN)
    else:
        time.sleep(REST_EACH)
page(); print('全部完成', flush=True)
