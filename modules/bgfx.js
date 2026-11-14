/* ══⚠⚠ 背景的程式層（ver -2621，Ray：「做程式層」；交件單 resources/background/anim/TO_CODE_bg_anim.md）══
   資料在 `script/bg_fx.js`（鐵律 1）；**播放、收掉、取景、何時停**全部照舊由 `modules/story.js` 的 bgAnim 那一段管（鐵律 8：
   背景動畫只有一個播放器）—— 這一支只做一件事：給它一張來源（影片的這一格或靜態圖），畫出疊好程式層的那一張。
   座標一律在**來源的像素空間**（1536 寬左右）裡算，交件單的數字照它寫的基準換算（`s`＝÷1536、`u`＝÷768）；
   畫好之後由 story.js 照背景的取景（cover＋object-position）貼上去。
   ⚠ 跳格：落水、水柱、水霧照交件單「每秒 12 格」（t 取整到 1/12 秒）；水面與光束是連續的。
   ⚠ 只用 canvas 2D 的 drawImage／合成，不逐像素算（除了載入時把遮罩轉成 alpha、光束建一次）—— 手機上每一格都是幾百次貼圖而已。 */
import { assetVer } from '../config.js';

const REF = 1536;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rng = seed => { let s = seed % 2147483647 || 1; return () => (s = s * 16807 % 2147483647) / 2147483647; };
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const url = p => p + (p.indexOf('?') < 0 ? assetVer(p) : '');
function loadImg(p) {
  return new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => rej(p); i.src = url(p); });
}

/* 開始載：回傳一個 fx 物件，`ready`／`failed` 由載入結果決定（任何一張載不到就整組放棄，畫面照舊）。 */
export function prepFx(spec) {
  const fx = { spec, img: {}, json: null, ready: false, failed: false, B: null };
  const jobs = [], want = (k, p) => jobs.push(loadImg(p).then(i => { fx.img[k] = i; }));
  if (spec.base) want('base', spec.base);
  if (spec.water) want('water', spec.water.mask);
  if (spec.flow) want('flow', spec.flow.mask);
  if (spec.spout) {
    want('spout', spec.spout.img); want('spoutFlow', spec.spout.flow);
    jobs.push(fetch(url(spec.spout.path)).then(r => { if (!r.ok) throw spec.spout.path; return r.json(); }).then(j => { fx.json = j; }));
  }
  if (spec.sky) { want('sky', spec.sky.img); want('skyMask', spec.sky.mask); (spec.sky.clouds || []).forEach((p, i) => want('cloud' + i, p)); }
  Promise.all(jobs).then(() => { fx.ready = true; }, e => { fx.failed = true; console.warn('[bgfx] 載不到', e); });
  return fx;
}

/* 灰階遮罩（白＝範圍）→ 白色＋alpha 的 canvas；順便量出上下緣與每一欄的最下緣（水霧取點用）。 */
function maskOf(img, W, H, wantFoot) {
  const c = mk(W, H), x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H), a = d.data;
  let y0 = H, y1 = -1; const foot = wantFoot ? new Int32Array(W).fill(-1) : null;
  for (let i = 0, p = 0; i < a.length; i += 4, p++) {
    const v = (a[i] * a[i + 3] / 255) | 0; a[i + 3] = v;   // 灰階白＝範圍；本身帶 alpha 的也照乘 a[i] = a[i + 1] = a[i + 2] = 255;
    if (v > 40) { const y = (p / W) | 0; if (y < y0) y0 = y; if (y > y1) y1 = y; if (foot) foot[p - y * W] = y; }
  }
  x.putImageData(d, 0, 0);
  const pts = [];
  if (foot) for (let X = 0; X < W; X += 3) if (foot[X] >= 0) pts.push([X, foot[X]]);
  return { c, y0, y1: Math.max(y0, y1), pts };
}
/* 會動的貼圖：零散的橫向短亮線（水面反光，可平鋪）。 */
function glintTile(s) {
  const w = Math.round(512 * s), h = Math.round(256 * s), c = mk(w, h), g = c.getContext('2d'), r = rng(7);
  for (let i = 0; i < 260; i++) {
    const x = r() * w, y = r() * h, l = (6 + r() * 26) * s, a = 0.25 + r() * 0.75;
    const gr = g.createLinearGradient(x - l, 0, x + l, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(x - l, y, l * 2, 1.4 * s);
  }
  return c;
}
/* 落水的白色細長亮條（整寬、縱向可平鋪；長 20~80、寬約 1，以 768 寬計）。 */
function streakTile(W, u) {
  const h = Math.round(512 * u), c = mk(W, h), g = c.getContext('2d'), r = rng(11), n = Math.round(W / 5);
  for (let i = 0; i < n; i++) {
    const x = Math.round(r() * W), y = r() * h, l = (20 + r() * 60) * u, a = 0.3 + r() * 0.7;
    for (const yy of [y, y - h]) {
      const gr = g.createLinearGradient(0, yy, 0, yy + l);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x, yy, Math.max(1, u), l);
    }
  }
  return c;
}
/* 柔邊圓點（水霧／煙／塵埃共用，貼的時候縮放＋globalAlpha）。 */
function blob(rgb, size) {
  const c = mk(size, size), g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.45, `rgba(${rgb},0.55)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
}

/* ── 光束（木雅克神殿　長廊）：幾何量自「原圖 − 去光束圖」，照交件單 ── */
const BEAM_PROF = [[0.06, 0], [0.10, 33], [0.14, 48], [0.20, 82], [0.26, 106], [0.33, 103], [0.40, 92], [0.46, 78], [0.52, 68], [0.58, 54], [0.64, 41], [0.70, 15], [0.74, 0]];
const lerpTab = (tab, y) => { if (y <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (y <= tab[i][0]) { const [a, va] = tab[i - 1], [b, vb] = tab[i]; return va + (vb - va) * (y - a) / (b - a); } return tab[tab.length - 1][1]; };
const beamC = y => 0.255 + (0.50 - 0.255) * (y - 0.10) / (0.64 - 0.10);
const beamHW = y => 0.035 + 0.06 * Math.max(0, (y - 0.08) / 0.6);
function buildBeam(W, H, col, amp) {
  const c = mk(W, H), b = c.getContext('2d'), im = b.createImageData(W, H), d = im.data;
  for (let y = 0; y < H; y++) {
    const yf = y / H, A = lerpTab(BEAM_PROF, yf) * amp / 106 / 255; if (A <= 0) continue;
    const cx = beamC(yf), w = beamHW(yf);
    const xa = Math.max(0, Math.floor((cx - w * 4) * W)), xb = Math.min(W, Math.ceil((cx + w * 2) * W));
    for (let x = xa; x < xb; x++) {
      const dx = (x / W - cx) / w;
      const core = Math.exp(-Math.pow(dx / (dx > 0 ? 0.7 : 1), 2));          // 右緣較銳（×0.7）
      const halo = dx < 0 ? 0.35 * Math.exp(-Math.pow(dx / 3, 2)) : 0;     // 左側拖一段光暈
      const k = A * Math.min(1, core + halo), i = (y * W + x) * 4;
      d[i] = col[0] * k; d[i + 1] = col[1] * k; d[i + 2] = col[2] * k; d[i + 3] = 255;
    }
  }
  b.putImageData(im, 0, 0); return c;
}

/* 獅口水柱的中心線 → 每一列的中心 x 與沿線弧長（768 寬計）。splash_y 以下直直往下。 */
function spoutRows(j, W, H) {
  const P = j.centerline.map(([x, y]) => [x * W, y * H]), yTop = Math.round(P[0][1]), yBot = Math.round(j.bottom_y * H);
  const k = 768 / W, rows = [];
  let seg = 0, arc = 0, px = P[0][0], py = P[0][1];
  for (let y = yTop; y <= yBot; y += 2) {
    let cx;
    while (seg < P.length - 2 && y > P[seg + 1][1]) seg++;
    if (y <= P[P.length - 1][1]) { const [x0, y0] = P[seg], [x1, y1] = P[seg + 1]; cx = x0 + (x1 - x0) * Math.min(1, Math.max(0, (y - y0) / ((y1 - y0) || 1))); }
    else cx = P[P.length - 1][0];
    arc += Math.hypot(cx - px, y - py) * k; px = cx; py = y;
    rows.push({ y, cx, u: arc });
  }
  return { rows, x0: P[0][0], yTop, yBot };
}

function build(fx, W, H) {
  const S = fx.spec, s = W / REF, u = W / 768, B = { W, H, s, u };
  B.work = mk(W, H); B.wx = B.work.getContext('2d');
  B.tmp = mk(W, H); B.tx = B.tmp.getContext('2d');
  if (S.water) {
    const o = Object.assign({ amp: 2.2, wave: 26, speed: 1.0, persp: 1.6, glint: 0.35, glintSpd: 0.35 }, S.water);
    B.water = Object.assign(maskOf(fx.img.water, W, H), { o });
    B.wl = mk(W, H); B.wlx = B.wl.getContext('2d'); B.wlStatic = null;
    B.glint = glintTile(s);
  }
  if (S.flow || S.spout) B.streak = streakTile(W, u);
  if (S.flow) B.flow = maskOf(fx.img.flow, W, H, !!S.mist);
  if (S.spout) {
    B.spoutFlow = maskOf(fx.img.spoutFlow, W, H, true);
    B.spoutImg = mk(W, H); B.spoutImg.getContext('2d').drawImage(fx.img.spout, 0, 0, W, H);
    B.spoutRows = spoutRows(fx.json, W, H);
  }
  if (S.mist || S.spout) B.mist = blob('235,242,248', 128);
  if (S.beam) { B.beam = buildBeam(W, H, S.beam.col, S.beam.amp); B.dust = blob(S.beam.col.map(v => Math.round(v + (255 - v) * 0.5)).join(','), 32); }
  if (S.smoke) B.smoke = blob('150,140,135', 128);
  if (S.sky) { B.skyMask = maskOf(fx.img.skyMask, W, H); B.cut = mk(W, H); B.cx = B.cut.getContext('2d'); }
  fx.B = B;
}

/* 落水：亮條往下捲（12fps 跳格），用遮罩裁、lighter 疊上。 */
function drawFlow(B, x, mask, speed, q) {
  const t = B.tx, th = B.streak.height, off = ((q * speed * B.u) % th + th) % th;
  t.globalCompositeOperation = 'source-over'; t.globalAlpha = 1; t.clearRect(0, 0, B.W, B.H);
  for (let y = off - th; y < B.H; y += th) t.drawImage(B.streak, 0, y);
  t.globalCompositeOperation = 'destination-in'; t.drawImage(mask.c, 0, 0);
  x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.55; x.drawImage(B.tmp, 0, 0);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
}
/* 落點水霧：約 46 團柔邊白霧，各自 6 秒一輪（由時間算出來，不存狀態）。 */
function drawMist(B, x, pts, q) {
  if (!pts.length) return;
  const s = B.s, N = 46, L = 6;
  x.globalCompositeOperation = 'screen';
  for (let i = 0; i < N; i++) {
    const tt = q + i / N * L, n = Math.floor(tt / L), a = (tt - n * L) / L;
    const p = pts[Math.floor(hash(i, n) * pts.length)], dir = hash(i + 99, n) * 2 - 1;
    const r = (14 + 46 * a) * s, cx = p[0] + dir * 70 * a * s, cy = p[1] - 55 * a * s;
    x.globalAlpha = 0.16 * Math.sin(Math.PI * a);
    x.drawImage(B.mist, cx - r, cy - r, r * 2, r * 2);
  }
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
}

/* 畫一格：src＝這一格的來源（影片／靜態圖），live＝來源每一格都在變（影片）。回傳畫好的 canvas。 */
export function drawFx(fx, src, W, H, t, live) {
  if (!fx.B || fx.B.W !== W || fx.B.H !== H) build(fx, W, H);
  const B = fx.B, S = fx.spec, x = B.wx, s = B.s, q = Math.floor(t * 12) / 12;
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  /* ── 天空：靜態天空 → 程式雲（往右捲，中景 70 秒、近景 32 秒捲過一整張）→ 來源挖掉天空那一塊 ── */
  if (S.sky) {
    x.clearRect(0, 0, W, H); x.drawImage(fx.img.sky, 0, 0, W, H);
    [70, 32].forEach((sec, i) => { const c = fx.img['cloud' + i]; if (!c) return; const off = (t / sec % 1) * W; x.drawImage(c, off - W, 0, W, H); x.drawImage(c, off, 0, W, H); });
    const c = B.cx; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H); c.drawImage(src, 0, 0, W, H);
    c.globalCompositeOperation = 'destination-out'; c.drawImage(B.skyMask.c, 0, 0);
    x.drawImage(B.cut, 0, 0);
  } else x.drawImage(src, 0, 0, W, H);
  /* ── 平靜水面：逐列橫向扭動（越下面越近、波越大）＋飄移的反光 ── */
  if (B.water) {
    const o = B.water.o, m = B.water;
    if (live || B.wlStatic !== src) {
      const w = B.wlx; w.globalCompositeOperation = 'source-over'; w.clearRect(0, 0, W, H); w.drawImage(src, 0, 0, W, H);
      w.globalCompositeOperation = 'destination-in'; w.drawImage(m.c, 0, 0); B.wlStatic = live ? null : src;
    }
    const span = Math.max(1, m.y1 - m.y0), amp = o.amp * s, wave = o.wave * s;
    for (let y = m.y0; y <= m.y1; y += 2) {
      const k = 1 + o.persp * (y - m.y0) / span;
      const off = amp * k * (Math.sin(y / (wave * k) * 6.283 - t * o.speed * 3) + 0.5 * Math.sin(y / (wave * k * 0.37) * 6.283 + t * o.speed * 4.1));
      x.drawImage(B.wl, 0, y, W, 2, off, y, W, 2);
    }
    if (o.glint > 0) {
      const g = B.tx, gw = B.glint.width, gh = B.glint.height;
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, W, H);
      const ox = (t * o.glintSpd * 40 * s) % gw, oy = (t * o.glintSpd * 6 * s) % gh;
      for (let gy = oy - gh; gy < H; gy += gh) for (let gx = ox - gw; gx < W; gx += gw) g.drawImage(B.glint, gx, gy);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(m.c, 0, 0);
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = o.glint * (0.75 + 0.25 * Math.sin(t * 1.3));
      x.drawImage(B.tmp, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    }
  }
  /* ── 獅口水柱：①逐列擺動 ②往下滑的亮帶 ③沿中心線彎下去的亮條 ④落點水霧（一律 12fps）── */
  if (B.spoutRows) {
    const R = B.spoutRows.rows, k = W / 768;
    for (const r of R) {
      const dx = (1.4 * Math.sin(r.u * 0.11 - q * 7.5) + 0.7 * Math.sin(r.u * 0.29 - q * 13 + 1.3)) * k;
      x.drawImage(B.spoutImg, 0, r.y, W, 2, dx, r.y, W, 2);
    }
    x.globalCompositeOperation = 'lighter';
    for (const r of R) {
      const a = Math.pow(Math.max(0, Math.sin(r.u * 0.07 - q * 5.5)), 2) * 0.5 * 0.45; if (a < 0.004) continue;
      const dx = (1.4 * Math.sin(r.u * 0.11 - q * 7.5) + 0.7 * Math.sin(r.u * 0.29 - q * 13 + 1.3)) * k;
      x.globalAlpha = a; x.drawImage(B.spoutImg, 0, r.y, W, 2, dx, r.y, W, 2);
    }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    const tc = B.tx, th = B.streak.height, off = ((q * 300 * B.u) % th + th) % th, x0 = B.spoutRows.x0;
    tc.globalCompositeOperation = 'source-over'; tc.globalAlpha = 1; tc.clearRect(0, 0, W, H);
    for (const r of R) { const sy = Math.min(th - 2, ((r.y - off) % th + th) % th); tc.drawImage(B.streak, 0, sy, W, 2, r.cx - x0, r.y, W, 2); }
    tc.globalCompositeOperation = 'destination-in'; tc.drawImage(B.spoutFlow.c, 0, 0);
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.55; x.drawImage(B.tmp, 0, 0);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    drawMist(B, x, B.spoutFlow.pts, q);
  }
  /* ── 落水 ＋ 水霧 ── */
  if (B.flow) {
    drawFlow(B, x, B.flow, (S.flow.speed || 220), q);
    if (S.mist) drawMist(B, x, B.flow.pts, t);
  }
  /* ── 光束：整條呼吸（±15%、5 秒）＋塵埃往下飄（約 12 px/s）── */
  if (B.beam) {
    const br = 1 + 0.15 * Math.sin(t * 2 * Math.PI / 5);
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = br; x.drawImage(B.beam, 0, 0);
    const y0 = 0.06, y1 = 0.74, span = (y1 - y0) * H, amp = S.beam.amp;
    for (let i = 0; i < 70; i++) {
      const ph = hash(i, 1), p = ((ph + t * 12 * s / span) % 1), cyc = Math.floor(ph + t * 12 * s / span);
      const uu = hash(i, cyc + 7), yf = y0 + (y1 - y0) * p, c = beamC(yf), w = beamHW(yf) * 1.6;
      const l = c - w * 1.6, rr = c + w, sway = 0.03 * Math.sin(t * 0.6 + i);
      const u2 = Math.min(0.97, Math.max(0.03, uu + sway));
      const edge = Math.min(1, u2 / 0.3) * Math.min(1, (1 - u2) / 0.3);
      const a = edge * edge * (lerpTab(BEAM_PROF, yf) * amp / 106 / Math.max(1, amp)) * (0.6 + 0.4 * Math.sin(t * 1.7 + i * 2.3)) * 0.9 * br;
      if (a <= 0.01) continue;
      const r = (1.6 * (0.6 + hash(i, 3) * 0.8) * 2.2) * s * 2;
      x.globalAlpha = Math.min(1, a); x.drawImage(B.dust, (l + (rr - l) * u2) * W - r, yf * H - r, r * 2, r * 2);
    }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  }
  /* ── 硝坑的煙：坑底三個源，往上升、擴散變淡，約到 y≈0.45 消失；只往上不倒退 ── */
  if (B.smoke) {
    const SRC = [0.34, 0.48, 0.62], N = 12, L = 7;
    for (let j = 0; j < SRC.length; j++) for (let i = 0; i < N; i++) {
      const tt = t + (i + j * 0.37) / N * L, n = Math.floor(tt / L), a = (tt - n * L) / L;
      const jx = (hash(i * 7 + j, n) - 0.5) * 0.07, drift = (hash(i + j * 31, n + 5) - 0.5) * 0.05 * a;
      const cx = (SRC[j] + jx + drift + 0.008 * Math.sin(t * 0.7 + i)) * W, cy = (0.74 - 0.29 * (1 - Math.pow(1 - a, 1.4))) * H;
      const r = (0.025 + 0.06 * a) * W;
      x.globalAlpha = 0.20 * Math.sin(Math.PI * Math.min(1, a * 1.25)) * (1 - 0.4 * a);
      if (x.globalAlpha > 0.005) x.drawImage(B.smoke, cx - r, cy - r, r * 2, r * 2);
    }
    x.globalAlpha = 1;
  }
  return B.work;
}
