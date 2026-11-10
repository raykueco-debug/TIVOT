"""背景線：Ray 11-10 看完 bgchk 的修正單（一次性的任務，跟 bg_queue 一起排 GPU）。
  · 純 Wan 整張：卡耶爾山谷 斷橋／谷底祭場、夏爾森林 斷崖邊／遺蹟入口
  · 夏爾森林：自動判斷把陽光斑誤認成火 ⇒ 拿掉橙色、提示詞只寫樹葉；圖騰／會冒出人的小徑設保護區（一律原圖）
"""
import glob, json, os, sys
import numpy as np, cv2
from PIL import Image
import bg_queue as Q
HERE = Q.HERE; COMFY = Q.COMFY; BG = Q.BG; PY = Q.PY
TAIL = '鏡頭完全固定不動。動漫風格，賽璐珞上色。'
PURE = ['canyon__bridge__day', 'canyon__altar__day', 'shinier_forest__cliff__day', 'shinier_forest__ruins__day']
# 保護區（768×512 座標的框，會放大到原圖）
FOREST = {
    'shinier_forest__entry__day': dict(boxes=[(596, 40, 704, 205)], extra='遠處的樹林樹梢也一起輕輕搖動'),
    'shinier_forest__glade__day': dict(boxes=[]),
    'shinier_forest__nest__day': dict(boxes=[(470, 140, 630, 270)]),
    'shinier_forest__trail__day': dict(boxes=[(290, 80, 430, 215), (50, 315, 305, 455)]),   # 小徑遠處（會冒人）＋左下的獸夾與鍊子（Ray：獸夾不要動）
    'shinier_forest__high__day': dict(boxes=[(380, 150, 768, 330)], reach=0),   # 會冒出小紅人：整段山徑原圖，且只換樹葉範圍（不往外擴）
}


def notes(key): return json.load(open(os.path.join(HERE, 'notes', key, 'notes.json'), encoding='utf8'))


def pick_b(frames, m):
    a0 = np.array(Image.open(frames[0]).convert('RGB')).astype(float)
    return max(range(16, 49), key=lambda i: float((np.abs(np.array(Image.open(frames[i]).convert('RGB')).astype(float) - a0) * m).sum()))


def aba(key, base, tag, prompt, seed, comp_args):
    j = notes(key); still = os.path.join(BG, j['file'])
    inp = os.path.join(COMFY, 'input', f'bg_{base}.png')
    Image.open(still).convert('RGB').resize((768, 512), Image.LANCZOS).save(inp)
    ab = f'bgl/{base}_{tag}_s101'; ba = f'bgl/{base}_{tag}_ba'
    if len(Q.wan_out(ab)) < 81:
        if not Q.wait_gpu(): return False
        ok, _ = Q.run([PY, 'bg_wan.py', os.path.basename(inp), ab, '81', prompt, str(seed)])
        if not ok: return False
    fs = Q.wan_out(ab)
    m = comp_args.get('mask', np.ones((512, 768, 1)))
    k = pick_b(fs, m)
    Image.open(fs[k]).convert('RGB').save(os.path.join(COMFY, 'input', f'bg_{base}_{tag}_B.png'))
    if len(Q.wan_out(ba)) < 33:
        if not Q.wait_gpu(): return False
        ok, _ = Q.run([PY, 'bg_flf.py', f'bg_{base}_{tag}_B.png', os.path.basename(inp), ba, '33', '持續自然地擺動，不要倒退回放，最後回到畫面原本的樣子。' + TAIL, str(seed)])
        if not ok: return False
    ok, out = Q.run([PY, 'aba_comp.py', still, key, ab, str(k), ba, f'{base}_{comp_args["name"]}'] + comp_args['extra'])
    if ok: Q.log('✔', key, tag, out.strip()[-160:])
    return ok


def main():
    print('已併進 bg_queue（ABCD 標準作業，選項寫在 notes.json 的 opts），這支不再跑'); return
    Q.log('修正單開始')
    for key in PURE:
        base = key.replace('__', '_')
        pe = ['--protect', os.path.join(HERE, 'notes', key, 'refined', 'cyan.png')] if key == 'canyon__altar__day' else []   # Ray：雲少的不動雲
        aba(key, base, 'pure', '動漫風格的背景。整個畫面隨風輕輕流動：天上的雲緩緩飄移，樹葉草叢與布條隨風擺動，水面微微波動。'
            '地面、岩石、建築都不動。' + TAIL, 202, dict(name='pure', extra=['--full'] + pe))
    for key, cfg in FOREST.items():
        base = key.replace('__', '_'); d = os.path.join(HERE, 'notes', key); j = notes(key)
        still = Image.open(os.path.join(BG, j['file'])); W, H = still.size
        # 森林沒有火：拿掉橙色；林間空地原本沒判到葉子（超過 45% 被略過）⇒ 這裡不設上限重做綠
        j['colors'] = [c for c in j['colors'] if c['name'] != 'orange']
        if not any(c['name'] == 'green' for c in j['colors']):
            import auto_annotate as A
            rgb = np.array(still.convert('RGB')); g = A.foliage(rgb, cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV))
            Image.fromarray(g * 255).save(os.path.join(d, 'green.png'))
            j['colors'].insert(0, {'name': 'green', 'rgb': A.COL['green'], 'text': '樹葉草叢隨風搖曳', 'mask': 'green.png'})
        j['fixed_by'] = 'fix_jobs'; j['general'] = '（自動判斷，Ray 11-10 修正：森林沒有火、圖騰與小徑保持原圖）'
        json.dump(j, open(os.path.join(d, 'notes.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        rd = os.path.join(d, 'refined')
        for f in glob.glob(os.path.join(rd, 'orange.png')): os.remove(f)   # 自動產生的中間檔
        for c in j['colors']:
            m = np.array(Image.open(os.path.join(d, c['mask'])).convert('L')).astype(np.float32)
            Image.fromarray(cv2.GaussianBlur(m, (0, 0), 2).clip(0, 255).astype(np.uint8)).save(os.path.join(rd, c['name'] + '.png'))
        P = np.zeros((H, W), np.uint8)
        for x0, y0, x1, y1 in cfg['boxes']: P[int(y0 * H / 512):int(y1 * H / 512), int(x0 * W / 768):int(x1 * W / 768)] = 255
        pp = os.path.join(d, 'protect.png'); Image.fromarray(P).save(pp)
        g = np.array(Image.open(os.path.join(rd, 'green.png')).convert('L').resize((768, 512))).astype(float)[..., None] / 255
        sky = [c['name'] for c in j['colors'] if '雲' in c['text']]
        extra = ['--protect', pp] + (['--sky', sky[0], '--nosky'] if sky else []) + (['--reach', str(cfg['reach'])] if 'reach' in cfg else [])
        desc = '樹葉與草叢隨風搖曳' + ('，' + cfg['extra'] if cfg.get('extra') else '')
        aba(key, base, 'fix', f'動漫風格的森林背景。微風吹過：{desc}。只有枝葉在動，樹幹、地面、岩石、小徑、天空都完全不動。' + TAIL, 303,
            dict(name='abacloth', extra=extra, mask=g))
    Q.log('修正單完成')


if __name__ == '__main__':
    main()
