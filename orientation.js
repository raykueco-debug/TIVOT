/* ============================================================================
 *  orientation.js — 全域鎖直向（所有入口共用；classic script，不走 module）
 *  ---------------------------------------------------------------------------
 *  為什麼要兩層：
 *    (1) Screen Orientation API 的 lock() 是**真的**鎖，但只有在全螢幕／已安裝的
 *        App（standalone）情境才准；一般瀏覽器分頁一律拒絕（回 rejected promise
 *        或直接丟例外）。所以它是「能鎖就鎖」，不能當唯一手段。
 *    (2) 鎖不住時退到擋板：橫向就整片蓋住，請使用者轉回來。
 *  為什麼不用「CSS 反轉 90 度硬撐成直向」：整個畫面是 canvas + 觸控拖曳，
 *    transform 之後指標座標與版面座標就對不上了，操舵／點盤面全部要重算 ——
 *    擋板沒有這個代價，而且使用者一轉回來就恢復，體感一樣是「不給橫」。
 *  ⚠ 擋板只對觸控裝置生效（pointer:coarse）：桌機把視窗拉扁不該被擋。
 *  ⚠ manifest.webmanifest 另有 "orientation":"portrait" —— 那是給已安裝 PWA 的
 *    宣告式鎖定，跟這裡的 (1) 互補，兩邊都要留。
 * ========================================================================== */
(function () {
  'use strict';

  /* ── (1) 能鎖就鎖 ── */
  function lock() {
    try {
      var o = screen.orientation;
      if (o && o.lock) {
        var p = o.lock('portrait');
        if (p && p.catch) p.catch(function () {});   // 分頁情境必定被拒，靜默
      }
    } catch (e) {}
  }
  lock();
  // 由背景回前景／進出全螢幕後鎖定可能被清掉 → 補鎖一次
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) lock();
  });
  document.addEventListener('fullscreenchange', lock);

  /* ── (2) 擋板 ── */
  var CSS =
    '#rotGuard{position:fixed;inset:0;z-index:2147483647;display:none;' +
      'align-items:center;justify-content:center;text-align:center;' +
      'background:#05060c;color:#d8cdb4;' +
      'font-family:"Noto Serif TC",-apple-system,"PingFang TC",serif;}' +
    '#rotGuard b{display:block;font-size:15px;letter-spacing:.18em;color:#c9a227;margin-bottom:10px;}' +
    '#rotGuard span{display:block;font-size:11px;letter-spacing:.12em;opacity:.65;}' +
    '#rotGuard i{display:block;font-size:34px;margin-bottom:16px;font-style:normal;' +
      'animation:rotGuardTurn 2.4s ease-in-out infinite;}' +
    '@keyframes rotGuardTurn{0%,55%{transform:rotate(-90deg)}80%,100%{transform:rotate(0)}}' +
    '@media (orientation:landscape) and (pointer:coarse){#rotGuard{display:flex}}';

  function mount() {
    if (document.getElementById('rotGuard')) return;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    var el = document.createElement('div');
    el.id = 'rotGuard';
    el.innerHTML = '<div><i>▯</i><b>請轉回直向</b><span>本作僅支援直向畫面</span></div>';
    document.body.appendChild(el);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
