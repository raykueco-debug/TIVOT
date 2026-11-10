"""背景線：用現在的 aba_comp（自動挑接點＋拿閃動格）把 out/*_abacloth 全部重合成一次（不跑 GPU）。
參數從各自的 meta.json 讀回來（args 優先；舊 meta 只有 key/ab/k/ba，就照 bg_queue 的規則重建）。"""
import glob, json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
BG = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'TIVOT', 'resources', 'background'))
only = sys.argv[1:]
for mp in sorted(glob.glob(os.path.join(HERE, 'out', '*_abacloth', 'meta.json'))):
    name = os.path.basename(os.path.dirname(mp))
    if only and not any(o in name for o in only): continue
    m = json.load(open(mp, encoding='utf8'))
    if m.get('args'):
        args = list(m['args'])
        pass   # args 存的就是原始 k
    else:
        j = json.load(open(os.path.join(HERE, 'notes', m['key'], 'notes.json'), encoding='utf8'))
        sky = [c['name'] for c in j['colors'] if '雲' in (c.get('text') or '')]
        args = [os.path.join(BG, j['file']), m['key'], m['ab'], str(m['k']), m['ba'], name] + (['--sky', sky[0], '--nosky'] if sky else [])
    r = subprocess.run([sys.executable, 'aba_comp.py'] + args, cwd=HERE, capture_output=True, text=True, encoding='utf8',
                       env=dict(os.environ, PYTHONIOENCODING='utf-8'))
    if r.returncode: print('✘', name, r.stderr[-300:]); continue
    o = json.loads(r.stdout.strip().splitlines()[-1])
    print(name, 'frames', o['frames'], 'cut', o['cut'], 'drop', o['dropped'], 'seam', o['seam_diff'], 'mean', o['mean_step_diff'], flush=True)
