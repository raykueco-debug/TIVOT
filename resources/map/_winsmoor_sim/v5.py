import sys, random, collections; MYARGS=sys.argv[1:]; sys.argv=['x']
exec(open('v4.py',encoding='utf8').read().split('# v4：')[0])   # 取 siege/G/apsp/solve3 與 v3 的 base 定義
exec(open('v4.py',encoding='utf8').read().split('def solve_mix')[1].join(['def solve_mix','']).split("if '--sim'")[0])
from place2 import OPP, cands
# 每條幹道（北為基準，其餘旋轉 90°）
base={'1':(0,-2),'R':(-2,-4),'Rp':(-4,-4),'Rq':(0,-4),'X':(-2,-6),'a1':(-4,-6),'b1':(-2,-7),'c1':(1,-6),'c2':(1,-7),'d':(2,-2)}
bed=[('C','1'),('1','R'),('R','Rp'),('R','Rq'),('R','X'),('X','a1'),('X','b1'),('X','c1'),('c1','c2'),('1','d')]
ents=['a1','b1','c2']
L='NESW'; rot=lambda p,k:p if k==0 else rot((-p[1],p[0]),k-1)
P={'C':(0,0)}; E=[]; ENT=[]
for k,a in enumerate(L):
    nm=lambda s:'C' if s=='C' else a+s
    for s,p in base.items():
        if a=='W' and s=='d': continue
        P[nm(s)]=rot(p,k)
    for x,y in bed:
        if a=='W' and 'd' in (x,y): continue
        E.append((nm(x),nm(y)))
    ENT+=[nm(s) for s in ents]
OUTER=[('Nc1','Ea1'),('Sc1','Wa1')]+([('Ec1','Sa1'),('Wc1','Na1')] if 'outer4' in MYARGS else [])   # 外圍兩條橫街（給繞路用）
if 'outer' in MYARGS: E+=OUTER
assert len(set(P.values()))==len(P),'overlap'
used={}
def bt(i):
    if i==len(E): return True
    x,y=E[i]
    for d in cands(x,y,P):
        if (x,d) in used or (y,OPP[d]) in used: continue
        used[(x,d)]=y; used[(y,OPP[d])]=x
        if bt(i+1): return True
        del used[(x,d)]; del used[(y,OPP[d])]
    return False
ok=bt(0)
def through():
    occ={v:k for k,v in P.items()}; bad=[]
    for a,b in E:
        (ax,ay),(bx,by)=P[a],P[b]
        if ax==bx: pts=[(ax,y) for y in range(min(ay,by)+1,max(ay,by))]
        elif ay==by: pts=[(x,ay) for x in range(min(ax,bx)+1,max(ax,bx))]
        else: pts=[]
        bad+=[(a,b,occ[p]) for p in pts if p in occ]
    return bad
adj=collections.defaultdict(list)
for x,y in E: adj[x].append(y); adj[y].append(x)
g=G(adj,'C',ENT); D=apsp(g)
print('nodes',len(P),'edges',len(E),'labels',ok,'through',through(),'entries',sorted(collections.Counter(g.d[e] for e in ENT).items()))
if '--sim' in MYARGS:
    N=150
    for name,mk in [('全A',lambda r:[1]*7),('全B',lambda r:[0]*7),('A/B各半',lambda r:[r.choice([1,0]) for _ in range(7)]),
                    ('多數A偶爾B',lambda r:[0 if r.random()<.25 else 1 for _ in range(7)])]:
        out=[]
        for mode in ('rand','far'):
            w=0
            for sd in range(N):
                rng=random.Random(1000+sd); first=rng.sample(g.entries,2); fs=mk(random.Random(5000+sd))
                w+=solve_mix(g,D,7,fs,mode,sd,first)
            out.append(round(100*w/N))
        print(name,out,flush=True)
