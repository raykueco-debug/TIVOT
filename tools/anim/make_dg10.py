# 產生 run_dg6.bat：dg2n_s7 同 seed 同提示詞，加低強度 LoRA 找回乳搖
B = chr(92)
s = open('run_dg5.bat', encoding='utf-8').read().split('\n')
pr = [l for l in s if '--suffix _n7' in l][0]
OLD = 'As her body jolts upward, her full breasts bounce up and down exactly once, a single soft vertical bounce with natural jiggle, then settle still; no side-to-side swinging.'
NEW = 'As she straightens up, her clasped hands press deep into her soft breasts. Soft breasts, jelly breasts: her breasts are very soft and jelly-like, the hands sink into them and the soft flesh squishes and bulges around the hands, wobbling softly like jelly from the pressure; they do not swing side to side.'
assert OLD in pr
py = '..' + B + '.venv' + B + 'Scripts' + B + 'python.exe '
ci = 'out' + B + 'ci' + B
log = ' >> out' + B + 'dg10.log 2>&1'
out = ['@echo off', 'cd /d "%~dp0"', 'set PYTHONIOENCODING=utf-8', ':w',
       'rem']
for suf, lora, name in (('_j3', ' --lora zxtp_wan22_bb_high.safetensors:0.3', 'dg3j_s7'),):
    l = pr.replace('nouvelle_dg2.png','nouvelle_dg3.png').replace('nouvelle_dg2_B.png','nouvelle_dg3_B.png').replace(OLD, NEW).replace('--suffix _n7', '--suffix ' + suf + lora).replace('> out' + B + 'dg5.log 2>&1', log)
    out += [l,
            py + 'rekey_solid.py nouvelle_dg3_7 ' + ci + 'nouvelle_dg3' + suf + 'k' + log,
            py + 'comp_black_embers.py ' + ci + 'nouvelle_dg3' + suf + 'k in_dg' + B + 'nouvelle_dg3.png ' + name + log,
            py + 'fix_magenta.py ' + ci + name + log,
            'C:' + B + 'ffmpeg' + B + 'bin' + B + 'ffmpeg.exe -loglevel error -y -framerate 16 -i ' + ci + name + B + 'frame_%%02d.webp -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 22 -preset slow -movflags +faststart -an ' + ci + name + '.mp4']
out += [py + 'make_player.py' + log, 'echo ALLDONE > out' + B + 'dg10_done.txt']
open('run_dg10.bat', 'w', encoding='utf-8').write('\n'.join(out))
print('\n'.join(x[:150] for x in out))
