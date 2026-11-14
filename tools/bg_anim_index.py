# -*- coding: utf-8 -*-
"""背景動畫的對照表產生器（ver -2620）。

掃 `resources/background/anim/**.mp4`，把每支影片對到它要蓋的那一張靜態背景，寫成 `script/bg_anim.js`。
規則（`resources/background/anim/TO_CODE_bg_anim.md`）：
  · 檔名 `<靜態背景檔名>_<sep|abcd|aba|pure>_v<N>.mp4` —— 去掉尾巴就是那張靜態圖的檔名（含時段，如 `_day`）。
  · 同一張靜態圖有好幾支：`sep` > `abcd` > `aba`/`pure`，同類取版本號大的。
  · `_loop_v1`（11-07／11-08 整張丟 Wan、來回循環）作廢，不收。
  · 對不到靜態圖的：查 `MANUAL`（交件單上寫明靜態圖是哪一張的）；還是對不到就印出來，不收。
  · `RETIRED`：交件單寫退役的。

用法：py tools/bg_anim_index.py   （交件後重跑一次；`--check` 只比對不寫檔，lint 用）
"""
import os, re, sys, json

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BG = os.path.join(ROOT, 'resources', 'background')
OUT = os.path.join(ROOT, 'script', 'bg_anim.js')

RANK = {'sep': 4, 'abcd': 3, 'aba': 2, 'pure': 2}
# 交件單明寫「靜態圖是 X」的（影片名 → 靜態圖檔名）
MANUAL = {
    'forest_ruins_day': 'ruins_shinier_entrance_day',   # 夏爾森林　遺蹟入口（TO_CODE 11-10）
}
RETIRED = {
    'belisar_lionspout',   # 11-14 退役：改靜態底圖＋程式水柱
}


def norm(p):
    return p.replace(os.sep, '/')


def main(check=False):
    statics = {}
    for dp, dn, fn in os.walk(BG):
        rel = norm(os.path.relpath(dp, ROOT))
        parts = rel.split('/')
        if 'anim' in parts or any(x.startswith('_') for x in parts):
            continue
        for f in fn:
            m = re.match(r'(.+)\.(webp|png|jpe?g)$', f, re.I)
            if m:
                statics.setdefault(m.group(1).lower(), m.group(1))
    best, miss = {}, []
    for dp, dn, fn in os.walk(os.path.join(BG, 'anim')):
        for f in fn:
            if not f.endswith('.mp4'):
                continue
            m = re.match(r'(.+?)_(sep|abcd|aba|pure|loop)_v(\d+)\.mp4$', f)
            if not m:
                miss.append(('檔名不合規則', f)); continue
            stem, kind, v = m.group(1), m.group(2), int(m.group(3))
            if kind == 'loop' or stem in RETIRED:
                continue
            key = MANUAL.get(stem, stem).lower()
            if key not in statics:
                miss.append(('找不到靜態圖', norm(os.path.relpath(os.path.join(dp, f), ROOT)))); continue
            r = (RANK[kind], v)
            path = norm(os.path.relpath(os.path.join(dp, f), ROOT))
            if key not in best or r > best[key][0]:
                best[key] = (r, path)
    lines = ['/* ══ 背景動畫對照表（ver -2620）══ 自動產生，不要手改：`py tools/bg_anim_index.py`',
             '   鑰匙＝靜態背景的檔名（小寫、不含副檔名與 ?v=）；值＝要疊在它上面循環播的整張影片。',
             '   播放在 `modules/story.js` 的 bgAnim 那一段（#storyBg 換上這張圖就播、換掉就收）。 */',
             'export const BG_ANIM = {']
    for k in sorted(best):
        lines.append('  %s: %s,' % (json.dumps(k), json.dumps(best[k][1])))
    lines.append('};')
    text = '\n'.join(lines) + '\n'
    for why, f in miss:
        print('⚠ %s：%s' % (why, f))
    if check:
        cur = open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
        if cur != text:
            print('✘ script/bg_anim.js 與磁碟上的影片不同步 —— 跑 py tools/bg_anim_index.py'); return 1
        print('✔ bg_anim 同步（%d 支）' % len(best)); return 0
    open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
    print('寫入 %s：%d 支' % (norm(os.path.relpath(OUT, ROOT)), len(best)))
    return 0


if __name__ == '__main__':
    sys.exit(main('--check' in sys.argv))
