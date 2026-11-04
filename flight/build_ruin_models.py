#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""地下古城地表入口的遺跡模型（ver -2443，Ray：「飛行地圖的古城遺蹟太粗糙，剛才我們下過畫樹的模型，現在去找畫建築的」）。

來源：Quaternius「Ultimate Modular Ruins Pack」（CC0，https://quaternius.com/packs/ultimatemodularruins.html），
      從 poly.pizza 下載的整包 GLB（Google Drive 那一份額度爆了）。整包 8 MB、96 件 —— 只挑入口用得到的石造零件，
      寫成一份小的 flight/models/ruins/ruins.gltf + ruins.bin（同 models/nature 那種 .gltf＋外部 bin，飛行頁同一支讀法）。
⚠ 只留沒有貼圖的 primitive（石頭、灰泥都是純色材質）；苔葉那幾片是貼圖，入口不需要。
用法：python flight/build_ruin_models.py <整包.glb>
"""
import json, os, struct, sys

KEEP = ['Arch_Round', 'Arch_Gothic', 'Arch_Round_RoundColumn', 'Wall_ArchRound_Broken', 'Wall_ArchRound',
        'Wall_Broken', 'Wall_Half', 'Wall_Double_Broken', 'Wall', 'Column_Round', 'Column_Round_Short',
        'Column_Square', 'Column_BridgeSupport', 'Stairs', 'Floor_Standard', 'Floor_Squares', 'Statue_Stag', 'Bricks']

src = sys.argv[1]
f = open(src, 'rb').read()
L = struct.unpack('<I', f[12:16])[0]
j = json.loads(f[20:20 + L])
off = 20 + L
BL = struct.unpack('<I', f[off:off + 4])[0]
binc = f[off + 8:off + 8 + BL]

import math
def qrot(q, v):                                   # 四元數轉向量
    x, y, z, w = q; vx, vy, vz = v
    tx = 2 * (y * vz - z * vy); ty = 2 * (z * vx - x * vz); tz = 2 * (x * vy - y * vx)
    return (vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx))
out_bin = bytearray(); views = []; accs = []; amap = {}
XF = None                                         # 目前這一件的 (rotation, scale)：位置與法線烘進去（glTF y-up、公尺）
def take_acc(ai, kind=None):
    key = (ai, kind, id(XF) if kind else 0)
    if key in amap: return amap[key]
    A = dict(j['accessors'][ai]); V = j['bufferViews'][A['bufferView']]
    comp = {5126: 4, 5125: 4, 5123: 2, 5121: 1, 5122: 2, 5120: 1}[A['componentType']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[A['type']]
    stride = V.get('byteStride', comp * n)
    start = V.get('byteOffset', 0) + A.get('byteOffset', 0)
    data = bytearray()
    mn = [1e9] * 3; mx = [-1e9] * 3
    for k in range(A['count']):
        chunk = binc[start + k * stride:start + k * stride + comp * n]
        if kind in ('P', 'N'):
            v = struct.unpack('<3f', chunk); q, sc = XF
            if kind == 'P': v = qrot(q, (v[0] * sc[0], v[1] * sc[1], v[2] * sc[2]))
            else:
                v = qrot(q, (v[0] / sc[0], v[1] / sc[1], v[2] / sc[2])); l = math.sqrt(sum(c * c for c in v)) or 1; v = tuple(c / l for c in v)
            if kind == 'P':
                for c in range(3): mn[c] = min(mn[c], v[c]); mx[c] = max(mx[c], v[c])
            chunk = struct.pack('<3f', *v)
        data += chunk
    if kind == 'P': A['min'] = mn; A['max'] = mx
    while len(out_bin) % 4: out_bin.append(0)
    views.append({'buffer': 0, 'byteOffset': len(out_bin), 'byteLength': len(data)})
    out_bin.extend(data)
    A['bufferView'] = len(views) - 1; A.pop('byteOffset', None)
    accs.append(A); amap[key] = len(accs) - 1
    return amap[key]

mats = []; mmap = {}
def take_mat(mi):
    if mi in mmap: return mmap[mi]
    M = j['materials'][mi]; pbr = M.get('pbrMetallicRoughness', {})
    mats.append({'name': M.get('name', 'm%d' % mi), 'pbrMetallicRoughness': {'baseColorFactor': pbr.get('baseColorFactor', [1, 1, 1, 1])}})
    mmap[mi] = len(mats) - 1
    return mmap[mi]

meshes = []; nodes = []
for nd in j['nodes']:
    if nd.get('name') not in KEEP or 'mesh' not in nd: continue
    M = j['meshes'][nd['mesh']]; prims = []
    XF = (nd.get('rotation', [0, 0, 0, 1]), nd.get('scale', [1, 1, 1]))
    for pr in M['primitives']:
        mt = j['materials'][pr['material']] if 'material' in pr else {}
        if mt.get('pbrMetallicRoughness', {}).get('baseColorTexture'): continue      # 苔葉（貼圖）不要
        P = {'attributes': {k: take_acc(v, 'P' if k == 'POSITION' else 'N') for k, v in pr['attributes'].items() if k in ('POSITION', 'NORMAL')},
             'indices': take_acc(pr['indices']), 'material': take_mat(pr['material'])}
        prims.append(P)
    if not prims: continue
    meshes.append({'name': nd['name'], 'primitives': prims})
    nodes.append({'name': nd['name'], 'mesh': len(meshes) - 1})   # ⚠ 只留形狀：原本的位置（整包是排成一張展示圖）不要
here = os.path.dirname(os.path.abspath(__file__))
od = os.path.join(here, 'models', 'ruins'); os.makedirs(od, exist_ok=True)
g = {'asset': {'version': '2.0', 'generator': 'build_ruin_models.py'}, 'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}],
     'nodes': nodes, 'meshes': meshes, 'materials': mats, 'accessors': accs, 'bufferViews': views,
     'buffers': [{'uri': 'ruins.bin', 'byteLength': len(out_bin)}]}
open(os.path.join(od, 'ruins.bin'), 'wb').write(out_bin)
json.dump(g, open(os.path.join(od, 'ruins.gltf'), 'w'), separators=(',', ':'))
for m in meshes:
    a = accs[m['primitives'][0]['attributes']['POSITION']]
    mn = [min(accs[p['attributes']['POSITION']]['min'][k] for p in m['primitives']) for k in range(3)]
    mx = [max(accs[p['attributes']['POSITION']]['max'][k] for p in m['primitives']) for k in range(3)]
    print('%-34s prims %d  size %.2f x %.2f x %.2f' % (m['name'], len(m['primitives']), mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]))
print('bin', len(out_bin), 'bytes; mats', [m['name'] for m in mats])
