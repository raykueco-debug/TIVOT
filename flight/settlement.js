/* ══════════════════════════════════════════════════════════════════════
   聚落生成器 —— generate(opts) → Settlement／draw(ctx, s, view)

   ▍純函式保證
   同一 seed 永遠產生完全相同的聚落。全程不得出現 Math.random()：
   所有隨機都走自帶的 mulberry32，種子由 settlement.seed 決定。
   輪廓用的雜訊也是週期性的（否則角度繞一圈接不回起點，輪廓會裂開）。

   ▍與規格的差異（刻意，非疏漏）
   1. TILT：規格說「沿用地圖的斜角投影（TILT 常數）」，但本專案沒有這個
      東西 —— 飛行畫面是 voxel-space、地圖畫面是一張靜態插畫。這裡自己
      定義 TILT，之後真的接上地圖渲染器時改成共用即可。
   2. 街廓：規格要求「以道路為分割線切出街廓多邊形」。真做多邊形分割對
      420 棟建築的規模是浪費 —— 改成「Poisson 取樣後剔除壓在路上的點」，
      街廓是**結果**而不是前置步驟。視覺上等價（建築沿街成排、路面淨空），
      而且建築本來就要查最近道路來定朝向，這條查詢兩邊共用。
   3. terrainFactor 是注入的 callback。生成器不該直接讀高度圖 —— 那會讓
      它綁死在飛行原型上，也沒辦法單獨測試。沒給就一律回 1。
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
'use strict';

/* ── PRNG ─────────────────────────────────────────────────────────── */
function mulberry32(a) {
  return function () {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = t => t * t * (3 - 2 * t);

/* 週期性 1D 雜訊：輪廓沿角度取樣，繞一圈必須接得回去，
   ⚠ 用一般的亂數插值會在 angle=0/2π 出現裂縫。 */
function periodicNoise(rnd, period) {
  const g = new Float32Array(period);
  for (let i = 0; i < period; i++) g[i] = rnd();
  return t => {
    const i = Math.floor(t), f = t - i;
    const a = g[((i % period) + period) % period];
    const b = g[(((i + 1) % period) + period) % period];
    return lerp(a, b, smooth(f));
  };
}
function periodicFbm(rnd, period, oct) {
  const ns = [], amp = [];
  let p = period, a = 0.5, sum = 0;
  for (let i = 0; i < oct; i++) { ns.push(periodicNoise(rnd, p)); amp.push(a); sum += a; p *= 2; a *= 0.5; }
  return t => {
    let v = 0;
    for (let i = 0; i < ns.length; i++) v += ns[i](t * (1 << i)) * amp[i];
    return v / sum;
  };
}

/* ── 階級表 ────────────────────────────────────────────────────────
   dia 是「聚落位於畫面中心、標準縮放」時佔視窗寬度的比例。
   實際尺寸存在 radius（世界單位），繪製時依相機縮放換算。 */
const TIERS = {
  city1:   { dia: 0.500, n: [260, 420], spokes: [4, 6], rings: 3, wallP: 1.00, plaza: 0.10, subLm: [2, 3],
             w: { hovel: .18, house: .30, townhouse: .22, shop: .14, warehouse: .08, manor: .06, tower: .02 } },
  city2:   { dia: 0.330, n: [120, 200], spokes: [4, 6], rings: 2, wallP: 0.70, plaza: 0.10, subLm: [1, 1],
             w: { hovel: .22, house: .34, townhouse: .18, shop: .13, warehouse: .07, manor: .05, tower: .01 } },
  city3:   { dia: 0.200, n: [55, 90],   spokes: [3, 3], rings: 1, wallP: 0.30, plaza: 0.10, subLm: [0, 0],
             w: { hovel: .28, house: .38, townhouse: .12, shop: .12, warehouse: .07, manor: .03, tower: .005 } },
  town:    { dia: 0.110, n: [22, 34],   spokes: 0,      rings: 0, wallP: 0,    plaza: 0,    subLm: [0, 0],
             w: { hovel: .34, house: .44, townhouse: .06, shop: .10, warehouse: .06 } },
  village: { dia: 0.055, n: [7, 14],    spokes: 0,      rings: 0, wallP: 0,    plaza: 0,    subLm: [0, 0],
             w: { hovel: .52, house: .44, warehouse: .04 } },
};

/* 建築型錄。fp＝佔地（相對 R）、hr＝高度（相對佔地）、ring＝可出現的環帶（距中心/R） */
/* ⚠ 高度整體壓低：規格的 hr（townhouse 1.8、tower 3.5~5.0）畫出來像現代
   市中心，而這是十九世紀歐洲 —— 民居兩三層、天際線平坦，突出的只有
   教堂尖塔與鐘樓那一兩座。所以：
     townhouse 1.8→1.35、manor 1.6→1.25、tower 3.5~5.0→2.4~3.0
   真正的高度落差交給地標（見 LM_MIN_H），那才是該被看見的東西。 */
const BTYPE = {
  hovel:     { fp: [.008, .014], hr: [0.7, 0.7],  ring: [0.50, 1.00], roof: 'flat' },
  house:     { fp: [.012, .020], hr: [0.95, 0.95],ring: [0.00, 1.00], roof: 'gable' },
  townhouse: { fp: [.014, .022], hr: [1.35, 1.35],ring: [0.10, 0.72], roof: 'steep' },
  shop:      { fp: [.018, .028], hr: [1.10, 1.10],ring: [0.00, 0.95], roof: 'sign', onRoad: true },
  warehouse: { fp: [.030, .050], hr: [0.85, 0.85],ring: [0.45, 1.00], roof: 'long' },
  manor:     { fp: [.035, .055], hr: [1.25, 1.25],ring: [0.00, 0.45], roof: 'complex' },
  tower:     { fp: [.010, .016], hr: [2.4, 3.0],  ring: [0.00, 1.00], roof: 'cone' },
};

/* 地標。fac＝適用勢力（null 表不限），需 coastal 者另標。 */
const LANDMARKS = {
  cathedral:    { tiers: ['city1', 'city2'],                     fac: ['church'],           scale: 1.00 },
  keep:         { tiers: ['city1', 'city2', 'city3'],            fac: ['empire'],           scale: 0.95 },
  clocktower:   { tiers: ['city2', 'city3'],                     fac: ['free'],             scale: 0.70 },
  lighthouse:   { tiers: ['city1', 'city2', 'city3', 'town', 'village'], fac: null, coastal: true, scale: 0.72 },
  mooring_mast: { tiers: ['city1', 'city2'],                     fac: null,                 scale: 0.85 },
  windmill:     { tiers: ['town', 'village'],                    fac: null, inland: true,   scale: 0.60 },
  watchtower:   { tiers: ['town', 'village'],                    fac: null,                 scale: 0.55 },
  shrine:       { tiers: ['village'],                            fac: null,                 scale: 0.45 },
};

function pickWeighted(rnd, w) {
  let sum = 0; for (const k in w) sum += w[k];
  let r = rnd() * sum;
  for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return Object.keys(w)[0];
}
const randIn = (rnd, a, b) => a + rnd() * (b - a);
const randInt = (rnd, a, b) => a + Math.floor(rnd() * (b - a + 1));

/* 點是否在多邊形內（射線法） */
function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/* 點到線段的距離平方 + 該段的方向（給建築對齊道路法線用） */
function segDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
  t = clamp(t, 0, 1);
  const cx = ax + dx * t, cy = ay + dy * t;
  return { d2: (px - cx) * (px - cx) + (py - cy) * (py - cy), ang: Math.atan2(dy, dx) };
}

/* ══ 生成 ══════════════════════════════════════════════════════════ */
function generate(opts) {
  const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
  const tier = opts.tier || 'town';
  const T = TIERS[tier];
  if (!T) throw new Error('unknown tier: ' + tier);
  const seed = opts.seed >>> 0;
  const rnd = mulberry32(seed);
  const R = opts.radius || 100;
  const faction = opts.faction || 'free';
  const coastal = !!opts.coastal;
  /* ⚠ 注入式：生成器不直接讀高度圖，否則就綁死在飛行原型上、也沒法單測。
     回傳 {slopeF, waterF}：坡度大的方向壓縮、臨水方向放寬。 */
  const terrainAt = opts.terrainAt || (() => ({ slope: 0, water: 0 }));

  const s = {
    id: opts.id || ('s' + seed.toString(36)),
    name: opts.name || '',
    tier, seed, radius: R, faction, coastal,
    world: { x: opts.x || 0, y: opts.y || 0 },
    terrain: opts.terrain || { slope: 0, elevation: 0 },
    boundary: [], roads: [], buildings: [], landmarks: [], walls: null,
    plaza: T.plaza ? R * T.plaza : 0,
    palette: null, genMs: 0,
  };

  /* ── 2-1 輪廓 ────────────────────────────────────────────────── */
  const N = randInt(rnd, 20, 32);
  const fbm = periodicFbm(rnd, 8, 3);
  /* 橢圓拉伸：真實聚落很少是圓的，多半沿河、沿路或沿海岸拉長。
     ⚠ 只靠 fbm 抖動不夠 —— 三個八度平均之後值域集中在 0.5 附近，
       不同 seed 的輪廓半徑差不到 12%，五座城看起來都是同一顆蛋
       （驗收台的「變化性」就是這樣被擋下來的）。
       拉伸提供的是**低頻**差異，fbm 提供高頻，兩者疊起來才會各有長相。 */
  const ecc = randIn(rnd, 0.12, 0.36), eAng = rnd() * TAU;
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU;
    /* fbm 的引數用 i/N*period：繞一圈剛好走完整數個週期，起點與終點自動
       接合。規格寫的 a*2.5 會在接縫處裂開。
       再拉一次對比：多八度平均會把值域壓向中間，不拉開就沒有起伏。 */
    const fv = clamp((fbm(i / N * 8) - 0.5) * 1.85 + 0.5, 0, 1);
    let r = R * (0.66 + 0.34 * fv) * (1 + ecc * Math.cos(2 * (a - eAng)));
    const tf = terrainAt(Math.cos(a), Math.sin(a));
    r *= lerp(1, 0.60, clamp(tf.slope, 0, 1));      // 靠山側內縮
    r *= lerp(1, 1.15, clamp(tf.water, 0, 1));      // 臨水側外擴
    s.boundary.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  const bmax = s.boundary.reduce((m, p) => Math.max(m, Math.hypot(p.x, p.y)), 0);

  /* ── 2-2 路網 ────────────────────────────────────────────────── */
  const W_MAIN = R * 0.035, W_RING = R * 0.025, W_MINOR = R * 0.015;
  const spokeAngles = [];
  if (T.spokes) {
    const ns = randInt(rnd, T.spokes[0], T.spokes[1]);
    for (let i = 0; i < ns; i++) {
      // 角度不均分：各加 ±12° 抖動，避免放射狀太像車輪
      spokeAngles.push(i / ns * TAU + (rnd() - 0.5) * (24 * Math.PI / 180));
    }
    for (const a of spokeAngles) {
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        const wob = (rnd() - 0.5) * 0.10 * t;         // 幹道也不是直線
        const rr = bmax * 1.02 * t;
        pts.push({ x: Math.cos(a + wob) * rr, y: Math.sin(a + wob) * rr });
      }
      s.roads.push({ pts, width: W_MAIN, kind: 'main' });
    }
    const ringR = [0.35, 0.68, 0.92].slice(0, T.rings);
    for (const rf of ringR) {
      const pts = [], M = 26;
      const rn = periodicFbm(rnd, 6, 2);
      for (let i = 0; i <= M; i++) {
        const a = i / M * TAU;
        const rr = R * rf * (0.90 + 0.20 * rn(i / M * 6));
        pts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr });
      }
      s.roads.push({ pts, width: W_RING, kind: 'ring' });
    }
    // 次要道路：環道與幹道之間的短接
    const nMinor = Math.round(spokeAngles.length * (T.rings + 1) * 0.8);
    for (let i = 0; i < nMinor; i++) {
      const a0 = spokeAngles[randInt(rnd, 0, spokeAngles.length - 1)] + randIn(rnd, -0.5, 0.5);
      const r0 = R * randIn(rnd, 0.20, 0.90), r1 = r0 + R * randIn(rnd, 0.10, 0.28);
      const a1 = a0 + randIn(rnd, -0.45, 0.45);
      s.roads.push({
        pts: [{ x: Math.cos(a0) * r0, y: Math.sin(a0) * r0 },
              { x: Math.cos(a1) * r1, y: Math.sin(a1) * r1 }],
        width: W_MINOR, kind: 'minor',
      });
    }
  } else if (tier === 'town') {
    // 一條主路貫穿 + 2~3 條分岔
    const base = rnd() * TAU, pts = [];
    for (let k = -1; k <= 1; k += 2 / 8) {
      const t = k;
      pts.push({ x: Math.cos(base) * bmax * t + Math.cos(base + 1.57) * (rnd() - 0.5) * R * 0.25,
                 y: Math.sin(base) * bmax * t + Math.sin(base + 1.57) * (rnd() - 0.5) * R * 0.25 });
    }
    s.roads.push({ pts, width: W_MAIN, kind: 'main' });
    for (let i = 0, n = randInt(rnd, 2, 3); i < n; i++) {
      const p = pts[randInt(rnd, 1, pts.length - 2)];
      const a = base + 1.57 + randIn(rnd, -0.6, 0.6);
      s.roads.push({ pts: [p, { x: p.x + Math.cos(a) * R * 0.7, y: p.y + Math.sin(a) * R * 0.7 }],
                     width: W_MINOR, kind: 'minor' });
    }
  } else {
    // 村莊：一條小徑，不做路網
    const base = rnd() * TAU, pts = [];
    for (let k = -1; k <= 1.001; k += 0.5) {
      pts.push({ x: Math.cos(base) * bmax * k + (rnd() - 0.5) * R * 0.2,
                 y: Math.sin(base) * bmax * k + (rnd() - 0.5) * R * 0.2 });
    }
    s.roads.push({ pts, width: W_MINOR, kind: 'path' });
  }

  /* 最近道路查詢：建築要用它定朝向，取樣也要用它避開路面。兩處共用。 */
  const segs = [];
  for (const rd of s.roads)
    for (let i = 1; i < rd.pts.length; i++)
      segs.push({ ax: rd.pts[i - 1].x, ay: rd.pts[i - 1].y, bx: rd.pts[i].x, by: rd.pts[i].y,
                  hw: rd.width * 0.5, kind: rd.kind });
  function nearestRoad(x, y) {
    let best = null, bd = Infinity;
    for (const g of segs) {
      const r = segDist2(x, y, g.ax, g.ay, g.bx, g.by);
      if (r.d2 < bd) { bd = r.d2; best = { d: Math.sqrt(r.d2), ang: r.ang, hw: g.hw, kind: g.kind }; }
    }
    return best || { d: 1e9, ang: 0, hw: 0, kind: 'none' };
  }

  /* ── 2-3 建築配置（Poisson-disk 取樣）──────────────────────────
     ⚠ 用飛鏢投擲＋網格加速，不用 Bridson：這裡的半徑隨密度變化
       （中心密、外圍疏），Bridson 的固定半徑假設不成立。
       建築上限 420，飛鏢法完全跑得動（實測見 genMs）。 */
  const count = randInt(rnd, T.n[0], T.n[1]);
  const avgFp = R * 0.018;
  const cell = avgFp * 1.25;
  const gw = Math.ceil(bmax * 2 / cell) + 2;
  const grid = new Array(gw * gw).fill(null);
  const gidx = (x, y) => (Math.floor((y + bmax) / cell) + 1) * gw + Math.floor((x + bmax) / cell) + 1;
  const placed = [];
  let tries = 0, maxTries = count * 60;
  while (placed.length < count && tries++ < maxTries) {
    const a = rnd() * TAU;
    // 面積均勻取樣後再往中心偏，配合密度公式
    const rr = Math.sqrt(rnd()) * bmax * 1.02;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (!inPoly(s.boundary, x, y)) continue;
    const dc = Math.hypot(x, y) / R;
    if (s.plaza && dc * R < s.plaza) continue;                 // 中心廣場淨空
    // 密度：外圍稀疏 → 用機率剔除
    const dens = 1 - 0.55 * Math.pow(clamp(dc, 0, 1), 1.4);
    if (rnd() > dens) continue;
    const nr = nearestRoad(x, y);
    if (nr.d < nr.hw + avgFp * 0.6) continue;                  // 壓在路上 → 丟掉
    // 最小間距：建築平均寬 × 1.25
    const gi = gidx(x, y);
    let clash = false;
    for (let dy = -1; dy <= 1 && !clash; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const o = grid[gi + dy * gw + dx];
        if (o && (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y) < cell * cell) { clash = true; break; }
      }
    if (clash) continue;
    const rec = { x, y, dc, nr };
    grid[gi] = rec; placed.push(rec);
  }

  for (const p of placed) {
    // 型別：先依環帶與「是否臨街」過濾權重，再抽
    const w = {};
    for (const k in T.w) {
      const B = BTYPE[k]; if (!B) continue;
      if (p.dc < B.ring[0] || p.dc > B.ring[1]) continue;
      let wt = T.w[k];
      if (B.onRoad) wt *= (p.nr.kind === 'main' ? 3.0 : 0.35);       // 商店沿主幹道
      if (k === 'warehouse' && coastal) wt *= 3.0;                   // 港區
      if (wt > 0) w[k] = wt;
    }
    if (!Object.keys(w).length) w.house = 1;
    const type = pickWeighted(rnd, w);
    const B = BTYPE[type];
    const fw = R * randIn(rnd, B.fp[0], B.fp[1]);
    const ratio = randIn(rnd, 1.0, 2.2);
    const hr = randIn(rnd, B.hr[0], B.hr[1]);
    s.buildings.push({
      x: p.x, y: p.y, w: fw, d: fw / ratio, h: fw * hr, type,
      // 朝向對齊最近道路法線，±8° 抖動
      rot: p.nr.ang + Math.PI / 2 + randIn(rnd, -0.14, 0.14),
      tone: randInt(rnd, 0, 2),                                      // 屋頂 2~3 種主色之一
    });
  }

  /* ── 三、地標 ─────────────────────────────────────────────────── */
  /* ⚠ 規格的地標表有漏洞：faction='church' 的內陸都市 III 篩完是空的
     （cathedral 只給 city1/2、keep 限 empire、clocktower 限 free、
       lighthouse 要臨海、其餘限城鎮村莊）。而規格另一條寫「每個聚落**必須**
     至少一座地標」—— 兩條打架時以「必須」為準，所以這裡分三段放寬：
       ① 完全符合 → ② 放掉勢力限制 → ③ 連階級也放掉
     這樣任何組合都保證生得出地標，而不是靜靜地生出一座沒有地標的城。 */
  function pickLandmark(exclude, relax) {
    const cands = [];
    for (const k in LANDMARKS) {
      const L = LANDMARKS[k];
      if (exclude && exclude.indexOf(k) >= 0) continue;
      if (relax < 2 && L.tiers.indexOf(tier) < 0) continue;
      if (relax < 1 && L.fac && L.fac.indexOf(faction) < 0) continue;
      if (L.coastal && !coastal) continue;      // 臨海條件不放寬：內陸不該有燈塔
      if (L.inland && coastal) continue;
      cands.push(k);
    }
    return cands.length ? cands[randInt(rnd, 0, cands.length - 1)] : null;
  }
  function pickLandmarkAny(exclude) {
    return pickLandmark(exclude, 0) || pickLandmark(exclude, 1) || pickLandmark(exclude, 2);
  }
  const avgH = s.buildings.length
    ? s.buildings.reduce((a, b) => a + b.h, 0) / s.buildings.length : R * 0.02;
  const LM_MIN_H = avgH * 3.2;      // 規格：≥3× 平均屋高，取 3.2 留餘裕
  const mainOK = (tier !== 'village') || rnd() < 0.6;
  if (mainOK) {
    const k = pickLandmarkAny();
    if (k) s.landmarks.push({
      x: 0, y: 0, type: k, rot: rnd() * TAU,
      scale: Math.max(LM_MIN_H, R * 0.14 * LANDMARKS[k].scale) , main: true,
    });
  }
  const nSub = randInt(rnd, T.subLm[0], T.subLm[1]);
  const used = s.landmarks.map(l => l.type);
  for (let i = 0; i < nSub; i++) {
    const k = pickLandmark(used, 0) || pickLandmark(used, 1); if (!k) break;
    used.push(k);
    // 依類型放置：燈塔靠海（＝ +x 側，海在哪由呼叫端旋轉）、繫留塔靠外緣
    let a = rnd() * TAU, rr = R * randIn(rnd, 0.30, 0.62);
    if (k === 'lighthouse') { a = randIn(rnd, -0.5, 0.5); rr = bmax * 0.92; }
    if (k === 'mooring_mast') { rr = bmax * 0.86; }
    if (k === 'keep') { rr = R * 0.30; }
    // ⚠ 次地標同樣要吃 LM_MIN_H。規格說「地標必須明顯高於周邊建築（≥3×
    //   平均屋高）」，沒有分主次 —— 先前給次地標打 0.8 折，驗收就掉到 2.7×。
    s.landmarks.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, type: k, rot: rnd() * TAU,
                       scale: Math.max(LM_MIN_H, R * 0.10 * LANDMARKS[k].scale), main: false });
  }

  /* ── 四、城牆 ─────────────────────────────────────────────────── */
  if (T.wallP > 0 && rnd() < T.wallP) {
    const pts = s.boundary.map(p => ({ x: p.x * 0.94, y: p.y * 0.94 }));   // 內縮 0.06R
    const towers = [];
    for (let a = 0; a < TAU - 0.01; a += 35 * Math.PI / 180) {
      const aa = a + randIn(rnd, -0.175, 0.175);                            // ±10°
      const rr = polyRadius(pts, aa);
      towers.push({ x: Math.cos(aa) * rr, y: Math.sin(aa) * rr });
    }
    const gates = spokeAngles.map(a => {
      const rr = polyRadius(pts, a);
      return { x: Math.cos(a) * rr, y: Math.sin(a) * rr };
    });
    s.walls = { pts, towers, gates, h: avgH * 1.4 };
  }

  /* ── 港區 ─────────────────────────────────────────────────────── */
  if (coastal) {
    s.piers = [];
    for (let i = 0, n = randInt(rnd, 3, 6); i < n; i++) {
      const a = randIn(rnd, -0.55, 0.55);
      const r0 = bmax * 0.92, len = R * randIn(rnd, 0.10, 0.20);
      s.piers.push({ x: Math.cos(a) * r0, y: Math.sin(a) * r0, ang: a, len });
    }
  }

  /* ── 七、色感：每個聚落一組偏移 ───────────────────────────────── */
  s.palette = {
    hue: randIn(rnd, -8, 8),          // 色相 ±8°
    sat: randIn(rnd, -0.12, 0.12),    // 飽和 ±12%
    roofs: [randIn(rnd, 0, 360), randIn(rnd, 0, 360), randIn(rnd, 0, 360)]
             .map((_, i) => ROOF_TONES[randInt(rnd, 0, ROOF_TONES.length - 1)]),
  };

  /* ── 八、轉向：把整份平面座標繞中心轉 seaAng ────────────────────
     港區的棧橋是固定生在區域 +x 側的（見上方「燈塔靠海」），所以「海在哪」
     必須由呼叫端給。原本的註解說由呼叫端旋轉，但 draw() 是 ctx.rotate(0)
     —— 那是刻意的：斜角投影下整體旋轉畫布會讓所有屋頂一起歪掉穿幫。
     所以旋轉要做在**資料**上：轉的是街廓、城牆、棧橋、建築的位置，
     屋頂仍照原本的斜角規則畫，不會穿幫。
     ⚠ 建築與地標的 rot 也一起加 seaAng：那個角度是「對齊所屬街道」算出來的，
       街道轉了它不轉，房子就會斜著卡在路邊。 */
  if (opts.seaAng) {
    const ca = Math.cos(opts.seaAng), sa = Math.sin(opts.seaAng);
    const rot = pt => { const x = pt.x, y = pt.y; pt.x = x * ca - y * sa; pt.y = x * sa + y * ca; };
    s.boundary.forEach(rot);
    s.roads.forEach(rd => rd.pts.forEach(rot));
    s.buildings.forEach(b => { rot(b); b.rot += opts.seaAng; });
    s.landmarks.forEach(l => { rot(l); l.rot += opts.seaAng; });
    if (s.piers) s.piers.forEach(q => { rot(q); q.ang += opts.seaAng; });
    if (s.walls) {
      s.walls.pts.forEach(rot);
      s.walls.towers.forEach(rot);
      s.walls.gates.forEach(rot);
    }
    s.seaAng = opts.seaAng;
  }

  s.genMs = ((typeof performance !== 'undefined') ? performance.now() : 0) - t0;
  return s;
}

function polyRadius(pts, ang) {
  // 多邊形在某角度上的半徑（取最近的頂點方向內插，夠用且便宜）
  const n = pts.length;
  const t = ((ang % TAU) + TAU) % TAU / TAU * n;
  const i = Math.floor(t) % n, j = (i + 1) % n, f = t - Math.floor(t);
  return lerp(Math.hypot(pts[i].x, pts[i].y), Math.hypot(pts[j].x, pts[j].y), f);
}

const ROOF_TONES = [
  [26, 34, 38],   // 深赭
  [16, 22, 46],   // 石板灰藍
  [34, 40, 34],   // 苔綠
  [8, 30, 44],    // 磚紅
  [40, 18, 52],   // 鉛灰
];

/* ══ 繪製 ══════════════════════════════════════════════════════════
   view = { ox, oy, scale }：世界 → 螢幕
     sx = ox + wx*scale
     sy = oy + wy*scale*TILT        （斜角壓縮）
   高度往螢幕上方長，不吃 TILT 壓縮。
   ⚠ 所有建築／地標／城牆片段以 screenY 統一排序後一次畫完，不可分批 ——
     分批一定會出現遠的蓋住近的。 */
const TILT = 0.58;
const LIGHT_AZ = 320 * Math.PI / 180;      // 光源固定西北，與地形 hillshade 一致
const SH = { lit: 1.00, side: 0.72, back: 0.48, roof: 0.88 };

const DEBUG = {
  showBoundary: false, showRoads: false, showBlocks: false,
  showDepthOrder: false, showPivots: false,
};

function hsl(h, s, l, a) { return `hsla(${h},${s}%,${l}%,${a === undefined ? 1 : a})`; }
function shade(tone, pal, k, a) {
  return hsl(tone[0] + pal.hue, clamp(tone[1] * (1 + pal.sat), 0, 100), tone[2] * k, a);
}

function draw(ctx, s, view, dbg) {
  dbg = dbg || DEBUG;
  const { ox, oy, scale } = view;
  /* TILT 是「地面平面在畫面上被壓扁多少」。地圖畫面是固定斜角，用常數就好；
     3D 飛行畫面不行 —— 那裡的壓縮率隨距離變（近處地面幾乎正對鏡頭、壓得扁，
     遠處接近地平線、壓成一條線）。固定 0.58 的結果就是整座城變成一張不隨
     視角變形的貼紙浮在地表上。呼叫端算得出當下的真實壓縮率就傳 view.tilt。 */
  const tilt = (view.tilt > 0) ? view.tilt : TILT;
  const X = wx => ox + wx * scale;
  const Y = wy => oy + wy * scale * tilt;
  const screenDia = s.radius * 2 * scale;

  /* ── LOD ────────────────────────────────────────────────────── */
  const lod = screenDia > 180 ? 3 : screenDia > 60 ? 2 : screenDia > 20 ? 1 : 0;
  if (lod === 0) { drawIcon(ctx, s, X(0), Y(0), scale); return; }

  const pal = s.palette;

  /* 地面：輪廓內填土色（LOD1 以上都畫，給城市一個底） */
  ctx.save();
  ctx.beginPath();
  s.boundary.forEach((p, i) => i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)));
  ctx.closePath();
  // 地面壓暗：建築佔地只有 R 的 1~5%，在 280px 的城市裡一棟只有 2~3px，
  // 底色若與牆面亮度接近，整座城就會糊成一片雜點看不出建築。
  ctx.fillStyle = hsl(36 + pal.hue, 14, 17, 0.92);
  ctx.fill();
  if (dbg.showBoundary) { ctx.strokeStyle = '#0f0'; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.restore();

  /* 道路：畫在建築之下 */
  for (const rd of s.roads) {
    ctx.beginPath();
    rd.pts.forEach((p, i) => i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)));
    ctx.strokeStyle = dbg.showRoads ? '#ff0'
      : hsl(36 + pal.hue, 12, rd.kind === 'main' ? 40 : rd.kind === 'ring' ? 34 : 28, 0.9);
    ctx.lineWidth = Math.max(0.6, rd.width * scale * (dbg.showRoads ? 0.2 : 1));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke();
  }
  if (s.piers) for (const p of s.piers) {
    ctx.beginPath();
    ctx.moveTo(X(p.x), Y(p.y));
    ctx.lineTo(X(p.x + Math.cos(p.ang) * p.len), Y(p.y + Math.sin(p.ang) * p.len));
    ctx.strokeStyle = hsl(30, 18, 34); ctx.lineWidth = Math.max(0.8, s.radius * 0.012 * scale);
    ctx.stroke();
  }
  if (s.plaza) {
    ctx.beginPath(); ctx.ellipse(X(0), Y(0), s.plaza * scale, s.plaza * scale * TILT, 0, 0, TAU);
    ctx.fillStyle = hsl(38 + pal.hue, 12, 44, 0.8); ctx.fill();
  }

  /* ── 統一深度排序 ───────────────────────────────────────────── */
  const items = [];
  for (const b of s.buildings) items.push({ sy: b.y, kind: 'b', o: b });
  for (const l of s.landmarks) items.push({ sy: l.y, kind: 'l', o: l });
  if (s.walls) {
    const p = s.walls.pts;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      items.push({ sy: (a.y + b.y) * 0.5, kind: 'w', o: { a, b, h: s.walls.h } });
    }
    for (const t of s.walls.towers) items.push({ sy: t.y, kind: 't', o: { t, h: s.walls.h * 1.5 } });
  }
  items.sort((m, n) => m.sy - n.sy);

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind === 'b') drawBuilding(ctx, it.o, X, Y, scale, pal, lod);
    else if (it.kind === 'l') drawLandmark(ctx, it.o, X, Y, scale, pal, lod);
    else if (it.kind === 'w') drawWallSeg(ctx, it.o, X, Y, scale, pal);
    else drawTower(ctx, it.o, X, Y, scale, pal);
    if (dbg.showDepthOrder && i % 8 === 0) {
      ctx.fillStyle = '#0ff'; ctx.font = '8px monospace';
      ctx.fillText(i, X(it.o.x || (it.o.t ? it.o.t.x : it.o.a.x)), Y(it.sy));
    }
  }
  if (dbg.showPivots) for (const l of s.landmarks) {
    ctx.fillStyle = '#f0f';
    ctx.beginPath(); ctx.arc(X(l.x), Y(l.y), 3, 0, TAU); ctx.fill();
  }
}

/* 單棟：陰影 → 正牆 → 側牆 → 屋頂 → 細節 */
/* 夜間燈火：窗戶亮起來的點點。
   ⚠ 不畫在 drawBuilding 裡：那裡是逐棟畫量體，燈要蓋在所有屋頂之上，
     不然後畫的房子會把前一棟的燈蓋掉。
   ⚠ 亮不亮用 seed 決定（同一棟每幀一致），不是每幀擲骰 —— 每幀重擲會變成
     整座城在閃爍。城裡不是每扇窗都亮，取三分之一左右。 */
function drawNightLights(ctx, s, X, Y, scale, night, lod) {
  if (night <= 0.04 || lod < 2) return;
  const dot = Math.max(0.7, scale * 0.055);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < s.buildings.length; i++) {
    const b = s.buildings[i];
    const h = ((s.seed ^ (i * 0x9E3779B1)) >>> 0) / 4294967296;
    if (h > 0.34) continue;                       // 約三分之一的屋子亮著
    const flick = 0.75 + 0.25 * (((i * 7919) % 13) / 13);
    ctx.globalAlpha = night * flick * 0.85;
    ctx.fillStyle = h < 0.10 ? '#ffd9a0' : '#ffbe6a';
    // 燈開在屋子朝鏡頭那一面（＝量體下緣），不是屋頂正中
    ctx.beginPath();
    ctx.arc(X(b.x), Y(b.y) - b.h * scale * 0.22, dot, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawBuilding(ctx, b, X, Y, scale, pal, lod) {
  const sx = X(b.x), sy = Y(b.y);
  const w = b.w * scale, d = b.d * scale * TILT, h = b.h * scale;
  if (w < 0.7) return;
  const tone = pal.roofs[b.tone];

  // 1 地面陰影：往光源反方向偏移
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(sx - Math.cos(LIGHT_AZ) * w * 0.35, sy - Math.sin(LIGHT_AZ) * d * 0.35,
              w * 0.62, d * 0.72, 0, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(0);                       // rot 只影響量體比例（斜角投影下不整體旋轉，避免屋頂穿幫）
  const hw = w * 0.5, hd = d * 0.5;

  if (lod === 1) {                     // 簡化色塊
    ctx.fillStyle = shade([tone[0], tone[1], 52], pal, SH.side);
    ctx.fillRect(-hw, -hd - h, w, h + hd);
    ctx.restore(); return;
  }

  // 2 正面牆（朝向觀者）。牆比地面亮一截，建築才浮得出來
  ctx.fillStyle = shade([tone[0] - 6, tone[1] * 0.55, 60], pal, SH.lit);
  ctx.fillRect(-hw, -h, w, h + hd);
  // 3 側牆：區分受光面
  ctx.fillStyle = shade([tone[0] - 6, tone[1] * 0.55, 60], pal, SH.side);
  ctx.beginPath();
  ctx.moveTo(hw, -h); ctx.lineTo(hw + hd * 0.5, -h - hd * 0.5);
  ctx.lineTo(hw + hd * 0.5, hd * 0.5); ctx.lineTo(hw, hd);
  ctx.closePath(); ctx.fill();

  // 4 屋頂
  ctx.fillStyle = shade(tone, pal, SH.roof);
  const rt = b.type;
  if (rt === 'tower') {                                       // 錐頂
    ctx.beginPath(); ctx.moveTo(0, -h - w * 0.9);
    ctx.lineTo(-hw * 1.1, -h); ctx.lineTo(hw * 1.1, -h); ctx.closePath(); ctx.fill();
  } else if (rt === 'townhouse' || rt === 'manor') {           // 陡斜／複合
    ctx.beginPath(); ctx.moveTo(0, -h - w * 0.55);
    ctx.lineTo(-hw - hd * 0.2, -h); ctx.lineTo(hw + hd * 0.5, -h - hd * 0.5);
    ctx.lineTo(hw * 0.1, -h - w * 0.62); ctx.closePath(); ctx.fill();
  } else if (rt === 'warehouse') {                             // 長脊
    ctx.beginPath(); ctx.moveTo(-hw, -h); ctx.lineTo(0, -h - w * 0.22);
    ctx.lineTo(hw + hd * 0.5, -h - w * 0.22 - hd * 0.5); ctx.lineTo(hw + hd * 0.5, -h - hd * 0.5);
    ctx.closePath(); ctx.fill();
  } else if (rt === 'shop') {                                  // 平頂 + 招牌
    ctx.fillRect(-hw, -h - w * 0.10, w + hd * 0.5, w * 0.10);
    ctx.fillStyle = shade([tone[0] + 20, 45, 52], pal, 1.0);
    ctx.fillRect(-hw * 0.7, -h * 0.62, w * 0.6, h * 0.14);
  } else if (rt === 'hovel') {                                 // 平斜
    ctx.beginPath(); ctx.moveTo(-hw, -h); ctx.lineTo(hw + hd * 0.5, -h - hd * 0.5);
    ctx.lineTo(hw + hd * 0.5, -h - hd * 0.5 - w * 0.10); ctx.lineTo(-hw, -h - w * 0.10);
    ctx.closePath(); ctx.fill();
  } else {                                                     // 雙斜
    ctx.beginPath(); ctx.moveTo(0, -h - w * 0.34);
    ctx.lineTo(-hw, -h); ctx.lineTo(hw + hd * 0.5, -h - hd * 0.5);
    ctx.lineTo(hd * 0.5, -h - w * 0.34 - hd * 0.5); ctx.closePath(); ctx.fill();
  }

  // 5 細節：門窗（townhouse 以上、且 LOD 3）
  if (lod === 3 && (rt === 'townhouse' || rt === 'manor' || rt === 'shop')) {
    ctx.fillStyle = 'rgba(255,214,140,.55)';
    const rows = Math.max(1, Math.round(h / (w * 0.42)));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < 2; c++)
        ctx.fillRect(-hw + w * (0.24 + c * 0.4), -h + h * (0.16 + r * 0.9 / rows), w * 0.14, h * 0.12);
  }
  ctx.restore();
}

function drawWallSeg(ctx, o, X, Y, scale, pal) {
  const ax = X(o.a.x), ay = Y(o.a.y), bx = X(o.b.x), by = Y(o.b.y);
  const h = o.h * scale;
  ctx.fillStyle = hsl(34 + pal.hue, 10, 34);
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, by - h); ctx.lineTo(ax, ay - h);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = hsl(34 + pal.hue, 10, 44);
  ctx.fillRect(Math.min(ax, bx), Math.min(ay, by) - h - 1, Math.abs(bx - ax) || 1, 2);
}
function drawTower(ctx, o, X, Y, scale, pal) {
  const x = X(o.t.x), y = Y(o.t.y), h = o.h * scale, w = h * 0.34;
  ctx.fillStyle = hsl(34 + pal.hue, 10, 30);
  ctx.fillRect(x - w * 0.5, y - h, w, h);
  ctx.fillStyle = hsl(34 + pal.hue, 10, 42);
  ctx.beginPath(); ctx.moveTo(x, y - h - w * 0.7);
  ctx.lineTo(x - w * 0.62, y - h); ctx.lineTo(x + w * 0.62, y - h); ctx.closePath(); ctx.fill();
}

/* 地標：造型要能在剪影下辨識（LOD1 也只畫剪影，形狀必須有特徵） */
function drawLandmark(ctx, l, X, Y, scale, pal, lod) {
  const x = X(l.x), y = Y(l.y), H = l.scale * scale;
  if (H < 2) return;
  const w = H * 0.34;
  const body = hsl(40 + pal.hue, 8, lod === 1 ? 26 : 40);
  const roof = hsl(40 + pal.hue, 14, lod === 1 ? 26 : 52);
  ctx.fillStyle = 'rgba(0,0,0,.34)';
  ctx.beginPath(); ctx.ellipse(x - w * 0.3, y, w * 0.9, w * 0.4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = body;
  const T = l.type;
  if (T === 'cathedral') {
    ctx.fillRect(x - w * 0.8, y - H * 0.55, w * 1.6, H * 0.55);                 // 中殿
    ctx.fillRect(x - w * 0.95, y - H, w * 0.36, H);                             // 雙尖塔
    ctx.fillRect(x + w * 0.59, y - H, w * 0.36, H);
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.ellipse(x, y - H * 0.55, w * 0.5, w * 0.42, 0, Math.PI, 0); ctx.fill();  // 圓頂
    for (const sx2 of [x - w * 0.77, x + w * 0.77]) {
      ctx.beginPath(); ctx.moveTo(sx2, y - H - w * 0.55);
      ctx.lineTo(sx2 - w * 0.24, y - H); ctx.lineTo(sx2 + w * 0.24, y - H); ctx.closePath(); ctx.fill();
    }
  } else if (T === 'keep') {
    ctx.fillRect(x - w * 0.7, y - H * 0.8, w * 1.4, H * 0.8);                    // 方形主樓
    for (const sx2 of [x - w * 0.85, x + w * 0.85]) ctx.fillRect(sx2 - w * 0.22, y - H, w * 0.44, H);
    ctx.fillStyle = roof;
    ctx.fillRect(x - w * 0.75, y - H * 0.86, w * 1.5, H * 0.06);
  } else if (T === 'clocktower') {
    ctx.fillRect(x - w * 0.28, y - H, w * 0.56, H);
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.moveTo(x, y - H - w * 0.7);
    ctx.lineTo(x - w * 0.4, y - H); ctx.lineTo(x + w * 0.4, y - H); ctx.closePath(); ctx.fill();
    if (lod === 3) { ctx.fillStyle = '#f5e6c0';
      ctx.beginPath(); ctx.arc(x, y - H * 0.82, w * 0.16, 0, TAU); ctx.fill(); }
  } else if (T === 'lighthouse') {
    ctx.beginPath(); ctx.moveTo(x - w * 0.34, y); ctx.lineTo(x - w * 0.17, y - H);
    ctx.lineTo(x + w * 0.17, y - H); ctx.lineTo(x + w * 0.34, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lod === 1 ? roof : 'rgba(255,226,150,.95)';
    ctx.fillRect(x - w * 0.24, y - H - w * 0.28, w * 0.48, w * 0.28);
  } else if (T === 'mooring_mast') {
    ctx.fillRect(x - w * 0.12, y - H, w * 0.24, H);
    ctx.strokeStyle = body; ctx.lineWidth = Math.max(1, w * 0.07);
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, y); ctx.lineTo(x, y - H * 0.62); ctx.lineTo(x + w * 0.5, y);
    ctx.stroke();
    ctx.fillStyle = roof; ctx.fillRect(x - w * 0.4, y - H - w * 0.18, w * 0.8, w * 0.18);
  } else if (T === 'windmill') {
    ctx.beginPath(); ctx.moveTo(x - w * 0.4, y); ctx.lineTo(x - w * 0.24, y - H * 0.78);
    ctx.lineTo(x + w * 0.24, y - H * 0.78); ctx.lineTo(x + w * 0.4, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = roof; ctx.lineWidth = Math.max(1, w * 0.09);
    const cy = y - H * 0.82;
    for (let i = 0; i < 4; i++) {
      const a = l.rot + i * Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(x, cy);
      ctx.lineTo(x + Math.cos(a) * H * 0.34, cy + Math.sin(a) * H * 0.34); ctx.stroke();
    }
  } else if (T === 'watchtower') {
    ctx.fillRect(x - w * 0.3, y - H, w * 0.6, H);
    ctx.fillStyle = roof;
    ctx.fillRect(x - w * 0.42, y - H - w * 0.16, w * 0.84, w * 0.16);
  } else {                                    // shrine
    ctx.fillRect(x - w * 0.55, y - H * 0.5, w * 1.1, H * 0.5);
    ctx.fillRect(x - w * 0.14, y - H, w * 0.28, H * 0.55);
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.moveTo(x, y - H * 0.62); ctx.lineTo(x - w * 0.8, y - H * 0.44);
    ctx.lineTo(x + w * 0.8, y - H * 0.44); ctx.closePath(); ctx.fill();
  }
}

/* LOD 0：單一符號 */
function drawIcon(ctx, s, x, y, scale) {
  const r = { city1: 6, city2: 5, city3: 4, town: 3, village: 2.2 }[s.tier];
  ctx.fillStyle = '#c9a227';
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(8,7,12,.7)'; ctx.lineWidth = 1; ctx.stroke();
  if (s.tier === 'city1' || s.tier === 'city2') {
    ctx.strokeStyle = '#c9a227';
    ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, TAU); ctx.stroke();
  }
}

global.Settlement = { generate, draw, DEBUG, TIERS, TILT, LANDMARKS, BTYPE };
})(typeof window !== 'undefined' ? window : globalThis);
