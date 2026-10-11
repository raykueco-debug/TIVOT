# 掃動檔資料夾，寫 out/player_list.js（播放器讀它；file:// 不能列目錄所以要這一步）。
# 用法：python make_player.py   （新動檔出來後再跑一次，播放器重新整理即可）
import glob, json, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out')
TIVOT = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'TIVOT', 'resources', 'ci', 'anim')
items = []
for root, tag in ((os.path.join(OUT, 'auto'), '自動初剪'), (os.path.join(OUT, 'ci5s'), 'ci5s'), (os.path.join(OUT, 'toon'), 'toon'), (os.path.join(OUT, 'nr_layers'), '分層'), (os.path.join(OUT, 'cecilie'), '賽西莉'), (os.path.join(OUT, 'cecilie_lora'), '乳搖比較'), (os.path.join(OUT, 'ref'), '參考'), (os.path.join(OUT, 'vace'), 'vace'), (os.path.join(OUT, 'br'), 'br'), (os.path.join(OUT, 'ci'), 'ci'), (os.path.join(OUT, 'export'), '輸出'), (os.path.join(OUT, 'hit'), 'hit'), (os.path.join(OUT, 'guards'), 'guards'), (os.path.join(OUT, 'squad'), 'squad'), (os.path.join(OUT, 'monsters'), 'monsters'), (TIVOT, '遊戲交件')):
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
ORDER = ['交件・CI', '交件・待機', '交件・倒地', '交件・其他', '輸出', '參考']
items.sort(key=lambda x: (ORDER.index(x['group']) if x['group'] in ORDER else len(ORDER), x['group'], -x['mtime']))
open(os.path.join(OUT, 'player_list.js'), 'w', encoding='utf-8').write('window.ANIMS=' + json.dumps(items, ensure_ascii=False) + ';')
print(len(items), 'folders')
