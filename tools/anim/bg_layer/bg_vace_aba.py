"""背景線：ABA 硬鎖（VACE）—— 第 0 格＝A、正中間＝B、最後一格＝A，其餘交給模型補。
FLF 兩段（A→B、B→A）鎖不住尾格，接點會跳（斷崖邊草 11-11 實測接點差 15~16，平常 2~4）；VACE 三格都是硬鎖。
播放時丟掉最後一格（它＝第 0 格）。
用法：python bg_vace_aba.py <A 檔名(在 ComfyUI input)> <B 檔名> <輸出前綴> <length 4n+1> "<提示詞>" [seed]"""
import os, sys, types
os.environ['TIVOT_GEN'] = '768x512'
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
import tivot_wan as tw, tivot_vace as tv
from PIL import Image
A, B, prefix, L, pos = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]
seed = int(sys.argv[6]) if len(sys.argv) > 6 else 101
inp = os.path.join(tw.COMFY, 'input'); tag = prefix.replace('/', '_')
Image.new('RGB', (tw.W, tw.H), tv.GRAY).save(os.path.join(inp, f'bga_{tag}_g.png'))
Image.new('RGB', (tw.W, tw.H), (0, 0, 0)).save(os.path.join(inp, f'bga_{tag}_m0.png'))
Image.new('RGB', (tw.W, tw.H), (255, 255, 255)).save(os.path.join(inp, f'bga_{tag}_m1.png'))
mid = (L - 1) // 2
ctrl = [f'bga_{tag}_g.png'] * L; mask = [f'bga_{tag}_m1.png'] * L
for k, img in ((0, A), (mid, B), (L - 1, A)): ctrl[k] = img; mask[k] = f'bga_{tag}_m0.png'
a = types.SimpleNamespace(lora_high='wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors',
                          lora_low='wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors',
                          shift=5.0, strength=1.0, neg_extra='', steps=4, cfg=1.0, hi_end=0, pre=0, pre_cfg=3.0)
tw.ensure_server()
print('▶', prefix, L, 'frames seed', seed, flush=True)
paths, secs = tv.run(tv.graph(ctrl, mask, L, pos, seed, prefix, a))
print('done', round(secs), 's', len(paths), 'frames', flush=True)
