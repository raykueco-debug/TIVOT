#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""敵人卡 ⇄ Excel（ver -943，Ray：「不要壓縮，給我統一格式，然後出一張 excel 給我，
   以後我直接輸 excel 你去讀」）

    python3 tools/enemies_xlsx.py export            # enemies.js → enemies.xlsx（專案根目錄）
    python3 tools/enemies_xlsx.py import [檔案]      # Excel → 改回 enemies.js（只動有變的格）
    python3 tools/enemies_xlsx.py newcards          # 有圖沒卡的怪 → 各建一張「最普通的怪」的卡

⚠⚠⚠ **匯入是「就地改值」不是「重新產生檔案」**。
  `script/enemies.js` 裡有大量 ⚠ 註解（哪個數字是 Ray 指定的、哪個是暫定、為什麼這樣調）
  —— 那些是這個專案最貴的東西。整檔重產會把它們全部洗掉，所以匯入只做一件事：
  **把 Excel 上與現況不同的那幾格，找到原檔的那一行、替換等號右邊的值**。
  沒改的欄位一個字都不碰；改不到的（結構複雜的）一律報出來請人自己改，不硬幹。

⚠⚠⚠ **`import` 只有 Ray 明講的時候才跑，絕不自動抓**（ver -944，Ray：「excel 為
  reference，只有我下指示的時候去抓取，不要自動抓」）。
  那份 Excel 隨時可能是他改到一半的草稿 —— 沒說就抓，等於拿半成品蓋掉線上的數值，
  而且蓋掉的是**別人剛調好的平衡**，事後很難看出是哪一格被換走的。
  ⚠ 連「順手同步一下」都不要：要不要進檔案是他的決定，不是這支工具的判斷。
  ⚠ 要加欄位（新的敵人卡屬性）也一樣：**先討論、改 Excel 的格式**，不要自己長欄。

⚠ **真相仍然是 `script/enemies.js`**（鐵律 1/7）：Excel 是**編輯用的視圖**，
  不是第二份資料。所以每次要改之前先 `export` 一次拿最新的，改完 `import` 回去 ——
  不要拿一份放了三天的 Excel 蓋回來（中間別人改過的會被你手上的舊值蓋掉）。
  ⚠ `import` 會先比對「Excel 匯出時的那一版」與「現在的檔案」是否一致，
    不一致就列出差在哪、要你確認（見 STAMP）。

⚠ 讀 enemies.js 用 macOS 的 `jsc` 跑一次真的 import（同 script_lint.py 的作法）——
  自己寫 JS 解析器一定會在某個引號或巢狀上翻車。
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS   = os.path.join(ROOT, 'script', 'enemies.js')
# ⚠⚠ 只有這一份 Excel（ver -952）：Ray 直接在**專案根目錄**編輯它，所以匯出也寫回同一個檔。
#   以前匯出到 tools/、他改的卻是根目錄那份 —— 兩份必然走鐘（鐵律 7），
#   而症狀是「匯入之後數值又跳回去」，事後看不出是哪一格被換走的。舊的那份已進回收區。
XLSX = os.path.join(ROOT, 'enemies.xlsx')
JSC  = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc'

# ── 巢狀欄位怎麼攤平成欄 ───────────────────────────────────────────────
#   ⚠ 只攤「格子裡填得下一個數字」的那幾個；結構複雜的（hitFx／loot／resist…）
#     整包寫成 JSON 字串，Excel 上照樣改得動，但改壞了 import 會擋下來。
WEAPONS = ['重機槍', '霰彈槍', '萊福槍']
PAIRS   = {                      # 欄位 → (子鍵順序)
    'openAssault':  ['min', 'max'],
    'assaultEvery': ['min', 'max'],
}
OBJS = {                         # 欄位 → 子鍵（缺的留空）
    'ult':          ['on', 'hp', 'count', 'atk', 'gap', 'cd'],
    'assault':      ['count', 'gap'],
    'fit':          ['mode', 'pos'],
    # ⚠ 只出**絕對值**那兩格（ver -947，Ray 把倍率欄刪了）：dmgScale／timeDelta
    #   是相對寫法，§6.5.2 的規約本來就是「卡上寫絕對值就存絕對值」。
    # ⚠ delayPenalty.timeDelta 在 JS 裡**還活著**（只有 witch 用，−1）——
    #   它是相對盤面 intervalLimit 的，換不成絕對值，所以留在 js、不上 Excel。
    'delayPenalty': ['seconds', 'damage'],
    'wrongPenalty': ['damage'],
}
# ── 圖：縮圖欄與「有圖沒卡」的列（ver -945，Ray：「有圖的敵人都先做進 excel，
#      最好能在相應欄顯示縮圖」）────────────────────────────────────────────
#   ⚠ 目的是**看著圖填卡**：美術先交圖、卡還沒寫的那幾隻也要在表上有一列，
#     不然它們就只是躺在資料夾裡，很容易忘記。
#   ⚠ 那幾列的 `key` 是**空的** —— 匯入時會被當成「不是既有的卡」跳過（新增整張卡
#     仍要寫進 enemies.js，Ray 同意的作法）。它們在表上是**待辦**不是資料。
IMG_DIR  = os.path.join(ROOT, 'resources', 'enemy')
IMG_COLS = ['圖', '圖檔']
THUMB_W  = 64          # 縮圖寬（px）；列高跟著它算
def enemy_files():
    """`resources/enemy/` 裡的怪圖。⚠ 只認 `mon_` 開頭（§5 的命名規約）——
       同一個資料夾裡還有 cut-in 與靶（Belinda_CI／Kidd_CI／Dart_counter），那些不是怪。"""
    try: fs = os.listdir(IMG_DIR)
    except OSError: return []
    return sorted(f for f in fs
                  if f.lower().startswith('mon_') and f.lower().endswith(('.webp', '.png', '.jpg', '.jpeg')))
def load_assets():
    tmp = '/tmp/_tivot_dump_assets.mjs'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(f"import {{ ASSETS }} from '{os.path.join(ROOT,'config.js')}';\nprint(JSON.stringify(ASSETS));\n")
    r = subprocess.run([JSC, '-m', tmp], capture_output=True, text=True)
    try: return json.loads(r.stdout)
    except Exception: return {}
def file_of(card, assets, files):
    """這張卡用的是哪一個圖檔 —— 回**專案內的相對路徑**。
       ⚠⚠ 不要只回檔名：敵人立繪不是全部住在 `resources/enemy/`（賞金獵人那張在
         `resources/SI/`）—— 只留檔名再去 enemy 資料夾找，那一列的縮圖就貼不出來
         （-945 實測就漏了 guild_hunter 一張）。
       ⚠ ASSETS 查不到要再猜一次：聖遺物那 10 隻的 ASSETS 目前是**註解掉的**
         （ver -934，等開峽谷才放）——查不到不代表沒有圖。"""
    im = card.get('image')
    keys = [im] if isinstance(im, str) else list((im or {}).values())
    for k in keys:
        p = assets.get(k)
        if p: return p.split('?')[0]
    for k in keys:                      # 退路：enemy_relic_chalice → mon_relic_chalice.webp
        stem = re.sub(r'^enemy_', '', str(k or '')).lower()
        if not stem: continue
        for f in files:
            if os.path.splitext(f)[0].lower().endswith(stem): return 'resources/enemy/' + f
    return ''


# ══⚠⚠⚠ **版面照 Ray 交的那一份**（ver -949，他在根目錄放了 enemies.xlsx 當範本）══
#   三列表頭：① 群組（合併）② 欄名（機器讀的）③ 中文顯名（人看的）；資料從第 4 列起。
#   ⚠ **欄名那一列是唯一的真相**：匯入只認它，中文顯名純粹是給人看的，改了不影響匯入。
#   ⚠ 群組與順序是 Ray 排的（他要照這個順序填），**不要自己重排** —— 那是他的工作動線。
LAYOUT = [
    ('編號',   [('__no__',          '')]),
    ('基本資料', [('key',            ''), ('圖', '圖'), ('圖檔', '圖檔'), ('name', '顯名')]),
    ('基本設定', [('story',          '劇情'), ('kind', '種類'), ('hp', 'HP'), ('attack', '攻擊力'),
                ('counterStagger', '反擊硬直'), ('boss', 'Boss'), ('noStack', '不疊圈'), ('entrance', '進場音效'),
                ('bg',             '指定地點')]),
    ('武器增益', [('Ganymede',       '雙槍增傷'),
                ('weaponMod.重機槍.傷害', '機槍增傷'), ('weaponMod.重機槍.迴避', '機槍迴避'),
                ('weaponMod.霰彈槍.傷害', '霰彈增傷'), ('weaponMod.霰彈槍.迴避', '霰彈迴避'),
                ('weaponMod.萊福槍.傷害', '萊福槍增傷'), ('weaponMod.萊福槍.迴避', '萊福槍迴避')]),
    ('起手',   [('boardGrids',      '盤面'), ('openAssault.min', '先手起點'), ('openAssault.max', '先手終點')]),
    ('攻擊',   [('atkInterval',     '縮圈秒數'), ('assaultEvery.min', '攻擊頻率下限'),
                ('assaultEvery.max','攻擊頻率上限'), ('assault.count', '攻擊圈數'), ('assault.gap', '攻擊圈時間差')]),
    ('大絕',   [('ult.on',          '大絕開關'), ('ult.hp', '大絕血量'), ('ult.count', '大絕數量'),
                ('ult.atk',         '每顆攻擊'), ('ult.gap', '每顆間格'), ('ult.cd', '大絕cd')]),
    ('延時',   [('delayPenalty.seconds', '延時秒數'), ('delayPenalty.damage', '延時攻擊')]),
    ('錯誤',   [('wrongPenalty.damage',  '錯誤攻擊')]),
    # 受擊特效拆四格（ver -948 的「受擊四種狀況」）：延時／按錯／攻擊／大絕
    ('受擊特效', [('hitFx.delay',  '延時'), ('hitFx.wrong', '按錯'),
                ('hitFx.assault','攻擊'), ('hitFx.ult',   '大絕')]),
    ('圖幅',   [('fit.mode',        '取景模式'), ('fit.pos', '取景位置')]),
    ('掉落',   [('loot1.id','掉落1'), ('loot1.n','數量'), ('loot1.p','機率'),
                ('loot2.id','掉落2'), ('loot2.n','數量'), ('loot2.p','機率'),
                ('loot3.id','掉落3'), ('loot3.n','數量'), ('loot3.p','機率'),
                ('loot4.id','掉落4'), ('loot4.n','數量'), ('loot4.p','機率')]),
    ('其他',   [('special',         '特殊')]),
]
HITFX_SLOTS = ['delay', 'wrong', 'assault', 'ult']
LOOT_N = 4

def columns():
    """[(欄名, 中文顯名, 群組)] —— 版面的唯一來源就是 LAYOUT。"""
    out=[]
    for g, fields in LAYOUT:
        for i,(n,lab) in enumerate(fields): out.append((n, lab, g if i==0 else None, len(fields)))
    return out

def cell(card, col):
    """一格的值。⚠ 只有這一支知道「欄名 → 卡上的哪個值」（鐵律 7）——匯出與匯入
       的比對都問它，兩邊各寫一份必然走鐘。"""
    if col == '__no__' or col in ('圖', '圖檔'): return ''
    if col == 'entrance':  return card.get('entrance', '') or ''
    if col == 'Ganymede':
        # 主武器（普攻）的增傷／減傷：與三把副武器同一排（ver -949，取代舊的 resist.basic）
        v = card.get('Ganymede'); return '' if v is None else v
    if col.startswith('weaponMod.'):
        _, w, which = col.split('.')
        arr = (card.get('weaponMod') or {}).get(w) or [0, 0]
        return arr[0] if which == '傷害' else arr[1]
    if col.startswith('hitFx.'):
        v = (card.get('hitFx') or {}).get(col.split('.')[1])
        if not v: return ''
        return v if isinstance(v, str) else (v.get('type') or '')   # 舊的物件寫法只印 type
    if col.startswith('loot'):
        idx = int(col[4]) - 1; part = col.split('.')[1]
        arr = card.get('loot') or []
        if idx >= len(arr): return ''
        got = arr[idx].get(part)
        if got is None: return ''
        if part == 'id': return f"{ITEM_NAME.get(got, got)}｜{got}"   # 中文在前（見 item_opts）
        return got
    if '.' in col:
        head, rest = col.split('.', 1)
        v = card.get(head)
        if v is None: return ''
        if head in PAIRS:
            return (v or [None, None])[PAIRS[head].index(rest)]
        got = (v or {}).get(rest)
        return '' if got is None else got
    v = card.get(col)
    if v is None: return ''
    if isinstance(v, (str, int, float, bool)): return v
    return json.dumps(v, ensure_ascii=False)

def load_js():
    tmp = '/tmp/_tivot_dump_enemies.mjs'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(f"import {{ ENEMIES }} from '{JS}';\nprint(JSON.stringify(ENEMIES));\n")
    r = subprocess.run([JSC, '-m', tmp], capture_output=True, text=True)
    if r.returncode != 0 or not r.stdout.strip():
        sys.exit('讀不到 enemies.js：\n' + (r.stderr or '')[:800])
    return json.loads(r.stdout)

def load_named(name, expr):
    tmp = f'/tmp/_tivot_dump_{name}.mjs'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(f"import {{ {name} }} from '{os.path.join(ROOT,'config.js')}';\nprint(JSON.stringify({expr}));\n")
    r = subprocess.run([JSC, '-m', tmp], capture_output=True, text=True)
    try: return json.loads(r.stdout)
    except Exception: return None

def load_assets(): return load_named('ASSETS', 'ASSETS') or {}
def item_opts():
    """掉落的下拉選項：**中文在前、id 在後**（ver -951，Ray：「掉落物選擇時把中文
       也前綴上去」）—— 光看 id 認不出是什麼。格式 `中文｜id`，匯入時取 `｜` 之後那一段。
       ⚠ 分隔用全形「｜」：道具 id 是 a-z0-9_，中文名裡也不會有它，切得乾淨。"""
    d = load_named('GAME_CONFIG', 'GAME_CONFIG.items.defs') or {}
    return [f"{(v or {}).get('name') or k}｜{k}" for k, v in d.items()]
def hitfx_opts(): return load_named('HITFX', 'Object.keys(HITFX)') or []
def bg_names():
    """背景的基底名（去副檔名、去重）—— 卡上的 `bg` 就是寫這個。"""
    d = os.path.join(ROOT, 'resources', 'background')
    try: fs = os.listdir(d)
    except OSError: return []
    return sorted({os.path.splitext(f)[0] for f in fs if f.lower().endswith(('.webp', '.png', '.jpg', '.jpeg'))})

# ── 匯出 ──────────────────────────────────────────────────────────────
ITEM_NAME = {}          # id → 中文（匯出時填；給 loot 那幾格加前綴用）
def strip_label(v):
    """下拉選來的值是 `中文｜id`，卡上要存的是 id。⚠ 取**最後一段**：中文名裡
       萬一也有分隔符也不會切錯。"""
    return str(v).split('｜')[-1].strip() if v is not None else v

def orphan_images(data=None, assets=None, files=None):
    """**有圖、還沒有卡**的那幾張 —— 回專案相對路徑的清單。
       ⚠⚠ 只有這一支在算（鐵律 7）：匯出要把它們排成待辦列、`newcards` 要照它建卡。
         兩邊各寫一份的話，會出現「Excel 上是待辦、建卡卻跳過」這種對不起來的狀況。
       濾掉「假待辦」的兩條規則是**算的**不是名單：
         ① 同名的另一種副檔名已經被某張卡用了（轉檔前的原圖）
         ② 檔名在 `script/*.js` 被引用過（鹿主的中景層走 `cgBack`，不是敵人卡）"""
    data   = load_js()      if data   is None else data
    assets = load_assets()  if assets is None else assets
    files  = enemy_files()  if files  is None else files
    used = {f for f in (file_of(c, assets, files) for c in data.values()) if f}
    stems = {os.path.splitext(os.path.basename(u))[0].lower() for u in used}
    def referenced(fn):
        for d, _, fs in os.walk(os.path.join(ROOT, 'script')):
            for x in fs:
                if x.endswith('.js'):
                    try:
                        if fn in open(os.path.join(d, x), encoding='utf-8').read(): return True
                    except OSError: pass
        return False
    out = []
    for f in files:
        rel = 'resources/enemy/' + f
        if rel in used or os.path.splitext(f)[0].lower() in stems or referenced(f): continue
        out.append(rel)
    return out

STAMP = '__源檔指紋__'   # 匯出當下 enemies.js 的內容雜湊；匯入時對一次
def do_export():
    import hashlib, tempfile
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from openpyxl.drawing.image import Image as XLImage
    from openpyxl.utils import get_column_letter as CL
    from openpyxl.worksheet.datavalidation import DataValidation
    data   = load_js()
    global ITEM_NAME
    ITEM_NAME = {k: (v or {}).get('name') or k
                 for k, v in (load_named('GAME_CONFIG', 'GAME_CONFIG.items.defs') or {}).items()}
    assets = load_assets()
    files  = enemy_files()
    cols   = columns()
    names  = [c[0] for c in cols]
    wb = Workbook(); ws = wb.active; ws.title = '敵人卡'

    # 三列表頭
    ws.append([c[2] or '' for c in cols])          # ① 群組
    ws.append([c[0] for c in cols])                # ② 欄名（機器讀的）
    ws.append([c[1] for c in cols])                # ③ 中文顯名
    i = 1
    for g, fields in LAYOUT:                       # 群組橫向合併
        if len(fields) > 1: ws.merge_cells(start_row=1, start_column=i, end_row=1, end_column=i+len(fields)-1)
        i += len(fields)
    ws.merge_cells('A1:A3')                        # 編號那一欄縱向合併（同 Ray 那一份）

    rows_img = []; used = set(); n = 0
    def put(key, card, f):
        nonlocal n
        row = [f'{n:03d}'] + ['' if c in ('__no__',) else ('' if c == '圖' else (f if c == '圖檔' else cell(card, c))) for c in names[1:]]
        ws.append(row); n += 1
        if f: rows_img.append((ws.max_row, f))
    for k, card in data.items():
        f = file_of(card, assets, files)
        if f: used.add(f)
        c2 = dict(card); c2['key'] = k
        put(k, c2, f)
        ws.cell(ws.max_row, names.index('key') + 1).value = k
    for rel in orphan_images(data, assets, files):    # 有圖沒卡＝待辦列（key 留空）
        put('', {}, rel)

    # ── 版面：格線、表頭、凍結 ──
    thin = Side(style='thin', color='BFBFBF')
    box  = Border(left=thin, right=thin, top=thin, bottom=thin)
    grp  = PatternFill('solid', fgColor='E8D9BC')
    hdr  = PatternFill('solid', fgColor='FFF2E0')
    ctr  = Alignment(horizontal='center', vertical='center', wrap_text=True)
    for r in ws.iter_rows(min_row=1, max_row=ws.max_row, max_col=len(cols)):
        for c in r:
            c.border = box
            if c.row <= 3: c.alignment = ctr
    for c in ws[1]: c.font = Font(bold=True); c.fill = grp
    for c in ws[2]: c.font = Font(bold=True, size=9, color='808080'); c.fill = hdr
    for c in ws[3]: c.font = Font(bold=True); c.fill = hdr
    ws.freeze_panes = 'B4'
    ws.row_dimensions[1].height = 22; ws.row_dimensions[2].height = 15; ws.row_dimensions[3].height = 34
    for i, (nm, lab, _g, _n) in enumerate(cols, 1):
        w = max(len(str(lab or nm)) * 2, *(len(str(ws.cell(r, i).value or '')) for r in range(4, ws.max_row + 1)))
        ws.column_dimensions[CL(i)].width = min(max(w + 2, 7), 40)

    # ── 下拉選單（bg／掉落物品）──
    #   ⚠ 清單走**另一張表的範圍**不是逐字塞進公式：Excel 的 formula1 有 255 字上限，
    #     背景有三百多個，直接塞會整條驗證失效（而且不會報錯）。
    lst = wb.create_sheet('__lists__')
    lst['A1'] = 'bg'; lst['B1'] = 'item'
    bgs, items, fxs = bg_names(), item_opts(), hitfx_opts()
    lst['C1'] = 'hitFx'
    for j, v in enumerate(bgs, 2):   lst.cell(j, 1).value = v
    for j, v in enumerate(items, 2): lst.cell(j, 2).value = v
    for j, v in enumerate(fxs, 2):   lst.cell(j, 3).value = v
    def add_dv(colname, ref):
        if colname not in names: return
        i = names.index(colname) + 1
        dv = DataValidation(type='list', formula1=ref, allow_blank=True, showDropDown=False)
        ws.add_data_validation(dv)
        dv.add(f'{CL(i)}4:{CL(i)}{ws.max_row}')
    add_dv('bg', f"'__lists__'!$A$2:$A${len(bgs)+1}")
    for i in range(1, LOOT_N + 1): add_dv(f'loot{i}.id', f"'__lists__'!$B$2:$B${len(items)+1}")
    # 受擊特效四格：一個名字就是一整個樣子（ver -951，見 config.HITFX）
    for sl in HITFX_SLOTS: add_dv(f'hitFx.{sl}', f"'__lists__'!$C$2:$C${len(fxs)+1}")
    lst.sheet_state = 'hidden'

    # ── 縮圖 ──
    tmpd = tempfile.mkdtemp(prefix='tivot_thumb_')
    ws.column_dimensions[CL(names.index('圖') + 1)].width = THUMB_W / 7.0 + 2
    for r, f in rows_img:
        try:
            from PIL import Image as PILImage
            im = PILImage.open(os.path.join(ROOT, f))
            if im.mode not in ('RGB', 'RGBA'): im = im.convert('RGBA')
            im.thumbnail((THUMB_W, THUMB_W * 4))
            bgw = PILImage.new('RGBA', im.size, (255, 255, 255, 255))
            bgw.alpha_composite(im.convert('RGBA'))
            out = os.path.join(tmpd, f'{r}.png'); bgw.convert('RGB').save(out)
            ws.add_image(XLImage(out), f'{CL(names.index("圖")+1)}{r}')
            ws.row_dimensions[r].height = max(im.size[1] * 0.78, 18)
        except Exception:
            ws.cell(r, names.index('圖') + 1).value = '(縮圖失敗)'

    meta = wb.create_sheet('__meta__')
    meta.append([STAMP, hashlib.sha256(open(JS, 'rb').read()).hexdigest()])
    meta.append(['說明', '這一頁不要改。匯入時會拿它確認「你手上這份是從哪一版匯出的」。'])
    meta.sheet_state = 'hidden'
    wb.save(XLSX)
    print(f'寫出 {XLSX}：{len(data)} 張卡、{len(cols)} 欄（含 {len(rows_img)} 張縮圖）')

# ── 匯入（就地改值）────────────────────────────────────────────────────
def js_literal(v):
    if isinstance(v, bool):  return 'true' if v else 'false'
    if isinstance(v, int):   return str(v)
    if isinstance(v, float): return ('%g' % v)
    return "'" + str(v).replace("'", "\\'") + "'"

def card_span(src, key):
    m = re.search(r'\n    ' + re.escape(key) + r': \{', src)
    if not m: return None
    i = m.end(); d = 1; j = i
    while j < len(src) and d > 0:
        if src[j] == '{': d += 1
        elif src[j] == '}': d -= 1
        j += 1
    return (i, j)

def set_scalar(src, key, path, val):
    sp = card_span(src, key)
    if not sp: return src, False
    i, j = sp; body = src[i:j]
    parts = path.split('.')
    if len(parts) == 1:
        m = re.search(r'(\n\s*' + re.escape(parts[0]) + r':\s*)([^,\n]*?)(\s*)(?=,|\n|$)', body)
        if not m: return src, False
        body2 = body[:m.start(2)] + js_literal(val) + body[m.end(2):]
    else:
        head = parts[0]
        m = re.search(r'\n\s*' + re.escape(head) + r':\s*(\{[^{}]*\}|\[[^\]]*\])', body)
        if not m: return src, False
        blob = m.group(1)
        if head == 'weaponMod':
            w, idx = parts[1], int(parts[2])
            mm = re.search(r"('" + re.escape(w) + r"'\s*:\s*\[)([^\]]*)(\])", blob)
            if not mm: return src, False
            nums = [x.strip() for x in mm.group(2).split(',')]
            nums[idx] = js_literal(val)
            blob2 = blob[:mm.start(2)] + ','.join(nums) + blob[mm.end(2):]
        elif head in PAIRS:
            nums = [x.strip() for x in blob.strip('[]').split(',')]
            nums[PAIRS[head].index(parts[1])] = js_literal(val)
            blob2 = '[' + ','.join(nums) + ']'
        else:
            mm = re.search(r'(\b' + re.escape(parts[1]) + r'\s*:\s*)([^,}]*)', blob)
            if not mm: return src, False
            blob2 = blob[:mm.start(2)] + js_literal(val) + blob[mm.end(2):]
        body2 = body[:m.start(1)] + blob2 + body[m.end(1):]
    return src[:i] + body2 + src[j:], True


def _span_after(body, key):
    """找 `key:` 後面那一整塊（{…} 或 […]），回 (值的起, 值的迄)；找不到回 None。"""
    m = re.search(r'\n\s*' + re.escape(key) + r':\s*', body)
    if not m: return None
    st = m.end()
    if st >= len(body) or body[st] not in '[{': return None
    op = body[st]; cl = ']' if op == '[' else '}'
    d = 0; j = st
    while j < len(body):
        if body[j] == op: d += 1
        elif body[j] == cl:
            d -= 1
            if d == 0: return (st, j + 1)
        j += 1
    return None

def set_block(src, key, field, text):
    """把 <卡>.<field> 那一整塊換成 text（loot／hitFx 用）。
       ⚠ 為什麼要整塊重寫：那兩個是**陣列／多鍵物件**，Excel 上可能新增一列掉落、
         也可能第一次填 hitFx.ult —— 逐格替換只改得動「已經存在的那一格」
         （-951 的往返測試就是這樣漏掉 loot 與新增的 ult）。"""
    sp = card_span(src, key)
    if not sp: return src, False
    i, j = sp; body = src[i:j]
    at = _span_after(body, field)
    if at:
        body2 = body[:at[0]] + text + body[at[1]:]
    else:
        m = re.search(r'\n(\s*)([a-zA-Z_])', body)          # 照這張卡的縮排補一行
        ind = m.group(1) if m else '      '
        body2 = body.rstrip()
        if not body2.endswith(','): body2 += ','
        body2 += f'\n{ind}{field}:{text},\n' + ' ' * (len(ind) - 2)
    return src[:i] + body2 + src[j:], True

def loot_text(rows):
    """rows: [(id, n, p)] → `[ { id:'x', n:1, p:0.33 }, … ]`（空的回 `[]`）。"""
    out = []
    for iid, n, pp in rows:
        if not iid: continue
        parts = [f"id:'{iid}'", f"n:{int(n) if n not in (None,'') else 1}"]
        if pp not in (None, ''): parts.append('p:' + ('%g' % float(pp)))
        out.append('{ ' + ', '.join(parts) + ' }')
    return '[ ' + ', '.join(out) + ' ]' if out else '[]'

def hitfx_text(slots):
    """slots: {delay/wrong/assault/ult → 名字}（空的跳過）。"""
    body = ', '.join(f"{k}:'{v}'" for k, v in slots.items() if v)
    return '{ ' + body + ' }' if body else '{}'

SKIP_COLS = {'__no__', '圖', '圖檔', 'key'}
# ── 新怪圖 → 建一張「最普通的怪」的卡（ver -952，Ray：「之後有新怪圖我會指示你更新…
#    套用一個最普通的怪數值，我再自己下去手動改」）─────────────────────────────
#   範本＝`sf_lynx`（森林山貓）：沒有大絕、沒有特殊規則、九宮格五盤的一般野獸。
#   ⚠⚠ **只建「最普通的」那一組，不要替 Ray 猜**：血量、攻擊、掉落、背景、kind
#     都是那一隻的設計，猜出來的數字看起來像已經調過，反而更難發現還沒填。
#     所以 `bg`／`loot` 留空、名字寫「（待命名）」—— 空著才看得出是待辦。
#   ⚠⚠ **卡與 ASSETS 是一起的**：只建卡不補 ASSETS ＝「那一場沒有敵人立繪」，
#     而畫面上不會有任何錯誤訊息（ver -929 的 `np_boss` 就是這樣）。兩邊一起寫。
CARD_TMPL = """    {key}: {{
      name:'（待命名）',
      story:0, counterStagger:1,
      Ganymede:0,   // 主武器（普攻）的增傷／減傷：正=增傷、負=抗性減傷（加法，同副武器那三把）
      weaponMod:{{ '重機槍':[0,0], '霰彈槍':[0,0], '萊福槍':[0,0] }},
      openAssault:[1,2],
      ult:{{ on:0, hp:40, count:4, atk:20, gap:0.4, cd:4 }},
      assaultEvery:[2,4],
      assault:{{ count:1, gap:0 }},
      kind:'beast',
      image:'enemy_{key}',
      bg:'',   // ⚠ 待填：戰鬥背景的基底名
      fit:{{ mode:'contain', pos:'center bottom' }},
      hp:200,
      attack:10,
      atkInterval:null,
      delayPenalty:{{ seconds:5 }},
      entrance:null,
      special:[],
      boardGrids:[9,9,9,9,9],
      hitFx:{{ delay:'claw1',
              wrong:'slash',
              assault:'bite' }},
      loot:[],   // ⚠ 待填
    }},
"""

def do_newcards():
    """有圖沒卡的每一張 → 在 enemies.js 補一張最普通的卡、在 config.js 補一行 ASSETS。"""
    orphans = orphan_images()
    if not orphans: print('沒有「有圖沒卡」的怪，什麼都不用做。'); return
    js  = open(JS, encoding='utf-8').read()
    cfg = open(os.path.join(ROOT, 'config.js'), encoding='utf-8').read()
    cur = load_js()
    # 卡要插在 ENEMIES 物件的最後一張之後 ——「例：新怪」那段註解之前
    anchor = '\n    // 例：新怪'
    if anchor not in js: sys.exit('✗ 找不到 enemies.js 的插入錨點（「// 例：新怪」那一段）')
    # ASSETS 的敵人區：接在**最長的那一段連續 `enemy_`** 之後
    # ⚠⚠ 不可以用「檔案裡最後一行 enemy_」當錨點：`enemy_man_sorana` 那一行夾在 BGM
    #   區中間（ver -745 補的），照那個錨點插會把敵人立繪塞進音樂區 —— 語法沒錯、
    #   遊戲也跑得動，所以**不會有任何錯誤訊息**，只有檔案越來越亂。
    #   取**最後一段 3 行以上的**：落單的那一行進不來，而且新卡接在敵人區的尾巴。
    runs, cur_run = [], []
    for mo in re.finditer(r'^  enemy_[A-Za-z0-9_]+:.*$', cfg, re.M):
        if cur_run and cfg.count('\n', cur_run[-1].end(), mo.start()) > 3: runs.append(cur_run); cur_run = []
        cur_run.append(mo)
    if cur_run: runs.append(cur_run)
    runs = [r for r in runs if len(r) >= 3]
    if not runs: sys.exit('✗ 找不到 config.js 的 ASSETS 敵人區')
    a_last = runs[-1][-1]

    cards, lines, made = '', '', []
    for rel in orphans:
        stem = os.path.splitext(os.path.basename(rel))[0]
        key  = re.sub(r'^mon_', '', stem)          # ⚠ 機器推的鑰匙：檔名去掉 mon_
        if key in cur: print(f'  略過 {key}（卡已經存在）'); continue
        cards += CARD_TMPL.format(key=key)
        lines += ('\n  enemy_' + key + ':').ljust(34) + f' "{rel}",'
        made.append((key, rel))
    if not made: print('沒有要新增的。'); return
    hdr = ('\n  /* ══ 新怪圖：卡是 `newcards` 建的「最普通的怪」，數值等 Ray 手動改 ══ */'
           if '新怪圖：卡是' not in cfg else '')
    js  = js.replace(anchor, '\n' + cards + anchor, 1)
    cfg = cfg[:a_last.end()] + hdr + lines + cfg[a_last.end():]
    open(JS, 'w', encoding='utf-8').write(js)
    open(os.path.join(ROOT, 'config.js'), 'w', encoding='utf-8').write(cfg)
    print(f'建了 {len(made)} 張卡（enemies.js ＋ config.js 的 ASSETS）：')
    for k, f in made: print(f'   {k:<24} ← {f}')
    print('⚠ 鑰匙是**從檔名推的**（去掉 mon_）—— 要換成別的名字說一聲，趁還沒有人引用它最好改。')
    print('⚠ 名字／背景／掉落／血量都還沒填：跑一次 export，在 Excel 上改。')

def do_import(path):
    import hashlib
    from openpyxl import load_workbook
    path = path or XLSX
    wb = load_workbook(path, data_only=True)
    if '__meta__' in wb.sheetnames:
        got = wb['__meta__'].cell(1, 2).value
        now = hashlib.sha256(open(JS, 'rb').read()).hexdigest()
        if got and got != now:
            print('⚠⚠ 這份 Excel 是從**別的版本**匯出的（源檔指紋對不上）。')
            print('   中間 enemies.js 被改過 —— 直接匯入會把那些改動蓋掉。')
            print('   建議：先 `export` 一份新的、把你的修改抄過去，再 import。')
            if input('   還是要繼續？(yes/N) ').strip().lower() != 'yes': return
    ws = wb['敵人卡']
    names = [c.value for c in ws[2]]           # ⚠ 第 2 列才是欄名（第 1 列是群組、第 3 列是中文）
    cur  = load_js()
    src  = open(JS, encoding='utf-8').read()
    changed, skipped, unknown = [], [], []
    for r in range(4, ws.max_row + 1):
        key = ws.cell(r, names.index('key') + 1).value
        key = str(key).strip() if key else ''
        if not key: continue                    # 「有圖沒卡」那幾列
        if key not in cur: unknown.append(key); continue
        # loot／hitFx 是整塊的：先把這一列的值收齊，最後一次寫（見 set_block）
        rows_loot, slots_fx = [], {}
        for n_ in range(1, LOOT_N + 1):
            g = lambda part: ws.cell(r, names.index(f'loot{n_}.{part}') + 1).value if f'loot{n_}.{part}' in names else None
            rows_loot.append((strip_label(g('id')) if g('id') else '', g('n'), g('p')))
        for sl in HITFX_SLOTS:
            if f'hitFx.{sl}' in names:
                v = ws.cell(r, names.index(f'hitFx.{sl}') + 1).value
                if v: slots_fx[sl] = str(v).strip()
        want_loot = loot_text(rows_loot)
        want_fx   = hitfx_text(slots_fx)
        if want_loot != loot_text([(d.get('id',''), d.get('n'), d.get('p')) for d in (cur[key].get('loot') or [])]):
            src, ok = set_block(src, key, 'loot', want_loot)
            (changed if ok else skipped).append(f'{key}.loot → {want_loot}')
        cur_fx = cur[key].get('hitFx') or {}
        if want_fx != hitfx_text({k2: (v2 if isinstance(v2, str) else (v2 or {}).get('type')) for k2, v2 in cur_fx.items()}):
            src, ok = set_block(src, key, 'hitFx', want_fx)
            (changed if ok else skipped).append(f'{key}.hitFx → {want_fx}')
        for i, c in enumerate(names, 1):
            if not c or c in SKIP_COLS: continue
            if c.startswith('loot') or c.startswith('hitFx.'): continue   # 上面整塊寫過了
            v = ws.cell(r, i).value
            old = cell(cur[key], c)
            new = '' if v is None else v
            if isinstance(old, float) and isinstance(new, (int, float)) and abs(old - new) < 1e-9: continue
            if str(old) == str(new): continue
            if c.endswith('.id') and c.startswith('loot'):
                new = strip_label(new)              # 「中文｜id」→ id
                old = strip_label(old)
                if str(old) == str(new): continue
            path = c
            if c.startswith('weaponMod.'):
                _, w, which = c.split('.')
                path = f'weaponMod.{w}.' + ('0' if which == '傷害' else '1')
            src2, ok = set_scalar(src, key, path, new)
            if ok: src = src2; changed.append(f'{key}.{c}: {old} → {new}')
            else:  skipped.append(f'{key}.{c}（{old} → {new}）')
    if changed: open(JS, 'w', encoding='utf-8').write(src)
    print(f'改了 {len(changed)} 格：')
    for l in changed: print('  ', l)
    if skipped:
        print(f'⚠ 改不到 {len(skipped)} 格（結構太複雜／欄位不存在，請直接改 enemies.js）：')
        for l in skipped: print('  ', l)
    if unknown:
        print('⚠ Excel 上有、enemies.js 沒有的卡（新增卡請直接寫進 js）：', unknown)

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'export'
    if cmd == 'export': do_export()
    elif cmd == 'newcards': do_newcards()
    elif cmd == 'import': do_import(sys.argv[2] if len(sys.argv) > 2 else None)
    else: sys.exit(__doc__)
