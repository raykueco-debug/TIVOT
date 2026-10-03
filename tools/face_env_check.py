#!/usr/bin/env python3
"""眨眼工具的臉部分割環境自檢（在 3070 那台的 .venv-face 裡跑）。

  .venv-face\\Scripts\\python tools\\face_env_check.py

每一項印 OK／NG，NG 會附上要怎麼修。全部 OK 才往下做分割實測。
"""
import os, sys, platform, importlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ok_all = True


def line(ok, name, info='', fix=''):
    global ok_all
    ok_all &= ok
    print(('OK  ' if ok else 'NG  ') + name + ('  ' + info if info else ''))
    if not ok and fix:
        print('    → ' + fix)


print('python', sys.version.split()[0], platform.system(), platform.release())
line(sys.version_info >= (3, 12), 'Python >= 3.12', sys.executable,
     '用 py -3.12 -m venv .venv-face 重建，並用 .venv-face\\Scripts\\python 執行本檔')
line(os.path.basename(os.path.dirname(os.path.dirname(sys.executable))).lower() == '.venv-face'
     or '.venv-face' in sys.executable, '在 .venv-face 裡執行', '',
     '請用 .venv-face\\Scripts\\python tools\\face_env_check.py')

try:
    import torch
    cuda = torch.cuda.is_available()
    line(True, 'torch', torch.__version__)
    line(cuda, 'CUDA 可用', torch.cuda.get_device_name(0) if cuda else '',
         '裝成 CPU 版了：.venv-face\\Scripts\\pip install --force-reinstall torch torchvision --index-url https://download.pytorch.org/whl/cu121')
    if cuda:
        x = torch.randn(256, 256, device='cuda'); (x @ x).sum().item()
        line(True, 'GPU 實算一次', f'VRAM {torch.cuda.get_device_properties(0).total_memory / 2**30:.1f} GB')
except Exception as e:
    line(False, 'torch', repr(e)[:120], '.venv-face\\Scripts\\pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121')

for mod, pipname in (('torchvision', 'torchvision'), ('cv2', 'opencv-python'), ('PIL', 'pillow'),
                     ('numpy', 'numpy'), ('anime_face_detector', 'anime-face-detector')):
    try:
        m = importlib.import_module(mod)
        line(True, mod, getattr(m, '__version__', ''))
    except Exception as e:
        line(False, mod, repr(e)[:120], f'.venv-face\\Scripts\\pip install {pipname}')

seg = os.path.join(ROOT, '_ext', 'Anime-Face-Segmentation')
w = os.path.join(seg, 'model', 'UNet.pth')
line(os.path.isdir(seg), '分割模型 repo', seg,
     'git clone https://github.com/siyeong0/Anime-Face-Segmentation _ext\\Anime-Face-Segmentation')
line(os.path.isfile(w) and os.path.getsize(w) > 1_000_000, '分割權重 UNet.pth',
     f'{os.path.getsize(w) / 2**20:.1f} MB' if os.path.isfile(w) else '',
     '權重檔不在或太小（可能是 Git LFS 指標檔）：把 repo 刪掉重抓，或到 GitHub 頁面手動下載 model/UNet.pth')

# 特徵點模型第一次用會從 Hugging Face 下載權重：這裡實際建一次
try:
    from anime_face_detector import create_detector
    det = create_detector('yolov3', device='cuda' if 'torch' in sys.modules and sys.modules['torch'].cuda.is_available() else 'cpu')
    import numpy as np
    from PIL import Image
    img = np.array(Image.open(os.path.join(ROOT, 'resources', 'si', 'anya_si_front.webp')).convert('RGB'))[:, :, ::-1]
    res = det(img)
    line(len(res) > 0, '特徵點偵測（安雅）', f'找到 {len(res)} 張臉，{len(res[0]["keypoints"]) if res else 0} 個點',
         '偵測不到臉：把輸出整段貼給 Claude')
except Exception as e:
    line(False, '特徵點偵測（安雅）', repr(e)[:200],
         '若是下載失敗：先 set HF_HUB_DISABLE_SYMLINKS=1 再重跑；其他錯誤整段貼給 Claude')

print()
print('全部 OK' if ok_all else '有 NG：照箭頭的說明修，或把整段輸出貼給 Claude')
