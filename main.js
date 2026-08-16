/* ============================================================================
 *  main.js — 啟動掛載點（index.html 以 <script type="module"> 載入）
 *  ---------------------------------------------------------------------------
 *  composition root：串接底層與各模組、注入 combat 的協調 api、綁定按鈕與手勢、
 *  設定開機閒置畫面（首頁 + 背景盤面）。
 *
 *  本輪範圍：combat + enemy + defense（一般怪一場能打完並進結算）。
 *  聖徒化左右滑、生命歸還上滑、雙槍點計量表、換裝面板等綁定為下一輪。
 * ========================================================================== */

import { GAME_CONFIG, VERSION, asset, ASSETS, bgmVol, sfxGain } from './config.js';
import { L, LANG, applyToConfig, applyToDom, decorateLine } from './i18n.js';   // 多語言＋台詞關鍵字裝飾
import { state } from './state.js';
import { SFX } from './audio.js';
import { TEL } from './telemetry.js';   // 遙測（未設定後端時 no-op）
import * as combat from './modules/combat.js';
import * as saint from './modules/saint.js';
import * as defense from './modules/defense.js';
import * as partner from './modules/partner.js';   // 主動技統一入口 tryActive 由手勢觸發
import * as weapon from './modules/weapon.js';     // 雙槍破防發動 + 換裝面板

import * as inspector from './modules/inspector.js';   // 結算/評價/迎擊分流
import * as tutorial from './modules/tutorial.js';     // 首頁「教學」鈕：下一場強制進教學
import { playTransition } from './modules/transition.js';   // 過渡禎（開始/結束淡入淡出）
import { sakuraBurst } from './modules/sakura.js';   // 開始遊戲：全畫面櫻花飛舞（純程式）
import './modules/enemy.js';

const $ = id => document.getElementById(id);

// ── 多語言：最先套用（先於載入畫面/任何字串讀取）──
//    config 內容字串就地覆寫 + index.html 靜態文字置換；語言切換＝首頁鈕→重載生效
applyToConfig(GAME_CONFIG);
applyToDom();

/* ── 首頁主標單行自適應：主標鎖單行（white-space:nowrap），但各語言長度差異大
 *    （en「The IV Order of Testament」遠長於中日七字），clamp 下限在窄機仍可能溢出
 *    → 以實測 scrollWidth 逐級縮字到放得下為止；字體載完/轉向後重算。 */
(function fitHomeTitle(){
  const fit=()=>{
    const el=document.querySelector('#home .title');
    if(!el || !el.parentElement) return;
    el.style.fontSize='';                                   // 還原 CSS clamp 基準再量
    // ⚠ #home 為 flex 直欄：溢出的 nowrap 子項會撐成 max-content（scrollWidth==clientWidth）
    //   → 以父容器寬為準比對，留 36px 呼吸邊（貼滿整寬觀感差；en 另有字距收窄配套）
    const maxW=()=>el.parentElement.clientWidth-36;
    let size=parseFloat(getComputedStyle(el).fontSize)||34;
    let guard=30;                                           // 保險：最多縮 30 級
    while(el.getBoundingClientRect().width>maxW() && size>13 && guard-->0){
      size-=1; el.style.fontSize=size+'px';
    }
  };
  fit();
  window.addEventListener('resize', fit);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();

/* ── iOS PWA（加到主畫面）版面高度怪癖 ──
 *  standalone 啟動瞬間 100%/100dvh 可能取到舊視口值且不重算，底部留一條畫不到的黑帶。
 *  以 JS 實測 innerHeight 直寫 html/body 高度（inline style 優先權最高），
 *  並於旋轉/回前台/視口變化時同步；啟動後再補測一次補救慢一拍的取值。 */
(function syncAppHeight(){
  const sync=()=>{ const h=window.innerHeight;
    if(h>0){ document.documentElement.style.height=h+'px'; document.body.style.height=h+'px';
      // --appvh＝實測視窗高的 1%：iOS Safari 的 vh 恆取「大視口」（不扣網址列/工具列），
      // 首頁直式版面的垂直間距一律用它換算，瀏覽器內開啟才不會下緣爆版（見 #home 系列規則）
      document.documentElement.style.setProperty('--appvh',(h/100)+'px'); } };
  sync();
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', ()=>setTimeout(sync,300));
  window.addEventListener('pageshow', sync);
  if(window.visualViewport) window.visualViewport.addEventListener('resize', sync);
  setTimeout(sync, 600);
})();

/* ── 全域禁圖片拖拉（JS 保險層）──
 *  桌機滑鼠在 <img> 上按住拖動會啟動原生 drag → pointer 事件被取消，滑動手勢
 *  （聖徒化左右滑/生命歸還上滑/選單換卡）中斷。CSS user-drag 蓋主流瀏覽器，
 *  Firefox 不支援該屬性 → 一律再攔 dragstart。 */
document.addEventListener('dragstart', e=>{
  if(e.target && e.target.tagName==='IMG') e.preventDefault();
});

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

// 全域主音量（tuning.masterVolume＝0.7）：先於任何預載/BGM 起播套用
SFX.setMasterVolume(GAME_CONFIG.tuning.masterVolume != null ? GAME_CONFIG.tuning.masterVolume : 1);

// 普攻槍聲：固定用 Pistol_SE_03（不隨機）
SFX.setShots([asset('se_pistol_03')].filter(Boolean), sfxGain('se_pistol_03'));
// 通用按鈕音：所有未指定音效的按鈕（bindBtn/選單/對話推進 → SFX.menuClick）＝GeneralClick_SE
SFX.setMenuClick(asset('se_general_click'), sfxGain('se_general_click'));

/* ── 進場預載（第一段）：掃 ASSETS 載「開場就要」的圖＋音，跑完才揭開選單 ──
 *  第一段內依序讓路：監察官立繪（門面最優先）→ 關鍵音效（SI_01/Start_01）→ 批次段，
 *  見下方 portraitP/critP。
 *  圖 → new Image（瀏覽器快取）；BGM(bgm_*) → Blob 下載；其餘音效 → Web Audio 解碼。
 *  音訊實際播放仍需首次手勢（primeAudio/unlock）。
 *  ⚠ 分兩段載：結算/失敗/Boss BGM 開戰前用不到（最快也在一場戰鬥之後），
 *    不揹進第一段 → 進度條輕量誠實跑完，不再被 12s 保底提前放行。
 *    第二段於「點擊繼續」進主選單當下背景開載（出陣時再補一次保險）；
 *    playBgm 本身會 ensureBlob 隨叫隨載，第二段沒載完頂多晚幾拍起播，不會壞。 */
const LATE_BGM_PATHS = ['bgm_result','bgm_lose','bgm_boss'].map(k=>ASSETS[k]).filter(Boolean);
let _lateBgmKicked = false;
function preloadLateBgm(){
  if(_lateBgmKicked) return; _lateBgmKicked = true;
  SFX.preloadBgm(LATE_BGM_PATHS);   // 背景載，不擋任何流程；ensureBlob 有快取可重複呼叫
}
(function preloadAll(){
  const imgs=[], sfx=[], bgm=[];
  for(const k of Object.keys(ASSETS)){
    const v=ASSETS[k]; if(!v) continue;
    // 副檔名判斷容許 ?v=N 版本參數（素材內容更新時升版強制重抓，見 config ASSETS 註解）
    if(/\.(png|jpe?g|webp|gif)(\?|$)/i.test(v)) imgs.push(v);
    else if(/\.(mp3|m4a|ogg|wav)(\?|$)/i.test(v)){
      if(k.indexOf('bgm_')===0){ if(LATE_BGM_PATHS.indexOf(v)<0) bgm.push(v); }
      else sfx.push(v);
    }
  }
  const total = imgs.length + sfx.length + bgm.length;
  /* 載入遮罩（動態建立，樣式集中在 style.css 的 #assetLoader 區）：
   *  頂部細讀取條＋百分比 → 不佔畫面；中下方監察官立繪＋對話框輪播教學 Hint
   *  （隨機不重複、整句淡入停 5 秒淡出，不用打字機）→ 讀取時間不再乾等。 */
  const RING_C = 301.59;   // SVG 進度圓周長（r=48, viewBox 100）
  const ov=document.createElement('div'); ov.id='assetLoader';
  ov.innerHTML=
     '<div id="alRing">'
    +  '<svg viewBox="0 0 100 100"><circle class="al-rail" cx="50" cy="50" r="48"/>'
    +  '<circle id="alRingProg" class="al-prog" cx="50" cy="50" r="48" stroke-dasharray="'+RING_C+'" stroke-dashoffset="'+RING_C+'"/></svg>'
    +  '<div id="alRingTxt"><div id="assetLoaderPct">0%</div><div id="alRingCap">Saint Installation</div></div>'
    +'</div>'
    +'<div id="alStage"><img id="alPortrait" alt="">'
    +  '<div id="alBubble"><div class="al-name"></div><div class="al-hint" id="alHint"></div></div>'
    +'</div>'
    +'<div id="alMsg">'+L.loading.loadingMsg+'</div>'
    // 語言切換鈕（讀取畫面版）：與首頁 #langBtn 同款同位，載入中即可切換（bindLangBtn 一併綁定）
    +'<button id="alLangBtn" aria-label="Language"></button>';
  document.body.appendChild(ov);
  /* 金色光圈對位：與首頁紋章外圓重合（圈徑≈紋章圖寬的 0.8）。
   *  首頁 bootIdle 於本模組尾端才掛 .on、紋章圖片也要載入才有高度 → 輪詢到量得到為止；
   *  量不到前用 CSS 預設位置（水平置中、上緣 23%）保底。 */
  function placeRing(){
    const ring=$('alRing'); if(!ring || !ring.parentNode) return;
    const em=$('homeEmblem');
    const r=em ? em.getBoundingClientRect() : null;
    // ⚠ 須等紋章「圖片本體」載完才量（naturalWidth>0）：載入中高度是佔位值，
    //   圈會定錨在錯誤中心且不再修正。視窗變化（旋轉/工具列收合）亦重貼。
    if(r && r.width>10 && r.height>10 && em.complete && em.naturalWidth>0){
      const d=Math.round(r.width*0.8);
      ring.style.width=d+'px'; ring.style.height=d+'px';
      ring.style.left=Math.round(r.left+r.width/2)+'px';
      ring.style.top =Math.round(r.top +r.height/2)+'px';
    } else setTimeout(placeRing, 120);
  }
  placeRing();
  window.addEventListener('resize', placeRing);
  // 監察官立繪與名字（沿用結算的 Freya 資源；讀 config 不寫死）
  //   立繪＝載入畫面的門面，全站最優先：載完（或 4s 保底）才輪到關鍵音效、再輪到整批。
  let portraitP = Promise.resolve();
  {
    const insp=(GAME_CONFIG.inspectors||{}).freya||{};
    const img=$('alPortrait'); const nm=ov.querySelector('.al-name');
    if(nm) nm.textContent=insp.name||'';
    const psrc=asset(insp.image);
    if(img && psrc){
      portraitP = new Promise(res=>{
        img.fetchPriority='high';   // 壓過 HTML 預掃到的其他 <img>（徽記/敵人立繪），確保她真的第一
        img.onload=()=>{ img.classList.add('on'); res(); };
        img.onerror=()=>res();
        img.src=psrc;
        setTimeout(res, 4000);   // 保底：立繪卡住也不無限擋住後續音效/批次
      });
    }
  }
  // Hint 輪播：洗牌後依序循環（=隨機且整輪不重複），淡入 → 停 hold → 淡出 → 換句
  let hintTimer=null;
  {
    const list=(GAME_CONFIG.loadingHints||[]).slice();
    for(let i=list.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; [list[i],list[j]]=[list[j],list[i]]; }
    const HOLD=GAME_CONFIG.tuning.loadingHintHoldMs, FADE=GAME_CONFIG.tuning.loadingHintFadeMs;
    const el=$('alHint'); let hi=0;
    const cycle=()=>{
      if(!el || !list.length) return;
      el.innerHTML=decorateLine(list[hi++ % list.length]);   // 關鍵字（聖徒化）金色粗字
      el.classList.add('show');                       // 淡入（CSS transition）
      hintTimer=setTimeout(()=>{
        el.classList.remove('show');                  // 淡出
        hintTimer=setTimeout(cycle, FADE+50);
      }, HOLD);
    };
    cycle();
  }
  /* 預載優先順序（定案）：立繪 → MainMenu 音樂 → 音效 → 整批。
   *  每段各帶 4s 保底：卡住也不無限擋下一段。load()/ensureBlob 以快取去重，
   *  稍後批次再含同檔也不會重抓。 */
  // 第二優先：MainMenu BGM（點擊繼續當下就要起播，Blob 先到位才無縫）
  const menuBgmP = portraitP.then(()=> Promise.race([
    SFX.preloadBgm([asset('bgm_home')].filter(Boolean)),
    new Promise(r=>setTimeout(r, 4000)),
  ]));
  // 第三優先：關鍵音效——SI_01（出陣鈕/測試解鎖回饋）＋ Start_01（武器選單換卡/一般再度執槍）
  //   ＋ StartBT_SE（執槍/overkill/Boss S 第一按）。批次 ~20MB 同時開跑會搶頻寬，
  //   慢網下 12s 保底放行時反而還沒就緒 → 點下去沒聲音，故單獨先載。
  const critP = menuBgmP.then(()=> Promise.race([
    SFX.preload([asset('sfx_saint'), asset('sfx_start'), asset('sfx_startbt')]),
    new Promise(r=>setTimeout(r, 4000)),
  ]));
  let done=0;
  const prog=$('alRingProg'), pct=$('assetLoaderPct');
  const tick=()=>{ done++; const p=total?Math.round(done/total*100):100;
    if(prog) prog.style.strokeDashoffset=(RING_C*(1-p/100)).toFixed(1);   // 沿光圈順時針推進
    if(pct) pct.textContent=p+'%'; };
  // 載完 → 改「點擊繼續」：這一點＝使用者手勢，解鎖音訊並播 MainMenu，再揭開選單
  let ready=false;
  const showReady=()=>{
    if(ready) return; ready=true;
    // 讀取完成：進度圈補滿、字樣改 Complete、整圈轉為常亮發光（.al-done，見 style.css）
    if(prog) prog.style.strokeDashoffset='0';
    if(pct) pct.style.display='none';
    const cap=$('alRingCap'); if(cap) cap.textContent='Complete';
    ov.classList.add('al-done');
    const msg=$('alMsg'); if(msg){ msg.textContent=L.loading.tapContinue; msg.classList.add('al-pulse'); }
    // Hint 輪播不停：載完後玩家未點擊前繼續輪教學
    const go=()=>{
      ov.removeEventListener('click',go); ov.removeEventListener('touchstart',go);
      clearTimeout(hintTimer);   // 停輪播
      SFX.unlock();   // 使用者手勢：解鎖音訊 → 主選單 BGM 開始播
      // 讀取頁揭幕不再播 SE（原 SI_01 撤下；聖徒 stinger 移到出陣鈕）
      preloadLateBgm();   // 第二段：進主選單即背景載 結算/失敗/Boss BGM
      // 聖光綻放：暖金白光暈自光圈中心緩慢擴張（無光束）→
      //   2.5s 光暈實心蓋滿時撤遮罩 → 1.2s 淡出揭開主選單（總長 ≈3.7s，與 SI_01 等長連動）
      const ring=$('alRing');
      const rr=ring ? ring.getBoundingClientRect() : null;
      const cx=rr ? rr.left+rr.width/2 : innerWidth/2;
      const cy=rr ? rr.top +rr.height/2 : innerHeight*0.25;
      const d =rr ? rr.width : 200;
      // 覆蓋全畫面所需直徑（光圈中心到最遠角 ×2）；光暈實心區佔 30% → 除以 0.30 保證實心蓋滿
      const need=2*Math.hypot(Math.max(cx,innerWidth-cx), Math.max(cy,innerHeight-cy));
      const fl=document.createElement('div'); fl.id='alFlash';
      fl.innerHTML='<div class="fl-glow"></div>';
      fl.style.left=cx+'px'; fl.style.top=cy+'px'; fl.style.width=d+'px'; fl.style.height=d+'px';
      fl.style.setProperty('--fl-scale', (need/d/0.30).toFixed(2));
      document.body.appendChild(fl);
      requestAnimationFrame(()=>fl.classList.add('grow'));
      setTimeout(()=>{ if(ov.parentNode) ov.remove(); fl.classList.add('fade'); }, 2500);  // 光暈蓋滿 → 撤遮罩、開始淡出
      setTimeout(()=>{ if(fl.parentNode) fl.remove(); }, 3800);                            // 聖光淡出完 → 清掉
    };
    ov.addEventListener('click', go);
    ov.addEventListener('touchstart', go, {passive:true});
  };
  // 批次段：等「立繪 → 關鍵音效」依序就緒才開跑（兩段各有 4s 保底）。
  //   12s 保底自批次開跑起算：單一資源卡住也不擋整個載入。
  const startBatch=()=>{
    // 主選單 BGM 掛播（自 combat.bootIdle 移來）：ensureBlob 自此才開抓，不再搶關鍵段頻寬；
    //   實際起播等 go() 手勢 unlock 補播，時序與原本相同。
    SFX.playBgm(asset('bgm_home'), { volume: bgmVol('bgm_home') });
    const imgP = imgs.map(src=>new Promise(res=>{ const im=new Image(); im.onload=im.onerror=()=>{ tick(); res(); }; im.src=src; }));
    const wrapCount = (p, n)=> p.then(()=>{ for(let i=0;i<n;i++) tick(); }).catch(()=>{ for(let i=0;i<n;i++) tick(); });
    const audioP = [ wrapCount(SFX.preload(sfx), sfx.length), wrapCount(SFX.preloadBgm(bgm), bgm.length) ];
    Promise.all([...imgP, ...audioP]).then(showReady);
    setTimeout(showReady, 12000);
  };
  critP.then(startBatch);
})();

// 首頁：開始遊戲 → 主選單先淡出、空一拍（約 1s）Battle 才淡入（避免唐突），同時播「驅逐開始」過渡禎
function launchBattle(){
  // 出陣 stinger（sfx_startbt＝StartBT_SE 神楽鈴）：列第一梯關鍵預載（見 preloadAll critP）→ 即點即響。
  SFX.play(asset('sfx_startbt'), sfxGain('sfx_startbt'));
  preloadLateBgm();   // 保險：若保底提前放行沒經過 go()，出陣（櫻花期間）補載第二段
  SFX.playBgm(asset('bgm_battle'), { fadeOutMs:800, delayMs:1000, volume: bgmVol('bgm_battle') });
  // 驅逐開始：不靠點擊、不自動計時 → 由櫻花飄完（onDone）主動推進進戰鬥
  const tr = playTransition('start', combat.startGame, { noTap:true, noAuto:true });
  sakuraBurst({ onDone: ()=> tr.proceed() });
}
// 出陣 → 出擊整備頁（搭檔卡/武器卡確認）→「執槍」才真正進戰鬥（櫻花＋過渡禎）
/* 轉場粒子：畫面下方飄起金色光點後飄散（樣式見 style.css .gold-rise；粒子參數行內隨機） */
function goldSparkRise(){
  const layer=document.createElement('div');
  layer.className='gold-rise';
  document.body.appendChild(layer);
  for(let i=0;i<26;i++){
    const p=document.createElement('i');
    const sz=2+Math.random()*4;
    p.style.width=sz+'px'; p.style.height=sz+'px';
    p.style.left=(Math.random()*100)+'%';
    p.style.setProperty('--dx', ((Math.random()*2-1)*70).toFixed(0)+'px');   // 水平飄散
    p.style.setProperty('--rise', (40+Math.random()*45).toFixed(0)+'vh');    // 升幅
    p.style.animationDuration=(1.2+Math.random()*1.4).toFixed(2)+'s';
    p.style.animationDelay=(Math.random()*0.5).toFixed(2)+'s';
    layer.appendChild(p);
  }
  setTimeout(()=>{ if(layer.parentNode) layer.remove(); }, 3400);
}
let prepCloseTimer=null, prepVisTimer=null;
function openPrep(){
  // 出陣 stinger：SI_01（列關鍵預載 critP → 即點即響）
  SFX.play(asset('sfx_saint'));
  weapon.refreshLoadoutLabels();
  const s=$('prepSheet'); if(!s) return;
  clearTimeout(prepCloseTimer);
  s.classList.add('on');
  // 掛載後下一拍再開透明度 → 淡入（用 setTimeout 非 rAF：隱藏分頁 rAF 不執行）
  clearTimeout(prepVisTimer);
  prepVisTimer=setTimeout(()=>{ if(s.classList.contains('on')) s.classList.add('vis'); }, 30);
  goldSparkRise();   // 轉場：下方飄起金色光點
}
function closePrep(){
  const s=$('prepSheet'); if(!s) return;
  clearTimeout(prepVisTimer);   // 開後極速關（30ms 內）：取消待掛的 vis，防淡入晚到把頁面蓋回來
  s.classList.remove('vis');    // 先淡出
  clearTimeout(prepCloseTimer);
  prepCloseTimer=setTimeout(()=>{ if(!s.classList.contains('vis')) s.classList.remove('on'); }, 420);
}
bindBtn('startBtn', ()=>{
  // 首次出陣（未看過教學）：跳過整備頁直接進教學——裝備固定預設，整備此時無意義
  if(tutorial.isFirstRun()){ launchBattle(); return; }
  openPrep();
});
// 教學「跳過」確認按「是」的去向：轉進出擊整備頁（openPrep 內播 SI_01）
tutorial.setMenuApi({ openPrep });
bindBtn('prepBack', closePrep);
bindBtn('prepGo', ()=>{ closePrep(); launchBattle(); });
// 首頁「教學」鈕：強制下一場進教學（不動已看旗標），不經整備頁直接出陣
bindBtn('tutorialBtn', ()=>{ tutorial.requestReplay(); launchBattle(); });

/* ── 語言切換鈕（zh→en→ja 循環）──
 *  鈕面顯示「按下會切換到的下一個語言」，且用該語言自己的文字——
 *  中文介面時顯示 En（給英文使用者認）、英文時顯示 日本語、日文時顯示 中文。
 *  選擇存 localStorage('tivot.lang')，按下重載生效（僅首頁可按，無戰局可失）。 */
(function bindLangBtn(){
  const LANGS=['zh','en','ja'];
  const NEXT_FACE={ zh:'En', en:'日本語', ja:'中文' };   // 鈕面＝下一個語言的自稱
  const KEY='tivot.lang';
  let cur = LANG;                        // 現行語言（含地區偵測結果；手選後 LANG 即讀 localStorage）
  if(LANGS.indexOf(cur)<0) cur='zh';
  const btns=[$('langBtn'), $('alLangBtn')].filter(Boolean);   // 首頁鈕＋讀取畫面鈕（同步鈕面）
  const paint=()=>{ btns.forEach(b=>{ b.textContent=NEXT_FACE[cur]; }); };
  paint();
  const cycle=()=>{
    cur=LANGS[(LANGS.indexOf(cur)+1)%LANGS.length];
    try{ localStorage.setItem(KEY, cur); }catch(e){}
    paint();
    setTimeout(()=>location.reload(), 150);
  };
  bindBtn('langBtn', cycle);
  // 讀取畫面版：自綁（不經 bindBtn）——須 stopPropagation，否則點擊會冒泡到
  // 遮罩的「點擊繼續」監聽（載完後）誤觸揭幕
  const al=$('alLangBtn');
  if(al){
    let h=false;
    al.addEventListener('touchstart',e=>{ e.preventDefault(); e.stopPropagation(); h=true; SFX.unlock(); SFX.menuClick(); cycle(); },{passive:false});
    al.addEventListener('click',e=>{ e.stopPropagation(); if(h){h=false;return;} SFX.unlock(); SFX.menuClick(); cycle(); });
  }
})();
bindBtn('exitBtn',      showExitConfirm);       // 右上：退出 → 確認對話框（盤面模糊）

// 退出確認：暫停（cutinPlaying）+ 數字盤模糊 + 「回主選單 / 繼續」。回主選單走 goHome（淡出淡入）。
function showExitConfirm(){
  // 非戰鬥中/演出中/已開 → 略過；例外：教學對話暫停中（tutorialDialog）仍可按退出
  if(state.over || (state.cutinPlaying && !state.tutorialDialog) || document.getElementById('exitConfirm')) return;
  combat.pauseForDialog();                          // 真暫停：凍結攻擊圈縮放 + 碼表 + 停延時懲罰/新大絕/點擊（教學中已暫停＝冪等）
  document.body.classList.add('dlg-pause');         // 凍結底層警戒脈動（防 iOS 合成假影，見 style.css）
  const grid=$('grid'); if(grid) grid.classList.add('grid-blur');
  const dlg=document.createElement('div'); dlg.id='exitConfirm';
  dlg.innerHTML='<div class="ec-panel">'
    +'<div class="ec-title">'+L.exitConfirm.title+'</div>'
    +'<div class="ec-sub">'+L.exitConfirm.sub+'</div>'
    +'<div class="ec-btns"><button class="ec-no">'+L.exitConfirm.stay+'</button><button class="ec-yes">'+L.exitConfirm.leave+'</button></div>'
    +'</div>';
  document.body.appendChild(dlg);
  const close=()=>{ if(dlg.parentNode) dlg.remove(); if(grid) grid.classList.remove('grid-blur');
    if(!state.tutorialDialog) document.body.classList.remove('dlg-pause'); };   // 教學對話仍開著 → dlg-pause 交還教學層
  const bind=(sel,fn)=>{ const b=dlg.querySelector(sel); const run=()=>{ SFX.unlock(); SFX.menuClick(); fn(); };
    b.addEventListener('click',run); b.addEventListener('touchstart',e=>{e.preventDefault();run();},{passive:false}); };
  // 繼續：解除暫停、攻擊圈/碼表接回；教學對話中按下＝回到教學暫停（不解除，由教學收段時解除）
  bind('.ec-no', ()=>{ close(); if(!state.tutorialDialog) combat.resumeFromDialog(); });
  bind('.ec-yes',()=>{ close(); combat.goHome(); });            // 回主選單：goHome 內會清 cutinPlaying + 淡出淡入
}
bindBtn('testClearBtn', combat.testClearBoard); // 左上（測試用）：一鍵清盤
bindBtn('rematchBtn',   inspector.onRematchBtn);// 結算：依 resultMode 分流（再度執槍/迎擊）

// 破防值滿 → 點計量表發動「雙槍破防」獎勵射擊窗口
bindBtn('energyClasp',    weapon.activateDual);
// 出擊整備頁的換裝入口：副武器（全螢幕卡疊，上下滑）/ 搭檔（全螢幕卡疊，左右滑）——關閉鈕各自於 sheet 內綁定
bindBtn('prepWeaponCard',  ()=>weapon.openPickSheet('weapon'));
bindBtn('prepPartnerCard', ()=>weapon.openPickSheet('partner'));
// Credit：BGM 來源
bindBtn('creditBtn',  ()=>{ const s=$('creditSheet'); if(s) s.classList.add('on'); });
bindBtn('creditClose',()=>{ const s=$('creditSheet'); if(s) s.classList.remove('on'); });
// 原作：點下 → 選巴哈 / Penana（新分頁開）；外連點擊上報（統計哪個平台被點）
bindBtn('originalBtn',  ()=>{ const s=$('originalSheet'); if(s) s.classList.add('on'); });
bindBtn('originalClose',()=>{ const s=$('originalSheet'); if(s) s.classList.remove('on'); });
document.querySelectorAll('#originalSheet .os-link').forEach(a=>{
  a.addEventListener('click', ()=>TEL.originalClick(a.textContent.trim()));
});
// 後臺統計（管理員限定）：同分頁開 stats.html（新分頁在 iOS PWA 會被丟到外部瀏覽器回不來；
// stats.html 有「返回主頁」鈕走回 ./）。
// 顯示條件＝body.testmode（本場清盤鈕手勢解鎖後才出現，重整即隱藏）——嚴格綁定清盤鈕：
// 沒看到清盤鈕就不會看到後臺鈕，一般使用者無從誤入。裝置的永久簽名（localStorage）
// 只作遙測排除，不再於開機時直接顯示後臺鈕；已簽裝置要進後臺，每場重做解鎖手勢即可。
bindBtn('statsBtn', ()=>{ window.location.href = 'stats.html'; });
weapon.refreshLoadoutLabels();                  // 開機：把當前副武器/搭檔名寫進 loadout 按鈕
TEL.visit();                                    // 來訪上報（每次開頁一筆）
// 版本號不上首頁：於「連點團徽 5 下」的診斷 HUD 內顯示（見 debugHud）

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

// 搭檔主動技（一般盤面情境）：非聖徒化時，在敵人畫面「由下往上滑」發動 tryActive('board')。
//   （馬季諾「前線補給」等 context:'board'/'any' 技的入口。聖徒化期間 #returnSwipe 手勢層
//    蓋在最上層接管上滑 → 走 tryActive('saint')，兩入口互不重疊。）
//   點紅點防禦不受影響：紅點自帶 touchstart/click；此處為 passive 監聽、只在明確上滑時觸發。
(function bindBoardActiveSwipe(){
  const zone=$('top');
  if(!zone) return;
  let startX=0, startY=0, tracking=false;
  const need=()=>Math.max(48, (window.innerHeight||600)*0.125);   // 上滑 ≥ 螢幕高 12.5%（同生命歸還手勢）
  const canTrack=()=>!(state.over||state.saintMode||state.cutinPlaying||state.transitioning);
  zone.addEventListener('touchstart',e=>{
    if(!canTrack()) return;
    const t=e.touches[0]; startX=t.clientX; startY=t.clientY; tracking=true;
  },{passive:true});
  zone.addEventListener('touchmove',e=>{
    if(!tracking) return;
    const t=e.touches[0];
    const up=startY-t.clientY;
    if(up>need() && up>Math.abs(t.clientX-startX)*1.0){
      tracking=false;
      partner.tryActive('board');   // 能否發、屬於誰由 partner 判定（renee 無 board 技 → no-op）
    }
  },{passive:true});
  zone.addEventListener('touchend',()=>{tracking=false;});
  // 桌機滑鼠拖曳也支援（方便測試）
  let mDown=false;
  zone.addEventListener('mousedown',e=>{
    if(!canTrack()) return;
    mDown=true; startX=e.clientX; startY=e.clientY;
  });
  zone.addEventListener('mousemove',e=>{
    if(!mDown) return;
    const up=startY-e.clientY;
    if(up>need() && up>Math.abs(e.clientX-startX)*1.0){
      mDown=false;
      partner.tryActive('board');
    }
  });
  window.addEventListener('mouseup',()=>{mDown=false;});
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
    /* ⚠ HUD 放畫面上方：若底部黑帶是 iOS 蓋在頁面上的遮罩，貼底定位會被埋進黑帶看不到 */
    hud=mk('position:fixed;left:6px;top:calc(env(safe-area-inset-top,0px) + 8px);z-index:99998;font:11px/1.6 monospace;color:#4f4;background:rgba(0,0,0,.72);padding:5px 8px;pointer-events:none;white-space:pre;border-radius:4px;');
    const upd=()=>{
      const b=document.body.getBoundingClientRect();
      hud.textContent=
        VERSION
        +'\ninner  '+innerWidth+'x'+innerHeight
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
  //   ⚠ #homeEmblem 有 pointer-events:none（防拖曳），事件會穿透到 #home →
  //     改在 #home 上事件委派計數，點到按鈕（出陣/換裝/Credit/原作）不算。
  //   ⚠ 觸控裝置一次實體點擊連發 touchstart+click 兩事件 → touched 旗標去重，
  //     否則一下算兩下，HUD 開了又關（看起來像沒反應）。
  let taps=0, tapTimer=null, touched=false;
  const homeEl=$('home');
  if(homeEl){
    const count=(e)=>{ if(e.target && e.target.closest && e.target.closest('button')) return;
      taps++; clearTimeout(tapTimer); tapTimer=setTimeout(()=>{taps=0;},1500);
      if(taps>=5){ taps=0; show(); } };
    homeEl.addEventListener('touchstart', e=>{ touched=true; count(e); }, {passive:true});
    homeEl.addEventListener('click', e=>{ if(touched){ touched=false; return; } count(e); });
  }
})();

/* ── 清盤鈕手勢解鎖：首頁「團徽上畫一個圓 → 10 秒內橫向劃過『聖約第四騎士團』字樣」
 *    → 播 SI_01 作解鎖回饋、body.testmode 開啟 → 進戰鬥後左上「清盤」鈕才顯示
 *    （#testClearBtn 預設 display:none，見 style.css）。重整頁面即恢復隱藏。
 *    偵測從寬：圓＝繞路徑質心累積轉角 ≥300°、頭尾收攏、範圍 ≥40px 且圓心落在團徽附近；
 *    橫劃＝水平位移 ≥ 標題寬 60%、垂直偏移 ≤60px、高度落在字樣帶 ±40px（左右方向皆可）。 */
(function testUnlockGesture(){
  const homeEl=$('home'); if(!homeEl) return;
  homeEl.style.touchAction='none';   // 拖曳穩定送 pointermove（首頁本就不捲動，不影響按鈕點擊）
  let pts=null, pid=null, circleAt=0;
  const isCircle=(path)=>{
    if(path.length<10) return false;
    let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9,cx=0,cy=0;
    for(const p of path){ minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x);
      minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y); cx+=p.x; cy+=p.y; }
    cx/=path.length; cy/=path.length;
    const w=maxX-minX, h=maxY-minY;
    if(w<40||h<40) return false;
    const s=path[0], t=path[path.length-1];
    if(Math.hypot(t.x-s.x,t.y-s.y) > Math.max(w,h)*0.45) return false;   // 頭尾要收攏才算閉合
    const em=$('homeEmblem'), er=em?em.getBoundingClientRect():null;
    if(er && er.width>10){ const pad=er.width*0.5;   // 圓心須落在團徽附近（放寬半個徽寬）
      if(cx<er.left-pad||cx>er.right+pad||cy<er.top-pad||cy>er.bottom+pad) return false; }
    let sweep=0, prev=Math.atan2(path[0].y-cy,path[0].x-cx);
    for(let i=1;i<path.length;i++){ const a=Math.atan2(path[i].y-cy,path[i].x-cx);
      let d=a-prev; if(d>Math.PI)d-=2*Math.PI; if(d<-Math.PI)d+=2*Math.PI; sweep+=d; prev=a; }
    return Math.abs(sweep) >= Math.PI*5/3;   // 累積轉角 ≥300°（順逆時針皆可）
  };
  const isTitleSwipe=(path)=>{
    const tl=homeEl.querySelector('.title'), tr=tl?tl.getBoundingClientRect():null;
    if(!tr || path.length<2) return false;
    const s=path[0], t=path[path.length-1], dx=t.x-s.x, dy=t.y-s.y;
    if(Math.abs(dx) < tr.width*0.6) return false;      // 橫向要劃得夠長
    if(Math.abs(dy) > 60) return false;                // 大致水平
    const ymid=(s.y+t.y)/2;
    return ymid > tr.top-40 && ymid < tr.bottom+40;    // 高度落在字樣帶
  };
  const unlock=()=>{
    circleAt=0;
    document.body.classList.add('testmode');
    TEL.markAdmin();   // 清盤鈕簽名＝管理員：此裝置永久停止遙測上報（戰績/點擊不列入統計）
    SFX.unlock(); SFX.play(asset('sfx_saint'));   // SI_01＝解鎖回饋音
  };
  homeEl.addEventListener('pointerdown', e=>{
    if(document.body.classList.contains('testmode')) return;
    if(e.target && e.target.closest && e.target.closest('button')) return;   // 按鈕上起手不算
    pid=e.pointerId; pts=[{x:e.clientX,y:e.clientY}];
  });
  homeEl.addEventListener('pointermove', e=>{
    if(!pts || e.pointerId!==pid) return;
    const p=pts[pts.length-1], dx=e.clientX-p.x, dy=e.clientY-p.y;
    if(dx*dx+dy*dy>=9) pts.push({x:e.clientX,y:e.clientY});   // 3px 取樣
  });
  homeEl.addEventListener('pointerup', e=>{
    if(!pts || e.pointerId!==pid) return;
    const path=pts; pts=null; pid=null;
    if(isCircle(path)){ circleAt=Date.now(); return; }   // 畫圓成功（可重畫刷新時窗）
    if(circleAt && Date.now()-circleAt<=10000 && isTitleSwipe(path)) unlock();
  });
  homeEl.addEventListener('pointercancel', ()=>{ pts=null; pid=null; });
})();

combat.bootIdle();   // over=true，建立背景盤面/血條，停在首頁

console.log('[step8] 連戰 lineup 已接上（局內多敵：faceless→facelessgiant）· 首敵：', GAME_CONFIG.enemies[GAME_CONFIG.lineup[0]]?.name, '· HP', state.enemyMax);
