# 夏爾三區重做交件（Ray 11-24）：animechk 剪好的 sh_*_cut → 接成一支 → 換算回遊戲立繪畫布，交 webp＋anim.json
# 用法：python deliver_shinier.py            （全部）
#       python deliver_shinier.py 名字...    （只交這幾支，名字＝JOBS 的鍵）
#  · 兩段都有剪：AB_cut ＋ BA_cut（AB 收在 B、BA 從 B 起時，接點只留一張）
#  · 只剪 AB：R＝AB 原片從最後一格往回倒放、留 1/3（ver -2939 起伊甸古墓的作法），回到第 0 格
#  · loop：只用剪好的那一段，loop:true
#  · 剪片有 _cut_2、_cut_3 時取最新那一版
#  · fix：{原片段: {原片格號: 修好的 png}}，換掉剪片裡對應的那一格（眼睛塗白／挖黑）
#  · 座標：生成格（480×720，FIT 0.78 置中）→ Wan 輸入圖（alpha>8 外框）→ 立繪（alpha>128 外框對齊、等高）
import json, os, sys
from PIL import Image

OUT = r'C:\Users\Ray Ku\Desktop\ComfyUI-master\tivot_wan\out'
ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
WAN = os.path.join(ROOT, 'resources', 'enemy', '_neutral_refs', 's4_kf', 'wan')
ANIM = os.path.join(ROOT, 'resources', 'enemy', 'anim')
FIX = os.path.join(ROOT, 'resources', 'enemy', '_neutral_refs', 's4_kf', 'eyefix')
FIT, FPS = 0.78, 24
E = lambda n: os.path.join(ROOT, 'resources', 'enemy', n)

# 鍵: (Wan 名, 立繪, 輸出資料夾, 種類 ab|loop|split, fix)
JOBS = {
  'husk_pounce':      ('husk_pounce', E('mon_bear_husk.webp'), 'mon_bear_husk_atk_v1', 'ab', None),
  'husk_claw':        ('husk_claw', E('mon_bear_husk.webp'), 'mon_bear_husk_delay_v1', 'ab', None),
  'husk_idle':        ('husk_idle', E('mon_bear_husk.webp'), 'mon_bear_husk_idle_v3', 'loop', None),
  'halo_contract':    ('halo_contract', E('mon_halo_ring.webp'), 'mon_halo_ring_atk_v1', 'ab', None),
  'organ_bite':       ('organ_bite', E('mon_beast_organ.webp'), 'mon_beast_organ_atk_v1', 'ab', {'BA': 'organ_bite_B_BA'}),
  'organ_charge':     ('organ_charge', E('mon_beast_organ.webp'), 'mon_beast_organ_delay_v1', 'ab', None),
  'bear_pounce':      ('bear_pounce', E('mon_bear_nightmare.webp'), 'mon_bear_nightmare_atk_v1', 'ab', None),
  'reliquary_chest':  ('reliquary_chest', E('mon_beast_reliquary.webp'), 'mon_beast_reliquary_atk_v1', 'ab', None),
  'reliquary_swipe':  ('reliquary_swipe', E('mon_beast_reliquary.webp'), 'mon_beast_reliquary_delay_v1', 'ab', None),
  'bellreacher_slam': ('bellreacher_slam', E('mon_relic_bellreacher.webp'), 'mon_relic_bellreacher_atk_v1', 'ab', None),
  'bellreacher_shake':('bellreacher_shake', E('mon_relic_bellreacher.webp'), 'mon_relic_bellreacher_shake_v1', 'loop', None),
  'bellwalker_slam':  ('bellwalker_slam', E('mon_relic_bellwalker.webp'), 'mon_relic_bellwalker_atk_v1', 'ab', None),
  'bellwalker_shake': ('bellwalker_shake', E('mon_relic_bellwalker.webp'), 'mon_relic_bellwalker_shake_v1', 'loop', None),
  'heart_claw':       ('heart_claw', E('mon_relic_heartripper.webp'), 'mon_relic_heartripper_atk_v1', 'ab', None),
  'shackle_bite':     ('shackle_bite', E('mon_beast_shackle.webp'), 'mon_beast_shackle_atk_v1', 'ab', {'BA': 'shackle_bite_B_BA'}),
  'temperance_grab':  ('temperance_grab', E('mon_saint_temperance.webp'), 'mon_saint_temperance_atk_v1', 'ab', None),
  'temperance_split': ('temperance_split', E('mon_saint_temperance.webp'), 'mon_saint_temperance_split_v1', 'split', None),
  'inspector_scythe': ('inspector_scythe', E('mon_saint_inspector.webp'), 'mon_saint_inspector_atk_v1', 'ab', None),
  'thug_punch':       ('thug_punch', E('mon_saint_thug.webp'), 'mon_saint_thug_atk_v1', 'ab', None),
  'bear_roar':        ('bear_roar', E('mon_bear_nightmare.webp'), 'mon_bear_nightmare_delay_v1', 'ab', None),   # 黑炎改程式火：無火 B（Ray 11-24）
  'organ_idle':       ('organ_idle', E('mon_beast_organ.webp'), 'mon_beast_organ_idle_v3', 'loop', None),   # 新 A（去煙）重跑的待機
  'stag_roar':        ('stag_roar', E('mon_stag_nightmare.webp'), 'mon_stag_nightmare_atk_v1', 'ab', None),   # 鹿骸黑炎改程式火（攻擊＝延時同一支）
  'tspawn_lunge':     ('tspawn_lunge', E('mon_saint_temperance_spawn.webp'), 'mon_saint_temperance_spawn_atk_v1', 'ab', None),   # 節制者分離怪 撲抓
  'tspawn_idle':      ('tspawn', E('mon_saint_temperance_spawn.webp'), 'mon_saint_temperance_spawn_idle_v1', 'loop', None),
  'tspawn_enter':     ('tspawn_lunge', E('mon_saint_temperance_spawn.webp'), 'mon_saint_temperance_spawn_enter_v1', 'seg', None),   # 出場＝撲抓的 BA 剪片（Ray：SPAWN 用，程式從畫面底部平移入鏡、結尾回拉）
  'thug_slam':        ('thug_slam', E('mon_saint_thug.webp'), 'mon_saint_thug_delay_v1', 'ab', None),
}

LOOPSEG = {'organ_idle': 'organ_idle_A_loop3', 'tspawn_enter': 'tspawn_lunge_B_BA'}
NOBA = {'tspawn_lunge'}   # BA 剪片另有用途（分離怪的 BA 拿去當出場），攻擊的 R 照樣倒放   # 待機剪的不是第一版時（Ray 11-24：loop2 嘴會動，用 loop3）

def cutdir(seg):
    base = os.path.join(OUT, 'export', f'sh_{seg}_cut')
    c = [base] + [f'{base}_{k}' for k in range(2, 9) if os.path.isdir(f'{base}_{k}')]
    c = [d for d in c if os.path.isdir(d)]
    return c[-1] if c else None

def cutframes(seg, fix=None):
    d = cutdir(seg); j = json.load(open(os.path.join(d, 'export.json'), encoding='utf-8'))
    fs = sorted(f for f in os.listdir(d) if f.startswith('frame_'))
    assert len(fs) == sum(j['holds']), d
    out, p = [], 0
    for k, h in zip(j['kept_index'], j['holds']):
        f = os.path.join(d, fs[p])
        if fix and os.path.exists(os.path.join(FIX, fix, f'frame_{k:02d}.png')):
            f = os.path.join(FIX, fix, f'frame_{k:02d}.png')
        out += [f] * h; p += h
    return out, j['kept_index']

def raw(seg, i): return os.path.join(OUT, 'enemy_atk', f'sh_{seg}', f'frame_{i:02d}.webp')

def build(key):
    wan, por, dst, kind, fix = JOBS[key]
    fix = fix or {}
    hit = None
    if kind == 'loop':
        seq, _ = cutframes(LOOPSEG.get(key, f'{wan}_A_loop')); a = f'{wan}_A.png'
    elif kind == 'seg':
        seq, _ = cutframes(LOOPSEG[key]); a = f'{wan}_A.png'
    elif kind == 'split':
        ab, k1 = cutframes(f'{wan}_A_AB'); ba, k2 = cutframes(f'{wan}_B_drain')
        seq = ab + ba; hit = len(ab) - 1; a = f'{wan}_A.png'
    else:
        a = f'{wan}_A.png'
        ab, k1 = cutframes(f'{wan}_A_AB', fix.get('AB'))
        if cutdir(f'{wan}_B_BA') and key not in NOBA:
            ba, k2 = cutframes(f'{wan}_B_BA', fix.get('BA'))
            if k1[-1] >= 47 and k2[0] == 0: ba = ba[1:]
            r = 'BA 剪片'
        else:
            idx = list(range(k1[-1] - 1, -1, -3))
            if idx[-1] != 0: idx.append(0)
            ba = [raw(f'{wan}_A_AB', i) for i in idx]
            r = f"倒放留 1/3 {len(ba)} 格"
        seq = ab + ba; hit = len(ab) - 1
    fr = [Image.open(p).convert('RGBA') for p in seq]
    W, H = fr[0].size; assert all(f.size == (W, H) for f in fr)
    # 生成格 → Wan 輸入 → 立繪
    A = Image.open(os.path.join(WAN, a)).convert('RGBA')
    b8 = A.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    cw0, ch0 = b8[2] - b8[0], b8[3] - b8[1]
    s = min(W * FIT / cw0, H * FIT / ch0); w2, h2 = round(cw0 * s), round(ch0 * s)
    ox, oy = (W - w2) // 2, round((H - h2) * 0.5)
    P = Image.open(por).convert('RGBA')
    bb = lambda im: im.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
    bw, bp = bb(A), bb(P)
    r2 = (bp[3] - bp[1]) / (bw[3] - bw[1])
    cxw, cxp = (bw[0] + bw[2]) / 2, (bp[0] + bp[2]) / 2
    tox = lambda x: cxp + ((x - ox) / s + b8[0] - cxw) * r2
    toy = lambda y: bp[3] + ((y - oy) / s + b8[1] - bw[3]) * r2
    fb = None
    for f in fr:
        b = f.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        if b: fb = b if fb is None else (min(fb[0], b[0]), min(fb[1], b[1]), max(fb[2], b[2]), max(fb[3], b[3]))
    out = os.path.join(ANIM, dst); os.makedirs(out, exist_ok=True); tot = 0
    for f in os.listdir(out):
        if f.startswith('frame_'): os.remove(os.path.join(out, f))
    for j, f in enumerate(fr):
        p = os.path.join(out, f'frame_{j:02d}.webp'); f.crop(fb).save(p, 'WEBP', quality=85, alpha_quality=90, method=6); tot += os.path.getsize(p)
    cw, ch = fb[2] - fb[0], fb[3] - fb[1]
    box = [round(tox(fb[0])), round(toy(fb[1])), round(cw / s * r2), round(ch / s * r2)]
    json.dump({'canvas': list(P.size), 'box': box, 'frames': len(fr), 'fps': FPS, 'loop': kind == 'loop', 'px': [cw, ch]},
              open(os.path.join(out, 'anim.json'), 'w'), indent=1)
    print(f'{dst}: {len(fr)} 格／{len(fr)/FPS:.2f} 秒' + (f'，打到＝第 {hit} 格' if hit is not None else '') +
          (f'（R：{r}）' if kind == 'ab' else '') + f'，box {box}，{tot//1024} KB')
    return dst, hit

if __name__ == '__main__':
    for k in (sys.argv[1:] or JOBS): build(k)
