# 2026-11-21 空戰動畫副理：GPT 交的空賊船單張 → 1536×1024、真 alpha、四邊各留 12%（裁邊＋等比縮放置中，不動像素內容）。
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA'); bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox(); im = im.crop(bb)
W, H, M = 1536, 1024, 0.12
s = min(W * (1 - 2 * M) / im.width, H * (1 - 2 * M) / im.height)
im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out.alpha_composite(im, ((W - im.width) // 2, (H - im.height) // 2))
out.save(dst, 'WEBP', quality=95, method=6) if dst.endswith('.webp') else out.save(dst)
print(dst, out.size, im.size)
