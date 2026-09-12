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
import os, re, sys, glob

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
    ], v)
    if s != s0: dirty.append(('flight/index.html', p, s))

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

if __name__ == '__main__':
    sys.exit(run('--check' in sys.argv))
