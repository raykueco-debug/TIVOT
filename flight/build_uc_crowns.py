# 地表上的地底樹冠（ver -2412，Ray：「在 476,483 地表座標畫出樹的頂冠，有高有低，約半山高度，有一株特別大，
#   相對位置同地底的樹配置；地表地底比例尺不同，在地表大概就一個城市的範圍」）
# 讀 undercity/world.js 的 city（唯一真相，build_undercity.py 產的），挑出長藤蔓樹的那幾座 ——
#   ⚠ 「哪幾座長樹」＝ flight/index.html 的 UC_TRUNKS：神殿（種類 2）＋高塔（種類 1）。改一邊要改另一邊。
# 寫成 undercity/crowns.js：window.UC_CROWNS＝{list:[[dx,dy,大小,是否神殿],…]}，dx/dy＝相對神殿中心的地底世界單位。
# 地表只載這一支小檔（鐵律 13：不為了幾十個點去載整座地下城的資料）。
import json, os, re, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(HERE, 'undercity', 'world.js'), encoding='utf-8').read()
city = json.loads(s[s.index('{'):s.rindex('}') + 1])['city']
T = sorted([r for r in city if r[6] == 2], key=lambda r: r[7])
cx, cy = T[0][0], T[0][1]
out = [[0, 0, round(T[0][2] / 2), 1]]
for r in city:
    if r[6] == 1: out.append([round(r[0] - cx), round(r[1] - cy), round(max(r[2], r[3]) / 2), 0])
js = 'window.UC_CROWNS=' + json.dumps({'list': out}, separators=(',', ':')) + ';\n'
open(os.path.join(HERE, 'undercity', 'crowns.js'), 'w', encoding='utf-8').write(js)
v = hashlib.md5(js.encode('utf-8')).hexdigest()[:8]
idx = os.path.join(HERE, 'index.html')
t = open(idx, encoding='utf-8', newline='').read()
t2, n = re.subn(r"undercity/crowns\.js\?v=[0-9a-f]*", "undercity/crowns.js?v=" + v, t)
if n: open(idx, 'w', encoding='utf-8', newline='').write(t2)
print(len(out), 'crowns, v', v, '(index 更新 %d 處)' % n, 'max r', max((x*x+y*y)**0.5 for x, y, *_ in out))
