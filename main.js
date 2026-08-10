/* ============================================================================
 *  main.js — 啟動掛載點（index.html 以 <script type="module"> 載入）
 *  ---------------------------------------------------------------------------
 *  職責（骨架）：串接底層與各模組，確認模組圖能乾淨載入、標題畫面顯示。
 *  後續步驟才在此接上：bindBtn、cut-in 綁定、手勢綁定、startGame 入口等。
 *
 *  ⚠ 本輪為骨架：只 import 各模組驗證依賴可解析，不接任何業務邏輯。
 * ========================================================================== */

import { GAME_CONFIG } from './config.js';
import { state } from './state.js';
import { SFX } from './audio.js';

// 匯入各模組（本輪皆為空殼，僅驗證模組圖可解析、路徑正確）
import './modules/combat.js';
import './modules/defense.js';
import './modules/saint.js';
import './modules/weapon.js';
import './modules/partner.js';
import './modules/inspector.js';
import './modules/enemy.js';

// 骨架健檢：確認 config / state / audio 已就位（不影響畫面）
console.log(
  '[scaffold] 骨架載入完成 ·',
  '標題：', GAME_CONFIG.enemies[GAME_CONFIG.currentEnemy]?.name,
  '· playerHp：', state.playerHp,
  '· SFX：', typeof SFX.gunshot === 'function' ? 'ready' : 'missing'
);
