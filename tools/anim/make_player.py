# 掃動檔資料夾，寫 out/player_list.js（播放器讀它；file:// 不能列目錄所以要這一步）。
# 用法：python make_player.py   （新動檔出來後再跑一次，播放器重新整理即可）
import glob, json, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out')
TIVOT = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'TIVOT', 'resources', 'ci', 'anim')
items = []
for root, tag in ((os.path.join(OUT, 'auto'), '自動初剪'), (os.path.join(OUT, 'ci5s'), 'ci5s'), (os.path.join(OUT, 'toon'), 'toon'), (os.path.join(OUT, 'nr_layers'), '分層'), (os.path.join(OUT, 'cecilie'), '賽西莉'), (os.path.join(OUT, 'cecilie_lora'), '乳搖比較'), (os.path.join(OUT, 'ref'), '參考'), (os.path.join(OUT, 'vace'), 'vace'), (os.path.join(OUT, 'br'), 'br'), (os.path.join(OUT, 'ci'), 'ci'), (os.path.join(OUT, 'export'), '輸出'), (os.path.join(OUT, 'hit'), 'hit'), (os.path.join(OUT, 'guards'), 'guards'), (os.path.join(OUT, 'squad'), 'squad'), (os.path.join(OUT, 'purple_hit'), '紫月倒地'), (os.path.join(OUT, 'purple_idle'), '紫月待機'), (os.path.join(OUT, 'monsters'), 'monsters'), (os.path.join(OUT, 'enemy_atk'), '敵人攻擊'), (os.path.join(OUT, 'anya'), '安雅'), (os.path.join(OUT, 'bg'), '背景動畫'), (os.path.join(OUT, 'bg_test'), '背景試跑'), (os.path.join(OUT, 'bg_sample'), '背景樣本'), (os.path.join(OUT, 'pirate_atk_v2'), '空賊攻擊v2'), (os.path.join(OUT, 'pirate_atk_v3'), '空賊攻擊v3'), (os.path.join(OUT, 'pirate_atk_v6'), '空賊A v6（11-09 4070）'), (os.path.join(OUT, 'pirate_fix'), '空賊修正（11-09 4070）'), (os.path.join(OUT, 'kf2'), 'KF第二輪（11-09 4070）'), (TIVOT, '遊戲交件')):
    for d in sorted(glob.glob(os.path.join(root, '*'))):
        fs = sorted(os.path.basename(f) for f in glob.glob(os.path.join(d, 'frame_*.webp')))
        if not fs: continue
        rel = ('gameanim/' + os.path.basename(d)) if tag == '遊戲交件' else os.path.relpath(d, OUT).replace('\\', '/')
        hj = os.path.join(d, 'holds.json'); hd = json.load(open(hj)) if os.path.exists(hj) else {}
        items.append({'group': tag, 'name': os.path.basename(d), 'dir': rel, 'frames': fs, 'holds': hd.get('holds'), 'fps': hd.get('fps'),
                      'mtime': os.path.getmtime(d)})
# ── 遊戲交件：TIVOT/resources 底下所有已交的動檔（唯讀；網址 gameres/…）──
RES = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'TIVOT', 'resources')
def grp_of(rel):
    r = rel.replace(os.sep, '/')
    if 'skypirate_' in r:   # 空賊 8 組 28 人：獨立一組方便看
        return '空賊・' + ('待機' if '_idle_' in r else '攻擊' if '_atk_' in r else '倒地' if '_hit_' in r else '其他')
    if 'idle' in r: return '交件・待機'
    if '_hit_' in r or r.endswith('_hit') or '/fight_' in r: return '交件・倒地'
    return '交件・其他'
for root, dirs, files in os.walk(RES):
    dirs[:] = [d for d in dirs if not d.startswith('_') and d != 'layers']
    fs = sorted(f for f in files if f.startswith('frame_') and f.endswith('.webp'))
    if not fs: continue
    rel = os.path.relpath(root, RES).replace(os.sep, '/'); fps = None
    try: fps = json.load(open(os.path.join(root, 'anim.json'), encoding='utf-8')).get('fps')
    except Exception: pass
    items.append({'group': grp_of(rel), 'name': rel.split('/', 2)[-1].replace('/', ' / '), 'dir': 'gameres/' + rel, 'frames': fs,
                  'mtime': os.path.getmtime(root), 'fps': fps})
# CI 影片：拆成逐格快取在 out/_gameci/<檔名>/（影片比快取新才重拆）
VID = os.path.join(RES, 'ci', 'video'); CACHE = os.path.join(OUT, '_gameci')
if os.path.isdir(VID):
    import cv2
    for fn in sorted(os.listdir(VID)):
        if not fn.endswith('.mp4'): continue
        src = os.path.join(VID, fn); nm = fn[:-4]; od = os.path.join(CACHE, nm); stamp = os.path.join(od, '.src_mtime')
        mt = str(os.path.getmtime(src))
        if not (os.path.exists(stamp) and open(stamp).read() == mt):
            os.makedirs(od, exist_ok=True)
            for f in glob.glob(os.path.join(od, 'frame_*.webp')): os.remove(f)
            c = cv2.VideoCapture(src); k = 0
            while True:
                ok, fr = c.read()
                if not ok: break
                cv2.imwrite(os.path.join(od, f'frame_{k:03d}.webp'), fr, [cv2.IMWRITE_WEBP_QUALITY, 92]); k += 1
            fps = c.get(cv2.CAP_PROP_FPS) or 16
            json.dump({'fps': round(fps, 3)}, open(os.path.join(od, 'meta.json'), 'w')); open(stamp, 'w').write(mt)
        fs = sorted(os.path.basename(f) for f in glob.glob(os.path.join(od, 'frame_*.webp')))
        fps = json.load(open(os.path.join(od, 'meta.json'))).get('fps')
        items.append({'group': '交件・CI', 'name': nm, 'dir': '_gameci/' + nm, 'frames': fs, 'mtime': os.path.getmtime(src), 'fps': fps})
# 插畫影片（同 CI 影片的拆格快取）
IVID = os.path.join(RES, 'illustration', 'video')
if os.path.isdir(IVID):
    import cv2
    for fn in sorted(os.listdir(IVID)):
        if not fn.endswith('.mp4'): continue
        src = os.path.join(IVID, fn); nm = fn[:-4]; od = os.path.join(CACHE, 'ill_' + nm); stamp = os.path.join(od, '.src_mtime')
        mt = str(os.path.getmtime(src))
        if not (os.path.exists(stamp) and open(stamp).read() == mt):
            os.makedirs(od, exist_ok=True)
            for f in glob.glob(os.path.join(od, 'frame_*.webp')): os.remove(f)
            c = cv2.VideoCapture(src); k = 0
            while True:
                ok, fr = c.read()
                if not ok: break
                cv2.imwrite(os.path.join(od, f'frame_{k:03d}.webp'), fr, [cv2.IMWRITE_WEBP_QUALITY, 92]); k += 1
            fps = c.get(cv2.CAP_PROP_FPS) or 16
            json.dump({'fps': round(fps, 3)}, open(os.path.join(od, 'meta.json'), 'w')); open(stamp, 'w').write(mt)
        fs = sorted(os.path.basename(f) for f in glob.glob(os.path.join(od, 'frame_*.webp')))
        fps = json.load(open(os.path.join(od, 'meta.json'))).get('fps')
        items.append({'group': '交件・插畫', 'name': nm, 'dir': '_gameci/ill_' + nm, 'frames': fs, 'mtime': os.path.getmtime(src), 'fps': fps})

# 大分類（播放器上排的頁籤）：敵／插畫／CI／其他
import re
ILL_KEYS = set()
for d in (IVID, os.path.join(RES, 'illustration')):
    if os.path.isdir(d):
        for fn in os.listdir(d):
            k = re.sub(r'(_v\d+)?\.(mp4|webp|png|jpe?g)$', '', fn.lower())
            k = re.sub(r'^[\d_-]+', '', k)
            if len(k) >= 5: ILL_KEYS.add(k)
ENEMY_ROOTS = ('pirate_', 'enemy_atk/', 'gameres/enemy/', 'monsters/', 'hit/', 'guards/', 'squad/', 'purple_hit/', 'purple_idle/', 'idle_group/', 'test_guard')
CI_ROOTS = ('_gameci/', 'gameres/ci/', 'gameanim/', 'ci/', 'ci5s/', 'br/', 'vace/', 'nr_layers/', 'cecilie/', 'cecilie_lora/', 'toon/')
BG_ROOTS = ('bg/', 'bg_test/', 'bg_sample/', 'gameres/background/')
def cat_of(it):
    d, n = it['dir'], it['name'].lower()
    if d.startswith('kf2/'): return 'KF第二輪'   # 11-09 Ray Excel 標注的 8 隻
    if n.endswith('_l17_cut'): return '空賊A'   # 11-09 Ray：空賊攻擊獨立一頁
    if d.startswith(BG_ROOTS): return '背景'
    if it['group'] == '交件・插畫': return '插畫'
    if d.startswith(ENEMY_ROOTS) or 'enemy/' in d or re.match(r'^(man|mon)_', n) or ('fight_' in d and 'hit' in d): return '敵'
    if re.match(r'^\d', n) or any(k in n or (len(k) >= 10 and k[:10] in n) for k in ILL_KEYS): return '插畫'
    if re.search(r'(^|[_/])(ci|cutin|br|mb|dg\w*|nr\w*|nb\w*|ld|ni|obe|supply)([_/]|$)', n) or d.startswith(CI_ROOTS): return 'CI'
    return '其他'
for it in items: it['cat'] = cat_of(it)
# 11-10 Ray：「把空賊待剪分頁拿掉，把在那之後跑的圖開一頁出來」——
# 起點＝空賊待剪那一批（pirate_atk_v6／pirate_fix）最後一支的時間；之後跑的（非交件）打 after 旗標，player.html「空賊之後」頁籤只看它
_pir = [it['mtime'] for it in items if it['dir'].startswith(('pirate_atk_v6/','pirate_fix/'))]
AFTER_FROM = max(_pir) if _pir else 0
for it in items:
    if AFTER_FROM and it['mtime'] > AFTER_FROM and not it['group'].startswith('交件') and not it['dir'].startswith(('gameres/', 'export/')): it['after'] = True   # 交件成品與 Ray 剪好的輸出不算「跑的圖」
# 24 小時內的作業（非交件）頂到最上面，新跑的東西不會被埋在交件底下
import time as _t
_lt = _t.localtime(); NEW_FROM = _t.mktime((_lt.tm_year, _lt.tm_mon, _lt.tm_mday - 1, 0, 0, 0, 0, 0, -1))   # 昨天 00:00
# 「新作」是索引不是歸檔處（Ray 11-04：「新作應該是索引，不應該是歸檔處」）：
# 原本那一份留在自己的分組，另外複製一份到「新作（昨天起）・分類」頂到最上面；player.html 的「新作」頁籤只看 new 旗標。
# （11-09 合併：3060 版把原本那一份直接改組＝搬走，4070 版是 24 小時內另列一份；兩台各自分岔，這裡兩邊合一）
items += [dict(it, new=True, group='新作（昨天起）・' + it['cat']) for it in items
          if not it['group'].startswith('交件') and it['mtime'] >= NEW_FROM]

ORDER = ['新作（昨天起）・敵', '新作（昨天起）・背景', '新作（昨天起）・CI', '新作（昨天起）・插畫', '新作（昨天起）・其他', '交件・CI', '交件・插畫', '交件・待機', '交件・倒地', '交件・其他', '輸出', '參考']
items.sort(key=lambda x: (ORDER.index(x['group']) if x['group'] in ORDER else len(ORDER), x['group'], -x['mtime']))
open(os.path.join(OUT, 'player_list.js'), 'w', encoding='utf-8').write('window.ANIMS=' + json.dumps(items, ensure_ascii=False) + ';')
print(len(items), 'folders')
