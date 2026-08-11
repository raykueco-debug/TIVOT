/* ============================================================================
 *  modules/transition.js — 過渡禎（開始/結束的淡入淡出全畫面轉場）
 *  ---------------------------------------------------------------------------
 *  純輸出葉節點：只 import config 讀文字/時長，操作 #expelTransition 覆蓋層，
 *  不依賴任何業務模組（比照 audio.js 的定位）。main（開始）與 combat（勝利進結算）
 *  皆可直接 import 使用，不製造反向/循環依賴。
 *
 *  時序（總長 durationMs，淡入淡出各 fadeMs）：
 *    show(opacity 0) → 次影格淡入 → 維持 → 淡出起點呼叫 done（此刻遮罩仍近不透明，
 *    在其後把底下畫面切好，淡出即揭開新畫面）→ 收尾隱藏。
 *  缺 config/DOM 時直接呼叫 done，不阻擋流程。
 * ========================================================================== */

import { GAME_CONFIG } from '../config.js';

const $ = id => document.getElementById(id);

export function playTransition(kind, done){
  const cfg = GAME_CONFIG.transitions;
  const data = cfg && cfg[kind];
  const el = $('expelTransition');
  if(!el || !data){ if(done) done(); return; }   // 缺設定/DOM → 不擋流程

  const total = cfg.durationMs || 1000;
  const fade  = cfg.fadeMs || 300;
  el.style.setProperty('--expel-fade', fade+'ms');   // CSS 淡入淡出時長與 config 同步

  $('expelCn').textContent = data.cn || '';
  $('expelEn').innerHTML   = (data.en || []).map(line => `<div>${line}</div>`).join('');

  // 顯示（先 opacity 0）→ 強制 reflow → 次影格加 vis 觸發淡入
  el.classList.add('show');
  el.classList.remove('vis');
  void el.offsetWidth;
  requestAnimationFrame(()=> el.classList.add('vis'));

  const fadeOutAt = Math.max(fade, total - fade);
  let calledDone = false;
  setTimeout(()=>{
    el.classList.remove('vis');                       // 開始淡出
    if(!calledDone){ calledDone = true; if(done) done(); }   // 遮罩仍近不透明 → 在其後切換底下畫面
  }, fadeOutAt);
  setTimeout(()=>{ el.classList.remove('show'); }, fadeOutAt + fade);
}
