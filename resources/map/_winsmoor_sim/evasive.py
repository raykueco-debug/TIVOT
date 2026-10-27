import random, functools
def solve_ev(gg,D,total,fseq,mode,seed,first):
    """菁英繞路：一樣短的下一步裡，挑離主角（主角這一步走完後的位置）最遠的；再平手照固定順序。"""
    rng=random.Random(seed); rnd=[rng.random() for _ in range(total)]
    cand={u:sorted([v for v in gg.adj[u] if gg.d.get(v,99)==gg.d[u]-1]) for u in gg.adj if u!=gg.c}
    def pick(p,i):
        es=[e for e in gg.entries if e!=p]
        return max(es,key=lambda e:(D[p][e],e)) if mode=='far' else es[int(rnd[i]*len(es))]
    @functools.lru_cache(maxsize=None)
    def go(t,p,es,n,k):
        if not es and n>=total: return True
        if t>80: return False
        for np in (p,)+gg.adj[p]:
            kk=k; keep=[]; kills=0
            for u,z in es:
                if u==np: kills+=1
                else: keep.append((u,z))
            for _ in range(kills): f=fseq[min(kk,total-1)]; kk+=1; keep=[(u,max(z,f)) for u,z in keep]
            moved=[]; lose=False; nk=0
            for u,z in keep:
                if z>0: moved.append((u,z-1)); continue
                cs=cand[u]; v=max(cs,key=lambda v:D[np][v]) if len(cs)>1 else cs[0]
                if v==gg.c: lose=True;break
                if v==np: nk+=1; continue
                moved.append((v,0))
            if lose: continue
            for _ in range(nk): f=fseq[min(kk,total-1)]; kk+=1; moved=[(u,max(z,f)) for u,z in moved]
            n2=n
            for _ in range(kills+nk):
                if n2<total: moved.append((pick(np,n2),0)); n2+=1
            if go(t+1,np,tuple(sorted(moved)),n2,kk): return True
        return False
    r=go(0,gg.c,tuple(sorted((e,0) for e in first)),2,0); go.cache_clear(); return r
def rate_ev(g,N=120,fsets=None):
    D=apsp(g); out={}
    for name,mk in (fsets or [('全A',lambda r:[1]*7),('全B',lambda r:[0]*7)]):
        w=[0,0]
        for sd in range(N):
            rng=random.Random(1000+sd); first=rng.sample(g.entries,2); fs=mk(random.Random(5000+sd))
            for i,mode in enumerate(('rand','far')): w[i]+=solve_ev(g,D,7,fs,mode,sd,first)
        out[name]=[round(100*x/N) for x in w]
    return out
