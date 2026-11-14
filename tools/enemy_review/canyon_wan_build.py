# 卡耶爾 Wan 審閱頁的資料：讀 ComfyUI out/auto/canyon_*（自動初剪＋holds）與 out/canyon_kf/*（原片）→ canyon_wan_data.json
import glob, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(HERE))), 'ComfyUI-master', 'tivot_wan', 'out')

ROWS = [  # id, 名字, 動作說明, 段（依播放順序）
    ('colossus', '崩岩巨像', 'M 咆哮', ['colossus_A_AB', 'colossus_B_BA']),
    ('coffin', '石棺甲蟲', 'A 撲擊', ['coffin_A_AB', 'coffin_B_BA']),
    ('crab', '骸殼蟹', 'D 雙鉗張開', ['crab_A_AB', 'crab_B_BA']),
    ('pilgrim', '朝聖者團塊', 'M 張手', ['pilgrim_A_AB', 'pilgrim_B_BA']),
    ('wyrm', '喪鐘蠕蟲', 'A 朝鏡頭攻擊', ['wyrm_A_AB', 'wyrm_B_BA']),
    ('iron', '鐵衣苦修者', 'D 砸擊（新中立→原圖蓄力→砸擊→回中立）', ['iron_N_NW', 'iron_W_WD', 'iron_D_DN']),
    ('ribcage', '肋籠獸', 'A 側移張口（火交程式）', ['ribcage_A_AB', 'ribcage_B_BA']),
    ('stilt', '高蹺細影', 'M 爪擊（新中立→原圖）', ['stilt_N_NM', 'stilt_M_MN']),
]


def seg(name):
    fr = lambda d: sorted(os.path.basename(f) for f in glob.glob(os.path.join(OUT, d, 'frame_*.webp')))
    auto = 'auto/canyon_' + name
    h = os.path.join(OUT, auto, 'holds.json')
    holds = json.load(open(h, encoding='utf-8')) if os.path.exists(h) else {}
    return {'name': name, 'raw': 'canyon_kf/' + name, 'rawFrames': fr('canyon_kf/' + name),
            'auto': auto, 'autoFrames': fr(auto), 'holds': holds.get('holds'), 'fps': holds.get('fps', 24)}


data = [{'id': i, 'name': n, 'act': a, 'segs': [seg(s) for s in ss]} for i, n, a, ss in ROWS]
json.dump({'rows': data}, open(os.path.join(HERE, 'canyon_wan_data.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print(len(data), 'rows')
