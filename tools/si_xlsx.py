#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/si_xlsx.py —— SI 立繪差分總表（ver -1327）

    py tools/si_xlsx.py                  # 出表到 resources/SI/_SI_差分總表.xlsx
    py tools/si_xlsx.py --check          # 只印統計與待辦清單，不出表

做什麼：把 `resources/SI/` 底下的立繪列成表 —— 分角色、帶檔名、**帶一張
抓臉的縮圖**（縮圖以「看得出表情」為準，不是看得出全身）。
**美術每次交檔重跑一次就更新**，不必手動維護。

⚠⚠ **一個差分一列，不是一個檔案一列**（ver -1487，Ray：「不要列重覆的」）。
  兩種東西以前會各自佔一列，現在都收掉了：
    · **底線開頭的**（`_ornament_master2.png`／`_ref_*.png`）—— 那是母版與參考圖，
      §5 說得很明白，遊戲根本不會載它們。**整個不列**。
    · **同一個差分的第二張圖** —— 同檔名不同夾（`renna_newhair/`）或 `_vN` 候選
      （`NPC_Grocer_SI_v1…v5`）。留**線上跑的那一張**（speakers.js 指到的），
      其餘寫進那一列的「另有版本」欄 ＋「待接線・缺檔」那一頁。
  ⚠ 資訊一個都沒少，只是換了位子 —— 「還有另一張圖等著換上去」是**待辦**，
    不是另一個差分（鐵律 7：一個差分一份真相）。
  實測 294 檔 → **236 個差分**（去掉 5 張母版／參考圖、53 張重覆版本）。

⚠⚠ 臉的位置**不做自動偵測**（§6.5：臉的自動偵測會被頭髮吃掉），也**不自己發明取景**
  —— 沿用專案既有的那一支頭像取景 `speakers.faceStyle()`（破防計量表的月彎、
  旅店的門用的就是它，ver -1035／-1046）。所以**表上的縮圖就是遊戲裡那顆頭像
  看到的東西**，不是另一種裁法（鐵律 7）：
    · 橫向錨 ＝ 差分的 `faceFx` → 差分的 `fx` → 角色的 `faceFx` → 角色的 `fx`
      （`fx` 是「臉」的位置、`faceFx` 是「頭與肩那一塊」的水平重心 —— 側面圖差很多）
    · 縮放 ＝ `FACE_ZOOM × 差分的 faceZoomK`（那幾張畫得比較滿的要縮回去）
    · 縱向貼齊 `top`（人物最上緣；這批立繪的頭頂本來就在圖的最上緣）
  沒量過的（`unmeasured`、或美術剛交還沒接進 speakers.js）才走 alpha 退路：
  取 alpha 外框的**上緣**與**頭部帶狀區的水平中心**。⚠ 那是估的，表上標「估」，
  **不要拿它回頭去填 speakers.js**（那幾個值要照 §6.5 量）。

⚠ 路徑要**去掉 `?v=`** 才找得到檔案（§5 的 cache-buster）—— 不去的話整批變成
  「檔案不見」，而那個症狀看起來就像美術沒交件（本工具第一版就踩過）。

⚠ 這支只讀，不改任何專案檔（除了輸出的 xlsx）。
"""
import io, os, re, sys
import _utf8   # noqa: F401  # 主控台 UTF-8（中文 Windows 的 cp950），見 tools/_utf8.py
import _jsrun  # JS 資料的唯一引擎（jsc／node），見 tools/_jsrun.py
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SI_DIR = os.path.join(ROOT, 'resources', 'SI')
# ⚠ **固定放在 SI 資料夾**（ver -1327，Ray 指定）：這張表是給看差分用的，
#   就該躺在差分旁邊。底線開頭 ＝ 同 `_eastport_spec.md` 那一族，不是素材。
OUT = os.path.join(SI_DIR, '_SI_差分總表.xlsx')
# NPC 的立繪住在這個子資料夾 —— 分頁就照它切（見 write_xlsx 的說明）。
NPC_DIR = 'resources/SI/NPC/'
IMG_EXT = ('.webp', '.png', '.jpg', '.jpeg')

# 縮圖：邊長（夠看清楚眼睛與嘴角就好，檔案不要肥）
TH = 140

# ⚠⚠⚠ 底下這段是 `script/speakers.js` 的 `faceStyle()` 的**第二份實作**
#   —— Python 這邊跑不了 CSS，只能把它的幾何解成像素。
#   憲法鐵律 7 的但書：**兩邊的註解要互指，改一邊要改另一邊**（那邊已標）。
#   對應關係：
#     `background-size: Z% auto`   → 縮放後的圖寬 ＝ 框寬 × Z/100
#     `background-position: P% 0%` → 圖的 P% 對齊框的 P%，縱向貼齊上緣
#   解出來的可視範圍（圖的像素座標）：
#     可視邊長 ＝ imgW × 100/Z　　左緣 ＝ imgW × fx × (1 − 100/Z)
#   ⇒ 這樣算出來的縮圖，**就是遊戲裡那顆頭像看到的東西**（破防計量表的月彎／旅店的門）。
FACE_ZOOM = 300.0   # ＝ modules/combat.js 的 `FACE_ZOOM`（旅店的門是 260，框比較大）


def strip_v(p):
    """去掉 `?v=` 那一段 —— 那是給瀏覽器看的，不是檔名的一部分。"""
    return (p or '').split('?')[0]


def load_speakers():
    src = io.open(os.path.join(ROOT, 'script', 'speakers.js'), encoding='utf-8').read()
    src = re.sub(r'^\s*(import|export)\s.*$',
                 lambda m: m.group(0).replace('export ', '').replace('import ', '//import '),
                 src, flags=re.M)
    D = _jsrun.dump(src + chr(10) + 'print(JSON.stringify({ART:ART, S:SPEAKERS}));',
                    what='speakers.js')
    return D['ART'], D['S']


def name_table(SP):
    """art 鑰匙 → 顯示名（中文）。
       ⚠ 同一個 art 會被好幾個 speaker 共用（§6.5.6：蕾娜正名前後是兩個 id，
         `OFFICER`＝監察官／`RENNA`＝蕾娜）—— **優先取與 art 同名的那一個**，
         不然表上會印成「監察官」，而這張表是給美術看差分的，要的是人名。"""
    out = {}
    for sid, v in (SP or {}).items():
        a = v.get('art')
        if not a:
            continue
        if a not in out or sid.lower() == a.lower():
            out[a] = v.get('name') or a
    return out


def pick(d, *names):
    for n in names:
        if d.get(n) is not None:
            return d[n]
    return None


def frames(ART):
    """把 ART 攤平成 [(角色鍵, 差分鍵, 合併後的取景值)]。
       ⚠ 合併方式與遊戲端的 `frameOf` 一致：角色層打底、expr 覆寫（§6.5）。
       ⚠⚠ 頭像的橫向錨**另有一套優先序**，與 `faceStyle()` 一字不差：
          差分的 `faceFx` → 差分的 `fx` → 角色的 `faceFx` → 角色的 `fx`。
          （`fx` 是「臉」的位置，`faceFx` 是「頭與肩那一塊」的水平重心 —— 側面圖
            兩者差很多，用錯會把人切掉一半。）"""
    out = []
    for key, a in ART.items():
        base = {k: v for k, v in a.items() if k != 'expr'}
        if a.get('base'):
            f = dict(base, src=a['base'])
            f['_facefx'] = pick(a, 'faceFx', 'fx')
            f['_zoomk'] = 1.0
            out.append((key, '(base)', f))
        for en, e in (a.get('expr') or {}).items():
            f = dict(base, **e)
            f['_facefx'] = (e['faceFx'] if e.get('faceFx') is not None else
                            e['fx'] if e.get('fx') is not None else
                            pick(a, 'faceFx', 'fx'))
            f['_zoomk'] = float(e.get('faceZoomK') or 1.0)
            out.append((key, en, f))
    return out


def alpha_head(im):
    """沒有量好的取景值時的退路：由 alpha 推「人物上緣／下緣」與「頭的水平中心」。
       ⚠ 這是**估**的不是量的 —— 表上會標出來，不要拿它回頭去填 speakers.js。"""
    a = im.getchannel('A')
    W, H = im.size
    px = a.load()
    xstep = max(1, W // 220)
    ystep = max(1, H // 320)
    rows = []
    for y in range(0, H, ystep):
        xs = [x for x in range(0, W, xstep) if px[x, y] > 16]
        rows.append((y, xs[0], xs[-1]) if xs else (y, None, None))
    solid = [r for r in rows if r[1] is not None]
    if not solid:
        return 0, H, 0.5
    y0, y1 = solid[0][0], solid[-1][0]
    band = [r for r in solid if r[0] <= y0 + (y1 - y0) * 0.18]   # 頭那一段
    if not band:
        band = solid[:3]
    cx = sum((r[1] + r[2]) / 2.0 for r in band) / len(band)
    return y0, y1, cx / float(W)


def face_box(f, im, measured):
    """回 (左, 上, 右, 下) —— 與遊戲那顆頭像同一個取景（見上面 FACE_ZOOM 那段）。"""
    W, H = im.size
    if measured:
        top = float(f.get('top') or 0)
        fx = float(f['_facefx']) if f.get('_facefx') is not None else 0.5
    else:
        top, _bot, fx = alpha_head(im)
    z = FACE_ZOOM * float(f.get('_zoomk') or 1.0)
    side = W * 100.0 / z                 # 可視邊長（正方框）
    left = W * fx * (1.0 - 100.0 / z)
    return (left, top, left + side, top + side)


def thumb(path, f, measured):
    im = Image.open(path).convert('RGBA')
    box = tuple(int(round(v)) for v in face_box(f, im, measured))
    crop = im.crop(box)
    bg = Image.new('RGBA', crop.size, (255, 255, 255, 255))
    bg.alpha_composite(crop)
    out = bg.convert('RGB')
    out.thumbnail((TH, TH), Image.LANCZOS)
    return out


def scan_files():
    """SI 底下所有圖（含子資料夾，例如 NPC/）—— 回專案相對路徑。
       ⚠⚠ **底線開頭的不列**（ver -1487）：`_ornament_master2.png`、`_ref_*.png`
         那一族是**母版與參考圖**，不是立繪 —— §5 說得很明白，底線開頭的東西
         遊戲根本不會載。把它們列進差分表等於拿五張沒有臉的圖去佔五列。"""
    out = []
    for dirpath, _dirs, files in os.walk(SI_DIR):
        for fn in files:
            if fn.startswith('_'):
                continue
            if fn.lower().endswith(IMG_EXT):
                p = os.path.join(dirpath, fn)
                out.append(os.path.relpath(p, ROOT).replace(os.sep, '/'))
    return sorted(out)


def dedup_key(rel):
    """同一個「差分」的鑰匙（ver -1487，Ray：「不要列重覆的」）。

       這張表是**一個差分一列**（鐵律 7 的同一個道理：一件事一份真相）。
       實際重覆的只有兩種長相，兩種都收在這一支：
         · **同一個檔名、不同資料夾** —— `renna_newhair/Renna_SI_smile.webp`
           與 `Renna_SI_smile.webp`（髮飾換裝那條線，Ray 指示擱置中）
         · **尾碼 `_vN` 的候選版** —— `NPC_Grocer_SI_v1…v5`（同一個店主的五次迭代）
       ⚠ 只剝**結尾**的 `_v<數字>`：`Renna_SI_intense2` 是差分名的一部分，不是版本。
       ⚠ 實測 45 組重覆裡，**每一組都剛好有一張接了線** —— 所以「留哪一張」不必猜，
         留線上跑的那一張就是唯一解（見 build 的說明）。"""
    b = os.path.splitext(os.path.basename(rel))[0].lower()
    return re.sub(r'_v\d+$', '', b)


def is_npc(rel):
    """這一張算不算 NPC —— **照資料夾判**，不照角色名猜。"""
    return rel.startswith(NPC_DIR)


def char_of_filename(fn):
    """`角色_SI_變體.webp` → 角色（§5 的命名規約）。

       ⚠⚠ **`_SI_` 的比對不分大小寫**（ver -1502）：交件偶爾會是小寫的
         `cecilie_si_front.png`，而大小寫敏感的比對抓不到 ⇒ 整段檔名被當成
         「角色」⇒ **同一個人的七張圖變成七個角色**（表上就是七列各一張，
         看起來像七個只畫了一張圖的人）。
       ⚠ 不用改交件的檔名：**macOS 不分大小寫、靜態空間分**（§6.5.4 的老坑），
         這張表只是讀，寬鬆一點比要求對方改名可靠。
       ⚠ 首字母轉大寫只影響**顯示**：接了線的那些顯示名是從 `speakers.js` 查的，
         查不到才會走到這裡（`who_of_file`），而那一支本來就用小寫去查。"""
    base = os.path.basename(fn)
    m = re.match(r'^(.+?)_SI(?:_|\.)', base, re.I)
    if m:
        c = m.group(1)
        return c[:1].upper() + c[1:] if c[:1].islower() else c
    return os.path.splitext(base)[0]


def build():
    ART, SP = load_speakers()
    NAMES = name_table(SP)
    by_path = {}
    for key, en, f in frames(ART):
        by_path.setdefault(strip_v(f.get('src', '')), (key, en, f))

    def who_of_file(rel):
        """未接線的檔案：由檔名前綴猜角色，猜不到就照原樣印。
           ⚠ 先試整個前綴、再試第一段（`Nouvelle_Nun` → `nouvelle`）。"""
        raw = char_of_filename(rel)
        for cand in (raw.lower(), raw.split('_')[0].lower()):
            if cand in NAMES:
                return NAMES[cand]
        return raw

    rows, unwired, missing = [], [], []
    for rel in scan_files():
        hit = by_path.get(rel)
        if hit:
            key, en, f = hit
            measured = not f.get('unmeasured')
            who = NAMES.get(key, key)
        else:
            key, en, f = '', '', {}
            measured = False
            who = who_of_file(rel)
            unwired.append(rel)
        rows.append(dict(who=who, key=key, expr=en, rel=rel, f=f,
                         measured=measured, alts=[]))

    # ⚠⚠ 去重（ver -1487，Ray：「不要列重覆的」）——
    #   **留線上跑的那一張**（speakers.js 指到的）：它才是這個差分現在的樣子。
    #   被擠下來的沒有消失，只是不佔一列：留在那一列的「另有版本」欄，
    #   並且整批列進「待接線・缺檔」那一頁 —— 那是它們真正的身分（**待處理**），
    #   不是「另一個差分」。
    #   ⚠ 一組全部都沒接線時（日後可能發生）留**路徑最短**的那一張，其餘照樣當候選。
    groups = {}
    for r in rows:
        groups.setdefault(dedup_key(r['rel']), []).append(r)
    kept, dropped = [], []
    for _k, grp in groups.items():
        if len(grp) == 1:
            kept.append(grp[0])
            continue
        wired_in = [r for r in grp if r['key']]
        keep = wired_in[0] if wired_in else min(grp, key=lambda r: (len(r['rel']), r['rel']))
        keep['alts'] = [r['rel'] for r in grp if r is not keep]
        kept.append(keep)
        dropped += [r['rel'] for r in grp if r is not keep]
    rows = kept
    unwired = [r['rel'] for r in rows if not r['key']]
    dropped.sort()

    for p, (key, en, f) in by_path.items():
        if not p:
            continue
        if not os.path.exists(os.path.join(ROOT, p.replace('/', os.sep))):
            missing.append((key, en, p))

    rows.sort(key=lambda r: (str(r['who']), r['rel'].lower()))
    missing.sort()
    return rows, unwired, missing, dropped, ART


def report(rows, unwired, missing, dropped):
    wired = len(rows) - len(unwired)
    npc = sum(1 for r in rows if is_npc(r['rel']))
    print('差分共 %d 個（主要角色 %d・NPC %d）：已接進 speakers.js %d 個、未接線 %d 個'
          % (len(rows), len(rows) - npc, npc, wired, len(unwired)))
    if dropped:
        grp = sum(1 for r in rows if r['alts'])
        print('· 去重：%d 個差分另有 %d 張版本（同檔名不同夾／`_vN` 候選），'
              '**不佔列**，列在「待接線・缺檔」那一頁' % (grp, len(dropped)))
    est = [r for r in rows if not r['measured'] and r['key']]
    if est:
        print('⚠ 接了線但標著 unmeasured（縮圖走估的）：%d 張' % len(est))
    if unwired:
        print('⚠ 美術交了、speakers.js 還沒接（縮圖走估的）：%d 張' % len(unwired))
        for p in unwired:
            print('     ' + p)
    if missing:
        print('⚠ speakers.js 指到、但檔案不在：%d 筆' % len(missing))
        for key, en, p in missing:
            print('     %-12s %-16s %s' % (key, en, p))


def write_xlsx(rows, unwired, missing, dropped, path):
    from openpyxl import Workbook
    from openpyxl.drawing.image import Image as XLImage
    from openpyxl.styles import Font, Alignment, PatternFill
    from openpyxl.utils import get_column_letter

    # ⚠ 「另有版本」插在「已接線」後面（ver -1487）：一個差分一列，
    #   重覆的那幾張寫在這一欄 —— 資訊不掉，但不再各自佔一列。
    head = ['角色', '縮圖（抓臉）', '檔名', '差分鍵', '已接線', '另有版本', '取景',
            'fx', 'top', 'bot', '尺寸', '路徑']

    def new_sheet(wb, title, first=False):
        ws = wb.active if first else wb.create_sheet(title)
        ws.title = title
        ws.append(head)
        for c in range(1, len(head) + 1):
            cell = ws.cell(row=1, column=c)
            cell.font = Font(bold=True, color='FFFFFF')
            cell.fill = PatternFill('solid', fgColor='4A4A4A')
            cell.alignment = Alignment(horizontal='center', vertical='center')
        ws.freeze_panes = 'C2'
        for i, w in enumerate([14, 21, 34, 16, 10, 26, 7, 8, 7, 7, 12, 42], start=1):
            ws.column_dimensions[get_column_letter(i)].width = w
        return ws

    wb = Workbook()
    # ⚠⚠ 主角與 NPC 分兩張分頁（ver -1327，Ray 指定）。
    #   分法照**資料夾**（`resources/SI/NPC/` 底下的就是 NPC）—— 那是專案自己
    #   早就有的分類，客觀、不必猜「誰算 NPC」，而且**日後交件丟進哪個資料夾就自動歸哪邊**。
    #   ⚠ 用角色名去猜會踩到邊界（司祭、櫃台這種兩邊都有的），而那是素材歸檔的問題，
    #     不是這支工具該替人決定的。
    sheets = [('SI 差分', [r for r in rows if not is_npc(r['rel'])], True),
              ('NPC',     [r for r in rows if is_npc(r['rel'])],     False)]

    tmpdir = os.path.join(ROOT, '_recycle', '.si_thumbs')
    os.makedirs(tmpdir, exist_ok=True)
    keep = []
    warn_fill = PatternFill('solid', fgColor='FFF3CD')
    seq = [0]

    for title, subset, first in sheets:
        ws = new_sheet(wb, title, first)
        _fill(ws, subset, tmpdir, keep, warn_fill, seq, XLImage, Alignment, head)

    # 被擠下來的那幾張 → 它現在讓位給誰（待辦頁要印得出來）
    keeper = {a: r['rel'] for r in rows for a in (r.get('alts') or [])}
    _todo_sheet(wb, unwired, missing, dropped, keeper, Font, PatternFill,
                get_column_letter)
    wb.save(path)
    for tp in keep:
        try:
            os.remove(tp)
        except OSError:
            pass
    try:
        os.rmdir(tmpdir)
    except OSError:
        pass
    return {t: len(s) for t, s, _f in sheets}


def alt_text(row):
    """「另有版本」欄：同一個差分還有哪幾張（ver -1487）。
       ⚠ 印**看得出差別的那一段**：換了資料夾就印資料夾（`renna_newhair/`），
         同一夾就印檔名（`NPC_Grocer_SI_v2.webp`）—— 印全路徑會把欄位撐爆，
         印張數又看不出是哪一批。"""
    alts = row.get('alts') or []
    if not alts:
        return None
    here = os.path.dirname(row['rel'])
    seen, out = set(), []
    for a in alts:
        tag = (os.path.dirname(a).split('/')[-1] + '/') if os.path.dirname(a) != here \
              else os.path.basename(a)
        if tag not in seen:
            seen.add(tag)
            out.append(tag)
    return '%d 張：%s' % (len(alts), '、'.join(out[:3]) + ('…' if len(out) > 3 else ''))


def _fill(ws, rows, tmpdir, keep, warn_fill, seq, XLImage, Alignment, head):
    r = 2
    for row in rows:
        p = os.path.join(ROOT, row['rel'].replace('/', os.sep))
        try:
            with Image.open(p) as probe:
                size = '%d×%d' % probe.size
        except Exception:
            size = '讀不到'
        f = row['f']
        ws.cell(row=r, column=1, value=row['who'])
        ws.cell(row=r, column=3, value=os.path.basename(row['rel']))
        ws.cell(row=r, column=4, value=row['expr'] or '—')
        ws.cell(row=r, column=5, value='✔' if row['key'] else '✘ 未接線')
        ws.cell(row=r, column=6, value=alt_text(row))
        ws.cell(row=r, column=7, value='量' if row['measured'] else '估')
        if row['measured']:
            ws.cell(row=r, column=8, value=f.get('fx'))
            ws.cell(row=r, column=9, value=f.get('top'))
            ws.cell(row=r, column=10, value=f.get('bot'))
        ws.cell(row=r, column=11, value=size)
        ws.cell(row=r, column=12, value=row['rel'])
        for c in (1, 4, 5, 7, 8, 9, 10, 11):
            ws.cell(row=r, column=c).alignment = Alignment(horizontal='center',
                                                           vertical='center')
        for c in (3, 6, 12):
            ws.cell(row=r, column=c).alignment = Alignment(vertical='center')
        if not row['key']:
            for c in range(1, len(head) + 1):
                ws.cell(row=r, column=c).fill = warn_fill

        try:
            t = thumb(p, f, row['measured'])
            # ⚠ 縮圖存 JPEG 不存 PNG：這張表**每次交件都會重生**，而 246 張 PNG 縮圖
            #   會把檔案撐到 7.5 MB（進版控的話每改一次就多一份）。JPEG 品質 88
            #   在這個尺寸看不出差別，檔案小一個量級。透明已經在 thumb() 併白底了。
            # ⚠ 檔名要**跨分頁唯一**（seq）：兩張分頁各自從第 2 列開始，
            #   用列號當檔名會讓後一張蓋掉前一張的縮圖檔。
            seq[0] += 1
            tp = os.path.join(tmpdir, '%05d.jpg' % seq[0])
            t.save(tp, 'JPEG', quality=88, optimize=True)
            keep.append(tp)
            ws.add_image(XLImage(tp), 'B%d' % r)
            ws.row_dimensions[r].height = (t.size[1] + 8) * 0.75
        except Exception as e:
            ws.cell(row=r, column=2, value='縮圖失敗：%s' % e)
        r += 1


def _todo_sheet(wb, unwired, missing, dropped, keeper, Font, PatternFill,
                get_column_letter):
    """這一次交件之後要做的事 —— 表的價值一半在這一頁。"""
    ws2 = wb.create_sheet('待接線・缺檔')
    ws2.append(['類別', '角色／鍵', '檔案', '要做什麼'])
    for c in range(1, 5):
        ws2.cell(row=1, column=c).font = Font(bold=True, color='FFFFFF')
        ws2.cell(row=1, column=c).fill = PatternFill('solid', fgColor='4A4A4A')
    for i, w in enumerate([18, 22, 46, 54], start=1):
        ws2.column_dimensions[get_column_letter(i)].width = w
    for p in unwired:
        ws2.append(['美術交了沒接線', char_of_filename(p), os.path.basename(p),
                    '在 script/speakers.js 的 ART 補一筆 expr，並量 fx／top／bot（§6.5）'])
    for key, en, p in missing:
        ws2.append(['指到但檔案不在', '%s / %s' % (key, en), p,
                    '路徑打錯，或美術還沒交 —— 演到那一句會回退基本立繪'])
    # ⚠ 這一類**不是**「另一個差分」，是同一個差分的另一張圖（ver -1487）：
    #   所以它不佔差分頁的列，而是站在這裡等人決定要不要換上去。
    for p in dropped:
        ws2.append(['同差分的另一個版本', char_of_filename(p), p,
                    '線上跑的是 %s —— 要換上去就改 speakers.js 的 src，'
                    '並**重量** fx／top／bot（§5：換圖一定要重量取景）'
                    % os.path.basename(keeper.get(p, ''))])
    if not unwired and not missing and not dropped:
        ws2.append(['—', '—', '—', '目前沒有待辦'])
    ws2.freeze_panes = 'A2'


def main():
    rows, unwired, missing, dropped, _ART = build()
    report(rows, unwired, missing, dropped)
    if '--check' in sys.argv:
        return
    out = OUT
    for a in sys.argv[1:]:
        if not a.startswith('--'):
            out = a
    n = write_xlsx(rows, unwired, missing, dropped, out)
    print('→ %s' % out)
    for t, c in n.items():
        print('   分頁「%s」%d 列' % (t, c))


if __name__ == '__main__':
    main()
