"""背景線：VACE 硬鎖首尾成同一張圖 → 真正接得上的循環（FLF 鎖不住尾：實測最後一格與第一格差得跟中間一樣多）。
control：第 0 格＝原圖、中間＝灰（生成）、最後一格＝原圖；mask：黑（照抄）／白（生成）／黑。
播放時丟掉最後一格（它＝第 0 格）。
用法：python bg_vace_loop.py <圖> <輸出前綴> <length 4n+1> "<提示詞>" [seed] [WxH]
"""
import os, sys, types
args = sys.argv[1:]
size = args[5] if len(args) > 5 else '768x512'
os.environ['TIVOT_GEN'] = size
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
import tivot_wan as tw, tivot_vace as tv
from PIL import Image
src, prefix, L, pos = args[0], args[1], int(args[2]), args[3]
seed = int(args[4]) if len(args) > 4 else 101
inp = os.path.join(tw.COMFY, 'input'); tag = prefix.replace('/', '_')
Image.open(src).convert('RGB').resize((tw.W, tw.H), Image.LANCZOS).save(os.path.join(inp, f'bgv_{tag}_k.png'))
Image.new('RGB', (tw.W, tw.H), tv.GRAY).save(os.path.join(inp, f'bgv_{tag}_g.png'))
Image.new('RGB', (tw.W, tw.H), (0, 0, 0)).save(os.path.join(inp, f'bgv_{tag}_m0.png'))
Image.new('RGB', (tw.W, tw.H), (255, 255, 255)).save(os.path.join(inp, f'bgv_{tag}_m1.png'))
ctrl = [f'bgv_{tag}_k.png'] + [f'bgv_{tag}_g.png'] * (L - 2) + [f'bgv_{tag}_k.png']
mask = [f'bgv_{tag}_m0.png'] + [f'bgv_{tag}_m1.png'] * (L - 2) + [f'bgv_{tag}_m0.png']
a = types.SimpleNamespace(lora_high='wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors',
                          lora_low='wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors',
                          shift=5.0, strength=1.0, neg_extra='', steps=4, cfg=1.0, hi_end=0, pre=0, pre_cfg=3.0)
tw.ensure_server()
print('▶', prefix, L, 'frames', size, 'seed', seed, flush=True)
paths, secs = tv.run(tv.graph(ctrl, mask, L, pos, seed, prefix, a))
print('done', round(secs), 's', len(paths), 'frames', flush=True)
