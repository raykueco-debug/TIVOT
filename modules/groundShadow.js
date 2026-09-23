/* ============================================================================
 *  modules/groundShadow.js — 怪腳下的接地陰影（ver -1702）
 *  ---------------------------------------------------------------------------
 *  Ray：「讓怪跟背景間加入適當陰影，所有怪都要，效果不用太麻煩，有陰影、自然、
 *        省效能就好」
 *
 *  作法：一個**靜態**的放射漸層橢圓（CSS `.ground-shadow`），擺在立繪**腳底**。
 *  · 腳底在哪是**量出來的**：立繪縮到 32×48 讀 alpha，取內容的下緣與最下面那一段
 *    的左右寬 —— 每張圖只量一次（鑰匙＝src）。
 *  · 再照 `object-fit`／`object-position` 換算成畫面座標（同 enemy 的身體遮罩那一套）。
 *  · ⚠ 省效能：不用 `filter:drop-shadow`（每一格重算、而且會被受擊動畫的 `filter`
 *    整條蓋掉），也不逐幀跟著抖 —— 影子在地上，怪被打得晃一下影子本來就不動。
 *  · ⚠ 沒有 alpha 的圖（整張畫好的 jpg、自帶背景的插畫）量不出腳 ⇒ 不畫。
 *  · ⚠ 葉節點：不 import 任何遊戲模組（enemy／story 都用它，不能成環）。
 * ========================================================================== */
const W = 32, H = 48;
const cache = new Map();          // src → {bot, l, r} | null（0~1，圖內比例）

function measure(img){
  const src = img.currentSrc || img.src || '';
  if(!src) return null;
  if(cache.has(src)) return cache.get(src);
  if(!img.complete || !img.naturalWidth) return undefined;     // 還沒載完：下次再量
  let out = null;
  try{
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently:true });
    g.drawImage(img, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    const A = (x,y)=>d[(y*W+x)*4+3];
    let clear = 0, bot = -1;
    for(let y=0; y<H; y++) for(let x=0; x<W; x++){
      const a = A(x,y);
      if(a < 40) clear++;
      else if(a > 120 && y > bot) bot = y;
    }
    if(clear > W*H*0.08 && bot >= 0){
      /* 腳的寬度：最下面那一段（內容下緣往上 12%）的左右界 */
      const y0 = Math.max(0, bot - Math.round(H*0.12));
      let l = W, r = -1;
      for(let y=y0; y<=bot; y++) for(let x=0; x<W; x++){
        if(A(x,y) > 120){ if(x<l) l=x; if(x>r) r=x; }
      }
      if(r >= l) out = { bot:(bot+1)/H, l:l/W, r:(r+1)/W };
    }
  }catch(_){ out = null; }       // 跨網域污染 → 放棄
  cache.set(src, out);
  return out;
}

/* 圖內比例 → 元素內座標（照 object-fit／object-position）。 */
function mapFit(img, box){
  const cs = getComputedStyle(img);
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const fit = cs.objectFit;
  const s = fit==='cover' ? Math.max(box.w/iw, box.h/ih)
          : fit==='contain' ? Math.min(box.w/iw, box.h/ih) : null;
  const dw = s ? iw*s : box.w, dh = s ? ih*s : box.h;
  const pos = (cs.objectPosition||'50% 50%').split(/\s+/);
  const frac = (v, free)=>{ if(!v) return .5;
    if(v.endsWith('%')) return parseFloat(v)/100;
    const px = parseFloat(v); return free ? px/free : 0; };
  const ox = (box.w-dw)*frac(pos[0], box.w-dw), oy = (box.h-dh)*frac(pos[1], box.h-dh);
  return (u,v)=>[ box.x + ox + u*dw, box.y + oy + v*dh ];
}

/* 擺影子。`xf` ＝這個元素身上的**靜態** transform（`{k, ty}`：以底邊中點為原點的
   縮放、以元素高為單位的下移）—— 量的是未變形的版面（offset*），變形自己套。
   回 true＝擺好了。 */
export function place(img, shadow, xf){
  if(!img || !shadow) return false;
  const m = measure(img);
  if(m === undefined){ img.addEventListener('load', ()=>place(img, shadow, xf), { once:true }); return false; }
  if(!m){ shadow.classList.remove('on'); return false; }
  const box = { x:img.offsetLeft, y:img.offsetTop, w:img.offsetWidth, h:img.offsetHeight };
  if(!box.w || !box.h){ shadow.classList.remove('on'); return false; }
  const at = mapFit(img, box);
  let [xl, yb] = at(m.l, m.bot), [xr] = at(m.r, m.bot);
  if(xf && (xf.k||xf.ty)){
    const k = xf.k||1, cx = box.x + box.w/2, by = box.y + box.h;
    xl = cx + (xl-cx)*k; xr = cx + (xr-cx)*k;
    yb = by + (yb-by)*k + (xf.ty||0)*box.h;
  }
  const w = Math.max(40, (xr - xl) * 1.15), h = w * 0.2;
  shadow.style.left   = ((xl + xr)/2 - w/2) + 'px';
  shadow.style.top    = (yb - h*0.62) + 'px';
  shadow.style.width  = w + 'px';
  shadow.style.height = h + 'px';
  shadow.classList.add('on');
  return true;
}
export function hide(shadow){ if(shadow) shadow.classList.remove('on'); }
