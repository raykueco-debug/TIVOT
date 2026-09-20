#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""敵人卡的「等級／類型／stage 加成」基準（ver -1582，Ray 交辦）

    python3 tools/enemies_baseline.py plan     # 只印要改什麼，不動檔案
    python3 tools/enemies_baseline.py apply    # 就地改 script/enemies.js

Ray 的規格（原話）：
  · 等級分 SABCDE：S 強力boss／A Boss／B 中boss／C 略強小怪／D 弱小怪／
    E 劇情敵（一概先套帝都賞金獵人數值）
  · 類型：速度型 攻擊頻率 3（hp 較低）／力量型 4（hp 中等）／
    防禦型 5（hp 高、BR 統一增傷 50%）／**無分類的由我手動設製**
  · C 以下預設不疊圈；**D 以下不出 16 格**
  · 「怪的強度係數有天生的等級加成，還有後天的 stage 加成」

⚠⚠⚠ **就地改值，不重產檔案**（同 `enemies_xlsx.py import` 的原則）：
  `script/enemies.js` 裡那些 ⚠ 註解是這個專案最貴的東西，整檔重產會洗掉。
  這一支只做兩件事：① 在 `kind:` 那一行後面插三行新欄位
  ② 把 `hp`／`attack`／`assaultEvery`／`boardGrids`／`stack` 的值換掉。

⚠⚠ **`tier` 是機械填的暫定值**（Ray：「我再進去補怪等級」）——
  規則寫在 `guess_tier()`，每一張都印得出來為什麼。他在 Excel 裡改完再 import。
"""
import os, re, sys, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _jsrun               # JS 資料的唯一引擎
import _utf8  # noqa: F401

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS   = os.path.join(ROOT, 'script', 'enemies.js')

def load(name, files, expr):
    """⚠ `config.js` 會 import `ART`／`ENEMIES` —— 要把它依賴的那幾支一起串起來跑
       （同 script_lint.py 的 load_data）。"""
    parts = []
    for f in files:
        src = open(os.path.join(ROOT, f), encoding='utf-8').read()
        parts.append(re.sub(r'^\s*(import|export)\s.*$',
                     lambda m: m.group(0).replace('export ', '').replace('import ', '//import '),
                     src, flags=re.M))
    parts.append('print(JSON.stringify(%s));' % expr)
    return _jsrun.dump('\n'.join(parts), what=name)

# ── ⚠ 手動設製的那幾張：一律不碰（Ray：「無分類的由我手動設製」）──────────────
#    判準寫成**白名單以外全動**太危險，所以反過來：**只列出「不要動」的**。
#    · 教學／打靶／測試用：數值是教學流程的一部分，動了教學就壞
#    · 四張龍與四張守墓者：Ray 逐張指定過來源卡（`_dragon_spec.md`）
# ── ⚠⚠⚠ 什麼叫「手動設製」：**Ray 的表說了算**（ver -1584b）─────────────────
#   判準只有一條：**`tier` 與 `atype` 兩欄都填了才套基準**。
#   Ray 的原話是「**無分類的由我手動設製**」—— 類型留白就是他要自己調的那幾張。
#   ⚠⚠ **-1582 那份寫死的名單已經刪掉**：它會**蓋過他在表上的決定**
#     （實例：`faceless`／`facelessgiant` 他給了 B＋類型，名單卻把它們擋在外面，
#      於是表上寫著 B、數值還是教學那一套 —— 而且不會有任何錯誤訊息）。
#   ⚠ 只留一條機器判得出來的：打靶（`kind:'target'`）與計時賽（`timeAttack`）
#     的數值是小遊戲的規則，不是戰鬥數值。⚠ 它們本來就沒有類型，這一條是保險。
def is_manual(k, e):
    return e.get('kind') == 'target' or bool(e.get('timeAttack'))

def tier_type(k, e):
    """⚠⚠ **ver -1584b 起讀卡上的 `tier`／`atype`（＝Ray 在 Excel 裡填的）**，
       不再自己猜。兩欄只要缺一個就當「手動設製」不碰數值
       （Ray：「無分類的由我手動設製」）。"""
    t, a = e.get('tier'), e.get('atype')
    return (t, a) if (t and a) else (None, None)

def main():
    mode = (sys.argv[1] if len(sys.argv) > 1 else 'plan')
    DEPS = ['script/speakers.js', 'script/enemies.js', 'config.js']
    E = load('敵人卡', DEPS, 'ENEMIES')
    T = load('tuning', DEPS, 'GAME_CONFIG.tuning')
    TIER, TYPE = T['enemyTier'], T['enemyType']
    src = open(JS, encoding='utf-8').read()
    rows, edits = [], 0

    for k, e in E.items():
        tier, atype = tier_type(k, e)
        if is_manual(k, e) or not tier or tier not in TIER or atype not in TYPE:
            rows.append((k, e.get('tier') or '—', e.get('atype') or '—',
                         '(手動設製／等級或類型還沒填，不動數值)')); continue
        t, ty = TIER[tier], TYPE[atype]
        hp   = int(round(t['hp'] * ty['hpMul'] / 10.0)) * 10      # 取到十位，表上好讀
        atk  = t['atk']
        every = [ty['every'] - 1, ty['every'] + 1]
        grids = t['grids']
        stack = t['stack']
        rows.append((k, tier, atype,
                     'hp %d→%d  atk %d→%d  每 %s 秒  %s  疊圈%d'
                     % (e.get('hp') or 0, hp, e.get('attack') or 0, atk,
                        '%d~%d' % tuple(every), '/'.join(map(str, grids)), stack)))
        if mode != 'apply':
            continue
        # ── 就地改值：只在這一張卡的區段裡替換 ──────────────────────────
        # ⚠ 卡的開頭那一行**可能帶行末註解**（`sv_wolf_pack: {   // …`）——
        #   用嚴格的 `$` 會靜靜漏掉 14 張（-1584b 踩過，表上有值、卡上沒改）。
        m = re.search(r'^(    %s: \{.*)$' % re.escape(k), src, re.M)
        if not m:
            print('⚠ 找不到卡的開頭，跳過：', k); continue
        end = src.index('\n    },', m.start()) + len('\n    },')
        blk, blk0 = src[m.start():end], src[m.start():end]
        def put(pat, rep):
            nonlocal blk
            blk = re.sub(pat, rep, blk, count=1, flags=re.M)
        # ⚠⚠ **行末註解一起換掉**：它講的是**舊的**數字（「槍之魔女 45 的 50%」
        #   「hp＝Ray 表」…）—— 值換了註解沒換，那就是一句會被下一個人當成
        #   規格讀的假話（鐵律 7 的但書：過期的那一份不要存在）。
        TAG = '   // ver -1582 基準（等級×類型；Ray 補等級後重跑）'
        put(r'^(      hp:)\s*[0-9.]+,.*$',              '\\g<1>%d,%s' % (hp, TAG))
        put(r'^(      attack:)\s*[0-9.]+,.*$',          '\\g<1>%d,%s' % (atk, TAG))
        put(r'^(      assaultEvery:)\s*\[[^\]]*\],?.*$', '\\g<1>[%d,%d],%s' % (every[0], every[1], TAG))
        put(r'^(      boardGrids:)\s*\[[^\]]*\],?.*$',   '\\g<1>[%s],%s' % (','.join(map(str, grids)), TAG))
        # ⚠⚠ **四個新欄位一起插在 `kind:` 後面**（Ray：「在怪種類那列後面加上」）：
        #   一次 `put` 一件事的話，後面那幾次會與前面搶同一個錨點而漏掉
        #   （實測 19 張 A／B 的 `stack` 就是這樣沒插進去，而且不會報錯）。
        # ⚠⚠⚠ **一欄一行**（ver -1584b）：`enemies_xlsx.py import` 是照
        #   `^      欄名: 值,$` 就地改值的 —— 把好幾欄擠在同一行，匯入器**改不到**
        #   （實測「改不到 116 格」就是這樣來的，而且它不會報錯，只會靜靜跳過）。
        if re.search(r'^      stack:', blk, re.M):
            put(r'^      stack:.*$', '      stack:%d,' % stack)
        else:
            put(r'^(      stageScale:.*\n)', '\\g<1>      stack:%d,\n' % stack)
        if ty['brBonus']:
            if re.search(r'^      brBonus:', blk, re.M):
                put(r'^      brBonus:.*$', '      brBonus:%s,' % ty['brBonus'])
            else:
                put(r'^(      stack:.*\n)', '\\g<1>      brBonus:%s,\n' % ty['brBonus'])
        elif re.search(r'^      brBonus:', blk, re.M):
            blk = re.sub(r'^      brBonus:.*\n', '', blk, flags=re.M)
        if blk != blk0:
            src = src[:m.start()] + blk + src[end:]
            edits += 1

    w = max(len(r[0]) for r in rows)
    for k, tier, atype, note in sorted(rows, key=lambda r: (r[1], r[0])):
        print('%-*s  %-2s %-4s %s' % (w, k, tier, atype, note))
    print('\n%d 張；%s' % (len(rows), ('改了 %d 張' % edits) if mode == 'apply' else '（plan：沒有動檔案）'))
    if mode == 'apply':
        open(JS, 'w', encoding='utf-8').write(src)

if __name__ == '__main__':
    main()
