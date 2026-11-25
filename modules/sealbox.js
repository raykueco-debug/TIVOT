/* ══ 封印盒開盒演出（ver -2980 初版；-2985／-2992 程式光；ver -2993 改成全部是 Wan 影格）══
   Ray 11-24 的定案經過：「讓程式從盒內發金光」→ -2985 Ray：「太廉價」→ -2992（動畫副理重寫程式光）Ray：「比上一版還差，
   參考 WAN 的光，那才是正確的」→「ci/sealbox_open_ABC 是這一個啊，然後持續發光直到點掉對話框」。
   ⇒ 光**不再由程式畫**。這一層只做三件事：播開盒影格（Wan 發光版 ABC，含光）→ 接著無限播循環段（Wan 首尾鎖定，
     光一直在跑）→ 呼叫端 close() 才收。這支檔由動畫線維護（Ray：「只要是動畫就都是你的活」）。
   影格：`config.relicBox.openAnim` 資料夾；anim.json：
     `frames`＝開盒段格數、`loop_frames`＝循環段格數（接在開盒段後面編號）、`fps`、`pad`（檔名位數，預設 2）、`canvas`。
   ⚠ 版面：開盒時一層暗幕＋暗角（z 9590）＋大盒子置中；開盒段播完、獎品視窗要上來時，盒子縮到畫面上半、升到 z 9610
     （#lootSheet 9600 之上、不吃點擊、暗幕拿掉）—— 盒子不被獎品視窗壓暗，也不擋視窗。
   ⚠ 點一下＝開盒段直接跳到最後一格（之後照樣進循環）。
   ⚠ 開盒音效（ver -3030，Ray：「開公會盒用這個」）：`config.relicBox.openSe`（ASSETS 鍵），盒子一出現就播；warm() 一起預載。
   ⚠ 葉模組：只讀 config／audio。呼叫端只有 town.relicReveal；換畫面時 story.clearStageLeftovers → closeAll()。 */
import { GAME_CONFIG, asset, fileGain } from '../config.js';
import { SFX } from '../audio.js';

let cache = null;            // { dir, meta, imgs:[Image] }
let live = null;             // 目前開著的那一層（只會有一層）

function dirOf(){ const d = (GAME_CONFIG.relicBox||{}).openAnim; return d ? (d.endsWith('/') ? d : d+'/') : null; }

/* 先抓影格（公會的聖遺物單子一打開就叫，鐵律 13：用到它的那個畫面自己載）。 */
function openSe(){ const k=(GAME_CONFIG.relicBox||{}).openSe; return k ? asset(k) : ''; }
export function warm(){
  const se=openSe(); if(se){ try{ SFX.preload([se]); }catch(_){} }
  const dir = dirOf(); if(!dir) return Promise.resolve(null);
  if(cache && cache.dir===dir) return cache.ready;
  const c = { dir, meta:null, imgs:[] };
  c.ready = fetch(dir+'anim.json').then(r=>r.ok?r.json():null).then(meta=>{
    if(!meta || !(meta.frames>0)) return null;
    c.meta = meta;
    const total = meta.frames + (meta.loop_frames||0), pd = meta.pad || 2;
    const pad = n => String(n).padStart(pd,'0');
    return Promise.all(Array.from({length:total}, (_,i)=>new Promise(res=>{
      const im = new Image(); im.decoding='async';
      im.onload = ()=>res(im); im.onerror = ()=>res(null);
      im.src = dir+'frame_'+pad(i)+'.webp';
      c.imgs[i] = im;
    }))).then(list=> list.every(Boolean) ? c : null);
  }).catch(()=>null);
  cache = c;
  return c.ready;
}

/* 播一次。`done()` 在開盒段播完（或點一下跳到尾）之後叫 —— 那時盒子已經開了、光在循環段裡一直跑。
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
    const N = M.frames, L = M.loop_frames || 0, fps = M.fps || 24;
    const el = document.createElement('div');
    el.id = 'sealboxFx';
    el.style.cssText = 'position:fixed;inset:0;z-index:9590;background:rgba(4,3,8,0);transition:background .45s ease;'
      + 'display:flex;align-items:center;justify-content:center;pointer-events:auto;overflow:hidden;';
    /* 暗角：把畫面四周壓下去，視線只留在盒子上。 */
    const vig = document.createElement('div');
    vig.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .45s ease;'
      + 'background:radial-gradient(ellipse 70% 55% at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,.78) 100%);';
    const cv = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio||1);
    const W = Math.min(window.innerWidth*1.0, 900), H = W*CH/CW;
    cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    cv.style.cssText = 'position:relative;width:'+W+'px;height:'+H+'px;transform-origin:50% 50%;transition:transform .55s cubic-bezier(.3,.8,.3,1);';
    el.appendChild(vig); el.appendChild(cv); document.body.appendChild(el);
    h.el = el;
    requestAnimationFrame(()=>{ el.style.background='rgba(4,3,8,.62)'; vig.style.opacity='1'; });
    { const se=openSe(); if(se){ try{ SFX.play(se, fileGain(se)); }catch(_){} } }   // 開盒音：盒子出現那一刻
    const ctx = cv.getContext('2d');
    /* 邊緣羽化遮罩：Wan 的光芒與封條會頂到影格邊（ABC 有 40 格碰邊），不羽化的話畫面中間會出現一條被切直的光。
       上緣淡得最多（光往上衝）、左右次之、下緣一點點。只做一次，之後每格 destination-in 一下。 */
    const mask = document.createElement('canvas');
    { const mw = 180, mh = Math.round(180*CH/CW); mask.width = mw; mask.height = mh;
      const mx = mask.getContext('2d'), id = mx.createImageData(mw, mh);
      for(let y=0;y<mh;y++) for(let x=0;x<mw;x++){
        const u = x/(mw-1), v = y/(mh-1);
        const fx = Math.min(1, Math.min(u, 1-u)/0.07), fy = Math.min(1, v/0.09, (1-v)/0.04);
        const a = Math.max(0, Math.min(fx, fy)); id.data[(y*mw+x)*4+3] = Math.round(255*a*a*(3-2*a));
      }
      mx.putImageData(id, 0, 0); }
    const t0 = performance.now();
    let skipped = false, ended = false, tLoop = 0;
    el.addEventListener('pointerdown', ()=>{ if(!ended) skipped = true; });
    const draw = (now)=>{
      if(live!==h) return;
      const ts = (now - t0)/1000;
      let idx;
      if(!ended){
        idx = skipped ? N-1 : Math.min(N-1, Math.floor(ts*fps));
        if(idx >= N-1){
          ended = true; tLoop = now;
          /* 獎品視窗要上來了：盒子縮到畫面上半、升到它之上（不被壓暗、不擋視窗），暗幕交給獎品視窗。 */
          const vh = window.innerHeight, room = Math.max(140, vh/2 - 120);
          const s = Math.min(1, room / H);
          const cy = vh/2, ty = (room/2 + 16) - cy;
          cv.style.transform = 'translateY('+ty+'px) scale('+s+')';
          el.style.background = 'rgba(4,3,8,0)'; vig.style.opacity = '0';
          el.style.zIndex = '9610'; el.style.pointerEvents = 'none';
          setTimeout(fin, 420);
        }
      } else {
        idx = L>0 ? N + (Math.floor((now - tLoop)/1000*fps) % L) : N-1;   // 循環段：一直跑到 close()
      }
      const im = c.imgs[idx];
      ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height);
      if(im){
        ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(im, 0, 0, cv.width, cv.height);
        ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mask, 0, 0, cv.width, cv.height);
        ctx.globalCompositeOperation = 'source-over';
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
