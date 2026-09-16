#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/bg_index.py —— 背景「檔名 → 區域資料夾」索引（ver -1376）

    py tools/bg_index.py            # 掃 resources/background/ 出 script/bg_index.js
    py tools/bg_index.py --check    # 只印統計與異常，不寫檔
    py tools/bg_index.py --move     # 依 PREFIX 把根目錄的圖 git mv 進各區資料夾

⚠⚠⚠ **為什麼要索引，不靠前綴推**（Ray, ver -1376 選的那一案）：
  資料上寫的 `bg` 是**基底名**（`bg:'Capital_Square'`），裡面沒有資料夾資訊。
  靠前綴推的話，前綴怪的那十幾張（`Captal_Guild_*` 打錯字的帝都、`LunariaOffice`、
  `_canyon_map`…）都要寫特例，而**日後新檔前綴打錯就是靜靜的空背景**
  —— 那正是 §6.5.4 的 ver -910 一次踩到六格的失敗模式（畫面上沒有任何錯誤訊息）。
  掃出來的索引是**事實**不是規則：檔案在哪，它就說在哪。

⚠⚠⚠ **查不到一律退回根目錄**（＝搬之前的現況）。所以：
  · 美術把新檔丟進根目錄 → 照樣跑得動（只是沒歸檔）
  · 忘了重跑這支工具 → 下場是「照舊」，**不是「壞掉」**
  這是鐵律 13 那句「名單一律寫成安全的那一側是預設」的同一件事。

⚠ 這支只讀 `resources/background/`，只寫 `script/bg_index.js`（`--move` 例外，見下）。
"""
import io, os, re, sys, subprocess
import _utf8  # noqa: F401  # 主控台 UTF-8（中文 Windows 的 cp950）

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG   = os.path.join(ROOT, 'resources', 'background')
OUT  = os.path.join(ROOT, 'script', 'bg_index.js')
EXT  = ('.webp', '.png', '.jpg', '.jpeg')

# ⚠ 區域劃分：**前綴 → 資料夾**。只有 `--move` 用它（決定新檔搬去哪）；
#   遊戲執行期讀的是掃出來的索引，不是這張表 —— 所以這裡漏一筆只是「那張圖留在根目錄」。
#   ⚠ 比對時**忽略大小寫**，由長到短比（`Ruins_` 要贏過 `ruins_shinier_entrance` 的 `ruins`）。
PREFIX = [
    ('Capital_',   'capital'),    ('Captal_',    'capital'),    # ⚠ Captal 是交件時打錯的帝都，照樣歸帝都
    ('Northport_', 'northport'),  ('East_',      'eastport'),
    ('Belisar_',   'belisar'),    ('Shinier_',   'shinier'),
    ('Ravn_',      'ravnsdal'),   ('Sofia_',     'sofia'),
    ('Ruins_',     'ruins'),      ('ruins_',     'ruins'),
    ('Tomb_',      'tomb'),       ('Forest_',    'forest'),
    ('Fallen_',    'fallen'),     ('Canyon_',    'canyon'),      ('_canyon_', 'canyon'),
    ('Plains_',    'plains'),     ('Deck_',      'deck'),        ('deck_',    'deck'),
    ('HolyseeDungeon', 'holysee'),('LunariaOffice', 'holysee'),
]
# ⚠⚠ **留在根目錄的**：它們不是「某個區域的背景」，是 UI 素材，而且**路徑是寫死的**
#   （`config.js` 的 `home_emblem`／`bg_sentou`、`index.html` 的 apple-touch-icon、
#    還有八支檔在指 `Kerberos.png`）。搬它們＝要同時改那幾處寫死的字串，
#   而它們本來就不屬於任何區域 —— 不搬。
KEEP_ROOT = {'tivot_emblem', 'sentouinstall', 'kerberos'}

def stem(fn):
    b = os.path.basename(fn)
    for e in EXT:
        if b.lower().endswith(e): return b[:-len(e)]
    return b

def scan():
    """→ {小寫基底名: 子資料夾}（根目錄的不進索引 —— 查不到就是根目錄）"""
    idx, dup = {}, []
    for d in sorted(os.listdir(BG)):
        p = os.path.join(BG, d)
        if not os.path.isdir(p): continue
        for fn in sorted(os.listdir(p)):
            if not fn.lower().endswith(EXT): continue
            k = stem(fn).lower()
            if k in idx and idx[k] != d: dup.append((k, idx[k], d))
            idx[k] = d
    return idx, dup

def root_imgs():
    return [fn for fn in sorted(os.listdir(BG))
            if fn.lower().endswith(EXT) and os.path.isfile(os.path.join(BG, fn))]

def folder_for(fn):
    for pre, dst in sorted(PREFIX, key=lambda x: -len(x[0])):
        if fn.lower().startswith(pre.lower()): return dst
    return None

def do_move():
    moved, left = {}, []
    for fn in root_imgs():
        if stem(fn).lower() in KEEP_ROOT: left.append((fn, 'UI 素材，路徑寫死')); continue
        dst = folder_for(fn)
        if not dst: left.append((fn, '前綴對不到 PREFIX')); continue
        os.makedirs(os.path.join(BG, dst), exist_ok=True)
        src = os.path.join('resources', 'background', fn)
        tgt = os.path.join('resources', 'background', dst, fn)
        r = subprocess.run(['git', 'mv', src, tgt], cwd=ROOT,
                           capture_output=True, text=True)
        if r.returncode:   # 沒進版控的檔 git mv 會拒絕 → 退回一般搬移
            os.replace(os.path.join(ROOT, src), os.path.join(ROOT, tgt))
        moved.setdefault(dst, []).append(fn)
    for d in sorted(moved): print(f'  {d+"/":14s} {len(moved[d]):3d} 張')
    print(f'搬了 {sum(len(v) for v in moved.values())} 張；留在根目錄 {len(left)} 張')
    for fn, why in left: print(f'    留：{fn}（{why}）')

def write_js(idx):
    by = {}
    for k, d in idx.items(): by.setdefault(d, []).append(k)
    lines = [
        '/* script/bg_index.js —— **自動產生，不要手改**（`py tools/bg_index.py`）',
        ' *',
        ' * 背景「檔名 → 區域資料夾」的索引。資料上寫的 `bg` 是基底名（沒有資料夾），',
        ' * 由 `modules/story.js` 的 `imgSrc()` 查這一張表補上區域（鐵律 7：組 URL 只有那一支）。',
        ' *',
        ' * ⚠⚠⚠ **查不到一律退回根目錄**（＝ ver -1376 搬檔之前的現況）：',
        ' *   美術把新檔丟進 `resources/background/` 根目錄照樣跑得動，只是沒歸檔；',
        ' *   忘了重跑工具的下場是「照舊」，不是「空背景」。',
        ' * ⚠ 鑰匙是**小寫、去副檔名**的基底名（`bandNames` 會試大小寫變體，所以要忽略大小寫）。',
        ' * ⚠ 交了新背景之後重跑一次：`py tools/bg_index.py`（同 `tools/bust.py` 的位置）。',
        ' */',
        'const G = {',
    ]
    for d in sorted(by):
        names = ','.join("'" + n + "'" for n in sorted(by[d]))
        lines.append(f"  {d}: [{names}],")
    lines += [
        '};',
        '/* 展開成 名字→資料夾（省掉重複的資料夾字串，整份小一半）。 */',
        'export const BG_INDEX = (()=>{ const m = Object.create(null);',
        '  for(const dir in G) for(const n of G[dir]) m[n] = dir;',
        '  return m; })();',
        '/* `name` 可以帶副檔名、帶時段尾巴 —— 進來先去副檔名再轉小寫。',
        '   查不到回 `\'\'`（＝根目錄），呼叫端直接接在 BG_DIR 後面。 */',
        'export function bgFolder(name){',
        "  const k = String(name||'').replace(/\.(webp|png|jpe?g)$/i, '').toLowerCase();",
        "  const d = BG_INDEX[k];",
        "  return d ? d + '/' : '';",
        '}',
        '',
    ]
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))

if __name__ == '__main__':
    if '--move' in sys.argv: do_move()
    idx, dup = scan()
    n_root = len(root_imgs())
    print(f'索引 {len(idx)} 張（{len(set(idx.values()))} 個區域資料夾）；根目錄還有 {n_root} 張')
    for k, a, b in dup: print(f'  ⚠ 同名出現在兩個資料夾：{k}（{a} / {b}）')
    if '--check' not in sys.argv:
        write_js(idx); print('→', OUT)
