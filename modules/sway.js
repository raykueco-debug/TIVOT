/* ══ 立繪髮梢擺動（路線 B 試做，Ray 2026-10-03）—— 唯一的實作（鐵律 8）══════════════════
   劇情頁與戰鬥對白都叫這一支（同 modules/blink.js 的掛法：綁在「新圖畫上去那一刻」、換圖／下台解除）。

   外框裡的疊法（由下而上）：
     .sp-img／.tp-img  底圖 —— 掛 mask-image（<鑰匙>_mask.webp）把「擺動層完全不透明的那一塊」挖掉
     .sw-under        墊底層：頭髮原本蓋住的地方（背景透明、斗篷由周圍顏色補）—— 頭髮擺開時露出來的就是它
     .sw-layer        擺動層：切口以下那一段頭髮，以髮根（p）為軸 rotate ±a 度、週期 d 秒
     .sp-blink        眨眼補丁（眼睛永遠在最上面）
   · 只有 CSS rotate 動畫（GPU 合成）；10 秒沒操作照 perf-idle 暫停（同呼吸）。
   · 資料：script/sway.js（機器產生，tools/hair_sway.py）。表上沒有這張圖＝不擺。 */
import { SWAY } from '../script/sway.js';
import { assetVer } from '../config.js';

const DIR = 'resources/si/sway/';
const keyOf = src => String(src||'').split('/').pop().split('?')[0].replace(/\.[^.]+$/,'').toLowerCase();
const url = p => p + assetVer(p);
const pct = (v, n) => (v / n * 100) + '%';

export function unbind(box){
  if(!box) return;
  box.querySelectorAll(':scope > .sw-under, :scope > .sw-layer').forEach(e=>e.remove());
  const im = box.querySelector(':scope > .sp-img, :scope > .tp-img');
  if(im){ im.style.maskImage = im.style.webkitMaskImage = ''; }
  delete box.dataset.sway;
}

export function bind(box, img){
  if(!box || !img) return;
  const key = keyOf(img.getAttribute('src')), d = SWAY[key];
  if(box.dataset.sway === key) return;
  unbind(box);
  if(!d) return;
  const W = d.w, H = d.h;
  box.dataset.sway = key;
  // 底圖挖洞（整張圖大小的遮罩）
  const m = 'url("' + url(DIR + key + '_mask.webp') + '")';
  img.style.maskImage = img.style.webkitMaskImage = m;
  img.style.maskSize = img.style.webkitMaskSize = '100% 100%';
  img.style.maskRepeat = img.style.webkitMaskRepeat = 'no-repeat';
  const ref = box.querySelector(':scope > .sp-blink');     // 眨眼補丁要留在最上面
  const put = (cls, src, r) => {
    const e = document.createElement('img'); e.className = cls; e.alt = '';
    e.style.left = pct(r[0], W); e.style.top = pct(r[1], H);
    e.style.width = pct(r[2], W); e.style.height = pct(r[3], H);
    e.src = url(src);
    box.insertBefore(e, ref);
    return e;
  };
  put('sw-under', DIR + key + '_under.webp', d.under);
  d.layers.forEach((L, i) => {
    const e = put('sw-layer', DIR + key + '_l' + i + '.webp', L.r);
    e.style.transformOrigin = pct(L.p[0] - L.r[0], L.r[2]) + ' ' + pct(L.p[1] - L.r[1], L.r[3]);
    e.style.setProperty('--sw-a', L.a + 'deg');
    e.style.animationDuration = L.d + 's';
    e.style.animationDelay = (-Math.random() * L.d).toFixed(2) + 's';
  });
}
