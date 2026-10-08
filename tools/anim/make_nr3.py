# 產生 run_nr3.bat：安雅 A（黑底無特效）→ Bfx（原圖紫焰、背景壓黑），紫焰長出來並留到最後
B = chr(92)
PR = ('Anime illustration, smooth continuous animation. Pure black background. The girl with long lavender hair starts curled up '
      'with her head bowed and eyes closed, hands clasped at her chest. From the very first frame, glowing purple flame-like aura '
      'slowly rises around her: soft violet light wisps stream upward from her hair and body like purple fire, wrapping around her '
      'and flowing upward, glowing violet streaks drift through the darkness, growing stronger and stronger. Her long hair is '
      'tinged with purple glow and lifts in the rising aura. She slowly lifts her head, her shoulders open up, she opens her eyes, '
      'looks straight at the viewer and speaks to the viewer. Her hands stay clasped at her chest the whole time. No smoke, no fog. '
      'Camera completely static, the framing and her size stay the same, background always black. Anime style, cel shading, clean lineart.')
py = '..' + B + '.venv' + B + 'Scripts' + B + 'python.exe '
ci = 'out' + B + 'ci' + B
log = ' >> out' + B + 'nr3.log 2>&1'
out = ['@echo off', 'cd /d "%~dp0"', 'set PYTHONIOENCODING=utf-8', ':w',
       'if not exist out' + B + 'misha_done.txt ( timeout /t 15 /nobreak >nul & goto w )']
for seed in (7, 77):
    name = 'nr_fx%d' % seed
    out += [py + 'tivot_wan.py --mode ci --files in_nr' + B + 'anya_nr.png --end in_nr' + B + 'anya_nr_Bfx.png --out out' + B + 'ci --length 49 --fps 16 --seed %d --suffix _fx%d --prompt "%s"' % (seed, seed, PR) + log,
            py + 'embers2.py ' + ci + 'anya_nr_fx%d ' % seed + ci + name + ' 110 35' + log,
            'C:' + B + 'ffmpeg' + B + 'bin' + B + 'ffmpeg.exe -loglevel error -y -framerate 16 -i ' + ci + name + B + 'frame_%%02d.webp -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 22 -preset slow -movflags +faststart -an ' + ci + name + '.mp4']
out += [py + 'make_player.py' + log, 'echo ALLDONE > out' + B + 'nr3_done.txt']
open('run_nr3.bat', 'w', encoding='utf-8').write('\n'.join(out))
print('\n'.join(x[:120] for x in out))
