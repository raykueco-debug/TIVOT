# -*- coding: utf-8 -*-
"""tools/_utf8.py —— 主控台輸出強制 UTF-8（ver -1326）

  為什麼要它：這些工具滿滿的 ⚠ ✔ ❌ 與中文，而**中文 Windows 的主控台預設是
  cp950** —— 印到第一個 ⚠ 就 `UnicodeEncodeError` 當場崩掉，而且崩在「印訊息」
  那一行，看起來像是工具本身壞了。實測 `tools/` 底下 24 支有 22 支中這個招，
  其中 `bust.py --check` 正是憲法 §5 的快取驗收那一支。

  ⚠⚠ 收成**一支**（鐵律 8）：22 個地方各貼三行必然有人漏、也必然走鐘。
      用法是每一支工具的 import 區加一行：

          import _utf8  # noqa: F401  （主控台 UTF-8，見該檔）

  ⚠ 它是**冪等**的，重複 import 不會有事；Python 3.7 以前沒有 `reconfigure`，
    包在 try 裡 —— 拿不到就退回原行為（該崩還是會崩，但不會多壞一件事）。
  ⚠ macOS／Linux 本來就是 UTF-8，這支在那邊等於什麼都沒做。
"""
import sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding='utf-8')
    except Exception:
        pass
