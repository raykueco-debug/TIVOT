# 掃動檔資料夾，寫 out/player_list.js（播放器讀它；file:// 不能列目錄所以要這一步）。
# 用法：python make_player.py   （新動檔出來後再跑一次，播放器重新整理即可）
import glob, json, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out')
TIVOT = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'TIVOT', 'resources', 'ci', 'anim')
items = []
for root, tag in ((os.path.join(OUT, 'ci'), 'ci'), (os.path.join(OUT, 'export'), '輸出'), (os.path.join(OUT, 'hit'), 'hit'), (os.path.join(OUT, 'guards'), 'guards'), (os.path.join(OUT, 'squad'), 'squad'), (os.path.join(OUT, 'monsters'), 'monsters'), (TIVOT, '遊戲交件')):
    for d in sorted(glob.glob(os.path.join(root, '*'))):
        fs = sorted(os.path.basename(f) for f in glob.glob(os.path.join(d, 'frame_*.webp')))
        if not fs: continue
        rel = ('gameanim/' + os.path.basename(d)) if tag == '遊戲交件' else os.path.relpath(d, OUT).replace('\\', '/')
        items.append({'group': tag, 'name': os.path.basename(d), 'dir': rel, 'frames': fs,
                      'mtime': os.path.getmtime(d)})
items.sort(key=lambda x: (['遊戲交件', '輸出'].index(x['group']) if x['group'] in ('遊戲交件', '輸出') else 2, -x['mtime']))
open(os.path.join(OUT, 'player_list.js'), 'w', encoding='utf-8').write('window.ANIMS=' + json.dumps(items, ensure_ascii=False) + ';')
print(len(items), 'folders')
