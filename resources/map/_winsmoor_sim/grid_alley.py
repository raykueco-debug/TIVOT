exec(open('final_grid.py',encoding='utf8').read().split("if __name__")[0])
import sys
ALL={'橋':((1,5),(3,5)),'窄巷':((2,3),(4,3)),'渡船':((3,7),(6,7))}
fs=[('全A',lambda r:[1]*7),('全B',lambda r:[0]*7),('A/B各半',lambda r:[r.choice([1,0]) for _ in range(7)])]
for combo in [[],['橋'],['窄巷'],['渡船'],['橋','窄巷'],['橋','窄巷','渡船']]:
    g,hs=build()
    pa={k:list(v) for k,v in g.adj.items()}
    for c in combo:
        a,b=ALL[c]; pa[a].append(b); pa[b].append(a)
    g.adj={k:tuple(v) for k,v in pa.items()}
    print('小路',combo or '無',rate(g,150,fs),flush=True)
