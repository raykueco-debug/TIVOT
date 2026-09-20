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
MANUAL = {
    # 教學／劇情殺／亂入：數值是那一段流程的一部分，動了流程就壞
    'trainee', 'intruderEnemy', 'faceless', 'facelessgiant',
    # ⚠⚠ **E 級的錨點本身**：Ray「E 是劇情敵，一概先套帝都賞金獵人數值」
    #   —— 那就是這一張（`guild_hunter`），它是尺不是被量的東西。
    'guild_hunter',
    # 四張龍與四張守墓者：Ray 逐張指定過來源卡（`_dragon_spec.md`）
    'bl_dragon_chase', 'bl_dragon_throne', 'bl_dragon_throne2', 'bl_dragon_front', 'bl_dragon_sky',
    'gk_seal', 'gk_offset', 'gk_many', 'gk_crypt',
}
def is_manual(k, e):
    """⚠⚠ **不是「普通會打的怪」就不要碰**（除了上面點名的那幾張）：
       · `kind:'target'` ＝打靶（靶不會動，數值是小遊戲的規則）
       · `timeAttack` ＝計時賽（`attack:1` 那種「不會真的扣血」的卡，
         而且 `assaultEvery` 是 Ray 逐張指定的秒數）
       ⚠ 判準讀**資料本身**不列名單（鐵律 7）—— 日後多一張打靶卡自動跳過。"""
    return (k in MANUAL) or e.get('kind') == 'target' or bool(e.get('timeAttack'))

def guess_tier(k, e):
    """⚠⚠ **暫定，用現在的血量分級**（Ray：「我再進去補怪等級」）——
       規則按順序取第一個成立的，每一張都印得出理由，他要在 Excel 裡整批改很容易。
       ⚠ **不自動給 E**：E 是「劇情敵」，那是**劇本的身分**不是數值特徵，
         而這個庫裡 `story:1` 的卡佔了七成（那一格的意思是「劇情戰」）——
         拿它當判準會把整個庫塞進 E。等 Ray 點名。"""
    hp = e.get('hp') or 0
    if e.get('boss'):            return 'A', 'boss:1'
    if hp >= 800:                return 'S', 'hp≥800'
    if hp >= 600:                return 'A', 'hp≥600'
    if hp >= 380:                return 'B', 'hp≥380'
    if hp >= 250:                return 'C', 'hp≥250'
    return 'D', 'hp<250'

def guess_type(k, e):
    """⚠⚠ **暫定，一律給中庸的力量型**（除了現在就明顯慢的那幾張）。
       ⚠ 不用「拿 `assaultEvery` 反推」：這個庫裡九成的卡都是 `[2,4]`，
         反推出來會變成「全部都是速度型」—— 那不是分類，是把預設值當答案。"""
    ev = e.get('assaultEvery') or [2, 4]
    return '防禦型' if (ev[0] + ev[1]) / 2.0 >= 6 else '力量型' 

def main():
    mode = (sys.argv[1] if len(sys.argv) > 1 else 'plan')
    DEPS = ['script/speakers.js', 'script/enemies.js', 'config.js']
    E = load('敵人卡', DEPS, 'ENEMIES')
    T = load('tuning', DEPS, 'GAME_CONFIG.tuning')
    TIER, TYPE = T['enemyTier'], T['enemyType']
    src = open(JS, encoding='utf-8').read()
    rows, edits = [], 0

    for k, e in E.items():
        if is_manual(k, e):
            rows.append((k, '—', '—', '(手動設製，不動)')); continue
        tier, why = guess_tier(k, e)
        atype     = guess_type(k, e)
        t, ty     = TIER[tier], TYPE[atype]
        hp   = int(round(t['hp'] * ty['hpMul'] / 10.0)) * 10      # 取到十位，表上好讀
        atk  = t['atk']
        every = [ty['every'] - 1, ty['every'] + 1]
        grids = t['grids']
        stack = t['stack']
        rows.append((k, tier, atype,
                     'hp %d→%d  atk %d→%d  每 %s 秒  %s  疊圈%d   〔%s〕'
                     % (e.get('hp') or 0, hp, e.get('attack') or 0, atk,
                        '%d~%d' % tuple(every), '/'.join(map(str, grids)), stack, why)))
        if mode != 'apply':
            continue
        # ── 就地改值：只在這一張卡的區段裡替換 ──────────────────────────
        m = re.search(r'^(    %s: \{)$' % re.escape(k), src, re.M)
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
        if not re.search(r'^      tier:', blk, re.M):
            extra = ('      brBonus:%s,\n' % ty['brBonus']) if ty['brBonus'] else ''
            put(r'^(      kind:.*\n)',
                "\\g<1>      tier:'%s', atype:'%s', stageScale:1, stack:%d,\n%s"
                % (tier, atype, stack, extra))
        else:
            put(r'^(      tier:).*$',
                "\\g<1>'%s', atype:'%s', stageScale:1, stack:%d," % (tier, atype, stack))
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
