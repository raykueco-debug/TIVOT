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

# ⚠ **先逐檔驗語法，再合起來跑**（ver -403）。合起來跑也會抓到語法錯，但行號是
#   「串起來那個暫存檔」的行號，對不回原檔 —— Ray 手改稿子時最需要的正是
#   「哪一個檔、第幾行」。逐檔 `--module-file` 一次就給得出來。
SRC_FILES = ('script/speakers.js', 'script/mainScript.js', 'script/town.js', 'script/enemies.js', 'config.js')

def check_syntax():
    bad = 0
    for f in SRC_FILES:
        r = subprocess.run([JSC, '--module-file=' + os.path.join(ROOT, f)],
                           capture_output=True, text=True)
        msg = (r.stdout or '') + (r.stderr or '')
        if 'SyntaxError' in msg:
            print('❌ %s 語法錯誤：\n%s' % (f, msg.strip())); bad += 1
    if bad:
        print('\n先修語法，其他檢查跳過。'); sys.exit(2)

def load_data():
    if not os.path.exists(JSC):
        print('找不到 jsc（%s）——這支工具依賴 macOS 內建的 JavaScriptCore。' % JSC)
        sys.exit(2)
    check_syntax()
    parts = []
    # ⚠ 城鎮（`script/town.js`）與 config 也一起載（ver -375）：城鎮節點現在會帶
    #   **劇情插入戰**與整段對白，跟主線一樣需要驗 —— 缺圖／打錯角色 id／
    #   battle 指到不存在的場次，一樣要在這裡就抓到，不要等演到那一句。
    for f in SRC_FILES:
        parts.append(strip_module(open(os.path.join(ROOT, f), encoding='utf-8').read()))
    parts.append('print(JSON.stringify({script:MAIN_SCRIPT, entry:MAIN_ENTRY,'
                 ' speakers:SPEAKERS, art:ART, towns:TOWNS, cfg:GAME_CONFIG,'
                 ' assets:ASSETS}));')
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

def check_audio_table(files, folder, label, resolve=None):
    """resolve(f) 回傳表項 f 的實際路徑（None＝就在 folder 裡）——
       與 modules/story.js 的 SE_SRC 同一條規則（ver -566：vo_ 開頭住 vo/），
       改那邊要改這邊。"""
    disk = {f for f in os.listdir(os.path.join(ROOT, folder))
            if not f.startswith('_') and f.lower().endswith(AUDIO_EXT)}
    known = disk | ({f for f in files
                     if resolve and os.path.exists(os.path.join(ROOT, resolve(f)))}
                    if resolve else set())
    for f in sorted(disk - files):   warn('%s 表裡沒有這個檔案（遊戲載不到）：%s' % (label, f))
    for f in sorted(files - known):  err ('%s 表指到不存在的檔案：%s' % (label, f))
    return {f.rsplit('.', 1)[0].lower(): f for f in known}

def se_resolve(f):
    return ('resources/audio/vo/' if re.match(r'(?i)^vo_', f) else SE_DIR) + f

def exists(rel):  return os.path.exists(os.path.join(ROOT, rel))

# `hint` 拍認得的目標代號。⚠ 與 `modules/story.js` 的 `HINT_TARGET` 是同一份 ——
#   那邊加了新代號，這裡也要加（否則 lint 會誤報）。
def hint_targets():
    s = open(os.path.join(ROOT, 'modules/story.js'), encoding='utf-8').read()
    m = re.search(r'const HINT_TARGET\s*=\s*\{(.*?)\};', s, re.S)
    return set(re.findall(r'(\w+)\s*:', m.group(1))) if m else set()
HINT_TARGETS = hint_targets()

def main():
    D = load_data()
    script, entry, speakers, art = D['script'], D['entry'], D['speakers'], D['art']

    se_map  = check_audio_table(table('SE_FILES'),  SE_DIR,  'SE_FILES', resolve=se_resolve)
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
    def check_lines(sid, lines, scenes_ok=True, story_battle=True):
        labels = {l.get('label') for l in (lines or []) if isinstance(l, dict) and l.get('label')}
        # 這一段裡到目前為止有沒有落過回檔點（ver -697，見底下 battle 那一支）
        seen_ckpt = [False]
        for i, ln in enumerate(lines or []):
            tag = '%s[%d]' % (sid, i)
            if ln.get('checkpoint'): seen_ckpt[0] = True

            # 跳轉拍（ver -377）：`goto` 與戰鬥的 `onLose` 都指向同一段裡的 `label`。
            if ln.get('goto'):
                if ln['goto'] not in labels:
                    err('%s：goto 指到這一段裡沒有的 label：%s' % (tag, ln['goto']))
                continue                      # 控制拍，不帶演出

            # 結束拍（ver -655）：`{ end:true }` ＝這一段到此為止（分歧的收尾）。
            #   控制拍，不帶演出。
            if ln.get('end'):
                continue

            # 選項（ver -396）：閘門拍，沒有 speaker。每一個 goto 都要指得到 label。
            if ln.get('choice'):
                for o in (ln['choice'] or []):
                    if o.get('goto') not in labels:
                        err('%s：choice 的 goto 指到這一段裡沒有的 label：%s' % (tag, o.get('goto')))
                continue
            # 輸入主角名的閘門（ver -395）：沒有台詞也沒有 speaker，不必驗演出欄位。
            if ln.get('nameInput'):
                continue
            # 操作提示（ver -424）：閘門拍。⚠ `at` 要是 story.js 認得的代號，
            #   打錯的話那一拍會直接放行（教學等於沒演），所以在這裡就擋下來。
            if ln.get('hint'):
                h = ln['hint']
                at = h if isinstance(h, str) else (h or {}).get('at')
                if at not in HINT_TARGETS:
                    err('%s：hint 的 at 不是認得的代號（%s）：%s'
                        % (tag, '／'.join(sorted(HINT_TARGETS)), at))
                continue
            # 出航（ver -424）：閘門拍，交給啟動層開飛行頁。
            if ln.get('goFlight'):
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
                    # 計時挑戰用 `timeAttack.parSec`（超時＝沒過關）走同一條分歧路，
                    # 那種場次不需要（也不該有）allowLose。
                    ta = (bt or {}).get('timeAttack') or {}
                    if bt and not bt.get('allowLose') and not ta.get('parSec'):
                        err('%s：寫了 onLose，但 config.battles.%s 既沒有 allowLose'
                            ' 也沒有 timeAttack.parSec —— 這一支分歧演不到' % (tag, b))
                elif bt and bt.get('allowLose'):
                    warn('%s：%s 標了 allowLose 卻沒有 onLose —— 輸了會照著贏的那一支往下演'
                         % (tag, b))
                # ══⚠⚠ 劇情戰要有**手動**回檔點（ver -697，Ray 定的戰鬥分級）══
                #   Ray：「遭遇戰，非劇情戰都用 1（原則）; 劇情戰都用 2（每次手動設回檔點）」
                #        「原則上劇情戰要防卡死，所以必需手動回檔到主角仍然可以自由
                #          行動的地方。」
                #   劇情戰敗北＝讀最新的那一筆快照（main 的 setStoryReturn）。漏寫
                #   `checkpoint:true` 的下場是**回捲到很久以前**（上一次進城／上一次
                #   讀取頁），而那**不會有任何錯誤訊息** —— 這一條就是那個安全網。
                #   ⚠⚠ 這裡**只能提醒不能判死**：正確的回檔點常常**不在這一段裡** ——
                #     一走進墓地就是強制鏈，落在鏈中間的 checkpoint 讀回來只會再走
                #     一次同一條必死路。墓地那兩場的正解就是**上一段**（黑爪戰後
                #     那個 -653 的記錄點）：讀回去人站在教堂，還能去買藥換裝。
                #     所以驗得出「這一段裡沒有」，驗不出「上一段有沒有」——
                #     那是人要確認的（跨段落、跨節點，靜態排不出先後）。
                #   ⚠ `allowLose` 的場次不提：輸了接著演，根本不回檔。
                #   ⚠ 遭遇戰不提：引擎自動落點（進城／打贏那一刻）。
                if story_battle and bt and not bt.get('allowLose') and not seen_ckpt[0]:
                    warn('%s：劇情戰 %s 之前這一段裡沒有 checkpoint:true —— 打輸會回捲到'
                         '**上一個自動存檔點**（上一段有戰鬥的段落／進城）。'
                         '確認那個點是玩家還能自由行動的地方，否則會卡死' % (tag, b))
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
            if ln.get('cg'):
                # 插圖也吃時段差分（ver -427）：`005_Kerberos` 可能只有
                # `_day` / `_dusk` 這些檔，原名反而不存在 —— 只要**有一個時段**在就算數。
                # ⚠ 這裡不重算候選鏈（那在 modules/story.js 的 `bandNames`）——
                #   只是「有沒有任何一張」的存在性檢查，不決定播的時候挑哪一張。
                cg = ln['cg']
                bands = ('', '_Dawn', '_Day', '_Dusk', '_night', '_midnight',
                         '_dawn', '_day', '_dusk', '_Night', '_Midnight')
                got = [b for b in bands
                       if exists(CG_DIR + cg + b + '.webp') or exists(CG_DIR + cg + b + '.png')]
                if not got:
                    err('%s：沒有這張插圖 %s' % (tag, cg))
                elif all(not exists(CG_DIR + cg + b + '.webp') for b in got):
                    warn('%s：插圖 %s 只有 .png，還沒轉成 .webp（§5 的規約）' % (tag, cg))
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
            #  ⚠ **有立繪的那一種不算**（ver -628 起）：「有立繪在台上的無台詞拍要點擊
            #    才往下播」是規矩不是漏寫（§6.5）—— 那一拍就是要玩家看清楚她的表情。
            #    這裡只認**這一拍自己有指定立繪**的（`portrait`）；沿用上一拍的看不出來，
            #    寧可少報也不要每一拍都吵。
            if (not ln.get('text') and not ln.get('card') and not ln.get('auto')
                    and not ln.get('blank') and not ln.get('portrait')):
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
                # 跨地圖出口（ver -758）：'@<地圖>' 或 '@<地圖>:<節點>' —— 驗那張圖與那一格
                if isinstance(to, str) and to.startswith('@'):
                    seg = to[1:].split(':')
                    T2 = (D.get('towns') or {}).get(seg[0])
                    if not T2:
                        err('%s：跨地圖出口 %s 指到不存在的地圖 %s' % (tag, d, seg[0]))
                    elif len(seg) > 1 and seg[1] not in (T2.get('nodes') or {}):
                        err('%s：跨地圖出口 %s 指到 %s 裡不存在的節點 %s' % (tag, d, seg[0], seg[1]))
                    continue
                if to not in nodes:
                    err('%s：出口 %s 指到不存在的節點 %s' % (tag, d, to))
            bg = n.get('bg')
            # ⚠ `noTime` 的節點吃的是**基底檔**（沒有時段尾巴）——不能拿 `_Day` 當通過條件：
            #   ver -400 踩過：Ray 換成 `_day`/`_dusk` 之後基底檔沒了，lint 因為看到 `_Day`
            #   就放行，遊戲卻整片沒有背景（`noTime` 的候選鏈根本不找 `_Day`）。
            if bg and n.get('noTime') and not (exists(BG_DIR + bg + '.webp')
                                               or exists(BG_DIR + bg + '.png')):
                err('%s：noTime 的節點要有**基底**背景 %s（找 %s，不含時段尾巴）'
                    % (tag, bg, BG_DIR))
            elif bg and not n.get('noTime') and not (exists(BG_DIR + bg + '_Day.webp') or exists(BG_DIR + bg + '.webp')):
                # 同上：有 PNG 只是還沒轉檔（`bgFor` 兩個副檔名都試），不是「缺圖」
                if exists(BG_DIR + bg + '_Day.png') or exists(BG_DIR + bg + '.png'):
                    warn('%s：背景 %s 只有 .png，還沒轉成 .webp（§5 的規約）' % (tag, bg))
                elif n.get('bgPending'):
                    # 骨架先行、美術產圖中（ver -757，夏爾村）：節點明寫 `bgPending:true`
                    # ＝「知道缺，圖在路上」——降為提醒。圖到了記得拔掉這個欄位。
                    warn('%s：背景 %s 產圖中（bgPending）——交件後拔掉 bgPending' % (tag, bg))
                else:
                    err('%s：沒有這張背景 %s（找 %s，含 _Day）' % (tag, bg, BG_DIR))
            if bg and n.get('bgPending') and (exists(BG_DIR + bg + '_Day.webp') or exists(BG_DIR + bg + '.webp')):
                warn('%s：背景 %s 已交件，bgPending 可以拔了' % (tag, bg))
            if n.get('shop') and n['shop'] not in ((cfg.get('shop') or {}).get('stock') or {}):
                err('%s：shop 指到 config.shop.stock 裡沒有的貨單 %s' % (tag, n['shop']))
            if n.get('board'):
                bs = [b for b in (cfg.get('bounties') or {}).values() if b.get('city') == n['board']]
                if not bs:
                    warn('%s：懸賞榜 %s 目前一張委託都沒有' % (tag, n['board']))
            for key in ('lines', 'keeper', 'challengeLines', 'innEarly', 'innRenna'):
                v = n.get(key)
                # ⚠ `innRenna` 自 ver -439 起是**分支表**（waited／passing，見
                #   script/town.js）：一支一支驗，不要把 dict 丟進 check_lines
                #   （它會 enumerate 出鑰匙字串然後在 `ln.get` 炸掉）。
                if isinstance(v, dict):
                    for k2, v2 in v.items():
                        check_lines('%s.%s.%s' % (tag, key, k2), v2, story_battle=False)
                else:
                    check_lines('%s.%s' % (tag, key), v, story_battle=False)
            # ⚠ `acts`（主線段落，ver -424）也要驗 —— 那裡面才是真正的劇情，
            #   漏掉的話缺圖／打錯角色 id 要等演到那一句才發現。
            for i, a in enumerate(n.get('acts') or []):
                check_lines('%s.acts[%d]' % (tag, i), a.get('lines'),
                            story_battle=bool(a.get('storyBattle')))
            # 傍晚的提醒掛在**城**上不是節點上，所以在外層另外驗（見下）。

        # ══⚠⚠ 入口那一格不可以有戰鬥（ver -698，Ray：「入口不會有戰鬥」）══
        #   它是**遭遇戰的復活點**（打輸回這裡），有戰鬥就是必死鏈。
        #   ⚠ 入口是 `firstEntry.node`（劇情降落的那一格）或 `entry`，兩個都要驗。
        for ekey in ('entry', 'firstEntry'):
            eid = town.get(ekey)
            if isinstance(eid, dict): eid = eid.get('node')
            if not eid: continue
            en = (town.get('nodes') or {}).get(eid)
            if not en:
                err('%s.%s 指到不存在的節點 %s' % (tid, ekey, eid)); continue
            for i, a in enumerate(en.get('acts') or []):
                if any(isinstance(l, dict) and l.get('battle') for l in (a.get('lines') or [])):
                    warn('%s：入口那一格（%s）的 acts[%d] 裡有戰鬥 —— 入口是遭遇戰的'
                         '復活點，打輸回到這裡會再打一次同一場。'
                         '目前靠「連敗三次抬回旅店」兜底，不會真的卡死，但這違反'
                         '「入口不會有戰鬥」（Ray, ver -698）' % (tid, eid, i))

        # 傍晚那一格有**兩句**（ver -427）：走完了 `bySeen`／時間到了 `byTime`。
        ev = town.get("evening") or {}
        for k in ('bySeen', 'byTime'):
            if ev.get(k): check_lines('%s.evening.%s' % (tid, k), ev[k])
        if ev and not (ev.get('bySeen') or ev.get('byTime')):
            err('%s.evening：兩句都沒有（bySeen／byTime）' % tid)
        # 強制移轉的目的地要真的存在（傍晚回旅店、stage 0 的結尾去船塢）。
        for tag, g in (('evening', ev), ('stage1', town.get('stage1') or {})):
            if g.get('goto') and g['goto'] not in nodes:
                err('%s.%s：goto 指到不存在的節點 %s' % (tid, tag, g['goto']))
        g1 = town.get('stage1') or {}
        if g1 and (g1.get('hour') is None or not g1.get('flag')):
            err('%s.stage1：要有 hour 與 flag（見 modules/town.js 的 stageGate）' % tid)

    # ── 戰鬥內的短教學／插話（ver -426：`config.battles[*].talk`）────────────
    #  ⚠ 它走的是**教學那一支**對話實作（modules/tutorial.js 的 openStep），所以
    #    角色要在 `config.tutorial.cast` 裡、表情差分要在 ASSETS 裡 ——
    #    打錯的話要等真的打到那一場才發現，那通常是好幾個畫面之後的事。
    #  ⚠ 觸發除了那幾個節點，還有（ver -599／-619 加的）：
    #    `hp:N`／`php:N`／`phplow:N`＝血量觸發（敵人／玩家血的百分比；
    #      `php` 是「回到 N% 以上」、`phplow` 是「掉到 N% 以下」）、
    #    以及**自訂接續名**——`gate.then`／`strike` 的 `then` 指到的那一段
    #    （例如聖徒化教學的 `downed`／`saintOn`／`partnerOn`）。
    #    自訂名不是打錯字，所以只要**有人指得到它**就算數；沒人指到才報。
    TALK_TRIGGERS = ('battleStart', 'threat', 'defended')
    tcast  = ((cfg.get('tutorial') or {}).get('cast') or {})
    assets = D.get('assets') or {}
    for bid, b in (cfg.get('battles') or {}).items():
        if b.get('talkOnce') and not (b.get('talk') or []):
            warn('battles.%s：寫了 talkOnce 卻沒有 talk' % bid)
        for i, st in enumerate(b.get('talk') or []):
            tag = 'battles.%s.talk[%d]' % (bid, i)
            tr  = st.get('trigger')
            thens = set()
            for st2 in (b.get('talk') or []):
                for k in (st2.get('then'), (st2.get('gate') or {}).get('then')):
                    if isinstance(k, str): thens.add(k)
            ok_tr = (tr in TALK_TRIGGERS
                     or (isinstance(tr, str)
                         and (tr.startswith('board:')
                              or re.match(r'^(hp|php|phplow):\d+(\.\d+)?$', tr)
                              or tr in thens)))
            if not ok_tr:
                err('%s：trigger「%s」既不是節點（%s／board:N／hp:N／php:N／phplow:N），'
                    '也沒有任何一段的 then 指到它'
                    % (tag, tr, '／'.join(TALK_TRIGGERS)))
            if not (st.get('lines') or []):
                err('%s：沒有台詞' % tag)
            for j, ln in enumerate(st.get('lines') or []):
                # 主角的空白對話框（`blank:true`）：沒有 who、沒有台詞，那是它的定義。
                if ln.get('blank'):
                    if ln.get('who') or ln.get('img'):
                        err('%s.lines[%d]：blank 那一拍不該有 who／img（他沒有立繪）' % (tag, j))
                    continue
                # 演出拍（ver -478）：只有 se/shake、沒有 who 也沒有 text —— 那是它的定義
                # （無人無框，停 hold 自動接下一拍）。音效鍵照樣要驗。
                if not ln.get('who') and not str(ln.get('text') or '').strip() \
                   and (ln.get('se') or ln.get('shake')):
                    if ln.get('se') and not audio_ok(ln['se'], se_map, se_alias):
                        err('%s.lines[%d]：沒有這個音效 %s' % (tag, j, ln['se']))
                    continue
                who = ln.get('who')
                if who not in tcast:
                    err('%s.lines[%d]：who「%s」不在 config.tutorial.cast 裡' % (tag, j, who))
                img = ln.get('img')
                if img and img not in assets:
                    err('%s.lines[%d]：img「%s」不在 ASSETS 裡' % (tag, j, img))
                if ln.get('se') and not audio_ok(ln['se'], se_map, se_alias):
                    err('%s.lines[%d]：沒有這個音效 %s' % (tag, j, ln['se']))
                if not str(ln.get('text') or '').strip():
                    err('%s.lines[%d]：空台詞' % (tag, j))

    for m in errs:  print('❌ ' + m)
    for m in warns: print('⚠  ' + m)
    print('\n%d 個錯誤、%d 個提醒。' % (len(errs), len(warns)))
    return 1 if errs else 0

if __name__ == '__main__':
    sys.exit(main())
