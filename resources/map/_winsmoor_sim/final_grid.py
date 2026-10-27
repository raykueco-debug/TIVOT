exec(open('grid_try6.py',encoding='utf8').read().split("diamond(5,3,[],")[0])
R=5;T=(5,5);W=11;SOUTH=2;H=R+1+SOUTH
HOLES={(4,7),(5,7),(3,3),(7,2),(2,5)}
def build():
    hs=set(HOLES)
    for x in range(W):
        for y in range(H):
            if abs(x-T[0])+abs(y-T[1])>R and y<=T[1]: hs.add((x,y))
            if y>T[1] and abs(x-T[0])>R-1: hs.add((x,y))
    g0=make(W,H,T,hs,[])
    ents=[c for c in g0.adj if g0.d[c]==R and c[1]<=T[1]+1]
    return make(W,H,T,hs,ents),hs
if __name__=='__main__':
    g,hs=build()
    for y in range(H):
        print(y,' '.join(('   ' if (x,y) in hs else (f'*{g.d[(x,y)]}*' if (x,y) in g.entries else f' {g.d[(x,y)]} ')) for x in range(W)))
    print('格',len(g.adj),'入口',len(g.entries))
    import sys
    if '--sim' in sys.argv:
        fs=[('全A',lambda r:[1]*7),('全B',lambda r:[0]*7),('A/B各半',lambda r:[r.choice([1,0]) for _ in range(7)]),('多數A偶爾B',lambda r:[0 if r.random()<.25 else 1 for _ in range(7)])]
        print(rate(g,150,fs))
