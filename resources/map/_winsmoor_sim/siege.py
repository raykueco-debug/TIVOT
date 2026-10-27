# 守城戰可解性模擬（Ray 10-27 規則）
# 每回合：主角先走一格（或不動）→ 所有沒被凍住的敵人沿最短路往中心走一格。
# 同格或在同一條路上錯身＝遭遇＝戰鬥（不耗回合；同時撞到幾隻就連戰）。
# 戰鬥後其餘在場敵人凍住 f 回合（S=2／A=1／B=0）。敵人踏進中心＝輸（主角站在中心也擋不住）。
CENTER_BLOCK=False
import random, functools, sys, collections
sys.setrecursionlimit(100000)

class G:
    def __init__(s, adj, center, entries):
        s.adj={k:tuple(v) for k,v in adj.items()}; s.c=center; s.entries=entries
        d={center:0}; q=[center]
        while q:
            u=q.pop(0)
            for v in s.adj[u]:
                if v not in d: d[v]=d[u]+1; q.append(v)
        s.d=d
        # 敵人下一步：最短路的鄰居；同距離時取「名字排序第一個」（確定性）
        s.nxt={u:(min((v for v in s.adj[u] if d[v]==d[u]-1), default=None)) for u in adj}

def solve(g, spawns, f):
    """spawns: [(turn, entry)]。回傳 True=存在一條守得住的走法。"""
    n=len(spawns)
    @functools.lru_cache(maxsize=None)
    def go(t, p, es):  # es: tuple of (node|'-'|'x', freeze)  '-'=未出場 'x'=已擊破
        if all(e[0]=='x' for e in es): return True
        if t>80: return False
        for np in (p,)+g.adj[p]:
            el=list(es); fz=0; ok=True
            # 主角移動：踩到敵人
            hit=[i for i,(u,z) in enumerate(el) if u==np]
            for i in hit: el[i]=('x',0)
            if hit: fz=f
            if fz: el=[(u,max(z,fz)) if u not in('x','-') else (u,z) for u,z in el]
            # 敵人移動
            moved=[]; nf=0
            for i,(u,z) in enumerate(el):
                if u in('x','-'): moved.append((u,z)); continue
                if z>0: moved.append((u,z-1)); continue
                v=g.nxt[u]
                if v==g.c and not CENTER_BLOCK: ok=False; break
                if v==np: moved.append(('x',0)); nf=f; continue
                if v==g.c: ok=False; break
                moved.append((v,0))
            if not ok: continue
            # 錯身：敵人從 np 走到 p（主角從 p 走到 np）
            el2=[]
            for i,(u,z) in enumerate(moved):
                if u not in('x','-') and es[i][0]==np and u==p and np!=p: el2.append(('x',0)); nf=f
                else: el2.append((u,z))
            if nf: el2=[(u,max(z,nf)) if u not in('x','-') else (u,z) for u,z in el2]
            # 出場
            fin=[]; bf=0
            for i,(u,z) in enumerate(el2):
                if u=='-' and spawns[i][0]==t+1:
                    if spawns[i][1]==np: fin.append(('x',0)); bf=f
                    else: fin.append((spawns[i][1],0))
                else: fin.append((u,z))
            if bf: fin=[(u,max(z,bf)) if u not in('x','-') else (u,z) for u,z in fin]
            if go(t+1,np,tuple(fin)): return True
        return False
    es=tuple((spawns[i][1],0) if spawns[i][0]==0 else ('-',0) for i in range(n))
    r=go(0,g.c,es); go.cache_clear(); return r

def trial(g, nE, window, seeds, fs=(2,1,0)):
    res={f:0 for f in fs}
    for sd in seeds:
        rng=random.Random(sd)
        sp=sorted((rng.randrange(window), rng.choice(g.entries)) for _ in range(nE))
        for f in fs: res[f]+=solve(g,sp,f)
    return {('S','A','B')[2-f]:round(100*res[f]/len(seeds)) for f in fs}
