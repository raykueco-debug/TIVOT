/* ============================================================================
 *  sakura.js — 全畫面櫻花「被風捲過」（純程式，無外部素材；葉節點，不依賴其他模組）
 *  ---------------------------------------------------------------------------
 *  點「出陣」時呼叫 sakuraBurst()：疊一層 fixed canvas，畫貝茲花瓣。
 *  花瓣一律從畫面外緣（左緣／上緣，深淺不一 → 錯開進場）被強風斜向（右下）捲入、
 *  再由右／下緣吹出，不憑空出現；速度/角度/翻轉皆高度隨機（亂流感）。
 *  約 2.5 秒內全部掃完淡出 → 在「驅逐開始」轉場(約 3 秒)結束、進入戰鬥前就飄完。
 *  時間一律用 requestAnimationFrame 的時間戳（不碰 Date.now），手機友善（DPR≤2、單 canvas）。
 * ========================================================================== */

const COLORS = ['#ffd7e6', '#ffc0d4', '#f7a8c4', '#ffe4ef', '#f9b6cf'];

export function sakuraBurst(opts) {
  opts = opts || {};
  const emitMs  = opts.emitMs  != null ? opts.emitMs  : 650;    // 由外緣持續補入的時間（短）
  const density = opts.density != null ? opts.density : 1;
  const rate    = (opts.rate   != null ? opts.rate    : 55) * density;  // 每秒補入花瓣數
  const safetyMs= opts.safetyMs!= null ? opts.safetyMs: 5000;   // 後備上限（正常永不觸發，花瓣早已飄出）

  const canvas = document.createElement('canvas');
  canvas.id = 'sakuraFx';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:250;pointer-events:none;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const petals = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  // 一律從畫面外緣進場：左緣（多數）或上緣（少數），起始深淺不一 → 錯開飛入
  function makePetal() {
    const size = 5 + Math.random() * 11;                       // 尺寸範圍加大 → 更亂
    const topEntry = Math.random() < 0.42;
    let x, y;
    if (topEntry) {
      x = rnd(-W * 0.05, W * 1.0);                             // 上緣：橫向隨機（略含左外）
      y = -20 - Math.random() * H * 0.45;                      // 上方外側不同深度（錯開進場）
    } else {
      x = -20 - Math.random() * W * 0.45;                      // 左緣：外側不同深度（錯開進場）
      y = rnd(-H * 0.1, H * 0.95);                             // 縱向任意
    }
    return {
      x, y, size,
      vx: rnd(340, 680),                                       // 強風向右（亂；確保 ~2.5s 內飄出）
      vy: rnd(90, 370),                                        // 向下（亂；配合 vx → 斜掃）
      flutter: rnd(20, 75),                                    // 亂流抖動幅度
      flPh: Math.random() * Math.PI * 2,
      flSp: rnd(2.5, 7),                                       // 抖動頻率
      rot: Math.random() * Math.PI * 2,
      rotSp: rnd(-7, 7),                                       // 快速隨機翻轉
      color: COLORS[(Math.random() * COLORS.length) | 0],
      alpha: 0.8 + Math.random() * 0.2,
      flip: Math.random() < 0.5 ? 1 : -1,
    };
  }
  // 起手一批（全在畫面外、深淺錯開）→ 陸續被風吹入
  const initN = Math.round(64 * density);
  for (let i = 0; i < initN; i++) petals.push(makePetal());

  function drawPetal(p) {
    const s = p.size;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(p.flip, 1);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.62, -s * 0.7, s * 0.7, s * 0.55, 0, s);
    ctx.bezierCurveTo(-s * 0.7, s * 0.55, -s * 0.62, -s * 0.7, 0, -s);
    ctx.fill();
    ctx.globalAlpha = p.alpha * 0.45;
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.08, s * 0.16, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  let running = true, t0 = null, last = null, emitAcc = 0, stopEmit = false, safety = null;

  function frame(ts) {
    if (!running) return;
    if (t0 == null) t0 = ts;
    if (last == null) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    if (ts - t0 >= emitMs) stopEmit = true;
    if (!stopEmit) {
      emitAcc += rate * dt;
      while (emitAcc >= 1) { petals.push(makePetal()); emitAcc -= 1; }
    }
    ctx.clearRect(0, 0, W, H);
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.flPh += p.flSp * dt;
      p.x += (p.vx + Math.cos(p.flPh) * p.flutter) * dt;
      p.y += (p.vy + Math.sin(p.flPh) * p.flutter) * dt;
      p.rot += p.rotSp * dt;
      drawPetal(p);
      if (p.x > W + 45 || p.y > H + 45) petals.splice(i, 1);   // 吹出右/下緣即除（自然飄出，不淡出消失）
    }
    // 只有「花瓣全數自然飄出畫面」才收掉 → 保證用飄的飄完、不憑空消失
    if (stopEmit && petals.length === 0) { cleanup(); return; }
    requestAnimationFrame(frame);
  }

  function cleanup() {
    if (!running) return;
    running = false;
    if (safety) { clearTimeout(safety); safety = null; }
    window.removeEventListener('resize', resize);
    if (canvas.parentNode) canvas.remove();   // 此刻已無花瓣可見，直接移除
  }

  requestAnimationFrame(frame);
  // 後備上限：正常情況下所有花瓣皆於 ~2.5s 內飄出、由上面自然收尾；此計時僅防意外殘留
  safety = setTimeout(cleanup, safetyMs);
  return { stop: cleanup };
}
