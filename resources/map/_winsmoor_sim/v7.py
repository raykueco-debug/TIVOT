# 守城戰 v6：防衛目標＝市政廳；配置照溫斯摩爾港城鎮版（市政廳左上、港務大道往右接大教堂、往下中央廣場；
# 舊港町／碼頭在左下、上街區／旅館／餐飲街／雜貨舖在右）
import sys, random, collections; MY=sys.argv[1:]; sys.argv=['x']
exec(open('v4.py',encoding='utf8').read().split('# v4：')[0])
exec(open('v4.py',encoding='utf8').read().split('def solve_mix')[1].join(['def solve_mix','']).split("if '--sim'")[0])
from place2 import OPP, cands
N={  # key: (名稱, x, y, 入口)  ⚠ v6（10-27 Ray：「不要有海上入口」）—— 入口全是陸路
 'C':('市政廳',8,8,None),
 'n1':('議會街',8,5,None),'n2':('法院前',8,3,None),'n3':('北大路',8,1,None),
 'nA':('北門',8,-1,'北'),'nB':('北墓園',5,1,'北'),'nC':('高架橋',11,1,'北'),'nd':('鐘樓巷',5,3,None),
 'e1':('港務大道',14,8,None),'e2':('大教堂前',20,8,None),'e3':('東大路',24,8,None),
 'eA':('東門',28,8,'東'),'eB':('修道院',24,11,None),'eC':('東北門',24,3,'東'),'ed':('救濟院巷',20,5,None),
 's2':('中央廣場',14,13,None),'s3':('上街區',20,13,None),'sI':('海景旅館',20,11,None),
 's4':('餐飲街',24,13,None),'sA':('東郊',28,13,'東'),'s5':('雜貨舖',20,16,None),'sB':('東濱路',23,16,'東'),
 'o1':('南街',8,11,None),'o2':('舊港町',8,14,None),'o3':('公會倉庫',8,16,None),'oA':('中央棧橋',8,19,None),
 'o4':('槍匠街',4,14,None),'oB':('西南海岸路',1,14,'西'),'oF':('魚市',11,16,None),'oG':('魚市後街',14,16,None),'oH':('東南門',17,16,'東'),
 'w1':('碼頭路',4,8,None),'w2':('碼頭',4,5,None),'w3':('西碼頭',1,5,None),
 'wA':('西北門',1,2,'西'),'wB':('燈塔堤',-2,5,None),'wd':('船具巷',4,11,None),
 'wE':('西門',-5,8,'西'),'wF':('西大路',1,8,None),'wG':('西郊',-2,8,None),
}
E=[('C','n1'),('n1','n2'),('n2','n3'),('n3','nA'),('n3','nB'),('n3','nC'),('n2','nd'),
   ('C','e1'),('e1','e2'),('e2','e3'),('e3','eA'),('e3','eB'),('e3','eC'),('e2','ed'),
   ('e1','s2'),('s2','s3'),('s3','sI'),('s3','s4'),('s4','sA'),('s3','s5'),('s5','sB'),
   ('C','o1'),('o1','o2'),('o2','o3'),('o3','oA'),('o2','o4'),('o4','oB'),('o3','oF'),('oF','oG'),('oG','oH'),
   ('C','w1'),('w1','w2'),('w2','w3'),('w3','wA'),('w3','wB'),('w1','wd'),('w1','wF'),('wF','wG'),('wG','wE'),
]
EXTRA=[]
if 'sq-old' in MY: EXTRA.append(('s2','oF'))     # 廣場—魚市（城鎮版的「廣場往左＝舊港町」）
if 'nc-e' in MY: EXTRA.append(('nC','eC'))       # 北郊鐵路—東北門
E+=EXTRA
def rew(old,new):
    global E; E=[new if e==old else e for e in E]
if 'h1' in MY: rew(('eB','eC'),('e3','eC'))
if 'h2' in MY: rew(('oF','oG'),('o3','oG'))
if 'h3' in MY: rew(('s3','sI'),('s4','sI')); rew(('s4','sA'),('s3','sA'))
ALLEYS={'a1':('wd','o4'),'a2':('nd','w2'),'a3':('ed','n2'),'a4':('s2','o2'),'a5':('ed','s2'),'a6':('oF','s5')}
AL=[ALLEYS[k] for k in MY if k in ALLEYS]
P={k:(v[1],v[2]) for k,v in N.items()}
ENT=[k for k,v in N.items() if v[3]]
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
ENEMY_E=list(E); E=E+AL
ok=bt(0)
def through():
    occ={v:k for k,v in P.items()}; bad=[]
    for a,b in E:
        (ax,ay),(bx,by)=P[a],P[b]
        pts=[(ax,y) for y in range(min(ay,by)+1,max(ay,by))] if ax==bx else ([(x,ay) for x in range(min(ax,bx)+1,max(ax,bx))] if ay==by else [])
        bad+=[(a,b,occ[p]) for p in pts if p in occ]
    return bad
print('through',through())
adj=collections.defaultdict(list)
for x,y in ENEMY_E: adj[x].append(y); adj[y].append(x)
g=G(adj,'C',ENT)
padj=collections.defaultdict(list)
for x,y in E: padj[x].append(y); padj[y].append(x)
g.adj={k:tuple(v) for k,v in padj.items()}   # 主角走的路網（含小路）；敵人的下一步 g.nxt 已用大路算好
D=apsp(g)
print('nodes',len(P),'edges',len(E),'labels',ok,'entries',len(ENT),sorted(collections.Counter(g.d[e] for e in ENT).items()))
if '--sim' in MY:
    NN=150
    for name,mk in [('全A',lambda r:[1]*7),('全B',lambda r:[0]*7),('A/B各半',lambda r:[r.choice([1,0]) for _ in range(7)]),('多數A偶爾B',lambda r:[0 if r.random()<.25 else 1 for _ in range(7)])]:
        out=[]
        for mode in ('rand','far'):
            w=0
            for sd in range(NN):
                rng=random.Random(1000+sd); first=rng.sample(g.entries,2); fs=mk(random.Random(5000+sd))
                w+=solve_mix(g,D,7,fs,mode,sd,first)
            out.append(round(100*w/NN))
        print(name,out,flush=True)
