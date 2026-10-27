import sys, random, functools, collections; ARGS=sys.argv[1:]; sys.argv=['x']
exec(open('run7.py',encoding='utf8').read().split("def variant(")[0])
# v4：拿掉內環；入口 4/4/5；內環路口改成側巷死巷（每個路口兩條）
rings=[e for e in E if e[0].endswith('R') and e[1].endswith('R')]
ENTSET=ARGS[0].split(',') if ARGS and ARGS[0]!='x' else ['a1','b1','c2']
drop={k for k in P if k[1:] in ('b2','c3')}
P4={k:v for k,v in P.items() if k not in drop}
E4=[e for e in E if e not in rings and e[0] not in drop and e[1] not in drop]
# 側巷：R 的兩個空方向各掛一條（座標沿用原本內環的方向，往外一格）
for a in 'NESW':
    r=a+'R'; (x,y)=P4[r]
    used_dirs=set()
    for c,(dx,dy) in (('p',(0,-1)),('q',(0,1)),('s',(-1,0)),('t',(1,0))):
        q=(x+dx,y+dy)
        if q in P4.values(): continue
        if len([k for k in P4 if k.startswith(a+'R')])>=3: break
        P4[a+'R'+c]=q; E4.append((r,a+'R'+c))
ENT4=[k for k in P4 if k[1:] in ENTSET]
adj=collections.defaultdict(list)
for x,y in E4: adj[x].append(y); adj[y].append(x)
g4=G(adj,'C',ENT4); D4=apsp(g4)
def solve_mix(gg,D,total,fseq,mode,seed,first):
    # fseq[i]＝第 i 場的凍結回合
    rng=random.Random(seed); rnd=[rng.random() for _ in range(total)]
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
                v=gg.nxt[u]
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
if '--sim' in ARGS:
    print('nodes',len(P4),'edges',len(E4),'entries',len(ENT4),sorted(collections.Counter(g4.d[e] for e in ENT4).items()))
    N=150
    for name,mk in [('全S',lambda r:[2]*7),('全A',lambda r:[1]*7),('全B',lambda r:[0]*7),
                    ('A/B 各半',lambda r:[r.choice([1,0]) for _ in range(7)]),
                    ('多數A 偶爾B(1/4)',lambda r:[0 if r.random()<.25 else 1 for _ in range(7)]),
                    ('多數B 偶爾A(1/4)',lambda r:[1 if r.random()<.25 else 0 for _ in range(7)])]:
        out=[]
        for mode in ('rand','far'):
            w=0
            for sd in range(N):
                rng=random.Random(1000+sd); first=rng.sample(g4.entries,2); fs=mk(random.Random(5000+sd))
                w+=solve_mix(g4,D4,7,fs,mode,sd,first)
            out.append(round(100*w/N))
        print(name,out,flush=True)
