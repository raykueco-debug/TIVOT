/* ══ 封印盒開盒演出（ver -2980 初版；-2985 照 Wan 參考版重做；ver -2992 動畫副理接手重寫光）══
   Ray 11-24：「sealbox_open2_A_AB_cut，然後讓程式從盒內發金光」→ -2985 版 Ray：「太廉價了吧 能不能專業點」，
   並定案「只要是動畫就都是你（動畫副理）的活」—— 這支檔由動畫線維護。
   -2985 的病（逐條對治）：① 盒口一團過曝白光把盒蓋／封蠟／盒身全吃掉 ② 光芒是等寬硬邊三角，像剪貼圖
   ③ 沒有層次（沒有蓄勢、沒有爆點、沒有空氣感）④ 背後的團徽沒被壓暗，跟光搶戲。
   這一版的結構（開箱演出的標準節奏：蓄勢 → 爆點 → 餘韻）：
     ① 蓄勢（蠟封裂開 → 盒蓋開縫）：只有裂縫透出一點細光＋盒子微震，越來越亮。
     ② 爆點（盒蓋開縫那一格）：全螢幕一記短閃光、一圈衝擊波、一把火星往外迸。
     ③ 餘韻（開蓋之後，一直跑到 close()）：
        · 光束畫在**盒子後面**（盒身會擋住下半）—— 讀起來是光從盒口溢出，不是光蓋在盒子上。
        · 光束在**四分之一解析度的離屏**上畫、放大貼回來 ＝ 天然的柔邊（體積光感），手機也便宜。
        · 寬柔／細亮兩組，各自慢慢往反方向轉、長度用兩個正弦相乘抖動（不規律，不像節拍器）。
        · 盒前只補「盒口內襯」與「盒蓋內側」的照亮（裁在盒口範圍內），盒身與封蠟保持看得清楚。
        · 光塵從盒口往上飄，有大小、閃爍、左右擺。
   影格：`config.relicBox.openAnim`（frame_NN.webp ＋ anim.json，透明 RGBA，TO_CODE 第三十二支，動畫本身不發光）。
   anim.json 錨點：`glow_from_frame`（盒蓋開縫）／`glow_origin`（盒口中心）／`glow_box`（盒口內襯範圍），座標 720×480。
   `seam_from_frame`／`seam_origin`（蠟封裂縫）沒寫就用推算值。
   ⚠ 光一直跑到呼叫端 close()（＝玩家在獎品視窗按確認）。
   ⚠ 版面：開盒時一層暗幕（z 9590）＋大盒子置中；播完、獎品視窗要上來時盒子縮到畫面上半、升到 z 9610
     （#lootSheet 9600 之上、不吃點擊、暗幕拿掉）。
   ⚠ 逐禎不准用 Math.random（會閃）：所有隨機量都由固定種子或「編號＋週期」雜湊出來。
   ⚠ 葉模組：只讀 config。呼叫端只有 town.relicReveal；換畫面時 story.clearStageLeftovers → closeAll()。 */
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

function rng(seed){ let s = seed>>>0; return ()=>{ s = (s*1664525 + 1013904223)>>>0; return s/4294967296; }; }
function hash01(a, b){ let h = (a*374761393 + b*668265263)>>>0; h = (h ^ (h>>>13))*1274126177>>>0; return ((h ^ (h>>>16))>>>0)/4294967296; }
const clamp01 = x => x<0 ? 0 : x>1 ? 1 : x;
const smooth = x => { x = clamp01(x); return x*x*(3-2*x); };

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
    el.style.cssText = 'position:fixed;inset:0;z-index:9590;background:rgba(4,3,8,0);transition:background .45s ease;'
      + 'display:flex;align-items:center;justify-content:center;pointer-events:auto;overflow:hidden;';
    /* 暗角：把畫面四周（團徽、首頁、城鎮）壓下去，視線只留在盒子上。 */
    const vig = document.createElement('div');
    vig.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .45s ease;'
      + 'background:radial-gradient(ellipse 70% 55% at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,.78) 100%);';
    /* 爆點閃光：全螢幕，開蓋那一格亮一下就退。 */
    const flash = document.createElement('div');
    flash.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;mix-blend-mode:screen;'
      + 'background:radial-gradient(ellipse 60% 45% at 50% 50%, rgba(255,246,222,1) 0%, rgba(255,214,140,.55) 35%, rgba(255,190,90,0) 75%);';
    const cv = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio||1);
    const PX = CW*0.22, PT = CH*0.70, PB = CH*0.06;          // 畫布四周留白（光往上衝要有地方）
    const VW = CW + PX*2, VH = CH + PT + PB;
    const W = Math.min(window.innerWidth*1.0, 900), H = W*VH/VW;
    cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    cv.style.cssText = 'position:relative;width:'+W+'px;height:'+H+'px;transform-origin:50% 50%;transition:transform .55s cubic-bezier(.3,.8,.3,1);';
    el.appendChild(vig); el.appendChild(cv); el.appendChild(flash); document.body.appendChild(el);
    h.el = el;
    requestAnimationFrame(()=>{ el.style.background='rgba(4,3,8,.62)'; vig.style.opacity='1'; });
    const ctx = cv.getContext('2d');
    const k = cv.width / VW;                                 // 影格座標 → 像素（影格放在 (PX, PT)）
    /* 光束離屏：四分之一解析度，放大貼回來就是柔邊。 */
    const LQ = 0.25;
    const lcv = document.createElement('canvas');
    lcv.width = Math.max(2, Math.round(cv.width*LQ)); lcv.height = Math.max(2, Math.round(cv.height*LQ));
    const lx = lcv.getContext('2d');
    const kl = lcv.width / VW;

    const fps = M.fps || 24, N = M.frames, last = N-1;
    const g0 = (M.glow_from_frame!=null ? M.glow_from_frame : Math.round(N*0.8));
    const [ox, oy] = M.glow_origin || [CW/2, CH/2];
    const box = M.glow_box || [ox-120, oy-25, ox+120, oy+25];
    const bw = box[2]-box[0], bh = box[3]-box[1];
    const s0 = (M.seam_from_frame!=null ? M.seam_from_frame : Math.max(0, g0-12));
    const [sx, sy] = M.seam_origin || [ox-4, oy+26];
    const tOpen = g0 / fps;                                   // 爆點的時刻（秒）

    const R = rng(20991124);
    /* 兩組光束：寬柔（少、淡、慢）＋細亮（多、亮、快一點），角度是扇形往上 ±70°。 */
    const mkRays = (n, wMin, wMax, aMin, aMax, spread)=>Array.from({length:n}, (_,i)=>{
      const u = (i + 0.2 + R()*0.6)/n;
      return { ang:-Math.PI/2 + (u-0.5)*2*spread, w:wMin+R()*(wMax-wMin), a:aMin+R()*(aMax-aMin),
               len:0.65+R()*0.55, s1:0.35+R()*0.7, s2:0.9+R()*1.6, ph:R()*6.283, ph2:R()*6.283 };
    });
    const broad = mkRays(7, 0.07, 0.15, 0.20, 0.32, 1.10);
    const fine  = mkRays(14, 0.012, 0.030, 0.35, 0.60, 1.25);
    const seamRays = Array.from({length:6}, ()=>({ ang:-Math.PI/2 + (R()-0.5)*1.9, len:0.30+R()*0.35, w:0.010+R()*0.012, ph:R()*6.283, sp:2+R()*2 }));
    const sparks = Array.from({length:46}, ()=>{
      const ang = -Math.PI/2 + (R()-0.5)*2.6, v = 260 + R()*520;
      return { vx:Math.cos(ang)*v, vy:Math.sin(ang)*v, life:0.55+R()*0.75, r:1.2+R()*2.2 };
    });
    const EMBERS = 34;

    const t0 = performance.now();
    let skipped = false, ended = false, skipAt = 0;
    el.addEventListener('pointerdown', ()=>{ if(!ended){ skipped = true; skipAt = (performance.now()-t0)/1000; } });

    /* 一條光束（楔形：根部窄、越遠越寬，沿長度漸淡）—— 畫在低解析離屏上。 */
    const beam = (g, x, y, ang, half, len, a, warm)=>{
      const a1 = ang-half, a2 = ang+half;
      const gr = g.createLinearGradient(x, y, x+Math.cos(ang)*len, y+Math.sin(ang)*len);
      gr.addColorStop(0,    'rgba(255,250,232,'+(a*0.55)+')');
      gr.addColorStop(0.12, 'rgba(255,244,210,'+a+')');
      gr.addColorStop(0.55, warm ? 'rgba(255,206,120,'+(a*0.45)+')' : 'rgba(255,226,165,'+(a*0.5)+')');
      gr.addColorStop(1,    'rgba(255,180,80,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(x, y);
      g.lineTo(x+Math.cos(a1)*len, y+Math.sin(a1)*len);
      g.lineTo(x+Math.cos(a2)*len, y+Math.sin(a2)*len);
      g.closePath(); g.fill();
    };
    const disc = (g, x, y, rx, ry, stops)=>{
      g.save(); g.translate(x, y); g.scale(1, ry/rx);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      stops.forEach(([o,c2])=>gr.addColorStop(o,c2));
      g.fillStyle = gr; g.fillRect(-rx, -rx, rx*2, rx*2); g.restore();
    };
    /* 閃爍的小星光（柔和的四芒，只給少數光塵用）。 */
    const glint = (x, y, s, a)=>{
      ctx.save(); ctx.translate(x, y);
      for(let r=0;r<2;r++){
        const gr = ctx.createLinearGradient(-s,0,s,0);
        gr.addColorStop(0,'rgba(255,240,200,0)'); gr.addColorStop(0.5,'rgba(255,253,240,'+a+')'); gr.addColorStop(1,'rgba(255,240,200,0)');
        ctx.fillStyle = gr; ctx.fillRect(-s, -0.7, s*2, 1.4);
        ctx.rotate(Math.PI/2);
      }
      ctx.restore();
    };

    const draw = (now)=>{
      if(live!==h) return;
      let ts = (now - t0)/1000;
      /* 點一下跳到尾：時間直接跳到爆點之後，爆點照樣演一次（不會少掉那一下）。 */
      if(skipped && ts < tOpen){ ts = tOpen + (ts - skipAt); }
      const tf = Math.min(last, ts*fps);
      const f = Math.floor(tf);
      const pSeam = smooth((tf - s0) / Math.max(1, g0 - s0));             // 0→1：裂開 → 開縫
      const tb = ts - tOpen;                                              // 爆點之後過了幾秒（<0＝還沒到）
      const pOpen = smooth((tf - g0) / Math.max(1, last - g0));
      const bloom = tb < 0 ? 0 : smooth(Math.min(1, tb/0.55));           // 光束長出來

      /* ── 光束層（離屏、低解析、放大貼回 ＝ 柔邊），畫在盒子後面 ── */
      lx.setTransform(1,0,0,1,0,0); lx.clearRect(0,0,lcv.width,lcv.height);
      if(bloom>0){
        lx.setTransform(kl,0,0,kl,kl*PX,kl*PT);
        lx.globalCompositeOperation = 'lighter';
        const by = oy - bh*0.25;
        const reach = (CH*0.55 + PT*0.55);
        disc(lx, ox, by, bw*1.05, bh*3.2, [[0,'rgba(255,226,160,'+(0.55*bloom)+')'],[0.45,'rgba(255,190,90,'+(0.22*bloom)+')'],[1,'rgba(255,160,60,0)']]);
        const rotB = Math.sin(ts*0.23)*0.06 + ts*0.015, rotF = -Math.sin(ts*0.31)*0.05 - ts*0.02;
        for(const r of broad){
          const fl = 0.78 + 0.22*Math.sin(ts*r.s1 + r.ph)*Math.sin(ts*r.s2*0.5 + r.ph2);
          beam(lx, ox, by, r.ang + rotB, r.w*(0.8+0.2*fl), reach*r.len*fl*bloom, r.a*fl*bloom, true);
        }
        for(const r of fine){
          const fl = 0.62 + 0.38*Math.sin(ts*r.s2 + r.ph)*Math.sin(ts*r.s1*1.7 + r.ph2);
          beam(lx, ox, by, r.ang + rotF, r.w, reach*(0.55+r.len*0.6)*(0.7+0.3*fl)*bloom, r.a*(0.55+0.45*fl)*bloom, false);
        }
      }

      ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height);
      if(bloom>0){
        ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality='high';
        ctx.drawImage(lcv, 0, 0, cv.width, cv.height); ctx.restore();
      }

      ctx.setTransform(k,0,0,k,k*PX,k*PT);                // 之後一律是影格的 720×480 座標
      /* ── 盒子（蓄勢期間微震，爆點那一下往下一沉） ── */
      let jx = 0, jy = 0;
      if(pSeam>0 && tb<0){ const amp = 1.6*pSeam; jx = Math.sin(ts*61)*amp; jy = Math.sin(ts*47+1.3)*amp*0.6; }
      if(tb>=0 && tb<0.25){ jy = Math.sin(tb/0.25*Math.PI)*5*(1-tb/0.25); }
      const im = c.imgs[f]; if(im) ctx.drawImage(im, jx, jy, CW, CH);

      ctx.save(); ctx.globalCompositeOperation='lighter';
      /* ── ① 蓄勢：裂縫透光（盒蓋還沒開） ── */
      const aSeam = pSeam * (tb<0 ? 1 : Math.max(0, 1 - tb/0.3));
      if(aSeam>0.01){
        const fl = 0.85 + 0.15*Math.sin(ts*17);
        disc(ctx, sx+jx, sy+jy, 22, 30, [[0,'rgba(255,252,236,'+(0.9*aSeam*fl)+')'],[0.35,'rgba(255,214,120,'+(0.45*aSeam)+')'],[1,'rgba(255,180,60,0)']]);
        for(const r of seamRays){
          const l = CH*r.len*(0.35+0.65*pSeam)*(0.8+0.2*Math.sin(ts*r.sp+r.ph));
          beam(ctx, sx+jx, sy+jy, r.ang, r.w, l, 0.55*aSeam, false);
        }
      }
      /* ── ③ 盒前的照亮：盒口內襯 ＋ 盒蓋內側（裁在盒口上方，盒身與封蠟不被蓋掉） ── */
      if(bloom>0){
        const pulse = 0.9 + 0.1*Math.sin(ts*3.1) * Math.sin(ts*1.7+0.6);
        ctx.save();
        ctx.beginPath(); ctx.rect(box[0]-bw*0.08, 0, bw*1.16, box[3]+bh*0.1); ctx.clip();
        disc(ctx, ox, oy-bh*0.05, bw*0.55, bh*0.75, [[0,'rgba(255,250,232,'+(0.95*bloom*pulse)+')'],[0.4,'rgba(255,236,180,'+(0.55*bloom)+')'],[1,'rgba(255,200,110,0)']]);
        disc(ctx, ox, oy-bh*2.1, bw*0.55, bh*2.0, [[0,'rgba(255,230,170,'+(0.30*bloom*pulse)+')'],[1,'rgba(255,190,90,0)']]);
        ctx.restore();
      }
      /* ── ② 爆點：衝擊波一圈 ＋ 火星迸出 ── */
      if(tb>=0 && tb<0.6){
        const p = tb/0.6, r = 40 + p*CW*0.62;
        ctx.save(); ctx.translate(ox, oy-bh*0.3); ctx.scale(1, 0.42);
        ctx.strokeStyle = 'rgba(255,236,190,'+(0.75*(1-p)*(1-p))+')'; ctx.lineWidth = 10*(1-p)+1.5;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke(); ctx.restore();
      }
      if(tb>=0){
        for(const s of sparks){
          if(tb > s.life) continue;
          const p = tb / s.life, drag = (1 - Math.exp(-tb*2.6))/2.6;
          const x = ox + s.vx*drag, y = oy - bh*0.3 + s.vy*drag + 160*tb*tb;
          const a = (1-p)*(1-p);
          ctx.fillStyle = 'rgba(255,238,190,'+a+')';
          ctx.beginPath(); ctx.arc(x, y, s.r*(1-p*0.5), 0, 6.283); ctx.fill();
        }
      }
      /* ── ③ 光塵：從盒口往上飄（編號＋週期雜湊，每一輪位置不同但不逐禎亂跳） ── */
      if(bloom>0){
        for(let i=0;i<EMBERS;i++){
          const per = 2.2 + hash01(i, 7)*1.8;
          const tt = ts/per + hash01(i, 3), cyc = Math.floor(tt), life = tt - cyc;
          const rx = (hash01(i, cyc)-0.5)*bw*0.95, rise = CH*0.35 + PT*0.55*hash01(i, cyc+101);
          const x = ox + rx*(1+life*0.5) + Math.sin(ts*1.1 + i)*7*life;
          const y = oy - bh*0.1 - life*rise;
          const tw = 0.6 + 0.4*Math.sin(ts*(4+hash01(i,9)*5) + i);
          const a = bloom * Math.sin(life*Math.PI) * tw;
          const sz = 0.9 + hash01(i, 11)*1.9;
          if(i%9===0) glint(x, y, sz*4.5, 0.8*a);
          ctx.fillStyle = 'rgba(255,244,205,'+(0.9*a)+')';
          ctx.beginPath(); ctx.arc(x, y, sz, 0, 6.283); ctx.fill();
        }
      }
      ctx.restore();

      /* 全螢幕閃光：爆點那一下（0.05 秒衝頂、0.45 秒退掉）。 */
      flash.style.opacity = tb>=0 && tb<0.5 ? String(0.62*(tb<0.05 ? tb/0.05 : Math.pow(1-(tb-0.05)/0.45, 2))) : '0';

      if(!ended && tf>=last && tb>0.7){
        ended = true;
        /* 獎品視窗要上來了：盒子縮到畫面上半、升到它之上（不被壓暗、不擋視窗），暗幕交給獎品視窗。 */
        const vh = window.innerHeight, room = Math.max(140, vh/2 - 120);
        const s = Math.min(1, room / H);
        const cy = vh/2, ty = (room/2 + 16) - cy;
        cv.style.transform = 'translateY('+ty+'px) scale('+s+')';
        el.style.background = 'rgba(4,3,8,0)'; vig.style.opacity = '0';
        el.style.zIndex = '9610'; el.style.pointerEvents = 'none';
        setTimeout(fin, 420);
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
