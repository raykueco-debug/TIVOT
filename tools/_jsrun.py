# -*- coding: utf-8 -*-
"""tools/_jsrun.py —— 「把專案裡的 JS 資料真的跑一次再 dump 成 JSON」的**唯一**引擎（ver -1326）

  為什麼要它：`script/town.js`／`config.js`／`flight` 裡的 `RUIN_ART` 都是**純資料**，
  但巢狀物件加上滿滿的中文註解，用 regex 猜一定有假陽性 —— 所以一律借一支 JS 引擎
  真的執行一次。這個作法 7 支工具都在用，而**每一支都自己寫了一份**
  （`JSC = '/System/Library/.../jsc'` ＋ 自己的 subprocess）⇒ 鐵律 7 的病：
    · 全部寫死 macOS 的 jsc ⇒ **在 Windows 上 7 支全滅**，其中 `map_layout.py` 是憲法
      §6.7.5 指定「回給美術的佈局簡圖只能用它產」的那一支。
    · `enemies_xlsx.py` 還把暫存檔寫死在 `/tmp/`（Windows 上根本沒有那個位置）。

  ⚠⚠ 兩支引擎**行為要一模一樣**，差別全部收在這裡：
    · macOS 有內建的 `jsc` 就用它；否則用 `node`（PATH 上有就認得，不必設定）。
    · jsc 有內建的 `print()`，node 沒有 ⇒ node 那條**注入一行 shim**
      （`globalThis.print = console.log`），所以**呼叫端照舊寫 `print(...)`**，
      兩邊拿到的 stdout 一模一樣。

  ⚠⚠⚠ 一律走**暫存檔**，不要用 `-e`：Windows 的命令列上限約 32 KB，而這裡餵進去的
    常常是整支 `town.js`／`config.js`（數百 KB）—— 用 `-e` 會在 Windows 上莫名其妙失敗。

  用法：
      import _jsrun
      D = _jsrun.dump(src)                 # src 結尾要有 print(JSON.stringify(...))
      D = _jsrun.dump(src, module=True)    # 需要 import/export 時
      msg = _jsrun.check_module(path)      # 語法檢查；''＝沒問題（行號對得回原檔）
"""
import json, os, pathlib, shutil, subprocess, sys, tempfile

JSC  = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc'
NODE = shutil.which('node')
ENGINE = 'jsc' if os.path.exists(JSC) else ('node' if NODE else None)

# node 沒有 jsc 的內建 print —— 補上，呼叫端就不必分辨自己跑在哪一支上。
SHIM = 'globalThis.print = (...a) => console.log(...a);' + chr(10)


def require():
    """沒有任何引擎就講清楚怎麼辦（而不是丟一個 FileNotFoundError）。"""
    if not ENGINE:
        print('找不到可用的 JS 引擎：macOS 的 jsc（%s）不在，PATH 上也沒有 node。' % JSC)
        print('裝一個 node 就好（https://nodejs.org），這些工具會自己認。')
        sys.exit(2)


def _run(argv):
    # ⚠ Windows 一定要明寫 encoding：`text=True` 走的是 locale 編碼（中文 Windows ＝
    #   cp950），而 dump 出來的 JSON 整份是中文 —— 不寫的話當場解碼失敗，
    #   症狀會是「讀不到資料」而不是編碼錯誤，會害人查錯方向。
    return subprocess.run(argv, capture_output=True, text=True,
                          encoding='utf-8', errors='replace')


def raw(src, module=False):
    """跑一段 JS，回 (returncode, stdout, stderr)。"""
    require()
    suffix = '.mjs' if module else '.js'
    body = src if ENGINE == 'jsc' else SHIM + src
    t = tempfile.NamedTemporaryFile('w', suffix=suffix, delete=False, encoding='utf-8')
    t.write(body)
    t.close()
    try:
        if ENGINE == 'jsc':
            argv = [JSC, '-m', t.name] if module else [JSC, t.name]
        else:
            argv = [NODE, t.name]
        r = _run(argv)
        return r.returncode, (r.stdout or ''), (r.stderr or '')
    finally:
        try:
            os.unlink(t.name)
        except OSError:
            pass


def dump(src, module=False, what='資料'):
    """跑一段以 print(JSON.stringify(...)) 結尾的 JS，回 parse 好的物件。
       ⚠ 取 stdout 的**最後一行**：資料檔裡偶爾有自己的 console 輸出。"""
    rc, out, err = raw(src, module=module)
    if rc or not out.strip():
        print('讀不到%s（引擎 %s）：' % (what, ENGINE))
        print((err or out)[:800])
        sys.exit(2)
    return json.loads(out.strip().splitlines()[-1])


def check_module(path):
    """逐檔語法檢查，回錯誤訊息（''＝沒問題）。
       ⚠ node 那條把檔案**逐字複製**成 .mjs 再 --check（不加 shim、不 strip）——
         行號才對得回原檔，而「哪一個檔、第幾行」正是逐檔驗的理由。"""
    require()
    if ENGINE == 'jsc':
        r = _run([JSC, '--module-file=' + path])
        return ((r.stdout or '') + (r.stderr or ''))
    t = tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False, encoding='utf-8')
    t.write(open(path, encoding='utf-8').read())
    t.close()
    try:
        r = _run([NODE, '--check', t.name])
        return ((r.stdout or '') + (r.stderr or '')).replace(t.name, path)
    finally:
        try:
            os.unlink(t.name)
        except OSError:
            pass

def file_url(path):
    """把本機路徑變成 ESM 吃得下的 file:// 網址。
       ⚠ Windows 一定要走這一步：`import X from 'C:/a/b.js'` 在 node 會被當成
         套件名（bare specifier）而失敗 —— macOS 的 /a/b.js 剛好長得像相對路徑
         所以以前沒露餡。"""
    return pathlib.Path(path).resolve().as_uri()
