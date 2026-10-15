# 產生 run_dg6.bat：dg2n_s7 同 seed 同提示詞，加低強度 LoRA 找回乳搖
B = chr(92)
s = open('run_dg5.bat', encoding='utf-8').read().split('\n')
pr = [l for l in s if '--suffix _n7' in l][0]
OLD = 'As her body jolts upward, her full breasts bounce up and down exactly once, a single soft vertical bounce with natural jiggle, then settle still; no side-to-side swinging.'
NEW = 'As she straightens up, her clasped hands press into her soft breasts, the soft breasts visibly yield and squish under the pressure of her hands and arms, soft and squishy, naturally deforming; they do not swing.'
assert OLD in pr
py = '..' + B + '.venv' + B + 'Scripts' + B + 'python.exe '
ci = 'out' + B + 'ci' + B
log = ' >> out' + B + 'dg8.log 2>&1'
out = ['@echo off', 'cd /d "%~dp0"', 'set PYTHONIOENCODING=utf-8', ':w',
       'if not exist out' + B + 'dg7_done.txt ( timeout /t 15 /nobreak >nul & goto w )']
for suf, lora, name in (('_p7', '', 'dg2p_s7'), ('_pb3', ' --lora zxtp_wan22_bb_high.safetensors:0.3', 'dg2pb3_s7')):
    l = pr.replace(OLD, NEW).replace('--suffix _n7', '--suffix ' + suf + lora).replace('> out' + B + 'dg5.log 2>&1', log)
    out += [l,
            py + 'rekey_solid.py nouvelle_dg2_7 ' + ci + 'nouvelle_dg2' + suf + 'k' + log,
            py + 'comp_black_embers.py ' + ci + 'nouvelle_dg2' + suf + 'k in_dg' + B + 'nouvelle_dg2.png ' + name + log,
            py + 'fix_magenta.py ' + ci + name + log,
            'C:' + B + 'ffmpeg' + B + 'bin' + B + 'ffmpeg.exe -loglevel error -y -framerate 16 -i ' + ci + name + B + 'frame_%%02d.webp -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 22 -preset slow -movflags +faststart -an ' + ci + name + '.mp4']
out += [py + 'make_player.py' + log, 'echo ALLDONE > out' + B + 'dg8_done.txt']
open('run_dg8.bat', 'w', encoding='utf-8').write('\n'.join(out))
print('\n'.join(x[:150] for x in out))
