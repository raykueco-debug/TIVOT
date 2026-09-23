#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
script_lint.py — 劇本稿的體檢工具（ver -342）

用途：Ray 餵一段稿、我轉成 script/mainScript.js 之後，跑這支確認
「腳本引用到的東西全部真的存在」——缺圖、缺音效、打錯角色 id、scene 鏈斷掉，
都在這裡一次抓出來，不必等到在瀏覽器上演到那一句才發現。

  python3 tools/script_lint.py

⚠ 資料不是用 regex 猜的：借一支 JS 引擎把 mainScript.js / speakers.js
  真的**執行**一次再 dump 成 JSON（兩支都是純資料，沒有 DOM 依賴）。
  regex 版本在巢狀物件與註解裡的假陽性太多，維護成本比這條路高。

⚠⚠ 引擎兩支都吃（ver -1326）：**macOS 用內建的 jsc，其餘（Windows／Linux）用 node**。
  以前寫死 jsc ⇒ 這支在 Windows 上**從來沒跑過**，而憲法 §6.5.1 要求「稿子轉完一定要跑」
  —— 那道驗收在唯一會用到它的機器上是空的。node 裝了就會自己認，不必設定。

⚠ 音效／BGM 表（story.js 的 SE_FILES / BGM_FILES）也一併對照資料夾：
  加了檔案忘了加進表裡，遊戲會靜默找不到，這裡會報。
"""
import json, os, re, sys
import _jsrun              # JS 資料的唯一引擎（jsc／node），見 tools/_jsrun.py
import _utf8  # noqa: F401  # 主控台 UTF-8（中文 Windows 的 cp950），見 tools/_utf8.py

NL = chr(10)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 引擎（jsc／node）、utf-8 的 subprocess、語法檢查 —— 全部住在 tools/_jsrun.py。
# ⚠ 這裡**不要**再寫一份（鐵律 7）：7 支工具各寫一份正是先前全部死在 Windows 上的原因。

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
        msg = _jsrun.check_module(os.path.join(ROOT, f)).replace(os.path.join(ROOT, f), f)
        if 'SyntaxError' in msg:
            print('❌ %s 語法錯誤：\n%s' % (f, msg.strip())); bad += 1
    if bad:
        print('\n先修語法，其他檢查跳過。'); sys.exit(2)

def load_data():
    _jsrun.require()
    check_syntax()
    parts = []
    # ⚠ 城鎮（`script/town.js`）與 config 也一起載（ver -375）：城鎮節點現在會帶
    #   **劇情插入戰**與整段對白，跟主線一樣需要驗 —— 缺圖／打錯角色 id／
    #   battle 指到不存在的場次，一樣要在這裡就抓到，不要等演到那一句。
    for f in SRC_FILES:
        parts.append(strip_module(open(os.path.join(ROOT, f), encoding='utf-8').read()))
    parts.append('print(JSON.stringify({script:MAIN_SCRIPT, entry:MAIN_ENTRY,'
                 ' speakers:SPEAKERS, art:ART, towns:TOWNS, cfg:GAME_CONFIG,'
                 ' assets:ASSETS, homeImg:HOME_IMG, homeSfx:HOME_SFX}));')
    return _jsrun.dump(NL.join(parts), what='腳本資料')

# ── story.js 的音效／BGM 表 ────────────────────────────────────────────────
def table(name):
    s = open(os.path.join(ROOT, 'modules/story.js'), encoding='utf-8').read()
    m = re.search(r'const %s=\[(.*?)\];' % name, s, re.S)
    return set(re.findall(r"'([^']+)'", m.group(1))) if m else set()

def alias(name):
    s = open(os.path.join(ROOT, 'modules/story.js'), encoding='utf-8').read()
    m = re.search(r'const %s=\{(.*?)\};' % name, s, re.S)
    return dict(re.findall(r"(\w+)\s*:\s*'([^']+)'", m.group(1))) if m else {}

# ⚠ ver -1015：`ASSETS` 裡登記過的音檔名（開機預載的另一半，見下面那支的說明）。
#   由 main() 在讀完資料之後填進來 —— 這一支是模組級函式，拿不到 D。
ASSETS_AUDIO = set()

def check_audio_table(files, folder, label, resolve=None):
    """resolve(f) 回傳表項 f 的實際路徑（None＝就在 folder 裡）——
       與 modules/story.js 的 SE_SRC 同一條規則（ver -566：vo_ 開頭住 vo/），
       改那邊要改這邊。"""
    disk = {f for f in os.listdir(os.path.join(ROOT, folder))
            if not f.startswith('_') and f.lower().endswith(AUDIO_EXT)}
    known = disk | ({f for f in files
                     if resolve and os.path.exists(os.path.join(ROOT, resolve(f)))}
                    if resolve else set())
    # ⚠ ver -1015：**在 `ASSETS` 裡登記過的也算載得到** —— 開機預載那一批是
    #   「ASSETS ∪ story 的 SE_FILES」（§6.6），所以戰鬥用的 SE 只登記在 ASSETS
    #   是正常的（例：`se_windblock`）。不排除的話這裡會長出永久的假警告，
    #   而假警告會把真的那幾條蓋掉。
    for f in sorted(disk - files - ASSETS_AUDIO):
        if referenced(f): continue
        warn('%s 表裡沒有這個檔案（遊戲載不到）：%s' % (label, f))
    for f in sorted(files - known):  err ('%s 表指到不存在的檔案：%s' % (label, f))
    return {f.rsplit('.', 1)[0].lower(): f for f in known}

def se_resolve(f):
    return ('resources/audio/vo/' if re.match(r'(?i)^vo_', f) else SE_DIR) + f

# ══⚠⚠⚠ 「這支音檔有沒有人用」要看**全部三條路**，不是只看 story 的表（ver -1290）══
#   ver -1015 已經補過一次（ASSETS），但**還漏了兩條**，於是 se_sail／se_shipcrush／
#   se_weapon_cannon 長出永久假警告 —— Ray 回報「我明明有跑到 shipcrush」。
#     ① modules/story.js 的 SE_FILES／BGM_FILES（劇情層）
#     ② config.js 的 ASSETS（開機預載）
#     ③ ⚠ **飛行頁自己那一組 HTMLAudio**（§6.10：另一個 document，import 不到主遊戲）
#     ④ ⚠ **只用「鑰匙」引用的**（config 的 `se:'se_weapon_cannon'`、敵人卡的 entrance）
#   ③④ 沒有路徑字串可以比對，所以改成「**檔名的主幹出現在任何一支原始碼裡就算有人用**」。
#   ⚠ 要用 `\b` 邊界：不然 `se_weapon_cannon` 會被 `se_weapon_cannon_120mm` 誤認成有人用。
#   假警告會把真的那幾條蓋掉 —— 這一條的代價比漏報大（同 ver -1015 的理由）。
SCAN_FILES = ('config.js', 'main.js', 'modules/story.js', 'modules/enemy.js',
              'modules/combat.js', 'modules/inn.js', 'modules/town.js',
              'script/enemies.js', 'script/town.js', 'script/mainScript.js',
              'flight/index.html', 'flight/talks.js')

def _scan_src():
    out = []
    for f in SCAN_FILES:
        try: out.append(open(os.path.join(ROOT, f), encoding='utf-8').read())
        except OSError: pass
    return '\n'.join(out)
SRC_TEXT = _scan_src()

def referenced(fname):
    """fname（含副檔名）的主幹有沒有出現在原始碼裡（詞邊界比對）。"""
    stem = re.escape(fname.rsplit('.', 1)[0])
    return re.search(r'(?<![\w])%s(?![\w])' % stem, SRC_TEXT) is not None

def exists(rel):  return os.path.exists(os.path.join(ROOT, rel))

# ══⚠⚠⚠ 背景自 ver -1376 起**依區域分資料夾**（`resources/background/<區域>/`）══
#   這一支原本是 `bg_exists(BG_DIR + 名字)` ＝**第二份路徑解析**（鐵律 7）：
#   遊戲那一邊走 `story.imgSrc()` → `script/bg_index.js` 的 `bgFolder()`，
#   這一邊自己拼一份，搬檔那一刻當場多出 200 個假錯誤。
#   ⚠ 修法**不是抄那份索引**（那就變成第三份），是讓它做自己該做的事：
#     lint 問的是「**這個檔在磁碟上嗎**」—— 那就遞迴找一次，答案永遠是實況。
#   ⚠ 只掃一層子資料夾（現況就是一層），快取起來避免上千次 listdir。
_BG_FILES = None
def _bg_files():
    global _BG_FILES
    if _BG_FILES is None:
        _BG_FILES = set()
        base = os.path.join(ROOT, 'resources', 'background')
        for d in ([''] + [x for x in os.listdir(base)
                          if os.path.isdir(os.path.join(base, x))]):
            for f in os.listdir(os.path.join(base, d)):
                if os.path.isfile(os.path.join(base, d, f)): _BG_FILES.add(f.lower())
    return _BG_FILES

def bg_exists(rel):
    """`rel` 是 `resources/background/<檔名>`（呼叫端沿用舊寫法）——只比對檔名。

    ⚠⚠ **刻意不分大小寫**：換掉的那一支是 `os.path.exists`，而它在 Windows／macOS
      上本來就不分 —— 改成分大小寫會當場多出 48 個「錯誤」，而那些**不是 bug**：
      交件的檔名是 `Capital_Grocerie_day.webp`，節點那一段的檢查只試 `_Day`，
      但**遊戲的載入器兩種都試**（`modules/story.js` 的 `bandNames` 會生大小寫變體，
      §6.5.4 的 ver -427）。所以那 48 筆是「這支檢查的寫法比載入器窄」，不是缺檔。
    ⚠ 代價是**這支驗不出真正的大小寫問題**（§6.5.4：macOS 不分、靜態空間分，
      本機測不出來、上線才 404）—— 那件事本來就不是這一版要解的，
      要解的話是讓這裡的檢查也跟著 `bandNames` 生同一組候選（鐵律 7 的正解），
      而不是讓它用一個比載入器窄的規則去報錯。"""
    return os.path.basename(rel).lower() in _bg_files()

# ⚠ 「這一拍自己就是畫面」的欄位（ver -1290）——空台詞也不算漏寫。
#   改 modules/story.js 的 renderLine 時，新增同類的拍要補進這裡。
SELF_SHOWN = ('cg', 'dayBreak', 'kitchen', 'boon', 'cook')   # ver -1659：cook 那一拍自己就是畫面（料理演出）

# `hint` 拍認得的目標代號。⚠ 與 `modules/story.js` 的 `HINT_TARGET` 是同一份 ——
#   那邊加了新代號，這裡也要加（否則 lint 會誤報）。
def hint_targets():
    s = open(os.path.join(ROOT, 'modules/story.js'), encoding='utf-8').read()
    m = re.search(r'const HINT_TARGET\s*=\s*\{(.*?)\};', s, re.S)
    return set(re.findall(r'(\w+)\s*:', m.group(1))) if m else set()
HINT_TARGETS = hint_targets()

# ══⚠⚠⚠ **「一支輕的 ＋ 一支重的，呼叫端自己挑」的守望**（ver -1458）══════════
#   憲法鐵律 10 底下那一條（-1457 Ray 定案：「只要離開飛行地圖就 kill，不論如何」）
#   —— 那一條之所以失效整整幾百版，是因為它被寫成**註解裡的一份路徑清單**，
#   而同時存在一支「只藏不殺」的函式讓呼叫端挑。憲法自己說過：
#   **理由要寫成會執行的東西（一個 assert、一支自檢），不要寫成註解。**
#   這一支就是那個自檢。
#
#   規約：**重的那一支只准有一個呼叫者 —— 就是輕的那一支**。
#   多出來的呼叫者＝有人又在「自己挑力道」了，那條路遲早會挑錯，而且不會報錯。
HEAVY_PAIRS = [
    # (檔案, 重的那一支, 唯一准許的呼叫者)
    ('main.js', 'killFlightFrame', 'closeFlightFrame'),
]
def check_heavy_pairs():
    for fn, heavy, owner in HEAVY_PAIRS:
        path = os.path.join(ROOT, fn)
        if not os.path.exists(path): continue
        src = open(path, encoding='utf-8').read()
        # 去掉註解與字串，免得說明文字被算成呼叫
        code = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
        code = re.sub(r'//[^\n]*', '', code)
        code = re.sub(r"'[^'\n]*'|\"[^\"\n]*\"|`[^`]*`", "''", code)
        calls = [m.start() for m in re.finditer(re.escape(heavy) + r'\s*\(', code)]
        decl  = re.search(r'function\s+' + re.escape(heavy) + r'\s*\(', code)
        if decl: calls = [i for i in calls if i != decl.start() + len('function ')]
        if len(calls) != 1:
            err('%s：`%s()` 有 %d 個呼叫點 —— 它只准由 `%s()` 叫（憲法鐵律 10 的'
                '「一支輕的＋一支重的，呼叫端自己挑」自檢）。'
                '要嘛把新的那一處改成叫 `%s()`，要嘛先去改憲法。'
                % (fn, heavy, len(calls), owner, owner))
            continue
        # 唯一那一個呼叫點必須落在 owner 的函式體裡
        o = re.search(r'function\s+' + re.escape(owner) + r'\s*\([^)]*\)\s*\{', code)
        if not o:
            err('%s：找不到 `%s()` —— `%s()` 的擁有者不見了？' % (fn, owner, heavy)); continue
        depth, end = 0, None
        for i in range(o.end() - 1, len(code)):
            if code[i] == '{': depth += 1
            elif code[i] == '}':
                depth -= 1
                if depth == 0: end = i; break
        if end is None or not (o.end() <= calls[0] <= end):
            err('%s：`%s()` 的唯一呼叫點不在 `%s()` 裡面（憲法鐵律 10 的自檢）。'
                % (fn, heavy, owner))

AEXT_RE = r'webp|png|jpe?g|m4a|mp3|wav|svg|ogg|woff2|woff|ttf|otf'

def check_lowercase_assets():
    """⚠⚠⚠ **素材檔名一律小寫，而且要分大小寫對得到檔**（ver -1554，Ray：
       「把檔案全改成小寫吧」）。

    為什麼要**會執行的檢查**、而不是一條規矩：
      **macOS 不分大小寫、靜態空間分** —— 檔名大小寫寫錯在這台測不出任何問題，
      上線就是 404，而且畫面上不會有任何錯誤訊息（背景變空、立繪退回底圖、
      音效靜靜不播）。§6.5.4 的 ver -1293／-910 都是這個坑。
    ⚠ `reference/` 不掃：那是唯讀的行為基準（鐵律 4），裡面的路徑是舊原型的。
    ⚠ 只掃**字面路徑**；組出來的背景名由下面那一段（bg 基底名）負責。"""
    real = set()
    for r, ds, fs in os.walk(ROOT):
        ds[:] = [d for d in ds if d not in ('.git', 'node_modules', '_recycle', '_originals', 'reference')]
        for f in fs:
            real.add(os.path.relpath(os.path.join(r, f), ROOT).replace(os.sep, '/'))
    pat = re.compile(r'(?<![A-Za-z0-9_])((?:resources|flight)/[A-Za-z0-9_./\-]+\.(?:' + AEXT_RE + r'))', re.I)
    for r, ds, fs in os.walk(ROOT):
        ds[:] = [d for d in ds if d not in ('.git', 'node_modules', '_recycle', '_originals', 'reference')]
        for f in fs:
            if os.path.splitext(f)[1] not in ('.js', '.html', '.css'):
                continue
            fp = os.path.join(r, f)
            rel = os.path.relpath(fp, ROOT).replace(os.sep, '/')
            try:
                txt = open(fp, encoding='utf-8').read()
            except Exception:
                continue
            for m in pat.finditer(txt):
                a = m.group(1)
                # ⚠ 底線開頭的資料夾（`_originals`／`_master`／`_unused`／`_raw`）
                #   **不會被遊戲載入**（§5），所以那裡的大小寫不可能 404 ——
                #   這條檢查是在防「靜態空間分大小寫」，對它們不成立。
                #   ver -1679：`speakers.js` 的註解提到母版路徑
                #   `resources/_originals/SI/...` 被報成錯誤，那是誤報。
                if '/_' in ('/' + a):
                    continue
                if a != a.lower():
                    err('%s：素材路徑有大寫 —— %s（檔名一律小寫，ver -1554）' % (rel, a))
                elif a not in real:
                    warn('%s：素材路徑對不到檔案 —— %s' % (rel, a))

# 好感表上真的有的四個人（`script/progress.js` 的 AFFECTION 那一族）。
AFF_KEYS = {'renna', 'nouvelle', 'sorana', 'anya'}

TENSE_OK = {('anya', 'crying'), ('nouvelle', 'thinking'), ('renna', 'surprised'),
            ('anya', 'chibiscared')}

def check_tense_exprs(art):
    """⚠⚠⚠ **差分的鍵一律無時態**（ver -1555，Ray：「檔名時態全部拿掉，crying 改成 cry」
       「confused 改成 confuse，統一用無時態」）。

    為什麼要**會執行的檢查**：命名規約寫在註解裡，下一個人補一張差分時不會回頭看，
    而「多了一個 `xxxing`」不會有任何錯誤訊息 —— 它就只是混在表裡，直到有人照舊名寫稿。

    ⚠ `TENSE_OK` 是**明寫的例外**（§鐵律 9 的作法）：那幾個無時態的名字已經被
      **另一張圖**佔住了，合併會靜靜換掉那幾拍的臉。等 Ray 給新名字再改。
      `chibiscared` 是 CI（Ray -1555：「il 跟 ci 先不用管」）。"""
    bad = []
    for ch, a in (art or {}).items():
        for k in (a.get('expr') or {}):
            kl = k.lower()
            if (ch, kl) in TENSE_OK:
                continue
            if re.search(r'(ing|ed)[0-9]*$', kl) and kl not in ('cringe',):
                bad.append('%s.%s' % (ch, k))
    for b in sorted(bad):
        err('差分鍵還帶時態 —— %s（ver -1555：統一用無時態；真的要留就加進 '
            'tools/script_lint.py 的 TENSE_OK 並寫明為什麼）' % b)


# ══⚠⚠⚠ **開機那一批的守望**（ver -1578）══════════════════════════════════
#   Ray：「老是犯同一個病，每次開新 session 就改壞，然後我就卡 loading，
#         每次都要來這麼一下，講都講不聽。」
#
#   憲法鐵律 13 講的是「一個畫面只讀自己的資源」，而它的自檢寫成
#   「開機之後跑一次 `performance.getEntriesByType('resource')`」—— **那要有人記得跑**。
#   憲法自己也說過：真的要立規矩，就把它寫成**會執行的東西**，不要寫成註解。
#   這一支就是那個自檢，而且是**靜態**的：不必開瀏覽器、commit 前就會叫。
#
#   量的是「**開機那一批真的會抓什麼**」—— 與 `main.js` 的 `startBatch` 同一套判準：
#     圖   ＝ `ASSETS` 裡通過 `HOME_IMG`（prefixes／keys）的
#     音效 ＝ `ASSETS` 裡通過 `HOME_SFX` 的
#     音樂 ＝ 只有 `bgm_home`
#   然後**加總磁碟上的真實位元組**，超過預算就是**錯誤**（不是提醒）。
#
#   ⚠⚠ 預算不是拍腦袋的：ver -1354 把開機那一批從 **117 支 5.67 MB** 收到
#     **4 支 0.08 MB**，那一刀就是為了「卡在首頁讀取」。下面的數字留了餘裕，
#     但**遠低於**再犯一次的量級 —— 有人想加東西進首頁那一批，這裡就會擋下來。
#   ⚠ 要調高預算就是**改憲法**（鐵律 13）：先問「這一支首頁真的看得到嗎？」
#     答不出來的就不該在那一批裡。
BOOT_MAX_IMG_BYTES = 3 * 1024 * 1024    # 首頁的圖（團徽 555 KB ＋ 挑戰的武器卡與立繪）
BOOT_MAX_SFX_FILES = 12                 # 首頁 UI 音（-1354 之後是 4 支）
BOOT_MAX_SFX_BYTES = 1 * 1024 * 1024
def check_boot_batch(D):
    assets  = D.get('assets') or {}
    him     = D.get('homeImg') or {}
    hsf     = D.get('homeSfx') or {}
    def hit(k, spec):
        return (any(k.startswith(p) for p in (spec.get('prefixes') or []))
                or k in (spec.get('keys') or []))
    def size(v):
        f = os.path.join(ROOT, str(v).split('?')[0])
        return os.path.getsize(f) if os.path.exists(f) else 0
    imgs, sfx = [], []
    for k, v in assets.items():
        if not v: continue
        low = str(v).split('?')[0].lower()
        if low.endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')):
            if hit(k, him): imgs.append((k, v, size(v)))
        elif low.endswith(('.mp3', '.m4a', '.ogg', '.wav')):
            if not k.startswith('bgm_') and hit(k, hsf): sfx.append((k, v, size(v)))
    ib = sum(x[2] for x in imgs); sb = sum(x[2] for x in sfx)
    def top(rows, n=5):
        return '／'.join('%s %.0fKB' % (k, b / 1024)
                         for k, _, b in sorted(rows, key=lambda r: -r[2])[:n])
    if ib > BOOT_MAX_IMG_BYTES:
        err('開機那一批的**圖**是 %d 張 %.2f MB，超過預算 %.2f MB（鐵律 13）——'
            '最大的幾張：%s。先問「這一支首頁真的看得到嗎？」；'
            '不是首頁要的就從 config 的 `HOME_IMG` 拿掉，由用到它的那個畫面自己載。'
            % (len(imgs), ib / 1048576.0, BOOT_MAX_IMG_BYTES / 1048576.0, top(imgs)))
    if len(sfx) > BOOT_MAX_SFX_FILES or sb > BOOT_MAX_SFX_BYTES:
        err('開機那一批的**音效**是 %d 支 %.2f MB，超過預算（%d 支／%.2f MB，鐵律 13）——'
            '最大的幾支：%s。音效那一段**不設時限**（-430），塞進去就是卡在首頁讀取。'
            % (len(sfx), sb / 1048576.0, BOOT_MAX_SFX_FILES,
               BOOT_MAX_SFX_BYTES / 1048576.0, top(sfx)))
    return len(imgs), ib, len(sfx), sb


# ══⚠⚠⚠ **有安全點的探索地圖：那張圖用到的每一場都必須有 `session`**（ver -1601）══
#   Ray（連報三次，最後一次原話）：「打完守墓者不應該結算，踩安全點才結算，
#   你到底是哪聽不懂？」
#
#   規矩本身很清楚（§6.5.4.3）：**整張探索地圖算一局** —— 中間打幾場都不結算，
#   走到安全點（`rest:true`）才閉棺。落地方式是戰鬥卡上的 `session:'<圖>_wild'`，
#   因為 `combat.midSession()` 是**問那張卡**有沒有 `session`。
#   ⇒ **漏寫 `session` 的那一場就自成一局，打完立刻結算**，而且：
#     · 沒有任何錯誤訊息
#     · 其他場次都正常，所以看起來像「偶爾會結算」而不是「有一張卡漏了」
#   實際踩到的三次都是同一個形狀：-1594 合成的卡沒有 session、-1597 補了但那張卡
#   不在 `GAME_CONFIG.battles` 上、-1601 手寫的四張守墓者從頭到尾就沒有。
#
#   ⇒ 這一條把它變成**會執行的**（同 `check_heavy_pairs`／`check_boot_batch`）。
#   ⚠ **只管野怪池／必出格／追擊那幾類**（一趟會打很多次的）——
#     節點 `acts` 裡的是**劇情戰**，一輪只打一次，打完結算本來就對。
def check_map_sessions(D):
    towns = D.get('towns') or {}
    cfg   = D.get('cfg') or {}
    B     = cfg.get('battles') or {}
    for tid, T in towns.items():
        nodes = T.get('nodes') or {}
        # 這張圖有沒有安全點（＝「踩安全點才結算」的那一種圖）
        if not any((n or {}).get('rest') for n in nodes.values()):
            continue
        # ⚠⚠ **只管「一趟會打很多次」的那幾類**：野怪池／必出格／追擊。
        #   節點 `acts` 裡的那些是**劇情戰**（鹿主、祭壇首戰…）—— 一輪只打一次，
        #   打完結算本來就是對的，把它們算進來只會製造永久的假警告。
        ids = set()
        for b in ((T.get('chase') or {}).get('battles') or []):
            if isinstance(b, str): ids.add(b)
        W = T.get('wildSpawn') or {}
        for p in (W.get('pool') or []):
            b = (p or {}).get('battle')
            if isinstance(b, str): ids.add(b)
        for v in (W.get('fixed') or {}).values():
            if isinstance(v, str): ids.add(v)
            elif isinstance(v, dict):
                for vv in v.values():
                    if isinstance(vv, str): ids.add(vv)
        bad = []
        for b in sorted(ids):
            card = B.get(b)
            if card is None:           # 沒有場次卡的（`spawnAt` 自動生的那些）不在這張表上
                continue
            if not card.get('session'):
                bad.append(b)
        if bad:
            err('%s 有安全點（踩安全點才結算），但這幾場**沒有 `session`** —— '
                '每打完一場就會結算一次，而且不會報錯：%s。'
                '補上與那張圖同一個局 id（慣例 `%s_wild`）；'
                '真的要「打完就收局」才寫 `sessionEnd`（§6.5.4.3）。'
                % (tid, '／'.join(bad), tid))


def main():
    D = load_data()
    check_heavy_pairs()
    boot = check_boot_batch(D)
    check_map_sessions(D)
    check_lowercase_assets()
    script, entry, speakers, art = D['script'], D['entry'], D['speakers'], D['art']
    check_tense_exprs(art)

    # ⚠ ver -1015：先把 ASSETS 裡的音檔名收起來 —— 開機預載那一批是
    #   「ASSETS ∪ story 的 SE_FILES」（§6.6），兩邊任一有登記就載得到。
    global ASSETS_AUDIO
    ASSETS_AUDIO = {os.path.basename(str(v).split('?')[0])
                    for v in (D.get('assets') or {}).values()
                    if isinstance(v, str) and v.lower().endswith(AUDIO_EXT)}

    se_map  = check_audio_table(table('SE_FILES'),  SE_DIR,  'SE_FILES', resolve=se_resolve)
    bgm_map = check_audio_table(table('BGM_FILES'), BGM_DIR, 'BGM_FILES')
    se_alias, bgm_alias = alias('SE_ALIAS'), alias('BGM_ALIAS')

    # ⚠⚠⚠ 第三層：**`ASSETS` 的鍵也算數**（ver -1618，對齊 `story.bgmSrc`）。
    #   `bgmSrc` 自 ver -1565 起有三層：BGM_FILES → BGM_ALIAS → `asset('bgm_'+k)`
    #   →（再退一步）`asset(k)`。這一支以前只看前兩層 ⇒ 只登記在 `ASSETS` 的短別名
    #   （`rituale`…）會被誤報成「沒有這首 BGM」，而它在遊戲裡是放得出來的。
    #   ⚠ 鐵律 7：驗的規則要與**唯一那支解析器**同一套，少一層就是假警報。
    _akeys = set((D.get('assets') or {}).keys())
    def audio_ok(key, m, al, pre=''):
        k = str(key).lower()
        if k in m or al.get(k, '') in m: return True
        return bool(pre) and ((pre + k) in _akeys or k in _akeys)

    # ── scene 鏈 ──
    if entry not in script:
        err('MAIN_ENTRY 指到不存在的場景：%s' % entry)
    # ⚠⚠⚠ 起點不只 MAIN_ENTRY（ver -1290）——一幕也可能由**程式**直接叫起來
    #   （`story.open({scene:'lake_deck'})` 在 main.js 的羽蛇戰收尾），`next` 鏈當然
    #   走不到它。只看鏈的話那種幕會被誤報成孤兒（Ray：「序章一直都沒有問題」）。
    #   ⚠ 這裡連 MAIN_ENTRY **被改指過**的情況也一起吃掉：mainScript.js 現在
    #     刻意指著 `dungeon_chase`（該處有 ⚠ 註解說「正式串主線時改回
    #     prologue_audience」）—— 那是**明寫的暫時狀態**，不是斷鏈。
    opened = set(re.findall(r"scene\s*:\s*'([A-Za-z0-9_]+)'", SRC_TEXT))
    reached, q = set(), [entry] + [s2 for s2 in opened if s2 in script]
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
            # 結算（ver -913 立、-1671 補進這張表）：`{ settle:true }` ＝把畫面交給
            #   結算頁。它在 `renderLine` 很前面就 `return` 了（早於 speaker 高亮、
            #   也早於 `line.auto` 的排程）⇒ **沒有 speaker、沒有 auto 都是正常的**。
            #   ⚠ 以前沒列進來，所以底層梯廳那一拍被報成「沒有 speaker」的錯誤 ——
            #     那是檢查本身漏了一種閘門拍，不是資料寫錯。
            if ln.get('settle'):
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

            # ⚠ `hide:'*'` ＝把台上的人全撤（ver -1547）——它不是角色 id，跳過檢查。
            for h in ([] if ln.get('hide') is None else
                      (ln['hide'] if isinstance(ln['hide'], list) else [ln['hide']])):
                if h != '*' and h not in speakers:
                    err('%s：hide 指到不存在的角色 %s' % (tag, h))

            # `bgBand`（ver -1187）＝走時段候選鏈的換背景：驗的是**基底名**
            # （與節點的 `bg` 同一條規矩：`_Day` 或不帶時段的那一張在不在）。
            if ln.get('bgBand'):
                b0 = ln['bgBand']
                if not (bg_exists(BG_DIR + b0 + '_Day.webp') or bg_exists(BG_DIR + b0 + '_day.webp')
                        or bg_exists(BG_DIR + b0 + '.webp')):
                    err('%s：沒有這張背景 %s（bgBand，找 %s，含 _Day／_day）' % (tag, b0, BG_DIR))
            if ln.get('bg'):
                cgq = bool(re.match(r'^\d{3}_', ln['bg']))
                d = CG_DIR if cgq else BG_DIR
                # ⚠ 背景走 `bg_exists`（遞迴，區域資料夾，ver -1376）；插圖照舊扁平。
                ex = exists if cgq else bg_exists
                if not ex(d + ln['bg'] + '.webp'):
                    # 有 PNG 沒 WebP：載得到（載入器兩個都試），但**沒照 §5 轉檔** → 提醒不是錯
                    if ex(d + ln['bg'] + '.png'):
                        warn('%s：背景 %s 只有 .png，還沒轉成 .webp（§5 的規約）' % (tag, ln['bg']))
                    else:
                        err('%s：沒有這張背景 %s（找 %s）' % (tag, ln['bg'], d))
            if ln.get('cgBack'):
                # 中景層（ver -870）：一律明確路徑，存在性直接查
                # ⚠ ver -1632：**先去掉 `?v=`**（快取戳記，§5 的 -650）——
                #   它是給瀏覽器看的，不是路徑的一部分。漏了這一步，任何一張
                #   同名覆蓋過、跳過版號的中景圖都會被報成「沒有這張圖」。
                if not exists(ln['cgBack'].split('?')[0]):
                    err('%s：沒有這張中景圖 %s' % (tag, ln['cgBack']))
            if ln.get('cg'):
                # 插圖也吃時段差分（ver -427）：`005_Kerberos` 可能只有
                # `_day` / `_dusk` 這些檔，原名反而不存在 —— 只要**有一個時段**在就算數。
                # ⚠ 這裡不重算候選鏈（那在 modules/story.js 的 `bandNames`）——
                #   只是「有沒有任何一張」的存在性檢查，不決定播的時候挑哪一張。
                cg = ln['cg']
                # ver -870：含 `/` 的插圖名＝明確路徑（story.cgList 的擴充）——存在性直接查那條路
                if '/' in cg:
                    if not exists(cg):
                        err('%s：沒有這張插圖 %s' % (tag, cg))
                    continue
                bands = ('', '_Dawn', '_Day', '_Dusk', '_night', '_midnight',
                         '_dawn', '_day', '_dusk', '_Night', '_Midnight')
                # ⚠⚠ 副檔名要與**引擎**那一支對齊（`modules/story.js` 的 `bandNames`
                #    自 ver -910 起也吃 `.jpeg`／`.jpg`，排最後）—— 這裡只列 webp/png
                #    的話，交件先丟 jpeg 的那一張會被誤報成「沒有這張插圖」（ver -1697
                #    的 `30_torstandup.jpeg` 就是）。兩份清單走鐘就是鐵律 7 的病。
                CG_EXTS = ('.webp', '.png', '.jpeg', '.jpg')
                got = [b for b in bands
                       if any(exists(CG_DIR + cg + b + e) for e in CG_EXTS)]
                if not got:
                    err('%s：沒有這張插圖 %s' % (tag, cg))
                elif all(not exists(CG_DIR + cg + b + '.webp') for b in got):
                    warn('%s：插圖 %s 只有 .png，還沒轉成 .webp（§5 的規約）' % (tag, cg))
            if ln.get('ci') and not exists(SI_DIR + ln['ci'] + '.webp'):
                err('%s：沒有這張 CI %s' % (tag, ln['ci']))

            if ln.get('bgm') and not audio_ok(ln['bgm'], bgm_map, bgm_alias, 'bgm_'):
                err('%s：沒有這首 BGM %s' % (tag, ln['bgm']))
            spec = ln.get('se')
            for one in ([] if spec is None else (spec if isinstance(spec, list) else [spec])):
                k = one if isinstance(one, str) else one.get('n')
                if not audio_ok(k, se_map, se_alias):
                    err('%s：沒有這個音效 %s' % (tag, k))

            for f, allowed in (('cgPan', ('up', 'down')), ('bgPan', ('up', 'down'))):
                if ln.get(f) not in (None, *allowed) and f in ln:
                    err('%s：%s 只能是 up／down／null，收到 %r' % (tag, f, ln[f]))
            # ver -923：stage7 加了兩支（安雅的感應光圈／白光一閃，見 story 的 senseFx）
            # ver -1557：`stare`＝半透明 CI 一閃而過（脈動＋一聲心跳），要帶 `fxCi`
            FX_OK = ('gunfire', 'purpleflame', 'sense', 'whiteflash', 'stare')
            if ln.get('fx') and ln['fx'] not in FX_OK:
                err('%s：fx 只有 %s，收到 %r' % (tag, '／'.join(FX_OK), ln['fx']))
            if ln.get('fx') == 'stare' and not ln.get('fxCi'):
                err("%s：fx:'stare' 一定要配 fxCi（沒有圖它什麼都不會演，而且不會報錯）" % tag)
            if ln.get('fxCi') and ln['fxCi'] not in (D.get('assets') or {}) and not os.path.exists(
                    os.path.join(ROOT, str(ln['fxCi']).split('?')[0])):
                err('%s：fxCi 指到不存在的圖 —— %r' % (tag, ln['fxCi']))
            # ══⚠⚠⚠ ver -1565：`tierMin`／`tierMax` 看的是「誰的好感」══
            #   不寫 `tierWho` ＝ 看**說話者自己** —— 而說話者常常是神父／主角／店主
            #   那種**好感表上根本沒有的人**，那時段位一律算 0：
            #   `tierMin` 永遠不成立、`tierMax` 永遠成立，**而且不會有任何錯誤訊息**，
            #   畫面上就是「好感再高也只看得到低段那一句」（Ray 在教堂那一段抓到的）。
            if ln.get('tierMin') is not None or ln.get('tierMax') is not None:
                who = ln.get('tierWho') or ln.get('speaker')
                _tart = (speakers.get(who) or {}).get('art')
                if _tart not in AFF_KEYS:
                    err('%s：tierMin／tierMax 看的是 %r 的好感，而他不在好感表上'
                        '（%s）—— 要寫 `tierWho:\'<有好感的人>\'`'
                        % (tag, who, '／'.join(sorted(AFF_KEYS))))
            # ver -1562：`cgRush` 可以是 True（框中心）或 {x,y}（消失點在圖上的位置）
            if ln.get('cgRush') is not None:
                v = ln['cgRush']
                if isinstance(v, dict):
                    for k in ('x', 'y'):
                        if not (isinstance(v.get(k), (int, float)) and 0 <= v[k] <= 1):
                            err('%s：cgRush.%s 要是 0~1 的數（消失點在**圖上**的位置），收到 %r'
                                % (tag, k, v.get(k)))
                elif v is not True:
                    err('%s：cgRush 只能是 true 或 {x,y}，收到 %r' % (tag, v))
                for other in ('cgPan', 'cgZoom'):
                    if ln.get(other) is not None:
                        err('%s：cgRush 與 %s 互斥（兩者都在寫 transform，後掛的會蓋掉前一個）'
                            % (tag, other))
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
            #  ⚠⚠ ver -1290：`SELF_SHOWN` 那一族也不算 —— 它們**自己就是畫面**
            #    （插圖／翌日卡／廚房／加成大字），而且各自帶著自己的出口
            #    （`showBoon`／`showTitleCard` 都是「點一下收掉才往下演」）。
            #    不排除的話這四拍是**永久的假警告**，而假警告會把真的那幾條蓋掉
            #    （同 ver -1015 為 ASSETS 音檔加的那個排除）。
            if (not ln.get('text') and not ln.get('card') and not ln.get('auto')
                    and not ln.get('blank') and not ln.get('portrait')
                    and not any(ln.get(k) for k in SELF_SHOWN)):
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

        # ══⚠⚠⚠ 同一條邊的兩端必須是**相反方向**（ver -902）══
        #   ＝專案既有的「左進右出、上進下出」（ver -405，Ray）寫成資料層的檢查。
        #   破了這一條的症狀是 **一直按同一個方向會在兩格之間彈，走不出去**
        #   （Ray -902 回報：「我單向一直走變成無法走出的迴圈」）——
        #   而那**看資料看不出來**：兩行分開看都很合理，要對起來看才發現同名。
        #   ⚠ `back` 不驗：它由 exitsOf 掛在「來時方向的反向」，本來就一定是對的。
        OPP = {'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left'}
        for nid, n in nodes.items():
            # ⚠⚠ `tag` 要**這一圈自己算**（ver -1220 修）：上面那一圈也有 `tag`，
            #   而這裡沒有重算 —— 於是這一圈裡**每一則**警告（背景缺圖／shop／懸賞榜／
            #   對白／acts）印出來的節點都是**上一圈最後一格**的名字。
            #   實測：ravnsdal 的大教堂缺圖被印成 `ravnsdal.inn`。
            #   這種錯誤特別貴：訊息本身看起來完全正常，照著它去查會查錯格。
            tag = '%s.%s' % (tid, nid)
            for d, to in (n.get('exits') or {}).items():
                if d == 'back' or not isinstance(to, str) or to.startswith('@'):
                    continue
                t = nodes.get(to)
                if not t:
                    continue
                tex = t.get('exits') or {}
                # ⚠ 對方用 `back` 回來＝**自動正確**：exitsOf 把它掛在「來時方向的反向」，
                #   不是資料寫死的（末端與 sub-hub 都走這條）。
                if tex.get('back') == nid:
                    continue
                back = [d2 for d2, to2 in tex.items() if to2 == nid and d2 != 'back']
                if not back:
                    err('%s.%s：%s → %s 是**單向**的（%s 沒有回得來的出口）'
                        % (tid, nid, d, to, to))
                    continue
                # ══⚠⚠ **會彈的只有「兩端同名」那一種**（ver -1437 分級）══
                #   `A.up→B` 而 `B.up→A` ⇒ 一直按 up 會在兩格之間彈（Ray -902 踩到的）。
                #   而 `A.left→B` 配 `B.up→A`（**L 形折線**）不會彈：left 的反向是
                #   right，按 left 走過去、再按 left 不會走回來。
                #   ⚠ 後者是**小地圖上轉了個彎**的邊（版面排不成同一欄／同一列時的
                #     正常結果，貝利薩爾 ver -1437 就有三條）—— 它仍然值得看一眼
                #     （`back` 會多給一個反向出口，那一格會有兩個箭頭指向同一個地方），
                #     所以降成提醒，不是錯誤。
                if d in back:
                    err('%s.%s：%s → %s，而 %s 也是用 `%s` 回來的 —— 一直按 %s '
                        '會在兩格之間彈（同一條邊兩端要相反）' % (tid, nid, d, to, to, d, d))
                elif OPP.get(d) not in back:
                    warn('%s.%s：%s → %s，但 %s 是用 `%s` 回來的（L 形的邊）—— 不會彈，'
                         '但那一格會多一個 `back` 出口指向同一個地方，確認是刻意的'
                         % (tid, nid, d, to, to, back[0]))
            bg = n.get('bg')
            # ⚠ `noTime` 的節點吃的是**基底檔**（沒有時段尾巴）——不能拿 `_Day` 當通過條件：
            #   ver -400 踩過：Ray 換成 `_day`/`_dusk` 之後基底檔沒了，lint 因為看到 `_Day`
            #   就放行，遊戲卻整片沒有背景（`noTime` 的候選鏈根本不找 `_Day`）。
            if bg and n.get('noTime') and not (bg_exists(BG_DIR + bg + '.webp')
                                               or bg_exists(BG_DIR + bg + '.png')):
                # ⚠ `bgPending`（ver -757 的既有機制）**noTime 這一支也要認**（ver -1134）：
                #   伊甸古墓是「拓樸先接、背景後畫」的 34 格，而它幾乎整座都是 noTime
                #   —— 不認的話一次噴 32 個 ❌，把真正的錯誤淹掉、lint 從此恆為失敗。
                if n.get('bgPending'):
                    warn('%s：背景 %s 產圖中（bgPending）——交件後拔掉 bgPending' % (tag, bg))
                else:
                    err('%s：noTime 的節點要有**基底**背景 %s（找 %s，不含時段尾巴）'
                        % (tag, bg, BG_DIR))
            elif bg and not n.get('noTime') and not (bg_exists(BG_DIR + bg + '_Day.webp') or bg_exists(BG_DIR + bg + '.webp')):
                # 同上：有 PNG 只是還沒轉檔（`bgFor` 兩個副檔名都試），不是「缺圖」
                if bg_exists(BG_DIR + bg + '_Day.png') or bg_exists(BG_DIR + bg + '.png'):
                    warn('%s：背景 %s 只有 .png，還沒轉成 .webp（§5 的規約）' % (tag, bg))
                elif n.get('bgPending'):
                    # 骨架先行、美術產圖中（ver -757，夏爾村）：節點明寫 `bgPending:true`
                    # ＝「知道缺，圖在路上」——降為提醒。圖到了記得拔掉這個欄位。
                    warn('%s：背景 %s 產圖中（bgPending）——交件後拔掉 bgPending' % (tag, bg))
                else:
                    err('%s：沒有這張背景 %s（找 %s，含 _Day）' % (tag, bg, BG_DIR))
            # ⚠ `bgPending` 有兩種寫法（ver -1220）：
            #   · `true`      ＝ 這一格的 `bg` 還沒交件（骨架先行，會 404 → 畫面停在前一格）
            #   · `'<檔名>'`  ＝ **這一格暫時借了一張存在的圖**，真正要的是那個檔名
            #     （拉芬斯達爾的大教堂：借中心區那張，免得同一格每次長得不一樣）
            pend = n.get('bgPending')
            want = pend if isinstance(pend, str) else bg
            if pend and (bg_exists(BG_DIR + want + '_Day.webp')
                         or bg_exists(BG_DIR + want + '_day.webp')
                         or bg_exists(BG_DIR + want + '.webp')):
                warn('%s：背景 %s 已交件，bgPending 可以拔了'
                     '%s' % (tag, want, ('（順手把 bg 改成它）' if isinstance(pend, str) else '')))
            elif isinstance(pend, str):
                warn('%s：暫時借用背景 %s，真正要的 %s 還沒交件'
                     % (tag, bg, want))
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

        # ⚠⚠ `wildSpawn.encounters` 的台詞也要驗（ver -879）：它掛在**城**上、
        #   不在任何節點的 `acts` 裡 —— 不驗的話那一段的缺圖／打錯的差分名／
        #   不存在的音效全部要等 5% 擲中才發現，而那可能是好幾十次移動之後。
        for i, e in enumerate((town.get('wildSpawn') or {}).get('encounters') or []):
            a = e.get('act') or {}
            check_lines('%s.wildSpawn.encounters[%d]' % (tid, i), a.get('lines'),
                        story_battle=bool(a.get('storyBattle')))

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

        # ══⚠⚠⚠ **每一格都要走得到**（ver -1437 加；憲法 §6.5.4 的「圖論驗收」那一條）══
        #   從入口 BFS，走不到的格＝**玩家永遠到不了的地方**，而畫面上沒有任何
        #   錯誤訊息（背景、對白、戰鬥都在資料裡好好的，只是沒有路）。
        #   ⚠ 這一條是實測抓到的：貝利薩爾照 Ray 的新佈局重接之後，
        #     `ossuary` 完全沒有線、`cages`／`dragonrace` 連成一對孤島（-1437）。
        #   ⚠ 走的是**資料上的 `exits`**（含 `back`，不含跨圖 `@`）：
        #     `back` 由 `exitsOf` 現算，靜態掃不到，所以這裡只認寫死的那幾個方向 ——
        #     漏報比誤報好（真的只靠 `back` 進出的格子極少）。
        nodes_all = town.get('nodes') or {}
        start = town.get('firstEntry') or town.get('entry')
        if isinstance(start, dict): start = start.get('node') or town.get('entry')
        if isinstance(start, str) and start in nodes_all:
            seen = {start}; stack = [start]
            while stack:
                cur = stack.pop()
                for d, to in ((nodes_all.get(cur) or {}).get('exits') or {}).items():
                    if not isinstance(to, str) or to.startswith('@'): continue
                    if to in nodes_all and to not in seen:
                        seen.add(to); stack.append(to)
            lost = sorted(set(nodes_all) - seen)
            if lost:
                err('%s：從入口（%s）走不到這幾格 —— %s'
                    '（玩家永遠到不了，而且畫面上沒有任何錯誤訊息）'
                    % (tid, start, '／'.join(lost)))

        # ══⚠⚠⚠ **強制轉場（`gates`）的台詞也要驗**（ver -1395）══
        #   它掛在**城**上、不在任何節點的 `acts` 裡 —— 所以 -424 加的那一支掃不到它。
        #   ⚠ 這個洞是實測抓到的：美術把 `018-anyahide` 改號成 `019-anyahide`，
        #     而 `ep_day2` 那一段（＝一個 gate）還指著舊名 —— **lint 全綠**，
        #     要等玩到隔天早上那一幕才會發現插圖不出來（§6.5.4 的 ver -433 同一個坑）。
        #   ⚠ `stage1` 是「只有一項的 gates」（modules/town.js 的舊名），一起驗。
        for i, g in enumerate((town.get('gates') or []) + ([town['stage1']] if town.get('stage1') else [])):
            if g.get('lines'): check_lines('%s.gates[%d]' % (tid, i), g['lines'])
            if g.get('goto') and str(g['goto'])[0] != '@' and g['goto'] not in nodes:
                err('%s.gates[%d]：goto 指到不存在的節點 %s' % (tid, i, g['goto']))
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

    # ══ 快取版本號有沒有同步（ver -1131）══ index.html 的 `?v=` 由 tools/bust.py
    #    從 config.js 的 VERSION 產生 —— 忘了跑就等於「玩家拿到舊 JS 而且驗不出來」。
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import bust
        if bust.run(check=True) != 0:
            warns.append('快取版本號沒同步 —— 跑 `python3 tools/bust.py`（見那支工具的說明）')
    except Exception as e:
        warns.append('快取版本號檢查跑不起來：%s' % e)

    print('開機那一批：圖 %d 張 %.2f MB ／ 音效 %d 支 %.2f MB（鐵律 13 的守望）'
          % (boot[0], boot[1] / 1048576.0, boot[2], boot[3] / 1048576.0))
    for m in errs:  print('❌ ' + m)
    for m in warns: print('⚠  ' + m)
    print('\n%d 個錯誤、%d 個提醒。' % (len(errs), len(warns)))
    return 1 if errs else 0

if __name__ == '__main__':
    sys.exit(main())
