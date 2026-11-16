# -*- coding: utf-8 -*-
"""把現有的禍魘大軍（分層圖 guard_N）轉成「立繪＋位置」的群戰編組（ver -2635，一次性）。

來源：`script/group_members.js`（每一層是誰、立繪→分層畫布的 map）＋ 卡上的 `order`／`noShadow`
＋ `script/group_layout.js`（Ray 在遊戲裡拖過的位置）。輸出 `script/group_comps.js` 的 `/*GCOMP*/…/*END*/` 那一段。
之後一律由編輯器（tools/group_editor.html，devserver `/__gcomp`）維護，這支不必再跑。
"""
import os, re, json

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
R = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()

mem_src = R('script/group_members.js')
mem = json.loads('{' + ','.join(
    '"%s":{%s}' % (d, ','.join('"%s":%s' % (n, j) for n, j in re.findall(r'\n    (\d+): (\{.*?\}),', blk)))
    for d, blk in re.findall(r'\n  "([^"]+)": \{(.*?)\n  \},', mem_src, re.S)) + '}')
lay_src = R('script/group_layout.js')
lay = json.loads(lay_src[lay_src.index('/*GLAYOUT*/') + 11: lay_src.index('/*END*/')] or '{}')
cards = R('script/enemies.js')

out = {}
for m in re.finditer(r"\n    (canyon_mix\d+): \{.*?group:\{ dir:'([^']+)'(.*?)order:\[([0-9,]*)\]", cards, re.S):
    key, d, mid, order = m.group(1), m.group(2), m.group(3), [int(x) for x in m.group(4).split(',') if x]
    ns = re.search(r'noShadow:\[([0-9,]*)\]', mid)
    noshadow = set(int(x) for x in ns.group(1).split(',')) if ns and ns.group(1) else set()
    members = []
    for n in order:
        e = mem[d][str(n)]
        k, ox, oy, flip = e['map']
        P = lay.get(d, {}).get(str(n))
        if P:   # 遊戲裡拖過：分層點 q → q·s + d
            s = P[2]; k, ox, oy = k * s, ox * s + P[0], oy * s + P[1]
        mm = {'stem': e['stem'], 'k': round(k, 4), 'x': round(ox, 1), 'y': round(oy, 1)}
        if flip: mm['flip'] = 1
        if n in noshadow: mm['air'] = 1
        members.append(mm)
    out[key] = {'canvas': [1536, 1024], 'members': members}

body = json.dumps(out, ensure_ascii=False, indent=1)
head = '''/* ══ 群戰編組（ver -2635，Ray：「做一個編輯器 可以點選放山谷的所有怪進去 然後調整大小跟位置 並播放攻擊動畫」）══
   鑰匙＝敵人卡鑰匙（卡上寫 `group:{ comp:'<鑰匙>' }` 就照這裡擺）。每一組：
     canvas  畫布大小（＝舊分層圖的大小 1536×1024；遊戲照卡的取景把它鋪進敵人區）
     members 由後往前：{ stem 立繪檔名（resources/enemy/<stem>.webp，也是動畫表的鑰匙）, k 縮放, x/y 立繪左上角在畫布上的位置,
             flip 1＝左右翻, air 1＝飛在空中（不畫接地影子） }
   ⚠ 由編輯器 tools/group_editor.html 存檔寫回（devserver `/__gcomp`，整段 JSON 重寫）；手改也行，格式照上。 */
export const GROUP_COMPS = /*GCOMP*/'''
open(os.path.join(ROOT, 'script', 'group_comps.js'), 'w', encoding='utf-8', newline='\n').write(head + body + '/*END*/;\n')
print('寫入 script/group_comps.js：%d 組' % len(out))
