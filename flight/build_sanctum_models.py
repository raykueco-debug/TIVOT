#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""地底大空洞的 3D 模型（ver -2577，Ray：「上網找一些可商用的 3D 模型」→「Kore＋骨骸＋遺跡包」）。

來源（授權都是公有領域，可商用、不必標示；出處寫在 flight/models/sanctum/LICENSE.txt）：
  · Kore（8 號灰磚井的女神像）：SMK 丹麥國家美術館「Kore dressed in chiton and cape (epiblema)」石膏翻模掃描 KAS1800，
    https://open.smk.dk/artwork/image/KAS1800 —— api.smk.dk 的 3D 下載（STL，28.9 萬面，Public Domain Mark）。
  · 遺跡包：已經在 flight/models/ruins/（Quaternius Ultimate Modular Ruins，CC0，ver -2443 接的），這一支不動它。

減面（手機優先，鐵律 12）：pyfqmr（Fast Quadric Mesh Reduction，MIT）減到 TARGET 面，算頂點法線，
寫成跟 models/ruins 同一種 .gltf＋外部 .bin（一個節點一件、一個 primitive、純色材質；glTF y-up、公尺）。
用法：<有 pyfqmr 的 python> flight/build_sanctum_models.py <kore.stl>
"""
import json, os, struct, sys
import numpy as np
import pyfqmr

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'models', 'sanctum')
SRC = {'Kore': sys.argv[1]}
TARGET = {'Kore': 6000}
COLOR = {'Kore': [0.62, 0.61, 0.59, 1.0]}      # 底色（線性）；飛行頁照它上色、再疊苔與光
HEIGHT = {'Kore': 2.05}                         # 公尺（KAS1800 的登錄尺寸 205 cm）

def read_stl(p):
    b = open(p, 'rb').read(); n = int.from_bytes(b[80:84], 'little')
    a = np.frombuffer(b[84:84 + n * 50], dtype=np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')]))
    v = a['v'].reshape(-1, 3).astype(np.float64)
    q = np.round(v * 1e4).astype(np.int64)                       # 焊接重複頂點
    _, idx, inv = np.unique(q, axis=0, return_index=True, return_inverse=True)
    return v[idx], inv.reshape(-1, 3).astype(np.int32)

meshes = {}
for name, path in SRC.items():
    V, F = read_stl(path)
    s = pyfqmr.Simplify(); s.setMesh(V, F)
    s.simplify_mesh(target_count=TARGET[name], aggressiveness=7, preserve_border=True, verbose=0)
    V, F, _ = s.getMesh()
    # STL 是 z-up ⇒ glTF y-up：(x, y, z) → (x, z, -y)；底貼地、水平置中、縮到登錄身高
    V = np.stack([V[:, 0], V[:, 2], -V[:, 1]], 1)
    V[:, 1] -= V[:, 1].min()
    V *= HEIGHT[name] / V[:, 1].max()
    c = (V.min(0) + V.max(0)) / 2; V[:, 0] -= c[0]; V[:, 2] -= c[2]
    N = np.zeros_like(V)
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    for k in range(3): np.add.at(N, F[:, k], fn)
    N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
    meshes[name] = (V.astype(np.float32), N.astype(np.float32), F.astype(np.uint32))
    print(name, len(V), 'verts', len(F), 'tris', 'bbox', V.min(0).round(3), V.max(0).round(3))

os.makedirs(OUT, exist_ok=True)
binb = bytearray(); views = []; accs = []; gmeshes = []; nodes = []; mats = []
def add(arr, target, typ, ctype, mm=False):
    while len(binb) % 4: binb.append(0)
    off = len(binb); binb.extend(arr.tobytes())
    views.append({'buffer': 0, 'byteOffset': off, 'byteLength': arr.nbytes, 'target': target})
    A = {'bufferView': len(views) - 1, 'componentType': ctype, 'count': int(arr.shape[0]) if typ != 'SCALAR' else int(arr.size), 'type': typ}
    if mm: A['min'] = arr.min(0).tolist(); A['max'] = arr.max(0).tolist()
    accs.append(A); return len(accs) - 1
for name, (V, N, F) in meshes.items():
    p = add(V, 34962, 'VEC3', 5126, True); n = add(N, 34962, 'VEC3', 5126); i = add(F.reshape(-1), 34963, 'SCALAR', 5125)
    mats.append({'name': name, 'pbrMetallicRoughness': {'baseColorFactor': COLOR[name], 'metallicFactor': 0, 'roughnessFactor': 1}})
    gmeshes.append({'name': name, 'primitives': [{'attributes': {'POSITION': p, 'NORMAL': n}, 'indices': i, 'material': len(mats) - 1}]})
    nodes.append({'name': name, 'mesh': len(gmeshes) - 1})
gl = {'asset': {'version': '2.0', 'generator': 'build_sanctum_models.py'}, 'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}],
      'nodes': nodes, 'meshes': gmeshes, 'materials': mats, 'accessors': accs, 'bufferViews': views,
      'buffers': [{'uri': 'sanctum.bin', 'byteLength': len(binb)}]}
open(os.path.join(OUT, 'sanctum.bin'), 'wb').write(binb)
json.dump(gl, open(os.path.join(OUT, 'sanctum.gltf'), 'w', encoding='utf-8'), ensure_ascii=False)
open(os.path.join(OUT, 'LICENSE.txt'), 'w', encoding='utf-8').write(
    "Kore dressed in chiton and cape (epiblema), plaster cast KAS1800 — SMK, National Gallery of Denmark.\n"
    "3D scan released into the public domain (Public Domain Mark 1.0 / CC0 on Sketchfab).\n"
    "https://open.smk.dk/artwork/image/KAS1800\n"
    "Decimated and converted by flight/build_sanctum_models.py.\n")
print('sanctum.gltf', len(binb), 'bytes')
# 預覽：四個方向的正投影剪影（找正面朝哪）
try:
    from PIL import Image
    V, N, F = meshes['Kore']
    for nm, ax in (('px', 0), ('nz', 2)):
        im = np.zeros((256, 256), np.uint8)
        u = V[:, 2 if ax == 0 else 0]; w = V[:, 1]
        lum = np.clip((N[:, ax] * (1 if nm[0] == 'p' else -1)) * 255, 0, 255)
        xs = ((u - u.min()) / (np.ptp(u) + 1e-6) * 120 + 68).astype(int); ys = (255 - (w / w.max()) * 250).astype(int).clip(0, 255)
        im[ys, xs] = np.maximum(im[ys, xs], lum.astype(np.uint8))
        Image.fromarray(im).save(os.path.join(os.environ.get('PREVIEW_DIR', OUT), '_preview_' + nm + '.png'))
except Exception as e: print('preview', e)
