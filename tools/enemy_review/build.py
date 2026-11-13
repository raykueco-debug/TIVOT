# 敵人動畫審閱頁的資料：掃 resources/enemy/anim/ 已交件的動畫，依敵人分列 → data.json
# 由 serve.py 在每次 GET /data.json 時重跑（新交件不必手動重建）。
import glob, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ANIM = os.path.join(ROOT, 'resources', 'enemy', 'anim')

ACT = {'idle': 'I', 'atk': 'A', 'delay': 'D', 'miss': 'M', 'hit': 'E'}
PAT = re.compile(r'^(.*?)_(low_idle|idle|atkprep|atk|delay|miss|hit|burst|flap|enter|enc_[a-z]+)(?:_(v\d+|s\d+))?$')


def names():
    """圖檔 basename → [(編號, 名字, 鍵)]，讀 Ray 的兩份編排表。"""
    out = {}
    try:
        import openpyxl
    except ImportError:
        return out
    for f in ('敵人一覽_非空戰_動畫編排.xlsx', '敵人一覽_空戰_動畫編排.xlsx'):
        p = os.path.join(ROOT, f)
        if not os.path.exists(p):
            continue
        for ws in openpyxl.load_workbook(p, data_only=True, read_only=True):
            rows = ws.iter_rows(values_only=True)
            head = [str(c or '').strip() for c in next(rows)]
            try:
                i_no, i_nm, i_key, i_img = head.index('編號'), head.index('名字'), head.index('鍵（敵卡）'), head.index('圖檔')
            except ValueError:
                continue
            for r in rows:
                img = r[i_img]
                if not img:
                    continue
                b = os.path.splitext(os.path.basename(str(img).rstrip('/')))[0].replace('_layers', '')
                out.setdefault(b, []).append((str(r[i_no] or ''), str(r[i_nm] or ''), str(r[i_key] or '')))
    return out


def clip(d):
    """一個動畫資料夾 → {members:[{name, anim, frames:[...]}]}（群組資料夾每個成員一支）。"""
    def one(path, label):
        aj = json.load(open(os.path.join(path, 'anim.json'), encoding='utf-8'))
        fr = sorted(os.path.basename(x) for x in glob.glob(os.path.join(path, 'frame_*.webp')))
        rel = os.path.relpath(path, ROOT).replace('\\', '/')
        return {'name': label, 'dir': rel, 'canvas': aj.get('canvas'), 'box': aj.get('box'),
                'fps': aj.get('fps', 12), 'loop': aj.get('loop', True), 'frames': fr}
    if os.path.exists(os.path.join(d, 'anim.json')):
        return [one(d, '')]
    return [one(os.path.dirname(j), os.path.basename(os.path.dirname(j)))
            for j in sorted(glob.glob(os.path.join(d, '*', 'anim.json')))]


FALLBACK = {'man_thug_squad': '里朋一家（群）', 'saint_tr': '訓練用聖徒', 'saint_tr_neutral2': '訓練用聖徒（新架勢）',
            'mon_np_anyawings': '紫黑之爪（安雅光翼）', 'mon_tree_dragon': '樹龍', 'mon_shinierforest_crows': '森林鴉群'}


def fallback_name(base):
    m = re.match(r'man_skypirate_(\d+)$', base)
    if m:
        return [f'空賊 第{m.group(1)}組']
    for k, v in FALLBACK.items():
        if base == k or base.startswith(k + '_'):
            return [v + ('' if base == k else '・' + base[len(k) + 1:])]
    return []


def build():
    nm = names()
    groups = {}
    for d in sorted(glob.glob(os.path.join(ANIM, '*', ''))):
        folder = os.path.basename(d.rstrip('/\\'))
        if folder.startswith('_'):
            continue
        m = PAT.match(folder)
        if not m:
            continue
        base, act, ver = m.group(1), m.group(2), m.group(3) or ''
        note = ''
        if base.endswith('_neutral'):          # 新 A 中立版歸回本體那一列
            base, note = base[:-len('_neutral')], '新A'
        col = ACT.get(act, 'X')
        label = (ver or act) if col != 'X' else act + ('_' + ver if ver else '')
        if note:
            label = note + ' ' + label
        try:
            mem = clip(d)
        except Exception as e:
            mem = []
            label += f'（讀取失敗：{e}）'
        g = groups.setdefault(base, {'base': base, 'cols': {}})
        g['cols'].setdefault(col, []).append({'folder': folder, 'label': label, 'ver': ver, 'members': mem})
    rows = []
    for base, g in groups.items():
        info = nm.get(base, [])
        g['ids'] = [i for i, _, _ in info]
        g['names'] = sorted({n for _, n, _ in info if n}) or fallback_name(base)
        g['keys'] = [k for _, _, k in info]
        for col in g['cols'].values():          # 新版排前面（預設顯示最新）
            col.sort(key=lambda c: (int(re.sub(r'\D', '', c['ver']) or 0), c['label']), reverse=True)
        rows.append(g)
    def order(g):
        ids = [int(re.sub(r'\D', '', i) or 9999) for i in g['ids']] or [9999]
        return (min(ids), g['base'])
    rows.sort(key=order)
    json.dump({'rows': rows}, open(os.path.join(HERE, 'data.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    return len(rows)


if __name__ == '__main__':
    print(build(), 'rows')
