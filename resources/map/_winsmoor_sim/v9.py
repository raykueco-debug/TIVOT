exec(open('sectors.py',encoding='utf8').read())
W=H=11; T=(2,2); R=11
WALLS=set()
for x in range(4,W,2): WALLS.add(w((x,1),(x,2)))      # 河岸帶與城區之間：堤防＋倉庫牆
for y in range(4,H,2): WALLS.add(w((1,y),(2,y)))      # 崖邊帶與城區之間：舊城牆
WALLS|={w((4,2),(5,2)),w((2,4),(2,5))}                 # 戰時路障：議會街東段、市政廳街南段
EF=lambda c:(c[0]>=W-2 or c[1]>=H-2)
g=mk(W,H,T,WALLS,R,EF)
