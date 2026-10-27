import sys, random, functools, collections; sys.argv=['x']
exec(open('v3.py',encoding='utf8').read())
def apsp(g):
    D={}
    for s in g.adj:
        d={s:0};q=[s]
        while q:
            u=q.pop(0)
            for v in g.adj[u]:
                if v not in d: d[v]=d[u]+1;q.append(v)
        D[s]=d
    return D
def solve3(g, D, total, f, mode, seed, first):
    rng=random.Random(seed); rnd=[rng.random() for _ in range(total)]
    def pick(p,i,occupied):
        es=[e for e in g.entries if e!=p]
        if mode=='far': return max(es,key=lambda e:(D[p][e],e))
        return es[int(rnd[i]*len(es))]
    @functools.lru_cache(maxsize=None)
    def go(t,p,es,n):
        if not es and n>=total: return True
        if t>80: return False
        for np in (p,)+g.adj[p]:
            kills=0; keep=[]
            for u,z in es:
                if u==np: kills+=1
                else: keep.append((u,z))
            if kills: keep=[(u,max(z,f)) for u,z in keep]
            moved=[]; nf=0; lose=False
            for u,z in keep:
                if z>0: moved.append((u,z-1)); continue
                v=g.nxt[u]
                if v==g.c: lose=True;break
                if v==np: kills+=1; nf=f; continue
                moved.append((v,0))
            if lose: continue
            if nf: moved=[(u,max(z,nf)) for u,z in moved]
            n2=n
            for _ in range(kills):
                if n2<total: moved.append((pick(np,n2,moved),0)); n2+=1
            if go(t+1,np,tuple(sorted(moved)),n2): return True
        return False
    r=go(0,g.c,tuple(sorted((e,0) for e in first)),2); go.cache_clear(); return r
def variant(ring=True, shallow=False):
    EE=E if ring else [e for e in E if not (e[0].endswith('R') and e[1].endswith('R'))]
    ent=list(ENT)
    if shallow:   # 入口往內縮：每支只留到第一個分岔點後一格（離廣場 4）
        ent=[k for k in P if k[1:] in ('a1','b1','c1')]
        keepn=set(P)-{k for k in P if k[1:] in ('b2','c2','c3')}
        EE=[e for e in EE if e[0] in keepn and e[1] in keepn]
    adj=collections.defaultdict(list)
    for x,y in EE: adj[x].append(y); adj[y].append(x)
    gg=G(adj,'C',ent); return gg, apsp(gg)
for name,kw in [('v3',{}),('v3 無環',dict(ring=False)),('v3 入口縮到4',dict(shallow=True)),('v3 無環+入口4',dict(ring=False,shallow=True))]:
    gg,D=variant(**kw)
    for mode in ('rand','far'):
        r={2:0,1:0,0:0}; N=100
        for sd in range(N):
            rng=random.Random(1000+sd); first=rng.sample(gg.entries,2)
            for f in r: r[f]+=solve3(gg,D,7,f,mode,sd,first)
        print(name,'補位=' + ('隨機入口' if mode=='rand' else '離主角最遠'),{('S','A','B')[2-f]:r[f] for f in (2,1,0)},flush=True)
