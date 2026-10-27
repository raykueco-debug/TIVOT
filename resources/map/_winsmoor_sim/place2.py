import itertools
E=[('C','N1'),('C','E1'),('C','S1'),('C','W1'),('N1','RN'),('E1','RE'),('S1','RS'),('W1','RW'),
   ('RN','RE'),('RE','RS'),('RS','RW'),('RW','RN')]
OPP={'U':'D','D':'U','L':'R','R':'L'}
def cands(a,b,P):
    (ax,ay),(bx,by)=P[a],P[b]; c=[]
    if by<ay: c.append('U')
    if by>ay: c.append('D')
    if bx<ax: c.append('L')
    if bx>ax: c.append('R')
    return c
def label(P):
    used={}
    def bt(i):
        if i==len(E): return dict(used)
        a,b=E[i]
        for d in cands(a,b,P):
            if (a,d) in used or (b,OPP[d]) in used: continue
            used[(a,d)]=b; used[(b,OPP[d])]=a
            r=bt(i+1)
            if r: return r
            del used[(a,d)]; del used[(b,OPP[d])]
        return None
    return bt(0)
P0={'C':(0,0),'N1':(0,-1),'E1':(1,0),'S1':(0,1),'W1':(-1,0)}
cells=[(x,y) for x in range(-2,3) for y in range(-2,3) if (x,y) not in P0.values()]
res=[]
for rn,re_,rs,rw in itertools.permutations(cells,4):
    P={**P0,'RN':rn,'RE':re_,'RS':rs,'RW':rw}
    if not (rn[1]<0 and re_[0]>0 and rs[1]>0 and rw[0]<0): continue
    L=label(P)
    if L and all(sum((r,d) in L for d in 'UDLR')==3 for r in ['RN','RE','RS','RW']):
        free={r:[d for d in 'UDLR' if (r,d) not in L] for r in ['RN','RE','RS','RW']}
        # 往外那一格要朝外
        if free['RN']==['U'] or True:
            res.append((P,free,L))
print(len(res))
for P,free,L in res[:4]:
    print({k:P[k] for k in ['RN','RE','RS','RW']}, free)
