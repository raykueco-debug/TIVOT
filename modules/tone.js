/* ============================================================================
 *  modules/tone.js — 立繪與背景的融合（葉節點，不依賴任何模組）
 *  ---------------------------------------------------------------------------
 *  做一件事：量一張背景的平均亮度，換算成一個**小幅度**的濾鏡，套在立繪的容器上，
 *  讓人物不會像貼紙一樣浮在背景上（Ray：「人物立繪根據背景做小幅亮度調整，
 *  使人物與背景融合度高一點」）。
 *
 *  ⚠⚠ **幅度以前鎖在 ±12%，ver -631 放寬**（Ray：「人物色調要隨場景調整，
 *    安雅現在太亮」）。實測：北方泊地教堂（戰損）平均亮度 **0.152**，而安雅的
 *    立繪是 **0.573** —— 差 3.8 倍。舊公式在那裡只給 0.916（暗 8%），
 *    等於沒有調，她就是一張貼紙。
 *  ⚠ 係數搬進 `config.js` 的 `tuning.portraitTone`（鐵律 1）：這是**看出來**的數字，
 *    要能不動程式就調。形狀是「以 `ref` 為中性點的線性斜率＋上下夾」——
 *    中等亮度的場景幾乎不動（≈1.0），只有很暗／很亮的場景才明顯偏。
 *  ⚠ 套在**容器**上不是逐張立繪：容器的濾鏡與立繪自己的 dim/dark 會自然疊加，
 *    不必去合併字串，也不會互相覆蓋。
 *  ⚠ 取樣要縮到很小再讀（16×16）：整張 1024×1536 讀 getImageData 在手機上是
 *    幾十毫秒的同步阻塞，縮圖之後是零點幾毫秒，而平均值不受影響。
 *  ⚠ 同一張圖只算一次（快取）—— 背景會反覆切回來。
 * ========================================================================== */

import { GAME_CONFIG } from '../config.js';   // 係數是內容資料（鐵律 1），見檔頭

const _cache = new Map();   // src → { lum, filter }

/* 這張圖的平均亮度（0~1）。跨網域的圖會污染 canvas → 回 null，呼叫端當作「不調」。 */
function meanLuma(img){
  try{
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const x = c.getContext('2d', { willReadFrequently:true });
    x.drawImage(img, 0, 0, 16, 16);
    const d = x.getImageData(0, 0, 16, 16).data;
    let s = 0, n = 0;
    for(let i = 0; i < d.length; i += 4){
      if(d[i+3] < 8) continue;                       // 透明處不算（去背插圖）
      s += (0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]) / 255;
      n++;
    }
    return n ? s/n : null;
  }catch(e){ return null; }   // canvas 被污染（跨網域）就放棄，不要讓整段掛掉
}

/* 亮度 → 濾鏡字串。
   暗背景：稍微壓暗、稍微降飽和（人物退進場景裡）
   亮背景：稍微提亮
   ⚠ 係數是**看出來**的，不是算出來的 —— 融合度沒有客觀指標。改之前先想清楚
     你要的是「融合」還是「壓暗」，後者是別的機制。 */
function filterFor(lum){
  const T = (GAME_CONFIG.tuning && GAME_CONFIG.tuning.portraitTone) || {};
  const ref  = T.ref  != null ? T.ref  : 0.45;
  const gain = T.gain != null ? T.gain : 0.90;
  const lo   = T.min  != null ? T.min  : 0.78;
  const hi   = T.max  != null ? T.max  : 1.08;
  const sg   = T.satGain != null ? T.satGain : 0.35;
  const slo  = T.satMin  != null ? T.satMin  : 0.86;
  const shi  = T.satMax  != null ? T.satMax  : 1.05;
  const d = Math.max(0, Math.min(1, lum)) - ref;              // 比中性點暗多少（負）／亮多少（正）
  const k   = Math.max(lo,  Math.min(hi,  1 + d * gain));
  const sat = Math.max(slo, Math.min(shi, 1 + d * sg));
  return `brightness(${k.toFixed(3)}) saturate(${sat.toFixed(3)})`;
}

/* 把某張背景的色調套到某個立繪容器上。
     bgEl   背景的 <img>（尚未載好就等 onload，不阻塞）
     castEl 立繪的容器（濾鏡套在它身上，見檔頭）
   背景不存在／量不到就把濾鏡清掉，維持原色。 */
export function matchPortraits(bgEl, castEl){
  if(!castEl) return;
  const src = bgEl && bgEl.getAttribute && bgEl.getAttribute('src');
  /* ⚠ 判「看不看得見」用**實際尺寸**，不要用 `.on` class：劇情的背景靠 .on 控制顯示，
     但戰鬥的敵人底圖沒有那個 class（第一版這樣寫，戰鬥裡整段不生效）。 */
  if(!bgEl || !src || !(bgEl.offsetWidth > 0)){ castEl.style.filter = ''; return; }
  const hit = _cache.get(src);
  if(hit){ castEl.style.filter = hit.filter; return; }
  const apply = () => {
    const lum = meanLuma(bgEl);
    if(lum == null){ castEl.style.filter = ''; return; }
    const f = filterFor(lum);
    _cache.set(src, { lum, filter:f });
    castEl.style.filter = f;
  };
  if(bgEl.complete && bgEl.naturalWidth) apply();
  else bgEl.addEventListener('load', apply, { once:true });
}
