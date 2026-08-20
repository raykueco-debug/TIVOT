# -*- coding: utf-8 -*-
"""audio_reorg.py — 把全專案的音檔搬進 resources/audio/{bgm,se,vo} 並改成統一命名。

  py tools/audio_reorg.py --dry     只印對照表，不動檔案
  py tools/audio_reorg.py           實際搬（git mv）並改寫程式裡的路徑

命名規則（Ray：「一看就知道是什麼」）：
    bgm_<場合>.<ext>                背景音樂，場合＝它在哪一頁／哪個狀態播
    se_<分類>_<名稱>.<ext>          音效，分類＝ui／weapon／enemy／saint／flight
    vo_<角色>_<技能>.<ext>          語音，角色小寫，技能用該技能的正式名

⚠ 舊名的病灶就是「看不出用途」：Renee_VC_Act / Renee_VC_Pas 要翻 config 才知道
  哪個是生命歸還、哪個是即死防禦；Battle_01 / BOSS_01 的 _01 不代表任何東西；
  Start_01 與 StartBT_SE 兩個都叫 start 卻是完全不同的東西。新名一律用**用途**
  當主詞，不用來源或流水號。
"""
import io, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY  = '--dry' in sys.argv

# 舊路徑 → 新路徑（相對 repo 根）
MAP = {
  # ── BGM ────────────────────────────────────────────────────────────
  'resources/Stage/MainMenu.m4a':        'resources/audio/bgm/bgm_mainmenu.m4a',
  'resources/Stage/Battle_01.m4a':       'resources/audio/bgm/bgm_battle.m4a',
  'resources/Stage/BOSS_01.m4a':         'resources/audio/bgm/bgm_boss.m4a',
  'resources/Stage/MissionFailed_01.m4a':'resources/audio/bgm/bgm_missionfailed.m4a',
  'resources/Stage/Result_01.m4a':       'resources/audio/bgm/bgm_result.m4a',
  'flight/OverWorld_Orchestra.mp3':      'resources/audio/bgm/bgm_flight_sail.mp3',
  'flight/Standby.mp3':                  'resources/audio/bgm/bgm_flight_idle.mp3',
  'flight/Sail.mp3':                     'resources/audio/bgm/_unused/bgm_flight_sail_old.mp3',
  # BGM 母帶（.m4a 由這些轉出，config 註明要留著重轉用）
  'resources/Stage/MainMenu.mp3':        'resources/audio/bgm/_master/bgm_mainmenu.mp3',
  'resources/Stage/Battle_01.mp3':       'resources/audio/bgm/_master/bgm_battle.mp3',
  'resources/Stage/BOSS_01.mp3':         'resources/audio/bgm/_master/bgm_boss.mp3',
  'resources/Stage/MissionFailed_01.mp3':'resources/audio/bgm/_master/bgm_missionfailed.mp3',
  'resources/Stage/Result_01.mp3':       'resources/audio/bgm/_master/bgm_result.mp3',

  # ── SE：介面 ───────────────────────────────────────────────────────
  'resources/General/StartBT_SE.mp3':    'resources/audio/se/se_ui_kagurabell.mp3',
  'resources/General/GeneralClick_SE.mp3':'resources/audio/se/se_ui_click.mp3',
  'resources/General/Pageflip_SE.mp3':   'resources/audio/se/se_ui_pageflip.mp3',
  'resources/Stage/Start_01.mp3':        'resources/audio/se/se_ui_sortie.mp3',
  # ── SE：聖徒化 ─────────────────────────────────────────────────────
  'resources/Stage/SI_01.mp3':           'resources/audio/se/se_saint_install.mp3',
  'resources/partner/Luna_MB_SE.wav':    'resources/audio/se/se_saint_maxburst.wav',
  # ── SE：武器 ───────────────────────────────────────────────────────
  'resources/weapon/MG_Squall_SE.mp3':      'resources/audio/se/se_weapon_mg_squall.mp3',
  'resources/weapon/Shotgun_Blast_SE.mp3':  'resources/audio/se/se_weapon_shotgun_blast.mp3',
  'resources/weapon/Sniper_Falcon_SE.mp3':  'resources/audio/se/se_weapon_sniper_falcon.mp3',
  'resources/weapon/Reload.mp3':            'resources/audio/se/se_weapon_reload.mp3',
  'resources/weapon/Guard_SE.m4a':          'resources/audio/se/se_weapon_guard.m4a',
  'resources/weapon/Pistol_SE_01.mp3':      'resources/audio/se/se_weapon_pistol_01.mp3',
  'resources/weapon/Pistol_SE_02.mp3':      'resources/audio/se/se_weapon_pistol_02.mp3',
  'resources/weapon/Pistol_SE_03.wav':      'resources/audio/se/se_weapon_pistol_03.wav',
  'resources/weapon/Pistol_SE_04.mp3':      'resources/audio/se/_unused/se_weapon_pistol_04.mp3',
  'resources/weapon/CN_75mm.mp3':           'resources/audio/se/_unused/se_weapon_cannon_75mm.mp3',
  # ── SE：敵人 ───────────────────────────────────────────────────────
  'resources/enemy/EM_Slash_SE.m4a':     'resources/audio/se/se_enemy_slash.m4a',
  'resources/enemy/EM_Smack_SE.m4a':     'resources/audio/se/se_enemy_smack.m4a',
  'resources/enemy/EM_Shot_SE.mp3':      'resources/audio/se/se_enemy_shot.mp3',
  'resources/enemy/EM_Revolver_SE.mp3':  'resources/audio/se/se_enemy_revolver.mp3',
  'resources/enemy/EM_Dagger_SE.m4a':    'resources/audio/se/se_enemy_dagger.m4a',
  # ── SE：飛行 ───────────────────────────────────────────────────────
  # ⚠ 左邊是**當初磁碟上的舊檔名**，不是角色名。安娜已更名為安雅（ver -263），
  #   但這一格**不能跟著改** —— 這張表是「舊路徑 → 新路徑」的歷史對照，
  #   改了就對不上真實存在過的檔案，重跑會找不到來源。
  'flight/Anna_Beat.mp3':                'resources/audio/se/se_flight_heartbeat.mp3',

  # ── VO：搭檔語音（舊名的 Act/Pas 看不出是哪個技能）───────────────────
  'resources/partner/Luna_SI_VC.m4a':    'resources/audio/vo/vo_luna_saintinstall.m4a',
  'resources/partner/Luna_dual_VC.wav':  'resources/audio/vo/vo_luna_dualwield.wav',
  'resources/partner/Luna_EXC_VC.wav':   'resources/audio/vo/vo_luna_execution.wav',
  'resources/partner/Luna_OBE_VC.wav':   'resources/audio/vo/vo_luna_obe.wav',
  'resources/partner/Renee_VC_Act.wav':  'resources/audio/vo/vo_renee_lifereturn.wav',
  'resources/partner/Renee_VC_Pas.wav':  'resources/audio/vo/vo_renee_deathguard.wav',
  'resources/partner/Malzeno_VC_Act.wav':'resources/audio/vo/vo_malzeno_supplyrefill.wav',
  'resources/partner/Malzeno_VC_Pas.wav':'resources/audio/vo/vo_malzeno_hcrounds.wav',

  # ── 未經處理的素材下載（放 repo 根很礙眼，收進來但不改名）────────────
  'daviddumaisaudio-sword-slash-and-swing-185432.m4a':
      'resources/audio/_raw/daviddumaisaudio-sword-slash-and-swing-185432.m4a',
  'daviddumaisaudio-sword-slash-with-metal-shield-impact-185433.m4a':
      'resources/audio/_raw/daviddumaisaudio-sword-slash-with-metal-shield-impact-185433.m4a',
  'freesound_community-samurai-slash-6845.m4a':
      'resources/audio/_raw/freesound_community-samurai-slash-6845.m4a',
  'phatphrogstudio-phatphrogstudiocom-victory-fanfare-2-474663.m4a':
      'resources/audio/_raw/phatphrogstudio-phatphrogstudiocom-victory-fanfare-2-474663.m4a',
}

# 會被改寫路徑的程式檔（相對 repo 根）
SRCS = ['config.js', 'flight/index.html']


def sh(*a):
    return subprocess.run(a, cwd=ROOT, capture_output=True, text=True)


def main():
    os.chdir(ROOT)
    miss = [o for o in MAP if not os.path.exists(o)]
    if miss:
        print('⚠ 這些來源不存在，先確認：')
        for m in miss: print('   ' + m)
        return 1

    print('%d 個檔案要搬：\n' % len(MAP))
    for o in sorted(MAP): print('   %-52s → %s' % (o, MAP[o]))
    if DRY:
        print('\n(--dry：沒有動任何東西)')
        return 0

    for o, n in MAP.items():
        d = os.path.dirname(n)
        if d and not os.path.isdir(d): os.makedirs(d)
        r = sh('git', 'mv', o, n)
        if r.returncode:                      # 未追蹤的檔案 git mv 不動，退回一般搬移
            os.replace(o, n)

    # ── 改寫程式裡的路徑 ────────────────────────────────────────────
    # ⚠ 要保住 ?v=N 這種快取破壞參數；也要處理 flight 那邊的相對路徑
    #   （flight/index.html 用 '../resources/...' 與同層的裸檔名）。
    total = 0
    for s in SRCS:
        t = io.open(s, encoding='utf-8').read(); before = t
        for o, n in MAP.items():
            cands = [o]
            if s.startswith('flight/'):
                cands.append('../' + o)
                if o.startswith('flight/'): cands.append(o[len('flight/'):])
            # ⚠ 由長到短：先換短的話，'../'+o 裡面的 o 會先被命中，
            #   '../' 會留在前面變成 '../../'（實測就是這樣斷了一條）。
            for c in sorted(cands, key=len, reverse=True):
                rep = ('../' + n) if s.startswith('flight/') else n
                t = t.replace(c, rep)
        if t != before:
            io.open(s, 'w', encoding='utf-8', newline='').write(t)
            total += 1
            print('改寫 %s' % s)
    print('\n完成：%d 個檔案、%d 份程式碼' % (len(MAP), total))
    return 0


sys.exit(main())
