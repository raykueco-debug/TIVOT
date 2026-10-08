"""TIVOT 動檔工具：去背立繪 → 綠底 → 本機 Wan 2.2 I2V → 去閃動 → 去綠幕 → 抽格 → WebP ＋ 預覽頁。

用法
  雙擊 run.bat                          處理 in\ 裡所有圖（預設 hit 模式）
  python tivot_wan.py --mode idle       待機循環模式
  python tivot_wan.py --only 檔名 --seed 123 --mode hit
  python tivot_wan.py --files a.png b.png --out D:\\xxx     （給 Claude 自動批量用）

每張圖可以放一個同名 .txt 在 in\：第一行＝這隻的長相描述（會塞進提示詞），
  可加 `mode=idle`、`seed=123`、`frames=10`、`fps=8` 這類設定（一行一個）。
輸出：out\<檔名>\frame_00.webp …、sheet.jpg（總覽）、preview.html（播放頁）、meta.json。
"""
import argparse, glob, json, os, random, sys, time, urllib.request, subprocess
import numpy as np
from PIL import Image, ImageDraw
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
COMFY = os.path.dirname(HERE)
URL = 'http://127.0.0.1:8188'
W, H = 480, 720
GREEN = (0, 255, 0)

PROMPT = {
 'hit': ('{desc}正面面對鏡頭，站在純綠色背景前。他的胸口被子彈擊中，上半身猛然往後仰、頭往後甩，'
         '接著膝蓋發軟、單膝跪地，上身朝鏡頭往前栽。⚠ 人物身上與畫面上完全沒有血：沒有血跡、沒有血滴、沒有噴血、沒有紅色液體、沒有傷口；也完全沒有槍火：沒有槍口火光、沒有子彈、沒有彈著點的火花或閃光、沒有煙、沒有爆炸、沒有任何光效。衣服與身體保持乾淨，畫面上只有人物的動作。鏡頭完全固定不動，背景始終是純綠色，人物始終正面面對鏡頭。動漫風格，賽璐珞上色。'),
 'idle': ('{desc}在純綠色背景前的原地，姿勢完全不變。待機動作只有呼吸：身體隨著緩慢、自然的呼吸起伏，'
          '吸氣時胸腹與背部微微膨起、整體稍稍上抬，吐氣時回落，像野獸在喘息；頭部隨呼吸輕微晃動。'
          '手臂、前肢、爪子、翅膀都維持原本的位置，不要舉手、不要抬手、不要揮動、不要伸出去；毛髮、布料與火焰隨呼吸輕輕飄動。最後回到開始的姿勢。'
          '鏡頭完全固定不動，背景始終是純綠色，主體始終在畫面中央、大小不變、肢體數量不變。動漫風格，賽璐珞上色。'),
 'portrait': ('{desc}站在純綠色背景前，姿勢不變。她正在明顯地深呼吸：吸氣時肩膀與胸口整體往上抬、頭部跟著微微上移，'
              '吐氣時肩膀與胸口往下沉、頭部跟著回落，這個垂直的起伏要清楚看得出來，大約兩次完整的呼吸；'
              '頭髮的髮梢與長髮隨著起伏與微風輕輕飄動。臉部的五官與表情完全不變、不要眨眼、不要轉頭；手與腳的位置不變。最後回到開始的樣子。'
              '鏡頭完全固定不動，背景始終是純綠色，人物大小不變。動漫風格，賽璐珞上色。'),
}
# idle 的分系提示詞（--style；預設＝上面的 PROMPT['idle']）
IDLE_STYLE = {
 'beast': ('{desc}在純綠色背景前的原地，伏低身體、重心壓低、頭垂低，像受傷又戒備的野獸在低聲喘息：'
           '胸腔與肋側隨著沉重的呼吸一下一下鼓起又收縮，肩背跟著起伏，頭隨喘息輕微上下點動，鼻息與嘴角微微顫動。'
           '四肢、爪子穩穩踩在原地不動，不要抬起前肢、不要舉起、不要站起來；毛髮與鬃毛隨喘息輕輕顫動。最後回到開始的姿勢。'
           '鏡頭完全固定不動，背景始終是純綠色，主體始終在畫面中央、大小不變、肢體數量不變。動漫風格，賽璐珞上色。'),
 'eerie': ('{desc}在純綠色背景前的原地，姿勢與輪廓大致不變，散發詭異、不自然的存在感：'
           '頭部以不自然的角度緩慢歪斜後又突然頓住，軀幹偶爾像卡帶一樣痙攣般抽動一下、停頓、再緩慢回正；'
           '身上的器物、鎖鏈、布幔、燭火、鈴與碎片各自以不同的節奏緩慢晃動或旋轉，彼此不同步；整體像被看不見的線吊著般微微漂浮擺盪。'
           '手臂與手保持在原本的位置，不要舉手、不要抬手、不要揮手、不要伸手、不要做手勢。最後回到開始的姿勢。'
           '鏡頭完全固定不動，背景始終是純綠色，主體始終在畫面中央、大小不變、肢體數量不變。動漫風格，賽璐珞上色。'),
}
PROMPT['ci'] = ('{desc}Her large breasts make one single big bounce: they are thrown upward, squash, drop and stretch, then settle with a short soft decaying jiggle. Only one bounce. '
                'A strong wind blows from right to left: her short white hair and the white waist cloth, tassels and bead strings blow to the left. '
                'The camera is completely static, no zoom, no pan. Her pose, arms, legs, the knife in her mouth, the throwing knives in her hands, '
                'her face and expression stay exactly the same, no blinking, mouth stays closed. The background stays the same. Anime style, cel shading.')
# hit 的分式（--style back＝中槍往後倒；預設 PROMPT['hit']＝往前跪）
HIT_STYLE = {
 'back': ('{desc}正面面對鏡頭，站在純綠色背景前。胸口被子彈擊中，整個人被衝擊力往後打飛：上半身猛然後仰、頭往後甩、手臂向兩側甩開、'
          '雙腳離地，身體往後倒下、仰躺倒地。⚠ 人物身上與畫面上完全沒有血：沒有血跡、沒有血滴、沒有噴血、沒有紅色液體、沒有傷口；也完全沒有槍火：沒有槍口火光、沒有子彈、沒有彈著點的火花或閃光、沒有煙、沒有爆炸、沒有任何光效。衣服與身體保持乾淨，畫面上只有人物的動作。鏡頭完全固定不動，背景始終是純綠色。動漫風格，賽璐珞上色。'),
}
DESC_DEFAULT = {'hit': '一名人物', 'idle': '一隻怪物', 'portrait': '一名角色', 'ci': ''}
NEG = ('色調艷麗，過曝，靜態，細節模糊不清，字幕，畫作，靜止，整體發灰，最差質量，低質量，JPEG壓縮殘留，醜陋的，殘缺的，'
       '多餘的手指，畫得不好的手部，畫得不好的臉部，畸形的，毀容的，形態畸形的肢體，手指融合，雜亂的背景，背景人很多，'
       '鏡頭移動，鏡頭推拉，背景改變，閃爍，舉手，抬手，揮手，伸手')

# ── ComfyUI ─────────────────────────────────────────────────────────────
def server_up():
    try: urllib.request.urlopen(URL + '/system_stats', timeout=3); return True
    except Exception: return False

def ensure_server():
    if server_up(): return
    print('啟動 ComfyUI …', flush=True)
    py = os.path.join(COMFY, '.venv', 'Scripts', 'python.exe')
    log = open(os.path.join(HERE, 'comfy.log'), 'w')
    subprocess.Popen([py, 'main.py', '--lowvram', '--fp16-vae', '--disable-smart-memory', '--cache-none',
                      '--listen', '127.0.0.1', '--port', '8188'], cwd=COMFY, stdout=log, stderr=log,
                     creationflags=0x08000000 if os.name == 'nt' else 0)   # CREATE_NO_WINDOW
    for _ in range(120):
        time.sleep(3)
        if server_up(): print('ComfyUI 就緒', flush=True); return
    sys.exit('ComfyUI 啟動失敗，看 tivot_wan\\comfy.log')

END_IMG = None      # --end：A to B 的結尾圖（ComfyUI input 裡的檔名）
FORCE_LOOP = False  # --loop：首尾鎖同一張（ci 也可用）
EXTRA_LORA = None
EXTRA_LORA_LOW = None   # (檔名, 強度)，由 --lora-low 設定，接在 Low 段   # (檔名, 強度)，由 --lora 設定

def graph(img_name, prefix, length, pos, seed, mode):
    g = {
     '1': {'class_type': 'UnetLoaderGGUF', 'inputs': {'unet_name': 'Wan2.2-I2V-A14B-HighNoise-Q4_K_M.gguf'}},
     '2': {'class_type': 'UnetLoaderGGUF', 'inputs': {'unet_name': 'Wan2.2-I2V-A14B-LowNoise-Q4_K_M.gguf'}},
     '3': {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': ['1', 0], 'lora_name': 'wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors', 'strength_model': 1.0}},
     '4': {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': ['2', 0], 'lora_name': 'wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors', 'strength_model': 1.0}},
     '5': {'class_type': 'ModelSamplingSD3', 'inputs': {'model': ['3', 0], 'shift': 5.0}},
     '6': {'class_type': 'ModelSamplingSD3', 'inputs': {'model': ['4', 0], 'shift': 5.0}},
     '7': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', 'type': 'wan', 'device': 'default'}},
     '8': {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['7', 0], 'text': pos}},
     '9': {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['7', 0], 'text': NEG}},
     '10': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'wan_2.1_vae.safetensors'}},
     '11': {'class_type': 'LoadImage', 'inputs': {'image': img_name}},
     '13': {'class_type': 'KSamplerAdvanced', 'inputs': {'model': ['5', 0], 'add_noise': 'enable', 'noise_seed': seed, 'steps': 4, 'cfg': 1.0,
            'sampler_name': 'euler', 'scheduler': 'simple', 'positive': ['12', 0], 'negative': ['12', 1], 'latent_image': ['12', 2],
            'start_at_step': 0, 'end_at_step': 2, 'return_with_leftover_noise': 'enable'}},
     '14': {'class_type': 'KSamplerAdvanced', 'inputs': {'model': ['6', 0], 'add_noise': 'disable', 'noise_seed': seed, 'steps': 4, 'cfg': 1.0,
            'sampler_name': 'euler', 'scheduler': 'simple', 'positive': ['12', 0], 'negative': ['12', 1], 'latent_image': ['13', 0],
            'start_at_step': 2, 'end_at_step': 10000, 'return_with_leftover_noise': 'disable'}},
     '15': {'class_type': 'VAEDecode', 'inputs': {'samples': ['14', 0], 'vae': ['10', 0]}},
     '16': {'class_type': 'SaveImage', 'inputs': {'images': ['15', 0], 'filename_prefix': prefix}},
    }
    common = {'positive': ['8', 0], 'negative': ['9', 0], 'vae': ['10', 0], 'width': W, 'height': H, 'length': length, 'batch_size': 1}
    if mode in ('idle', 'portrait') or FORCE_LOOP:   # 首尾同一張 ⇒ 可循環
        g['12'] = {'class_type': 'WanFirstLastFrameToVideo', 'inputs': {**common, 'start_image': ['11', 0], 'end_image': ['11', 0]}}
    else:
        g['12'] = {'class_type': 'WanImageToVideo', 'inputs': {**common, 'start_image': ['11', 0]}}
    if END_IMG:      # A to B：首尾不同張
        g['21'] = {'class_type': 'LoadImage', 'inputs': {'image': END_IMG}}
        g['12'] = {'class_type': 'WanFirstLastFrameToVideo', 'inputs': {**common, 'start_image': ['11', 0], 'end_image': ['21', 0]}}
    if EXTRA_LORA:   # 額外動作 LoRA 只接在 High 段（動作在高噪段決定）
        nm, st = EXTRA_LORA
        g['20'] = {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': ['3', 0], 'lora_name': nm, 'strength_model': st}}
        g['5']['inputs']['model'] = ['20', 0]
    if EXTRA_LORA_LOW:
        nm, st = EXTRA_LORA_LOW
        g['22'] = {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': ['4', 0], 'lora_name': nm, 'strength_model': st}}
        g['6']['inputs']['model'] = ['22', 0]
    return g

def run_wan(img_name, prefix, length, pos, seed, mode):
    req = urllib.request.Request(URL + '/prompt', data=json.dumps({'prompt': graph(img_name, prefix, length, pos, seed, mode)}).encode(),
                                 headers={'Content-Type': 'application/json'})
    pid = json.load(urllib.request.urlopen(req))['prompt_id']
    t0 = time.time()
    while True:
        time.sleep(5)
        if not server_up():
            raise RuntimeError('ComfyUI 中途停止（多半是記憶體不足）')
        h = json.load(urllib.request.urlopen(f'{URL}/history/{pid}'))
        if pid in h:
            st = h[pid].get('status', {})
            if st.get('status_str') == 'error': raise RuntimeError(json.dumps(st)[:800])
            imgs = h[pid]['outputs']['16']['images']
            return [os.path.join(COMFY, 'output', i.get('subfolder', ''), i['filename']) for i in imgs], time.time() - t0

# ── 影像處理 ───────────────────────────────────────────────────────────
def to_green(src, mode):
    if mode == 'ci':   # 整張插圖（含背景）直接餵，不去背
        return Image.open(src).convert('RGB').resize((W, H), Image.LANCZOS)
    im = Image.open(src).convert('RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bb or im.getchannel('A').getextrema()[0] == 255:
        print(f'  ⚠ {os.path.basename(src)} 沒有透明背景，綠底效果會變差', flush=True)
    else:
        im = im.crop(bb)
    fit = 0.86 if mode == 'hit' else (0.96 if mode == 'portrait' else 0.92)
    s = min(W * fit / im.width, H * fit / im.height)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    bg = Image.new('RGBA', (W, H), GREEN + (255,))
    y = H - im.height - int(H * 0.05) if mode == 'hit' else (H - im.height) // 2
    bg.paste(im, ((W - im.width) // 2, y), im)
    return bg.convert('RGB')

def fg_mask(a):
    return (a[..., 1] - np.maximum(a[..., 0], a[..., 2])) < 40

def deflicker(arrs):
    """每格人物區域的 Lab 平均／標準差對齊第 1 格（去整體明暗閃動）。"""
    labs = [cv2.cvtColor((a / 255).astype(np.float32), cv2.COLOR_RGB2LAB) for a in arrs]
    ms = [fg_mask(a) for a in arrs]
    ref = [(labs[0][..., c][ms[0]].mean(), labs[0][..., c][ms[0]].std()) for c in range(3)]
    out = []
    for l, m in zip(labs, ms):
        o = l.copy()
        for c in range(3):
            mu, sd = l[..., c][m].mean(), l[..., c][m].std()
            o[..., c] = np.where(m, (l[..., c] - mu) / (sd + 1e-6) * ref[c][1] + ref[c][0], l[..., c])
        out.append(np.clip(cv2.cvtColor(o, cv2.COLOR_LAB2RGB), 0, 1) * 255)
    return out

def key(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    al = 1 - np.clip((g - np.maximum(r, b) - 25) / 70, 0, 1)
    g2 = np.minimum(g, (r + b) / 2 + 6)
    return Image.fromarray(np.dstack([r, g2, b, al * 255]).clip(0, 255).astype(np.uint8))

def pick(n_total, mode, frames, fps):
    if mode == 'hit':                              # 中彈 → 跪倒那一段
        if frames <= 0: return list(range(n_total - 1))   # --frames 0＝全格（去掉吸回原圖的最後一格）
        a, z = int(n_total * 0.17), int(n_total * 0.92)
        return [round(a + (z - a) * i / (frames - 1)) for i in range(frames)]
    step = max(1, round(16 / fps))                 # 待機：Wan 16fps，去掉與首格相同的最後一格
    last = n_total if END_IMG else n_total - 1     # A to B：最後一格就是 B，要留；循環才去掉與首格相同的那格
    return list(range(0, last, step))

# ── 主流程 ─────────────────────────────────────────────────────────────
def read_cfg(src):
    cfg = {}
    t = os.path.splitext(src)[0] + '.txt'
    if os.path.exists(t):
        lines = [x.strip() for x in open(t, encoding='utf-8').read().splitlines() if x.strip()]
        for x in lines:
            if '=' in x and x.split('=')[0] in ('mode', 'seed', 'frames', 'fps', 'width', 'length'):
                k, v = x.split('=', 1); cfg[k] = v.strip()
            else:
                cfg['desc'] = cfg.get('desc', '') + x
    return cfg

def process(src, args, out_root):
    name = os.path.splitext(os.path.basename(src))[0]
    cfg = read_cfg(src)
    mode = cfg.get('mode', args.mode)
    seed = int(cfg.get('seed', args.seed or random.randint(1, 2**31)))
    frames = int(cfg.get('frames', args.frames))
    fps = int(cfg.get('fps', args.fps))
    width = int(cfg.get('width', args.width or 480))
    length = int(cfg.get('length', args.length))
    desc = cfg.get('desc', DESC_DEFAULT[mode])
    tpl = IDLE_STYLE[args.style] if (mode == 'idle' and args.style in IDLE_STYLE) else (HIT_STYLE[args.style] if (mode == 'hit' and args.style in HIT_STYLE) else PROMPT[mode])
    pos = args.prompt or tpl.format(desc=desc.rstrip('。') + '，')
    od = os.path.join(out_root, name); os.makedirs(od, exist_ok=True)

    print(f'▶ {name}  mode={mode} seed={seed}', flush=True)
    paths, secs = [], 0
    if args.reuse:   # 不重跑 Wan：沿用上次這個 seed 的輸出，只重新抽格
        paths = sorted(glob.glob(os.path.join(COMFY, 'output', 'tivotwan', f'{name}_{seed}_*.png')))
        if not paths: print('  （找不到上次的輸出，改為重跑 Wan）', flush=True)
    if not paths:
        inp = f'tivotwan_{name}.png'
        to_green(src, mode).save(os.path.join(COMFY, 'input', inp))
        paths, secs = run_wan(inp, f'tivotwan/{name}_{seed}', length, pos, seed, mode)
    if args.suffix: name += args.suffix; od = os.path.join(out_root, name); os.makedirs(od, exist_ok=True)
    arrs = [np.asarray(Image.open(p).convert('RGB')).astype(np.float32) for p in paths]
    if mode != 'ci': arrs = deflicker(arrs)   # 去閃以綠底遮罩為準，整張插圖不適用
    idx = pick(len(arrs), mode, frames, fps)
    files, tot = [], 0
    for j, i in enumerate(idx):
        im = Image.fromarray(np.clip(arrs[i], 0, 255).astype(np.uint8)) if mode == 'ci' else key(arrs[i]); im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        fn = f'frame_{j:02d}.webp'; im.save(os.path.join(od, fn), 'WEBP', quality=82); files.append(fn)
        tot += os.path.getsize(os.path.join(od, fn))
    # 總覽
    tw, th = 160, 240; cols = min(len(files), 10); rows = (len(files) + cols - 1) // cols
    sh = Image.new('RGB', (cols * tw, rows * th), (30, 30, 38))
    for j, fn in enumerate(files):
        t = Image.open(os.path.join(od, fn)).convert('RGBA').resize((tw, th)); sh.paste(t, ((j % cols) * tw, (j // cols) * th), t)
    sh.save(os.path.join(od, 'sheet.jpg'), quality=88)
    # 預覽頁（相對路徑，檔案很小）
    dur = 900 if mode == 'hit' else len(files) * 1000 / fps
    open(os.path.join(od, 'preview.html'), 'w', encoding='utf-8').write(f'''<!doctype html><meta charset="utf-8"><title>{name}</title>
<body style="margin:0;background:#15151b;color:#ddd;font-family:sans-serif;text-align:center">
<p>{name}｜{mode}｜{len(files)} 格｜{tot//1024} KB｜seed {seed}</p><button onclick="play()" style="padding:8px 20px">播放</button>
<div style="width:{width}px;margin:10px auto;background:#2a2730"><img id="im" src="{files[0]}" style="width:{width}px"></div>
<script>const F={json.dumps(files)};F.forEach(u=>{{new Image().src=u}});const M="{mode}",D={dur};
async function play(){{const im=document.getElementById('im');im.getAnimations().forEach(a=>a.cancel());im.style.opacity=1;
 const dt=D/F.length; if(M==='hit') im.animate([{{opacity:1}},{{opacity:0}}],{{duration:D,easing:'ease-in',fill:'forwards'}});
 for(let r=0;r<(M==='hit'?1:4);r++) for(const u of F){{im.src=u; await new Promise(x=>setTimeout(x,dt));}} }}</script>''')
    meta = {'name': name, 'mode': mode, 'style': args.style, 'seed': seed, 'frames': files, 'fps': fps, 'width': width,
            'duration_ms': dur, 'bytes': tot, 'wan_seconds': round(secs), 'prompt': pos}
    json.dump(meta, open(os.path.join(od, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'  ✔ {len(files)} 格 {tot//1024} KB，Wan {round(secs)} 秒 → {od}', flush=True)
    return meta

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mode', choices=['hit', 'idle', 'portrait', 'ci'], default='hit')
    ap.add_argument('--files', nargs='*', help='直接指定圖檔（自動批量用）')
    ap.add_argument('--only', help='只處理 in\\ 裡這個檔名')
    ap.add_argument('--out', default=os.path.join(HERE, 'out'))
    ap.add_argument('--seed', type=int)
    ap.add_argument('--frames', type=int, default=10, help='hit 模式取幾格')
    ap.add_argument('--fps', type=int, default=8, help='idle 模式幀率（16＝全格、8＝減半）')
    ap.add_argument('--width', type=int)
    ap.add_argument('--length', type=int, default=49, help='Wan 生成格數（4n+1）')
    ap.add_argument('--reuse', action='store_true', help='沿用上次同 seed 的 Wan 輸出，只重新抽格（要配 --seed）')
    ap.add_argument('--style', default='default', help='idle 的分系：default／beast（伏身低喘）／eerie（詭異）')
    ap.add_argument('--end', help='A to B：結尾圖路徑')
    ap.add_argument('--prompt', help='直接指定正面提示詞（覆蓋 mode 的）')
    ap.add_argument('--loop', action='store_true', help='首尾鎖回原圖')
    ap.add_argument('--lora-low', help='額外 Low 段 LoRA：檔名[:強度]')
    ap.add_argument('--lora', help='額外 High 段 LoRA：檔名[:強度]')
    ap.add_argument('--suffix', default='', help='輸出資料夾名加尾綴（比較不同抽格用）')
    args = ap.parse_args()
    global FORCE_LOOP, END_IMG; FORCE_LOOP = args.loop
    if args.end:
        END_IMG = 'tivotwan_end_' + os.path.splitext(os.path.basename(args.end))[0] + '.png'
        to_green(args.end, 'ci' if args.mode == 'ci' else args.mode).save(os.path.join(COMFY, 'input', END_IMG))
    if args.lora_low:
        global EXTRA_LORA_LOW
        nm, _, st = args.lora_low.partition(':'); EXTRA_LORA_LOW = (nm, float(st or 1.0))
    if args.lora:
        global EXTRA_LORA
        nm, _, st = args.lora.partition(':'); EXTRA_LORA = (nm, float(st or 1.0))
    src = args.files or sorted(p for p in glob.glob(os.path.join(HERE, 'in', '*'))
                               if p.lower().endswith(('.png', '.webp', '.jpg', '.jpeg')))
    if args.only: src = [p for p in src if os.path.basename(p).startswith(args.only)]
    if not src: sys.exit('in\\ 裡沒有圖')
    ensure_server()
    done = []
    for p in src:
        try: done.append(process(p, args, args.out))
        except Exception as e: print(f'  ✘ {os.path.basename(p)}：{e}', flush=True)
    # 總索引
    idx = os.path.join(args.out, 'index.html')
    metas = [json.load(open(p, encoding='utf-8')) for p in sorted(glob.glob(os.path.join(args.out, '*', 'meta.json')))]
    items = ''.join(f'<a href="{m["name"]}/preview.html" style="display:inline-block;margin:6px;color:#ddd">'
                    f'<img src="{m["name"]}/sheet.jpg" style="height:160px;display:block">{m["name"]}（{m.get("mode","")}，{m.get("bytes",0)//1024} KB）</a>'
                    for m in metas)
    open(idx, 'w', encoding='utf-8').write(f'<meta charset="utf-8"><body style="background:#15151b;font-family:sans-serif">{items}')
    print(f'完成 {len(done)}/{len(src)}，總覽：{idx}')

if __name__ == '__main__':
    main()
