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

export function playTransition(kind, done){
  const cfg = GAME_CONFIG.transitions;
  const data = cfg && cfg[kind];
  const el = $('expelTransition');
  if(!el || !data){ if(done) done(); return; }   // 缺設定/DOM → 不擋流程

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
  const enableTimer = setTimeout(()=>{ tapEnabled = true; el.classList.add('ready'); if(el.focus) try{ el.focus(); }catch(e){} }, fadeIn);

  // 自動繼續：該 kind 設 autoMs>0 → 淡入後（自 show 起算 autoMs、至少過 fadeIn）沒點就強制 proceed。
  const autoMs = (data.autoMs != null) ? data.autoMs : 0;
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
    setTimeout(()=>{ el.classList.remove('show'); }, fadeOut);
  }
  function onTap(e){ if(e && e.preventDefault) e.preventDefault(); proceed(); }
  function onKey(e){ if(e.key==='Enter' || e.key===' ' || e.key==='Spacebar'){ e.preventDefault(); proceed(); } }

  el.addEventListener('touchstart', onTap, {passive:false});
  el.addEventListener('click', onTap);
  document.addEventListener('keydown', onKey);
}
