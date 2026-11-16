# 2026-11-16 Ray：聖面鷲／骨鴉 A＝瞬間移動消失（七龍珠那種），A→B（GPT 畫的橫向殘影 B），交件時倒放接回現形
import os, subprocess, time
HERE = os.path.dirname(os.path.abspath(__file__))
K = r'C:\Users\User\Desktop\TIVOT\resources\enemy\_neutral_refs\canyon_kf\wan'
PY = os.path.join(HERE, '..', '.venv', 'Scripts', 'python.exe')
P = ('一隻飛行怪物在純綠色背景前原地展翅懸停，先微微一頓，接著像瞬間移動一樣「咻」地閃掉：整個身體被橫向拉扯成一道道水平錯位的條狀殘影，'
     '快速變淡、變透明，最後只剩淡淡的殘影。不要爆光、不要煙霧、不要變大、不要飛走。鏡頭完全固定不動，背景始終是純綠色，主體始終留在畫面中央、不出框。動漫風格，賽璐珞上色。')
for i, (por, fit, seed) in enumerate([('mon_canyon_saintvulture_dark', '0.60', 9411), ('mon_canyon_bonecrow_dark', '0.70', 9421)]):
    print(time.strftime('%H:%M'), por, flush=True)
    subprocess.run([PY, '-X', 'utf8', os.path.join(HERE, 'tivot_wan.py'), '--files', os.path.join(K, por + '_blinkA.png'), '--end', os.path.join(K, por + '_blinkB.png'),
                    '--mode', 'idle', '--fps', '16', '--length', '33', '--seed', str(seed), '--prompt', P, '--out', os.path.join(HERE, 'out', 'canyon_wanA')],
                   env={**os.environ, 'PYTHONIOENCODING': 'utf-8', 'TIVOT_FIT': fit})
    if i == 0: time.sleep(60)
print('全部完成', flush=True)
