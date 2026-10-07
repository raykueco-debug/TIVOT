# 惡棍群戰：每人一支中槍倒下（全身原稿 _originals/enemy/_thug_layers），依站位決定倒法；每支歇 45 秒
import os, shutil, subprocess, time
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r'C:\Users\Ray Ku\Desktop\TIVOT\resources\_originals\enemy\_thug_layers'
IN, OUT = os.path.join(HERE, 'in_squad'), os.path.join(HERE, 'out', 'squad')
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
os.makedirs(IN, exist_ok=True); os.makedirs(OUT, exist_ok=True)
CLEAN = ('No blood at all: no blood stains, drops, spray, red liquid or wounds; clothes stay clean. No gunfire at all: the muzzle flash disappears at once, '
         'no bullets, no sparks, no smoke, no light effects. Pure green background. Camera completely static. Anime style, cel shading.')
P = {
 'back':    'Anime illustration. The man is shot in the chest: his upper body snaps backward, his head whips back, his gun drops from his hand, '
            'and he falls backward and drops down out of sight. ' + CLEAN,
 'forward': 'Anime illustration. The man is shot in the chest: he jerks, his knees buckle, his gun drops, and he collapses forward face-down onto the ground toward the camera. ' + CLEAN,
 'prone':   'Anime illustration. The man lying prone on the ground aiming a rifle is shot: his body twitches once, his head drops limply down onto the ground, '
            'his hands loosen on the rifle and he lies still. He stays lying in the same place. ' + CLEAN,
}
PLAN = {'hall': {i: 'back' for i in range(1, 6)},
        'gate': {1: 'forward', 2: 'back', 3: 'back', 4: 'back', 5: 'back'},
        'avenue': {1: 'back', 2: 'back', 3: 'back', 4: 'forward', 5: 'back'},
        'fore': {1: 'forward', 2: 'back', 3: 'prone', 4: 'forward', 5: 'back', 6: 'back'},
        'carr': {i: 'back' for i in range(1, 6)}}
for sc, d in PLAN.items():
    for n, kind in d.items():
        name = f'{sc}_thug_{n}'
        if os.path.exists(os.path.join(OUT, name, 'meta.json')): continue
        src = os.path.join(IN, name + '.png'); shutil.copy(os.path.join(SRC, sc, f'thug_{n}.png'), src)
        print(time.strftime('%H:%M'), name, kind, flush=True)
        subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', src, '--mode', 'hit', '--length', '17', '--frames', '13',
                        '--prompt', P[kind], '--out', OUT], env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
        time.sleep(45)
print('全部完成', flush=True)
