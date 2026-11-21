"""空中怪 3D：把 prep4.py 切好的四張丟給本機 ComfyUI 的 Hunyuan3D-2mv 出模。

用法：python tools/sky3d/run_hy.py <鍵> [種子]
  讀 ComfyUI-master/input/<鍵>_front|side|back|side_m.png
  出 ComfyUI-master/output/mesh/mv_<鍵>_000NN_.glb（約 5 分鐘，3060）

工作流是從 11-07 那批成品 glb 裡 SaveGLB 存的 prompt 撈回來的（一字不改）：
  ImageOnlyCheckpointLoader(hunyuan3d-dit-v2-mv_fp16) → 四張 CLIPVisionEncode(crop none)
  → Hunyuan3Dv2ConditioningMultiView(front/left=side/back/right=side_m)
  → EmptyLatentHunyuan3Dv2(3072) → ModelSamplingAuraFlow(1.0) → KSampler(30 步, cfg 5, euler/normal)
  → VAEDecodeHunyuan3D(8000, 256) → VoxelToMesh(surface net, 0.6) → SaveGLB
⚠ GPU 與其他副理共用：送之前先看佇列（/queue）有沒有人在跑。
"""
import sys, json, time, urllib.request
sys.stdout.reconfigure(encoding='utf-8')

API = 'http://127.0.0.1:8188'


def wf(key, seed):
    g = {"1": {"class_type": "ImageOnlyCheckpointLoader", "inputs": {"ckpt_name": "hunyuan3d-dit-v2-mv_fp16.safetensors"}}}
    views = [('front', '20'), ('side', '22'), ('back', '24'), ('side_m', '26')]
    for name, nid in views:
        g[nid] = {"class_type": "LoadImage", "inputs": {"image": f"{key}_{name}.png"}}
        g[str(int(nid) + 1)] = {"class_type": "CLIPVisionEncode", "inputs": {"clip_vision": ["1", 1], "image": [nid, 0], "crop": "none"}}
    g["4"] = {"class_type": "Hunyuan3Dv2ConditioningMultiView", "inputs": {"front": ["21", 0], "left": ["23", 0], "back": ["25", 0], "right": ["27", 0]}}
    g["5"] = {"class_type": "EmptyLatentHunyuan3Dv2", "inputs": {"resolution": 3072, "batch_size": 1}}
    g["6"] = {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["1", 0], "shift": 1.0}}
    g["7"] = {"class_type": "KSampler", "inputs": {"model": ["6", 0], "positive": ["4", 0], "negative": ["4", 1], "latent_image": ["5", 0],
                                                    "seed": seed, "steps": 30, "cfg": 5.0, "sampler_name": "euler", "scheduler": "normal", "denoise": 1.0}}
    g["8"] = {"class_type": "VAEDecodeHunyuan3D", "inputs": {"samples": ["7", 0], "vae": ["1", 2], "num_chunks": 8000, "octree_resolution": 256}}
    g["9"] = {"class_type": "VoxelToMesh", "inputs": {"voxel": ["8", 0], "algorithm": "surface net", "threshold": 0.6}}
    g["10"] = {"class_type": "SaveGLB", "inputs": {"mesh": ["9", 0], "filename_prefix": f"mesh/mv_{key}"}}
    return g


def get(path):
    return json.load(urllib.request.urlopen(API + path))


def main(key, seed=12345):
    q = get('/queue')
    if q['queue_running'] or q['queue_pending']:
        print('⚠ ComfyUI 佇列有人：running', len(q['queue_running']), 'pending', len(q['queue_pending']), '—— 照樣排在後面')
    req = urllib.request.Request(API + '/prompt', data=json.dumps({"prompt": wf(key, seed)}).encode(), headers={'Content-Type': 'application/json'})
    pid = json.load(urllib.request.urlopen(req))['prompt_id']
    print('queued', pid); t0 = time.time()
    while True:
        time.sleep(10)
        h = get('/history/' + pid)
        if pid in h:
            st = h[pid].get('status', {})
            outs = [x for o in h[pid].get('outputs', {}).values() for x in (o.get('3d') or o.get('result') or [])]
            print('done', st.get('status_str'), f'{time.time() - t0:.0f}s', json.dumps(h[pid].get('outputs'), ensure_ascii=False)[:400])
            break


if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 12345)
