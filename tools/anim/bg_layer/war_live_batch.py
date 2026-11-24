"""守城戰：批次輸出即時跑的拆層素材（11-22 Ray：「改遊戲內即時跑」「推其餘格」）。
格子表＝war_live_cells.json（煙源＝自動找＋人工修；有河的格子帶河面框；ws_2_0 的 GPT 遮罩歪掉，先不做）。
用法：python war_live_batch.py [格名...]"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
# 專案根：這支在 repo 的 tools/anim/bg_layer 就用 repo；在 ComfyUI 的 tivot_wan/bg_layer 就找桌面的 TIVOT（11-23 換機：原本寫死 C:/Users/User）
_r = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
ROOT = _r if os.path.isfile(os.path.join(_r, 'script', 'bg_fx.js')) else os.path.normpath(os.path.join(HERE, '..', '..', '..', 'TIVOT'))
OUT = os.path.join(ROOT, 'resources', 'background', 'anim', 'winsmoor_siege')
cells = json.load(open(os.path.join(HERE, 'war_live_cells.json'), encoding='utf8'))
names = [a for a in sys.argv[1:] if not a.startswith('--')] or list(cells)
for n in ([] if '--emit' in sys.argv else names):
    c = cells[n]; env = dict(os.environ, WAR_EXPORT=OUT, WAR_STATIC='1', WAR_SMOKE=';'.join(','.join(str(v) for v in s) for s in c['smoke']))
    if not c['smoke']: env['WAR_SMOKE'] = ''
    if c.get('water'): env['WAR_WATER'] = c['water']
    if c.get('sun') is False: env['WAR_NOSUN'] = '1'
    r = subprocess.run([sys.executable, '-X', 'utf8', 'war_run.py', n, '--recomp'], cwd=HERE, env=env, capture_output=True, text=True, encoding='utf8')
    print(n, 'ok' if '即時素材' in (r.stdout + r.stderr) else 'FAIL ' + (r.stderr or r.stdout)[-300:], flush=True)


def emit():
    FP = json.load(open(os.path.join(HERE, 'fire_place.json'), encoding='utf8')) if os.path.exists(os.path.join(HERE, 'fire_place.json')) else {}

    """把各格的 <名>_live.json 寫成 script/bg_fx.js 裡自動產生的那一段（⟨ws-live⟩ 標記之間）。
    天空太少（<1%）的格子不登記。ws_0_0／ws_0_1 原本播 11-12 交的影片，11-23 Ray「用西泊吧 煙比較新」→ 改即時版（雲水煙一律程式跑的樣本）。"""
    import glob
    HOLD = set()
    rows = []
    key = lambda p: [int(v) for v in os.path.basename(p).split('_')[1:3]]
    for p in sorted(glob.glob(os.path.join(OUT, 'ws_*_live.json')), key=key):
        n = os.path.basename(p)[:-10]; j = json.load(open(p, encoding='utf8'))
        if n in HOLD or j.get('sky_frac', 1) < 0.01: continue
        sm = j['smoke']; o = [f"bottom: {j.get('bottom') or 0.4}"]
        if 'sun' not in j['files']: o.append('sun: false')
        if 'sea' in j['files']: o.append('sea: true')   # war_cloud_sea.py 拆出的不動雲海
        if FP.get(n): o.append('fireFree: ' + json.dumps(FP[n]))   # 審閱頁手動放的火（fire_place.json）
        if cells.get(n, {}).get('haze'): o.append('haze: true')   # 11-24 Ray：「街上加些許程式煙」（live_notes.json）
        if 'water' in j['files']: o.append("water: { amp: 3, persp: 2, glint: 0.25 }")
        if sm['src']:
            o.append("plumes: { wind: %s, src: %s,\n      cells: %s }" % (sm['wind'], json.dumps(sm['src']).replace(',', ', '), json.dumps(sm['cells']).replace(',', ', ')))
        rows.append(f"  {n}: WS('{n}', {{ {', '.join(o)} }}),")
    p = os.path.join(ROOT, 'script', 'bg_fx.js'); s = open(p, encoding='utf8').read()
    a, b = s.index('  /* ⟨ws-live⟩'), s.index('  /* ⟨/ws-live⟩ */')
    s = s[:a] + '  /* ⟨ws-live⟩ 以下由 tivot_wan/bg_layer/war_live_batch.py --emit 自動產生，不要手改（改 war_live_cells.json 再重跑）*/\n' + '\n'.join(rows) + '\n' + s[b:]
    open(p, 'w', encoding='utf8').write(s); print('emit', len(rows), '格')


if __name__ == '__main__' and '--emit' in sys.argv: emit()
