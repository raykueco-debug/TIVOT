# 宣傳片分鏡表（試玩宣傳・直式 Shorts／TikTok／Reels 版）。cut.py 讀這一份。
#
# 每一段：
#   scene ＝ record.py 錄的場景資料夾、t ＝從第幾秒、d ＝長幾秒
#   still ＝插圖（專案內路徑），z＝(起始縮放, 結束縮放)、fy＝縮放的垂直重心
#   text／sub ＝字卡（大字／英文副標）、ty ＝字的垂直位置比例、size ＝字級
#   img ＝疊一張圖（片尾的團徽）、flash ＝白閃秒數、fadein／fadeout ＝黑場淡入淡出
#   sfx ＝這一段錄到的音效音量倍率、mute ＝這一段不放錄到的音效
#
# 節奏：開場是首頁曲（一拍 M）、實機段是米夏戰的 Havoc（一拍 B）—— 鏡頭長度一律是拍的整數倍。
M = 0.2786 * 4      # 首頁曲：每張插圖一小節（約 1.11 秒）
B = 0.5108          # Havoc：一拍

INTRO = [
  dict(still='resources/illustration/002_saintassult.webp', d=2*M, z=(1.18, 1.05), fy=.45, fadein=.6,
       text='大陸曆一九〇八年', sub='CONTINENTAL CALENDAR 1908', ty=.30, size=84),
  dict(still='resources/illustration/005_cecilieintro.webp', d=M, z=(1.0, 1.10), fy=.35),
  dict(still='resources/illustration/004_renna_intro.webp', d=M, z=(1.10, 1.0), fy=.30),
  dict(still='resources/illustration/009_soranadebute.webp', d=M, z=(1.0, 1.10), fy=.30),
  dict(still='resources/illustration/011_nouvellebreath.webp', d=M, z=(1.10, 1.0), fy=.40),
  dict(still='resources/illustration/037_mishamarch.webp', d=M, z=(1.0, 1.12), fy=.35,
       text='以聖約之名', sub='IN THE NAME OF THE TESTAMENT', ty=.72, size=92),
  dict(scene='story', t=14.0, d=2*M, text='開　棺', ty=.30, size=110, tin=.5),   # 槍棺開門 → 下一段切進 Havoc
]

GAMEPLAY = [
  dict(scene='misha_ni',   t=0.0,  d=2*B, flash=.12, text='依序擊破', sub='SCHULTE BATTLE', ty=.37, size=80),
  dict(scene='misha_full', t=12.0, d=B),
  dict(scene='misha_full', t=43.4, d=2*B, text='完美反擊', sub='PERFECT COUNTER', ty=.37, size=80),
  dict(scene='misha_full', t=18.0, d=3*B, flash=.08),           # 雙槍破防 CI「彈雨傾洩」
  dict(scene='misha_full', t=20.0, d=2*B),                     # 破防連射
  dict(scene='town', t=0.3,  d=2*B, flash=.08, text='探索城鎮', sub='EXPLORE', ty=.37, size=80),
  dict(scene='town', t=2.6,  d=B),
  dict(scene='town', t=4.6,  d=B),
  dict(scene='town', t=6.6,  d=B),
  dict(scene='town', t=22.6, d=2*B),
  dict(scene='town', t=24.1, d=B),
  dict(scene='town', t=32.5, d=B),
  dict(scene='story', t=3.0, d=2*B, text='與夥伴們的羈絆', sub='YOUR COMPANIONS', ty=.37, size=80),
  dict(scene='story', t=8.2, d=2*B),
  dict(scene='flight', t=3.0,  d=3*B, flash=.08, text='翱翔銀月大陸', sub='TAKE TO THE SKIES', ty=.37, size=80),
  dict(scene='flight', t=10.5, d=B),
  dict(scene='flight', t=17.0, d=2*B),                         # 空中遭遇：槍棺升起
  dict(scene='flight', t=21.2, d=B),
  dict(scene='colossus', t=16.5, d=2*B, flash=.08),            # 賽西莉聖徒化 CI
  dict(scene='colossus', t=18.0, d=3*B, text='聖徒化', sub='SAINT INSTALL', ty=.37, size=80),
  dict(scene='misha_ni', t=17.0, d=2*B, flash=.08),            # 米夏 NIGHTMARE INSTALL
  dict(scene='misha_ni', t=21.6, d=2*B),
  dict(scene='colossus', t=29.3, d=5*B, flash=.1),             # EXSECUTIŌ
]

OUTRO = [
  dict(bg='black', d=6*B, fadeout=1.0, img='resources/background/tivot_emblem.webp', img_w=640, img_y=.40,
       text='聖約第四騎士團', sub='SAINT  INSTALL', ty=.66, size=96, tin=.6),
]

SEGMENTS = INTRO + GAMEPLAY + OUTRO

_t_switch = sum(s['d'] for s in INTRO)
_total = sum(s['d'] for s in SEGMENTS)
BGM = [
  dict(src='resources/audio/bgm/bgm_mainmenu.m4a', start=0, end=_t_switch, fadein=.4, fadeout=.25, gain=0.85),
  # Havoc 的第一拍在檔案 0.116 秒：從那裡起播，切進實機那一格正好落在拍上
  dict(src='resources/audio/bgm/peritunematerial_havoc_loop.m4a', start=_t_switch, end=_total, **{'from': 0.116},
       fadein=.02, fadeout=1.6, gain=1.7),
]
SFX_GAIN = 0.7     # 錄到的音效整體比例（語音另外是 1.0）
