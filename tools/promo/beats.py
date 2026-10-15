# 估 BGM 的 BPM 與第一拍位置（onset 包絡的自相關）。用法：py beats.py <音檔>
import sys, subprocess, numpy as np
SR = 22050
raw = subprocess.run(['ffmpeg','-v','error','-i',sys.argv[1],'-ac','1','-ar',str(SR),'-f','f32le','-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32)
hop = 512; n = len(x)//hop
frames = x[:n*hop].reshape(n, hop)
spec = np.abs(np.fft.rfft(frames*np.hanning(hop), axis=1))
flux = np.maximum(0, np.diff(np.log1p(spec), axis=0)).sum(1)
flux = (flux - flux.mean())/ (flux.std()+1e-9)
fps = SR/hop
ac = np.correlate(flux, flux, 'full')[len(flux)-1:]
lo, hi = int(fps*60/200), int(fps*60/70)
lag = lo + np.argmax(ac[lo:hi])
bpm = 60*fps/lag
# 相位：拍點網格上 flux 總和最大的偏移
best = max(range(lag), key=lambda o: flux[o::lag].sum())
print('dur %.1fs  bpm %.2f  beat %.4fs  first %.3fs' % (len(x)/SR, bpm, lag/fps, best/fps))
