/* ══ 立繪呼吸：分段平移（選項 1，Ray 2026-10-03：「分頭胸腹」）—— 唯一的實作（鐵律 8）══════════
   取代 -1934 那版「整張以腳底為軸伸縮」（Ray：「看起來是整個一起在動」）。

   作法（業界 Live2D 的 ParamBreath 是「胸口最大、頭整塊跟著平移、腰以下不動」；我們沒有網格，用分段近似）：
     外框裡疊三份同一張圖（GPU 只解碼一次）：
       .sp-img/.tp-img  底圖 —— 不動（腿、腰）
       .br-torso        遮罩：腰線以下透明、往上漸變到不透明 → 上下平移 --br-t
       .br-head         遮罩：下巴以下透明、往上漸變到不透明 → 上下平移 --br-h（頭整塊，不縮放）
     眨眼補丁、髮梢擺動層跟著頭／軀幹一起平移（CSS 給 .sp-blink／.sw-* 同一組動畫）。
   · 只用 `translate` 屬性（與滑入／翻轉的 transform、髮梢的 rotate 各自疊加）＋ GPU 合成，不重繪。
   · 腰線、下巴的位置由**取景值**推（不必逐張量）：每頭身 ≈ (bot−top)/cm × 站姿身高/7。
     坐姿／近景照 cm／standCm 的定義自然對得上；推錯也只是交界往上下差一點（位移只有 1px 左右）。 */

const HEADS = 7;   // 頭身比（動漫成年女性約 7）

export function unbind(box){
  if(!box) return;
  box.querySelectorAll(':scope > .br-torso, :scope > .br-head').forEach(e=>e.remove());
  box.classList.remove('br-on');
}

/* box＝外框、img＝圖本體、fr＝這一張的取景值（top/bot/cm/standCm，原圖像素）。 */
export function bind(box, img, fr){
  if(!box || !img || !fr || !(fr.bot > fr.top) || !img.naturalHeight) { unbind(box); return; }
  const src = img.getAttribute('src');
  const NH = img.naturalHeight;
  const hh = (fr.bot - fr.top) / (fr.cm || 160) * ((fr.standCm || fr.cm || 160) / HEADS);   // 一頭身（像素）
  const chin  = fr.top + hh * 1.0;           // 下巴
  const waist = fr.top + hh * 2.3;           // 腰線（動漫立繪腿長，腰約在 2.2~2.3 頭身；蕾娜 front 實量 2.1）
  const P = y => Math.max(0, Math.min(100, y / NH * 100)).toFixed(2) + '%';
  // 遮罩：往上是不透明（黑），往下漸成透明。頭：下巴→鎖骨淡出；軀幹：胸口（1.5 頭身）全動 → 腰線不動
  const mHead  = 'linear-gradient(to bottom, #000 ' + P(chin) + ', transparent ' + P(chin + hh * 0.55) + ')';
  // ⚠ Ray（-1937）：「腹部以下擺幅要小，不然看起來整個人在飄浮」—— 只有胸口（1.3 頭身以上）全量動，
  //   到肚臍（1.9 頭身）就歸零；腰線以下一點都不動。
  const mTorso = 'linear-gradient(to bottom, #000 ' + P(fr.top + hh * 1.3) + ', transparent ' + P(Math.min(waist, fr.top + hh * 1.9)) + ')';
  const ref = img.nextSibling;
  // 有髮梢擺動時（modules/sway.js 把底圖遮罩記在 box.dataset.swaymask）：兩份副本也要挖掉擺動的那段頭髮，
  // 不然副本裡不動的頭髮會跟擺動層疊成殘影。兩層遮罩取交集。
  const sm = box.dataset.swaymask;
  const mk = (cls, mask) => {
    let e = box.querySelector(':scope > .' + cls);
    if(!e){ e = document.createElement('img'); e.className = cls; e.alt = ''; box.insertBefore(e, ref); }
    if(e.getAttribute('src') !== src) e.setAttribute('src', src);
    const m = sm ? mask + ', ' + sm : mask;
    e.style.maskImage = e.style.webkitMaskImage = m;
    e.style.maskSize = e.style.webkitMaskSize = '100% 100%';
    e.style.maskRepeat = e.style.webkitMaskRepeat = 'no-repeat';
    e.style.maskComposite = sm ? 'intersect' : '';
    e.style.webkitMaskComposite = sm ? 'source-in' : '';
    return e;
  };
  mk('br-torso', mTorso);
  mk('br-head', mHead);
  // 頭在軀幹之上（DOM 順序：底圖 → 軀幹 → 頭 → 髮梢／眨眼）
  const t = box.querySelector(':scope > .br-torso'), h = box.querySelector(':scope > .br-head');
  if(t.nextSibling !== h) box.insertBefore(h, t.nextSibling);
  box.classList.add('br-on');
}
