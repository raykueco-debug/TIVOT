# 卡耶爾交件監看（Ray 11-15：「我commit的cut就直接替掉」）
# 盯 ComfyUI out/export/：animechk「⬇ 輸出」出來的資料夾，export.json 的 from 是這一批的原片（monsters/canyon_raw_<交件名>）
# 或快剪（auto/...）⇒ 用 Ray 剪的那一版重交同名資料夾（舊的先進回收區），並 commit＋push 那一個資料夾。
# 狀態記在 resources/enemy/_neutral_refs/canyon_kf/canyon_deliver_state.json（每個交件現在用的是哪一份 cut），檢視頁讀它。
# 用法：python canyon_watch.py            常駐（每 10 秒掃一次）
#       python canyon_watch.py --once     掃一次就結束
import glob, json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import deliver_canyon as d

STATE = os.path.join(d.KF, 'canyon_deliver_state.json')
ITEMS = d.build_items()
SRC2ITEM = {}
for k, it in ITEMS.items():
    SRC2ITEM['monsters/canyon_raw_' + k] = k
    SRC2ITEM[it['auto']] = k
    for src in it.get('alts', {}): SRC2ITEM[src] = k
    if it.get('rev'): SRC2ITEM['canyon_R/' + k + '_R'] = k   # 11-16：R 段單獨剪（out/canyon_R/）


def load_state():
    if os.path.exists(STATE): return json.load(open(STATE, encoding='utf-8'))
    return {k: {'source': it['auto'], 'kind': '快剪（auto_cut）', 'at': None} for k, it in ITEMS.items()}


def git(*a):
    return subprocess.run(['git', *a], cwd=d.ROOT, capture_output=True, text=True, encoding='utf-8')


def scan(state):
    changed = []
    for ex in sorted(glob.glob(os.path.join(d.OUT, 'export', '*', 'export.json')), key=os.path.getmtime):
        try: e = json.load(open(ex, encoding='utf-8'))
        except Exception: continue
        k = SRC2ITEM.get((e.get('from') or '').replace('\\', '/'))
        if not k: continue
        exdir = os.path.dirname(ex); rel = 'export/' + os.path.basename(exdir); mt = os.path.getmtime(ex)
        st = state.get(k) or {}
        if st.get('source') == rel and st.get('mtime', 0) >= mt: continue
        if max(st.get('mtime', 0), st.get('r_mtime', 0)) >= mt: continue
        if st.get('r_source') == rel: continue
        src = (e.get('from') or '').replace(chr(92), '/'); item = dict(ITEMS[k]); isR = src.startswith('canyon_R/')
        if isR and (st.get('from') or '') in item.get('norev', ()): continue   # 動作段已是 ABA，R 不再用
        if isR:   # 只換 R：動作段照現行那一份，後面接 Ray 剪的 R
            rf, _ = d.expand_export(exdir); frames, fps = d.src_frames(st.get('source') or item['auto'])
            src0 = st.get('from') or ''
            if src0 in item.get('alts', {}): item['to_portrait'] = item['alts'][src0]
        else:
            frames, fps = d.expand_export(exdir); rf = None
            if src in item.get('alts', {}): item['to_portrait'] = item['alts'][src]   # 另一條輸入鏈（例：單圖重跑）
            if src in item.get('norev', ()): item['rev'] = False   # 自帶歸位（ABA）的片：不接倒放
        old = os.path.join(d.DST, k)
        if os.path.exists(old):
            subprocess.run(['bash', os.path.join(d.ROOT, 'tools', 'recycle.sh'), '-m', f'Ray 的 cut 取代（{rel}）', old], cwd=d.ROOT, capture_output=True)
        r = d.write(frames, item, fps=fps, overwrite=True, r_frames=rf)
        if isR:
            st.update({'r_source': rel, 'r_mtime': mt, 'at': time.strftime('%m-%d %H:%M'), 'frames': r['frames'], 'peak': r['peak']}); state[k] = st
        else:
            state[k] = {'source': rel, 'from': src, 'kind': 'Ray 的 cut', 'at': time.strftime('%m-%d %H:%M'), 'mtime': mt, 'frames': r['frames'], 'peak': r['peak']}
            if item.get('rev'): state[k]['r_dir'] = d.make_R(k, frames)   # 動作換了 ⇒ 舊的 R cut 作廢，R 段重產
        changed.append((k, rel, r))
    return changed


def main():
    once = '--once' in sys.argv
    state = load_state(); json.dump(state, open(STATE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    lst = [{'key': k, 'zh': it['zh'], 'loop': it['loop'], 'raw': 'monsters/canyon_raw_' + k, 'auto': it['auto'], 'game': 'gameres/enemy/anim/' + k}
           for k, it in ITEMS.items()]
    json.dump(lst, open(os.path.join(d.ROOT, 'tools', 'enemy_review', 'canyon_batch_items.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('監看 out/export/ …（Ctrl+C 結束）', flush=True)
    while True:
        ch = scan(state)
        if ch:
            json.dump(state, open(STATE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            paths = [os.path.join('resources', 'enemy', 'anim', k) for k, _, _ in ch] + [os.path.relpath(STATE, d.ROOT), '_recycle/RECYCLE_LOG.tsv']
            git('add', '-A', '--', *paths)
            msg = '敵人線：卡耶爾換上 Ray 的 cut —— ' + '、'.join(f'{ITEMS[k]["zh"]}（{rel}，{r["frames"]} 格，打到 {r["peak"]}）' for k, rel, r in ch)
            msg += '\n\n自動：tools/anim/canyon_watch.py\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>'
            c = git('commit', '-m', msg, '--', *paths)
            q = git('push', '-q'); p = q
            if q.returncode != 0:   # 共用 checkout：不 autostash 別人的檔；工作區乾淨才 pull --rebase，否則留給人手動推
                p = git('pull', '--rebase', '-q'); q = git('push', '-q') if p.returncode == 0 else p
            print(time.strftime('%H:%M:%S'), '替換', [k for k, _, _ in ch], 'commit', 'ok' if c.returncode == 0 else c.stderr[:200],
                  'push', 'ok' if q.returncode == 0 else (p.stderr + q.stderr)[:200], flush=True)
        if once: break
        time.sleep(10)


if __name__ == '__main__':
    main()
