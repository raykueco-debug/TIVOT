# 剪輯器的素材準備：
#   1) record.py 錄的逐格實機素材 → mp4（1080×1920／60fps），錄到的音效照時間點混成音軌
#      → tools/promo/editor/media/footage/<場景>.mp4
#   2) v3 用到的生成段（主 LOGO、場景快剪）→ media/generated/
#   3) edl3.py（pv分鏡 v3）轉成剪輯器專案 → projects/pv_v3.json
#
#   py tools/promo/editor/make_media.py <record.py 的素材根目錄> [--only footage|project]
import os, sys, re, json, shutil, subprocess, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
PROMO = os.path.join(ROOT, 'tools', 'promo')
FOOT = os.path.join(HERE, 'media', 'footage'); GEN = os.path.join(HERE, 'media', 'generated'); PROJ = os.path.join(HERE, 'projects')
for d in (FOOT, GEN, PROJ): os.makedirs(d, exist_ok=True)
SCENES = ['misha_full', 'misha_ni', 'colossus', 'nou', 'anya', 'sorana', 'deer', 'mage', 'guard', 'town', 'towntalk', 'story', 'flight']
# ver -2224 選項（環境變數）：PROMO_SCENES＝只做這幾個（逗號分隔）；PROMO_FULL=1＝音效也全音量（不乘 0.7）且不壓縮（只留限幅）；
#   PROMO_TRIM＝場景:從第幾格開始（逗號分隔，例 flycap:65）—— 讀取頁之類的開頭不要
if os.environ.get('PROMO_SCENES'): SCENES = os.environ['PROMO_SCENES'].split(',')
FULL = os.environ.get('PROMO_FULL') == '1'
TRIM = dict((k, int(v)) for k, v in (x.split(':') for x in os.environ.get('PROMO_TRIM', '').split(',') if ':' in x))
FPS = 60

def load(path, name):
    s = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m

def rel(p): return os.path.relpath(p, ROOT).replace('\\', '/')

def footage(src_root):
    cut3 = load(os.path.join(PROMO, 'cut3.py'), 'cut3m')   # 借它的響度表（遊戲的 fileGain）
    for sc in SCENES:
        d = os.path.join(src_root, sc)
        frames = sorted(f for f in os.listdir(d) if f.endswith('.jpg')) if os.path.isdir(d) else []
        if not frames: print('略過（沒有素材）', sc); continue
        out = os.path.join(FOOT, sc + '.mp4')
        if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(os.path.join(d, frames[-1])):
            print('已存在', sc); continue
        t0f = TRIM.get(sc, 0); frames = frames[t0f:]; t0 = t0f / FPS
        n = len(frames); dur = n / FPS
        aj = os.path.join(d, 'audio.json')
        evs = json.load(open(aj, encoding='utf-8'))['audio'] if os.path.exists(aj) else []
        items = []
        for e in evs:
            e = dict(e, t=e['t'] - t0)
            if 'stop' in e: e['stop'] = e['stop'] - t0
            if e['t'] < 0 or e['t'] >= dur: continue
            p = re.sub(r'^.*?/resources/', 'resources/', '/' + e['src'].split('?')[0].replace('\\', '/').lstrip('/'))
            p = os.path.join(ROOT, p); bn = os.path.basename(p)
            if not os.path.exists(p) or bn.startswith('bgm_') or bn.lower().startswith('peritune'): continue
            g = cut3.gain_of(p) * (1.0 if (bn.startswith('vo_') or FULL) else 0.7)
            ln = (e['stop'] - e['t']) if 'stop' in e else 8.0
            items.append((p, e['t'], e.get('off', 0), max(0.05, ln), g))
        print('%-10s %d 格（%.1f 秒）、音效 %d 個' % (sc, n, dur, len(items)), flush=True)
        wav = out + '.wav'
        # 一次混太多輸入，Windows 命令列會超長 —— 每 100 支一批先混成一軌，最後再合
        chunks = []
        for ci in range(0, len(items), 100):
            ins, parts, labs = [], [], []
            for k, (p, t, off, ln, g) in enumerate(items[ci:ci + 100]):
                ins += ['-i', p]
                parts.append('[%d:a]atrim=start=%f:duration=%f,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume=%f,adelay=%d|%d[s%d]'
                             % (k, off, ln, g, t * 1000, t * 1000, k)); labs.append('[s%d]' % k)
            cw = out + '.part%d.wav' % len(chunks); gf = cw + '.txt'
            open(gf, 'w', encoding='utf-8').write(';'.join(parts) + ';%samix=inputs=%d:normalize=0:dropout_transition=0,apad,atrim=duration=%f[a]' % (''.join(labs), len(labs), dur))
            subprocess.run(['ffmpeg', '-v', 'error', '-y'] + ins + load(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'render.py'), 'renderm').graph_file_opt(gf) + ['-map', '[a]', '-ar', '48000', '-t', '%f' % dur, cw], check=True)   # -t：硬上限（10-18 ffmpeg 9 的 apad 曾經停不下來、寫出 416 GB）
            os.remove(gf); chunks.append(cw)
        if chunks:
            ins = sum((['-i', c] for c in chunks), [])
            mix = ''.join('[%d:a]' % k for k in range(len(chunks)))
            subprocess.run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex', mix + ('amix=inputs=%d:normalize=0:dropout_transition=0,alimiter=limit=0.95[a]' if FULL else 'amix=inputs=%d:normalize=0:dropout_transition=0,acompressor=threshold=0.18:ratio=4:attack=5:release=120:makeup=1.4,alimiter=limit=0.95[a]') % len(chunks),
                            '-map', '[a]', '-ar', '48000', '-t', '%f' % dur, wav], check=True)
            for c in chunks: os.remove(c)
        else:
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', str(dur), wav], check=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-start_number', str(int(frames[0][1:6])), '-i', os.path.join(d, 'f%05d.jpg'), '-i', wav,
                        '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-pix_fmt', 'yuv420p', '-g', '30',
                        '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
        os.remove(wav)

def generated():
    tmp = os.path.join(PROMO, 'out', '_cut3_tmp')
    edl = load(os.path.join(PROMO, 'edl3.py'), 'edl3m')
    for i, s in enumerate(edl.SEGMENTS):
        if s['kind'] in ('logo', 'montage'):
            src = os.path.join(tmp, 'seg%03d.mp4' % i)
            dst = os.path.join(GEN, ('pv_logo' if s['kind'] == 'logo' else 'pv_montage') + '.mp4')
            if os.path.exists(src): shutil.copy2(src, dst); print('生成段 →', rel(dst))

def project():
    edl = load(os.path.join(PROMO, 'edl3.py'), 'edl3m')
    uid = iter(range(1, 10 ** 6)); nid = lambda: 'c%d' % next(uid)
    V1, V2 = [], []; A_ft, A_sfx, A_bgm = [], [], []
    starts = [s['at'] for s in edl.SEGMENTS] + [edl.END]
    fr = lambda t: round(t * FPS) / FPS
    for i, s in enumerate(edl.SEGMENTS):
        a, b = fr(starts[i]), fr(starts[i + 1]); dur = fr(b - a)
        c = {'id': nid(), 'start': a, 'dur': dur, 'in': 0, 'speed': 1, 'fit': 'cover', 'motion': {'type': 'none', 'amt': 0.2},
             'fadeIn': 0, 'fadeOut': s.get('fadeout', 0), 'trans': {'type': 'white', 'dur': s['flash'] * 2} if s.get('flash') else None}
        k = s['kind']
        if k == 'scene':
            c.update(kind='video', src='tools/promo/editor/media/footage/%s.mp4' % s['scene'], **{'in': s['t']}, speed=s.get('speed', 1))
            au = {'id': nid(), 'src': c['src'], 'start': a, 'dur': dur, 'in': s['t'], 'speed': c['speed'], 'vol': 1, 'fadeIn': 0, 'fadeOut': 0, 'link': c['id']}
            c['link'] = au['id']; A_ft.append(au)
        elif k == 'video':
            c.update(kind='video', src=s['src'], speed=s.get('speed', 1), **{'in': s.get('start', 0)})
        elif k == 'still':
            c.update(kind='image', src=s['src'])
        elif k in ('logo', 'montage'):
            c.update(kind='video', src='tools/promo/editor/media/generated/%s.mp4' % ('pv_logo' if k == 'logo' else 'pv_montage'))
        if s.get('pan'):
            c['motion'] = {'type': s['pan'], 'amt': round(s.get('pan_amt', 1.22) - 1, 3) if s['pan'] in ('up', 'down') else 0.35}
        V1.append(c)
        for (tr, src, gn) in s.get('sfx', []):
            A_sfx.append({'id': nid(), 'src': src, 'start': fr(a + tr), 'dur': 3.0, 'in': 0, 'speed': 1, 'vol': round(0.75 * gn if not os.path.basename(src).startswith('vo_') else gn, 3), 'fadeIn': 0, 'fadeOut': 0})
        for (tr, img) in s.get('flashes', []):
            V2.append({'id': nid(), 'kind': 'image', 'src': img, 'start': fr(a + tr), 'dur': 3 / FPS, 'in': 0, 'speed': 1, 'fit': 'cover',
                       'motion': {'type': 'none', 'amt': 0}, 'fadeIn': 0, 'fadeOut': 0, 'trans': None})
    # 第一段之前沒有前一段：開頭那個白閃轉場拿掉
    if V1: V1[0]['trans'] = None
    # 音效長度抓真實長度
    for a in A_sfx:
        r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', os.path.join(ROOT, a['src'])], capture_output=True, text=True)
        try: a['dur'] = round(float(r.stdout.strip()), 3)
        except Exception: pass
    bgm = {'id': nid(), 'src': edl.BGM['src'], 'start': 0, 'dur': fr(edl.END), 'in': 0, 'speed': 1, 'vol': 1, 'fadeIn': 0, 'fadeOut': edl.BGM.get('fadeout', 1.2)}
    A_bgm.append(bgm)
    proj = {'name': 'pv_v3', 'w': 1080, 'h': 1920, 'fps': FPS, 'loudnorm': True, 'beat': {'clip': bgm['id']},
            'tracks': [{'id': 'v1', 'type': 'video', 'name': 'V1', 'clips': V1}, {'id': 'v2', 'type': 'video', 'name': 'V2', 'clips': V2},
                       {'id': 'a1', 'type': 'audio', 'name': 'BGM', 'clips': A_bgm}, {'id': 'a2', 'type': 'audio', 'name': '實機音', 'clips': A_ft},
                       {'id': 'a3', 'type': 'audio', 'name': '音效語音', 'clips': A_sfx}]}
    out = os.path.join(PROJ, 'pv_v3.json')
    json.dump(proj, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('專案 →', rel(out), '（%d 段影像、%d 段聲音）' % (len(V1) + len(V2), len(A_ft) + len(A_sfx) + 1))

if __name__ == '__main__':
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    if only in (None, 'footage'): footage(sys.argv[1])
    if only in (None, 'project'): generated(); project()
