# -*- coding: utf-8 -*-
"""tools/_font.py —— 繪圖工具的字型解析，**唯一**一處（ver -1326）

  為什麼要它：畫圖的那幾支工具（佈局簡圖、地圖草稿、城的貼標）全部把 macOS 的字型
  **路徑寫死**（`/System/Library/Fonts/PingFang.ttc` 那一族）⇒ 在 Windows 上一律
  `OSError: cannot open resource`。而其中 `map_layout.py` 是憲法 §6.7.5 指定
  「回給美術的佈局簡圖只能用它產」的那一支 —— 等於那份交件在這台機器上做不出來。

  ⚠⚠ 收成一支（鐵律 7／8）：六支各寫一份候選路徑，換一台機器就要改六個地方。
      候選**由上往下取第一個存在的**，所以 macOS 的行為一個字都沒變。

  ⚠ `.ttc` 是「字型集合」，`index` 選的是裡面第幾個字重 —— 那個號碼**逐字型不同**
    （PingFang 的 4 ≠ 微軟正黑的 4）。所以這裡收 `weight` 這種講人話的參數，
    由各字型自己對應；真的對不到就退回 index 0，**不要讓它炸掉**。
"""
import os
from PIL import ImageFont

# ── 候選表：macOS → Windows → Linux ────────────────────────────────────────
# 每一筆是 (路徑, {字重: index})
CJK = [
    ('/System/Library/Fonts/PingFang.ttc',            {'regular': 4, 'bold': 8}),
    ('C:/Windows/Fonts/msjh.ttc',                     {'regular': 0, 'bold': 0}),   # 微軟正黑（繁體）
    ('C:/Windows/Fonts/msyh.ttc',                     {'regular': 0, 'bold': 0}),
    ('C:/Windows/Fonts/mingliu.ttc',                  {'regular': 0, 'bold': 0}),
    ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', {'regular': 0, 'bold': 0}),
]
CJK_BOLD = [('C:/Windows/Fonts/msjhbd.ttc', {'bold': 0, 'regular': 0})]

LATIN_BOLD = [
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
    'C:/Windows/Fonts/segoeuib.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
]
CURSIVE = [
    '/System/Library/Fonts/Supplemental/SnellRoundhand.ttc',
    'C:/Windows/Fonts/segoesc.ttf',      # Segoe Script
    'C:/Windows/Fonts/BRADHITC.TTF',     # Bradley Hand
    'C:/Windows/Fonts/ITCEDSCR.TTF',     # Edwardian Script
]


def find(paths):
    """回第一個真的存在的路徑；一個都沒有就 None。"""
    for p in paths:
        if os.path.exists(p):
            return p
    return None


def _load(path, size, index):
    try:
        return ImageFont.truetype(path, size, index=index)
    except OSError:
        # index 對不到（換了字型集合）就退回第一個字重 —— 字會長得不一樣，
        # 但工具要跑得完；畫不出字才是真的擋住人。
        return ImageFont.truetype(path, size, index=0)


def cjk(size, weight='regular'):
    """中日韓字型（本專案是繁體）。"""
    table = (CJK_BOLD + CJK) if weight == 'bold' else CJK
    for path, idx in table:
        if os.path.exists(path):
            return _load(path, size, idx.get(weight, 0))
    return ImageFont.load_default()


def latin(size, bold=True):
    p = find(LATIN_BOLD)
    return ImageFont.truetype(p, size) if p else ImageFont.load_default()


def cursive(size, index=0):
    p = find(CURSIVE)
    return _load(p, size, index) if p else cjk(size)
