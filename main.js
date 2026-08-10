/* ============================================================================
 *  main.js — 啟動掛載點（index.html 以 <script type="module"> 載入）
 *  ---------------------------------------------------------------------------
 *  composition root：串接底層與各模組、注入 combat 的協調 api、綁定按鈕與手勢、
 *  設定開機閒置畫面（首頁 + 背景盤面）。
 *
 *  本輪範圍：combat + enemy + defense（一般怪一場能打完並進結算）。
 *  聖徒化左右滑、生命歸還上滑、雙槍點計量表、換裝面板等綁定為下一輪。
 * ========================================================================== */

import { GAME_CONFIG } from './config.js';
import { state } from './state.js';
import { SFX } from './audio.js';
import * as combat from './modules/combat.js';

// 下一輪接（本輪僅載入驗證模組圖，尚未綁定其互動）
import './modules/saint.js';
import './modules/weapon.js';
import './modules/partner.js';
import './modules/inspector.js';
import './modules/enemy.js';
import './modules/defense.js';

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

bindBtn('startBtn',     combat.startGame);      // 首頁：開始遊戲
bindBtn('exitBtn',      combat.goHome);         // 右上：退出回首頁
bindBtn('testClearBtn', combat.testClearBoard); // 左上（測試用）：一鍵清盤
bindBtn('rematchBtn',   combat.goHome);         // 結算：本輪一律回首頁（迎擊/評價流程下一輪接）

window.addEventListener('resize', combat.fitGridSquare);
window.addEventListener('orientationchange', ()=>setTimeout(combat.fitGridSquare,200));

combat.bootIdle();   // over=true，建立背景盤面/血條，停在首頁

console.log('[step2] combat + enemy + defense 已接上 · 敵：', GAME_CONFIG.enemies[GAME_CONFIG.currentEnemy]?.name, '· HP', state.enemyMax);
