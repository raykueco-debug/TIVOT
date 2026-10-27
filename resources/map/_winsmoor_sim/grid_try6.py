exec(open('grid.py',encoding='utf8').read())
def diamond(R, south, holes, label, N=120, entry_rule=None):
    T=(R,R); W=2*R+1; H=R+1+south
    hs=set(holes)
    for x in range(W):
        for y in range(H):
            if abs(x-T[0])+abs(y-T[1])>R and y<=T[1]: hs.add((x,y))      # 北半：菱形
            if y>T[1] and abs(x-T[0])>R-1: hs.add((x,y))                 # 南半（港區）：留寬一點的矩形
    g0=make(W,H,T,hs,[])
    if not g0: print(label,'不連通'); return
    er=entry_rule or (lambda c,d: d==R and c[1]<=T[1]+1)
    ents=[c for c in g0.adj if er(c,g0.d[c])]
    g=make(W,H,T,hs,ents)
    print(label,'格',len(g.adj),'入口',len(g.entries),sorted(collections.Counter(g.d[e] for e in g.entries).items()),rate(g,N),flush=True)
    return g,hs
diamond(5,3,[],'菱形 R5＋港區3列')
diamond(5,3,[(5,7),(4,7)],'菱形 R5＋港區3列＋港池')
diamond(5,3,[(5,7),(4,7),(3,3),(7,2),(2,5)],'菱形 R5＋港池＋街區3')
diamond(5,2,[(5,6)],'菱形 R5＋港區2列＋港池')
