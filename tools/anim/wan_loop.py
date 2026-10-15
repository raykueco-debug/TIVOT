"""送一個 Wan 2.2 I2V（GGUF Q4＋LightX2V 4 步）工作給本機 ComfyUI（API 格式），等完成後印出輸出檔。
用法：wan_i2v.py <input檔名> <prefix> <frames> "<正向提示詞>" [seed]"""
import json, sys, time, urllib.request, random

URL = 'http://127.0.0.1:8188'
inp, prefix, length, pos = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
seed = int(sys.argv[5]) if len(sys.argv) > 5 else random.randint(1, 2**31)
NEG = ('色調艷麗，過曝，靜態，細節模糊不清，字幕，風格，作品，畫作，畫面，靜止，整體發灰，最差質量，低質量，JPEG壓縮殘留，醜陋的，殘缺的，'
       '多餘的手指，畫得不好的手部，畫得不好的臉部，畸形的，毀容的，形態畸形的肢體，手指融合，雜亂的背景，三條腿，背景人很多，倒著走，'
       '鏡頭移動，鏡頭推拉，背景改變')
W, H = 480, 720
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
 '11': {'class_type': 'LoadImage', 'inputs': {'image': inp}},
 '12': {'class_type': 'WanFirstLastFrameToVideo', 'inputs': {'positive': ['8', 0], 'negative': ['9', 0], 'vae': ['10', 0], 'start_image': ['11', 0], 'end_image': ['11', 0],
        'width': W, 'height': H, 'length': length, 'batch_size': 1}},
 '13': {'class_type': 'KSamplerAdvanced', 'inputs': {'model': ['5', 0], 'add_noise': 'enable', 'noise_seed': seed, 'steps': 4, 'cfg': 1.0,
        'sampler_name': 'euler', 'scheduler': 'simple', 'positive': ['12', 0], 'negative': ['12', 1], 'latent_image': ['12', 2],
        'start_at_step': 0, 'end_at_step': 2, 'return_with_leftover_noise': 'enable'}},
 '14': {'class_type': 'KSamplerAdvanced', 'inputs': {'model': ['6', 0], 'add_noise': 'disable', 'noise_seed': seed, 'steps': 4, 'cfg': 1.0,
        'sampler_name': 'euler', 'scheduler': 'simple', 'positive': ['12', 0], 'negative': ['12', 1], 'latent_image': ['13', 0],
        'start_at_step': 2, 'end_at_step': 10000, 'return_with_leftover_noise': 'disable'}},
 '15': {'class_type': 'VAEDecode', 'inputs': {'samples': ['14', 0], 'vae': ['10', 0]}},
 '16': {'class_type': 'SaveImage', 'inputs': {'images': ['15', 0], 'filename_prefix': prefix}},
}
req = urllib.request.Request(URL + '/prompt', data=json.dumps({'prompt': g}).encode(), headers={'Content-Type': 'application/json'})
pid = json.load(urllib.request.urlopen(req))['prompt_id']
print('queued', pid, 'seed', seed, flush=True)
t0 = time.time()
while True:
    time.sleep(5)
    h = json.load(urllib.request.urlopen(f'{URL}/history/{pid}'))
    if pid in h:
        st = h[pid].get('status', {})
        if st.get('status_str') == 'error':
            print('ERROR', json.dumps(st)[:2000]); break
        outs = h[pid]['outputs'].get('16', {}).get('images', [])
        print('done', round(time.time() - t0), 's', len(outs), 'frames', outs[0]['filename'] if outs else '')
        break
