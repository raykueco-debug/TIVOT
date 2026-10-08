import os, subprocess, sys
from PIL import Image, ImageDraw
S = r'C:\Users\RAYKU~1\AppData\Local\Temp\claude\C--Users-Ray-Ku-Desktop-TIVOT\ff6be655-022e-4082-abd5-45f44ccca3cc\scratchpad'
src = 'in_nr/anya_nr_Bfx.png'
levels = [('A', 0.0), ('B', 0.33), ('C', 0.66), ('D', 1.0)]
for lab, t in levels:
    subprocess.run([sys.executable, 'blue_eyes.py', src, os.path.join(S, 'be_%s.png' % lab), str(t)], check=True)
c = Image.new('RGB', (5 * 430, 240), (30, 30, 30)); d = ImageDraw.Draw(c)
ims = [('orig', Image.open(src))] + [(lab, Image.open(os.path.join(S, 'be_%s.png' % lab))) for lab, _ in levels]
for k, (lab, im) in enumerate(ims):
    c.paste(im.convert('RGB').crop((280, 220, 700, 420)), (k * 430, 30)); d.text((k * 430 + 6, 8), lab, fill=(255, 255, 255))
c.save(os.path.join(S, 'eye_levels.png'))
