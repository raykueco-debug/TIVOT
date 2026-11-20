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
    let clear = 0, bot = -1, L = W, R = -1;
    for(let y=0; y<H; y++) for(let x=0; x<W; x++){
      const a = A(x,y);
      if(a < 40) clear++;
      else if(a > 120){ if(y > bot) bot = y; if(x<L) L=x; if(x>R) R=x; }
    }
    if(clear > W*H*0.08 && bot >= 0){
      /* 腳的寬度：最下面那一段（內容下緣往上 12%）的左右界 */
      const y0 = Math.max(0, bot - Math.round(H*0.12));
      let l = W, r = -1;
      for(let y=y0; y<=bot; y++) for(let x=0; x<W; x++){
        if(A(x,y) > 120){ if(x<l) l=x; if(x>r) r=x; }
      }
      if(r >= l) out = { bot:(bot+1)/H, l:l/W, r:(r+1)/W, L:L/W, R:(R+1)/W };
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
   `opt.groundV` ＝**指定著地的那一條橫線**（圖內比例）：趴著的圖最下緣是爪子或尾巴，
   真正貼地的是身體（墓主倒地＝胸骨，ver -1703）。給了就用它當腳底、寬度取整隻的八成。
   回 true＝擺好了。 */
export function place(img, shadow, xf, opt){
  if(!img || !shadow) return false;
  const m0 = measure(img);
  if(m0 === undefined){ img.addEventListener('load', ()=>place(img, shadow, xf, opt), { once:true }); return false; }
  const gv = opt && +opt.groundV;
  const m = (m0 && gv>0) ? { bot:gv, l:m0.L+(m0.R-m0.L)*0.1, r:m0.R-(m0.R-m0.L)*0.1 } : m0;
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
/* 雙腳量測（ver -2839，Ray：「後腳也要踩在影子上否則看起來浮在空中」「影子要鎖雙腳」）：
   只看**膚色**的像素（深膚：R 高、B/R 約 0.33~0.6、G/R 約 0.5~0.78）—— 金鈴、流蘇的 B 幾乎是 0，白裙沒有彩度，都不會被當成腳。
   最低的膚色點＝前腳底；離它水平夠遠（≥ 圖寬 12%）的最低膚色點＝後腳底。每張圖只量一次。 */
const FW = 64, FH = 96;
const feetCache = new Map();
function measureFeet(img){
  const src = img.currentSrc || img.src || '';
  if(!src) return null;
  if(feetCache.has(src)) return feetCache.get(src);
  if(!img.complete || !img.naturalWidth) return undefined;
  let out = null;
  try{
    const c = document.createElement('canvas'); c.width = FW; c.height = FH;
    const g = c.getContext('2d', { willReadFrequently:true });
    g.drawImage(img, 0, 0, FW, FH);
    const d = g.getImageData(0, 0, FW, FH).data;
    const skin = [];
    for(let y=0; y<FH; y++) for(let x=0; x<FW; x++){
      const k=(y*FW+x)*4, r=d[k], gg=d[k+1], b=d[k+2], a=d[k+3];
      if(a<160 || r<110) continue;
      const br=b/r, gr=gg/r;
      if(br>0.3 && br<0.62 && gr>0.48 && gr<0.8) skin.push([x,y]);
    }
    if(skin.length){
      let f = skin[0]; for(const p of skin) if(p[1]>f[1]) f=p;
      let bk = null; for(const p of skin) if(Math.abs(p[0]-f[0])>=FW*0.12 && (!bk || p[1]>bk[1])) bk=p;
      const fy=(f[1]+1)/FH, fx=(f[0]+0.5)/FW;
      /* 腳掌寬：前腳底往上 6% 那一段的膚色左右界 */
      let l=FW, r=-1; for(const p of skin) if(p[1]>=f[1]-FH*0.06 && Math.abs(p[0]-f[0])<FW*0.12){ if(p[0]<l) l=p[0]; if(p[0]>r) r=p[0]; }
      const fw=Math.max(2,(r-l+1))/FW;
      out = { fx, fy, fw, bx: bk ? (bk[0]+0.5)/FW : null, by: bk ? (bk[1]+1)/FH : null };
      if(bk && out.by < fy - 0.25) { out.bx=null; out.by=null; }   // 後腳離地太高（抬腳）＝不算踩地
    }
  }catch(_){ out = null; }
  feetCache.set(src, out);
  return out;
}

/* 跟著動畫格擺（ver -2837／-2839）：動畫格是 object-fit:fill 的 <img>，可能帶 transform（撲近放大）——
   直接用**畫面上的外框**（getBoundingClientRect，含 transform）換算到宿主（#top）座標。
   影子＝一顆旋轉的橢圓，**長軸連起前後兩腳**（兩隻腳都踩在上面），寬度＝兩腳距離＋一個腳掌；只有一隻腳著地時退回單腳。
   `opt.vary`＝跟第一格比，腳掌那一段的大小只准變 ±多少（「一點大小變化」）。回傳影子長度（擺好了）。 */
export function placeOnFrame(img, shadow, host, opt){
  if(!img || !shadow || !host) return false;
  const m = measureFeet(img);
  if(!m) return false;
  const r = img.getBoundingClientRect(), hr = host.getBoundingClientRect();
  if(!r.width || !r.height) return false;
  const P = (u,v)=>[ r.left - hr.left + u*r.width, r.top - hr.top + v*r.height ];
  const [x1,y1] = P(m.fx, m.fy);
  const [x2,y2] = m.bx!=null ? P(m.bx, m.by) : [x1,y1];
  let foot = Math.max(24, m.fw*r.width) * 1.6;
  const base = opt && opt.base, vary = (opt && opt.vary!=null) ? opt.vary : 0.15;
  if(base) foot = Math.min(base*(1+vary), Math.max(base*(1-vary), foot));
  const dist = Math.hypot(x2-x1, y2-y1), ang = Math.atan2(y2-y1, x2-x1)*180/Math.PI;
  const w = dist + foot, h = foot * 0.42;
  const cx = (x1+x2)/2, cy = (y1+y2)/2;
  shadow.style.left   = (cx - w/2) + 'px';
  shadow.style.top    = (cy - h/2) + 'px';
  shadow.style.width  = w + 'px';
  shadow.style.height = h + 'px';
  shadow.style.transform = 'rotate(' + (((ang+90)%180+180)%180-90).toFixed(1) + 'deg)';
  shadow.classList.add('on');
  return foot;
}
/* 程式投影（ver -2840，Ray：「用程式投影做得出來嗎 跟原圖連著的黑影」）：
   拿畫面上那一格動畫的剪影（同一張圖、塗黑），以**前腳底那一條線**為原點壓扁＋斜推，倒在地上 —— 腳底接著原圖。
   `castEl` 是一張 <img>（CSS `.enemy-cast`：塗黑、半透明、柔邊、往上漸淡），這裡只負責 src、外框與變形。
   ⚠ 外框用 getBoundingClientRect（含撲近的放大），所以投影跟著位移與縮放走。回 true＝擺好了。 */
export function castOnFrame(img, castEl, host, opt){
  if(!img || !castEl || !host) return false;
  const f = measureFeet(img), m = measure(img);
  if(f===undefined || m===undefined) return false;
  const fy = f ? f.fy : (m ? m.bot : 1);
  const r = img.getBoundingClientRect(), hr = host.getBoundingClientRect();
  if(!r.width || !r.height) return false;
  const src = img.getAttribute('src');
  if(castEl.getAttribute('src')!==src) castEl.setAttribute('src', src);
  /* 非 fill 的立繪（#enemyImg 的 contain／cover）：照抄 object-fit／position，腳底那條線換算成元素內的比例 */
  const cs = getComputedStyle(img);
  castEl.style.objectFit = cs.objectFit; castEl.style.objectPosition = cs.objectPosition;
  let oy = fy;
  if(cs.objectFit && cs.objectFit!=='fill'){
    const box = { x:0, y:0, w:img.offsetWidth, h:img.offsetHeight };
    if(box.w && box.h){ oy = mapFit(img, box)(0.5, fy)[1] / box.h; }
  }
  castEl.style.opacity = String(0.42 * Math.min(1, +cs.opacity || 0));
  castEl.style.left = (r.left - hr.left) + 'px'; castEl.style.top = (r.top - hr.top) + 'px';
  castEl.style.width = r.width + 'px'; castEl.style.height = r.height + 'px';
  const sy = (opt && opt.squash) || 0.3, sk = (opt && opt.skew!=null) ? opt.skew : -38;
  castEl.style.transformOrigin = '50% ' + (oy*100).toFixed(2) + '%';
  castEl.style.transform = 'skewX(' + sk + 'deg) scaleY(' + sy + ')';
  castEl.style.setProperty('--cast-foot', (oy*100).toFixed(2) + '%');
  castEl.classList.add('on');
  return true;
}
export function hide(shadow){ if(shadow) shadow.classList.remove('on'); }
