#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/si_xlsx.py —— SI 立繪差分總表（ver -1327）

    py tools/si_xlsx.py                  # 出表到 resources/SI/_SI_差分總表.xlsx
    py tools/si_xlsx.py --check          # 只印統計與待辦清單，不出表

做什麼：把 `resources/SI/` 底下**每一張**立繪列成一列 —— 分角色、帶檔名、**帶一張
抓臉的縮圖**（縮圖以「看得出表情」為準，不是看得出全身）。
**美術每次交檔重跑一次就更新**，不必手動維護。

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
# ⚠ 放專案根目錄、命名對齊既有的兩張表（`enemies.xlsx`／`girlstars.xlsx`，
#   工具也是 `enemies_xlsx.py`／`girlstars_xlsx.py`）—— 找表的人只要看根目錄。
OUT = os.path.join(ROOT, 'si.xlsx')
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
    """SI 底下所有圖（含子資料夾，例如 NPC/）—— 回專案相對路徑。"""
    out = []
    for dirpath, _dirs, files in os.walk(SI_DIR):
        for fn in files:
            if fn.lower().endswith(IMG_EXT):
                p = os.path.join(dirpath, fn)
                out.append(os.path.relpath(p, ROOT).replace(os.sep, '/'))
    return sorted(out)


def char_of_filename(fn):
    """`角色_SI_變體.webp` → 角色（§5 的命名規約）。"""
    base = os.path.basename(fn)
    m = re.match(r'^(.+?)_SI(?:_|\.)', base)
    if m:
        return m.group(1)
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
        rows.append(dict(who=who, key=key, expr=en, rel=rel, f=f, measured=measured))

    for p, (key, en, f) in by_path.items():
        if not p:
            continue
        if not os.path.exists(os.path.join(ROOT, p.replace('/', os.sep))):
            missing.append((key, en, p))

    rows.sort(key=lambda r: (str(r['who']), r['rel'].lower()))
    missing.sort()
    return rows, unwired, missing, ART


def report(rows, unwired, missing):
    wired = len(rows) - len(unwired)
    print('SI 圖共 %d 張：已接進 speakers.js %d 張、未接線 %d 張'
          % (len(rows), wired, len(unwired)))
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


def write_xlsx(rows, unwired, missing, path):
    from openpyxl import Workbook
    from openpyxl.drawing.image import Image as XLImage
    from openpyxl.styles import Font, Alignment, PatternFill
    from openpyxl.utils import get_column_letter

    wb = Workbook()
    ws = wb.active
    ws.title = 'SI 差分'
    head = ['角色', '縮圖（抓臉）', '檔名', '差分鍵', '已接線', '取景',
            'fx', 'top', 'bot', '尺寸', '路徑']
    ws.append(head)
    for c in range(1, len(head) + 1):
        cell = ws.cell(row=1, column=c)
        cell.font = Font(bold=True, color='FFFFFF')
        cell.fill = PatternFill('solid', fgColor='4A4A4A')
        cell.alignment = Alignment(horizontal='center', vertical='center')
    ws.freeze_panes = 'C2'

    for i, w in enumerate([14, 21, 34, 16, 10, 7, 8, 7, 7, 12, 42], start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    tmpdir = os.path.join(ROOT, '_recycle', '.si_thumbs')
    os.makedirs(tmpdir, exist_ok=True)
    keep = []
    warn_fill = PatternFill('solid', fgColor='FFF3CD')

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
        ws.cell(row=r, column=6, value='量' if row['measured'] else '估')
        if row['measured']:
            ws.cell(row=r, column=7, value=f.get('fx'))
            ws.cell(row=r, column=8, value=f.get('top'))
            ws.cell(row=r, column=9, value=f.get('bot'))
        ws.cell(row=r, column=10, value=size)
        ws.cell(row=r, column=11, value=row['rel'])
        for c in (1, 4, 5, 6, 7, 8, 9, 10):
            ws.cell(row=r, column=c).alignment = Alignment(horizontal='center',
                                                           vertical='center')
        ws.cell(row=r, column=3).alignment = Alignment(vertical='center')
        ws.cell(row=r, column=11).alignment = Alignment(vertical='center')
        if not row['key']:
            for c in range(1, len(head) + 1):
                ws.cell(row=r, column=c).fill = warn_fill

        try:
            t = thumb(p, f, row['measured'])
            # ⚠ 縮圖存 JPEG 不存 PNG：這張表**每次交件都會重生**，而 246 張 PNG 縮圖
            #   會把檔案撐到 7.5 MB（進版控的話每改一次就多一份）。JPEG 品質 88
            #   在這個尺寸看不出差別，檔案小一個量級。透明已經在 thumb() 併白底了。
            tp = os.path.join(tmpdir, '%04d.jpg' % r)
            t.save(tp, 'JPEG', quality=88, optimize=True)
            keep.append(tp)
            ws.add_image(XLImage(tp), 'B%d' % r)
            ws.row_dimensions[r].height = (t.size[1] + 8) * 0.75
        except Exception as e:
            ws.cell(row=r, column=2, value='縮圖失敗：%s' % e)
        r += 1

    # ── 第二張表：這一次交件之後要做的事 ──────────────────────────────────
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
    if not unwired and not missing:
        ws2.append(['—', '—', '—', '目前沒有待辦'])
    ws2.freeze_panes = 'A2'

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


def main():
    rows, unwired, missing, _ART = build()
    report(rows, unwired, missing)
    if '--check' in sys.argv:
        return
    out = OUT
    for a in sys.argv[1:]:
        if not a.startswith('--'):
            out = a
    write_xlsx(rows, unwired, missing, out)
    print('→ %s（%d 列）' % (out, len(rows)))


if __name__ == '__main__':
    main()
