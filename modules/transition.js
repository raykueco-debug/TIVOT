/* ============================================================================
 *  modules/transition.js — 過渡禎（開始/結束的淡入淡出全畫面轉場）
 *  ---------------------------------------------------------------------------
 *  純輸出葉節點：只 import config 讀文字/時長，操作 #expelTransition 覆蓋層，
 *  不依賴任何業務模組（比照 audio.js 的定位）。main（開始）與 combat（勝利進結算）
 *  皆可直接 import 使用，不製造反向/循環依賴。
 *
 *  時序（不自動停留，改「輕觸畫面繼續」）：
 *    show(opacity 0) → 次影格淡入 → 淡入完成(fadeMs)後開放輕觸並顯示提示(.ready) →
 *    輕觸/點擊/Enter/Space → 呼叫 done（此刻遮罩仍近不透明，在其後把底下畫面切好）→
 *    淡出揭開新畫面 → 收尾隱藏。缺 config/DOM 時直接呼叫 done，不阻擋流程。
 *  ⚠ 淡入途中(前 fadeMs)不接受輕觸：避免「觸發的那一下手勢」瞬間跳過。boss 戰同樣是
 *    輕觸才繼續，提示不自動消失。
 * ========================================================================== */

import { GAME_CONFIG } from '../config.js';

const $ = id => document.getElementById(id);

/* opts.noTap  ＝不接受輕觸/點擊/按鍵繼續（不顯示提示），改由外部呼叫回傳的 proceed 推進。
 * opts.noAuto ＝停用 autoMs 自動繼續。回傳 { proceed }：外部（如櫻花飄完）可主動推進。
 * opts.onRevealed ＝淡出完成（遮罩收掉、底下畫面完全露出）那一刻的回呼（ver -467）：
 *   給「可操作才開始計時」用 —— done() 是在遮罩仍近不透明時呼叫的，戰鬥在那一刻
 *   就開始跑；要等玩家真的看得到畫面才放行計時，就掛這裡。 */
export function playTransition(kind, done, opts){
  opts = opts || {};
  const cfg = GAME_CONFIG.transitions;
  const data = cfg && cfg[kind];
  const el = $('expelTransition');
  if(!el || !data){ if(done) done(); return { proceed(){} }; }   // 缺設定/DOM → 不擋流程

  // 淡入/淡出時長：可由該 kind 的 fadeInMs / fadeOutMs 覆寫（缺則用全域 cfg.fadeMs）。
  const fadeIn  = (data.fadeInMs  != null) ? data.fadeInMs  : (cfg.fadeMs || 300);
  const fadeOut = (data.fadeOutMs != null) ? data.fadeOutMs : (cfg.fadeMs || 300);
  el.style.setProperty('--expel-fade', fadeIn+'ms');   // 先套淡入時長

  const cn = data.cn || '';
  const hint = cfg.hint || '';
  $('expelCn').textContent = cn;
  $('expelEn').innerHTML   = (data.en || []).map(line => `<div>${line}</div>`).join('');
  const hintEl = $('expelHint'); if(hintEl) hintEl.textContent = hint;
  // 無障礙：aria-label 併中文大字 + 繼續提示，顯示時聚焦以利螢幕報讀
  el.setAttribute('aria-label', (cn ? cn+'。' : '') + hint);

  // 顯示（先 opacity 0）→ 強制 reflow → 次影格加 vis 觸發淡入
  el.classList.add('show');
  el.classList.remove('vis','ready');
  void el.offsetWidth;
  requestAnimationFrame(()=> el.classList.add('vis'));

  let tapEnabled = false, proceeded = false;
  // 淡入完成後開放繼續；noTap 時不顯示「輕觸繼續」提示，但仍讓 tapEnabled=true 供外部 proceed。
  const enableTimer = setTimeout(()=>{ tapEnabled = true;
    if(!opts.noTap){ el.classList.add('ready'); if(el.focus) try{ el.focus(); }catch(e){} } }, fadeIn);

  // 自動繼續：該 kind 設 autoMs>0 且未 noAuto → 淡入後（自 show 起算 autoMs、至少過 fadeIn）沒繼續就強制 proceed。
  const autoMs = (!opts.noAuto && data.autoMs != null) ? data.autoMs : 0;
  const autoTimer = autoMs>0 ? setTimeout(()=>{ tapEnabled=true; proceed(); }, Math.max(autoMs, fadeIn+50)) : null;

  function cleanup(){
    clearTimeout(enableTimer);
    if(autoTimer) clearTimeout(autoTimer);
    el.removeEventListener('touchstart', onTap);
    el.removeEventListener('click', onTap);
    document.removeEventListener('keydown', onKey);
  }
  function proceed(){
    if(proceeded || !tapEnabled) return;               // 淡入未完成前不接受輕觸
    proceeded = true;
    cleanup();
    el.style.setProperty('--expel-fade', fadeOut+'ms');// 淡出改用各自時長（失敗淡入慢、淡出仍正常）
    el.classList.remove('vis','ready');                // 開始淡出
    if(done) done();                                   // 遮罩仍近不透明 → 在其後切換底下畫面
    setTimeout(()=>{ el.classList.remove('show');
      if(opts.onRevealed) opts.onRevealed(); }, fadeOut);
  }
  function onTap(e){ if(e && e.preventDefault) e.preventDefault(); proceed(); }
  function onKey(e){ if(e.key==='Enter' || e.key===' ' || e.key==='Spacebar'){ e.preventDefault(); proceed(); } }

  if(!opts.noTap){
    el.addEventListener('touchstart', onTap, {passive:false});
    el.addEventListener('click', onTap);
    document.addEventListener('keydown', onKey);
  }
  return { proceed };   // 外部（櫻花飄完）主動推進
}

/* ════════════════════════════════════════════════════════════════════════════
 *  收首頁：**唯一那一支**（ver -1372，鐵律 8）
 *  ---------------------------------------------------------------------------
 *  Ray 回報：「讀取畫面的間隙偶爾露出首頁」。
 *
 *  ⚠⚠⚠ **規矩早就寫好了，缺的是「只有一個實作」**：§6.10 的 ver -576 已經定案
 *    ——「**在新的一頁真的蓋上去之前，不可以先把首頁收掉**」，因為 `#home` 底下就是
 *    `#app`，而 `#app` 上面掛著開機時 `applyConfigToDOM` 擺好的**挑戰第一戰的立繪**
 *    （或上一場的殘盤）。先收首頁 → 那一格露出來的就是它。
 *
 *  ⚠⚠ 為什麼一直復發：這個動作在 -1371 之前有 **9 個實作點**
 *    （`main.js` 6 處 ＋ `modules/combat.js` 3 處，`grep "\$('home').classList.remove('on')"`
 *    數得出來），而歷次修的都是**被回報的那一個呼叫點**：
 *      -576 修 `openFlightAt`／-1321 修 `enterTown`／-1357 修 `land()`。
 *    每修一個，剩下八個照舊 —— 這正是鐵律 8 那句「一個**動作**只有一個實作」。
 *
 *  ⚠ 住在 transition.js 的理由：它是**純輸出葉節點**，而 `main`（開始）與 `combat`
 *    （出陣／Boss）本來就都 import 它（見檔頭），放這裡不製造反向或循環依賴。
 *    放 `main.js` 的話 combat 拿不到（main 是組裝根），得多一支注入器。
 *
 *  ⚠⚠ 這一支**不改變任何時序**，它做兩件事：
 *    ① 把「收首頁」收成一個動作（日後要加東西 —— 例如鐵律 10 的「離場即殺」——
 *       只有這裡要改）；
 *    ② **驗收**：收的那一刻若沒有任何一層蓋著就記一筆 console（管理人模式再浮紅字）。
 *    ⚠⚠⚠ 它是**驗收不是規矩**（同 `verifyCastCleared`／`assertNoDarkOverlay`）：
 *      真的驗到東西就是**上游那個呼叫點的順序錯了**，要去修那一條路徑，
 *      不是在這裡把警告關掉。靜靜收掉會讓下一個同類 bug 再也查不出來
 *      —— 而「偶爾露出首頁」正是因為它以前完全沒有聲音。
 * ══════════════════════════════════════════════════════════════════════════ */

/* 蓋得住首頁的那幾層（**都是不透明的滿版層**）。
   ⚠ 這張表是「事實」不是「規矩」：新增任何一個滿版不透明層就補一列，
     不補的下場只是多一行假警告，不會壞掉（安全的那一側是預設）。 */
const HOME_COVERS = [
  ['#storyStage.on',                     '劇情／城鎮舞台'],          // 不透明底色
  ['#expelTransition.show',              '過渡禎'],                  // 出陣的櫻花／驅逐那一張
  ['#alFlash',                           '開機的聖光'],              // 光暈實心蓋滿才交棒（main 的 2500ms）
  ['#kerb.rise.full',                    '槍棺（推到頂）'],          // 交棒進戰鬥：門蓋滿畫面
  ['#transition.on',                     '結算過場'],
  /* ⚠⚠ **讀取頁也是一層蓋滿的**（ver -1663）：`#assetLoader` 是
     `position:fixed; inset:0; background:#0a0812`（不透明），而所有走
     `story.loadScene()` 的路徑都在它的 `onCovered`（全黑那一刻）才收首頁
     —— 那正是這張表要的「等新的那一層真的蓋上去」。
     名單裡漏了它，於是那幾條**做對了的**路徑反而每次被警告一次（誤報）。
     ⚠ `:not(.al-fade)` ＝正在淡出的那半秒不算：那時它已經在讓位了。 */
  ['#assetLoader:not(.al-fade)',         '讀取頁'],
];
export function homeCoveredBy(){
  /* 飛行 iframe 沒有自己的 class，看的是 body 那一支（它有不透明底色 #05060c）。 */
  if(document.body.classList.contains('flight-on')) return '飛行畫面';
  for(const [sel, name] of HOME_COVERS){
    if(document.querySelector(sel)) return name;
  }
  return null;
}
export function hideHome(where){
  const home = $('home');
  if(!home || !home.classList.contains('on')) return;   // 冪等：已經收了就什麼都不做
  const cover = homeCoveredBy();
  if(!cover){
    /* ⚠ 這一行就是「偶爾露出首頁」的名字。`where` 是呼叫點的標籤 ——
         有它才知道要去修哪一條路徑（以前九個呼叫點都是同一行程式，查不出是誰）。 */
    console.warn('[home] 收首頁時沒有任何一層蓋著：', where,
                 '—— 這一格會露出底下的 #app（§6.10 ver -576：要等新的那一層真的蓋上去才收）');
    if(document.body.classList.contains('testmode')) flashHomeWarn(where);
  }
  home.classList.remove('on');
}
/* 管理人模式的紅字（同 assertNoDarkOverlay 的作法）：只給開發看，玩家看不到。 */
function flashHomeWarn(where){
  try{
    const d=document.createElement('div');
    d.textContent='⚠ 收首頁時沒有東西蓋著：'+where;
    d.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99999;background:#a01020;color:#fff;'
                   +'font:12px/1.5 monospace;padding:4px 8px;border-radius:4px;pointer-events:none';
    document.body.appendChild(d);
    setTimeout(()=>{ if(d.parentNode) d.parentNode.removeChild(d); }, 5000);
  }catch(e){}
}
