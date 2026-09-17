#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/bust.py —— 快取破除（cache-buster）的**唯一**產生器（ver -1131）

  為什麼要它：`index.html` 以前只有 `style.css?v=` 帶版本號，**所有 JS 模組都沒有**。
  模組的網址一版不變，瀏覽器（尤其 iOS「加到主畫面」那個 webview）就會抱著舊的那一份
  不放 —— 症狀是「我明明改好了，他手機上還是舊行為」，而且**沒有任何錯誤訊息**。

  作法：`<script type="importmap">` 把每一支本機模組對應到「同一支 ＋ ?v=<版號>」。
    · 鍵與值都是**文件相對路徑**，瀏覽器解析後比對 —— 所以 `modules/town.js` 裡寫的
      `./story.js` 也會吃到（它解析出來的絕對網址與 map 的鍵相同）。
    · 不支援 importmap 的舊瀏覽器：整張 map 被忽略 ＝ 退回今天的行為（能跑，只是會快取）。
  版號的唯一真相是 `config.js` 的 `VERSION`；這支工具把它同步到 index.html／flight。

  用法：改完程式、`VERSION` 也改好之後跑一次
      python3 tools/bust.py          # 寫回去
      python3 tools/bust.py --check  # 只檢查同不同步（CI／lint 用，回傳碼 1＝不同步）
"""
import os, re, sys, glob, subprocess
import _utf8  # noqa: F401  # 主控台 UTF-8（中文 Windows 的 cp950），見 tools/_utf8.py

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
START = '<!-- BUST:START （由 tools/bust.py 產生，不要手改） -->'
END   = '<!-- BUST:END -->'

def ver():
    s = open(os.path.join(ROOT, 'config.js'), encoding='utf-8').read()
    m = re.search(r"export const VERSION = 'ver ([^']+)'", s)
    if not m: sys.exit('config.js 裡找不到 VERSION')
    return m.group(1).split('-')[-1]          # 2026.09.12-1131 → 1131

def modules():
    """所有會被 index.html 的模組圖抓到的本機 .js（flight/ 與 tools/ 不算：
       飛行頁是另一個 document、非模組，自己另外帶版本號）。"""
    out = []
    for pat in ('*.js', 'modules/*.js', 'script/*.js', 'i18n/*.js'):
        out += [p.replace(os.sep, '/') for p in
                sorted(glob.glob(os.path.join(ROOT, pat)))]
    return [os.path.relpath(p, ROOT).replace(os.sep, '/') for p in out]

def importmap(v):
    rows = ',\n'.join('    "./%s": "./%s?v=%s"' % (m, m, v) for m in modules())
    return (START + '\n<script type="importmap">\n{\n  "imports": {\n'
            + rows + '\n  }\n}\n</script>\n' + END)

def patch(path, subs, v):
    p = os.path.join(ROOT, path)
    s0 = s = open(p, encoding='utf-8').read()
    for pat, rep in subs:
        s = re.sub(pat, (rep if callable(rep) else rep.replace('<V>', v)), s, flags=re.S)
    return p, s0, s

def run(check=False):
    v = ver(); dirty = []

    # ① index.html：importmap ＋ 兩個 css 的 ?v=
    p, s0, s = patch('index.html', [
        (re.escape(START) + r'.*?' + re.escape(END), lambda m: importmap(v)),
        (r'href="style\.css(\?v=[^"]*)?"',           'href="style.css?v=<V>"'),
        (r'href="css/lootsheet\.css(\?v=[^"]*)?"',   'href="css/lootsheet.css?v=<V>"'),
        # ⚠ 入口那兩支是 <script src>，**吃不到 importmap**（那張表只管模組裡面的
        #   import 指定字串）—— 所以 src 自己要帶版本號。
        (r'src="(main|orientation)\.js(\?v=[^"]*)?"', r'src="\1.js?v=<V>"'),
    ], v)
    if s != s0: dirty.append(('index.html', p, s))

    # ② flight/index.html：它是**非模組**的獨立頁面，三支 <script src> 自己帶版本號
    #   ⚠ 順便同步它 HUD 上的版本字串（ver -1164）：那一行以前是手寫的，
    #     從 -911 起就沒有人記得動 —— 而它是 Ray 在手機上唯一看得到「跑的是哪一版」
    #     的地方（鐵律 7）。
    p, s0, s = patch('flight/index.html', [
        (r'src="(\.\./orientation|settlement|talks)\.js(\?v=[^"]*)?"',
         r'src="\1.js?v=<V>"'),
        (r"const FLIGHT_VER = 'ver [^']*';", "const FLIGHT_VER = 'ver -<V>';"),
        # ⚠ 門的素材是會被同名覆蓋的（-1215 削過 alpha 底噪），所以圖也要帶版本號。
        #   §5：檔名沒變、內容變了，瀏覽器照樣拿舊的那一份，而症狀只是「看起來沒變」。
        (r'(\.\./resources/vfx/kerberos_[a-z]+\.webp)(\?v=[0-9.]*)?', r'\1?v=<V>'),
    ], v)
    if s != s0: dirty.append(('flight/index.html', p, s))

    # ③ modules/story.js：門的素材路徑由 kerbUrl() 一支組，版本號就一個常數
    p, s0, s = patch('modules/story.js', [
        (r"const KERB_V='\?v=[^']*';", "const KERB_V='?v=<V>';"),
    ], v)
    if s != s0: dirty.append(('modules/story.js', p, s))

    if check:
        if dirty:
            print('⚠ 快取版本號沒有同步（跑 python3 tools/bust.py）：',
                  '、'.join(d[0] for d in dirty))
            return 1
        print('快取版本號同步中 ✔  v=' + v); return 0
    for name, path, s in dirty:
        open(path, 'w', encoding='utf-8').write(s); print('已更新', name)
    if not dirty: print('本來就是最新的')
    print('v=' + v + '　模組 ' + str(len(modules())) + ' 支')
    return 0


# ══⚠⚠⚠ **版本號沒動 ＝ 這一版根本送不到玩家手上**（ver -1461）══════════════
#   憲法 §6（ver -626）：「版本號不動就等於沒有版本號」。這一支把那句話變成**會擋**。
#
#   實際踩到（-1458～-1460 三個 commit）：我用 `sed s/<舊版號>/<新版號>/ config.js`
#   手動 bump，而**號碼猜錯時 sed 靜靜地什麼都沒做** —— 於是 `VERSION` 卡在 1457，
#   `bust.py` 照樣把 `?v=1457` 蓋上去，模組網址與**真正的 1457 那一版一模一樣**
#   ⇒ 玩家的瀏覽器直接拿快取，**後面三版的修改一個字都沒送出去**，
#   而 HUD 上還是顯示 1457，看不出哪裡不對（Ray：「還是播三次」）。
#
#   ⇒ 規矩：**tracked 的程式碼有改動，`VERSION` 就必須與 HEAD 不同**，否則報錯。
#   ⇒ 而且提供 `--bump`：由工具自己把尾碼 +1，**沒有人需要再打舊號碼**。
CODE_EXT = ('.js', '.html', '.css', '.json')
def _head_ver():
    try:
        out = subprocess.run(['git','show','HEAD:config.js'], cwd=ROOT,
                             capture_output=True, text=True, encoding='utf-8')
        m = re.search(r"export const VERSION = 'ver ([^']+)'", out.stdout or '')
        return m.group(1).split('-')[-1] if m else None
    except Exception:
        return None
def _dirty_code():
    try:
        out = subprocess.run(['git','status','--porcelain'], cwd=ROOT,
                             capture_output=True, text=True, encoding='utf-8').stdout or ''
    except Exception:
        return []
    names = []
    for ln in out.splitlines():
        if ln[:2] == '??': continue                   # 未追蹤的不算
        f = ln[3:].split(' -> ')[-1].strip().strip('"')
        if f.endswith(CODE_EXT) and not f.startswith('tools/'): names.append(f)
    return names
def bump():
    """把 config.js 的尾碼 +1（工具自己讀現值，不必有人打舊號碼）。"""
    path = os.path.join(ROOT, 'config.js')
    s = open(path, encoding='utf-8').read()
    m = re.search(r"(export const VERSION = 'ver )([^']+)(')", s)
    if not m: sys.exit('config.js 裡找不到 VERSION')
    head, n = m.group(2).rsplit('-', 1)
    new = '%s-%d' % (head, int(n) + 1)
    open(path, 'w', encoding='utf-8').write(s[:m.start(2)] + new + s[m.end(2):])
    print('VERSION %s → %s' % (m.group(2), new))
def guard():
    cur, head = ver(), _head_ver()
    if head is None or cur != head: return
    dirty = _dirty_code()
    if not dirty: return
    print('')
    print('❌ VERSION 還是 %s，與 HEAD 一樣，但這些程式碼已經改了：' % cur)
    for f in dirty[:12]: print('     ' + f)
    if len(dirty) > 12: print('     …共 %d 支' % len(dirty))
    print('   ⇒ 模組網址會與上一版**完全相同** ⇒ 玩家的瀏覽器直接吃快取，')
    print('     這一版的修改一個字都送不出去，而 HUD 上看不出哪裡不對（憲法 §6 的 -626）。')
    print('   ⇒ 跑 `python3 tools/bust.py --bump`（工具自己 +1，不要用 sed 打舊號碼）。')
    sys.exit(1)

if __name__ == '__main__':

    if '--bump' in sys.argv: bump()
    else: guard()
    sys.exit(run('--check' in sys.argv))
