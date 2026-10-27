# 棋盤型守城戰：W×H 方格挖洞；目標＝市政廳；南邊是海（最下一列以下），入口只在北、東、西邊緣
import sys, random, functools, collections
exec(open('siege.py',encoding='utf8').read())
exec(open('run7.py',encoding='utf8').read().split('def solve3')[0].split('def apsp')[1].join(['def apsp','']))
exec('def solve_mix'+open('v4.py',encoding='utf8').read().split('def solve_mix')[1].split("if '--sim'")[0])
DIRS={'U':(0,-1),'D':(0,1),'L':(-1,0),'R':(1,0)}
def make(W,H,target,holes,entries):
    cells=[(x,y) for x in range(W) for y in range(H) if (x,y) not in holes]
    S=set(cells); adj=collections.defaultdict(list)
    for (x,y) in cells:
        for d,(dx,dy) in DIRS.items():
            q=(x+dx,y+dy)
            if q in S: adj[(x,y)].append(q)
    seen={target}; q=[target]
    while q:
        u=q.pop()
        for v in adj[u]:
            if v not in seen: seen.add(v); q.append(v)
    if len(seen)<len(cells): return None
    g=G(adj,target,[e for e in entries if e in S])
    # 平手：先橫後直（往市政廳那一欄靠）
    tx,ty=target
    for u in adj:
        c=[v for v in adj[u] if g.d[v]==g.d[u]-1]
        if not c: g.nxt[u]=None; continue
        c.sort(key=lambda v:(0 if v[1]==u[1] else 1, abs(v[0]-tx)+abs(v[1]-ty)))
        g.nxt[u]=c[0]
    return g
def rate(g,N=120,fsets=None):
    D=apsp(g); out={}
    for name,mk in (fsets or [('全A',lambda r:[1]*7),('全B',lambda r:[0]*7)]):
        w=[0,0]
        for sd in range(N):
            rng=random.Random(1000+sd); first=rng.sample(g.entries,2); fs=mk(random.Random(5000+sd))
            for i,mode in enumerate(('rand','far')): w[i]+=solve_mix(g,D,7,fs,mode,sd,first)
        out[name]=[round(100*x/N) for x in w]
    return out
