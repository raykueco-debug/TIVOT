# 卡耶爾交件（Ray 11-15：「現在做好的先接上」）：I／A → resources/enemy/anim/<立繪名>_<動作>_v<N>/（frame_NN.webp ＋ anim.json）
# 格式同 deliver_kf2 的程式端版：canvas＝立繪畫布、box＝換回立繪座標、px＝實際像素、fps 24（holds 展開成逐格）
# 座標鏈：
#   Kling 片：立繪 →(kf_align_bbox 平移 tx,ty)→ wanA →(×sk 置中於 1080×1920，偏移 oxk,oyk)→ Kling 畫布 →(×k=720/1080)→ 影片
#   Kling 起手的 idle：影片 →(裁 crop box)→(tivot_wan to_green：裁 alpha>8 外框、×s、置中於 480×720)→ idle 格
#   飛行型與其餘 idle：立繪 →(to_green 同上)→ idle 格
# ITEMS：交件名 → 立繪、座標換算、原片資料夾、快剪資料夾（animechk 與 canyon_watch.py 共用這一份）
# 用法：python deliver_canyon.py            首次交件（用快剪；已存在的不覆蓋）
#       python deliver_canyon.py --list     列出 ITEMS
import glob, json, os, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(os.path.dirname(ROOT), 'ComfyUI-master', 'tivot_wan', 'out')
KF = os.path.join(ROOT, 'resources', 'enemy', '_neutral_refs', 'canyon_kf')
EN = os.path.join(ROOT, 'resources', 'enemy')
DST = os.path.join(EN, 'anim')
GW, GH, FPS = 480, 720, 24
bb = lambda im, t=128: im.getchannel('A').point(lambda v: 255 if v > t else 0).getbbox()


def to_green_xf(im, fit):
    """tivot_wan.to_green 的正變換參數：(裁切左上角 x,y, 縮放 s, 貼上偏移 px,py)"""
    b = bb(im, 8); w, h = b[2] - b[0], b[3] - b[1]; s = min(GW * fit / w, GH * fit / h)
    iw, ih = max(1, round(w * s)), max(1, round(h * s))
    return b[0], b[1], s, (GW - iw) // 2, round((GH - ih) * 0.5)


def expand_auto(d):
    h = json.load(open(os.path.join(d, 'holds.json')))
    fs = sorted(glob.glob(os.path.join(d, 'frame_*.webp')))
    return [f for f, k in zip(fs, h['holds']) for _ in range(k)]


def expand_export(d):
    """animechk 輸出（out/export/<名>/）：frame_NN.webp ＋ export.json 的 holds"""
    e = json.load(open(os.path.join(d, 'export.json'), encoding='utf-8'))
    fs = sorted(glob.glob(os.path.join(d, 'frame_*.webp')))
    hs = e.get('holds') or [1] * len(fs)
    return [f for f, k in zip(fs, hs) for _ in range(k)], e.get('fps') or FPS


def write(frames, item, fps=FPS, overwrite=False):
    od = os.path.join(DST, item['name'])
    if os.path.exists(od) and not overwrite: print(f'  ⚠ {item["name"]} 已存在，跳過'); return None
    os.makedirs(od, exist_ok=True)
    for f in glob.glob(os.path.join(od, 'frame_*.webp')): os.remove(f)
    ims = [Image.open(f).convert('RGBA') for f in frames]
    bs = [bb(im, 8) for im in ims]; U = (min(b[0] for b in bs if b), min(b[1] for b in bs if b), max(b[2] for b in bs if b), max(b[3] for b in bs if b))
    tot, areas = 0, []
    for i, im in enumerate(ims):
        fn = os.path.join(od, f'frame_{i:02d}.webp'); im.crop(U).save(fn, 'WEBP', quality=82); tot += os.path.getsize(fn)
        areas.append(int((np.asarray(im)[..., 3] > 128).sum()))
    x0, y0, sc = item['to_portrait'](U[0], U[1])
    cw, ch = U[2] - U[0], U[3] - U[1]
    box = [round(x0), round(y0), round(cw * sc), round(ch * sc)]
    json.dump({'canvas': list(Image.open(item['portrait']).size), 'box': box, 'frames': len(ims), 'fps': fps, 'loop': item['loop'], 'px': [cw, ch]},
              open(os.path.join(od, 'anim.json'), 'w', encoding='utf-8'), indent=1)
    peak = int(np.argmax(areas))
    print(f'  {item["name"]}：{len(ims)} 格／{len(ims)/fps:.2f} 秒，主體最大＝第 {peak} 格，box {box}，{tot//1024} KB')
    return {'name': item['name'], 'frames': len(ims), 'peak': peak, 'kb': tot // 1024, 'box': box}


def build_items():
    crop = json.load(open(os.path.join(KF, 'kling', 'idle_src', 'crop.json'), encoding='utf-8'))
    items = {}
    # 鐵衣／高蹺細影：Ray 要求重畫中立 ⇒ 新立繪 mon_canyon_*_neutral.webp（比照腐鹿骸），動畫掛在新立繪底下
    # (Kling 代號, 中文, 立繪檔名, 對齊圖, 動作後綴, 攻擊原片, 攻擊快剪)
    KL = [('coffin', '石棺甲蟲', 'mon_canyon_coffinbeetle_dark', 'coffin_A', 'atk_v2', 'kling_atk', 'kling_coffin_atk'),
          ('crab', '骸殼蟹', 'mon_canyon_bonecrab_dark', 'crab_A', 'delay_v1', 'kling_atk', 'kling_crab_atk'),
          ('pilgrim', '朝聖者團塊', 'mon_canyon_pilgrimmass_dark', 'pilgrim_A', 'miss_v1', 'kling_atk_lock', 'kling_pilgrim_atklock'),
          ('wyrm', '喪鐘蠕蟲', 'mon_canyon_bellwyrm_dark', 'wyrm_A', 'atk_v1', 'kling_atk_lock', 'kling_wyrm_atklock'),
          ('iron', '鐵衣苦修者', 'mon_canyon_ironpenitent_neutral', 'iron_N', 'delay_v1', 'kling_atk', 'kling_iron_atk'),
          ('ribcage', '肋籠獸', 'mon_canyon_ribcage_dark', 'ribcage_A', 'atk_v1', 'kling_atk', 'kling_ribcage_atk'),
          ('stilt', '高蹺細影', 'mon_canyon_stilt_neutral', 'stilt_N', 'miss_v1', 'kling_atk', 'kling_stilt_atk')]
    for n, zh, por, wan, act, rawroot, cutdir in KL:
        P = os.path.join(EN, por + '.webp'); pim, wim = Image.open(P).convert('RGBA'), Image.open(os.path.join(KF, 'wan', wan + '.png')).convert('RGBA')
        bp, bw = bb(pim), bb(wim); tx, ty = bw[0] - bp[0], bw[1] - bp[1]
        sk = min(1080 * 0.78 / wim.width, 1920 * 0.78 / wim.height); iwk, ihk = round(wim.width * sk), round(wim.height * sk)
        oxk, oyk = (1080 - iwk) // 2, (1920 - ihk) // 2; k = 720 / 1080
        v2p = lambda x, y, tx=tx, ty=ty, sk=sk, oxk=oxk, oyk=oyk, k=k: ((x / k - oxk) / sk - tx, (y / k - oyk) / sk - ty, 1 / (k * sk))
        items[f'{por}_{act}'] = {'name': f'{por}_{act}', 'zh': f'{zh}・{act.split("_")[0].upper().replace("ATK","A").replace("DELAY","D").replace("MISS","M")}',
                                'portrait': P, 'to_portrait': v2p, 'loop': False, 'raw': f'{rawroot}/{n}', 'auto': f'auto/{cutdir}'}
        m = crop[n]; src = Image.open(os.path.join(KF, 'kling', 'idle_src', f'{n}_kling0.png')).convert('RGBA')
        cx, cy, s, px, py = to_green_xf(src, 0.92)
        def i2p(x, y, cx=cx, cy=cy, s=s, px=px, py=py, c0=m['crop'][0], c1=m['crop'][1], v2p=v2p):
            X, Y, sc = v2p((x - px) / s + cx + c0, (y - py) / s + cy + c1); return X, Y, sc / s
        items[f'{por}_idle_v1'] = {'name': f'{por}_idle_v1', 'zh': f'{zh}・I', 'portrait': P, 'to_portrait': i2p, 'loop': True,
                                   'raw': f'kling_idle/{n}_kling0', 'auto': f'auto/kling_{n}_idle'}
    PI = [('聖面鷲', 'mon_canyon_saintvulture_dark', 0.60, 'mon_canyon_saintvulture_dark_fit60'), ('骨鴉', 'mon_canyon_bonecrow_dark', 0.80, None),
          ('香爐蠍', 'mon_canyon_censer_dark', 0.85, None), ('崖縫吊屍者', 'mon_canyon_hanged_dark', 0.85, None), ('餓獸', 'mon_canyon_houndbeast', 0.85, None),
          ('鐘殼蟲', 'mon_canyon_bellmite_dark', 0.85, None), ('鎖鏈餓犬', 'mon_canyon_chainhound_dark', 0.85, None),
          ('提燈小鬼', 'mon_canyon_lanternimp_dark', 0.85, None), ('爬行朝聖者', 'mon_canyon_crawler_dark', 0.85, None)]
    for zh, por, fit, gen in PI:
        P = os.path.join(EN, por + '.webp'); cx, cy, s, px, py = to_green_xf(Image.open(P).convert('RGBA'), fit)
        gen = gen or por
        items[f'{por}_idle_v1'] = {'name': f'{por}_idle_v1', 'zh': f'{zh}・I', 'portrait': P, 'loop': True,
                                   'to_portrait': lambda x, y, cx=cx, cy=cy, s=s, px=px, py=py: ((x - px) / s + cx, (y - py) / s + cy, 1 / s),
                                   'raw': f'kling_idle/{gen}', 'auto': f'auto/{gen}_idle'}
    return items


if __name__ == '__main__':
    ITEMS = build_items()
    if '--list' in sys.argv:
        for k, v in ITEMS.items(): print(k, v['zh'], v['raw'], v['auto'])
        sys.exit()
    for k, it in ITEMS.items(): write(expand_auto(os.path.join(OUT, it['auto'])), it)
