import sys, collections, json, random
exec(open('grid.py',encoding='utf8').read())
exec(open('evasive.py',encoding='utf8').read())
DIRS=[(0,-1),(0,1),(-1,0),(1,0)]
def mk(W,H,T,walls,R,entfilter):
    ST={(x,y) for x in range(W) for y in range(H) if x%2==0 or y%2==0}
    adj=collections.defaultdict(list)
    for (x,y) in ST:
        for dx,dy in DIRS:
            q=(x+dx,y+dy)
            if q in ST and frozenset(((x,y),q)) not in walls: adj[(x,y)].append(q)
    d={T:0}; Q=[T]
    while Q:
        u=Q.pop(0)
        for v in adj[u]:
            if v not in d: d[v]=d[u]+1; Q.append(v)
    keep={c for c in ST if c in d and d[c]<=R}
    adj2={c:[v for v in adj[c] if v in keep] for c in keep}
    ents=[c for c in keep if d[c]==R and entfilter(c)]
    g=G(adj2,T,ents)
    for u in adj2:
        c=[v for v in adj2[u] if g.d[v]==g.d[u]-1]
        c.sort(key=lambda v:(0 if v[1]==u[1] else 1, v)); g.nxt[u]=c[0] if c else None
    return g
def appr(g):
    s=collections.Counter()
    for e in g.entries:
        u=e
        while g.nxt[u]!=g.c: u=g.nxt[u]
        s[u]+=1
    return dict(s)
def bend(g):
    T=g.c; r=[g.d[c]/max(1,abs(c[0]-T[0])+abs(c[1]-T[1])) for c in g.adj if c!=T]; return sum(r)/len(r)
w=lambda a,b:frozenset((a,b))
