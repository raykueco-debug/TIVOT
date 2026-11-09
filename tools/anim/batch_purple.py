# 2026-11-03 紫月軍（溫斯摩爾港守城戰）小隊 1～7：每人一支中槍倒地＋一支待機呼吸。
# 來源：有全身原稿（_originals/enemy/_purple_layers/squad_N/soldier_K.png）就用它；這台沒有時，只做「不被掩體剪」的人（分層 webp＝全身）。
# 輸出 out/purple_hit/<sN_sK>/、out/purple_idle/<sN_sK>/。先跑全部倒地，再跑待機。倒地後歇 30 秒、待機後歇 60 秒。
import os, shutil, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); R = r'C:\Users\Ray Ku\Desktop\TIVOT\resources'
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
IN = os.path.join(HERE, 'in_purple'); OH, OI = os.path.join(HERE, 'out', 'purple_hit'), os.path.join(HERE, 'out', 'purple_idle')
for d in (IN, OH, OI): os.makedirs(d, exist_ok=True)
CLEAN = ('No blood at all: no blood stains, drops, spray, red liquid or wounds; clothes stay clean. No gunfire at all: no muzzle flash, '
         'no bullets, no sparks, no smoke, no light effects. Pure green background. Camera completely static. Anime style, cel shading.')
P = {'back': 'Anime illustration. The rifle soldier is shot in the chest: the upper body snaps backward, the head whips back, the rifle drops '
             'from the hands, and the soldier falls backward onto the ground. ' + CLEAN,
     'forward': 'Anime illustration. The rifle soldier is shot in the chest: the soldier jerks, the knees buckle, the rifle drops, and the soldier collapses forward '
                'face-down onto the ground toward the camera. ' + CLEAN}
IDLE = ('Anime illustration, smooth seamless looping animation. The soldier is in front of a pure green background and keeps exactly their current combat pose, '
        'holding the rifle exactly as they are. They breathe steadily and visibly, the chest and shoulders rising and falling, the weight shifts subtly, '
        'the rifle tip sways slightly as they stay alert. Clothes, coat tails and hair flutter gently. Eyes stay open, face and expression stay the same, '
        'pose and position stay the same. Camera completely static, background always pure green, the figure stays the same size. '
        'Anime style, cel shading, clean lineart.')
# 倒法：槍口朝鏡頭／跪姿／奔跑衝鋒 → 往前撲倒；其餘（側向瞄準、騰空、大喊）→ 往後倒
FWD = {(1, 1), (1, 4), (1, 5), (2, 2), (2, 3), (3, 1), (3, 3), (4, 1), (4, 2), (5, 2), (5, 4), (6, 2), (6, 3), (7, 2), (7, 3)}
UNCUT = {(1, 4), (1, 5), (2, 2), (3, 5), (4, 2), (4, 3), (5, 4), (6, 3), (7, 3)}   # _purple_spec.md 寫「不剪」的人
COUNT = {1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 4, 7: 5}
ONLY_UNCUT = '--uncut' in sys.argv
J = []
for sq, n in COUNT.items():
    for k in range(1, n + 1):
        full = os.path.join(R, '_originals', 'enemy', '_purple_layers', f'squad_{sq}', f'soldier_{k}.png')
        lay = os.path.join(R, 'enemy', f'man_purple_squad_{sq}_layers', f'soldier_{k}.webp')
        if os.path.exists(full) and not ONLY_UNCUT: src = full
        elif (sq, k) in UNCUT: src = lay
        else: continue
        J.append((f's{sq}_s{k}', src, 'forward' if (sq, k) in FWD else 'back'))
print(len(J), 'soldiers', flush=True)
ENV = {**os.environ, 'PYTHONIOENCODING': 'utf-8'}
for name, src, kind in J:
    if os.path.exists(os.path.join(OH, name, 'meta.json')): continue
    from PIL import Image
    dst = os.path.join(IN, name + '.png'); Image.open(src).convert('RGBA').save(dst)
    print(time.strftime('%H:%M'), 'hit', name, kind, flush=True)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', dst, '--mode', 'hit', '--length', '17', '--frames', '0',
                    '--prompt', P[kind], '--out', OH], env=ENV)
    time.sleep(30)
for name, src, kind in J:
    if os.path.exists(os.path.join(OI, name, 'meta.json')): continue
    dst = os.path.join(IN, name + '.png')
    print(time.strftime('%H:%M'), 'idle', name, flush=True)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', dst, '--mode', 'idle', '--style', 'default',
                    '--fps', '8', '--length', '49', '--suffix', '', '--prompt', IDLE, '--out', OI], env=ENV)
    time.sleep(60)
print('全部完成', flush=True)
