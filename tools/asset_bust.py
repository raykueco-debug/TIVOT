#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/asset_bust.py —— 素材的快取破除（ver -1918，由 tools/bust.py 呼叫，不單獨跑）

  為什麼要它（Ray：「全面檢查所有資源有沒有 renna_intro 的問題，應該有不少」）：
    §5 的規矩是「同名覆蓋的圖一定要加／改 `?v=N`」—— 那是一條**要人記得**的規矩，
    而 ver -1917 實測：同名覆蓋過的素材有八百多支，大半沒有跟著跳版本號
    （插圖那一條路甚至從來沒有掛 `ASSET_VER`）。症狀永遠只是「圖沒換」，查不到原因。
    ⇒ 規矩改成**會執行的東西**（鐵律 7 的但書）：版本號＝**檔案內容的雜湊**，由這支算、
      由這支蓋回去，沒有人需要記得。

  範圍（只動「同名覆蓋過」的那一批 —— 新檔第一次就是新網址，不必破）：
    · 「覆蓋過」＝ git 歷史裡有過 M（內容修改），或工作區現在跟 HEAD 不同。
    · 服務得到的素材：resources/ 與 flight/ 底下、路徑裡沒有 `_` 開頭的資料夾。
  三條路：
    ① **字面路徑**：程式／HTML／CSS 裡寫著 `'…/x.webp'`（可帶舊的 `?v=`）的地方 ⇒ 換成 `?v=<雜湊>`。
       只寫檔名的（`'se_steps.m4a'`，SE_FILES 那種）用檔名對；同名不只一支就不碰、報出來。
    ② **組出來的名字**（背景的時段候選鏈、插圖）：呼叫端手上沒有字串 ⇒ 寫進 config.js
       `ASSET_VER` 裡的自動區塊（鑰匙＝檔名去副檔名轉小寫，`assetVer()` 本來就這樣查）。
    ③ **飛行城的整批**（flight/city/）：一個 `CITY_V` 管整批 ⇒ 換成整批內容的雜湊。
  ⚠ 門的素材（kerberos_*）不在這裡：它們跟著 VERSION 走（bust.py 的 ②③）。
"""
import os, re, hashlib, subprocess

MEDIA = ('.webp', '.png', '.jpg', '.jpeg', '.m4a', '.mp3', '.wav', '.ogg')
CODE = ['config.js', 'main.js', 'index.html', 'style.css']
CODE_GLOBS = [('script', '.js'), ('modules', '.js'), ('css', '.css'), ('flight', '.js'), ('flight', '.html')]
LIT = re.compile(r"""(?P<q>['"(])(?P<p>[^'"()\s<>+]*?\.(?:webp|png|jpe?g|m4a|mp3|wav|ogg))(?P<v>\?v=[\w.]+)?(?=['")])""", re.I)
AV_START = '  /* ══ BUST:ASSETVER START —— 由 tools/asset_bust.py 產生（同名覆蓋過的背景／插圖，值＝內容雜湊），不要手改 ══ */'
AV_END   = '  /* ══ BUST:ASSETVER END ══ */'


def _git(root, *args):
    try:
        return subprocess.run(['git'] + list(args), cwd=root, capture_output=True,
                              text=True, encoding='utf-8').stdout or ''
    except Exception:
        return ''


def _served(root):
    out = []
    for top in ('resources', 'flight'):
        for d, dirs, files in os.walk(os.path.join(root, top)):
            dirs[:] = [x for x in dirs if not x.startswith('_') and x.lower() != 'reference']
            for f in files:
                if f.lower().endswith(MEDIA):
                    out.append(os.path.relpath(os.path.join(d, f), root).replace(os.sep, '/'))
    return out


def _overwritten(root):
    s = set()
    log = _git(root, 'log', '--format=', '--name-status', '--diff-filter=M', '--', 'resources', 'flight')
    for ln in log.splitlines():
        parts = ln.split('\t')
        if len(parts) >= 2 and parts[0].startswith('M'): s.add(parts[-1].strip('"').lower())
    for ln in _git(root, 'diff', '--name-only', 'HEAD', '--', 'resources', 'flight').splitlines():
        s.add(ln.strip().strip('"').lower())
    return s


def _h(path, n=8):
    with open(path, 'rb') as f: return hashlib.md5(f.read()).hexdigest()[:n]


def manifest(root):
    """{小寫相對路徑: 雜湊}（只收同名覆蓋過的），外加 city 整批的雜湊。"""
    ow = _overwritten(root)
    man, city = {}, []
    for rel in _served(root):
        low = rel.lower()
        if low.startswith('flight/city/'):
            city.append((low, _h(os.path.join(root, rel)))); continue
        if '/kerberos_' in low: continue
        if low in ow: man[low] = _h(os.path.join(root, rel))
    cityv = hashlib.md5(''.join(a + b for a, b in sorted(city)).encode()).hexdigest()[:8] if city else None
    return man, cityv


def _code_files(root):
    out = [c for c in CODE if os.path.exists(os.path.join(root, c))]
    for d, ext in CODE_GLOBS:
        p = os.path.join(root, d)
        if os.path.isdir(p):
            out += sorted(d + '/' + f for f in os.listdir(p) if f.endswith(ext) and not f.startswith('_'))
    return out


def rewrite(root, man, cityv, base=None):
    """回傳 [(相對路徑, 新內容, 改了幾處)]（只列有變的），以及對不上的清單。
       `base`＝{相對路徑: 已經在記憶體裡改過的內容}（bust.py 前幾步改過的那幾支以它為底）。"""
    base = base or {}
    by_base = {}
    for k in man: by_base.setdefault(k.rsplit('/', 1)[-1], []).append(k)
    changed, ambiguous = [], set()
    for rel in _code_files(root):
        path = os.path.join(root, rel)
        s0 = base[rel] if rel in base else open(path, encoding='utf-8').read()
        disk = open(path, encoding='utf-8').read()
        base_dir = os.path.dirname(rel)
        n = [0]
        def sub(m):
            p = m.group('p'); key = None
            if '/' in p:
                for cand in (os.path.normpath(p), os.path.normpath(os.path.join(base_dir, p))):
                    c = cand.replace(os.sep, '/').lower()
                    if c in man: key = c; break
            else:
                hits = by_base.get(p.lower(), [])
                if len(hits) == 1: key = hits[0]
                elif len(hits) > 1:
                    # 同名不只一支：看同一行有沒有 `dir:'…'`（飛行怪的 sprite 那種寫法）
                    ls = s0.rfind('\n', 0, m.start()) + 1; le = s0.find('\n', m.end())
                    dm = re.search(r"dir\s*:\s*'([^']+)'", s0[ls:le if le >= 0 else None])
                    if dm:
                        c = os.path.normpath(os.path.join(base_dir, dm.group(1), p)).replace(os.sep, '/').lower()
                        if c in man: key = c
                    if not key: ambiguous.add(p)
            if not key: return m.group(0)
            new = m.group('q') + p + '?v=' + man[key]
            if new != m.group(0): n[0] += 1
            return new
        s = LIT.sub(sub, s0)
        if rel == 'flight/index.html':
            if cityv:
                s2 = re.sub(r"const CITY_V='\?v=[^']*';", "const CITY_V='?v=%s';" % cityv, s)
                if s2 != s: n[0] += 1; s = s2
            s2 = _flight_table(s, man)
            if s2 != s: n[0] += 1; s = s2
        if rel == 'config.js':
            s2 = _asset_ver_block(s, man)
            if s2 != s: n[0] += 1; s = s2
        if s != disk: changed.append((rel, s, n[0]))
    return changed, sorted(ambiguous)


def _asset_ver_block(s, man):
    # 收 resources/ 底下全部（背景／插圖的名字是組出來的；ci／立繪也有幾條路是組出來的）。
    # 同一個檔名鑰匙對到兩支不同內容 ⇒ 取不到唯一值 ⇒ 不收（那幾支靠字面路徑那一條）。
    rows, bad = {}, set()
    for k, h in man.items():
        if not k.startswith('resources/'): continue
        stem = k.rsplit('/', 1)[-1].rsplit('.', 1)[0]
        if stem in rows and rows[stem] != h: bad.add(stem)
        rows[stem] = h
    for b_ in bad: rows.pop(b_, None)
    block = AV_START + '\n' + ''.join("  '%s': '%s',\n" % (k, rows[k]) for k in sorted(rows)) + AV_END + '\n'
    if AV_START in s:
        return re.sub(re.escape(AV_START) + r'.*?' + re.escape(AV_END) + r'\n', lambda m: block, s, flags=re.S)
    m = re.search(r"export const ASSET_VER = \{\n", s)
    if not m: return s
    # 插在物件的收尾 `};` 之前（自動區塊排在手寫那幾列之後 ⇒ 同鑰匙時以雜湊為準）
    end = s.find('\n};', m.end())
    if end < 0: return s
    return s[:end + 1] + block + s[end + 1:]


FT_START = '/* BUST:FLIGHTAV START —— 由 tools/asset_bust.py 產生，不要手改 */'
FT_END   = '/* BUST:FLIGHTAV END */'
def _flight_table(s, man):
    """飛行頁裡**組出來**的路徑（貼材 `geo/`+name、羽蛇插圖、怪的 sprite）用的版本表：
       鑰匙＝相對 flight/ 的路徑（小寫），`fav(p)` 查表掛 `?v=`。"""
    rows = {}
    for k, h in man.items():
        if k.startswith('flight/'): rows[k[len('flight/'):]] = h
        elif k.startswith('resources/enemy/'): rows['../' + k] = h   # 羽蛇插圖那一類（飛行頁只會組到這一層）
    line = FT_START + ' const FLIGHT_AV={' + ','.join("'%s':'%s'" % (k, rows[k]) for k in sorted(rows)) + '}; ' + FT_END
    if FT_START in s:
        return re.sub(re.escape(FT_START) + r'.*?' + re.escape(FT_END), lambda m: line, s, flags=re.S)
    return s
