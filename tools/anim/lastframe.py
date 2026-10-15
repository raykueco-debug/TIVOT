import glob, os, sys
from PIL import Image
pre, dst = sys.argv[1], sys.argv[2]
fs = sorted(glob.glob(os.path.join(r'C:\Users\Ray Ku\Desktop\ComfyUI-master\output\tivotwan', pre + '_*.png')), key=os.path.getmtime)
Image.open(fs[-1]).convert('RGB').save(dst); print('A ←', fs[-1])
