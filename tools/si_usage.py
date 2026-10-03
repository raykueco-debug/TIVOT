#!/usr/bin/env python3
"""立繪使用次數排行（挑眨眼補丁的批次用）。python3 tools/si_usage.py <輸出.json>"""
import sys, json, re, collections
sys.path.insert(0,'tools'); import script_lint as L
D=L.load_data(); SP=D['speakers']; ART=D['art']
def key(src): return re.sub(r'\.webp.*$','',src.replace('resources/si/',''))
def srcOf(art,ex):
    a=ART.get(art)
    if not a: return None
    if not ex: return a.get('src')
    e=(a.get('expr') or {}).get(ex); return (e if isinstance(e,str) else e and e.get('src'))
cnt=collections.Counter()
def walk(o):
    if isinstance(o,dict):
        sp=o.get('speaker'); p=o.get('portrait')
        if isinstance(p,dict) and p.get('show') is not False:
            ch=p.get('char') or sp; s=SP.get(ch) if isinstance(ch,str) else None
            if s and s.get('art'):
                src=srcOf(s['art'],p.get('expr'))
                if src: cnt[key(src)]+=1
        elif isinstance(sp,str) and sp in SP and SP[sp].get('art') and p is None:
            src=srcOf(SP[sp]['art'],None)
            if src: cnt[key(src)]+=0.2  # 沒寫 portrait：沿用，粗估
        for v in o.values(): walk(v)
    elif isinstance(o,list):
        for v in o: walk(v)
walk(D['script']); walk(D['towns']); walk(D['cfg'])
allk=set()
for a in ART.values():
    if a.get('src'): allk.add(key(a['src']))
    for e in (a.get('expr') or {}).values():
        s2=e if isinstance(e,str) else e.get('src')
        if s2: allk.add(key(s2))
rows=sorted(((k,round(cnt[k],1)) for k in allk), key=lambda r:-r[1])
json.dump(rows,open(sys.argv[1],'w'))
print(sum(1 for r in rows if r[1]>=1),'used of',len(rows))
print('  '.join(f'{k}:{c}' for k,c in rows[:80]))
