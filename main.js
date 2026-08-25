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
import * as loot from './modules/loot.js';            // 拾得道具視窗 ＋ 道具欄
import * as town from './modules/town.js';            // 城鎮探索（非線性節點）
import * as tutorial from './modules/tutorial.js';     // 首頁「教學」鈕：下一場強制進教學
import { playTransition } from './modules/transition.js';   // 過渡禎（開始/結束淡入淡出）
import { sakuraBurst } from './modules/sakura.js';   // 開始遊戲：全畫面櫻花飛舞（純程式）
import * as story from './modules/story.js';   // 主線 scene 播放器（首頁 story 鈕）
import * as saveSys from './modules/save.js';   // 劇情層存讀檔（F4/F7 即時、F5/F8 選欄）
import * as prog from './script/progress.js';   // 進度／旗標／「一輪遊戲」的邊界（newRun）
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
const MASTER_VOL = GAME_CONFIG.tuning.masterVolume != null ? GAME_CONFIG.tuning.masterVolume : 1;
SFX.setMasterVolume(MASTER_VOL);
// 語音鏈（手機外放的可懂度；理由見 config 的 tuning.voiceChain）
SFX.setVoiceChain(GAME_CONFIG.tuning.voiceChain);

/* ── 全域靜音（右上鈕，管理人模式限定）───────────────────────────
   走 SFX.setMasterVolume(0)：SFX（合成音與取樣音經 limiter 後的主音量節）與 BGM
   （各寫入點都乘 _master）都吃這一個係數，不必逐處攔。
   ⚠ 狀態存 localStorage 而非記憶體：flight/ 是另一個頁面（classic script、自帶一套
     BGM），跨頁只能靠共用鑰匙 —— 兩邊讀同一個 MUTE_KEY 才叫「全域」。 */
const MUTE_KEY='tivot_mute_v1';
const isMuted =()=>{ try{ return localStorage.getItem(MUTE_KEY)==='1'; }catch(_){ return false; } };
function applyMute(){
  const m=isMuted();
  SFX.setMasterVolume(m ? 0 : MASTER_VOL);
  const b=$('muteBtn');
  if(b){ b.textContent = m ? '🔇' : '🔊'; b.classList.toggle('muted', m); }
}
(function bindMute(){
  const b=$('muteBtn'); if(!b) return;
  b.addEventListener('click', e=>{
    e.stopPropagation();                       // 讀取畫面上按下不要順手觸發「點擊繼續」
    try{ localStorage.setItem(MUTE_KEY, isMuted() ? '0' : '1'); }catch(_){}
    applyMute();
  });
  applyMute();
})();

// 普攻槍聲：固定用 Pistol_SE_03（不隨機）
SFX.setShots([asset('se_pistol_03')].filter(Boolean), sfxGain('se_pistol_03'));
// 通用按鈕音：所有未指定音效的按鈕（bindBtn/選單/對話推進 → SFX.menuClick）＝GeneralClick_SE
SFX.setMenuClick(asset('se_general_click'), sfxGain('se_general_click'));

/* ── 進場預載（第一段）：掃 ASSETS 載「開場就要」的圖＋音，跑完才揭開選單 ──
 *  第一段內的順序（ver -384，Ray 定案）：**音效全部 → 圖（立繪最先）→ 音樂**，
 *  見下方 startBatch。
 *  圖 → new Image（瀏覽器快取）；BGM(bgm_*) → Blob 下載；其餘音效 → Web Audio 解碼。
 *  音訊實際播放仍需首次手勢（primeAudio/unlock）。
 *  ⚠ 分兩段載：結算/失敗/Boss BGM 開戰前用不到（最快也在一場戰鬥之後），
 *    不揹進第一段 → 進度條輕量誠實跑完，不再被 12s 保底提前放行。
 *    第二段於「點擊繼續」進主選單當下背景開載（出陣時再補一次保險）；
 *    playBgm 本身會 ensureBlob 隨叫隨載，第二段沒載完頂多晚幾拍起播，不會壞。 */
/* ⚠ `bgm_battle` 也進第二段（ver -344）：它 836KB，而最快也要**點過出陣**才用得到 ——
     出陣前有選武器／選搭檔／過場櫻花，時間綽綽有餘。playBgm 自己會 ensureBlob，
     真的沒載完頂多晚幾拍起播，不會壞。 */
const LATE_BGM_PATHS = ['bgm_result','bgm_lose','bgm_boss','bgm_battle','bgm_crisis'].map(k=>ASSETS[k]).filter(Boolean);
let _lateBgmKicked = false;
function preloadLateBgm(){
  if(_lateBgmKicked) return; _lateBgmKicked = true;
  SFX.preloadBgm(LATE_BGM_PATHS);   // 背景載，不擋任何流程；ensureBlob 有快取可重複呼叫
}

/* ══ 圖片分兩段（ver -344，手機讀取太慢）══════════════════════════════
   ⚠⚠ 原本第一段掃 ASSETS **全部**的圖 —— 實測 29 張、5.3 MB，其中大半是
     cut-in 與敵人立繪：那些最快也要進戰鬥才看得到，卻擋在「還沒到主選單」前面。
     加上音效與兩首 BGM，冷啟動要先吞 7.8 MB 才點得下去；手機上就是 12 秒保底
     一路跑滿還沒好。
   規則：**第一段只留「讀取畫面與主選單真的看得到的圖」**，其餘一律第二段，
     進主選單那一刻（go()）背景開載，出陣時再補一次保險（同 preloadLateBgm）。
   ⚠ 第二段沒載完不會壞：<img> 現抓即顯示，頂多晚一拍。會擋流程的只有音訊
     （解碼要時間），所以音效**維持**在第一段 —— 27 支加起來只有 0.76 MB。
   ⚠ 監察官立繪不在這張表裡也沒關係：她由 `loadPortrait()` 直接 new Image 載
     （排在**圖那一段的最前面**，ver -384），批次段再載一次會吃瀏覽器快取。 */
const BOOT_IMG_KEYS = ['home_emblem'];
let _restImgs = [], _restKicked = false;
function preloadRestImgs(){
  if(_restKicked) return; _restKicked = true;
  for(const src of _restImgs){ const im = new Image(); im.src = src; }
}
/* 熱啟動旗標（見 preloadAll 內的 WARM_BOOT 說明）。
   ⚠ 冷啟動時是在「點擊繼續」那一刻才記，不是載完就記 —— 讀到一半被中斷重整，
     下次仍該完整跑一次。之後每次進背景都刷新時間戳，長時間遊玩後被切走也算數。 */
const BOOT_SESS='tivot_boot_v1', BOOT_STAMP='tivot_boot_at_v1', WARM_MS=10*60*1000;
let _booted=false;
function markBooted(){
  _booted=true;
  try{ sessionStorage.setItem(BOOT_SESS,'1'); }catch(_){}
  try{ localStorage.setItem(BOOT_STAMP, JSON.stringify({v:VERSION,t:Date.now()})); }catch(_){}
}
const WARM_BOOT=(function(){
  try{ if(sessionStorage.getItem(BOOT_SESS)==='1') return true; }catch(_){}
  try{
    const r=JSON.parse(localStorage.getItem(BOOT_STAMP)||'null');
    return !!(r && r.v===VERSION && Date.now()-r.t < WARM_MS);
  }catch(_){ return false; }
})();
/* 進背景時刷新時間戳 —— 但**只有真的進過主畫面才算**：讀取途中被切走／重整，
   下一次仍該完整跑一次讀取（素材根本還沒載完）。 */
/* ══ 飛行頁交棒過來的遭遇戰（ver -382，Ray：「怪碰到船以後進入舒爾特盤」）══
   飛行頁把「要打誰」寫進 localStorage 再跳過來；讀取頁被點掉之後直接開打，不經主選單。
   ⚠ **讀了就清掉**：不清的話重整一次又會再打一場。
   ⚠ 打贏才跳回飛行頁（`flightBack`）；打輸走一般的失敗流程（Game Over → 主選單，
     ver -376 的規矩），退出也一樣。 */
const BATTLE_REQ_KEY='tivot_battle_req_v1';
let flightBack=false;          // 這一場打完要不要跳回飛行頁
function takeBattleReq(){
  try{
    const j=JSON.parse(localStorage.getItem(BATTLE_REQ_KEY)||'null');
    localStorage.removeItem(BATTLE_REQ_KEY);
    return (j && j.battle && GAME_CONFIG.battles && GAME_CONFIG.battles[j.battle]) ? j : null;
  }catch(e){ return null; }
}

/* ══ 飛行頁交棒過來時的開機（ver -387，Ray：「遭遇敵人時槍棺彈出，進入戰鬥畫面，
     彈出瞬間優先加載敵立繪、其次音效、最後音樂」）══════════════════════════
   飛行頁那一半：楣常駐在操控面板底緣，遭遇時整扇槍棺推上來蓋滿畫面才跳頁。
   這一半接手時門**已經在頂上**，所以：
     ① 一開機就把門擺成「已推到頂」（`story.showKerbGate`）—— 跳頁前後畫面上是同一個東西
     ② 讀取藏在門背後跑，順序**敵立繪 → 音效 → 音樂**（三段串接，不併行：
        併行會搶頻寬，那正是「點進去了音效還沒好」的成因，同 startBatch 的理由）
     ③ 點一下 → 演完剩下的門（撞頂 → 解鎖 → 圓盤 → 開門），縫裡露出的就是戰鬥畫面
   ⚠⚠ **這條路徑只剩「獨立開啟飛行頁」時會走到**（ver -388）：正常情況下飛行頁是
     內嵌在 `#flightFrame` 裡的，根本不跳頁 —— 因為跳頁＝新的 document，音訊要**那一頁的**
     使用者手勢才解得開（iOS 一定要），才會需要「開棺」那一顆。內嵌之後那顆就不見了。
     這一支留著是給開發時直接開 `flight/index.html` 用的，不要刪。
   ⚠ 不走讀取遮罩，所以 `markBooted()` 要自己記一次 —— 否則下次冷啟動會多跑一遍完整預載。 */
/* ══ 飛行頁：內嵌 iframe（ver -388，Ray：「想辦法克服」那一顆開棺鈕）══════════
   飛行頁不再是「跳過去的另一頁」，而是蓋在主遊戲上的一個滿版 iframe。
   於是三件事一起解決：
     ① **音訊不用再解鎖一次** —— 戰鬥跑在**父頁**，而父頁在開機那一點就解鎖過了。
        （同源 iframe 的使用者手勢也會往上傳給父頁，所以怎麼玩都不會失效。）
     ② **打完回來不必重載飛行頁** —— 它一直活著，船還在原處，沒有第二次讀取頁
        （Ray：「戰鬥結束不要另跑預載頁」）。
     ③ 回程鑰匙 `tivot_flight_ret_v1` 在這條路徑上用不到（座標根本沒丟過）。
   ⚠ iframe 的 `src` **按下去才給**：不然每次開機都要多載一整個飛行頁。
   ⚠ 飛行頁自己有音樂與環境音；戰鬥期間要明確收掉（`__flightPause`）——
     只把 iframe 藏起來是不夠的，rAF 停了它的 `updateBgm` 也停了，
     那幾個 <audio> 會維持當時的音量繼續播。 */
function flightWin(){ const f=$('flightFrame'); return f ? f.contentWindow : null; }
/* ══ 預載分流（ver -389，Ray 指定）══════════════════════════════════════
   進飛行畫面有**兩條路**，讀取頁只有其中一條要跑：
     · **進入**（主選單「試飛」／城鎮「出航」）→ **跑**飛行頁自己的讀取頁。
       那是一趟新的航行：素材重新備齊、狀態從頭來，而且那一頁本身就是「起飛」的那一拍。
     · **戰鬥結束回來**（`{resume:true}`）→ **不跑**。iframe 從頭到尾沒卸載過，
       船還在原座標（ver -388，Ray：「戰鬥結束不要另跑預載頁」）。
   ⚠ 兩條路的差別只有一件事：進入時把 iframe **重載**，回程只是把它顯示回來。
   ⚠ 重載要走 `contentWindow.location.reload()` —— 把 `src` 設成同一個字串**不會**重載。 */
function openFlight(opts){
  const f=$('flightFrame');
  if(!f){ window.location.href='flight/'; return; }      // 沒有這個框就退回舊的跳頁
  const w=flightWin();
  if(!f.getAttribute('src')) f.setAttribute('src','flight/index.html');
  else if(opts && opts.resume){ if(w && w.__flightResume) w.__flightResume(); }
  else { try{ w.location.reload(); }catch(_){ f.setAttribute('src','flight/index.html'); } }
  f.classList.add('on');
  document.body.classList.add('flight-on');
  $('home').classList.remove('on');
}
function closeFlightFrame(){
  const w=flightWin(); if(w && w.__flightPause) w.__flightPause();
  const f=$('flightFrame'); if(f) f.classList.remove('on');
  document.body.classList.remove('flight-on');
}
/* 飛行頁（iframe 內）呼叫得到的掛鉤。⚠ 掛在 window 上是**刻意**的 ——
   那一頁是非 module 的獨立文件，import 不到這裡的任何東西。 */
window.__tivotFlight = {
  /* 遭遇 → 進戰鬥。門已經在飛行頁推到頂了，這裡**接著演**（撞頂 → 解鎖 → 圓盤 → 開門）。 */
  battle(req){
    const id = req && req.battle;
    if(!id || !GAME_CONFIG.battles || !GAME_CONFIG.battles[id]){ closeFlightFrame(); return; }
    flightBack = true;                    // 打完回飛行頁（見 setStoryReturn）
    try{ SFX.unlock(); }catch(_){}        // 父頁早就解鎖過，這裡只是確保 context 是 running
    /* ⚠ 順序：**先把門擺上去，再收 iframe** —— 反過來的話中間會閃一格飛行畫面。
       門在劇情層（z 8300）＞ iframe（8200），所以蓋得住。
       ⚠ 幾何用飛行頁量好的那一組（`req.geom`）：兩邊各算一次會差 8.6%，
         交棒那一格紋章會忽然變大（鐵律 7）。 */
    story.showKerbGate(req.geom);
    closeFlightFrame();
    preloadRestImgs(); preloadLateBgm();
    story.playKerberosFromRisen(
      ()=>{ $('home').classList.remove('on'); combat.startScriptBattle(id); },
      ()=>story.close({ keepBgm:true }));
  },
  /* 飛行頁的「返回」。⚠ 只有在**底下沒有別的畫面**時才把首頁叫回來 ——
     從城鎮出航的話，城鎮的舞台一直在 iframe 底下開著，收掉 iframe 就回到城鎮了。 */
  close(){
    closeFlightFrame();
    const st=$('storyStage');
    if(!st || !st.classList.contains('on')) $('home').classList.add('on');
  },
};

function bootBattleGate(req){
  markBooted();
  flightBack = true;                       // 打贏跳回飛行頁（見 setStoryReturn）
  /* ⚠ 幾何用飛行頁量好的那一組（交棒鑰匙帶過來的）：兩邊各算一次會差 8.6%，
     跳頁那一格紋章會忽然變大（鐵律 7）。 */
  story.showKerbGate(req.geom);
  /* 提示：做成門上的一行字，不是一顆鈕 —— 這一拍是儀式的一部分，不是一個對話框。
     ⚠ 讀取還沒到位時不亮：亮了才點得有意義（同讀取頁 `.al-done` 的作法）。 */
  const tip=document.createElement('div'); tip.id='gateTip';
  tip.innerHTML='<span>開　棺</span>';
  document.body.appendChild(tip);

  const en=(GAME_CONFIG.enemies||{})[((GAME_CONFIG.battles||{})[req.battle]||{}).enemy]||{};
  const cap=(p,ms)=>Promise.race([p, new Promise(r=>setTimeout(r,ms))]);
  const one=src=>new Promise(res=>{ if(!src) return res();
    const im=new Image(); im.onload=im.onerror=()=>res(); im.fetchPriority='high'; im.src=src; });
  /* ① 敵立繪（這一場真正看得到的那一張）→ ② 音效全部 → ③ 戰鬥 BGM。 */
  const p1=cap(one(asset(en.image)), 4000);
  const p2=p1.then(()=>cap(SFX.preload(_sfxPaths()).catch(()=>{}), 8000));
  p1.then(()=>{ const t=$('gateTip'); if(t) t.classList.add('on'); });   // 立繪到位就可以點
  p2.then(()=>SFX.preloadBgm([asset('bgm_battle')]).catch(()=>{}));
  setTimeout(()=>{ const t=$('gateTip'); if(t) t.classList.add('on'); }, 5000);   // 保底：卡住也點得下去

  let fired=false;
  const open=()=>{
    if(fired) return; fired=true;
    document.removeEventListener('pointerdown', open);
    const t=$('gateTip'); if(t && t.parentNode) t.parentNode.removeChild(t);
    SFX.unlock();                         // 這一頁唯一的使用者手勢
    preloadRestImgs();                    // 其餘的圖背景補載（cut-in／武器圖…）
    preloadLateBgm();                     // 結算／失敗／Boss 那幾首（打完或打輸才用得到）
    story.playKerberosFromRisen(
      ()=>{ $('home').classList.remove('on'); combat.startScriptBattle(req.battle); },
      ()=>story.close({ keepBgm:true }));
  };
  document.addEventListener('pointerdown', open);
}
/* 音效清單：與 preloadAll 同一條規則（ASSETS 裡非 bgm_ 的音檔）。
   ⚠ 抽成函式而不是抄一份陣列 —— 兩份清單一定會走鐘（鐵律 7）。 */
function _sfxPaths(){
  const out=[];
  for(const k of Object.keys(ASSETS)){
    const v=ASSETS[k]; if(!v) continue;
    if(k.indexOf('bgm_')===0) continue;
    if(/\.(mp3|m4a|ogg|wav)(\?|$)/i.test(v)) out.push(v);
  }
  return out;
}

const refreshBoot=()=>{ if(_booted) markBooted(); };
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) refreshBoot(); });
window.addEventListener('pagehide', refreshBoot);

(function preloadAll(){
  /* ══ 飛行頁交棒過來的遭遇戰（ver -387）══
     門**已經在飛行頁推上來了**，所以這一條路徑**不走讀取遮罩**：一開機畫面上就是
     蓋滿螢幕的槍棺，讀取藏在它背後跑（Ray：「彈出瞬間優先加載敵立繪、其次音效、
     最後音樂」）。舊格式（沒有 `gate`）照走原本的聖光那一套，不動它。
     ⚠ 交棒紀錄**在這裡就取走**（`takeBattleReq` 讀了就清），下面 `go()` 用的是同一份。 */
  const REQ = takeBattleReq();
  if(REQ && REQ.gate==='kerb'){ bootBattleGate(REQ); return; }
  const imgs=[], sfx=[], bgm=[];
  for(const k of Object.keys(ASSETS)){
    const v=ASSETS[k]; if(!v) continue;
    // 副檔名判斷容許 ?v=N 版本參數（素材內容更新時升版強制重抓，見 config ASSETS 註解）
    if(/\.(png|jpe?g|webp|gif)(\?|$)/i.test(v)){
      (BOOT_IMG_KEYS.indexOf(k)>=0 ? imgs : _restImgs).push(v);   // 見 BOOT_IMG_KEYS 的說明
    }
    else if(/\.(mp3|m4a|ogg|wav)(\?|$)/i.test(v)){
      if(k.indexOf('bgm_')===0){ if(LATE_BGM_PATHS.indexOf(v)<0) bgm.push(v); }
      else sfx.push(v);
    }
  }
  const total = imgs.length + sfx.length + bgm.length;   // 進度圈只算第一段 —— 誠實跑完，不靠保底放行
  /* ── 熱啟動：省掉等待，但**畫面照出** ───────────────────────
     iOS 主畫面 App 切到背景後，系統常把頁面整個丟掉，回前景時是**重新載入**
     —— 於是又看一次讀取動畫。但這時素材全在 HTTP 快取裡，那段等待是純空轉。
     判定熱啟動：① sessionStorage 有旗標（同一個分頁 session 內的重載）；
     ② 或 localStorage 記到「同一版本、10 分鐘內剛載完過」——進程被系統殺掉時
     sessionStorage 會一起沒，只剩這條認得出來。
     ⚠ 版本不同一律當冷啟動：素材換過就該完整跑一次預載，不能吃到半新半舊。

     ⚠⚠ **熱啟動不能整個跳過讀取畫面**（Ray 回報，ver -258）。
       那一點不只是「揭幕」，它是全站**唯一**解鎖音訊的使用者手勢
       （go() 裡的 SFX.unlock()）—— 少了它，瀏覽器的自動播放政策擋著，
       主選單 BGM 永遠不會出聲。舊版在這裡直接 return，於是熱啟動進站
       就是一片安靜的主選單，而且**越常重整越容易踩到**（pagehide 會刷新
       時間戳，那 10 分鐘窗口是一直往後滑的）。
       現在跳過的是**等待**不是畫面：見下方 WARM_BOOT 那段 —— 遮罩照建、
       直接進可點狀態，素材在背景補載（快取命中幾乎瞬間完成）。 */
  /* 載入遮罩（動態建立，樣式集中在 style.css 的 #assetLoader 區）：
   *  光圈＋百分比＋SAINT INSTALL 字樣，中下方監察官立繪。
   *  ⚠ 圈內字樣：載入中是「SAINT INSTALL」，**滿 100% 後改成「COMPLETE」**
   *    （Ray 指定，ver -261）。底部的「載入中／點擊繼續」那行仍然不放回來。
   *    監察官的對話框與教學 Hint 輪播是有的（Ray 指定放回，ver -251）——
   *    讀取要等好幾秒，那幾句是這段唯一的內容。
   *  ⚠ 「可以點了」改用**視覺**表示：光圈轉常亮（.al-done）＋字樣呼吸（.al-pulse）。
   *    那一點是解鎖音訊的使用者手勢，非有不可 —— 拿掉提示字又不給替代訊號的話，
   *    玩家會卡在一個看起來已經好了、卻沒反應的畫面上。 */
  const RING_C = 301.59;   // SVG 進度圓周長（r=48, viewBox 100）
  const ov=document.createElement('div'); ov.id='assetLoader';
  ov.innerHTML=
     '<div id="alRing">'
    +  '<svg viewBox="0 0 100 100"><circle class="al-rail" cx="50" cy="50" r="48"/>'
    +  '<circle id="alRingProg" class="al-prog" cx="50" cy="50" r="48" stroke-dasharray="'+RING_C+'" stroke-dashoffset="'+RING_C+'"/></svg>'
    +  '<div id="alRingTxt"><div id="assetLoaderPct">0%</div><div id="alRingCap">SAINT INSTALL</div></div>'
    +'</div>'
    +'<div id="alStage"><img id="alPortrait" alt="">'
    +  '<div id="alBubble"><div class="al-name"></div><div class="al-hint" id="alHint"></div></div>'
    +'</div>'
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
      fitCap();
    } else setTimeout(placeRing, 120);
  }
  /* 圈內字樣要**量過才知道塞不塞得下**，不能靠固定字級。
     ⚠ 這串在不同平台根本是不同的字：字體堆疊第一順位 "Iowan Old Style" 是
       **iOS 內建字**，桌機沒有 → 回退到 Palatino/Georgia。實測桌機
       (Palatino, 13px + 5px 字距) 是 163px 寬，而圓的直徑只有 184px ——
       左右各只剩 10px。iOS 的 Iowan 更寬，就凸出圈外了。
       「在我這台看起來剛好」正是這種排版最危險的地方。
     ⚠ letter-spacing 會在**最後一個字後面也留一格**，那一格算進寬度裡，
       flex 置中時整串會偏左半格。用等寬的負 margin 抵掉。
     ⚠ 量之前要先清掉自己上次寫的行內樣式 —— 否則 .al-done 換了字級之後
       量到的是上一輪縮好的結果，會一路愈縮愈小。 */
  function fitCap(){
    const ring=$('alRing'), cap=$('alRingCap');
    if(!ring || !cap) return;
    const D=ring.getBoundingClientRect().width*0.96;   // SVG 圓 r=48/100 → 直徑是外框的 96%
    if(D<10) return;
    cap.style.fontSize=''; cap.style.letterSpacing=''; cap.style.marginRight='';
    const cs=getComputedStyle(cap);
    const fs=parseFloat(cs.fontSize)||12, ls=parseFloat(cs.letterSpacing)||0;
    const MAX=D*0.80;          // 留兩成：貼著圓弧邊緣看起來就已經是「頂到圈」了
    const w=cap.scrollWidth;
    const k=(w>MAX && w>0) ? MAX/w : 1;
    if(k<1){
      cap.style.fontSize=(fs*k).toFixed(2)+'px';
      cap.style.letterSpacing=(ls*k).toFixed(2)+'px';
    }
    cap.style.marginRight=(-(ls*k)).toFixed(2)+'px';
  }
  placeRing();
  fitCap();          // placeRing 還在等紋章載入時，先照 CSS 預設的圈徑量一次
  window.addEventListener('resize', placeRing);
  // 監察官立繪與名字（沿用結算的資源；讀 config 不寫死）
  //   立繪＝載入畫面的門面，全站最優先：載完（或 4s 保底）才輪到關鍵音效、再輪到整批。
  // ⚠ 走 defaultInspector，不要寫死鍵名：這裡原本寫死 `.freya`，而正上方的註解
  //   說「讀 config 不寫死」—— 註解與程式不符。芙蕾雅是暫代版，正式版監察官是
  //   蕾娜(Renna)；換人時 config 改一行就好，別再有第二處要記得改。
  /* 監察官立繪：讀取畫面的門面。⚠ **不再擋在最前面**（ver -384，Ray 指定
     「先讀音效，音效讀完讀圖，最後讀音樂」）—— 她現在屬於「圖」那一段，
     只是排在圖的最前面（`fetchPriority=high`）。
     ⚠ 為什麼要換順序：音效是**要解碼**的，慢網下常常還沒好玩家就點進去了，
       開場那兩支（跑步聲／跌倒音）因此消失過好幾次；圖片沒載完頂多晚一拍出現。 */
  let loadPortrait = ()=>Promise.resolve();
  {
    const insp=(GAME_CONFIG.inspectors||{})[GAME_CONFIG.defaultInspector]||{};
    const img=$('alPortrait'); const nm=ov.querySelector('.al-name');
    if(nm) nm.textContent=insp.name||'';
    const psrc=asset(insp.image);
    if(img && psrc){
      loadPortrait = ()=> new Promise(res=>{
        img.fetchPriority='high';   // 壓過 HTML 預掃到的其他 <img>（徽記/敵人立繪），確保她是圖裡的第一張
        img.onload=()=>{ img.classList.add('on'); res(); };
        img.onerror=()=>res();
        img.src=psrc;
        setTimeout(res, 4000);   // 保底：立繪卡住也不無限擋住後面
      });
    }
  }
  /* Hint 輪播：洗牌後依序循環（＝隨機且整輪不重複），淡入 → 停 hold → 淡出 → 換句。
     文案在 config 的 loadingHints、節奏在 tuning.loadingHint*Ms —— 程式不寫死。
     ⚠ 讀完之後**不停**：玩家還沒點下去之前，輪播要繼續。 */
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
  /* ══ 預載順序（ver -384，Ray 定案）══
       **① 音效全部 → ② 圖（立繪最先）→ ③ 音樂**
     為什麼是這個順序：
       · **音效要解碼**（Web Audio），慢網下最容易「點進去了還沒好」——
         開場那兩支（跑步聲／跌倒音）就因此消失過好幾次，是老問題。
       · **圖沒載完不會壞**：`<img>` 現抓即顯示，頂多晚一拍。
       · **音樂最不急**：`playBgm` 自己會 `ensureBlob`，晚幾拍起播而已，
         而且它是三者裡最大的一包，擺前面等於讓音效排在它後面。
     ⚠ 每一段各帶保底（音效 8s／圖 6s），卡住也不會無限擋下一段。
     ⚠ 三段是**串起來的**（前一段完成才開下一段）—— 同時開跑會搶頻寬，
       那正是「音效讀曲跟不上」的成因。 */
  let done=0;
  const prog=$('alRingProg'), pct=$('assetLoaderPct');
  const tick=()=>{ done++; const p=total?Math.round(done/total*100):100;
    if(prog) prog.style.strokeDashoffset=(RING_C*(1-p/100)).toFixed(1);   // 沿光圈順時針推進
    if(pct) pct.textContent=p+'%'; };
  // 載完 → 改「點擊繼續」：這一點＝使用者手勢，解鎖音訊並播 MainMenu，再揭開選單
  let ready=false;
  const showReady=()=>{
    if(ready) return; ready=true;
    /* 讀取完成：進度圈補滿、整圈轉常亮發光（.al-done），字樣換成 COMPLETE
       並加呼吸 —— 那就是「可以點了」的訊號。 */
    if(prog) prog.style.strokeDashoffset='0';
    if(pct) pct.style.display='none';
    ov.classList.add('al-done');
    const cap=$('alRingCap');
    if(cap){ cap.textContent='COMPLETE'; cap.classList.add('al-pulse'); }
    /* ⚠ 換完字才量：.al-done 把字級 10.5→13px、字距 3→5px（變寬），
       而 COMPLETE 比 SAINT INSTALL 短（變窄）—— 兩邊都變了，一定要重量一次。
       圈內字樣一律英文，不走 i18n（與 SAINT INSTALL 同一套處理）。 */
    fitCap();
    const go=()=>{
      ov.removeEventListener('click',go); ov.removeEventListener('touchstart',go);
      clearTimeout(hintTimer);   // 停輪播
      markBooted();   // 真的進到主畫面了才算「載過一次」（見 WARM_BOOT）
      SFX.unlock();   // 使用者手勢：解鎖音訊 → 主選單 BGM 開始播
      // 讀取頁揭幕不再播 SE（原 SI_01 撤下；聖徒 stinger 移到出陣鈕）
      preloadLateBgm();   // 第二段：進主選單即背景載 結算/失敗/Boss/戰鬥 BGM
      preloadRestImgs();  // 第二段：cut-in／敵人立繪／武器圖等「進戰鬥才看得到」的圖
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
      /* 飛行頁交棒過來的遭遇戰：**不經主選單**，在聖光蓋滿的那一刻直接開打
         （2500ms＝遮罩撤掉那一拍，畫面正好是全白 → 掀開就是戰鬥）。 */
      const req = REQ;                        // 開機時就取走了（見 IIFE 開頭）
      if(req){
        flightBack = true;
        SFX.playBgm(asset('bgm_battle'), { fadeOutMs:600, volume: bgmVol('bgm_battle') });
        setTimeout(()=>{ $('home').classList.remove('on'); combat.startScriptBattle(req.battle); }, 2500);
      }
    };
    ov.addEventListener('click', go);
    ov.addEventListener('touchstart', go, {passive:true});
  };
  // 批次段：等「立繪 → 關鍵音效」依序就緒才開跑（兩段各有 4s 保底）。
  //   12s 保底自批次開跑起算：單一資源卡住也不擋整個載入。
  const startBatch=()=>{
    /* 主選單 BGM **上膛**（armOnly）：blob 抓好、el.src 就位，但不出聲 ——
       起播一律等 go() 那一下手勢由 unlock() 同步開火。
       ⚠ 原本這裡是直接 playBgm（靠「沒解鎖就會被擋、之後 unlock 補播」）。
         但那在政策寬鬆的瀏覽器上會**真的播出來** —— 桌機 Chrome 就是這樣，
         於是讀取畫面還沒點就有音樂，「按了才有聲音」變成看瀏覽器臉色。
         armOnly 讓兩邊一致。（Ray 指定，ver -259） */
    const wrapCount = (p, n)=> p.then(()=>{ for(let i=0;i<n;i++) tick(); }).catch(()=>{ for(let i=0;i<n;i++) tick(); });
    const cap = (p, ms)=> Promise.race([p, new Promise(r=>setTimeout(r, ms))]);
    /* ① 音效（全部，含原本單獨先載的那三支關鍵音） */
    const sfxP = cap(wrapCount(SFX.preload(sfx), sfx.length), 8000);
    /* ② 圖：立繪最先，其餘同時開 */
    const imgsP = sfxP.then(()=> cap(loadPortrait().then(()=>Promise.all(
        imgs.map(src=>new Promise(res=>{ const im=new Image(); im.onload=im.onerror=()=>{ tick(); res(); }; im.src=src; }))
      )), 6000));
    /* ③ 音樂：**上膛**（armOnly）不出聲；起播一律等 go() 那一下手勢（見下方說明）。 */
    imgsP.then(()=>{
      SFX.playBgm(asset('bgm_home'), { volume: bgmVol('bgm_home'), armOnly:true });
      return wrapCount(SFX.preloadBgm(bgm), bgm.length);
    }).then(showReady);
    setTimeout(showReady, 12000);
  };
  /* 熱啟動：跳過的是**等待**，不是畫面。
     ⚠ 照樣走 `startBatch()` 的三段順序，只是素材都在快取裡、幾乎瞬間跑完。 */
  if(WARM_BOOT){
    markBooted();
    startBatch();   // 照樣補載（含掛播 bgm_home），但不擋畫面
    showReady();    // 立刻可點：光圈常亮、字樣呼吸
    return;
  }
  startBatch();   // ver -384：三段的順序寫在 startBatch 裡（音效 → 圖 → 音樂）
})();

// 首頁：開始遊戲 → 主選單先淡出、空一拍（約 1s）Battle 才淡入（避免唐突），同時播「驅逐開始」過渡禎
function launchBattle(opts){
  /* ⚠ 這一場不是飛行頁交棒過來的 → 清掉回程旗標（ver -388）。
     不清的話「飛行遭遇打輸 → 回主選單 → 再打一場劇情戰打贏」會被錯誤地送去飛行頁。 */
  flightBack = false;
  /* 出陣 stinger（sfx_startbt＝神楽鈴）：列第一梯關鍵預載 → 即點即響。
     ⚠ 劇情場次**不播**（Ray 指定）：那一場的轉場是 Kerberos 之門，門有自己的
       撞擊／齒輪／開門三支音；再疊一聲神楽鈴等於兩套儀式撞在一起。 */
  if(!(opts && opts.instant)) SFX.play(asset('sfx_startbt'), sfxGain('sfx_startbt'));
  preloadLateBgm();   // 保險：若保底提前放行沒經過 go()，出陣（櫻花期間）補載第二段
  preloadRestImgs();
  SFX.playBgm(asset('bgm_battle'), { fadeOutMs:800, delayMs:1000, volume: bgmVol('bgm_battle') });
  /* 劇情叫起來的那一場（ver -329）：**跳過櫻花過渡禎，直接開戰**。
     ⚠ 因為那一場的轉場是「Kerberos 之門拉開」，門縫裡要露出的是**已經在跑的戰鬥畫面**；
       這裡若還播自己的過渡禎，門一開露出的是櫻花，兩段轉場疊在一起。 */
  if(opts && opts.instant){ combat.startGame(); return; }
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
  // 出陣 stinger：SI_01（音效在第一段就全部載完 → 即點即響）
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
  /* 回主選單：goHome 內會清 cutinPlaying + 淡出淡入。
     ⚠ 這一顆就是字面上的「回主選單」，所以要先取消「打完跳回飛行頁」（ver -382）——
       不取消的話按退出反而會被送回天上。 */
  bind('.ec-yes',()=>{ close(); flightBack=false; combat.goHome(); });
}
bindBtn('testClearBtn', combat.testClearBoard); // 左上（測試用）：一鍵清盤
/* ⚠ 「道具」（bagBtn）與「城鎮」（townBtn）兩顆首頁鈕已於 ver -376 移除（Ray 指定）。
   `loot.showBag` 與 `town.open` 都還在（前者暫時沒有入口、後者由劇情的 `thenTown` 叫起來），
   不要因為「沒人叫」就把它們刪掉。 */
bindBtn('shopBtn',      ()=>loot.showShop('grocery'));   // 商店（ver -368；臨時入口，正式入口在城鎮節點）
bindBtn('storySkip',    story.skipToNextGate);  // 跳段（開發者限定，ver -363）
bindBtn('tutDevSkip',   combat.devSkipBattle);  // 教學戰跳關（開發者限定，ver -366）
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
// 試飛：大地圖飛行原型（管理人模式限定；鈕本身由 CSS 隱藏，見 style.css）
// ver -388：內嵌 iframe，不再跳頁；ver -389：「進入」這條路會跑讀取頁（見 openFlight）
bindBtn('flightBtn', ()=>openFlight());
/* 主線劇情（管理人模式限定）：從 mainScript 的 MAIN_ENTRY 開始跑 scene 鏈。
   ⚠ 不換頁 —— 劇情舞台是蓋在首頁上的一層（#storyStage z-8300），離開就回首頁。
     換頁的話存讀檔要跨頁還原，複雜度沒必要。
   存讀檔：F4 即時存／F7 即時讀／F5 選欄存／F8 選欄讀（見 modules/save.js）。 */
story.init(); saveSys.init();
/* ⚠⚠ **這顆鈕就是「從頭開始」**（ver -381，Ray：「從頭開始，城鎮探索的劇情要重新出現」）：
   `story.open(null)` 一律從 MAIN_ENTRY 演起，所以進去之前要把**這一輪**的東西清乾淨 ——
   不清的話旗標還留著，城鎮那些「只播一次」的段落就整個消失（Ray 回報過）。
   ⚠ 邊界定義在 `progress.newRun()` 那一支，不要在這裡列要清什麼（鐵律 8）。
   ⚠ 讀檔是另一回事（`progress.restore()`），不走這裡。 */
bindBtn('storyBtn', ()=>{ prog.newRun(); story.open(null); });
/* ── 劇情插入戰鬥 → 打完接回劇情（ver -321；-325 改成直接交棒）──────────
   story.js 不 import 戰鬥模組（單向資料流），發動與續播都由這裡負責。

   ⚠⚠ ver -325 起**不再監看首頁出現**。舊作法是 MutationObserver 盯 `#home.on`，
     等於「先走完整條收尾流程回到首頁，再把劇情蓋上去」—— 玩家會看到
     驅逐完成過渡禎、結算頁與結算 BGM 閃過去（Ray：「切乾淨」）。
     現在由 combat 在勝負的第一時間直接回呼（setStoryReturn），
     整條結算流程根本不跑。
   ⚠ `goHome` 的黑幕全蓋瞬間（onCovered）才開劇情：首頁確實會被還原，
     但它是在黑幕之下被劇情蓋住的，畫面上看不到。`noBgm` 讓主選單 BGM 不起播 ——
     不然交棒那一秒會漏出半句主選單的曲子。 */
let storyResume = null;
/* 關門演出（進場那一套的倒放）：由劇情層提供、combat 在教學打完時呼叫（ver -366）。
   ⚠ 注入而不是 import —— combat 不認識劇情層（CLAUDE.md §2 的依賴方向）。 */
story.setTownOpener(town.open);   // scene 的 `thenTown` 由 story 呼叫（注入，story 不 import town）
/* 城鎮的「出航」→ 開飛行頁（注入，town 不 import main；同 setTownOpener 的作法）。 */
town.setFlightOpener(()=>openFlight());   // 城鎮出航＝「進入」，讀取頁要跑（ver -389）
combat.setStoryClose(story.playKerberosClose);
combat.setStoryReturn((res)=>{
  /* 飛行頁交棒過來的那一場：打完跳回去（ver -382）。
     ⚠ 只有**打贏**才回得去 —— 輸了在 `combat.lose()` 就走掉了（Game Over → 主選單），
       根本不會呼叫這一支；退出則由退出確認先把 `flightBack` 關掉。 */
  /* ⚠ 內嵌模式（ver -388）：飛行頁一直活著 —— **不重載**，在黑幕全蓋的那一刻把它顯示回來
     就好（沒有第二次讀取頁，船也還在原處，Ray：「戰鬥結束不要另跑預載頁」）。
     ⚠ 戰鬥／結算的曲子要收掉，不然回到飛行畫面還在放（飛行頁自己的曲子由
       `__flightResume` 接回去）。
     ⚠ 還沒內嵌過（`src` 是空的）＝這一場是從獨立飛行頁跳過來的 → 照舊跳頁回去。 */
  if(flightBack){
    flightBack=false;
    const f=$('flightFrame');
    if(f && f.getAttribute('src')){
      try{ SFX.stopBgm(600); }catch(_){}
      combat.goHome(()=>openFlight({ resume:true }), { noBgm:true });
      return;
    }
    location.href='flight/index.html'; return;
  }
  const r = storyResume; storyResume = null;
  /* ⚠ 走 `story.resumeFrom`（ver -375）：主線與城鎮的臨時段落**續播方式不同**，
     分流在 story 裡做（那裡才知道哪一種）。這裡照舊只負責把首頁收乾淨。 */
  combat.goHome(()=>{ if(r) story.resumeFrom(r, res); }, { noBgm:true });
});
/* 戰鬥音樂：**門開始上推那一瞬**就起播（ver -355，Ray 指定）。
   ⚠ 不能等 `setBattleHandler`（那是門開到縫才呼叫的，晚 3 秒多），也不要靠
     `launchBattle` 裡那一行 —— 它帶 `delayMs:1000`，是給櫻花過渡禎用的節奏。
   ⚠ 同一首重播由 `playBgm` 自己擋掉（同曲播放中直接 return），所以 launchBattle
     那一行照留著不會打架。 */
story.setBattleCue(()=>{
  SFX.playBgm(asset('bgm_battle'), { fadeOutMs:600, volume: bgmVol('bgm_battle') });
});
story.setBattleHandler((battleId, resume)=>{
  storyResume = resume;
  flightBack = false;   // 劇情/城鎮的插入戰不是飛行頁交棒過來的（同 launchBattle 的理由）
  /* 劇情插入戰（ver -375）：腳本寫 `{battle:'guild_hunter'}`，查得到 `config.battles`
     就開那一場（單敵、卡上的數值、不能聖徒化／用搭檔技）。
     ⚠ 查不到才退回教學那一場 —— 舊腳本（地宮那一段）寫的就是教學，不能被改掉。 */
  if(GAME_CONFIG.battles && GAME_CONFIG.battles[battleId]){
    SFX.playBgm(asset('bgm_battle'), { fadeOutMs:600, volume: bgmVol('bgm_battle') });
    combat.startScriptBattle(battleId);
    return;
  }
  /* ⚠ 標成 story 場次：與首頁「教學」鈕分開（Ray 指定）—— 這一場由諾薇兒帶
     （台詞走 config.tutorial.story）、不可跳過、教到破防為止。 */
  tutorial.requestReplay({ story:true });
  launchBattle({ instant:true });   // 轉場由 Kerberos 之門負責，不再播櫻花過渡禎
});
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
  /* ⚠ non-passive：一偵測到「明顯水平意圖」就 preventDefault，宣告本手勢由頁面接管。
     內嵌瀏覽器（巴哈 app、LINE、FB 等 WebView）的左右滑切頁/返回是原生手勢，
     只有在手勢初期就 preventDefault 才會讓原生 recognizer 讓位——等滑到
     THRESH 才擋已經太遲（宿主早就開始換頁動畫）。 */
  zone.addEventListener('touchmove',e=>{
    if(!tracking) return;
    const t=e.touches[0];
    const dx=t.clientX-startX, dy=t.clientY-startY;
    if(Math.abs(dx)>8 && Math.abs(dx)>Math.abs(dy) && e.cancelable) e.preventDefault();
    if(Math.abs(dx)>THRESH && Math.abs(dx)>Math.abs(dy)*1.5){   // 水平滑動為主（避免和捲動混淆）
      tracking=false;
      saint.activateSaint(dx>0?'right':'left');
    }
  },{passive:false});
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

/* ── 鍵盤方向鍵＝上述滑動手勢的等價入口（桌機無觸控/不便拖曳時可用）──
 *  ←/→ ＝聖徒化左右滑（方向即橫斬方向）；↑ ＝上滑。
 *  ↑ 依情境分派，與兩個上滑手勢層的分工一致：
 *    聖徒化中 → tryActive('saint')（生命歸還，#returnSwipe 層）
 *    非聖徒化 → tryActive('board')（盤面主動技，#top 層）
 *  守門條件逐條照抄各手勢的 guard，行為與滑動完全等價——不放寬、不繞過任何限制。 */
(function bindGestureKeys(){
  const KEYS = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up' };
  // 手勢只存在於戰鬥畫面：首頁顯示中（#home.on）一律不受理，避免在選單誤觸
  const inBattle = ()=>{ const h=$('home'); return h && !h.classList.contains('on'); };
  /* 教學正在接管輸入時讓位，範圍與 #tutTouch 全畫面層一致（對話中觸控本來就進不來，
     鍵盤若不比照就會脫稿發動）：對話中一律不受理；閘門由 tutorial 自己的鍵盤處理收走。
     教學的自由對打段（無對話無閘門）不在此列 → 與滑動一樣照常可用。 */
  const tutorialCapturing = ()=>state.tutorialActive && (state.tutorialDialog || tutorial.gateActive());
  // 焦點在輸入元件時讓給輸入（目前無此類欄位，先守著以免日後加了才發現衝突）
  const typing = ()=>{ const a=document.activeElement;
    return !!a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };

  window.addEventListener('keydown', e=>{
    const dir = KEYS[e.key];
    if(!dir) return;
    if(e.repeat) return;                                   // 長按不連發（一次按鍵＝一次手勢）
    if(e.ctrlKey||e.altKey||e.metaKey||e.shiftKey) return;  // 帶輔助鍵＝瀏覽器捷徑，不攔
    if(typing() || !inBattle() || tutorialCapturing()) return;
    /* ⚠ 這道 guard 必須在 preventDefault 之前：結算面板（#bannerScroll）是可捲動的，
       戰鬥已結束還吞方向鍵的話，鍵盤使用者就捲不動結算內容了。
       戰鬥進行中則照吞（版面固定不捲動，攔下來只是避免任何殘餘捲動）。 */
    if(state.over || state.cutinPlaying) return;
    e.preventDefault();                                     // 擋掉方向鍵捲動頁面
    SFX.unlock();                                           // 鍵盤也是使用者手勢：可解鎖音訊
    if(dir==='up'){
      // 與上滑手勢同：能否發、屬於誰一律由 partner 判定（無對應技＝no-op）
      if(state.saintMode){ partner.tryActive('saint'); return; }
      if(state.transitioning) return;                       // board 手勢的額外 guard（轉場中不受理）
      partner.tryActive('board');
    }else{
      if(state.saintMode||state.saintUsedThisBattle) return;
      saint.activateSaint(dir);
    }
  });
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
  /* 管理人模式＝開關式：同一組手勢再做一次即關閉。
     狀態存 localStorage（TEL 的簽名鍵），開機時還原 → 進過一次就一直是管理人，
     不必每次重做手勢；要退出就再畫一次圓＋橫劃。 */
  const toggleAdmin=()=>{
    circleAt=0;
    const on=!document.body.classList.contains('testmode');
    document.body.classList.toggle('testmode', on);
    if(on) TEL.markAdmin();      // 簽名＝管理員：此裝置停止遙測上報（戰績/點擊不列入統計）
    else   TEL.clearAdmin();     // 撤銷簽名 → 恢復上報
    SFX.unlock(); SFX.play(asset('sfx_saint'));   // SI_01＝開關回饋音
  };
  // 開機還原：簽名還在就直接進管理人模式
  if(TEL.isAdminStored()) document.body.classList.add('testmode');
  homeEl.addEventListener('pointerdown', e=>{
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
    if(circleAt && Date.now()-circleAt<=10000 && isTitleSwipe(path)) toggleAdmin();
  });
  homeEl.addEventListener('pointercancel', ()=>{ pts=null; pid=null; });
})();

combat.bootIdle();   // over=true，建立背景盤面/血條，停在首頁

console.log('[step8] 連戰 lineup 已接上（局內多敵：faceless→facelessgiant）· 首敵：', GAME_CONFIG.enemies[GAME_CONFIG.lineup[0]]?.name, '· HP', state.enemyMax);
