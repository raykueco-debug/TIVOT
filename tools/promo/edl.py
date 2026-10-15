# 宣傳片分鏡表 v2（照 Ray 的基本分鏡）。cut.py 讀這一份；v1 留在 edl_v1.py。
#
#   0～15 秒黑底字幕（首頁曲）→ 主 LOGO → 音樂淡出
#   → 快剪戰鬥，多個 CI 與語音穿插（Havoc）
#   → 飛行「探索埋藏在因果中的未知」
#   → 城鎮、劇情、插圖穿插「這份羈絆／究竟能帶你前往何方？」
#   → BR（彈雨傾洩）收尾 → 回到主 LOGO
#
# 每一段：
#   scene ＝ record.py 錄的場景資料夾、t ＝從第幾秒、d ＝長幾秒
#   still ＝插圖（專案內路徑），z＝(起始縮放, 結束縮放)、fy＝縮放的垂直重心
#   text／sub ＝字卡（大字可多行／英文副標）、ty ＝垂直位置比例、size ＝字級、lh ＝行高倍率
#   tin／tout ＝字淡入／淡出秒數、img ＝疊一張圖（LOGO 的團徽）
#   flash ＝白閃秒數、fadein／fadeout ＝整段從黑淡入／淡出到黑
B = 0.5108          # Havoc：一拍

def card(lines, d):   # 黑底字幕
    return dict(bg='black', d=d, text=lines, size=64, lh=1.9, spacing=0.12, ty=.48, band=False, tin=.9, tout=.7)

def logo(d, **kw):
    return dict(bg='black', d=d, img='resources/background/tivot_emblem.webp', img_w=640, img_y=.40,
                text='聖約第四騎士團', sub='SAINT  INSTALL', ty=.66, size=96, band=False, tin=.8, **kw)

INTRO = [
  card(['大陸曆1908年', '陷入永夜的世界'], 4.2),
  card(['禍魘肆虐的銀月大陸', '世俗武力已無法抑止'], 4.2),
  card(['哭號與禱告中', '唯有神所降下的救贖'], 3.6),
  logo(3.0, fadeout=.9),
]

BATTLE = [   # 快剪：盤面與 CI 交錯，CI 自帶語音
  dict(scene='misha_ni',   t=0.0,  d=2*B),                 # 依序點盤
  dict(scene='anya',       t=3.5,  d=2*B, flash=.08),      # 安雅 NIGHTMARE INSTALL
  dict(scene='misha_full', t=43.4, d=2*B),                 # 紅圈完美反擊
  dict(scene='sorana',     t=3.0,  d=2*B, flash=.08),      # 索菈娜 獵手的智慧
  dict(scene='colossus',   t=18.0, d=2*B),                 # 聖徒化金色盤面
  dict(scene='nou',        t=3.5,  d=2*B, flash=.08),      # 諾薇兒 聖徒降臨
  dict(scene='misha_full', t=20.0, d=B),                   # 破防連射
  dict(scene='sorana',     t=14.0, d=B, flash=.06),        # 獵手的共鬥
  dict(scene='anya',       t=8.0,  d=2*B, flash=.08),      # 夢境粉碎
  dict(scene='misha_ni',   t=17.0, d=2*B, flash=.08),      # 米夏 NIGHTMARE INSTALL
  dict(scene='colossus',   t=16.5, d=2*B, flash=.08),      # 賽西莉 聖徒化
  dict(scene='colossus',   t=29.3, d=3*B, flash=.1),       # EXSECUTIŌ
]

FLIGHT = [
  dict(scene='flight', t=3.0, d=6*B, flash=.08, text='探索埋藏在因果中的未知', ty=.30, size=66, tin=.3, tout=.3),
]

BONDS = [    # 城鎮、劇情、插圖穿插
  dict(scene='town', t=22.6, d=2*B, text='這份羈絆', ty=.30, size=76, tin=.3),
  dict(still='resources/illustration/044_cecilietorsten.webp', d=2*B, z=(1.0, 1.08), fy=.35),
  dict(scene='story', t=3.0, d=2*B),
  dict(scene='town', t=0.3, d=2*B, text='究竟能帶你前往何方？', ty=.30, size=70, tin=.3),
  dict(still='resources/illustration/024_nouvellesmile.webp', d=2*B, z=(1.08, 1.0), fy=.35),
  dict(still='resources/illustration/017_rennasmile.webp', d=2*B, z=(1.0, 1.08), fy=.35),
]

FINISH = [   # BR 收尾 → 主 LOGO
  dict(scene='misha_full', t=18.0, d=4*B, flash=.1),       # 彈雨傾洩 CI ＋ 語音
  dict(scene='misha_full', t=20.0, d=2*B),                 # 彈雨
  logo(6*B, fadeout=1.2),
]

SEGMENTS = INTRO + BATTLE + FLIGHT + BONDS + FINISH

_t_switch = sum(s['d'] for s in INTRO)
_total = sum(s['d'] for s in SEGMENTS)
BGM = [
  # 首頁曲：鋪滿黑底字幕，LOGO 那一段淡出
  dict(src='resources/audio/bgm/bgm_mainmenu.m4a', start=0, end=_t_switch, fadein=1.0, fadeout=2.2, gain=0.85),
  # Havoc：從第一拍（檔案 0.116 秒）起播，切進戰鬥那一格正好落在拍上；片尾 LOGO 淡出
  dict(src='resources/audio/bgm/peritunematerial_havoc_loop.m4a', start=_t_switch, end=_total, **{'from': 0.116},
       fadein=.02, fadeout=2.0, gain=1.7),
]
SFX_GAIN = 0.7      # 錄到的音效整體比例（語音另外是 1.0）
