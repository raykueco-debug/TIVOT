# 宣傳片剪接器 v3：照 edl3.py（Ray 的 pv分鏡）剪成 1080×1920／60fps，配 PerituneMaterial_Havoc。
#
# 用法：py tools/promo/cut3.py <素材根目錄> <輸出.mp4> [只算第幾段,逗號分隔]
#
# 每一段寫「絕對開始秒數」at，結束＝下一段的 at（最後一段寫 end）。格數照絕對時間取整，
# 所以剪點永遠落在 edl 上寫的拍點，不會因為各段四捨五入而累積誤差。
#
# 段的種類：
#   scene   record.py 錄的實機素材資料夾（t＝從第幾秒、speed）
#   video   動畫原檔（mp4）：start／speed；播完停在最後一格（hold），pan／zoom 照樣繼續
#   still   圖：pan（'up'／'down'／'lr'／'rl'）或 zoom=(起,迄)
#   logo    主 LOGO：黑底 → slam 時刻蓋下（火星飛濺、白閃、輕震）→ 慢推
#   montage 圖片快剪：imgs 依序，每張 step 秒
# 共同欄位：
#   enter='bl'  左下彈出拉回（往右上彈進來、略過頭再拉回）
#   flash       開頭白閃秒數；fadein／fadeout 黑場
#   flashes     [(相對秒, 圖)] 在那一刻閃入一張圖（3 格）
#   sfx         [(相對秒, 音檔, 增益)] 指定的音效／語音
#   rec_sfx     scene 段要不要放錄到的音效（預設要）
import os, sys, re, json, math, random, subprocess, shutil, importlib.util
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
W, H, FPS = 1080, 1920, 60
FONT = r'C:\Windows\Fonts\NotoSerifTC-VF.ttf'

spec = importlib.util.spec_from_file_location('edl3', os.path.join(HERE, 'edl3.py'))
edl = importlib.util.module_from_spec(spec); spec.loader.exec_module(edl)

def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, **kw)
    if r.returncode:
        print(' '.join(map(str, cmd))[:800]); print((r.stderr or b'')[-3000:].decode('utf-8', 'replace')); sys.exit(1)
    return r

def P(p): return p if os.path.isabs(p) else os.path.join(ROOT, p)

# ── 遊戲的響度表：混音照遊戲的比例 ──
CFG = open(os.path.join(ROOT, 'config.js'), encoding='utf-8').read()
def _block(name):
    i = CFG.index(name + ':'); j = CFG.index('{', i); d = 0
    for k in range(j, len(CFG)):
        d += {'{': 1, '}': -1}.get(CFG[k], 0)
        if d == 0: return CFG[j:k]
FILE_GAIN = {k.lower(): float(v) for k, v in re.findall(r'([A-Za-z0-9_]+)\s*:\s*([0-9.]+)', re.sub(r'//[^\n]*', '', _block('fileGain')))}
MASTER = float(re.search(r'masterVolume:\s*([0-9.]+)', CFG).group(1))
def gain_of(src):
    k = os.path.basename(src.split('?')[0]).rsplit('.', 1)[0].lower()
    return FILE_GAIN.get(k, 1.0) * MASTER

ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', str(FPS)]

def font(size, weight='Bold'):
    f = ImageFont.truetype(FONT, size)
    try: f.set_variation_by_name(weight)
    except Exception: pass
    return f

def cover(im, w=W, h=H, fy=0.5):
    s = max(w / im.width, h / im.height)
    im = im.resize((max(w, round(im.width * s)), max(h, round(im.height * s))), Image.LANCZOS)
    x = (im.width - w) // 2; y = int((im.height - h) * fy)
    return im.crop((x, y, x + w, y + h))

def pipe_frames(out, n, gen):
    """gen(i) → PIL RGB 圖，n 格寫成 mp4。"""
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (W, H),
                          '-r', str(FPS), '-i', '-'] + ENC + [out], stdin=subprocess.PIPE)
    for i in range(n):
        p.stdin.write(gen(i).convert('RGB').tobytes())
    p.stdin.close(); p.wait()

# ── 主 LOGO：黑底 → 蓋下（火星飛濺）→ 慢推 ──
def render_logo(out, n, s):
    emb = Image.open(P(s.get('img', 'resources/background/tivot_emblem.webp'))).convert('RGBA')
    ew = s.get('img_w', 700); emb = emb.resize((ew, round(emb.height * ew / emb.width)), Image.LANCZOS)
    slam = s.get('slam', 1.0)
    # 標題字（一次畫好）
    title = Image.new('RGBA', (W, 300), (0, 0, 0, 0)); td = ImageDraw.Draw(title)
    f1, f2 = font(100), font(36, 'Medium')
    def spaced(d, y, t, f, sp, col):
        w = sum(f.getlength(c) for c in t) + sp * (len(t) - 1); x = (W - w) / 2
        for c in t: d.text((x, y), c, font=f, fill=col); x += f.getlength(c) + sp
    glow = Image.new('RGBA', title.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    spaced(gd, 20, '聖約第四騎士團', f1, 12, (255, 170, 60, 160)); spaced(gd, 170, 'SAINT  INSTALL', f2, 14, (255, 170, 60, 120))
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    spaced(td, 20, '聖約第四騎士團', f1, 12, (242, 218, 156, 255)); spaced(td, 170, 'SAINT  INSTALL', f2, 14, (220, 200, 160, 235))
    title = Image.alpha_composite(glow, title)
    # 火星：蓋下那一刻從團徽外緣往外噴，帶重力、拉出短尾
    rnd = random.Random(7)
    cx, cy = W / 2, H * 0.40
    sparks = []
    for _ in range(140):
        a = rnd.uniform(0, 2 * math.pi); sp = rnd.uniform(500, 1700)
        r0 = ew * 0.42 * rnd.uniform(0.85, 1.05)
        sparks.append((cx + math.cos(a) * r0, cy + math.sin(a) * r0 * 0.95, math.cos(a) * sp, math.sin(a) * sp - rnd.uniform(0, 300),
                       rnd.uniform(0.5, 1.4), rnd.uniform(2, 5)))
    embers = [(rnd.uniform(0, W), rnd.uniform(0, H), rnd.uniform(-20, 20), rnd.uniform(-90, -30), rnd.uniform(1.5, 3.5), rnd.uniform(0, 10)) for _ in range(45)]
    def gen(i):
        t = i / FPS; dt = t - slam
        im = Image.new('RGB', (W, H), (0, 0, 0))
        d = ImageDraw.Draw(im, 'RGBA')
        # 漂浮的餘燼（整段都有，蓋下前就在）
        for (x, y, vx, vy, r, ph) in embers:
            yy = (y + vy * t) % H; xx = x + vx * t + 8 * math.sin(t * 1.3 + ph)
            al = int(110 * (0.5 + 0.5 * math.sin(t * 2 + ph)))
            d.ellipse([xx - r, yy - r, xx + r, yy + r], fill=(255, 150, 60, al))
        if dt >= 0:
            # 蓋下：0.12 秒內由 1.45 倍砸到 1.0；之後慢推到 push 倍
            if dt < 0.12: k = 1.45 - 0.45 * (1 - (1 - dt / 0.12) ** 3)
            else: k = 1.0 + s.get('push', 0.09) * min(1, (dt - 0.12) / max(0.01, n / FPS - slam - 0.12))
            sh = (0, 0)
            if dt < 0.25:
                amp = 22 * (1 - dt / 0.25); sh = (amp * math.sin(dt * 90), amp * math.cos(dt * 77))
            e = emb.resize((round(emb.width * k), round(emb.height * k)), Image.LANCZOS)
            im.paste(e, (int(cx - e.width / 2 + sh[0]), int(cy - e.height / 2 + sh[1])), e)
            # 標題：蓋下 0.5 秒後淡入
            ta = max(0, min(1, (dt - 0.5) / 0.8))
            if ta > 0:
                tt = title.copy(); tt.putalpha(tt.getchannel('A').point(lambda v: int(v * ta)))
                tk = 1.0 + (k - 1.0) * 0.6
                tt = tt.resize((round(W * tk), round(300 * tk)), Image.LANCZOS)
                im.paste(tt, (int((W - tt.width) / 2), int(H * 0.62)), tt)
            # 火星
            ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
            for (x, y, vx, vy, life, w) in sparks:
                if dt > life: continue
                f = 1 - dt / life
                px, py = x + vx * dt, y + vy * dt + 900 * dt * dt
                tx, ty = px - vx * 0.03, py - (vy + 1800 * dt) * 0.03
                col = (255, int(200 * f + 40), int(90 * f), int(255 * min(1, f * 1.4)))
                od.line([(tx, ty), (px, py)], fill=col, width=max(1, int(w * f + 1)))
            glowl = ov.filter(ImageFilter.GaussianBlur(6))
            im = Image.alpha_composite(Image.alpha_composite(im.convert('RGBA'), glowl), ov).convert('RGB')
            # 白閃
            if dt < 0.22:
                im = Image.blend(im, Image.new('RGB', (W, H), (255, 240, 220)), 0.85 * (1 - dt / 0.22))
        fo = s.get('fadeout', 0)
        if fo and t > n / FPS - fo:
            im = Image.blend(im, Image.new('RGB', (W, H)), min(1, (t - (n / FPS - fo)) / fo))
        return im
    pipe_frames(out, n, gen)

# ── 圖片快剪 ──
def render_montage(out, n, s):
    step = s['step']; imgs = [cover(Image.open(P(p)).convert('RGB'), fy=0.5) for p in s['imgs']]
    def gen(i):
        k = min(len(imgs) - 1, int(i / FPS / step)); im = imgs[k]
        # 每張微推 4%
        z = 1 + 0.04 * ((i / FPS) % step) / step
        if z > 1:
            w2, h2 = round(W / z), round(H / z)
            im = im.crop(((W - w2) // 2, (H - h2) // 2, (W - w2) // 2 + w2, (H - h2) // 2 + h2)).resize((W, H), Image.BILINEAR)
        return im
    pipe_frames(out, n, gen)

def pan_crop(s, D):
    """回傳 (先放大成多大, crop 的 x/y 運算式)。"""
    pan = s.get('pan')
    if pan in ('up', 'down'):
        k = s.get('pan_amt', 1.22)
        y = "(ih-oh)*(1-t/%f)" % D if pan == 'up' else "(ih-oh)*(t/%f)" % D
        return (round(W * k), round(H * k)), "(iw-ow)/2", y
    if pan in ('lr', 'rl'):
        x = "(iw-ow)*(t/%f)" % D if pan == 'lr' else "(iw-ow)*(1-t/%f)" % D
        return None, x, "(ih-oh)/2"
    return (W, H), "(iw-ow)/2", "(ih-oh)/2"

def render_seg(i, s, src_root, tmp, n):
    out = os.path.join(tmp, 'seg%03d.mp4' % i)
    D = n / FPS
    kind = s['kind']
    if kind == 'logo': render_logo(out, n, s); return out
    if kind == 'montage': render_montage(out, n, s); return out
    post = []
    if kind == 'scene':
        sp = s.get('speed', 1)
        inp = ['-start_number', str(round(s['t'] * FPS)), '-framerate', str(FPS * sp), '-i', os.path.join(src_root, s['scene'], 'f%05d.jpg')]
        vf = ['fps=%d' % FPS, 'tpad=stop_mode=clone:stop_duration=30']
        if s.get('zoom'):
            z0, z1 = s['zoom']
            vf.append("scale=%d:%d,zoompan=z='%f+(%f-%f)*on/%d':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=%dx%d:fps=%d" % (W * 2, H * 2, z0, z1, z0, n, W, H, FPS))
    else:
        if kind == 'video':
            sp = s.get('speed', 1)
            inp = ['-ss', str(s.get('start', 0)), '-i', P(s['src'])]
            vf = ['setpts=(PTS-STARTPTS)/%f' % sp, 'fps=%d' % FPS, 'tpad=stop_mode=clone:stop_duration=30']
        else:   # still
            inp = ['-loop', '1', '-framerate', str(FPS), '-i', P(s['src'])]
            vf = []
        big, xe, ye = pan_crop(s, D)
        if big is None:   # 橫移：高度貼滿、寬度照比例
            vf += ['scale=-2:%d:flags=lanczos' % H, "crop=%d:%d:'%s':'%s'" % (W, H, xe, ye)]
        else:
            vf += ['scale=%d:%d:force_original_aspect_ratio=increase:flags=lanczos' % big, "crop=%d:%d:'%s':'%s'" % (W, H, xe, ye)]
        if s.get('zoom'):
            z0, z1 = s['zoom']
            vf.append("scale=%d:%d,zoompan=z='%f+(%f-%f)*on/%d':x='iw/2-(iw/zoom/2)':y='ih*%f-(ih/zoom*%f)':d=1:s=%dx%d:fps=%d"
                      % (W * 2, H * 2, z0, z1, z0, n, s.get('fy', .5), s.get('fy', .5), W, H, FPS))
        if kind == 'video': vf.append('unsharp=5:5:0.5')
    vf.append('format=yuv420p')
    filt = '[0:v]' + ','.join(vf) + '[v0]'; last = '[v0]'
    extra_in = []
    if s.get('enter') == 'bl':
        # 左下彈出拉回：0.30 秒由左下往右上彈進來（back-ease 會略過頭），再拉回定位
        e = "(1+2.70158*pow(min(t/0.30,1)-1,3)+1.70158*pow(min(t/0.30,1)-1,2))"
        filt += ";color=c=black:s=%dx%d:r=%d[bg];[bg]%soverlay=x='-0.62*W*(1-%s)':y='0.48*H*(1-%s)':shortest=1[v1]" % (W, H, FPS, last, e, e)
        last = '[v1]'
    for k, (tr, img) in enumerate(s.get('flashes', [])):
        idx = 1 + k
        extra_in += ['-loop', '1', '-framerate', str(FPS), '-i', P(img)]
        filt += ";[%d:v]scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,format=yuva420p[f%d];%s[f%d]overlay=0:0:enable='between(t,%f,%f)':shortest=1[v%d]" % (
            idx, W, H, W, H, k, last, k, tr, tr + 3 / FPS, 10 + k)
        last = '[v%d]' % (10 + k)
    fades = []
    if s.get('flash'): fades.append('fade=t=in:st=0:d=%.3f:color=white' % s['flash'])
    if s.get('fadein'): fades.append('fade=t=in:st=0:d=%.3f' % s['fadein'])
    if s.get('fadeout'): fades.append('fade=t=out:st=%.3f:d=%.3f' % (D - s['fadeout'], s['fadeout']))
    if fades: filt += ';%s%s[vz]' % (last, ','.join(fades)); last = '[vz]'
    run(['ffmpeg', '-v', 'error', '-y'] + inp + extra_in + ['-filter_complex', filt, '-map', last, '-frames:v', str(n)] + ENC + [out])
    return out

def main(src_root, out_path, only=None):
    tmp = os.path.join(os.path.dirname(os.path.abspath(out_path)), '_cut3_tmp'); os.makedirs(tmp, exist_ok=True)
    segs = edl.SEGMENTS
    starts = [s['at'] for s in segs] + [edl.END]
    tl = []
    for i, s in enumerate(segs):
        a, b = starts[i], starts[i + 1]
        n = round(b * FPS) - round(a * FPS)
        p = os.path.join(tmp, 'seg%03d.mp4' % i)
        if only is None or i in only or not os.path.exists(p):
            render_seg(i, s, src_root, tmp, n)
        tl.append((a, n / FPS, s))
        print('cut %2d  %6.2f → %6.2f  %-8s %s' % (i + 1, a, b, s['kind'], s.get('note', s.get('scene') or os.path.basename(s.get('src', '')))), flush=True)
    total = edl.END
    lst = os.path.join(tmp, 'list.txt')
    open(lst, 'w', encoding='utf-8').write(''.join("file '%s'\n" % os.path.join(tmp, 'seg%03d.mp4' % i).replace('\\', '/') for i in range(len(segs))))
    video = os.path.join(tmp, 'video.mp4')
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', video])

    # ── 音：BGM ＋ 錄到的音效 ＋ 指定的音效／語音 ──
    ins, parts, sfx_labels = [], [], []
    def inp(path): ins.extend(['-i', path]); return len(ins) // 2 - 1
    b = edl.BGM
    k = inp(P(b['src']))
    parts.append('[%d:a]atrim=start=%f:duration=%f,asetpts=PTS-STARTPTS,volume=%f,afade=t=out:st=%f:d=%f[bgm]'
                 % (k, b.get('from', 0), total, gain_of(b['src']) * b.get('gain', 1), total - b.get('fadeout', 1.5), b.get('fadeout', 1.5)))
    def add_sfx(path, at, dur, g, off=0):
        k = inp(path); lab = 's%d' % k
        parts.append('[%d:a]atrim=start=%f:duration=%f,asetpts=PTS-STARTPTS,volume=%f,afade=t=out:st=%f:d=0.15,adelay=%d|%d[%s]'
                     % (k, off, dur, g, max(0, dur - 0.15), at * 1000, at * 1000, lab))
        sfx_labels.append('[%s]' % lab)
    for (t0, dur, s) in tl:
        for (tr, src, g) in s.get('sfx', []):
            layer = 1.0 if os.path.basename(src).startswith('vo_') else edl.SFX_GAIN
            add_sfx(P(src), t0 + tr, s.get('sfx_len', 6.0), gain_of(src) * layer * g)
        if s['kind'] != 'scene' or not s.get('rec_sfx', True): continue
        aj = os.path.join(src_root, s['scene'], 'audio.json')
        if not os.path.exists(aj): continue
        sp = s.get('speed', 1)
        for e in json.load(open(aj, encoding='utf-8'))['audio']:
            rel = (e['t'] - s['t']) / sp
            if rel < -0.02 or rel >= dur - 0.03: continue
            path = re.sub(r'^.*?/resources/', 'resources/', '/' + e['src'].split('?')[0].replace('\\', '/').lstrip('/'))
            path = P(path)
            if not os.path.exists(path): continue
            name = os.path.basename(path)
            if name.startswith('bgm_') or name.lower().startswith('peritune'): continue
            layer = 1.0 if name.startswith('vo_') else edl.SFX_GAIN
            add_sfx(path, t0 + max(0, rel), dur - max(0, rel) + 0.25, gain_of(path) * layer * s.get('sfx_gain', 1.0), max(0, -rel) + e.get('off', 0))
    sfx_bus = ''
    if sfx_labels:
        sfx_bus = '%samix=inputs=%d:normalize=0:dropout_transition=0,acompressor=threshold=0.18:ratio=4:attack=5:release=120:makeup=1.4[sfx];' % (''.join(sfx_labels), len(sfx_labels))
    graph = ';'.join(parts) + ';' + sfx_bus + '[bgm]%samix=inputs=%d:normalize=0:dropout_transition=0,atrim=duration=%f,alimiter=limit=0.95[mix]' % (
        '[sfx]' if sfx_bus else '', 2 if sfx_bus else 1, total)
    gfile = os.path.join(tmp, 'graph.txt'); open(gfile, 'w', encoding='utf-8').write(graph)
    audio = os.path.join(tmp, 'audio.wav')
    run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex_script', gfile, '-map', '[mix]', '-ar', '48000', '-ac', '2', audio])
    norm = os.path.join(tmp, 'audio_norm.wav')
    run(['ffmpeg', '-v', 'error', '-y', '-i', audio, '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11', '-ar', '48000', norm])
    run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', norm, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
         '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', out_path])
    print('done %.2fs  sfx %d → %s' % (total, len(sfx_labels), out_path))

if __name__ == '__main__':
    only = set(int(x) - 1 for x in sys.argv[3].split(',')) if len(sys.argv) > 3 else None
    main(sys.argv[1], sys.argv[2], only)
