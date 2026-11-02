#!/usr/bin/env python3
"""EOS 在巴哈姆特小屋的逐篇人氣分析（與 docs/eos_penana/analyze.py 並行）。

快照：docs/eos_bahamut/YYYY-MM-DD.csv（csn,category,visit,gp）
  抓法：瀏覽器開 https://home.gamer.com.tw/profile/index_creation.php?owner=AngeLucifer ，
  在頁面跑（credentials:'include'，列表 API 一頁 30 筆，共 8 頁）：
    let all=[];for(let p=1;p<=8;p++){const r=await fetch('https://api.gamer.com.tw/home/v2/creation_list.php?owner=AngeLucifer&page='+p+'&row=30',{credentials:'include'}).then(r=>r.json());all.push(...r.data.list)}
    all.sort((a,b)=>a.csn-b.csn); all.map(x=>x.csn+','+x.category+','+x.visit+','+x.gp).join(';')
⚠ 巴哈是連載期間逐日發文，累計人氣＝「發文那天的曝光」，量不出從頭讀的留存；
  要看的是完結後每週的增量落在哪裡。
⚠ 第二部 Ch 28（上）（csn 6322787）被放在第一部資料夾 527781，這裡依 csn 位置歸到第二部。
"""
import csv, glob, os

HERE = os.path.dirname(os.path.abspath(__file__))
P1, P2, OLD = 527781, 529269, 0
MISFILED = {6322787: P2}

def load(path):
    out = {}
    for r in csv.DictReader(open(path, encoding='utf-8')):
        csn = int(r['csn']); cat = MISFILED.get(csn, int(r['category']))
        out[csn] = (cat, int(r['visit']), int(r['gp']))
    return out

def segs(snap):
    """依 csn 排序後切段：第一部正文（上下兩篇一章，45 章＝90 篇）、第一部附錄、第二部正文（序＋58 章＝117 篇）、第二部附錄。"""
    p1 = [k for k in sorted(snap) if snap[k][0] == P1]
    p2 = [k for k in sorted(snap) if snap[k][0] == P2]
    # p1[0] 是第 1 章上、p1[1] 是第一部簡介（發文順序如此），之後依序
    return [('P1 第1章', p1[0:3]), ('P1 2–10章', p1[3:21]), ('P1 11–24 追憶', p1[21:49]),
            ('P1 25–44章', p1[49:89]), ('P1 FIN', p1[89:91]), ('P1 後記人物卡', p1[91:]),
            ('P2 序＋1章', p2[0:3]), ('P2 2–29章', p2[3:59]), ('P2 30–57章', p2[59:115]),
            ('P2 FIN', p2[115:117]), ('P2 後記人物卡', p2[117:])]

def main():
    files = sorted(glob.glob(os.path.join(HERE, '????-??-??.csv')))
    if not files: print('沒有快照'); return
    cur = load(files[-1]); prev = load(files[-2]) if len(files) > 1 else None
    tot = lambda s: sum(v[1] for k, v in s.items() if v[0] != OLD)
    print('最新快照：', os.path.basename(files[-1]), ('｜對照：' + os.path.basename(files[-2])) if prev else '')
    print('EOS 人氣合計：', tot(cur), ('(%+d)' % (tot(cur) - tot(prev))) if prev else '')
    print('%-14s %8s %8s' % ('段', '每篇累計', '每篇增量' if prev else ''))
    for name, ks in segs(cur):
        c = sum(cur[k][1] for k in ks) / len(ks)
        d = (c - sum(prev[k][1] for k in ks if k in prev) / len(ks)) if prev else None
        print('%-14s %8.0f %8s' % (name, c, '%+.1f' % d if d is not None else ''))
    if prev:
        d = {k: cur[k][1] - prev.get(k, (0, 0, 0))[1] for k in cur if cur[k][0] != OLD}
        print('有增加的篇數：%d / %d' % (sum(1 for v in d.values() if v > 0), len(d)))
        top = sorted(d.items(), key=lambda x: -x[1])[:8]
        print('增量最多：', ', '.join('csn%d(+%d)' % kv for kv in top))
        gp = [k for k in cur if k in prev and cur[k][2] > prev[k][2]]
        if gp: print('有新 GP：', ', '.join('csn%d' % k for k in gp))

if __name__ == '__main__':
    main()
