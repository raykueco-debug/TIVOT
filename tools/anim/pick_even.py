import glob, os, shutil, sys
src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
fs = sorted(glob.glob(os.path.join(src, 'frame_*.webp')))[::2]
for j, f in enumerate(fs): shutil.copy(f, os.path.join(dst, f'frame_{j:02d}.webp'))
print(len(fs), dst)
