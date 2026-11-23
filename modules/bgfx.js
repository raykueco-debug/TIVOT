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
  if (spec.sky) {
    want('sky', spec.sky.img); want('skyMask', spec.sky.mask); (spec.sky.clouds || []).forEach((p, i) => want('cloud' + i, p));
    (spec.sky.layers || []).forEach((L, i) => want('layer' + i, L.img));
    if (spec.sky.moon) want('moon', spec.sky.moon);
    if (spec.sky.sun) want('sun', spec.sky.sun);
  }
  if (spec.plumes) want('plumes', spec.plumes.atlas);
  if (spec.fire) want('fireMask', spec.fire.mask);
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
  if (S.haze) B.haze = blob((S.haze.col || [150, 142, 140]).join(','), 128);
  if (S.fire) { B.fireMask = maskOf(fx.img.fireMask, W, H); B.fireAtlas = fireFrames(); B.ember = emberDot(); B.glow = blob('255,140,50', 128); }
  if (S.sky) { B.skyMask = maskOf(fx.img.skyMask, W, H); B.cut = mk(W, H); B.cx = B.cut.getContext('2d'); }
  /* 原圖自己的雲（town_sky.py 拆的遠／中／近）：每一層鋪成「原圖｜鏡像｜原圖」三寬，往右捲到 2 寬就接回，邊界處左右對稱所以沒有接縫 */
  if (S.sky && S.sky.layers) B.layers = S.sky.layers.map((L, i) => {
    const img = fx.img['layer' + i], c = mk(W * 3, H), g = c.getContext('2d');
    g.drawImage(img, 0, 0, W, H); g.drawImage(img, W * 2, 0, W, H);
    g.save(); g.translate(W * 2, 0); g.scale(-1, 1); g.drawImage(img, 0, 0, W, H); g.restore();
    return { c, o: L };
  });
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

/* 程式雲（城鎮天空，11-21）：每一層往右捲（遠慢近快，speed 以 1536 寬計 px/s），而且不是水平直走 ——
   雲沿著以焦點為中心的弧線走（arc：離焦點左右越遠越往上，＝廣角畫面裡天空的弧），近景另加形變（def：逐條上下伸縮、wob：上下起伏）。
   切成細直條各自位移：t=0、還沒捲動時每一條的位移都是 0 ⇒ 第一格就是原圖。只往前捲，不倒放不來回。 */
function drawLayers(B, x, sky, t) {
  const { W, H, s } = B, fxp = (sky.focus || [0.5, 0.4])[0] * W, yb = (sky.bottom || 0.4) * H, N = 64, sw = W / N;
  const arcY = X => { const u = (X - fxp) / W; return -u * u; };
  for (const { c, o } of B.layers) {
    const off = (t * (o.speed || 6) * s) % (W * 2), arc = (o.arc || 0) * yb, def = o.def || 0, wob = (o.wob || 0) * s;
    const yc = (o.yc != null ? o.yc : 0.5) * yb;
    for (let i = 0; i < N; i++) {
      const X = i * sw, sx = ((X - off) % (W * 2) + W * 2) % (W * 2);
      const orig = sx < W ? sx : W * 2 - sx;                     // 鏡像那一段：原本在 2W−sx 的位置
      let dy = arc * (arcY(X + sw / 2) - arcY(orig + sw / 2));
      let k = 1;
      if (def) k = 1 + def * Math.sin(X / W * 9.4 - t * 0.21 + (o.seed || 0));
      if (wob) dy += wob * Math.sin(X / W * 5.3 + t * 0.13 + (o.seed || 0) * 1.7);
      x.drawImage(c, sx + W * 0.0, 0, sw + 0.6, H, X, dy + yc * (1 - k), sw + 0.6, H * k);
    }
  }
}

/* 煙柱（守城戰，11-22 Ray：「改遊戲內即時跑」）：每個源頭不停冒出煙團（圖集裡已上好色與明暗），
   往上升、越高越大越往兩側散、越淡；遠的（源頭窄）升得慢。煙團的一切都由「第幾團」算出來（hash），不存狀態、時間只往前 ——
   遊戲裡即時跑沒有循環，就沒有循環縫。座標：src＝[x, y, 寬]（畫面寬高的比例）、wind＝畫面寬的比例／秒。
   數值照 tivot_wan/bg_layer/war_run.py 的 Smoke（Ray 選定的 v6 那一版）。 */
function drawPlumes(B, x, P, atlas, t) {
  if (!atlas) return;
  const { W, H } = B, cells = P.cells, wind = (P.wind || 0) * W, items = [];
  P.src.forEach(([fxp, fyp, fwp], si) => {
    const sx = fxp * W, sy = fyp * H, sw = fwp * W, kd = Math.min(1.15, Math.max(0.55, fwp * 768 / 60));
    const ev = 0.22 + 0.08 * hash(si, 901), ph = hash(si, 902), LIFE = 8;
    const k0 = Math.floor((t - LIFE * 1.2) / ev) - 2, k1 = Math.floor(t / ev) + 1;
    for (let k = k0; k <= k1; k++) {
      const r = j => hash(si * 7919 + j, k);
      if (r(1) < 0.12) continue;                                     // 偶爾斷一下 → 不規則
      const age = t - (k + ph + (r(2) - 0.5) * 0.9) * ev, life = LIFE * (0.7 + 0.45 * r(3));
      if (age < 0 || age > life) continue;
      const u = age / life, ci = Math.floor(r(4) * cells.length), [cw, ch] = cells[ci];
      const ww = sw * (0.9 + 3.0 * Math.pow(u, 1.2)) * (0.8 + 0.45 * r(7)), hh = ww * ch / cw * (0.75 + 0.45 * r(8));
      const g = Math.sqrt(-2 * Math.log(Math.max(1e-6, r(9)))) * Math.cos(6.2832 * r(10));
      const lat = g * sw * (0.08 + 0.6 * Math.pow(u, 1.6));
      const cx = sx + wind * kd * age * (1 + u) * (0.85 + 0.3 * r(12)) + lat;
      const cy = sy - age * H * 0.045 * kd * (0.9 + 0.2 * r(11)) * (1 + 0.4 * u);
      const a = Math.min(1, age / 0.5) * Math.pow(1 - u, 1.5) * 0.85 * (0.8 + 0.2 * r(13)) * (P.alpha != null ? P.alpha : 1);
      if (a > 0.004 && ww > 4) items.push([age, ci, cw, ch, cx, cy, ww, hh, a, r(5) < 0.5, r(6) < 0.3]);
    }
  });
  items.sort((p, q) => q[0] - p[0]);                                // 老的（高的）先畫，新的蓋上去
  for (const [, ci, cw, ch, cx, cy, ww, hh, a, fh, fv] of items) {
    x.globalAlpha = Math.min(1, a);
    if (fh || fv) { x.save(); x.translate(cx, cy); x.scale(fh ? -1 : 1, fv ? -1 : 1); x.drawImage(atlas, ci * 256, 0, cw, ch, -ww / 2, -hh / 2, ww, hh); x.restore(); }
    else x.drawImage(atlas, ci * 256, 0, cw, ch, cx - ww / 2, cy - hh / 2, ww, hh);
  }
  x.globalAlpha = 1;
}

/* 畫一格：src＝這一格的來源（影片／靜態圖），live＝來源每一格都在變（影片）。回傳畫好的 canvas。 */
export function drawFx(fx, src, W, H, t, live) {
  if (!fx.B || fx.B.W !== W || fx.B.H !== H) build(fx, W, H);
  const B = fx.B, S = fx.spec, x = B.wx, s = B.s, q = Math.floor(t * 12) / 12;
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  /* ── 天空：靜態天空 → 程式雲（往右捲，中景 70 秒、近景 32 秒捲過一整張）→ 來源挖掉天空那一塊 ── */
  if (S.sky) {
    x.clearRect(0, 0, W, H); x.drawImage(fx.img.sky, 0, 0, W, H);
    if (fx.img.moon) x.drawImage(fx.img.moon, 0, 0, W, H);   // 銀月固定不動（西邊低空那一輪），雲從它前面過
    if (B.layers) drawLayers(B, x, S.sky, t);
    else if (S.sky.clouds) [70, 32].forEach((sec, i) => { const c = fx.img['cloud' + i]; if (!c) return; const off = (t / sec % 1) * W; x.drawImage(c, off - W, 0, W, H); x.drawImage(c, off, 0, W, H); });
    if (fx.img.sun) x.drawImage(fx.img.sun, 0, 0, W, H);   // 太陽畫在雲之上（守城戰，11-22 Ray：「太陽前面那一團是怎麼回事」）
    if (S.plumes) drawPlumes(B, x, S.plumes, fx.img.plumes, t);   // 煙柱在天空這一層：下一步蓋上地面 ⇒ 一律在建築後面
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
  if (B.fireMask) drawFire(B, x, S.fire, t);
  if (S.fireSmoke) drawPlumes(B, x, S.fireSmoke, fx.img.plumes, t);   // 火堆冒的煙：畫在地面之上（不是天空那一層）
  if (B.haze) drawHaze(B, x, S.haze, t);
  return B.work;
}

/* 程式火（11-24 Ray：「火改成程式火煙 前景擋住火的地方要裁下來蓋過去」→「能否再精緻點」→「上網找業界作法」）：
   業界卡通火的標準配方 ＝「往上捲的雜訊 × 火焰形狀 − 侵蝕，再用門檻切成 3~4 個硬邊色帶」（遊戲著色器的經典作法；
   參考 Alan Zucconi／Duck in Town 卡通火焰 shader）。手機上不逐像素即時算：載入時用 JS 算好 32 格無縫循環（雜訊沿週期捲動），
   播放時每個火源只貼 2 次（不同幀與偏移，避免同步）→ 用 firemask 裁（前景木板石塊不在裡面 ⇒ 被擋住）→ 疊上。
   另加：火星（往上飄、左右擺、漸小漸淡，偶爾一陣）＋ 不規則閃爍的暖光（多頻疊加＋偶爾往下掉，不是規律的正弦）。
   src＝[[x, y, 寬]…]（畫面比例；y＝火的底）。 */
const FF = 32, FW = 64, FH = 112;
function fireFrames() {
  const G = 16, nz = new Float32Array(G * G), rr = rng(97);                 // 可平鋪的值雜訊格
  for (let i = 0; i < G * G; i++) nz[i] = rr();
  const sm = v => v * v * (3 - 2 * v);
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi);
    const g = (a, b) => nz[((b % G + G) % G) * G + ((a % G + G) % G)];
    const a = g(xi, yi) + (g(xi + 1, yi) - g(xi, yi)) * fx, c = g(xi, yi + 1) + (g(xi + 1, yi + 1) - g(xi, yi + 1)) * fx;
    return a + (c - a) * fy;
  };
  const c = mk(FF * FW, FH), g = c.getContext('2d'), im = g.createImageData(FF * FW, FH), d = im.data;
  const BAND = [[1.02, [255, 247, 205]], [0.80, [255, 184, 72]], [0.58, [232, 92, 34]], [0.47, [128, 34, 18]]];   // 芯／中／外／描邊
  for (let f = 0; f < FF; f++) {
    const sc = f / FF * G;                                                   // 捲過整整一個週期 ⇒ 第 32 格接回第 0 格
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const u = x / FW - 0.5, v = 1 - y / FH;                                // v＝0 在底
      const n = 0.62 * n2(x / FW * 4, y / FH * 5 + sc) + 0.38 * n2(x / FW * 8 + 3.1, y / FH * 10 + sc * 2);
      const env = Math.pow(Math.max(0, 1 - v), 0.85) * 1.05;                // 越往上越細
      const val = n * 0.95 + env * 0.75 - Math.pow(Math.abs(u) * 2.3 / Math.max(0.25, env), 1.6) * 0.55 - v * 0.15;
      let col = null; for (const [th, cc] of BAND) if (val > th) { col = cc; break; }
      if (!col) continue;
      const o = (y * FF * FW + f * FW + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = col === BAND[3][1] ? 200 : 255;
    }
  }
  g.putImageData(im, 0, 0); return c;
}
function emberDot() {
  const c = mk(8, 8), g = c.getContext('2d'), gr = g.createRadialGradient(4, 4, 0, 4, 4, 4);
  gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(0.5, 'rgba(255,150,50,0.8)'); gr.addColorStop(1, 'rgba(200,60,20,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 8); return c;
}
const flick = (t, k) => 0.55 * Math.sin(t * 7.1 + k) * 0.5 + 0.3 * Math.sin(t * 13.7 + k * 2.3) * 0.5 + 0.25 * (hash(Math.floor(t * 9), k * 17 | 0) - 0.5) - (hash(Math.floor(t * 2.3), k * 31 | 0) < 0.12 ? 0.35 : 0);
function drawFire(B, x, o, t) {
  const { W, H } = B, g = B.tx, A = B.fireAtlas;
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, W, H);
  o.src.forEach(([fx, fy, fw], si) => {
    const cx = fx * W, by = fy * H, w = fw * W;
    /* 11-24 Ray「多點變化 加一點透明度」：三層（主＋兩個小的），各自不同幀速、左右漂移、大小慢慢漲縮、整團偶爾被風壓斜；每層半透明 */
    const breath = 1 + 0.14 * Math.sin(t * 0.73 + si * 3.1) + 0.07 * Math.sin(t * 1.9 + si) + 0.06 * flick(t * 0.5, si + 7);
    const lean = 0.10 * Math.sin(t * 0.41 + si * 1.7) + 0.06 * Math.sin(t * 1.13 + si);
    for (let k = 0; k < 3; k++) {
      const rate = [14, 17, 11][k], fr = Math.floor(t * rate + si * 11 + k * 13) % FF;
      const sz = [1.3, 0.8, 0.6][k] * breath * (1 + 0.12 * Math.sin(t * (0.9 + k * 0.37) + k * 2 + si));
      const ww = w * sz, hh = ww * FH / FW * [0.72, 0.85, 0.9][k];
      const ox = [-0.05, 0.22, -0.28][k] * w + Math.sin(t * (1.3 + k * 0.5) + si + k) * w * 0.07;
      g.globalAlpha = [0.82, 0.62, 0.5][k];
      g.save(); g.translate(cx + ox, by); g.transform(1, 0, lean, 1, 0, 0); g.drawImage(A, fr * FW, 0, FW, FH, -ww / 2, -hh * 0.97, ww, hh); g.restore();
    }
  });
  g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.drawImage(B.fireMask.c, 0, 0);
  x.globalAlpha = 0.9; x.drawImage(B.tmp, 0, 0); x.globalAlpha = 1;
  /* 暖光：照亮四周（不裁），亮度不規則地跳 */
  x.globalCompositeOperation = 'lighter';
  o.src.forEach(([fx, fy, fw], si) => {
    const fl = flick(t, si + 1), rr = fw * W * (1.7 + 0.12 * fl);
    x.globalAlpha = Math.max(0, 0.17 + 0.09 * fl);
    x.drawImage(B.glow, fx * W - rr, fy * H - rr * 0.85, rr * 2, rr * 1.6);
  });
  /* 火星：每個火源 18 顆，往上飄、左右擺、漸小漸淡；偶爾一陣 */
  o.src.forEach(([fx, fy, fw], si) => {
    const w = fw * W, N = 18;
    for (let i = 0; i < N; i++) {
      const life = 1.1 + 0.9 * hash(si * 50 + i, 1), tt = t + hash(si * 50 + i, 2) * life, cyc = Math.floor(tt / life), a = (tt - cyc * life) / life;
      const burst = hash(si, Math.floor(t / 2.7)) < 0.3 ? 1.6 : 1;
      if (hash(si * 50 + i, cyc) > 0.75 * burst) continue;
      const x0 = fx * W + (hash(si * 50 + i, cyc + 3) - 0.5) * w * 0.8, rise = w * (1.4 + 1.2 * hash(i, cyc + 5)) * a;
      const ex = x0 + Math.sin(a * 6 + i) * w * 0.12 * a, ey = fy * H - w * 0.3 - rise, rd = Math.max(1, w * 0.035 * (1 - a * 0.7));
      x.globalAlpha = (1 - a) * (a < 0.1 ? a * 10 : 1) * 0.95;
      x.drawImage(B.ember, ex - rd, ey - rd, rd * 2, rd * 2);
    }
  });
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
}

/* 街上的煙／霧（11-24 Ray：「街上加些許程式煙」「街上加些許程式白霧」）：地面那一帶一團團扁平的柔邊煙，
   沿街橫向飄（近的大、快，遠的小、慢）、慢慢呼吸；位置與大小全由「第幾團」與時間算出來，不存狀態、只往前，沒有循環縫。
   畫在最上層（地面之上）—— 薄薄一層，壓到前景也看得出是空氣裡的煙。
   欄位（比例）：y0／y1＝煙帶上下緣（畫面高）、col、a＝最濃的透明度、n＝團數、wind＝畫面寬／秒（負＝往左）、size＝團的寬（畫面寬）。 */
function drawHaze(B, x, o, t) {
  const { W, H } = B, y0 = (o.y0 != null ? o.y0 : 0.45) * H, y1 = (o.y1 != null ? o.y1 : 0.95) * H, n = o.n || 22;
  const a0 = o.a != null ? o.a : 0.16, wind = (o.wind != null ? o.wind : 0.008) * W, size = (o.size || 0.16) * W, span = W * 1.6;
  for (let i = 0; i < n; i++) {
    const v = hash(i, 11), yy = y0 + (y1 - y0) * v, k = 0.45 + 1.1 * v;            // 越下面越近：越大越快
    const rx = size * k * (0.7 + 0.6 * hash(i, 12)), ry = rx * (0.26 + 0.12 * hash(i, 13));
    const px = ((hash(i, 14) * span + t * wind * k * (0.6 + 0.8 * hash(i, 15))) % span + span) % span - W * 0.3;
    const cy = yy + Math.sin(t * 0.21 + i * 1.7) * ry * 0.25;
    x.globalAlpha = a0 * (0.55 + 0.45 * Math.sin(t * (0.18 + 0.12 * hash(i, 16)) + i * 2.1));
    x.drawImage(B.haze, px - rx, cy - ry, rx * 2, ry * 2);
  }
  x.globalAlpha = 1;
}
