"""背景線：VACE 鎖死版循環（Ray 11-10「都做」：試 Wan 之外的路）。
同 bg_vace_loop：第 0 格與最後一格整張＝原圖（首尾必定接上，不會倒車）；
另外中間每一格只有「動區」交給模型生成，動區以外一律照抄原圖（骨頭、岩石在模型端就鎖死，不靠事後蓋原圖）。
用法：python bg_vace_lock.py <notes key> <輸出前綴> <length 4n+1> "<提示詞>" [seed] [動區外擴px]
動區＝notes 裡 Ray 畫的各色遮罩聯集（不自己畫）。"""
import os, sys, types, json
import numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
key, prefix, L, pos = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
seed = int(sys.argv[5]) if len(sys.argv) > 5 else 101
grow = int(sys.argv[6]) if len(sys.argv) > 6 else 24
os.environ['TIVOT_GEN'] = '768x512'
import tivot_wan as tw, tivot_vace as tv
j = json.load(open(os.path.join(HERE, 'notes', key, 'notes.json'), encoding='utf8'))
src = Image.open(os.path.join(r'C:/Users/Ray Ku/Desktop/TIVOT/resources/background', j['file'])).convert('RGB').resize((tw.W, tw.H), Image.LANCZOS)
mv = np.zeros((tw.H, tw.W), np.uint8)
for c in j['colors']:
    mv |= (np.array(Image.open(os.path.join(HERE, 'notes', key, c['mask'])).convert('L').resize((tw.W, tw.H))) > 127).astype(np.uint8)
mv = cv2.dilate(mv, np.ones((grow * 2 + 1,) * 2, np.uint8)) > 0
inp = os.path.join(tw.COMFY, 'input'); tag = prefix.replace('/', '_')
s = np.array(src); mid = s.copy(); mid[mv] = tv.GRAY
src.save(os.path.join(inp, f'bgl_{tag}_k.png')); Image.fromarray(mid).save(os.path.join(inp, f'bgl_{tag}_c.png'))
Image.new('RGB', (tw.W, tw.H), (0, 0, 0)).save(os.path.join(inp, f'bgl_{tag}_m0.png'))
Image.fromarray(np.repeat((mv * 255).astype(np.uint8)[..., None], 3, 2)).save(os.path.join(inp, f'bgl_{tag}_m1.png'))
ctrl = [f'bgl_{tag}_k.png'] + [f'bgl_{tag}_c.png'] * (L - 2) + [f'bgl_{tag}_k.png']
mask = [f'bgl_{tag}_m0.png'] + [f'bgl_{tag}_m1.png'] * (L - 2) + [f'bgl_{tag}_m0.png']
a = types.SimpleNamespace(lora_high='wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors',
                          lora_low='wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors',
                          shift=5.0, strength=1.0, neg_extra='', steps=4, cfg=1.0, hi_end=0, pre=0, pre_cfg=3.0)
tw.ensure_server()
print('▶', prefix, L, 'frames seed', seed, '動區', round(mv.mean() * 100, 1), '%', flush=True)
paths, secs = tv.run(tv.graph(ctrl, mask, L, pos, seed, prefix, a))
print('done', round(secs), 's', len(paths), 'frames', flush=True)
