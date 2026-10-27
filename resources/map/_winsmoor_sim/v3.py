import collections, sys
from siege import *
from place2 import OPP, cands
# 北區（其餘三區旋轉 90°）
base={'1':(0,-2),'R':(-2,-4),'X':(-2,-6),'a1':(-4,-6),'b1':(-2,-7),'b2':(-2,-8),'c1':(1,-6),'c2':(1,-7),'c3':(1,-8),'d':(2,-2)}
bedges=[('C','1'),('1','R'),('R','X'),('X','a1'),('X','b1'),('b1','b2'),('X','c1'),('c1','c2'),('c2','c3'),('1','d')]
ents=['a1','b2','c3']
L='NESW'
rot=lambda p,k:p if k==0 else rot((-p[1],p[0]),k-1)
P={'C':(0,0)}; E=[]; ENT=[]
for k,a in enumerate(L):
    nm=lambda s:'C' if s=='C' else a+s
    for s,p in base.items():
        if a=='W' and s=='d': continue   # 40 格：拿掉一條死巷
        P[nm(s)]=rot(p,k)
    for x,y in bedges:
        if a=='W' and 'd' in (x,y): continue
        E.append((nm(x),nm(y)))
    ENT+= [nm(s) for s in ents]
for i,a in enumerate(L): E.append((a+'R',L[(i+1)%4]+'R'))
assert len(set(P.values()))==len(P), 'overlap'
# 方向標籤
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
print('nodes',len(P),'edges',len(E),'labels ok',bt(0))
adj=collections.defaultdict(list)
for x,y in E: adj[x].append(y); adj[y].append(x)
g=G(adj,'C',ENT)
print('entries',len(ENT),sorted(collections.Counter(g.d[e] for e in ENT).items()))
if '--sim' in sys.argv:
    for nE,win in [(7,12),(8,12),(9,12),(10,12),(8,16),(10,16)]:
        print(nE,'隻',win,'回合內出完',trial(g,nE,win,range(100)),flush=True)
