/* ══ 立繪眼部特效（Ray 2026-10-03：「瞳孔顫動／淚眼汪汪」，在立繪模式裡設定）—— 唯一的實作（鐵律 8）══
   目前：tremble（瞳孔顫動）。劇情頁與戰鬥對白共用，跟眨眼同一個綁定時機。

   外框裡疊一個容器 .ef-tr（位置＝原圖百分比，mask-image＝眼睛開口）：
     .ef-fill  虹膜挖掉、補上眼白的底（不動）
     .ef-iris  虹膜＋瞳孔＋高光 —— CSS steps 動畫做 ±0.6px 的隨機抖動
   開口遮罩把抖動裁在眼眶內；睫毛線在原圖上、不在開口裡，所以一直蓋在上面。
   眨眼補丁排在容器之後（最上層）：閉眼時直接蓋掉。
   · 開不開＝speakers.js 那一張立繪的 `eyeFx`（'tremble'／沒寫＝不做）；素材表 script/eyefx.js（tools/eye_fx.py 產生）。 */
import { EYEFX } from '../script/eyefx.js';
import { assetVer } from '../config.js';

const DIR = 'resources/si/eyefx/';
const keyOf = src => String(src||'').split('/').pop().split('?')[0].replace(/\.[^.]+$/,'').toLowerCase();
const url = p => p + assetVer(p);
const pct = (v, n) => (v / n * 100) + '%';

export function has(src, mode){
  const d=EYEFX[keyOf(src)]; if(!d) return false;
  return mode==='tremble' ? !!d.tr : mode==='tear' ? !!d.te : false;
}

export function unbind(box){
  if(!box) return;
  box.querySelectorAll(':scope > .ef-tr, :scope > .ef-te').forEach(e=>e.remove());
}

/* 淚眼汪汪（tear，ver -1948，Ray：「不是畫水線，讓虹膜有白光閃動就好」）：.ef-te 容器裡三張光點
   .ef-g0／g1／g2（都只在虹膜裡），各用不同節奏與相位閃。動畫在 style.css。 */
function bindTear(box, img, key, d){
  const W = img.naturalWidth, H = img.naturalHeight, r = d.te;
  const c = document.createElement('div'); c.className = 'ef-te';
  c.dataset.key = key; c.dataset.mode = 'tear';
  c.style.left = pct(r[0], W); c.style.top = pct(r[1], H);
  c.style.width = pct(r[2], W); c.style.height = pct(r[3], H);
  for(const [cls, suf] of [['ef-g0','g0'], ['ef-g1','g1'], ['ef-g2','g2']]){
    const e = document.createElement('img'); e.className = cls; e.alt = '';
    e.src = url(DIR + key + '_te_' + suf + '.webp');
    c.appendChild(e);
  }
  box.insertBefore(c, box.querySelector(':scope > .sp-blink'));
}

export function bind(box, img, mode){
  if(!box || !img) return;
  const key = keyOf(img.getAttribute('src')), d = EYEFX[key];
  const cur = box.querySelector(':scope > .ef-tr, :scope > .ef-te');
  if(cur && cur.dataset.key===key && cur.dataset.mode===mode) return;
  unbind(box);
  if(mode==='tear' && d && d.te && img.naturalWidth){ bindTear(box, img, key, d); return; }
  if(mode!=='tremble' || !d || !d.tr || !img.naturalWidth) return;
  const W = img.naturalWidth, H = img.naturalHeight, r = d.tr;
  const c = document.createElement('div'); c.className = 'ef-tr';
  c.dataset.key = key; c.dataset.mode = mode;
  c.style.left = pct(r[0], W); c.style.top = pct(r[1], H);
  c.style.width = pct(r[2], W); c.style.height = pct(r[3], H);
  const m = 'url("' + url(DIR + key + '_tr_mask.webp') + '")';
  c.style.maskImage = c.style.webkitMaskImage = m;
  for(const [cls, suf] of [['ef-fill','fill'], ['ef-iris','iris']]){
    const e = document.createElement('img'); e.className = cls; e.alt = '';
    e.src = url(DIR + key + '_tr_' + suf + '.webp');
    c.appendChild(e);
  }
  // 眨眼補丁要在最上面：插在第一個 .sp-blink 前
  box.insertBefore(c, box.querySelector(':scope > .sp-blink'));
}
