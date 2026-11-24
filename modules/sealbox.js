/* ══ 封印盒開盒演出（ver -2980 初版；ver -2985 照 Wan 參考版重做）══
   Ray 11-24：「sealbox_open2_A_AB_cut，然後讓程式從盒內發金光」→ 看完 -2980：「開盒完全不行，參考之前 WAN 畫的效果，
   在點掉確認前光線要一直跑」。參考＝動畫副理作廢的發光版 `tivot_wan/out/ci/sealbox_open_ABC`（逐格看過）：
     ① 蠟封一裂開，縫裡就透出細細的放射光芒；② 盒蓋一掀，大量長短不一的尖銳光芒呈扇形往上噴，
     盒口是近白的金色核心、把掀開的盒蓋內側整片照亮；③ 後段有十字星芒閃爍、細碎光點往上飄。
   影格：`config.relicBox.openAnim` 那個資料夾（frame_NN.webp ＋ anim.json，透明 RGBA，TO_CODE 第三十二支，動畫本身不發光）。
   anim.json 的 `glow_from_frame`（盒蓋開縫）／`glow_origin`（盒口中心）／`glow_box`（盒口內襯範圍）是光的錨點；
   `seam_from_frame`／`seam_origin`（蠟封裂縫）沒寫就用推算值（見下）。
   ⚠ 光**一直跑到呼叫端 close()**（＝玩家在獎品視窗按確認）：光芒逐條伸縮閃動，不是停格呼吸。
   ⚠ 版面：開盒時一層淡暗幕（z 9590）＋大盒子置中；播完、獎品視窗要上來時，盒子縮到**畫面上半**、這一層升到 z 9610
     （#lootSheet 9600 之上、不吃點擊、暗幕拿掉）—— 盒子不被獎品視窗的暗幕壓暗，也不擋到視窗本身（Ray：「盒子和光要看得清楚」）。
   ⚠ 葉模組：只讀 config（鐵律 2 的依賴方向）。呼叫端只有 town.relicReveal；換畫面時 story.clearStageLeftovers → closeAll()。 */
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

/* 固定種子的亂數（光芒的長度／角度每次開都一樣，逐禎只靠時間動 —— 不用 Math.random 逐禎抽，那會閃）。 */
function rng(seed){ let s = seed>>>0; return ()=>{ s = (s*1664525 + 1013904223)>>>0; return s/4294967296; }; }

/* 播一次。`done()` 在動畫播完（或點一下跳到尾）之後叫 —— 那時盒子已經開了、光一直在跑。
   回傳 `{ close }`：呼叫端在獎品視窗收掉之後收這一層。影格載不到就直接叫 done（等於沒有演出）。 */
export function play(done){
  closeAll();
  const fin = (()=>{ let called=false; return ()=>{ if(called) return; called=true; try{ done && done(); }catch(_){} }; })();
  const h = { el:null, raf:0 };
  const handle = { close: ()=>{ if(live===h) closeAll(); } };
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
    /* 畫布四周留白：盒子幾乎貼著影格上緣，光要往上噴就得有地方（-2985 初測光芒被畫布頂端切平）。 */
    const PX = CW*0.18, PT = CH*0.62, PB = CH*0.04;
    const VW = CW + PX*2, VH = CH + PT + PB;
    const W = Math.min(window.innerWidth*1.0, 860), H = W*VH/VW;
    cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    cv.style.cssText = 'width:'+W+'px;height:'+H+'px;transform-origin:50% 50%;transition:transform .5s cubic-bezier(.3,.8,.3,1);';
    el.appendChild(cv); document.body.appendChild(el);
    h.el = el;
    requestAnimationFrame(()=>{ el.style.background='rgba(6,4,10,.6)'; });
    const ctx = cv.getContext('2d');
    const k = cv.width / VW;                       // 畫布座標 → 像素（影格放在 (PX, PT)）
    const fps = M.fps || 24, N = M.frames, last = N-1;
    const g0 = (M.glow_from_frame!=null ? M.glow_from_frame : Math.round(N*0.8));
    const [ox, oy] = M.glow_origin || [CW/2, CH/2];
    const box = M.glow_box || [ox-120, oy-25, ox+120, oy+25];
    const bw = (box[2]-box[0]), bh = (box[3]-box[1]);
    /* 蠟封裂縫：沒寫就用推算值 —— 實測影格第 12 格裂開、裂口在盒口中心正下方約 26 px（720×480 畫布）。 */
    const s0 = (M.seam_from_frame!=null ? M.seam_from_frame : Math.max(0, g0-12));
    const [sx, sy] = M.seam_origin || [ox-4, oy+26];
    /* 光芒：一組固定的扇形（往上 ±80°），每一條各自的長度、寬度、閃動速度與相位。 */
    const R = rng(20981124);
    const rays = Array.from({length:34}, (_,i)=>{
      const u = (i+R()*0.8)/34;                    // 均勻撒開再抖一點
      return { ang: -Math.PI/2 + (u-0.5)*2*1.15, len: 0.45+R()*0.75, wid: 0.010+R()*0.035,
               sp: 0.7+R()*1.8, ph: R()*Math.PI*2, hot: R()<0.25 };
    });
    const seamRays = Array.from({length:12}, ()=>({ ang:-Math.PI/2 + (R()-0.5)*2.4, len:0.25+R()*0.45, sp:1+R()*2, ph:R()*6.28 }));
    const motes = Array.from({length:40}, ()=>({ x:(R()-0.5)*bw*1.1, sp:18+R()*40, ph:R(), r:0.8+R()*1.8, sway:R()*6.28 }));
    const stars = Array.from({length:7}, ()=>({ x:(R()-0.5)*bw*1.6, y:-(R()*CH*0.75), per:1.6+R()*2.2, ph:R(), s:10+R()*16 }));
    const t0 = performance.now();
    let skipped = false, ended = false;
    el.addEventListener('pointerdown', ()=>{ if(!ended) skipped = true; });
    const ray = (x, y, ang, len, wid, a, hot)=>{
      const ex = x + Math.cos(ang)*len, ey = y + Math.sin(ang)*len;
      const nx = -Math.sin(ang)*wid, ny = Math.cos(ang)*wid;
      const g = ctx.createLinearGradient(x, y, ex, ey);
      /* 根部壓暗：三十幾條從同一點出發，根部全亮會疊成一團過曝的白（-2985 實測），亮度在離盒口一小段才到頂。 */
      g.addColorStop(0, 'rgba(255,240,200,'+(a*0.18)+')');
      g.addColorStop(0.14, 'rgba(255,250,230,'+(a*0.9)+')');
      g.addColorStop(0.45, hot ? 'rgba(255,236,180,'+(a*0.7)+')' : 'rgba(255,210,115,'+(a*0.45)+')');
      g.addColorStop(1, 'rgba(255,190,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x+nx, y+ny); ctx.lineTo(ex, ey); ctx.lineTo(x-nx, y-ny); ctx.closePath(); ctx.fill();
    };
    const glowDisc = (x, y, rx, ry, stops)=>{
      ctx.save(); ctx.translate(x, y); ctx.scale(1, ry/rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      stops.forEach(([o,c])=>g.addColorStop(o,c));
      ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx*2, rx*2); ctx.restore();
    };
    const star = (x, y, s, a)=>{
      ctx.save(); ctx.translate(x, y);
      for(const [w,l] of [[s*0.09, s],[s*0.05, s*0.55]]){
        for(let r=0;r<2;r++){ ctx.rotate(r ? Math.PI/2 : 0);
          const g = ctx.createLinearGradient(-l,0,l,0);
          g.addColorStop(0,'rgba(255,240,200,0)'); g.addColorStop(0.5,'rgba(255,255,245,'+a+')'); g.addColorStop(1,'rgba(255,240,200,0)');
          ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(-l,0); ctx.lineTo(0,-w); ctx.lineTo(l,0); ctx.lineTo(0,w); ctx.closePath(); ctx.fill(); }
        ctx.rotate(Math.PI/4);
      }
      ctx.restore();
    };
    const draw = (now)=>{
      if(live!==h) return;
      const ts = (now - t0)/1000;
      const tf = skipped ? last : Math.min(last, ts*fps);
      const f = Math.floor(tf);
      ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height);
      ctx.setTransform(k,0,0,k,k*PX,k*PT);          // 之後的座標一律是影格的 720×480
      const ease = x=>{ x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x); };
      const pSeam = ease((tf - s0) / Math.max(1, g0 - s0));               // 裂縫透光：裂開 → 開縫
      const pOpen = ease((tf - g0) / Math.max(1, last - g0));             // 開蓋噴光：開縫 → 全開
      const burst = ended ? 1 : pOpen;
      /* ① 盒子後面：一大圈暖光（盒子蓋在它上面，像光從盒裡把周圍照亮）。 */
      if(burst>0){
        ctx.save(); ctx.globalCompositeOperation='lighter';
        const rr = CW*0.5;
        glowDisc(ox, oy-bh*1.2, rr, rr*0.95, [[0,'rgba(255,214,130,'+(0.42*burst)+')'],[0.5,'rgba(255,170,60,'+(0.16*burst)+')'],[1,'rgba(255,150,40,0)']]);
        ctx.restore();
      }
      const im = c.imgs[f]; if(im) ctx.drawImage(im, 0, 0, CW, CH);
      ctx.save(); ctx.globalCompositeOperation='lighter';
      /* ② 裂縫透光（盒蓋還沒開）：裂口一團小亮點＋細光芒，盒縫一條亮線；開蓋之後淡出交給 ③。 */
      const aSeam = pSeam * (1 - pOpen);
      if(aSeam>0.01){
        glowDisc(sx, sy, 34, 22, [[0,'rgba(255,250,225,'+(0.95*aSeam)+')'],[0.4,'rgba(255,210,110,'+(0.5*aSeam)+')'],[1,'rgba(255,180,60,0)']]);
        for(const r of seamRays){
          const fl = 0.75 + 0.25*Math.sin(ts*r.sp*3 + r.ph);
          ray(sx, sy, r.ang, CH*r.len*fl*(0.4+0.6*pSeam), 2.2, 0.75*aSeam*fl, true);
        }
        const lg = ctx.createLinearGradient(box[0]-10, 0, box[2]+10, 0);
        lg.addColorStop(0,'rgba(255,200,90,0)'); lg.addColorStop(0.5,'rgba(255,240,190,'+(0.7*aSeam)+')'); lg.addColorStop(1,'rgba(255,200,90,0)');
        ctx.fillStyle=lg; ctx.fillRect(box[0]-10, sy-3, bw+20, 6);
      }
      /* ③ 開蓋噴光：扇形光芒（逐條伸縮閃動、整組慢慢擺）＋盒口白金核心＋盒蓋內側被照亮。 */
      if(burst>0.01){
        const sway = Math.sin(ts*0.6)*0.05;
        for(const r of rays){
          const fl = 0.72 + 0.28*Math.sin(ts*r.sp*2.2 + r.ph) * Math.sin(ts*r.sp*0.9 + r.ph*1.7);
          const len = CH*(0.35 + r.len*0.95)*fl*(0.25 + 0.75*burst);
          ray(ox, oy-bh*0.15, r.ang + sway, Math.min(len, oy+PT-6), CW*r.wid*(r.hot?1.4:1), (r.hot?0.95:0.72)*burst*(0.6+0.4*fl), r.hot);
        }
        /* 盒蓋內側：從盒口往上一整片近白的金（參考版的盒蓋內側整片發亮）。 */
        glowDisc(ox, oy-bh*1.0, bw*0.5, bh*1.5, [[0,'rgba(255,248,220,'+(0.42*burst)+')'],[0.55,'rgba(255,214,130,'+(0.2*burst)+')'],[1,'rgba(255,190,80,0)']]);
        /* 盒口核心：最亮的一團，微微脈動。 */
        const pulse = 0.88 + 0.12*Math.sin(ts*5.3);
        glowDisc(ox, oy-bh*0.2, bw*0.42, bh*0.55, [[0,'rgba(255,255,250,'+(0.85*burst*pulse)+')'],[0.5,'rgba(255,232,170,'+(0.4*burst)+')'],[1,'rgba(255,200,90,0)']]);
        /* 光點：從盒口往上飄、左右輕擺、越高越淡。 */
        for(const m of motes){
          const life = ((ts*m.sp/CH*1.6) + m.ph) % 1;
          const y = oy - life*(CH*0.45+PT*0.8), x = ox + m.x*(0.6+life*0.6) + Math.sin(ts*1.3+m.sway)*8;
          const a = burst*(1-life)*0.9;
          ctx.fillStyle='rgba(255,246,210,'+a+')'; ctx.beginPath(); ctx.arc(x, y, m.r, 0, 6.283); ctx.fill();
        }
        /* 十字星芒：在光芒之間一閃一閃。 */
        for(const s of stars){
          const ph = ((ts/s.per) + s.ph) % 1;
          const a = ph<0.35 ? Math.sin(ph/0.35*Math.PI) : 0;
          if(a>0.02) star(ox + s.x, oy - bh*0.5 + s.y, s.s*(0.6+0.4*a), 0.95*a*burst);
        }
      }
      ctx.restore();
      if(!ended && tf>=last){
        ended = true;
        /* 獎品視窗要上來了：盒子縮到畫面上半、升到它之上（不被壓暗、不擋視窗），暗幕交給獎品視窗。 */
        const vh = window.innerHeight, room = Math.max(140, vh/2 - 120);
        const s = Math.min(1, room / H);
        const cy = vh/2, ty = (room/2 + 16) - cy;
        cv.style.transform = 'translateY('+ty+'px) scale('+s+')';
        el.style.background = 'rgba(6,4,10,0)';
        el.style.zIndex = '9610'; el.style.pointerEvents = 'none';
        setTimeout(fin, 380);
      }
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
