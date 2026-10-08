# 產生 run_dg6.bat：dg2n_s7 同 seed 同提示詞，加低強度 LoRA 找回乳搖
B = chr(92)
s = open('run_dg5.bat', encoding='utf-8').read().split('\n')
pr = [l for l in s if '--suffix _n7' in l][0]
py = '..' + B + '.venv' + B + 'Scripts' + B + 'python.exe '
ci = 'out' + B + 'ci' + B
log = ' >> out' + B + 'dg6.log 2>&1'
out = ['@echo off', 'cd /d "%~dp0"', 'set PYTHONIOENCODING=utf-8', ':w',
       'if not exist out' + B + 'misha_done.txt ( timeout /t 15 /nobreak >nul & goto w )']
for suf, lora, name in (('_b3', ' --lora zxtp_wan22_bb_high.safetensors:0.3', 'dg2b3_s7'),
                        ('_mo4', ' --lora zxtp_wan22_m0tt0_high.safetensors:0.4 --lora-low zxtp_wan22_m0tt0_low.safetensors:0.4', 'dg2mo4_s7')):
    l = pr.replace('--suffix _n7', '--suffix ' + suf + lora).replace('> out' + B + 'dg5.log 2>&1', log)
    out += [l,
            py + 'rekey_solid.py nouvelle_dg2_7 ' + ci + 'nouvelle_dg2' + suf + 'k' + log,
            py + 'comp_black_embers.py ' + ci + 'nouvelle_dg2' + suf + 'k in_dg' + B + 'nouvelle_dg2.png ' + name + log,
            py + 'fix_magenta.py ' + ci + name + log,
            'C:' + B + 'ffmpeg' + B + 'bin' + B + 'ffmpeg.exe -loglevel error -y -framerate 16 -i ' + ci + name + B + 'frame_%%02d.webp -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 22 -preset slow -movflags +faststart -an ' + ci + name + '.mp4']
out += [py + 'make_player.py' + log, 'echo ALLDONE > out' + B + 'dg6_done.txt']
open('run_dg6.bat', 'w', encoding='utf-8').write('\n'.join(out))
print('\n'.join(x[:150] for x in out))
