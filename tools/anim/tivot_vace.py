"""Plan A：關鍵格＋格號，Wan2.2 VACE 一次生成（見 resources/ci/layers/torsten_bulletrain/PLAN_A.md）。

把幾張去背的關鍵格（原畫）釘在指定的格號上（律表），其餘格由 VACE 補出來。
速度＝間隔：兩張關鍵格之間隔得越少，那一段動得越快；過渡模糊格原封不動卡在它的格號上。

做法（ComfyUI 內建 WanVaceToVideo）：
  control_video ＝ length 張：關鍵格那幾格放關鍵格（綠底），其餘放 50% 灰
  control_masks ＝ 關鍵格那幾格 0（照抄）、其餘 1（生成）
mask 用「灰／白圖 → ImageToMask」做，所以全程只靠內建節點（LoadImage／ImageBatch／ImageToMask）。

用法：
  python tivot_vace.py --key 0:A.png --key 6:B3.png --key 20:C.png --length 25 --seed 7 --name br_planA
  ⚠ length 必須 4n+1；格號從 0 起算、要 < length。
  ⚠ 最後一格是 length-1；C 要停在結尾就釘在 length-1。
輸出：tivot_wan/out/vace/<name>_s<seed>/frame_NN.webp（已去綠幕）＋ sheet.jpg ＋ preview.html（播一次停在最後）＋ meta.json

⚠ LightX2V 那兩支是 **I2V** 的 4 步 LoRA；VACE-Fun 是從 T2V 長出來的，I2V 的 LoRA 不一定對得上。
  預設不掛 LoRA、走一般步數（--steps 20 --cfg 3.5，慢）；有 T2V 版 lightx2v 再用 --lora-high/--lora-low 掛上、改 4 步 cfg 1。
"""
import os, sys, json, time, argparse, urllib.request
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tivot_wan as tw          # 共用 COMFY／URL／W／H／to_green／key／ensure_server／NEG

VACE_HIGH = 'Wan2.2-VACE-Fun-A14B-high-noise-Q4_K_M.gguf'
VACE_LOW = 'Wan2.2-VACE-Fun-A14B-low-noise-Q4_K_M.gguf'
GRAY = (128, 128, 128)

def prep_inputs(keys, length, tag):
    """寫 control 格與 mask 格到 ComfyUI input，回傳 (control 檔名清單, mask 檔名清單)。"""
    inp = os.path.join(tw.COMFY, 'input')
    gray = Image.new('RGB', (tw.W, tw.H), GRAY)
    black, white = Image.new('RGB', (tw.W, tw.H), (0, 0, 0)), Image.new('RGB', (tw.W, tw.H), (255, 255, 255))
    gray_n, black_n, white_n = f'vace_{tag}_gray.png', f'vace_{tag}_m0.png', f'vace_{tag}_m1.png'
    gray.save(os.path.join(inp, gray_n)); black.save(os.path.join(inp, black_n)); white.save(os.path.join(inp, white_n))
    ctrl, mask = [], []
    for i in range(length):
        if i in keys:
            n = f'vace_{tag}_k{i:02d}.png'
            tw.to_green(keys[i], 'idle').save(os.path.join(inp, n))   # ⚠ 所有關鍵格同一個 fit（idle 0.92），比例才一致
            ctrl.append(n); mask.append(black_n)
        else:
            ctrl.append(gray_n); mask.append(white_n)
    return ctrl, mask

def batch_chain(g, names, start_id, prefix):
    """LoadImage × N → ImageBatch 串起來，回傳最後一個節點 id。"""
    ids = []
    cache = {}
    nid = start_id
    for n in names:
        if n not in cache:
            g[str(nid)] = {'class_type': 'LoadImage', 'inputs': {'image': n}}; cache[n] = str(nid); nid += 1
        ids.append(cache[n])
    cur = ids[0]
    for b in ids[1:]:
        g[str(nid)] = {'class_type': 'ImageBatch', 'inputs': {'image1': [cur, 0], 'image2': [b, 0]}}
        cur = str(nid); nid += 1
    return cur, nid

def graph(ctrl, mask, length, pos, seed, prefix, a):
    g = {
     '1': {'class_type': 'UnetLoaderGGUF', 'inputs': {'unet_name': VACE_HIGH}},
     '2': {'class_type': 'UnetLoaderGGUF', 'inputs': {'unet_name': VACE_LOW}},
     '7': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', 'type': 'wan', 'device': 'default'}},
     '8': {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['7', 0], 'text': pos}},
     '9': {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['7', 0], 'text': tw.NEG}},
     '10': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'wan_2.1_vae.safetensors'}},
    }
    hi, lo = ['1', 0], ['2', 0]
    if a.lora_high:
        g['3'] = {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': hi, 'lora_name': a.lora_high, 'strength_model': 1.0}}; hi = ['3', 0]
    if a.lora_low:
        g['4'] = {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': lo, 'lora_name': a.lora_low, 'strength_model': 1.0}}; lo = ['4', 0]
    g['5'] = {'class_type': 'ModelSamplingSD3', 'inputs': {'model': hi, 'shift': a.shift}}
    g['6'] = {'class_type': 'ModelSamplingSD3', 'inputs': {'model': lo, 'shift': a.shift}}
    cv, nid = batch_chain(g, ctrl, 100, 'c')
    mv, nid = batch_chain(g, mask, nid, 'm')
    g[str(nid)] = {'class_type': 'ImageToMask', 'inputs': {'image': [mv, 0], 'channel': 'red'}}; mk = str(nid); nid += 1
    g['12'] = {'class_type': 'WanVaceToVideo', 'inputs': {'positive': ['8', 0], 'negative': ['9', 0], 'vae': ['10', 0],
               'width': tw.W, 'height': tw.H, 'length': length, 'batch_size': 1, 'strength': a.strength,
               'control_video': [cv, 0], 'control_masks': [mk, 0]}}
    half = a.steps // 2
    g['13'] = {'class_type': 'KSamplerAdvanced', 'inputs': {'model': ['5', 0], 'add_noise': 'enable', 'noise_seed': seed, 'steps': a.steps, 'cfg': a.cfg,
               'sampler_name': 'euler', 'scheduler': 'simple', 'positive': ['12', 0], 'negative': ['12', 1], 'latent_image': ['12', 2],
               'start_at_step': 0, 'end_at_step': half, 'return_with_leftover_noise': 'enable'}}
    g['14'] = {'class_type': 'KSamplerAdvanced', 'inputs': {'model': ['6', 0], 'add_noise': 'disable', 'noise_seed': seed, 'steps': a.steps, 'cfg': a.cfg,
               'sampler_name': 'euler', 'scheduler': 'simple', 'positive': ['12', 0], 'negative': ['12', 1], 'latent_image': ['13', 0],
               'start_at_step': half, 'end_at_step': 10000, 'return_with_leftover_noise': 'disable'}}
    g['17'] = {'class_type': 'TrimVideoLatent', 'inputs': {'samples': ['14', 0], 'trim_amount': ['12', 3]}}
    g['15'] = {'class_type': 'VAEDecode', 'inputs': {'samples': ['17', 0], 'vae': ['10', 0]}}
    g['16'] = {'class_type': 'SaveImage', 'inputs': {'images': ['15', 0], 'filename_prefix': prefix}}
    return g

def run(g):
    req = urllib.request.Request(tw.URL + '/prompt', data=json.dumps({'prompt': g}).encode(), headers={'Content-Type': 'application/json'})
    pid = json.load(urllib.request.urlopen(req))['prompt_id']; t0 = time.time()
    while True:
        time.sleep(5)
        if not tw.server_up(): raise RuntimeError('ComfyUI 中途停止（多半是記憶體不足）')
        h = json.load(urllib.request.urlopen(f'{tw.URL}/history/{pid}'))
        if pid in h:
            st = h[pid].get('status', {})
            if st.get('status_str') == 'error': raise RuntimeError(json.dumps(st)[:1200])
            imgs = h[pid]['outputs']['16']['images']
            return [os.path.join(tw.COMFY, 'output', i.get('subfolder', ''), i['filename']) for i in imgs], time.time() - t0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--key', action='append', required=True, help='格號:圖檔（去背 PNG），可重複')
    ap.add_argument('--length', type=int, required=True, help='總格數（4n+1，16fps）')
    ap.add_argument('--seed', type=int, default=7)
    ap.add_argument('--name', default='planA')
    ap.add_argument('--prompt', default='一位黑色神父制服的男子站在純綠色背景前，仰角鏡頭。動作流暢連貫、節奏有快有慢。'
                    '鏡頭完全固定不動，背景始終是純綠色，人物大小與位置不變。動漫風格，賽璐珞上色。')
    ap.add_argument('--steps', type=int, default=20)
    ap.add_argument('--cfg', type=float, default=3.5)
    ap.add_argument('--shift', type=float, default=5.0)
    ap.add_argument('--strength', type=float, default=1.0)
    ap.add_argument('--lora-high'); ap.add_argument('--lora-low')
    ap.add_argument('--out', default=os.path.join(HERE, 'out', 'vace'))
    a = ap.parse_args()
    if (a.length - 1) % 4: sys.exit('length 必須 4n+1')
    keys = {}
    for k in a.key:
        i, _, p = k.partition(':'); i = int(i)
        if not (0 <= i < a.length): sys.exit(f'格號 {i} 超出 0..{a.length - 1}')
        keys[i] = p
    tag = f'{a.name}_s{a.seed}'
    ctrl, mask = prep_inputs(keys, a.length, tag)
    tw.ensure_server()
    print(f'▶ {tag}  length={a.length}  keys={sorted(keys)}  steps={a.steps} cfg={a.cfg}', flush=True)
    paths, secs = run(graph(ctrl, mask, a.length, a.prompt, a.seed, f'tivotvace/{tag}', a))
    od = os.path.join(a.out, tag); os.makedirs(od, exist_ok=True)
    files = []
    for j, p in enumerate(paths):
        im = tw.key(np.asarray(Image.open(p).convert('RGB')).astype(np.float32))
        fn = f'frame_{j:02d}.webp'; im.save(os.path.join(od, fn), 'WEBP', quality=90); files.append(fn)
    tw_, th = 160, 240; cols = min(len(files), 10); rows = (len(files) + cols - 1) // cols
    sh = Image.new('RGB', (cols * tw_, rows * th), (30, 30, 38))
    for j, fn in enumerate(files):
        t = Image.open(os.path.join(od, fn)).convert('RGBA').resize((tw_, th)); sh.paste(t, ((j % cols) * tw_, (j // cols) * th), t)
        if j in keys:   # 關鍵格加框，一眼看出律表
            from PIL import ImageDraw; ImageDraw.Draw(sh).rectangle(((j % cols) * tw_, (j // cols) * th, (j % cols + 1) * tw_ - 1, (j // cols + 1) * th - 1), outline=(255, 210, 0), width=3)
    sh.save(os.path.join(od, 'sheet.jpg'), quality=88)
    open(os.path.join(od, 'preview.html'), 'w', encoding='utf-8').write(f'''<!doctype html><meta charset="utf-8"><title>{tag}</title>
<body style="margin:0;background:#000;color:#ddd;font-family:sans-serif;text-align:center">
<p>{tag}｜{len(files)} 格 16fps｜關鍵格 {sorted(keys)}</p><button onclick="play()" style="padding:8px 20px">重播</button>
<div style="width:480px;margin:10px auto"><img id="im" src="{files[0]}" style="width:480px"></div>
<script>const F={json.dumps(files)};F.forEach(u=>{{new Image().src=u}});
async function play(){{const im=document.getElementById('im');for(const u of F){{im.src=u;await new Promise(x=>setTimeout(x,62.5));}}}}play();</script>''')
    json.dump({'name': tag, 'keys': {str(k): v for k, v in keys.items()}, 'length': a.length, 'seed': a.seed, 'steps': a.steps,
               'cfg': a.cfg, 'wan_seconds': round(secs), 'prompt': a.prompt, 'frames': files},
              open(os.path.join(od, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'  ✔ {len(files)} 格，VACE {round(secs)} 秒 → {od}', flush=True)

if __name__ == '__main__':
    main()
