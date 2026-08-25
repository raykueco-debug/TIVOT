#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
script_lint.py — 劇本稿的體檢工具（ver -342）

用途：Ray 餵一段稿、我轉成 script/mainScript.js 之後，跑這支確認
「腳本引用到的東西全部真的存在」——缺圖、缺音效、打錯角色 id、scene 鏈斷掉，
都在這裡一次抓出來，不必等到在瀏覽器上演到那一句才發現。

  python3 tools/script_lint.py

⚠ 資料不是用 regex 猜的：借 macOS 內建的 jsc 把 mainScript.js / speakers.js
  真的**執行**一次再 dump 成 JSON（兩支都是純資料，沒有 DOM 依賴）。
  regex 版本在巢狀物件與註解裡的假陽性太多，維護成本比這條路高。

⚠ 音效／BGM 表（story.js 的 SE_FILES / BGM_FILES）也一併對照資料夾：
  加了檔案忘了加進表裡，遊戲會靜默找不到，這裡會報。
"""
import json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSC  = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc'

BG_DIR, CG_DIR, SI_DIR = 'resources/background/', 'resources/illustration/', 'resources/SI/'
SE_DIR, BGM_DIR        = 'resources/audio/se/', 'resources/audio/bgm/'
AUDIO_EXT = ('.mp3', '.m4a', '.wav', '.ogg')

errs, warns = [], []
def err(m):  errs.append(m)
def warn(m): warns.append(m)

# ── 用 jsc 把資料檔跑出來（去掉 import/export，直接 dump JSON）──────────────
def strip_module(src):
    src = re.sub(r'^\s*import[^;]*;', '', src, flags=re.M)
    src = re.sub(r'^\s*export\s+(?=(const|let|var|function|class|async))', '', src, flags=re.M)
    src = re.sub(r'^\s*export\s*\{[^}]*\};?', '', src, flags=re.M)
    return src

def load_data():
    if not os.path.exists(JSC):
        print('找不到 jsc（%s）——這支工具依賴 macOS 內建的 JavaScriptCore。' % JSC)
        sys.exit(2)
    parts = []
    # ⚠ 城鎮（`script/town.js`）與 config 也一起載（ver -375）：城鎮節點現在會帶
    #   **劇情插入戰**與整段對白，跟主線一樣需要驗 —— 缺圖／打錯角色 id／
    #   battle 指到不存在的場次，一樣要在這裡就抓到，不要等演到那一句。
    for f in ('script/speakers.js', 'script/mainScript.js', 'script/town.js', 'config.js'):
        parts.append(strip_module(open(os.path.join(ROOT, f), encoding='utf-8').read()))
    parts.append('print(JSON.stringify({script:MAIN_SCRIPT, entry:MAIN_ENTRY,'
                 ' speakers:SPEAKERS, art:ART, towns:TOWNS, cfg:GAME_CONFIG}));')
    t = tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8')
    t.write('\n'.join(parts)); t.close()
    r = subprocess.run([JSC, t.name], capture_output=True, text=True)
    os.unlink(t.name)
    if r.returncode != 0 or not r.stdout.strip():
        print('讀不到腳本資料：\n' + (r.stderr or r.stdout)); sys.exit(2)
    return json.loads(r.stdout)

# ── story.js 的音效／BGM 表 ────────────────────────────────────────────────
def table(name):
    s = open(os.path.join(ROOT, 'modules/story.js'), encoding='utf-8').read()
    m = re.search(r'const %s=\[(.*?)\];' % name, s, re.S)
    return set(re.findall(r"'([^']+)'", m.group(1))) if m else set()

def alias(name):
    s = open(os.path.join(ROOT, 'modules/story.js'), encoding='utf-8').read()
    m = re.search(r'const %s=\{(.*?)\};' % name, s, re.S)
    return dict(re.findall(r"(\w+)\s*:\s*'([^']+)'", m.group(1))) if m else {}

def check_audio_table(files, folder, label):
    disk = {f for f in os.listdir(os.path.join(ROOT, folder))
            if not f.startswith('_') and f.lower().endswith(AUDIO_EXT)}
    for f in sorted(disk - files):  warn('%s 表裡沒有這個檔案（遊戲載不到）：%s' % (label, f))
    for f in sorted(files - disk):  err ('%s 表指到不存在的檔案：%s' % (label, f))
    return {f.rsplit('.', 1)[0].lower(): f for f in disk}

def exists(rel):  return os.path.exists(os.path.join(ROOT, rel))

def main():
    D = load_data()
    script, entry, speakers, art = D['script'], D['entry'], D['speakers'], D['art']

    se_map  = check_audio_table(table('SE_FILES'),  SE_DIR,  'SE_FILES')
    bgm_map = check_audio_table(table('BGM_FILES'), BGM_DIR, 'BGM_FILES')
    se_alias, bgm_alias = alias('SE_ALIAS'), alias('BGM_ALIAS')

    def audio_ok(key, m, al):
        k = str(key).lower()
        return k in m or al.get(k, '') in m

    # ── scene 鏈 ──
    if entry not in script:
        err('MAIN_ENTRY 指到不存在的場景：%s' % entry)
    reached, q = set(), [entry]
    while q:
        sid = q.pop()
        if sid in reached or sid not in script: continue
        reached.add(sid)
        nx = script[sid].get('next')
        if nx: q.append(nx)
    for sid, sc in script.items():
        if sc.get('sceneId') != sid:
            err('%s：sceneId 欄位（%s）與鍵名不一致' % (sid, sc.get('sceneId')))
        nx = sc.get('next')
        if nx and nx not in script:
            err('%s：next 指到不存在的場景 %s' % (sid, nx))
        if sid not in reached:
            warn('%s：從 MAIN_ENTRY 走不到（孤兒場景，正常嗎？）' % sid)

    # ── 逐句 ──
    #  ⚠ 抽成一支給**主線與城鎮共用**（ver -375）：規矩只寫一份，新的路徑才不會漏檢
    #    （鐵律 8 —— 城鎮節點就是這樣長出第二套的）。
    def check_lines(sid, lines, scenes_ok=True):
        labels = {l.get('label') for l in (lines or []) if isinstance(l, dict) and l.get('label')}
        for i, ln in enumerate(lines or []):
            tag = '%s[%d]' % (sid, i)

            # 跳轉拍（ver -377）：`goto` 與戰鬥的 `onLose` 都指向同一段裡的 `label`。
            if ln.get('goto'):
                if ln['goto'] not in labels:
                    err('%s：goto 指到這一段裡沒有的 label：%s' % (tag, ln['goto']))
                continue                      # 控制拍，不帶演出

            # 輸入主角名的閘門（ver -395）：沒有台詞也沒有 speaker，不必驗演出欄位。
            if ln.get('nameInput'):
                continue
            if ln.get('load'):
                if ln['load'] not in script:
                    err('%s：load 指到不存在的場景 %s' % (tag, ln['load']))
                continue                      # 閘門，不是演出拍：沒有 speaker 也正常
            if ln.get('battle'):
                # 戰鬥交棒，這一行不帶演出。⚠ 但要驗它指得到一場戰鬥：
                #   `config.battles` 有登記（劇情插入戰），或那是教學那一場。
                b = ln['battle']
                bt = (D['cfg'].get('battles') or {}).get(b)
                if not bt and b != 'tutorial':
                    err('%s：battle 指到 config.battles 裡沒有的場次 %s' % (tag, b))
                # 可戰敗的分歧：`onLose` 要指得到 label，而且那一場要真的允許戰敗
                if ln.get('onLose'):
                    if ln['onLose'] not in labels:
                        err('%s：onLose 指到這一段裡沒有的 label：%s' % (tag, ln['onLose']))
                    if bt and not bt.get('allowLose'):
                        err('%s：寫了 onLose，但 config.battles.%s 沒有 allowLose'
                            ' —— 那一場輸了會 Game Over，這一支分歧演不到' % (tag, b))
                elif bt and bt.get('allowLose'):
                    warn('%s：%s 標了 allowLose 卻沒有 onLose —— 輸了會照著贏的那一支往下演'
                         % (tag, b))
                continue

            sp = ln.get('speaker')
            if sp is None:
                err('%s：沒有 speaker（有 card／演出拍也要填，用來決定高亮誰）' % tag)
            elif sp not in speakers:
                err('%s：speaker 不在 speakers.js：%s' % (tag, sp))

            p = ln.get('portrait') or {}
            who = p.get('char') or sp
            if p.get('char') and p['char'] not in speakers:
                err('%s：portrait.char 不在 speakers.js：%s' % (tag, p['char']))
            if p.get('expr'):
                a = art.get((speakers.get(who) or {}).get('art') or '')
                if not a:
                    warn('%s：%s 沒有立繪資料，expr 不會生效' % (tag, who))
                elif p['expr'] not in (a.get('expr') or {}):
                    warn('%s：%s 沒有 %s 這張差分，會回退基本立繪' % (tag, who, p['expr']))

            for h in ([] if ln.get('hide') is None else
                      (ln['hide'] if isinstance(ln['hide'], list) else [ln['hide']])):
                if h not in speakers:
                    err('%s：hide 指到不存在的角色 %s' % (tag, h))

            if ln.get('bg'):
                d = CG_DIR if re.match(r'^\d{3}_', ln['bg']) else BG_DIR
                if not exists(d + ln['bg'] + '.webp'):
                    # 有 PNG 沒 WebP：載得到（載入器兩個都試），但**沒照 §5 轉檔** → 提醒不是錯
                    if exists(d + ln['bg'] + '.png'):
                        warn('%s：背景 %s 只有 .png，還沒轉成 .webp（§5 的規約）' % (tag, ln['bg']))
                    else:
                        err('%s：沒有這張背景 %s（找 %s）' % (tag, ln['bg'], d))
            if ln.get('cg') and not exists(CG_DIR + ln['cg'] + '.webp'):
                err('%s：沒有這張插圖 %s' % (tag, ln['cg']))
            if ln.get('ci') and not exists(SI_DIR + ln['ci'] + '.webp'):
                err('%s：沒有這張 CI %s' % (tag, ln['ci']))

            if ln.get('bgm') and not audio_ok(ln['bgm'], bgm_map, bgm_alias):
                err('%s：沒有這首 BGM %s' % (tag, ln['bgm']))
            spec = ln.get('se')
            for one in ([] if spec is None else (spec if isinstance(spec, list) else [spec])):
                k = one if isinstance(one, str) else one.get('n')
                if not audio_ok(k, se_map, se_alias):
                    err('%s：沒有這個音效 %s' % (tag, k))

            for f, allowed in (('cgPan', ('up', 'down')), ('bgPan', ('up', 'down'))):
                if ln.get(f) not in (None, *allowed) and f in ln:
                    err('%s：%s 只能是 up／down／null，收到 %r' % (tag, f, ln[f]))
            if ln.get('fx') and ln['fx'] != 'gunfire':
                err('%s：fx 目前只有 gunfire，收到 %r' % (tag, ln['fx']))
            if ln.get('cgScale') is not None:
                v = ln['cgScale']
                if not (isinstance(v, (int, float)) and 0.5 <= v <= 3):
                    err('%s：cgScale 要是 0.5~3 的倍率，收到 %r' % (tag, v))
                if ln.get('cgZoom'):
                    err('%s：cgScale 與 cgZoom 互斥（一個是固定放大、一個是推近動畫）' % tag)
            if ln.get('cgZoom'):
                z = ln['cgZoom']
                if not (isinstance(z, dict) and 0 <= z.get('x', -1) <= 1 and 0 <= z.get('y', -1) <= 1):
                    err('%s：cgZoom 要是 {x,y}，兩個值都在 0~1' % tag)
            # 沒有台詞、沒有卡片、又不會自己走的拍：畫面上沒有 ▼ 提示，看起來像卡住
            if not ln.get('text') and not ln.get('card') and not ln.get('auto') and not ln.get('blank'):
                warn('%s：空台詞又沒有 auto —— 畫面上不會有提示，玩家可能以為卡住' % tag)

    for sid, sc in script.items():
        check_lines(sid, sc.get('lines'))

    # ── 城鎮節點（ver -375）──
    #  ⚠ 背景是**基底名**（時段尾巴由 clock.bgName 加），所以候選是 `_Day` 或原名，
    #    兩個都沒有才算缺 —— 照主線那樣只找原名會全部誤報。
    cfg = D['cfg']
    for tid, town in (D.get('towns') or {}).items():
        nodes = town.get('nodes') or {}
        for nid, n in nodes.items():
            tag = '%s.%s' % (tid, nid)
            for d, to in (n.get('exits') or {}).items():
                if to not in nodes:
                    err('%s：出口 %s 指到不存在的節點 %s' % (tag, d, to))
            bg = n.get('bg')
            if bg and not (exists(BG_DIR + bg + '_Day.webp') or exists(BG_DIR + bg + '.webp')):
                # 同上：有 PNG 只是還沒轉檔（`bgFor` 兩個副檔名都試），不是「缺圖」
                if exists(BG_DIR + bg + '_Day.png') or exists(BG_DIR + bg + '.png'):
                    warn('%s：背景 %s 只有 .png，還沒轉成 .webp（§5 的規約）' % (tag, bg))
                else:
                    err('%s：沒有這張背景 %s（找 %s，含 _Day）' % (tag, bg, BG_DIR))
            if n.get('shop') and n['shop'] not in ((cfg.get('shop') or {}).get('stock') or {}):
                err('%s：shop 指到 config.shop.stock 裡沒有的貨單 %s' % (tag, n['shop']))
            if n.get('board'):
                bs = [b for b in (cfg.get('bounties') or {}).values() if b.get('city') == n['board']]
                if not bs:
                    warn('%s：懸賞榜 %s 目前一張委託都沒有' % (tag, n['board']))
            for key in ('lines', 'keeper'):
                check_lines('%s.%s' % (tag, key), n.get(key))

    for m in errs:  print('❌ ' + m)
    for m in warns: print('⚠  ' + m)
    print('\n%d 個錯誤、%d 個提醒。' % (len(errs), len(warns)))
    return 1 if errs else 0

if __name__ == '__main__':
    sys.exit(main())
