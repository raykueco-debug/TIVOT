# 剪輯器的輸出引擎：專案（JSON）→ ffmpeg 濾鏡圖 → mp4。server.py 與命令列共用。
#
#   py tools/promo/editor/render.py <專案.json> <輸出.mp4>
#
# 專案格式（前端 app.js 的 project 物件）：
#   { name, w, h, fps, loudnorm, tracks:[ {id, type:'video'|'audio', mute, hidden, clips:[...]}, ... ] }
#   影像軌 index 0 ＝最底層。
#   影像片段：{ id, kind:'video'|'image'|'color'|'text', src, color, start, dur, in, speed, fit:'cover'|'contain',
#              （text：{text, font, size, color, x, y, stroke, strokeColor, glow, spacing, weight}；輸出用前端畫好的 `_png`）
#              motion:{type:'none'|'up'|'down'|'lr'|'rl'|'zin'|'zout', amt}, fadeIn, fadeOut,
#              trans:{type:'cross'|'black'|'white', dur} ← 從同一軌前一個相鄰片段轉進來 }
#   聲音片段：{ id, src, start, dur, in, speed, vol, fadeIn, fadeOut }
#
# 轉場的定義（預覽 app.js 的 resolveTrack 是同一套，改一邊要改另一邊）：
#   cross：前一段延長到「切點＋d/2」（不透明），這一段從「切點−d/2」開始、alpha 由 0 淡到 1。
#   black／white：前一段最後 d/2 淡到那個顏色，這一段最前 d/2 由那個顏色淡回來。
import os, sys, json, re, subprocess

_FF_MAJOR = None
def graph_file_opt(gf):
    '''濾鏡圖從檔案讀：ffmpeg 7 起是 `-/filter_complex <檔>`，舊的 `-filter_complex_script` 到 8／9 已拿掉
       （10-16 Windows 那台裝的是 9.0，輸出整個失敗）。依版本挑，兩代都能跑。make_media.py 也用這一支。'''
    global _FF_MAJOR
    if _FF_MAJOR is None:
        try:
            out = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True).stdout
            m = re.search(r'ffmpeg version n?(\d+)', out); _FF_MAJOR = int(m.group(1)) if m else 0
        except Exception: _FF_MAJOR = 0
    return ['-/filter_complex', gf] if _FF_MAJOR >= 7 else ['-filter_complex_script', gf]

def atempo_chain(sp):
    """atempo 只吃 0.5～2：拆成多段相乘。"""
    out = []
    while sp > 2.0: out.append('atempo=2.0'); sp /= 2.0
    while sp < 0.5: out.append('atempo=0.5'); sp /= 0.5
    if abs(sp - 1) > 1e-4: out.append('atempo=%.6f' % sp)
    return out

def resolve_track(clips, fps):
    """依開始時間排序，算出每段實際顯示的區間與淡化（含轉場）。"""
    cs = sorted([dict(c) for c in clips], key=lambda c: c['start'])
    for c in cs:
        c['S'] = c['start']; c['E'] = c['start'] + c['dur']
        c['fx'] = []   # (種類, 相對開始, 長度, 顏色)
        if c.get('fadeIn'): c['fx'].append(('ain', 0.0, c['fadeIn'], None))
    for i in range(1, len(cs)):
        a, b = cs[i - 1], cs[i]
        tr = b.get('trans')
        if not tr or not tr.get('dur'): continue
        if abs((a['start'] + a['dur']) - b['start']) > 1.5 / fps: continue   # 不相鄰就不算轉場
        d = tr['dur']; cut = b['start']
        if tr['type'] == 'cross':
            a['E'] = cut + d / 2; b['S'] = cut - d / 2
            b['fx'].append(('ain', 0.0, d, None))
        else:
            col = 'white' if tr['type'] == 'white' else 'black'
            a['fx'].append(('cout_abs', cut - d / 2, d / 2, col))
            b['fx'].append(('cin', 0.0, d / 2, col))
    for c in cs:
        D = c['E'] - c['S']
        if c.get('fadeOut'): c['fx'].append(('aout', D - c['fadeOut'], c['fadeOut'], None))
    return cs

def motion_filters(c, W, H, D):
    m = c.get('motion') or {}; typ = m.get('type', 'none'); amt = float(m.get('amt', 0.2) or 0.2)
    fit = c.get('fit', 'cover')
    if fit == 'contain':
        f = ['scale=%d:%d:force_original_aspect_ratio=decrease:flags=lanczos' % (W, H),
             'pad=%d:%d:(ow-iw)/2:(oh-ih)/2:color=black@0' % (W, H)]
        return f
    # 行程＝幅度 × 畫面高（上下左右同一個速度），以圖的中央為中心；圖不夠就用掉能用的全部。
    # ⚠ 預覽 app.js 的 drawSrc 是同一套，改一邊要改另一邊（ver -2223）。
    T = amt * H
    if typ in ('up', 'down'):
        k = 1 + amt
        tv = 'min(ih-oh,%f)' % T
        y = ("(ih-oh)/2+%s/2-%s*t/%f" if typ == 'up' else "(ih-oh)/2-%s/2+%s*t/%f") % (tv, tv, D)
        return ['scale=%d:%d:force_original_aspect_ratio=increase:flags=lanczos' % (round(W * k), round(H * k)),
                "crop=%d:%d:'(iw-ow)/2':'%s'" % (W, H, y)]
    if typ in ('lr', 'rl'):
        k = 1 + amt
        th = 'min(iw-ow,%f)' % T
        x = ("(iw-ow)/2-%s/2+%s*t/%f" if typ == 'lr' else "(iw-ow)/2+%s/2-%s*t/%f") % (th, th, D)
        return ['scale=%d:%d:force_original_aspect_ratio=increase:flags=lanczos' % (round(W * k), round(H * k)),
                "crop=%d:%d:'%s':'(ih-oh)/2'" % (W, H, x)]
    base = ['scale=%d:%d:force_original_aspect_ratio=increase:flags=lanczos' % (W, H), 'crop=%d:%d' % (W, H)]
    if typ in ('zin', 'zout'):
        z = "(1+%f*t/%f)" % (amt, D) if typ == 'zin' else "(1+%f*(1-t/%f))" % (amt, D)
        base += ["scale=w='trunc(%d*%s/2)*2':h='trunc(%d*%s/2)*2':eval=frame" % (W, z, H, z),
                 "crop=%d:%d:'(iw-ow)/2':'(ih-oh)/2'" % (W, H)]
    return base

def build(project, root):
    W, H, FPS = int(project.get('w', 1080)), int(project.get('h', 1920)), int(project.get('fps', 60))
    tracks = project['tracks']
    total = 0.0
    for t in tracks:
        for c in t['clips']: total = max(total, c['start'] + c['dur'])
    if project.get('_trimVideo'):
        # 只輸出到最後一個畫面（ver -2223，Ray：「後面的音樂不用輸出」）：長度＝看得見的影像軌最後一段的尾，聲音一起截掉
        vend = [c['start'] + c['dur'] for t in tracks if t['type'] == 'video' and not t.get('hidden') for c in t['clips']]
        if vend: total = min(total, max(vend))
    total = max(total, 1.0 / FPS)
    ins, parts = [], []
    cnt = {'n': 0}
    def nid(): cnt['n'] += 1; return cnt['n'] - 1
    def P(p): return p if os.path.isabs(p) else os.path.join(root, p)

    parts.append('color=c=black:s=%dx%d:r=%d:d=%f,format=yuv420p[base]' % (W, H, FPS, total))
    acc = '[base]'; k = 0
    vtracks = [t for t in tracks if t['type'] == 'video' and not t.get('hidden')]
    for t in vtracks:
        for c in resolve_track(t['clips'], FPS):
            S, E = c['S'], c['E']; D = max(1.0 / FPS, E - S)
            sp = float(c.get('speed', 1) or 1)
            kind = c.get('kind', 'video')
            if kind == 'video':
                src0 = float(c.get('in', 0)) + (S - c['start']) * sp
                pre = 0.0
                if src0 < 0: pre = -src0 / sp; src0 = 0.0
                # .webm（VP9＋alpha，例如花瓣特效）：要指定 libvpx-vp9 解碼，內建的 vp9 解碼器會把透明丟掉（ver -2224）
                dec = ['-c:v', 'libvpx-vp9'] if c['src'].lower().endswith('.webm') else []
                ins.extend(['-ss', '%.4f' % src0, '-t', '%.4f' % (D * sp + 1.0)] + dec + ['-i', P(c['src'])]); n = nid()
                chain = ['setpts=(PTS-STARTPTS)/%f' % sp, 'fps=%d' % FPS]
                if pre > 0: chain.append('tpad=start_mode=clone:start_duration=%f' % pre)
                chain += ['tpad=stop_mode=clone:stop_duration=%f' % (D + 1), 'trim=duration=%f' % D, 'setpts=PTS-STARTPTS']
            elif kind in ('image', 'text'):
                # 文字＝前端畫好的整張透明 PNG（W×H，server 的 stash_text_pngs 換成路徑）：預覽與輸出是同一張圖
                src = c.get('_png') if kind == 'text' else c['src']
                if not src: continue
                ins.extend(['-loop', '1', '-framerate', str(FPS), '-t', '%.4f' % (D + 0.2), '-i', P(src)]); n = nid()
                chain = ['fps=%d' % FPS, 'trim=duration=%f' % D, 'setpts=PTS-STARTPTS']
            else:   # color
                ins.extend(['-f', 'lavfi', '-t', '%.4f' % (D + 0.2), '-i', 'color=c=%s:s=%dx%d:r=%d' % (c.get('color', 'black'), W, H, FPS)]); n = nid()
                chain = ['trim=duration=%f' % D, 'setpts=PTS-STARTPTS']
            cr = c.get('crop') or {}
            cl, ct, crr, cb = (float(cr.get(k) or 0) for k in ('l', 't', 'r', 'b'))
            if kind != 'color' and (cl or ct or crr or cb):
                # 裁切（素材的比例）：先裁再適配／運鏡 —— 預覽 app.js 的 drawSrc 是同一套（ver -2224）
                chain.append('crop=iw*%f:ih*%f:iw*%f:ih*%f' % (1 - cl - crr, 1 - ct - cb, cl, ct))
            chain += motion_filters(c, W, H, D)
            chain += ['setsar=1', 'format=yuva420p']
            for (typ, st, du, col) in c['fx']:
                du = max(1.0 / FPS, du)
                if typ == 'ain': chain.append('fade=t=in:st=%f:d=%f:alpha=1' % (st, du))
                elif typ == 'aout': chain.append('fade=t=out:st=%f:d=%f:alpha=1' % (max(0, st), du))
                elif typ == 'cin': chain.append('fade=t=in:st=%f:d=%f:color=%s' % (st, du, col))
                elif typ == 'cout_abs': chain.append('fade=t=out:st=%f:d=%f:color=%s' % (max(0, st - S), du, col))
            chain.append('setpts=PTS+%f/TB' % S)
            parts.append('[%d:v]%s[c%d]' % (n, ','.join(chain), k))
            parts.append("%s[c%d]overlay=0:0:eof_action=pass:enable='between(t,%f,%f)'[o%d]" % (acc, k, S, E, k))
            acc = '[o%d]' % k; k += 1
    parts.append('%sformat=yuv420p[vout]' % acc)

    alabs = []
    for t in tracks:
        if t['type'] != 'audio' or t.get('mute'): continue
        for c in t['clips']:
            sp = float(c.get('speed', 1) or 1); dur = c['dur']
            ins.extend(['-ss', '%.4f' % float(c.get('in', 0)), '-t', '%.4f' % (dur * sp + 0.05), '-i', P(c['src'])]); n = nid()
            ch = ['asetpts=PTS-STARTPTS', 'aresample=48000', 'aformat=channel_layouts=stereo'] + atempo_chain(sp)
            ch += ['atrim=duration=%f' % dur, 'volume=%f' % float(c.get('vol', 1) if c.get('vol') is not None else 1)]
            if c.get('fadeIn'): ch.append('afade=t=in:st=0:d=%f' % c['fadeIn'])
            if c.get('fadeOut'): ch.append('afade=t=out:st=%f:d=%f' % (max(0, dur - c['fadeOut']), c['fadeOut']))
            ms = int(round(c['start'] * 1000)); ch.append('adelay=%d|%d' % (ms, ms))
            parts.append('[%d:a]%s[a%d]' % (n, ','.join(ch), len(alabs))); alabs.append('[a%d]' % len(alabs))
    if alabs:
        parts.append('%samix=inputs=%d:normalize=0:dropout_transition=0,apad,atrim=duration=%f,alimiter=limit=0.95%s[aout]'
                     % (''.join(alabs), len(alabs), total, ',loudnorm=I=-14:TP=-1.0:LRA=11' if project.get('loudnorm', True) else ''))
    else:
        parts.append('anullsrc=r=48000:cl=stereo,atrim=duration=%f[aout]' % total)
    return ins, ';\n'.join(parts), total, FPS

def render(project, out, root, progress=lambda f, m=None: None):
    ins, graph, total, FPS = build(project, root)
    gf = out + '.graph.txt'
    open(gf, 'w', encoding='utf-8').write(graph)
    cmd = ['ffmpeg', '-v', 'error', '-y', '-nostats', '-progress', 'pipe:1'] + ins + [
        *graph_file_opt(gf), '-map', '[vout]', '-map', '[aout]', '-r', str(FPS),
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-t', '%f' % total, out]
    progress(0.0, '輸出中')
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='replace')
    for line in p.stdout:
        m = re.match(r'out_time_us=(\d+)', line.strip())
        if m: progress(min(0.999, int(m.group(1)) / 1e6 / total), '輸出中 %.1f / %.1f 秒' % (int(m.group(1)) / 1e6, total))
    err = p.stderr.read(); p.wait()
    if p.returncode:
        raise RuntimeError('ffmpeg 失敗：' + err[-1500:])
    try: os.remove(gf)
    except Exception: pass

if __name__ == '__main__':
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    render(json.load(open(sys.argv[1], encoding='utf-8')), sys.argv[2], root,
           lambda f, m=None: print('\r%5.1f%% %s' % (f * 100, m or ''), end='', flush=True))
    print()
