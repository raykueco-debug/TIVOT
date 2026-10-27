# 街道＋街區：x 或 y 為偶數的格是街，(奇,奇) 是建築街區。市政廳在西北（北＝河、西＝雲海）；敵人從南、東來
import sys, random, collections, json
exec(open('grid.py',encoding='utf8').read())
exec(open('evasive.py',encoding='utf8').read())
DIRS=[(0,-1),(0,1),(-1,0),(1,0)]
W,H=13,13; T=(2,2)
STREETS={(x,y) for x in range(W) for y in range(H) if x%2==0 or y%2==0}
EDGES=sorted({frozenset((a,(a[0]+dx,a[1]+dy))) for a in STREETS for dx,dy in ((1,0),(0,1)) if (a[0]+dx,a[1]+dy) in STREETS},key=lambda e:sorted(e))
def build(R,walls):
    adj=collections.defaultdict(list)
    for (x,y) in STREETS:
        for dx,dy in DIRS:
            q=(x+dx,y+dy)
            if q in STREETS and frozenset(((x,y),q)) not in walls: adj[(x,y)].append(q)
    d={T:0}; Q=[T]
    while Q:
        u=Q.pop(0)
        for v in adj[u]:
            if v not in d: d[v]=d[u]+1; Q.append(v)
    keep={c for c in STREETS if c in d and d[c]<=R}
    adj2={c:[v for v in adj[c] if v in keep] for c in keep}
    ents=[c for c in keep if d[c]==R and (c[0]>=T[0]+3 or c[1]>=T[1]+3)]
    # 入口要在城的外緣（再往外沒有路）
    ents=[c for c in ents if any((c[0]+dx,c[1]+dy) in STREETS and d.get((c[0]+dx,c[1]+dy),99)>R for dx,dy in DIRS) or c[0]==W-1 or c[1]==H-1]
    ents=[c for c in ents if c[1]>=3 and c[0]>=3]   # 不在北岸（河）、不在西緣（雲海）
    if len(ents)<6: return None
    g=G(adj2,T,ents)
    for u in adj2:
        c=[v for v in adj2[u] if g.d[v]==g.d[u]-1]
        c.sort(key=lambda v:(0 if v[1]==u[1] else 1, v))
        g.nxt[u]=c[0] if c else None
    return g
def approaches(g):
    used=set()
    for e in g.entries:
        u=e
        while g.nxt[u]!=g.c: u=g.nxt[u]
        used.add(u)
    return len(used)
def bend(g):
    r=[g.d[c]/max(1,abs(c[0]-T[0])+abs(c[1]-T[1])) for c in g.adj if c!=T]
    return sum(r)/len(r)
