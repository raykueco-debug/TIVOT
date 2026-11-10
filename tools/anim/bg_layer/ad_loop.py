"""背景線：AnimateDiff 閉合循環樣本（Ray 11-10「都做」）。跑在另一個 ComfyUI（8190），不碰排程的 8188。
原圖複製 N 格 → img2img（denoise）＋ ControlNet tile 鎖構圖 ＋ AnimateDiff Looped 情境（closed_loop）⇒ 頭尾天生接上，不用 D→A 拉回。
用法：python ad_loop.py <notes key> <輸出名> "<英文提示詞>" [denoise 0.55] [格數 32] [seed 101] [tile 0.5]"""
import os, sys, json, time, urllib.request, uuid, subprocess
import numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); COMFY = os.path.dirname(os.path.dirname(HERE)); URL = 'http://127.0.0.1:8190'
key, name, pos = sys.argv[1:4]
den = float(sys.argv[4]) if len(sys.argv) > 4 else 0.55; N = int(sys.argv[5]) if len(sys.argv) > 5 else 32
seed = int(sys.argv[6]) if len(sys.argv) > 6 else 101; tile = float(sys.argv[7]) if len(sys.argv) > 7 else 0.5
j = json.load(open(os.path.join(HERE, 'notes', key, 'notes.json'), encoding='utf8'))
still_p = os.path.join(r'C:/Users/Ray Ku/Desktop/TIVOT/resources/background', j['file'])
inp = f'ad_{name}.png'; Image.open(still_p).convert('RGB').resize((768, 512), Image.LANCZOS).save(os.path.join(COMFY, 'input', inp))
neg = 'people, person, human, animal, text, watermark, blurry, lowres, deformed, camera movement, zoom'
g = {
 '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': 'Counterfeit-V3.0_fp16.safetensors'}},
 '2': {'class_type': 'ADE_LoadAnimateDiffModel', 'inputs': {'model_name': 'v3_sd15_mm.ckpt'}},
 '3': {'class_type': 'ADE_ApplyAnimateDiffModelSimple', 'inputs': {'motion_model': ['2', 0]}},
 '4': {'class_type': 'ADE_LoopedUniformContextOptions', 'inputs': {'context_length': 16, 'context_stride': 1, 'context_overlap': 4, 'closed_loop': True}},
 '5': {'class_type': 'ADE_UseEvolvedSampling', 'inputs': {'model': ['1', 0], 'beta_schedule': 'autoselect', 'm_models': ['3', 0], 'context_options': ['4', 0]}},
 '6': {'class_type': 'LoadImage', 'inputs': {'image': inp}},
 '7': {'class_type': 'RepeatImageBatch', 'inputs': {'image': ['6', 0], 'amount': N}},
 '8': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['7', 0], 'vae': ['1', 2]}},
 '9': {'class_type': 'CLIPTextEncode', 'inputs': {'text': pos, 'clip': ['1', 1]}},
 '10': {'class_type': 'CLIPTextEncode', 'inputs': {'text': neg, 'clip': ['1', 1]}},
 '11': {'class_type': 'ControlNetLoaderAdvanced', 'inputs': {'control_net_name': 'control_v11f1e_sd15_tile_fp16.safetensors'}},
 '12': {'class_type': 'ACN_AdvancedControlNetApply', 'inputs': {'vae_optional': ['1', 2], 'positive': ['9', 0], 'negative': ['10', 0], 'control_net': ['11', 0], 'image': ['7', 0], 'strength': tile, 'start_percent': 0.0, 'end_percent': 1.0}},
 '13': {'class_type': 'KSampler', 'inputs': {'model': ['5', 0], 'seed': seed, 'steps': 20, 'cfg': 7.0, 'sampler_name': 'euler_ancestral', 'scheduler': 'normal',
                                            'positive': ['12', 0], 'negative': ['12', 1], 'latent_image': ['8', 0], 'denoise': den}},
 '14': {'class_type': 'VAEDecode', 'inputs': {'samples': ['13', 0], 'vae': ['1', 2]}},
 '15': {'class_type': 'SaveImage', 'inputs': {'images': ['14', 0], 'filename_prefix': f'adl/{name}'}},
}
if tile <= 0:   # 內建 ControlNet 不支援滑動情境窗（要 Advanced-ControlNet），0 ＝ 不用
    for k in ('11', '12'): g.pop(k)
    g['13']['inputs']['positive'] = ['9', 0]; g['13']['inputs']['negative'] = ['10', 0]
t0 = time.time()
r = json.load(urllib.request.urlopen(urllib.request.Request(URL + '/prompt', json.dumps({'prompt': g, 'client_id': str(uuid.uuid4())}).encode(), {'Content-Type': 'application/json'})))
pid = r['prompt_id']; print('queued', pid, flush=True)
while True:
    h = json.load(urllib.request.urlopen(f'{URL}/history/{pid}'))
    if pid in h:
        st = h[pid].get('status', {})
        if st.get('status_str') == 'error': print('ERROR', json.dumps(st)[:800]); sys.exit(1)
        imgs = h[pid]['outputs']['15']['images']; break
    time.sleep(5)
fr = [os.path.join(COMFY, 'output', i['subfolder'], i['filename']) for i in imgs]
print('done', round(time.time() - t0), 's', len(fr), 'frames', flush=True)
still = np.array(Image.open(still_p).convert('RGB')); H, W = still.shape[:2]; H -= H % 2; W -= W % 2
out = os.path.join(HERE, 'out', name); os.makedirs(out, exist_ok=True)
p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '12', '-i', '-',
                      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', '-an', os.path.join(out, 'loop.mp4')], stdin=subprocess.PIPE)
for f in fr: p.stdin.write(cv2.resize(np.array(Image.open(f).convert('RGB')), (W, H), interpolation=cv2.INTER_LANCZOS4).tobytes())
p.stdin.close(); p.wait()
json.dump(dict(method='animatediff_loop', key=key, frames=len(fr), denoise=den, seed=seed, tile=tile, prompt=pos), open(os.path.join(out, 'meta.json'), 'w'), ensure_ascii=False)
print(out)
