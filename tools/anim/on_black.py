import sys
from PIL import Image
for s, d in zip(sys.argv[1::2], sys.argv[2::2]):
    im = Image.open(s).convert('RGBA'); bg = Image.new('RGBA', im.size, (0, 0, 0, 255)); bg.alpha_composite(im); bg.convert('RGB').save(d)
