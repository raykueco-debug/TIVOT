#!/usr/bin/env python3
"""EOS 在 Penana 的逐章閱讀數分析。

快照：docs/eos_penana/YYYY-MM-DD.csv（idx,reads,likes,comments）
  idx ＝ Penana 目錄上的流水號（#1～#222）。抓法：瀏覽器開故事頁，在頁面跑
  docs/eos_penana/README 裡那段 JS（curl 會被擋）。

用法：python3 docs/eos_penana/analyze.py
  · 一份快照：印各段平均（累計值）
  · 兩份以上：另印「最新 − 上一份」的增量 —— 增量才是這段期間真正的讀者流，
    累計值會被「先上架的章累積比較久」汙染。
"""
import csv, glob, os, statistics as st

HERE = os.path.dirname(os.path.abspath(__file__))

# 目錄結構（2026-10-03 的版面）：#1 第一部簡介、#2～#91 第一部 1～44 章＋FIN（上下各一篇）、
# #97 第二部簡介、#98～#213 第二部 1～57 章＋FIN。
def p1(n): return (2*n, 2*n+1)             # 第一部第 n 章（FIN＝45）
def p2(n): return (98+2*(n-1), 99+2*(n-1))  # 第二部第 n 章（FIN＝58）

SEGS = [
    ('P1 1–2 入口',      p1, 1, 2),
    ('P1 3–5',          p1, 3, 5),
    ('P1 6–10',         p1, 6, 10),
    ('P1 11–24 追憶',    p1, 11, 24),
    ('P1 25–33',        p1, 25, 33),
    ('P1 34–44',        p1, 34, 44),
    ('P1 FIN',          p1, 45, 45),
    ('P2 1–6',          p2, 1, 6),
    ('P2 7–12',         p2, 7, 12),
    ('P2 13–18',        p2, 13, 18),
    ('P2 19–29',        p2, 19, 29),
    ('P2 30–40',        p2, 30, 40),
    ('P2 41–48',        p2, 41, 48),
    ('P2 49–57',        p2, 49, 57),
    ('P2 FIN',          p2, 58, 58),
]

def load(path):
    return {int(r['idx']): r for r in csv.DictReader(open(path, encoding='utf-8'))}

def seg_mean(snap, f, a, b, key='reads'):
    v = [(int(snap[i][key]) + int(snap[j][key])) / 2 for n in range(a, b+1) for i, j in [f(n)]]
    return st.mean(v)

def main():
    files = sorted(glob.glob(os.path.join(HERE, '????-??-??.csv')))
    if not files: print('沒有快照'); return
    cur = load(files[-1])
    prev = load(files[-2]) if len(files) > 1 else None
    print('最新快照：', os.path.basename(files[-1]),
          ('｜對照：' + os.path.basename(files[-2])) if prev else '')
    print('%-14s %8s %8s' % ('段', '累計', '增量' if prev else ''))
    for name, f, a, b in SEGS:
        c = seg_mean(cur, f, a, b)
        d = (c - seg_mean(prev, f, a, b)) if prev else None
        print('%-14s %8.0f %8s' % (name, c, '%+.1f' % d if d is not None else ''))
    if prev:
        top = sorted(((int(cur[i]['reads']) - int(prev.get(i, {'reads': 0})['reads']), i)
                      for i in cur), reverse=True)[:8]
        print('增量最多的篇：', ', '.join('#%d(+%d)' % (i, d) for d, i in top))
        newc = [i for i in cur if prev.get(i) and int(cur[i]['comments']) > int(prev[i]['comments'])]
        if newc: print('有新留言：', ', '.join('#%d' % i for i in newc))

if __name__ == '__main__':
    main()
