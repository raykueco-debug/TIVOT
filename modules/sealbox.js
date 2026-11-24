/* ══ 封印盒開盒演出（ver -2980，Ray 11-24：「sealbox_open2_A_AB_cut，然後讓程式從盒內發金光」）══
   影格：`config.relicBox.openAnim` 那個資料夾（frame_NN.webp ＋ anim.json，透明 RGBA，TO_CODE 第三十二支）。
   動畫本身不發光（Ray：「開盒動畫不要發光，光要用程式跑」）—— 金光在這裡畫：
     anim.json 的 `glow_from_frame`（盒蓋開縫那一格）起，從 `glow_origin`（盒口中心）往上透出金白光，
     隨盒蓋打開變強；播完停在最後一格，光持續、微微呼吸。
   ⚠ 葉模組：只讀 config，不 import 劇情／城鎮（鐵律 2 的依賴方向）。呼叫端只有 town.relicReveal。
   ⚠ 一層全螢幕暗幕（z 9590，在 #lootSheet 9600 之下）：獎品視窗疊上來時，開好的盒子與金光留在後面當底；
     收尾由呼叫端在獎品收掉之後 `close()`。換畫面時 `closeAll()`（誰收它？—— 見 §6.5.4 的暗罩檢查表）。 */
import { GAME_CONFIG } from '../config.js';

let cache = null;            // { dir, meta, imgs:[Image] }
let live = null;             // 目前開著的那一層（只會有一層）

function dirOf(){ const d = (GAME_CONFIG.relicBox||{}).openAnim; return d ? (d.endsWith('/') ? d : d+'/') : null; }

/* 先抓影格（公會的聖遺物單子一打開就叫，鐵律 13：用到它的那個畫面自己載）。 */
export function warm(){
  const dir = dirOf(); if(!dir) return Promise.resolve(null);
  if(cache && cache.dir===dir) return cache.ready;
  const c = { dir, meta:null, imgs:[] };
  c.ready = fetch(dir+'anim.json').then(r=>r.ok?r.json():null).then(meta=>{
    if(!meta || !(meta.frames>0)) return null;
    c.meta = meta;
    const pad = n => String(n).padStart(2,'0');
    return Promise.all(Array.from({length:meta.frames}, (_,i)=>new Promise(res=>{
      const im = new Image(); im.decoding='async';
      im.onload = ()=>res(im); im.onerror = ()=>res(null);
      im.src = dir+'frame_'+pad(i)+'.webp';
      c.imgs[i] = im;
    }))).then(list=> list.every(Boolean) ? c : null);
  }).catch(()=>null);
  cache = c;
  return c.ready;
}

/* 播一次。`done()` 在動畫播完（或點一下跳到尾）之後叫 —— 那時盒子已經開了、光還亮著。
   回傳 `{ close }`：呼叫端在下一段（獎品視窗）收掉之後收這一層。影格載不到就直接叫 done（等於沒有演出）。 */
export function play(done){
  closeAll();
  const fin = (()=>{ let called=false; return ()=>{ if(called) return; called=true; try{ done && done(); }catch(_){} }; })();
  const handle = { close: ()=>{ if(live===h) closeAll(); } };
  const h = { el:null, raf:0, t:0 };
  live = h;
  warm().then(c=>{
    if(live!==h) return;
    if(!c){ fin(); return; }
    const M = c.meta, [CW, CH] = M.canvas || [720,480];
    const el = document.createElement('div');
    el.id = 'sealboxFx';
    el.style.cssText = 'position:fixed;inset:0;z-index:9590;background:rgba(6,4,10,0);transition:background .35s ease;'
      + 'display:flex;align-items:center;justify-content:center;pointer-events:auto;';
    const cv = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio||1);
    const W = Math.min(window.innerWidth*0.96, 720), H = W*CH/CW;
    cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    cv.style.cssText = 'width:'+W+'px;height:'+H+'px;transform:translateY(-6%);';
    el.appendChild(cv); document.body.appendChild(el);
    h.el = el;
    requestAnimationFrame(()=>{ el.style.background='rgba(6,4,10,.82)'; });
    const ctx = cv.getContext('2d');
    const k = cv.width / CW;                       // 畫布座標 → 像素
    const fps = M.fps || 24, N = M.frames, last = N-1;
    const g0 = (M.glow_from_frame!=null ? M.glow_from_frame : Math.round(N*0.8));
    const [ox, oy] = M.glow_origin || [CW/2, CH/2];
    const box = M.glow_box || [ox-120, oy-25, ox+120, oy+25];
    const bw = (box[2]-box[0]), bh = (box[3]-box[1]);
    const t0 = performance.now();
    let skipped = false, ended = false;
    el.addEventListener('pointerdown', ()=>{ if(!ended) skipped = true; });
    const draw = (now)=>{
      if(live!==h) return;
      const tf = skipped ? last : Math.min(last, (now - t0)/1000*fps);
      const f = Math.floor(tf);
      ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height);
      ctx.setTransform(k,0,0,k,0,0);
      /* 光的強度：開縫那一格起 0 → 最後一格 1（隨盒蓋打開），停格後微微呼吸。 */
      let p = Math.max(0, Math.min(1, (tf - g0) / Math.max(1, last - g0)));
      p = p*p*(3-2*p);
      const breathe = ended ? 0.9 + 0.1*Math.sin((now - h.endAt)/420) : 1;
      const a = p * breathe;
      /* ① 盒後的大光暈（先畫，盒子蓋在上面）。 */
      if(a>0){
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        /* ⚠ 半徑夾在畫布之內：超出去會被畫布邊界切出一道直線硬邊（實測）。 */
        const R = Math.max(10, Math.min(bw*1.25, oy-bh*0.6-4, CW-ox-4, ox-4, CH-(oy-bh*0.6)-4));
        const g = ctx.createRadialGradient(ox, oy-bh*0.6, 0, ox, oy-bh*0.6, R);
        g.addColorStop(0, 'rgba(255,224,150,'+(0.55*a)+')');
        g.addColorStop(0.45, 'rgba(255,190,90,'+(0.22*a)+')');
        g.addColorStop(1, 'rgba(255,170,60,0)');
        ctx.fillStyle = g; ctx.fillRect(ox-R, oy-bh*0.6-R, R*2, R*2);
        ctx.restore();
      }
      const im = c.imgs[f]; if(im) ctx.drawImage(im, 0, 0, CW, CH);
      /* ② 從盒口往上透出的光柱與光芒（疊在盒子上，lighter）。 */
      if(a>0){
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        /* 盒口那一條亮帶 */
        const mg = ctx.createRadialGradient(ox, oy, 0, ox, oy, bw*0.55);
        mg.addColorStop(0, 'rgba(255,246,214,'+(0.95*a)+')');
        mg.addColorStop(0.5, 'rgba(255,214,120,'+(0.45*a)+')');
        mg.addColorStop(1, 'rgba(255,190,80,0)');
        ctx.save(); ctx.translate(ox, oy); ctx.scale(1, bh/bw*1.6); ctx.translate(-ox, -oy);
        ctx.fillStyle = mg; ctx.fillRect(ox-bw*0.6, oy-bw*0.6, bw*1.2, bw*1.2); ctx.restore();
        /* 往上的光柱：下寬上窄、往上淡掉 */
        const top = Math.max(6, oy - CH*0.62*(0.4+0.6*p));   // 同上：光柱頂端不出畫布（漸層在那裡已經淡到 0）
        const lg = ctx.createLinearGradient(0, oy, 0, top);
        lg.addColorStop(0, 'rgba(255,236,180,'+(0.5*a)+')');
        lg.addColorStop(1, 'rgba(255,210,120,0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(ox - bw*0.42, oy); ctx.lineTo(ox + bw*0.42, oy);
        ctx.lineTo(ox + bw*0.16, top); ctx.lineTo(ox - bw*0.16, top); ctx.closePath(); ctx.fill();
        /* 幾道放射的細光芒（慢慢轉，讀得出「在發光」而不是一塊亮斑） */
        const rot = (now - t0)/6000;
        for(let i=0;i<9;i++){
          const ang = -Math.PI/2 + (i-4)*0.24 + Math.sin(rot*2 + i)*0.05;
          const len = Math.min(oy-8, (CH*0.42 + 30*Math.sin(rot*3+i*1.7))) * (0.5+0.5*p);   // 不出畫布
          const wid = 7 + (i%3)*4;
          const ex = ox + Math.cos(ang)*len, ey = oy + Math.sin(ang)*len;
          const rg = ctx.createLinearGradient(ox, oy, ex, ey);
          rg.addColorStop(0, 'rgba(255,240,200,'+(0.32*a)+')');
          rg.addColorStop(1, 'rgba(255,220,140,0)');
          ctx.strokeStyle = rg; ctx.lineWidth = wid; ctx.lineCap='round';
          ctx.beginPath(); ctx.moveTo(ox, oy - bh*0.2); ctx.lineTo(ex, ey); ctx.stroke();
        }
        ctx.restore();
      }
      if(!ended && tf>=last){ ended = true; h.endAt = now; setTimeout(fin, 450); }
      h.raf = requestAnimationFrame(draw);
    };
    h.raf = requestAnimationFrame(draw);
  });
  return handle;
}

export function closeAll(){
  const h = live; live = null;
  if(!h) return;
  cancelAnimationFrame(h.raf);
  if(h.el){ const el=h.el; el.style.pointerEvents='none'; el.style.transition='opacity .3s ease'; el.style.opacity='0';
            setTimeout(()=>{ try{ el.remove(); }catch(_){} }, 320); }
}
