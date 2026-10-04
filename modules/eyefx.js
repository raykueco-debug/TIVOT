/* ══ 立繪眼部特效（Ray 2026-10-03：「瞳孔顫動／淚眼汪汪」，在立繪模式裡設定）—— 唯一的實作（鐵律 8）══
   目前：tremble（瞳孔顫動）。劇情頁與戰鬥對白共用，跟眨眼同一個綁定時機。

   外框裡疊一個容器 .ef-tr（位置＝原圖百分比，mask-image＝眼睛開口）：
     .ef-fill  虹膜挖掉、補上眼白的底（不動）
     .ef-iris  虹膜＋瞳孔＋高光 —— CSS steps 動畫做 ±0.6px 的隨機抖動
   開口遮罩把抖動裁在眼眶內；睫毛線在原圖上、不在開口裡，所以一直蓋在上面。
   眨眼補丁排在容器之後（最上層）：閉眼時直接蓋掉。
   · 素材表 script/eyefx.js（tools/eye_fx.py 產生）。
   ⚠⚠ **開不開＝那一拍的 `eyes`**（ver -1959，Ray：「半眨、瞳顫、淚眼這些以及未來可能加入的特效
     都是單獨標記在『該拍』，不是將『該表情』全域改成特效」）—— speakers.js 的 `eyeFx` 已退役。
     解讀只有 `eyesOf()` 一支（劇情頁與戰鬥對白共用）。 */
import { EYEFX } from '../script/eyefx.js';
import { assetVer } from '../config.js';

const DIR = 'resources/si/eyefx/';
const keyOf = src => String(src||'').split('/').pop().split('?')[0].replace(/\.[^.]+$/,'').toLowerCase();
const url = p => p + assetVer(p);
const pct = (v, n) => (v / n * 100) + '%';

/* ══ 這一拍的眼睛標記（ver -1959）══
   腳本那一拍寫 `eyes:'half'` 或 `eyes:['half','tear']`，套在那一拍的說話者（或 portrait.char）身上；
   下一拍沒寫就回到平常。可用的值：
     half     半眨（平時停半閉、只眨到全閉，modules/blink.js 的 rest:'h'）
     tremble      瞳孔顫動（快）
     trembleslow  瞳孔顫動（慢）—— 同一套素材，CSS 拉長週期（style.css 的 .ef-tr.slow）
     tear         淚眼汪汪
   ⚠ 瞳顫與淚眼是同一個位置的疊層，同時寫只取第一個。日後新增特效：加進 MARKS、在這裡解讀。 */
export const MARKS = ['half', 'tremble', 'trembleslow', 'tear'];
const FX = ['tremble', 'trembleslow', 'tear'];
export function eyesOf(v){
  const a = (Array.isArray(v) ? v : (v ? [v] : [])).filter(x => MARKS.includes(x));
  return { half: a.includes('half'), fx: a.find(x => FX.includes(x)) || 'none', list: a };
}

export function has(src, mode){
  const d=EYEFX[keyOf(src)]; if(!d) return false;
  return (mode==='tremble' || mode==='trembleslow') ? !!d.tr : mode==='tear' ? !!d.te : false;
}

export function unbind(box){
  if(!box) return;
  box.querySelectorAll(':scope > .ef-tr, :scope > .ef-te').forEach(e=>e.remove());
}

/* 淚眼汪汪（tear，ver -1948，Ray：「不是畫水線，讓虹膜有白光閃動就好」）：.ef-te 容器裡三張光點
   .ef-g0／g1／g2（都只在虹膜裡），各用不同節奏與相位閃。動畫在 style.css。 */
/* ══ 淚眼 v2（ver -1973，Ray：「淚眼效果很不明顯，細長橫橢圓的白光一大一小，可超出虹膜不可超出眼框，左右擺動」）══
   表上有 `tg`（每隻眼 [虹膜中心 x, y, 眼框半寬, 眼框半高]，框內像素）就走這一條：
   · 容器用 `<鑰匙>_te_mask.webp`（眼睛開口）當 mask ⇒ 光可以越過虹膜，但出不了眼框
   · 每隻眼兩顆**橫的細長橢圓**白光：大的在虹膜上半、小的在右下；擺動在 CSS（`.ef-tl`）
   · 位置大小一律換成容器的百分比 —— 立繪縮放時跟著走
   沒有 `tg` 的（還沒用新版 tools/eye_fx.py 重跑的）退回下面的 v1 三張光點。 */
/* [相對虹膜中心的 x（眼框半寬倍數）, 高度（在遮罩上下緣之間的比例）, 寬（虹膜寬的倍數）, class]
   ⚠ ver -1984（Ray：「大小就用虹膜等寬，壓成 1:2 的橢圓，做變形的輪播」）：大光寬＝虹膜寬、高＝寬的一半；
     小光是大光的一半，一樣 1:2。舊表沒有虹膜寬（第 7 格）時，用眼框寬的 0.6 倍頂。 */
/* ⚠ ver -1986（Ray：「太偏下眼框都超出眼睛了，小一點」）：大光 1.0→0.8 虹膜寬、高度 0.38→0.30；小光仍是大光的一半、
     高度 0.72→0.58。另加一道夾（EDGE_PAD）：「不要碰觸到任何眼框」—— 上下都夾，不靠比例碰運氣。 */
const TL = [
  [-0.05, 0.30, 0.8, 'big'],
  [ 0.28, 0.58, 0.4, 'small'],
];
const EDGE_PAD = 0.15;  // 光與遮罩上下緣的留白＝遮罩高 × EDGE_PAD（至少 1px）
function bindTearV2(box, img, key, d){
  const W = img.naturalWidth, H = img.naturalHeight, r = d.te;
  const c = document.createElement('div'); c.className = 'ef-te v2';
  c.dataset.key = key; c.dataset.mode = 'tear';
  c.style.left = pct(r[0], W); c.style.top = pct(r[1], H);
  c.style.width = pct(r[2], W); c.style.height = pct(r[3], H);
  const m = 'url("' + url(DIR + key + '_te_mask.webp') + '")';
  c.style.maskImage = c.style.webkitMaskImage = m;
  /* 傾斜：與兩眼下眼線最低點的連線平行（表上的 `ta`，度；CSS 的 `--ta` 給擺動那組 keyframes 用）。 */
  c.style.setProperty('--ta', (d.ta || 0) + 'deg');
  /* ══ ver -1987：表上有 `tl` 就照它擺（Ray：「一大一小、一橢一圓，以不論怎麼形變都不出框為原則」）══
     每隻眼 [[cx,cy,w,h], …]（框內像素、連續座標）；第一顆＝大的橢圓、第二顆＝小的正圓。
     ⚠ 塞不塞得進眼框（含 efWob 形變與 ta 旋轉）**只在 tools/eye_fx.py 的 fit_lights 算**（鐵律 7）——
       這裡不再縮、不再夾，照抄。改 efWob 的幅度要回去改那邊的 TL_WOB。 */
  if(d.tl){
    d.tl.forEach(eye => eye.forEach(([x, y, w, h, ang], j) => {
      const e = document.createElement('i'); e.className = 'ef-tl ' + (j ? 'small' : 'big');
      /* 第 5 格＝這一顆自己的角度（ver -1997：沿眼頭眼尾線）；沒有就沿用容器的 --ta。 */
      if(ang != null) e.style.setProperty('--ta', ang + 'deg');
      e.style.left = pct(x - w / 2, r[2]); e.style.top = pct(y - h / 2, r[3]);
      e.style.width = pct(w, r[2]); e.style.height = pct(h, r[3]);
      c.appendChild(e);
    }));
    box.insertBefore(c, box.querySelector(':scope > .sp-blink'));
    syncBreath(box, c);
    return;
  }
  d.tg.forEach(([cx, cy, ex, ey, mt, mb, iw], i) => {
    const irisW = iw || ex * 1.2;
    for(const [ox, fy, w, cls] of TL){
      /* 高度＝**遮罩在虹膜那一欄的上下緣之間**（ver -1980，Ray：「為什麼會有虹膜圖層比淚光更上層」）——
         以前用「虹膜中心往上 0.3 個眼框高」，而遮罩常常沒蓋到虹膜上緣，光就被橫切成一半。
         舊表沒有 mt/mb 時退回舊算法。 */
      const oy = (mt != null && mb != null) ? ((mt + (mb - mt) * fy) - cy) / ey : (fy < 0.5 ? -0.30 : 0.36);
      const e = document.createElement('i'); e.className = 'ef-tl ' + cls + (i % 2 ? ' alt' : '');
      let gw = w * irisW, gh = gw / 2;   // 1:2 的橢圓
      /* ⚠ ver -1986（Ray：「不要碰觸到任何眼框」）：光整顆要在開口裡、上下各留 EDGE_PAD ——
         塞不下就等比縮（1:2 不變），位置再夾進 [上緣＋留白, 下緣−留白]。 */
      const pad = (mt != null && mb != null) ? Math.max(1, (mb - mt) * EDGE_PAD) : 0;
      if(mt != null && mb != null){
        const room = (mb - mt) - 2 * pad;
        if(gh > room){ gh = Math.max(0.5, room); gw = gh * 2; }
      }
      /* ⚠ -1983 的「高度不超過可用高度 45%」拿掉：那會改掉 1:2。離眼框的距離改由遮罩負責（近鏡頭那隻眼內縮一圈）。 */
      /* 相對虹膜的位移也跟著傾斜轉（光本身在 CSS 轉，排列在這裡轉）。 */
      const t = (d.ta || 0) * Math.PI / 180, dx = ox * ex, dy = oy * ey;
      const px = cx + dx * Math.cos(t) - dy * Math.sin(t);
      let py = cy + dx * Math.sin(t) + dy * Math.cos(t);
      if(mt != null && mb != null) py = Math.min(Math.max(py, mt + pad + gh / 2), mb - pad - gh / 2);
      e.style.left = pct(px - gw / 2, r[2]); e.style.top = pct(py - gh / 2, r[3]);
      e.style.width = pct(gw, r[2]); e.style.height = pct(gh, r[3]);
      c.appendChild(e);
    }
  });
  box.insertBefore(c, box.querySelector(':scope > .sp-blink'));
  syncBreath(box, c);
}
/* ══ 呼吸對齊（ver -1983，Ray：「人物有呼吸律動，淚光沒跟上」）══
   淚光容器跟頭部同一段 `brHead`，但 CSS 動畫從**元素出現那一刻**才起算 —— 頭部那一層早就在跑，
   淚光是這一拍才掛上去的 ⇒ 永遠差一截相位。掛上去之後把它的動畫時間對齊到頭部那一層。 */
function syncBreath(box, el){
  requestAnimationFrame(() => {
    try{
      const head = box.querySelector(':scope > .br-head') || box.querySelector(':scope > .sp-blink');
      const ha = head && head.getAnimations ? head.getAnimations().find(a => a.animationName === 'brHead') : null;
      const ea = el.getAnimations ? el.getAnimations().find(a => a.animationName === 'brHead') : null;
      if(ha && ea && ha.currentTime != null) ea.currentTime = ha.currentTime;
    }catch(_){}
  });
}
function bindTear(box, img, key, d){
  if(d.tg && d.tg.length){ bindTearV2(box, img, key, d); return; }
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
  if(!(mode==='tremble' || mode==='trembleslow') || !d || !d.tr || !img.naturalWidth) return;
  const W = img.naturalWidth, H = img.naturalHeight, r = d.tr;
  const c = document.createElement('div'); c.className = 'ef-tr' + (mode==='trembleslow' ? ' slow' : '');
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
