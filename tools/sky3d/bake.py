"""空中怪 3D：Hunyuan 原始模型 → 修模、減面、上色 → 遊戲用的 mon3d.glb／mon3d_lo.glb／mon3d_atlas.webp

用法：python tools/sky3d/bake.py <鍵> <原始.glb> <輸出資料夾> [選項]
  --hi 30000 --lo 17000     目標面數（格點聚類減面，自動找格距）
  --crop "x0,y0,z0,x1,y1,z1;…"   刪掉重心落在這些方塊裡的面（Hunyuan 多長的桿子／平板）
  --planez "z,容差"          刪掉 z≈那一層、法線朝 z 的面（背後多一片平板那種）
  --cropn "x0,y0,z0,x1,y1,z1,軸;…"  方塊裡、而且法線朝那一軸（0/1/2＝x/y/z，|n|>0.85）的面才刪 —— 桅杆穿過也不會被切掉
                            （空賊船 n5：船尾上方多一片中線縱向薄板）
  --keep 0.02               連通塊小於最大塊這個比例的丟掉（飄在旁邊的碎片）
讀 resources/_originals/flight/mon3d/<鍵>_cells/{front,side,back,top}.png（prep4.py 產的）

座標：Hunyuan 出來的就是遊戲用的軸（+z＝頭、+y＝上、+x＝牠的左），不必轉。
圖集：2×2＝左上正面／右上背面／左下側面（頭朝左）／右下俯視（頭朝上），
      每格把那一張視圖的主體外框**拉滿**整格 —— drg3d.js 的片段著色器是拿模型外框線性對進格子的。
頂點色：同一套投影在 CPU 上取一次色（投不到的地方用整隻的中位色），貼圖透明處由它補。
11-07 那一版（scratchpad，已遺失）的重寫，2026-11-21。
"""
import sys, os, json, struct, argparse
sys.stdout.reconfigure(encoding='utf-8')
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CELLS = os.path.join(ROOT, 'resources', '_originals', 'flight', 'mon3d')


def load_glb(f):
    b = open(f, 'rb').read(); L = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + L]); bin_ = b[20 + L + 8:]
    def acc(i):
        A = j['accessors'][i]; V = j['bufferViews'][A['bufferView']]; o = V.get('byteOffset', 0) + A.get('byteOffset', 0)
        dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[A['componentType']]
        n = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[A['type']]
        return np.frombuffer(bin_, dt, A['count'] * n, o).reshape(-1, n)
    p = j['meshes'][0]['primitives'][0]
    return acc(p['attributes']['POSITION']).astype(np.float64), acc(p['indices']).reshape(-1, 3).astype(np.int64)


def save_glb(f, P, N, C, I):
    P = P.astype(np.float32); N = N.astype(np.float32); C = C.astype(np.uint8); I = I.astype(np.uint16).ravel()
    blobs = [P.tobytes(), N.tobytes(), C.tobytes(), I.tobytes()]
    views, off = [], 0; bin_ = b''
    for k, bl in enumerate(blobs):
        views.append({"buffer": 0, "byteOffset": off, "byteLength": len(bl), "target": 34963 if k == 3 else 34962})
        pad = (-len(bl)) % 4; bin_ += bl + b'\0' * pad; off += len(bl) + pad
    j = {"asset": {"version": "2.0", "generator": "tivot bake.py"}, "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
         "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1, "COLOR_0": 2}, "indices": 3}]}],
         "buffers": [{"byteLength": len(bin_)}], "bufferViews": views,
         "accessors": [{"bufferView": 0, "componentType": 5126, "count": len(P), "type": "VEC3", "min": P.min(0).tolist(), "max": P.max(0).tolist()},
                       {"bufferView": 1, "componentType": 5126, "count": len(N), "type": "VEC3"},
                       {"bufferView": 2, "componentType": 5121, "normalized": True, "count": len(C), "type": "VEC4"},
                       {"bufferView": 3, "componentType": 5123, "count": len(I), "type": "SCALAR"}]}
    js = json.dumps(j).encode(); js += b' ' * ((-len(js)) % 4)
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(bin_), 0x004E4942) + bin_
    open(f, 'wb').write(out)


def face_normals(P, I):
    return np.cross(P[I[:, 1]] - P[I[:, 0]], P[I[:, 2]] - P[I[:, 0]])


def components(nv, I):
    par = np.arange(nv)
    def find(x):
        r = x
        while par[r] != r: r = par[r]
        while par[x] != r: par[x], x = r, par[x]
        return r
    for a, b in np.concatenate([I[:, [0, 1]], I[:, [1, 2]]]):
        ra, rb = find(a), find(b)
        if ra != rb: par[ra] = rb
    roots = np.array([find(i) for i in range(nv)])
    return roots[I[:, 0]]


def cluster(P, I, g):
    lo = P.min(0); key = np.floor((P - lo) / g).astype(np.int64)
    _, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel()
    n = inv.max() + 1; cnt = np.bincount(inv, minlength=n)
    Q = np.stack([np.bincount(inv, P[:, k], n) for k in range(3)], 1) / cnt[:, None]
    F = inv[I]; F = F[(F[:, 0] != F[:, 1]) & (F[:, 1] != F[:, 2]) & (F[:, 0] != F[:, 2])]
    _, u = np.unique(np.sort(F, 1), axis=0, return_index=True); F = F[np.sort(u)]
    used = np.unique(F); remap = -np.ones(n, np.int64); remap[used] = np.arange(len(used))
    return Q[used], remap[F]


def decimate(P, I, target):
    ext = np.ptp(P, 0).max(); lo, hi = ext / 2000, ext / 20
    for _ in range(24):
        g = (lo * hi) ** 0.5; Q, F = cluster(P, I, g)
        if len(F) > target: lo = g
        else: hi = g
    Q, F = cluster(P, I, hi)
    return Q, F


def vnormals(P, I):
    fn = face_normals(P, I); N = np.zeros_like(P)
    for k in range(3): np.add.at(N, I[:, k], fn)
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)


def load_cells(key, sub='_cells'):
    d = os.path.join(CELLS, key + sub)
    return {k: np.asarray(Image.open(os.path.join(d, k + '.png')).convert('RGBA')).astype(np.float64) / 255 for k in ['front', 'back', 'side', 'top']}


def sample(img, u, v):
    h, w = img.shape[:2]
    x = np.clip((u * (w - 1)).round().astype(int), 0, w - 1); y = np.clip((v * (h - 1)).round().astype(int), 0, h - 1)
    return img[y, x]


def vcolors(P, N, cells):
    lo, hi = P.min(0), P.max(0); q = (P - lo) / (hi - lo)
    side_u = np.where(N[:, 0] > 0, 1 - q[:, 2], q[:, 2])
    S = [(cells['front'], q[:, 0], 1 - q[:, 1], np.maximum(N[:, 2], 0)),
         (cells['back'], 1 - q[:, 0], 1 - q[:, 1], np.maximum(-N[:, 2], 0)),
         (cells['side'], side_u, 1 - q[:, 1], np.abs(N[:, 0])),
         (cells['top'], 1 - q[:, 0], 1 - q[:, 2], np.abs(N[:, 1]))]
    acc = np.zeros((len(P), 3)); W = np.zeros(len(P))
    for img, u, v, w in S:
        c = sample(img, u, v); w = (w ** 2) * (c[:, 3] > 0.5)
        acc += c[:, :3] * w[:, None]; W += w
    allpix = np.concatenate([c[c[:, :, 3] > 0.5][:, :3] for c in cells.values()])
    med = np.median(allpix, 0)
    col = np.where(W[:, None] > 1e-6, acc / np.maximum(W, 1e-6)[:, None], med)
    return np.concatenate([(col * 255).round(), np.full((len(P), 1), 255)], 1)


def atlas(cells, out):
    A = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    for k, (x, y) in {'front': (0, 0), 'back': (1, 0), 'side': (0, 1), 'top': (1, 1)}.items():
        im = Image.fromarray((cells[k] * 255).astype(np.uint8), 'RGBA').resize((512, 512), Image.LANCZOS)
        A.paste(im, (x * 512, y * 512))
    A.save(out, 'WEBP', quality=88, method=6)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('key'); ap.add_argument('raw'); ap.add_argument('outdir')
    ap.add_argument('--hi', type=int, default=30000); ap.add_argument('--lo', type=int, default=17000)
    ap.add_argument('--crop', default=''); ap.add_argument('--planez', default=''); ap.add_argument('--cropn', default=''); ap.add_argument('--keep', type=float, default=0.02); ap.add_argument('--cells', default='_cells')   # 例：_cells_vein5_60（wing_veins.py 產的）
    a = ap.parse_args()
    P, I = load_glb(a.raw); print('raw', len(P), 'v', len(I), 'f')
    C = P[I].mean(1); drop = np.zeros(len(I), bool)
    for box in filter(None, a.crop.split(';')):
        b = np.array([float(x) for x in box.split(',')]); drop |= np.all((C >= b[:3]) & (C <= b[3:]), 1)
    if a.cropn:
        fnn = face_normals(P, I); fnn /= np.maximum(np.linalg.norm(fnn, axis=1, keepdims=True), 1e-12)
        for box in filter(None, a.cropn.split(';')):
            b = [float(x) for x in box.split(',')]; lo, hi, ax = np.array(b[:3]), np.array(b[3:6]), int(b[6])
            drop |= np.all((C >= lo) & (C <= hi), 1) & (np.abs(fnn[:, ax]) > 0.85)
    if a.planez:
        z0, tol = (float(x) for x in a.planez.split(','))
        fn = face_normals(P, I); fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12)
        drop |= (np.abs(C[:, 2] - z0) < tol) & (np.abs(fn[:, 2]) > 0.9)
    I = I[~drop]; print('crop drop', drop.sum())
    comp = components(len(P), I); ids, cnt = np.unique(comp, return_counts=True)
    keep = ids[cnt >= cnt.max() * a.keep]; I = I[np.isin(comp, keep)]
    print('components', len(ids), 'kept', len(keep), 'faces', len(I))
    used = np.unique(I); rm = -np.ones(len(P), np.int64); rm[used] = np.arange(len(used)); P = P[used]; I = rm[I]
    cells = load_cells(a.key, a.cells); os.makedirs(a.outdir, exist_ok=True)
    for tag, tgt in [('', a.hi), ('_lo', a.lo)]:
        Q, F = decimate(P, I, tgt)
        vol = np.einsum('ij,ij->i', Q[F[:, 0]], np.cross(Q[F[:, 1]], Q[F[:, 2]])).sum()
        if vol < 0: F = F[:, [0, 2, 1]]
        N = vnormals(Q, F); Cv = vcolors(Q, N, cells)
        f = os.path.join(a.outdir, f'mon3d{tag}.glb'); save_glb(f, Q, N, Cv, F)
        print(f, len(Q), 'v', len(F), 'f', os.path.getsize(f) // 1024, 'KB', 'vol', round(vol, 3))
    atlas(cells, os.path.join(a.outdir, 'mon3d_atlas.webp')); print('atlas ok')


if __name__ == '__main__':
    main()
