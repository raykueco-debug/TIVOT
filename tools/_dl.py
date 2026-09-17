# -*- coding: utf-8 -*-
"""下載資料夾只有一個計算點（憲法鐵律 7）。
   ver -1432：美術產線換回 macOS，四支交件工具原本各自寫死
   'C:/Users/Kaede/Downloads/' —— 換一台機器就四處都要改。
   優先序：環境變數 TIVOT_DL > 這台機器真的存在的那一個 > ~/Downloads。
"""
import os
_C = [os.environ.get('TIVOT_DL'),
      os.path.expanduser('~/Downloads'),
      'C:/Users/Kaede/Downloads']
DLDIR = next((p for p in _C if p and os.path.isdir(p)), os.path.expanduser('~/Downloads'))

def dl(pattern):
    """組出 Downloads 底下的 glob 樣式。"""
    return os.path.join(DLDIR, pattern).replace(chr(92), '/')
