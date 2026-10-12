# 2026-10-12（Ray：「群體敵人已經拆分了 可以做」）：人型＋群戰每個人＋卡耶爾大軍每一隻的待機。
# 輸出 out/idle_group/<組>__<名>/；交件另跑（人 24 格 8fps、怪減半 12 格 4fps）。每支後歇 60 秒、每 15 支歇 8 分鐘。
import os, subprocess, time, glob, json
HERE = os.path.dirname(os.path.abspath(__file__)); R = r'C:\Users\Ray Ku\Desktop\TIVOT\resources'
OUT = os.path.join(HERE, 'out', 'idle_group'); PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
os.makedirs(OUT, exist_ok=True)
HUMAN = ('Anime illustration, smooth seamless looping animation. The person stands in front of a pure green background in a combat-ready stance, '
         'holding their weapon exactly as they are. They breathe steadily and visibly, the chest and shoulders rising and falling, the weight shifts subtly, '
         'the weapon tip sways slightly as they stay alert. Clothes, coat tails and hair flutter gently. Eyes stay open, face and expression stay the same, '
         'pose and position stay the same, the feet stay planted. Camera completely static, background always pure green, the figure stays the same size. '
         'Anime style, cel shading, clean lineart.')
J = []   # (組, 名, 來源圖, 模式/風格, 提示詞)
for n in ['man_nemo', 'man_bounty_ep'] + [f'man_thug_{k}' for k in ('pistol', 'rifle', 'dual', 'shotgun', 'lookout', 'boss')]:
    J.append(('single', n, os.path.join(R, 'enemy', n + '.webp'), 'default', HUMAN))
J.append(('single', 'npc_guildhunter_si_attack', os.path.join(R, 'si', 'npc', 'npc_guildhunter_si_attack.webp'), 'default', HUMAN))
for sc in ('hall', 'gate', 'avenue', 'fore', 'carr'):
    for p in sorted(glob.glob(os.path.join(R, '_originals', 'enemy', '_thug_layers', sc, 'final', 'thug_*.png'))):
        J.append(('thug_' + sc, os.path.splitext(os.path.basename(p))[0], p, 'default', HUMAN))
for sc in ('downtown', 'hotel', 'square', 'uptown'):
    for p in sorted(glob.glob(os.path.join(R, '_originals', 'background', 'capital', '_battle_wip', 'layers', sc, 'guard_[0-9].png'))):
        J.append(('cap_' + sc, os.path.splitext(os.path.basename(p))[0], p, 'default', HUMAN))
for p in sorted(glob.glob(os.path.join(R, '_originals', 'enemy', '_guards_layers', 'guard_[0-9].png'))):
    J.append(('misha_guards', os.path.splitext(os.path.basename(p))[0], p, 'default', HUMAN))
for d in sorted(glob.glob(os.path.join(R, 'enemy', 'canyon_swarm', 'fly*')), key=lambda x: int(x.split('fly')[-1])):
    for p in sorted(glob.glob(os.path.join(d, 'guard_*.webp'))):
        J.append((os.path.basename(d), os.path.splitext(os.path.basename(p))[0], p, 'default', None))
json.dump(J, open(os.path.join(OUT, '_jobs.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(J), 'jobs', flush=True)
n = 0
for g, name, src, st, prompt in J:
    key = f'{g}__{name}'
    if os.path.exists(os.path.join(OUT, key, 'meta.json')): continue
    print(time.strftime('%H:%M'), key, flush=True)
    cmd = [PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', src, '--mode', 'idle', '--style', st,
           '--fps', '8', '--length', '49', '--suffix', '', '--out', os.path.join(OUT, '_tmp')]
    if prompt: cmd += ['--prompt', prompt]
    subprocess.run(cmd, env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
    made = os.path.join(OUT, '_tmp', os.path.splitext(os.path.basename(src))[0])
    if os.path.exists(made): os.replace(made, os.path.join(OUT, key))
    n += 1
    time.sleep(480 if n % 15 == 0 else 60)
print('全部完成', flush=True)
