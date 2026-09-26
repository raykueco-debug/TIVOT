#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""girl_star_economy.py — 女主九星的「戰鬥紀錄」經濟試算表（ver -1774）

用法：  python3 tools/girl_star_economy.py        →  docs/girl_star_economy.xlsx

星名、效果、價格、EXP 門檻一律**從 config.js 現讀**（用 macOS 的 jsc 跑一次 import），
不在這裡抄一份（鐵律 7）。試算表裡黃底的格子是可以改的旋鈕，其餘都是公式。
⚠ 試算表是**排排看用的草稿**：定案之後把數字寫回 config.js 的 `girls.recordPerLevel`／
  `starCost`，再重跑這支。
"""
import json, os, subprocess, sys, tempfile
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter as L

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSC = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc'

def load_cfg():
    js = ("import { GAME_CONFIG } from '%s/config.js';\n"
          "const g=GAME_CONFIG.girls, r=GAME_CONFIG.rating;\n"
          "print(JSON.stringify({ who:g.who, expTo:g.expTo, recordPerLevel:g.recordPerLevel,"
          " starCost:g.starCost, starCond:g.starCond||{},"
          " levels:Object.fromEntries(g.who.map(w=>[w,g.levels[w].map(s=>({star:s.star,name:s.name,skill:s.skill,desc:s.desc}))])),"
          " names:Object.fromEntries(g.who.map(w=>[w,GAME_CONFIG.partners[w].name])),"
          " exp:r.exp, boss:r.bossMul }));\n") % ROOT
    with tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False, encoding='utf8') as f:
        f.write(js); p = f.name
    try:
        out = subprocess.run([JSC, '-m', p], capture_output=True, text=True).stdout
    finally:
        os.unlink(p)
    return json.loads(out)

C = load_cfg()
WHO = C['who']; NAME = C['names']
SKILL = {'install': '變身', 'passive': '被動', 'active': '主動'}

Y = PatternFill('solid', fgColor='FFF2B3')          # 可改的旋鈕
H = PatternFill('solid', fgColor='2B2440')          # 表頭
HF = Font(color='FFFFFF', bold=True)
G = PatternFill('solid', fgColor='E6F4EA')          # 建議方案
B = Font(bold=True)
thin = Side(style='thin', color='BBBBBB')
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
WRAP = Alignment(wrap_text=True, vertical='top')
CEN = Alignment(horizontal='center', vertical='center')

def head(ws, row, cols):
    for i, t in enumerate(cols, 1):
        c = ws.cell(row, i, t); c.fill = H; c.font = HF; c.alignment = CEN; c.border = BOX

wb = Workbook()

# ── 說明 ───────────────────────────────────────────────────────────────
ws = wb.active; ws.title = '說明'
lines = [
    ('女主九星・戰鬥紀錄經濟試算（ver -1774 草稿）', True),
    ('', False),
    ('規則（Ray 定案）：星不再用等級鎖。①② 各 1 份、③④ 各 2 份、⑤⑥ 各 3 份、⑦⑧ 各 4 份；⑨＝滿足特定條件（不花紀錄）。', False),
    ('⇒ ①～⑧ 全亮總共要 20 份。等級只負責「產出」紀錄。', False),
    ('', False),
    ('黃底格子＝可以改的旋鈕，其餘都是公式，改了會自己重算。', False),
    ('「參數」：收入的來源（每升一級幾份、Boss 局額外幾份、劇情固定給幾份）與一局的平均分數。', False),
    ('「星價」：三人九顆星的價格與累計成本（價格照 Ray 的規則，改了這裡要回寫 config.js）。', False),
    ('「升級與收入」：每一級要打幾局、那時手上累計幾份、依價格由便宜到貴能點幾顆。', False),
    ('「方案比較」：幾組收入設定並排，看 Lv3／Lv5／Lv7／Lv9 各能點幾顆。綠底＝我的建議。', False),
    ('「失衡分析」：同樣的紀錄量，三個人各自「最強的買法」是什麼、哪幾顆太便宜。', False),
    ('', False),
    ('⚠ 局數用的是「平均分數」的單一估值；實際一局 EXP 還有 overkill 與分數微擾。拿來比較方案夠用，不要拿來算精確進度。', False),
    ('⚠ 索菈娜的 EXP 方向相反（分數越低 EXP 越高，config 的 invertFor），所以同樣的分數她升得不一樣快。', False),
    ('重產這份表：python3 tools/girl_star_economy.py（星名與效果從 config.js 現讀）。', False),
]
for i, (t, b) in enumerate(lines, 1):
    c = ws.cell(i, 1, t); c.font = Font(bold=b, size=14 if b else 11)
ws.column_dimensions['A'].width = 120

# ── 參數 ───────────────────────────────────────────────────────────────
wp = wb.create_sheet('參數')
params = [
    ('每升一級給幾份《戰鬥紀錄》', C['recordPerLevel'], 'r', 'config.girls.recordPerLevel（現值）'),
    ('Boss 局結算額外給幾份', 0, 'boss', '現在沒有這條來源；想加就填'),
    ('Boss 局佔全部局數的比例', 0.3, 'pboss', '估值：北泊／森林／遺蹟／古城的收段多半是 Boss'),
    ('劇情固定給（整趟主線合計）', 0, 'story', '例：每章收尾給一份就填章數'),
    ('平均一局分數（諾薇兒／安雅）', 60, 'score', 'B 等約 50~64'),
    ('平均一局分數（索菈娜）', 60, 'score_s', '她的 EXP 用 100−分數 算'),
    ('EXP 基底 offset', C['exp']['offset'], 'off', 'config.rating.exp.offset'),
    ('EXP 倍率 mult', C['exp']['mult'], 'mult', 'config.rating.exp.mult'),
    ('Boss EXP 倍率', C['boss']['exp'], 'bmul', 'config.rating.bossMul.exp'),
]
head(wp, 1, ['旋鈕', '值', '代號', '說明'])
NAMED = {}
for i, (k, v, code, note) in enumerate(params, 2):
    wp.cell(i, 1, k); c = wp.cell(i, 2, v); c.fill = Y; wp.cell(i, 3, code); wp.cell(i, 4, note)
    NAMED[code] = "參數!$B$%d" % i
r = len(params) + 3
wp.cell(r, 1, '一局平均 EXP（諾／安）').font = B
wp.cell(r, 2, "=({off}+{score}*{mult})*(1-{p}+{p}*{bm})".format(
    off=NAMED['off'], score=NAMED['score'], mult=NAMED['mult'], p=NAMED['pboss'], bm=NAMED['bmul']))
NAMED['exp'] = "參數!$B$%d" % r
wp.cell(r+1, 1, '一局平均 EXP（索菈娜）').font = B
wp.cell(r+1, 2, "=({off}+(100-{score})*{mult})*(1-{p}+{p}*{bm})".format(
    off=NAMED['off'], score=NAMED['score_s'], mult=NAMED['mult'], p=NAMED['pboss'], bm=NAMED['bmul']))
NAMED['exp_s'] = "參數!$B$%d" % (r+1)
for col, w in zip('ABCD', (34, 12, 10, 50)): wp.column_dimensions[col].width = w

# ── 星價 ───────────────────────────────────────────────────────────────
wc = wb.create_sheet('星價')
head(wc, 1, ['序', '價格（份）', '累計（依序）'] + [NAME[w] for w in WHO])
cost = C['starCost']; cond = C['starCond']
for i in range(9):
    rr = i + 2
    wc.cell(rr, 1, '★%d' % (i+1)).alignment = CEN
    if str(i+1) in cond:
        wc.cell(rr, 2, '條件')
        wc.cell(rr, 3, '—')
    else:
        c = wc.cell(rr, 2, cost[i]); c.fill = Y
        wc.cell(rr, 3, "=SUM($B$2:B%d)" % rr)
    for j, w in enumerate(WHO):
        s = C['levels'][w][i]
        c = wc.cell(rr, 4+j, "%s %s（%s）\n%s" % (s['name'], s['star'], SKILL.get(s['skill'], ''), s['desc']))
        c.alignment = WRAP
    wc.row_dimensions[rr].height = 62
wc.cell(12, 1, '①～⑧ 合計').font = B
wc.cell(12, 2, "=SUM(B2:B9)").font = B
wc.column_dimensions['A'].width = 8; wc.column_dimensions['B'].width = 10; wc.column_dimensions['C'].width = 12
for j in range(len(WHO)): wc.column_dimensions[L(4+j)].width = 44
CUM = "星價!$C$2:$C$9"   # ①～⑧ 的累計成本（依序便宜到貴，所以「能點幾顆」＝累計 ≤ 手上份數的列數）

# ── 升級與收入 ─────────────────────────────────────────────────────────
wl = wb.create_sheet('升級與收入')
head(wl, 1, ['等級', '累計 EXP 門檻', '局數（諾／安）', '局數（索菈娜）', '升級給的份數（累計）',
             'Boss 局額外（諾／安）', '手上合計（諾／安）', '能點幾顆（諾／安）', '手上合計（索）', '能點幾顆（索）'])
for lv in range(1, 10):
    rr = lv + 1
    wl.cell(rr, 1, lv).alignment = CEN
    wl.cell(rr, 2, C['expTo'][lv-1])
    wl.cell(rr, 3, "=ROUND(B%d/%s,1)" % (rr, NAMED['exp']))
    wl.cell(rr, 4, "=ROUND(B%d/%s,1)" % (rr, NAMED['exp_s']))
    wl.cell(rr, 5, "=(A%d-1)*%s" % (rr, NAMED['r']))
    wl.cell(rr, 6, "=FLOOR(C%d*%s,1)*%s" % (rr, NAMED['pboss'], NAMED['boss']))
    wl.cell(rr, 7, "=E%d+F%d" % (rr, rr))
    wl.cell(rr, 8, "=SUMPRODUCT(--(%s<=G%d))" % (CUM, rr))
    wl.cell(rr, 9, "=E%d+FLOOR(D%d*%s,1)*%s" % (rr, rr, NAMED['pboss'], NAMED['boss']))
    wl.cell(rr, 10, "=SUMPRODUCT(--(%s<=I%d))" % (CUM, rr))
wl.cell(12, 1, '⚠ 「劇情固定給」沒有攤進逐級（不知道哪一章在哪一級），看「方案比較」那一頁的合計。').font = Font(italic=True)
for i, w in enumerate((8, 14, 14, 14, 18, 18, 16, 16, 14, 14), 1): wl.column_dimensions[L(i)].width = w

# ── 方案比較 ───────────────────────────────────────────────────────────
wm = wb.create_sheet('方案比較')
head(wm, 1, ['方案', '每升一級', 'Boss 局額外', '劇情合計',
              'Lv3 份數', 'Lv3 顆', 'Lv5 份數', 'Lv5 顆', 'Lv7 份數', 'Lv7 顆', 'Lv9 份數', 'Lv9 顆', '評語'])
plans = [
    ('A 現值', 1, 0, 0, '中階（Lv5）3 顆、滿級 4 顆：⑤ 以後幾乎摸不到，「選」變成「只能點前面」。'),
    ('B 每級 2 份', 2, 0, 0, '中階 4 顆、滿級 7 顆：⑧ 要靠劇情或條件補。'),
    ('C 每級 2 份＋Boss 1 份', 2, 1, 0, 'Lv5 就 6 顆、Lv7 全亮：Boss 越多的路線越快（變成鼓勵刷 Boss）。'),
    ('D 每級 2 份＋劇情 4 份', 2, 0, 4, '【建議】中階 4 顆可選、主線打完剛好 ①～⑧ 全亮（20 份）；進度由劇情控，不靠刷。'),
    ('E 每級 3 份', 3, 0, 0, 'Lv5 就 6 顆、Lv9 全亮：太快，⑦⑧ 的強力循環會在中段就出現。'),
]
LVROW = {3: 4, 5: 6, 7: 8, 9: 10}   # 「升級與收入」那一頁的列號
for i, (nm, rpl, bd, st, note) in enumerate(plans, 2):
    wm.cell(i, 1, nm).font = B
    for col, v in ((2, rpl), (3, bd), (4, st)):
        c = wm.cell(i, col, v); c.fill = Y
    for k, lv in enumerate((3, 5, 7, 9)):
        rr = LVROW[lv]
        story_part = "0" if lv < 9 else "D%d" % i
        rec = "=(%d-1)*B%d+FLOOR('升級與收入'!C%d*%s,1)*C%d+%s" % (lv, i, rr, NAMED['pboss'], i, story_part)
        wm.cell(i, 5+k*2, rec)
        wm.cell(i, 6+k*2, "=SUMPRODUCT(--(%s<=%s%d))" % (CUM, L(5+k*2), i))
    c = wm.cell(i, 13, note); c.alignment = WRAP
    if nm.startswith('D'):
        for col in range(1, 14): wm.cell(i, col).fill = G if col not in (2, 3, 4) else Y
    wm.row_dimensions[i].height = 34
wm.cell(9, 1, '⚠ 劇情合計只算進 Lv9 那一欄（假設劇情份數大多在後段給）；要看中段就把一部分改成 Boss 或每級。').font = Font(italic=True)
wm.cell(10, 1, '⚠ 「顆」是依序由便宜到貴能點的顆數；實際玩家會跳著挑（下一頁）。').font = Font(italic=True)
for i, w in enumerate((22, 10, 12, 10, 9, 7, 9, 7, 9, 7, 9, 7, 60), 1): wm.column_dimensions[L(i)].width = w

# ── 失衡分析 ───────────────────────────────────────────────────────────
wa = wb.create_sheet('失衡分析')
head(wa, 1, ['角色', '9 份的最強買法（跳著挑）', '花費', '為什麼強', '風險', '可調的方向（等 Ray 定）'])
rows = [
    ('諾薇兒', '①先鋒 ＋ ②引路 ＋ ⑥斷鉗 ＋ ⑧負行', '1+1+3+4＝9',
     '聖徒化開場血 1（時間最長）＋挨打不推進倒數 ⇒ 幾乎每次都 Maximum Burst。',
     '低：強度要 7 份才成形，前期仍是三人最弱。',
     '【Ray 方向：早期就進入穩定的不死狀態，保護手殘玩家】'
     '不死的三顆是 ④堅殼（天鎖期間射擊回血）、⑦蟹生（天鎖每一隻怪一次）、②引路（失誤一次不受擊）。'
     '建議把 ⑦蟹生換到 ② 或 ③、④堅殼留在 ④ ⇒ 1+1+2＋2＝6 份（方案 D 約 Lv4）就是「每隻怪一次免死＋十秒回血」；'
     '被換下來的 ②引路／③探覓往後挪。聖徒化那一路（⑥⑧）維持高價當後期的上限。'),
    ('安雅', '③烙印 ＋ ⑥前引 ＋ ⑦界心', '2+3+4＝9',
     '③ 只要 2 份就能「3 次完美反擊回填夢魘化」，每回填一次＝再一發敵最大 HP 20% 固定傷害。',
     '高：最便宜就能質變，對 Boss 的傷害不吃技術。',
     '③ 換到更後面的位置（至少 ⑤）；或烙印星改成「一局最多回填 1 次」。'),
    ('索菈娜', '②海宣 ＋ ⑤箭頭 ＋ ⑦聚落 ＋ ①地弓', '1+3+4+1＝9',
     '戰吼→主動技→回填共鬥 ⇒ 無敵共鬥可以一直循環；② 只要 1 份。',
     '高：接近打不死，又有評價寬限＋EXP 反向（升得最快）。',
     '② 海宣星往後挪；或聚落星回填的共鬥時長吃當下破防值、不給滿值。'),
]
for i, row in enumerate(rows, 2):
    for j, v in enumerate(row, 1):
        c = wa.cell(i, j, v); c.alignment = WRAP; c.border = BOX
    wa.row_dimensions[i].height = 78
wa.cell(6, 1, '結論').font = B
wa.cell(7, 1, '價格跟著「位置」走（①② 最便宜），而安雅 ③、索菈娜 ② 這兩顆剛好是會形成循環或陡升的星 —— 失衡主要來自「強的星放在便宜的位置」。'
              '收入調到方案 D 之後，中階大約 4 顆、跳著挑就是 9 份以內的組合，上表三組正好都買得起：安雅與索菈娜在中段就成形，諾薇兒要到後段。').alignment = WRAP
wa.merge_cells('A7:F7'); wa.row_dimensions[7].height = 60
for i, w in enumerate((10, 34, 12, 46, 30, 46), 1): wa.column_dimensions[L(i)].width = w

out = os.path.join(ROOT, 'docs', 'girl_star_economy.xlsx')
wb.save(out)
print('寫出', os.path.relpath(out, ROOT))
