/* ============================================================================
 *  main.js — 啟動掛載點（index.html 以 <script type="module"> 載入）
 *  ---------------------------------------------------------------------------
 *  composition root：串接底層與各模組、注入 combat 的協調 api、綁定按鈕與手勢、
 *  設定開機閒置畫面（首頁 + 背景盤面）。
 *
 *  本輪範圍：combat + enemy + defense（一般怪一場能打完並進結算）。
 *  聖徒化左右滑、生命歸還上滑、雙槍點計量表、換裝面板等綁定為下一輪。
 * ========================================================================== */

import { GAME_CONFIG, asset, ASSETS } from './config.js';
import { state } from './state.js';
import { SFX } from './audio.js';
import * as combat from './modules/combat.js';
import * as saint from './modules/saint.js';
import * as defense from './modules/defense.js';
import * as partner from './modules/partner.js';   // 主動技統一入口 tryActive 由手勢觸發
import * as weapon from './modules/weapon.js';     // 雙槍破防發動 + 換裝面板

import * as inspector from './modules/inspector.js';   // 結算/評價/迎擊分流
import { playTransition } from './modules/transition.js';   // 過渡禎（開始/結束淡入淡出）
import { sakuraBurst } from './modules/sakura.js';   // 開始遊戲：全畫面櫻花飛舞（純程式）
import './modules/enemy.js';

const $ = id => document.getElementById(id);

// 按鈕綁定：touch/click 去重，附選單點擊音
function bindBtn(id, fn){
  const el=$(id); if(!el) return;
  const run=()=>{ SFX.unlock(); SFX.menuClick(); fn(); };
  let h=false;
  el.addEventListener('touchstart',e=>{e.preventDefault();h=true;run();},{passive:false});
  el.addEventListener('click',()=>{ if(h){h=false;return;} run(); });
}

// ── 注入 api、綁定、開機 ──
combat.setup();

// 首次任意手勢即解鎖音訊：主選單 BGM 在 autoplay 被擋下後，玩家一互動就補播（unlock 內處理）
(function primeAudio(){
  const go=()=>{ SFX.unlock(); window.removeEventListener('pointerdown',go); window.removeEventListener('touchstart',go); window.removeEventListener('keydown',go); };
  window.addEventListener('pointerdown', go);
  window.addEventListener('touchstart', go, {passive:true});
  window.addEventListener('keydown', go);
})();

// 普攻槍聲：固定用 Pistol_SE_02（不隨機）
SFX.setShots([asset('se_pistol_02')].filter(Boolean));

/* ── 進場全預載：掃 ASSETS 把所有圖＋音一次載到位，載入畫面跑完才揭開選單 ──
 *  圖 → new Image（瀏覽器快取）；BGM(bgm_*) → Blob 下載；其餘音效 → Web Audio 解碼。
 *  這樣遊戲中不再有臨時讀取間隙。音訊實際播放仍需首次手勢（primeAudio/unlock）。 */
(function preloadAll(){
  const imgs=[], sfx=[], bgm=[];
  for(const k of Object.keys(ASSETS)){
    const v=ASSETS[k]; if(!v) continue;
    if(/\.(png|jpe?g|webp|gif)$/i.test(v)) imgs.push(v);
    else if(/\.(mp3|m4a|ogg|wav)$/i.test(v)){ (k.indexOf('bgm_')===0 ? bgm : sfx).push(v); }
  }
  const total = imgs.length + sfx.length + bgm.length;
  // 載入遮罩（動態建立，無需改 HTML）；最前層、蓋住一切
  const ov=document.createElement('div'); ov.id='assetLoader';
  ov.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;'
    +'align-items:center;justify-content:center;gap:16px;background:#0a0812;color:#d9c68a;'
    +'font-family:inherit;letter-spacing:4px;transition:opacity .5s ease;text-align:center;padding:0 24px;';
  ov.innerHTML='<div id="alMsg" style="font-size:15px">載　入　中</div>'
    +'<div id="alBarWrap" style="width:62%;max-width:300px;height:4px;background:rgba(217,198,138,.18);border-radius:2px;overflow:hidden">'
    +'<i id="assetLoaderBar" style="display:block;height:100%;width:0;background:#d9c68a;transition:width .18s ease"></i></div>'
    +'<div id="assetLoaderPct" style="font-size:11px;opacity:.7">0%</div>';
  document.body.appendChild(ov);
  let done=0;
  const bar=$('assetLoaderBar'), pct=$('assetLoaderPct');
  const tick=()=>{ done++; const p=total?Math.round(done/total*100):100; if(bar)bar.style.width=p+'%'; if(pct)pct.textContent=p+'%'; };
  const imgP = imgs.map(src=>new Promise(res=>{ const im=new Image(); im.onload=im.onerror=()=>{ tick(); res(); }; im.src=src; }));
  const wrapCount = (p, n)=> p.then(()=>{ for(let i=0;i<n;i++) tick(); }).catch(()=>{ for(let i=0;i<n;i++) tick(); });
  const audioP = [ wrapCount(SFX.preload(sfx), sfx.length), wrapCount(SFX.preloadBgm(bgm), bgm.length) ];
  // 載完 → 改「點擊繼續」：這一點＝使用者手勢，解鎖音訊並播 MainMenu，再揭開選單
  let ready=false;
  const showReady=()=>{
    if(ready) return; ready=true;
    const wrap=$('alBarWrap'); if(wrap) wrap.style.display='none';
    const p2=$('assetLoaderPct'); if(p2) p2.style.display='none';
    const msg=$('alMsg'); if(msg){ msg.textContent='點　擊　繼　續'; msg.classList.add('al-pulse'); }
    const go=()=>{
      ov.removeEventListener('click',go); ov.removeEventListener('touchstart',go);
      SFX.unlock();   // 使用者手勢：解鎖音訊 → 主選單 BGM 開始播
      ov.style.opacity='0'; setTimeout(()=>{ if(ov.parentNode) ov.remove(); }, 520);
    };
    ov.addEventListener('click', go);
    ov.addEventListener('touchstart', go, {passive:true});
  };
  Promise.all([...imgP, ...audioP]).then(showReady);
  setTimeout(showReady, 12000);   // 保底：單一資源卡住也不擋整個載入
})();

// 首頁：開始遊戲 → 主選單先淡出、空一拍（約 1s）Battle 才淡入（避免唐突），同時播「驅逐開始」過渡禎
bindBtn('startBtn',     ()=>{
  SFX.play(asset('sfx_start'));
  SFX.playBgm(asset('bgm_battle'), { fadeOutMs:800, delayMs:1000 });
  // 驅逐開始：不靠點擊、不自動計時 → 由櫻花飄完（onDone）主動推進進戰鬥
  const tr = playTransition('start', combat.startGame, { noTap:true, noAuto:true });
  sakuraBurst({ onDone: ()=> tr.proceed() });
});
bindBtn('exitBtn',      showExitConfirm);       // 右上：退出 → 確認對話框（盤面模糊）

// 退出確認：暫停（cutinPlaying）+ 數字盤模糊 + 「回主選單 / 繼續」。回主選單走 goHome（淡出淡入）。
function showExitConfirm(){
  if(state.over || state.cutinPlaying || document.getElementById('exitConfirm')) return;   // 非戰鬥中/演出中/已開 → 略過
  combat.pauseForDialog();                          // 真暫停：凍結攻擊圈縮放 + 碼表 + 停延時懲罰/新大絕/點擊
  const grid=$('grid'); if(grid) grid.classList.add('grid-blur');
  const dlg=document.createElement('div'); dlg.id='exitConfirm';
  dlg.innerHTML='<div class="ec-panel">'
    +'<div class="ec-title">回到主選單？</div>'
    +'<div class="ec-sub">目前這場進度不會保留</div>'
    +'<div class="ec-btns"><button class="ec-no">繼續遊戲</button><button class="ec-yes">回主選單</button></div>'
    +'</div>';
  document.body.appendChild(dlg);
  const close=()=>{ if(dlg.parentNode) dlg.remove(); if(grid) grid.classList.remove('grid-blur'); };
  const bind=(sel,fn)=>{ const b=dlg.querySelector(sel); const run=()=>{ SFX.unlock(); SFX.menuClick(); fn(); };
    b.addEventListener('click',run); b.addEventListener('touchstart',e=>{e.preventDefault();run();},{passive:false}); };
  bind('.ec-no', ()=>{ close(); combat.resumeFromDialog(); });  // 繼續：解除暫停、攻擊圈/碼表接回
  bind('.ec-yes',()=>{ close(); combat.goHome(); });            // 回主選單：goHome 內會清 cutinPlaying + 淡出淡入
}
bindBtn('testClearBtn', combat.testClearBoard); // 左上（測試用）：一鍵清盤
bindBtn('rematchBtn',   inspector.onRematchBtn);// 結算：依 resultMode 分流（再度執槍/迎擊）

// 破防值滿 → 點計量表發動「雙槍破防」獎勵射擊窗口
bindBtn('energyClasp',    weapon.activateDual);
// 首頁換裝面板：副武器（反擊武器）/ 搭檔（本輪顯示層）
bindBtn('pickWeaponBtn',  ()=>weapon.openPickSheet('weapon'));
bindBtn('pickPartnerBtn', ()=>weapon.openPickSheet('partner'));
bindBtn('pickSheetClose', weapon.closePickSheet);
// Credit：BGM 來源
bindBtn('creditBtn',  ()=>{ const s=$('creditSheet'); if(s) s.classList.add('on'); });
bindBtn('creditClose',()=>{ const s=$('creditSheet'); if(s) s.classList.remove('on'); });
// 原作：點下 → 選巴哈 / Penana（新分頁開）
bindBtn('originalBtn',  ()=>{ const s=$('originalSheet'); if(s) s.classList.add('on'); });
bindBtn('originalClose',()=>{ const s=$('originalSheet'); if(s) s.classList.remove('on'); });
weapon.refreshLoadoutLabels();                  // 開機：把當前副武器/搭檔名寫進 loadout 按鈕

window.addEventListener('resize', combat.fitGridSquare);
window.addEventListener('orientationchange', ()=>setTimeout(combat.fitGridSquare,200));

/* ============================================================================
 *  聖徒化手勢
 * ========================================================================== */
// 敵人框左右滑到底 → 發動聖徒化（依方向給橫斬特效）
(function bindSaintSwipe(){
  const zone=$('top');
  if(!zone) return;
  let startX=0, startY=0, tracking=false;
  const THRESH=Math.max(90, window.innerWidth*0.30);   // 需滑到底（約螢幕寬 30% 或 90px）
  zone.addEventListener('touchstart',e=>{
    if(state.saintMode||state.saintUsedThisBattle||state.over||state.cutinPlaying) return;
    const t=e.touches[0]; startX=t.clientX; startY=t.clientY; tracking=true;
  },{passive:true});
  zone.addEventListener('touchmove',e=>{
    if(!tracking) return;
    const t=e.touches[0];
    const dx=t.clientX-startX, dy=t.clientY-startY;
    if(Math.abs(dx)>THRESH && Math.abs(dx)>Math.abs(dy)*1.5){   // 水平滑動為主（避免和捲動混淆）
      tracking=false;
      saint.activateSaint(dx>0?'right':'left');
    }
  },{passive:true});
  zone.addEventListener('touchend',()=>{tracking=false;});
  // 桌機滑鼠拖曳也支援（方便測試）
  let mDown=false;
  zone.addEventListener('mousedown',e=>{
    if(state.saintMode||state.saintUsedThisBattle||state.over||state.cutinPlaying) return;
    mDown=true; startX=e.clientX; startY=e.clientY;
  });
  zone.addEventListener('mousemove',e=>{
    if(!mDown) return;
    const dx=e.clientX-startX, dy=e.clientY-startY;
    if(Math.abs(dx)>THRESH && Math.abs(dx)>Math.abs(dy)*1.5){
      mDown=false;
      saint.activateSaint(dx>0?'right':'left');
    }
  });
  window.addEventListener('mouseup',()=>{mDown=false;});
})();

// 生命歸還（搭檔主動技）：聖徒化中，在上半敵畫面「往上一滑」發動。
//   用專用透明層 #returnSwipe（touch-action:none）；小位移視為點擊 → 放行給底下紅點防禦。
(function bindReturnSwipe(){
  const zone=$('returnSwipe');
  const aura=$('returnAura');
  if(!zone) return;
  let startY=0, startX=0, tracking=false, fired=false, moved=0;
  const need=()=>Math.max(48, (window.innerHeight||600)*0.125);   // 上滑 ≥ 螢幕高 12.5%
  const TAP_SLOP=14;   // 位移小於此值視為「點擊」而非「滑動」

  // 向心聚光：在觸摸點生成一圈向中心收束的光線
  const RAYS=12;
  function showAura(x,y){
    if(!aura) return;
    aura.style.left=x+'px'; aura.style.top=y+'px';
    if(!aura.dataset.built){
      let html='<div class="core"></div>';
      for(let i=0;i<RAYS;i++){
        const a=(360/RAYS)*i;
        html+=`<div class="ray" style="--a:${a}deg;transform:rotate(${a}deg) translateY(76px);animation-delay:${(i%4)*0.08}s"></div>`;
      }
      aura.innerHTML=html; aura.dataset.built='1';
    }
    aura.classList.add('on');
  }
  function hideAura(){ if(aura) aura.classList.remove('on'); }

  // 用座標反查底下的紅點：命中哪個 threat 就化解哪個（圓形命中判定）
  function hitThreatAt(x,y){
    const threats=state.threats;
    if(!threats || !threats.length) return null;
    let best=null, bestD=Infinity;
    for(const th of threats){
      if(!th.el) continue;
      const r=th.el.getBoundingClientRect();
      const cx=r.left+r.width/2, cy=r.top+r.height/2;
      const rad=Math.max(r.width,r.height)/2;
      const d=Math.hypot(x-cx, y-cy);
      if(d<=rad && d<bestD){ best=th; bestD=d; }
    }
    return best;
  }

  function begin(x,y){ startX=x; startY=y; tracking=true; fired=false; moved=0; showAura(x,y); }
  function move(x,y){
    if(!tracking||fired) return;
    moved=Math.max(moved, Math.hypot(x-startX, y-startY));
    if(aura && aura.classList.contains('on')){ aura.style.left=x+'px'; aura.style.top=y+'px'; }
    const up = startY - y;
    if(up > need() && up > Math.abs(x-startX)*1.0){
      fired=true; tracking=false; hideAura();
      // 下滑觸發主動技（情境＝聖徒化內）。能否發、屬於誰由 partner 判定；換 partner 即此技消失。
      partner.tryActive('saint');
    }
  }
  // 抬手：若整段位移很小（點擊而非滑動）→ 放行給底下的紅點防禦
  function end(x,y){
    const wasTracking=tracking;
    tracking=false; hideAura();
    if(wasTracking && !fired && moved < TAP_SLOP){
      const th = hitThreatAt(x, y);
      if(th) defense.resolveThreat(th);   // 聖徒化期間照常點紅點防禦
    }
  }

  zone.addEventListener('touchstart',e=>{ const t=e.touches[0]; begin(t.clientX,t.clientY); }, {passive:true});
  zone.addEventListener('touchmove', e=>{
    const t=e.touches[0];
    // 只有「已判定為上滑」時才 preventDefault 接管；否則保持被動，讓點擊得以判定
    if(tracking && !fired){
      const up=startY-t.clientY;
      if(up > need()*0.5) e.preventDefault();
    }
    move(t.clientX,t.clientY);
  }, {passive:false});
  zone.addEventListener('touchend', e=>{
    const t=(e.changedTouches&&e.changedTouches[0])||{};
    end(t.clientX, t.clientY);
  }, {passive:true});
  zone.addEventListener('touchcancel', ()=>{ tracking=false; hideAura(); }, {passive:true});
  zone.addEventListener('mousedown', e=>begin(e.clientX,e.clientY));
  zone.addEventListener('mousemove', e=>move(e.clientX,e.clientY));
  window.addEventListener('mouseup', e=>end(e.clientX,e.clientY));
})();

/* ── 遠端診斷 HUD：網址帶 ?debug，或「快速連點首頁團徽 5 下」開關 ──
 *  排查 iOS 主畫面 App 底部黑帶用；未觸發時不建立任何元素。 */
(function debugHud(){
  let hud=null, timer=null, probes=null;
  const mk=(css)=>{ const el=document.createElement('div'); el.style.cssText=css; document.body.appendChild(el); return el; };
  function show(){
    if(hud){ [hud,...probes].forEach(e=>e.remove()); hud=null; clearInterval(timer); return; }   // 再觸發一次＝關閉
    const pT=mk('position:fixed;left:0;top:0;width:1px;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none;');
    const pB=mk('position:fixed;left:0;bottom:0;width:1px;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none;');
    const pVH=mk('position:fixed;left:0;top:0;width:1px;height:100vh;visibility:hidden;pointer-events:none;');
    const pDVH=mk('position:fixed;left:0;top:0;width:1px;height:100dvh;visibility:hidden;pointer-events:none;');
    const pLVH=mk('position:fixed;left:0;top:0;width:1px;height:100lvh;visibility:hidden;pointer-events:none;');
    const pSVH=mk('position:fixed;left:0;top:0;width:1px;height:100svh;visibility:hidden;pointer-events:none;');
    probes=[pT,pB,pVH,pDVH,pLVH,pSVH];
    hud=mk('position:fixed;left:6px;bottom:6px;z-index:99998;font:11px/1.6 monospace;color:#4f4;background:rgba(0,0,0,.72);padding:5px 8px;pointer-events:none;white-space:pre;border-radius:4px;');
    const upd=()=>{
      const b=document.body.getBoundingClientRect();
      hud.textContent=
        'inner  '+innerWidth+'x'+innerHeight
        +'\nvisual '+Math.round(visualViewport.width)+'x'+Math.round(visualViewport.height)
        +'\nscreen '+screen.width+'x'+screen.height+'  outer '+outerHeight
        +'\nbody   '+Math.round(b.width)+'x'+Math.round(b.height)
        +'\nvh '+pVH.offsetHeight+' dvh '+pDVH.offsetHeight+' lvh '+pLVH.offsetHeight+' svh '+pSVH.offsetHeight
        +'\nsafe   top '+pT.offsetHeight+' / bottom '+pB.offsetHeight
        +'\nstandalone '+(navigator.standalone===true || (window.matchMedia&&matchMedia('(display-mode: standalone)').matches));
    };
    upd(); timer=setInterval(upd,1000);
  }
  // 觸發一：網址帶 ?debug
  if(location.search.indexOf('debug')>=0) show();
  // 觸發二：首頁團徽快速連點 5 下（主畫面 App 進不了帶參數網址時用）
  let taps=0, tapTimer=null;
  const emblem=$('homeEmblem');
  if(emblem){
    const onTap=()=>{ taps++; clearTimeout(tapTimer); tapTimer=setTimeout(()=>{taps=0;},1500);
      if(taps>=5){ taps=0; show(); } };
    emblem.addEventListener('click', onTap);
    emblem.addEventListener('touchstart', onTap, {passive:true});
  }
})();

combat.bootIdle();   // over=true，建立背景盤面/血條，停在首頁

console.log('[step8] 連戰 lineup 已接上（局內多敵：faceless→facelessgiant）· 首敵：', GAME_CONFIG.enemies[GAME_CONFIG.lineup[0]]?.name, '· HP', state.enemyMax);
