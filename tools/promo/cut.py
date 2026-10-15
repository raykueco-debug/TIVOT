# 宣傳片剪接器：照 edl.py 的分鏡表，把錄好的逐格素材＋插圖＋字卡剪成一支 1080×1920／60fps 的成片，
# 並把各段錄到的音效（audio.json）照時間軸混回去，配上 BGM。
#
# 用法：py tools/promo/cut.py <素材根目錄> <輸出.mp4>
#   素材根目錄底下是 record.py 產的各場景資料夾（town/、misha_full/…）
import os, sys, re, json, math, subprocess, shutil, importlib.util
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
W, H, FPS = 1080, 1920, 60
FONT = r'C:\Windows\Fonts\NotoSerifTC-VF.ttf'

spec = importlib.util.spec_from_file_location('edl', os.path.join(HERE, 'edl.py'))
edl = importlib.util.module_from_spec(spec); spec.loader.exec_module(edl)

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode: print(' '.join(cmd)[:600]); print(r.stderr[-3000:]); sys.exit(1)

# ── 遊戲的響度表（config.js 的 tuning.fileGain／masterVolume／layer），混音照遊戲的比例 ──
CFG = open(os.path.join(ROOT, 'config.js'), encoding='utf-8').read()
def _block(name):
    i = CFG.index(name + ':'); j = CFG.index('{', i); d = 0
    for k in range(j, len(CFG)):
        d += {'{':1, '}':-1}.get(CFG[k], 0)
        if d == 0: return CFG[j:k]
FILE_GAIN = {k.lower(): float(v) for k, v in re.findall(r'([A-Za-z0-9_]+)\s*:\s*([0-9.]+)', re.sub(r'//[^\n]*', '', _block('fileGain')))}
MASTER = float(re.search(r'masterVolume:\s*([0-9.]+)', CFG).group(1))
def gain_of(src):
    k = os.path.basename(src.split('?')[0]).rsplit('.', 1)[0].lower()
    return FILE_GAIN.get(k, 1.0) * MASTER

# ── 字卡：思源宋體粗、金色、帶暗色外光 ──
def font(size, weight='Bold'):
    f = ImageFont.truetype(FONT, size)
    try: f.set_variation_by_name(weight)
    except Exception: pass
    return f

def text_png(path, lines, size=92, y=0.5, sub=None, sub_size=34, band=True, spacing=0.08, lh=1.25):
    """lines：一行或多行大字；sub：小一級的副標（英文）。回傳 PNG（全畫面透明，字在 y 比例處）。"""
    if isinstance(lines, str): lines = [lines]
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    def wid(t, f, sp): return sum(f.getlength(c) for c in t) + sp*(len(t)-1)
    # 太寬就縮字（左右各留 7%）
    big = font(size)
    while max(wid(l, big, int(big.size*spacing)) for l in lines) > W*0.86: big = font(big.size-4)
    small = font(sub_size, 'Medium')
    while sub and wid(sub, small, int(small.size*0.3)) > W*0.86: small = font(small.size-2)
    rows = [(l, big, int(big.size*spacing)) for l in lines] + ([(sub, small, int(small.size*0.3))] if sub else [])
    heights = [f.size*lh for _, f, _ in rows]
    total = sum(heights); top = H*y - total/2
    if band:
        bd = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(bd)
        pad = size*0.55
        for yy in range(int(top-pad), int(top+total+pad)):
            a = 1 - abs((yy-(top+total/2)) / (total/2+pad)); d.line([(0, yy), (W, yy)], fill=(0, 0, 0, int(150*max(0, a)**0.6)))
        im = Image.alpha_composite(im, bd)
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    txt = Image.new('RGBA', (W, H), (0, 0, 0, 0)); td = ImageDraw.Draw(txt)
    yy = top
    for (t, f, sp), hh in zip(rows, heights):
        x = (W - wid(t, f, sp)) / 2
        for c in t:
            gd.text((x, yy), c, font=f, fill=(0, 0, 0, 230))
            col = (238, 214, 150, 255) if f is big else (214, 196, 160, 235)
            td.text((x, yy), c, font=f, fill=col)
            x += f.getlength(c) + sp
        yy += hh
    glow = glow.filter(ImageFilter.GaussianBlur(size*0.12))
    im = Image.alpha_composite(im, glow); im = Image.alpha_composite(im, glow)
    im = Image.alpha_composite(im, txt)
    im.save(path)
    return path

# ── 一段一段算成 mp4（無聲），再接起來 ──
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', str(FPS)]

def render_seg(i, s, src_root, tmp, n):
    out = os.path.join(tmp, 'seg%03d.mp4' % i)
    fade = []
    if s.get('flash'): fade.append('fade=t=in:st=0:d=%.3f:color=white' % s['flash'])
    if s.get('fadein'): fade.append('fade=t=in:st=0:d=%.3f' % s['fadein'])
    if s.get('fadeout'): fade.append('fade=t=out:st=%.3f:d=%.3f' % (s['d']-s['fadeout'], s['fadeout']))
    if 'scene' in s:
        d = os.path.join(src_root, s['scene'])
        st = round(s['t'] * FPS)
        sp = s.get('speed', 1)
        inp = ['-start_number', str(st), '-framerate', str(FPS*sp), '-i', os.path.join(d, 'f%05d.jpg')]
        vf = ['setpts=PTS', 'fps=%d' % FPS]
        if s.get('zoom'):   # 鏡頭慢推（遊戲畫面上也用）
            z = s['zoom']; vf.append("scale=%d:%d,zoompan=z='1+%f*on/%d':x='iw/2-(iw/zoom/2)':y='ih*%f-(ih/zoom*%f)':d=1:s=%dx%d:fps=%d"
                                     % (W*2, H*2, z, n, s.get('zy', .5), s.get('zy', .5), W, H, FPS))
    elif 'still' in s:
        p = os.path.join(ROOT, s['still'])
        inp = ['-loop', '1', '-framerate', str(FPS), '-i', p]
        z0, z1 = s.get('z', (1.0, 1.12)); fy = s.get('fy', 0.4)
        vf = ['scale=%d:%d:force_original_aspect_ratio=increase' % (W*2, H*2), 'crop=%d:%d' % (W*2, H*2),
              "zoompan=z='%f+(%f-%f)*on/%d':x='iw/2-(iw/zoom/2)':y='ih*%f-(ih/zoom*%f)':d=1:s=%dx%d:fps=%d"
              % (z0, z1, z0, n, fy, fy, W, H, FPS)]
    else:   # 純色底的字卡
        inp = ['-f', 'lavfi', '-i', 'color=c=%s:s=%dx%d:r=%d' % (s.get('bg', 'black'), W, H, FPS)]
        vf = []
    ov = []
    if s.get('text') or s.get('img'):
        png = os.path.join(tmp, 'txt%03d.png' % i)
        if s.get('img'):
            im = Image.open(os.path.join(ROOT, s['img'])).convert('RGBA'); sc = s.get('img_w', 620) / im.width
            im = im.resize((int(im.width*sc), int(im.height*sc)), Image.LANCZOS)
            base = Image.new('RGBA', (W, H), (0, 0, 0, 0)); base.alpha_composite(im, ((W-im.width)//2, int(H*s.get('img_y', .42) - im.height/2)))
            if s.get('text'):
                text_png(png, s['text'], s.get('size', 92), s.get('ty', .66), s.get('sub'), band=False)
                base = Image.alpha_composite(base, Image.open(png))
            base.save(png)
        else:
            text_png(png, s['text'], s.get('size', 92), s.get('ty', .5), s.get('sub'), band=s.get('band', True),
                     spacing=s.get('spacing', 0.08), lh=s.get('lh', 1.25))
        ov = ['-loop', '1', '-framerate', str(FPS), '-i', png]
    filt = '[0:v]' + ','.join(vf + ['format=yuv420p'] if vf else ['format=yuv420p']) + '[v0]'
    last = '[v0]'
    if ov:
        tin = s.get('tin', 0.12)
        tout = s.get('tout', 0)
        fo = (',fade=t=out:st=%.3f:d=%.3f:alpha=1' % (s['d']-tout, tout)) if tout else ''
        filt += ';[1:v]format=rgba,fade=t=in:st=%.3f:d=%.3f:alpha=1%s[t];[v0][t]overlay=0:0:shortest=1[v1]' % (s.get('tdelay', 0), tin, fo)
        last = '[v1]'
    if fade: filt += ';%s%s[v2]' % (last, ','.join(fade)); last = '[v2]'
    run(['ffmpeg', '-v', 'error', '-y'] + inp + ov + ['-filter_complex', filt, '-map', last, '-frames:v', str(n)] + ENC + [out])
    return out, n / FPS

def main(src_root, out_path):
    tmp = os.path.join(os.path.dirname(os.path.abspath(out_path)), '_cut_tmp')
    shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    segs, tl, t = [], [], 0.0
    cum = 0.0
    for i, s in enumerate(edl.SEGMENTS):
        # 照累計時間點取整數格：各段各自四捨五入的誤差會累積，音樂就慢慢對不上拍
        n = round((cum + s['d']) * FPS) - round(cum * FPS); cum += s['d']
        p, dur = render_seg(i, s, src_root, tmp, n)
        segs.append(p); tl.append((t, dur, s)); t += dur
        print('seg %2d  %6.2fs  +%.2fs  %s' % (i, tl[-1][0], dur, s.get('scene') or s.get('still') or s.get('text')), flush=True)
    total = t
    lst = os.path.join(tmp, 'list.txt')
    open(lst, 'w', encoding='utf-8').write(''.join("file '%s'\n" % p.replace('\\', '/') for p in segs))
    video = os.path.join(tmp, 'video.mp4')
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', video])

    # ── 音：BGM 兩首（edl.BGM）＋每段錄到的音效 ──
    ins, parts = [], []
    def add_input(path, extra=None):
        ins.extend((extra or []) + ['-i', path]); return len(ins_idx)
    ins_idx = []
    def inp(path, pre=()):
        ins.extend(list(pre) + ['-i', path]); ins_idx.append(path); return len(ins_idx) - 1
    for b in edl.BGM:
        k = inp(os.path.join(ROOT, b['src']))
        g = gain_of(b['src']) * b.get('gain', 1.0)
        fi, fo = b.get('fadein', 0.02), b.get('fadeout', 0.4)
        dur = b['end'] - b['start']
        parts.append('[%d:a]atrim=start=%f:duration=%f,asetpts=PTS-STARTPTS,volume=%f,afade=t=in:d=%f,afade=t=out:st=%f:d=%f,adelay=%d|%d[b%d]'
                     % (k, b.get('from', 0), dur, g, fi, max(0, dur-fo), fo, b['start']*1000, b['start']*1000, k))
    n_sfx = 0
    for (t0, dur, s) in tl:
        if 'scene' not in s or s.get('mute'): continue
        aj = os.path.join(src_root, s['scene'], 'audio.json')
        if not os.path.exists(aj): continue
        sp = s.get('speed', 1)
        for e in json.load(open(aj, encoding='utf-8'))['audio']:
            rel = (e['t'] - s['t']) / sp
            if rel < -0.02 or rel >= dur - 0.03: continue
            path = os.path.join(ROOT, e['src'].split('?')[0].lstrip('/').replace('http://localhost:8124/', ''))
            path = re.sub(r'^.*?resources', os.path.join(ROOT, 'resources').replace('\\', '/'), path.replace('\\', '/'))
            if not os.path.exists(path): continue
            name = os.path.basename(path)
            if name.startswith('bgm_') or name.startswith('peritune'): continue
            layer = 1.0 if name.startswith('vo_') else edl.SFX_GAIN
            g = gain_of(path) * layer * s.get('sfx', 1.0)
            remain = dur - max(0, rel) + s.get('tail', 0.25)
            st = t0 + max(0, rel)
            k = inp(path)
            parts.append('[%d:a]atrim=start=%f:duration=%f,asetpts=PTS-STARTPTS,volume=%f,afade=t=out:st=%f:d=0.15,adelay=%d|%d[s%d]'
                         % (k, max(0, -rel) + e.get('off', 0), remain, g, max(0, remain-0.15), st*1000, st*1000, k))
            n_sfx += 1
    nb = len(edl.BGM)
    bl = ''.join('[b%d]' % i for i in range(nb))
    sl = ''.join('[s%d]' % i for i in range(nb, len(ins_idx)))
    # 音效自己一條匯流：先壓縮（雙槍 CI 那種尖峰會把整支的響度拉平拖下去），再與 BGM 混
    sfx_bus = ('%samix=inputs=%d:normalize=0:dropout_transition=0,acompressor=threshold=0.18:ratio=4:attack=5:release=120:makeup=1.4[sfx];' % (sl, len(ins_idx)-nb)) if len(ins_idx) > nb else ''
    graph = ';'.join(parts) + ';' + sfx_bus + '%s%samix=inputs=%d:normalize=0:dropout_transition=0,atrim=duration=%f,alimiter=limit=0.95[mix]' % (
        bl, '[sfx]' if sfx_bus else '', nb + (1 if sfx_bus else 0), total)
    gfile = os.path.join(tmp, 'graph.txt'); open(gfile, 'w', encoding='utf-8').write(graph)
    audio = os.path.join(tmp, 'audio.wav')
    run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex_script', gfile, '-map', '[mix]', '-ar', '48000', '-ac', '2', audio])
    # 響度拉到 −14 LUFS（Shorts／TikTok／Reels 的常用值）
    norm = os.path.join(tmp, 'audio_norm.wav')
    run(['ffmpeg', '-v', 'error', '-y', '-i', audio, '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11', '-ar', '48000', norm])
    run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', norm, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
         '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', out_path])
    print('done %.2fs  sfx %d  → %s' % (total, n_sfx, out_path))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
