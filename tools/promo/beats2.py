# 精確節拍：BPM（分數 lag 細掃）、拍點網格、強拍重音與每秒響度。用法：py beats2.py <音檔> [json輸出]
import sys, json, subprocess, numpy as np
SR = 22050; HOP = 256
x = np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',sys.argv[1],'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout, np.float32)
n = len(x)//HOP; fr = x[:n*HOP].reshape(n, HOP)
spec = np.abs(np.fft.rfft(fr*np.hanning(HOP), axis=1))
flux = np.maximum(0, np.diff(np.log1p(spec*10), axis=0)).sum(1); flux = np.concatenate([[0], flux])
fps = SR/HOP
on = flux - np.convolve(flux, np.ones(16)/16, 'same'); on = np.maximum(on, 0)
def score(period):   # 拍長（秒）對應的梳狀分數＋最佳相位
    best = (0, 0)
    for ph in np.arange(0, period, 0.005):
        idx = np.round((np.arange(ph, len(on)/fps, period))*fps).astype(int); idx = idx[idx < len(on)]
        s = on[idx].mean()
        if s > best[0]: best = (s, ph)
    return best
cands = []
for bpm in np.arange(80, 180, 0.25):
    s, ph = score(60/bpm); cands.append((s, bpm, ph))
cands.sort(reverse=True)
s, bpm, ph = cands[0]
period = 60/bpm
beats = np.arange(ph, len(x)/SR, period)
# 每拍的重音強度（附近 ±40ms 的 onset 最大值）
acc = [float(on[max(0,int((b-.04)*fps)):int((b+.04)*fps)+1].max()) for b in beats]
rms = [float(20*np.log10(np.sqrt((x[int(t*SR):int((t+.5)*SR)]**2).mean())+1e-9)) for t in np.arange(0, len(x)/SR, .5)]
print('dur %.2f  bpm %.2f  period %.4f  phase %.3f  (次佳 %s)' % (len(x)/SR, bpm, period, ph, [round(c[1],2) for c in cands[1:4]]))
out = {'dur': len(x)/SR, 'bpm': bpm, 'period': period, 'phase': ph, 'beats': [round(b,3) for b in beats], 'accent': acc, 'rms05': rms}
if len(sys.argv) > 2: json.dump(out, open(sys.argv[2],'w'))
