# 宣傳片分鏡表 v3 —— 照 Ray 的「pv分鏡.xlsx」，秒數對到 PerituneMaterial_Havoc 的拍點。cut3.py 讀這一份。
#
# Havoc：118 BPM，一拍 0.5085 秒，第一拍在 0.035 秒；一小節 2.034 秒、4 小節一句 8.14 秒。
#   0～8.17 前奏（重音弱）→ 8.17 鼓組進來 → 61～67 一段收斂（63.6～67 幾乎靜默）→ 67.15 重拍
#   → 81～89 過門（每隔一拍一個重音：84.44／85.46／86.48／87.49）→ 89.53 再起。
# 每一段的 at ＝絕對開始秒數（都落在拍點上），結束＝下一段的 at。
import random, glob, os

B = 0.5085; PH = 0.035
def beat(k): return round(PH + B * k, 3)        # 第 k 拍的時刻

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
def bg_pick():
    """快剪用的背景：每個地區抽一張（固定種子，重剪不會換圖）。"""
    rnd = random.Random(1908); out = []
    for d in ['capital', 'northport', 'shinier', 'forest', 'eastport', 'sofia', 'ravnsdal', 'belisar', 'tomb', 'canyon',
              'dunmor', 'lake', 'verafond', 'holysee', 'ruins', 'plains', 'fallen', 'winsmoor_town', 'deck', 'loneisle']:
        fs = sorted(f for f in glob.glob(os.path.join(ROOT, 'resources', 'background', d, '*.webp'))
                    if not os.path.basename(f).startswith('_') and 'night' not in f and 'dawn' not in f)
        if fs: out.append(os.path.relpath(rnd.choice(fs), ROOT).replace('\\', '/'))
    return out

V = 'resources/ci/video/'; IL = 'resources/illustration/video/'
SEGMENTS = [
  # 1 BR：左下彈出拉回 ＋ 上膛 ＋ 語音
  dict(at=0.0, kind='video', src=V+'cutin_dual_torsten_v7.mp4', enter='bl', note='BR 彈雨傾洩',
       sfx=[(0.0, 'resources/audio/se/se_weapon_reload.m4a', 1.0), (0.25, 'resources/audio/vo/vo_torsten_dualcrush.m4a', 1.0)]),
  # 2 米夏刺擊 ＋ 刺擊音 ＋ 防禦語音
  dict(at=beat(3), kind='video', src=IL+'038_mishasting_v2.mp4', speed=0.75, flash=0.08, note='米夏刺擊',
       sfx=[(0.05, 'resources/audio/se/se_slash.m4a', 1.0), (0.2, 'resources/audio/vo/vo_misha_guard1.m4a', 1.0)]),
  # 3 夢境粉碎 ＋ 語音
  dict(at=beat(6), kind='video', src=V+'ci_anya_dreambreaker_v1.mp4', speed=0.8, flash=0.08, note='夢境粉碎',
       sfx=[(0.1, 'resources/audio/vo/vo_anya_dreambreaker2.m4a', 1.0)]),
  # 4 主 LOGO：先一小節黑底餘燼，鼓組進來那一拍（8.17）蓋下、火星飛濺，之後慢推
  dict(at=beat(14), kind='logo', slam=beat(16) - beat(14), push=0.10, note='主 LOGO',
       sfx=[(beat(16) - beat(14), 'resources/audio/se/se_kerberos_drop.m4a', 1.3),
            (beat(16) - beat(14), 'resources/audio/se/se_rockimpact.mp3', 0.8)]),
  # 5～11 戰鬥快剪（CI 穿插）
  dict(at=beat(34), kind='scene', scene='colossus', t=0.5, note='戰鬥：巨像'),
  dict(at=beat(40), kind='scene', scene='misha_full', t=41.4, note='戰鬥：米夏、紅圈反擊'),
  dict(at=beat(48), kind='scene', scene='misha_full', t=20.0, flash=0.06, note='戰鬥：破防連射'),
  dict(at=beat(50), kind='video', src=V+'cutin_cecilie_saint_v3.mp4', flash=0.08, note='賽西莉聖徒化'),
  dict(at=beat(52), kind='scene', scene='colossus', t=18.0, note='戰鬥：聖徒化金盤'),
  dict(at=beat(54), kind='video', src=V+'ci_sorana_supply_v2.mp4', flash=0.08, note='獵手的智慧',
       sfx=[(0.1, 'resources/audio/vo/vo_sorana_supply1.m4a', 1.0)]),
  dict(at=beat(56), kind='video', src=V+'cutin_nouvelle_saint_v1.mp4', flash=0.08, note='諾薇兒聖徒化',
       sfx=[(0.1, 'resources/audio/vo/vo_nouvelle_saintinstall.m4a', 1.0)]),
  # 12 飛行
  dict(at=beat(64), kind='scene', scene='flight', t=3.0, flash=0.06, note='飛行'),
  # 13 城鎮對話（帝都船塢，蕾娜與諾薇兒）
  dict(at=beat(72), kind='scene', scene='towntalk', t=21.6, note='城鎮對話'),
  # 14～17 插圖動畫，各兩拍
  dict(at=beat(80), kind='video', src=IL+'017_rennasmile_v1.mp4', note='蕾娜微笑'),
  dict(at=beat(82), kind='video', src=IL+'015-anyadessert_v1.mp4', note='安雅甜點'),
  dict(at=beat(84), kind='video', src=IL+'009_soranadebute_v3.mp4', note='索菈娜出場'),
  dict(at=beat(86), kind='video', src=IL+'024_nouvellesmile_v1.mp4', note='諾薇兒微笑'),
  # 18 主角與賽西莉背靠背：慢放＋由下往上平移
  dict(at=beat(88), kind='video', src=IL+'044_cecilietorsten_v1.mp4', speed=0.5, pan='up', pan_amt=1.3, note='背靠背'),
  # 19～20 遺跡平移
  dict(at=beat(96), kind='still', src='resources/background/belisar/belisar_exterior_day.webp', pan='lr', note='遺跡：古城'),
  dict(at=beat(104), kind='still', src='resources/background/tomb/tomb_gate_day.webp', pan='rl', note='遺跡：古墓'),
  # 21 未定（暫放：蕾娜公主抱）
  dict(at=beat(112), kind='video', src=IL+'31-2_rennaprincesshold_v1.mp4', speed=0.9, note='未定（暫放公主抱）'),
  # 22 隨機場景快剪：半拍一張
  dict(at=beat(120), kind='montage', step=B / 2, imgs=bg_pick(), note='場景快剪'),
  # 23 MB 動畫 ＋ 槍響（落在 67.15 那個重拍前一拍）
  dict(at=beat(130), kind='video', src=V+'ci_torsten_mb_v2.mp4', flash=0.08, note='MaxBurst',
       sfx=[(0.05, 'resources/audio/vo/vo_torsten_mb.m4a', 1.0), (beat(131) - beat(130), 'resources/audio/se/se_weapon_shotgun_blast.m4a', 1.4)]),
  # 24～27 實機
  dict(at=beat(132), kind='scene', scene='deer', t=10.9, flash=0.08, note='鹿主戰'),
  dict(at=beat(140), kind='scene', scene='sorana', t=13.6, note='共鬥'),
  dict(at=beat(148), kind='scene', scene='mage', t=8.0, note='愛里歐戰'),
  dict(at=beat(156), kind='scene', scene='guard', t=1.4, note='獄門天鎖'),
  # 28 處決：慢放＋由下往上平移；85.46／87.49 兩個重音各閃兩次米夏聖徒
  dict(at=beat(164), kind='video', src=V+'ci_torsten_execute_v2.mp4', speed=0.5, pan='up', pan_amt=1.3, flash=0.1,
       fadeout=0.6, note='處決',
       flashes=[(beat(168) - beat(164), 'resources/ci/ci_misha_ni.webp'), (beat(168) - beat(164) + 0.13, 'resources/ci/ci_misha_ni.webp'),
                (beat(172) - beat(164), 'resources/ci/ci_misha_ni.webp'), (beat(172) - beat(164) + 0.13, 'resources/ci/ci_misha_ni.webp')],
       sfx=[(0.1, 'resources/audio/vo/vo_torsten_execute.m4a', 1.0)]),
]
END = beat(181)          # 92.07

BGM = dict(src='resources/audio/bgm/PerituneMaterial_Havoc.mp3', fadeout=1.2, gain=1.0)
SFX_GAIN = 0.7
