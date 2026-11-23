"""北泊戰損城區即時版：把各格 resources/background/anim/northport/<格>_live.json ＋ np_live_cells.json 寫成 script/bg_fx.js 的 ⟨np-live⟩ 段。
用法：python np_live_emit.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
D = os.path.join(ROOT, 'resources', 'background', 'anim', 'northport')
cells = json.load(open(os.path.join(HERE, 'np_live_cells.json'), encoding='utf8'))
rows = []
for k, extra in cells.items():
    if k.startswith('_'): continue
    j = json.load(open(os.path.join(D, k + '_live.json'), encoding='utf8')); o = [f"bottom: {j['bottom']}"]
    if 'sun' not in j['files']: o.append('sun: false')
    if 'base' in j['files']: o.append('base: true')
    if j.get('fire'): o.append('fire: ' + json.dumps(j['fire']['src']))
    if extra.get('haze'): o.append('haze: ' + json.dumps(extra['haze'], separators=(', ', ': ')).replace('"', ''))
    sm = j['smoke']
    if sm['src']:
        o.append("plumes: { wind: %s, src: %s,\n      cells: %s }" % (sm['wind'], json.dumps(sm['src']).replace(',', ', '), json.dumps(sm['cells']).replace(',', ', ')))
    rows.append(f"  {k}: NP('{k}', {{ {', '.join(o)} }}),")
p = os.path.join(ROOT, 'script', 'bg_fx.js'); s = open(p, encoding='utf8').read()
a = s.index('\n', s.index('  /* ⟨np-live⟩')) + 1; b = s.index('  /* ⟨/np-live⟩ */')
open(p, 'w', encoding='utf8').write(s[:a] + '\n'.join(rows) + '\n' + s[b:]); print('emit', len(rows))
