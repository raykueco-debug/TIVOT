# 2026-11-15 Ray（卡耶爾檢怪頁提交）：Wan 補 5 支 —— 高蹺細影 I 出框重跑、香爐蠍 I 加呼吸感、聖面鷲／骨鴉 A 閃現消失、崖縫吊屍者 A 張手咆哮
import os, subprocess, time
HERE = os.path.dirname(os.path.abspath(__file__))
EN = r'C:\Users\User\Desktop\TIVOT\resources\enemy'
KF = os.path.join(EN, '_neutral_refs', 'canyon_kf', 'kling', 'idle_src')
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
TAIL = '鏡頭完全固定不動，背景始終是純綠色，主體始終完整留在畫面中央、不出框、大小不變、肢體數量不變。動漫風格，賽璐珞上色。'
JOBS = [
 ('kling_idle', os.path.join(KF, 'stilt_kling0.png'), '0.74', '_fit74', 9162, None,
  'a thin stilt shade monster idles in its crouched ready stance, natural slow breathing, claws twitching, cloth strips swaying, whole body stays fully inside the frame, camera fixed, plain green background, anime cel shading, clean lineart'),
 ('kling_idle', os.path.join(EN, 'mon_canyon_censer_dark.webp'), '0.82', '_breath', 9202, None,
  '一隻怪物，在純綠色背景前的原地，姿勢不變。明顯的呼吸：每兩秒一次深而慢的呼吸，吸氣時整個身體與背甲明顯膨起、整體上抬，吐氣時明顯沉下回落，看得清楚的起伏；尾巴末端的香爐隨呼吸輕輕晃動、冒出細煙。腳與鉗子維持原位，不要舉起。最後回到開始的姿勢。' + TAIL),
 ('canyon_wanA', os.path.join(EN, 'mon_canyon_hanged_dark.webp'), '0.72', '', 9301, None,
  '一隻吊掛的怪物，在純綠色背景前的原地：先縮起身體蓄力，接著雙臂猛然向兩側張開到最大，頭往後仰再朝鏡頭張大嘴咆哮，身體與吊索劇烈震動，布幔與鎖鏈被甩開；咆哮停住一瞬。手臂張開時也不可超出畫面。' + TAIL),
 ('canyon_wanA', os.path.join(EN, 'mon_canyon_saintvulture_dark.webp'), '0.60', '', 9311, None,
  '一隻飛行的怪物，在純綠色背景前的空中原地懸停：翅膀猛力拍一下，全身閃出一道強光，身體瞬間化為黑色煙影向四周散開消失，畫面只剩純綠色背景一瞬間，接著黑煙從原處收攏，怪物在原位置重新現形、回到開始的姿勢。不要飛走、不要靠近鏡頭。' + TAIL),
 ('canyon_wanA', os.path.join(EN, 'mon_canyon_bonecrow_dark.webp'), '0.70', '', 9321, None,
  '一隻飛行的怪物，在純綠色背景前的空中原地懸停：翅膀猛力拍一下，全身閃出一道強光，身體瞬間化為黑色煙影向四周散開消失，畫面只剩純綠色背景一瞬間，接著黑煙從原處收攏，怪物在原位置重新現形、回到開始的姿勢。不要飛走、不要靠近鏡頭。' + TAIL),
]
for i, (od, src, fit, suf, seed, _, prm) in enumerate(JOBS):
    print(time.strftime('%H:%M'), os.path.basename(src), suf, flush=True)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', src, '--mode', 'idle', '--fps', '16', '--length', '49',
                    '--seed', str(seed), '--prompt', prm, '--out', os.path.join(HERE, 'out', od)] + (['--suffix', suf] if suf else []),
                   env={**os.environ, 'PYTHONIOENCODING': 'utf-8', 'TIVOT_FIT': fit})
    if i < len(JOBS) - 1: time.sleep(60)
print('全部完成', flush=True)
