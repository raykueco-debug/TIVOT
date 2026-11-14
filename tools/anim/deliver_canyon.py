# 卡耶爾交件（Ray 11-15：「現在做好的先接上」）：快剪版 I／A → resources/enemy/anim/<立繪名>_<動作>_v<N>/（frame_NN.webp ＋ anim.json）
# 格式同 deliver_kf2 的程式端版：canvas＝立繪畫布、box＝換回立繪座標、px＝實際像素、fps 24（holds 展開成逐格）
# 座標鏈：
#   Kling 片：立繪 →(kf_align_bbox 平移 tx,ty)→ wanA →(×sk 置中於 1080×1920，偏移 oxk,oyk)→ Kling 畫布 →(×k=720/1080)→ 影片
#   Kling 起手的 idle：影片 →(裁 crop box)→(tivot_wan to_green：裁 alpha>8 外框、×s、置中於 480×720)→ idle 格
#   飛行型 idle：立繪 →(to_green 同上)→ idle 格
# 用法：python deliver_canyon.py   （全部；已存在的資料夾不覆蓋，會跳過並提示）
import glob, json, os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(os.path.dirname(ROOT), 'ComfyUI-master', 'tivot_wan', 'out')
KF = os.path.join(ROOT, 'resources', 'enemy', '_neutral_refs', 'canyon_kf')
EN = os.path.join(ROOT, 'resources', 'enemy')
DST = os.path.join(EN, 'anim')
crop = json.load(open(os.path.join(KF, 'kling', 'idle_src', 'crop.json'), encoding='utf-8'))
GW, GH, FPS = 480, 720, 24
bb = lambda im, t=128: im.getchannel('A').point(lambda v: 255 if v > t else 0).getbbox()

def to_green_xf(im, fit):
    """tivot_wan.to_green 的正變換參數：(裁切左上角, 縮放 s, 貼上偏移)"""
    b = bb(im, 8); w, h = b[2] - b[0], b[3] - b[1]; s = min(GW * fit / w, GH * fit / h)
    iw, ih = max(1, round(w * s)), max(1, round(h * s))
    return b[0], b[1], s, (GW - iw) // 2, round((GH - ih) * 0.5)

def expand(d):
    h = json.load(open(os.path.join(d, 'holds.json')))
    fs = sorted(glob.glob(os.path.join(d, 'frame_*.webp')))
    return [f for f, k in zip(fs, h['holds']) for _ in range(k)]

def write(frames, portrait, to_portrait, name, loop):
    """frames：同一座標系的 RGBA 格；to_portrait(x,y)→立繪座標、scale＝每格像素對應幾個立繪像素"""
    od = os.path.join(DST, name)
    if os.path.exists(od): print(f'  ⚠ {name} 已存在，跳過（要換版請另給版號）'); return None
    ims = [Image.open(f).convert('RGBA') for f in frames]
    bs = [bb(im, 8) for im in ims]; U = (min(b[0] for b in bs if b), min(b[1] for b in bs if b), max(b[2] for b in bs if b), max(b[3] for b in bs if b))
    os.makedirs(od); tot = 0; areas = []
    for i, im in enumerate(ims):
        fn = os.path.join(od, f'frame_{i:02d}.webp'); im.crop(U).save(fn, 'WEBP', quality=82); tot += os.path.getsize(fn)
        areas.append(int((np.asarray(im)[..., 3] > 128).sum()))
    x0, y0, sc = to_portrait(U[0], U[1])
    cw, ch = U[2] - U[0], U[3] - U[1]
    box = [round(x0), round(y0), round(cw * sc), round(ch * sc)]
    por = Image.open(portrait)
    json.dump({'canvas': list(por.size), 'box': box, 'frames': len(ims), 'fps': FPS, 'loop': loop, 'px': [cw, ch]},
              open(os.path.join(od, 'anim.json'), 'w', encoding='utf-8'), indent=1)
    peak = int(np.argmax(areas))
    print(f'  {name}：{len(ims)} 格／{len(ims)/FPS:.2f} 秒，主體最大＝第 {peak} 格，box {box}，{tot//1024} KB')
    return {'name': name, 'frames': len(ims), 'peak': peak, 'kb': tot // 1024}

# 鐵衣／高蹺細影：Ray 要求重畫中立 ⇒ 新立繪 mon_canyon_*_neutral.webp（比照腐鹿骸 mon_stag_rot_neutral），動畫掛在新立繪底下
# (Kling 代號, 立繪檔名, 對齊圖, 動作資料夾後綴, 攻擊快剪資料夾)
KL = [('coffin', 'mon_canyon_coffinbeetle_dark', 'coffin_A', 'atk_v2', 'kling_coffin_atk'),
      ('crab', 'mon_canyon_bonecrab_dark', 'crab_A', 'delay_v1', 'kling_crab_atk'),
      ('pilgrim', 'mon_canyon_pilgrimmass_dark', 'pilgrim_A', 'miss_v1', 'kling_pilgrim_atklock'),
      ('wyrm', 'mon_canyon_bellwyrm_dark', 'wyrm_A', 'atk_v1', 'kling_wyrm_atklock'),
      ('iron', 'mon_canyon_ironpenitent_neutral', 'iron_N', 'delay_v1', 'kling_iron_atk'),
      ('ribcage', 'mon_canyon_ribcage_dark', 'ribcage_A', 'atk_v1', 'kling_ribcage_atk'),
      ('stilt', 'mon_canyon_stilt_neutral', 'stilt_N', 'miss_v1', 'kling_stilt_atk')]
report = {}
for n, por, wan, act, cutdir in KL:
    print(n)
    P = os.path.join(EN, por + '.webp'); pim, wim = Image.open(P).convert('RGBA'), Image.open(os.path.join(KF, 'wan', wan + '.png')).convert('RGBA')
    bp, bw = bb(pim), bb(wim); tx, ty = bw[0] - bp[0], bw[1] - bp[1]
    sk = min(1080 * 0.78 / wim.width, 1920 * 0.78 / wim.height); iwk, ihk = round(wim.width * sk), round(wim.height * sk)
    oxk, oyk = (1080 - iwk) // 2, (1920 - ihk) // 2; k = 720 / 1080
    v2p = lambda x, y: ((x / k - oxk) / sk - tx, (y / k - oyk) / sk - ty, 1 / (k * sk))
    r = {'A': write(expand(os.path.join(OUT, 'auto', cutdir)), P, v2p, f'{por}_{act}', False)}
    m = crop[n]; src = Image.open(os.path.join(KF, 'kling', 'idle_src', f'{n}_kling0.png')).convert('RGBA')
    cx, cy, s, px, py = to_green_xf(src, 0.92)
    def i2p(x, y, cx=cx, cy=cy, s=s, px=px, py=py, m=m):
        vx, vy, _ = (x - px) / s + cx + m['crop'][0], (y - py) / s + cy + m['crop'][1], 0
        X, Y, sc = v2p(vx, vy); return X, Y, sc / s
    r['I'] = write(expand(os.path.join(OUT, 'auto', f'kling_{n}_idle')), P, i2p, f'{por}_idle_v1', True)
    report[n] = r
PORT_IDLE = [('vulture', 'mon_canyon_saintvulture_dark', 0.60), ('crow', 'mon_canyon_bonecrow_dark', 0.80)] +             [(p.split('_')[2], p, 0.85) for p in ('mon_canyon_censer_dark', 'mon_canyon_hanged_dark', 'mon_canyon_houndbeast', 'mon_canyon_bellmite_dark',
                                                   'mon_canyon_chainhound_dark', 'mon_canyon_lanternimp_dark', 'mon_canyon_crawler_dark')]   # 11-15 剩下 7 隻（FIT 0.85）
for n, por, fit in PORT_IDLE:
    print(n)
    d = os.path.join(OUT, 'auto', f'{por}_fit60_idle' if n == 'vulture' else f'{por}_idle')
    P = os.path.join(EN, por + '.webp'); cx, cy, s, px, py = to_green_xf(Image.open(P).convert('RGBA'), fit)
    report[n] = {'I': write(expand(d), P, lambda x, y: ((x - px) / s + cx, (y - py) / s + cy, 1 / s), f'{por}_idle_v1', True)}
json.dump(report, open(os.path.join(KF, 'deliver_report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
