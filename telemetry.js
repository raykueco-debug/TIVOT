/* ============================================================================
 *  telemetry.js — 玩家行為遙測（純輸出底層，同 audio 定位：被呼叫上報，不依賴任何模組）
 *  ---------------------------------------------------------------------------
 *  事件經 Supabase REST 寫入單表 events（建表 SQL 見 stats.html 頁尾註解）；
 *  config.TELEMETRY 未設定時所有函式靜默 no-op——本檔在無後端環境完全不發請求。
 *  匿名 client_id 存 localStorage 估算獨立玩家（無帳號/無個資）。
 *  上報一律 fire-and-forget（keepalive + 吞錯）：任何失敗都不影響遊戲。
 *
 *  事件字典（type / 附帶欄位）：
 *    visit           — 開頁一次
 *    run_start       — 出陣（partner / weapon / boss）
 *    run_end         — 勝負結算（partner / weapon / boss / result:'win'|'lose' / time_ms）
 *    original_click  — 首頁「原作」外連點擊（result＝連結名：巴哈姆特/Penana）
 * ========================================================================== */

import { TELEMETRY, VERSION } from './config.js';

const CID_KEY = 'tivot_cid_v1';
function cid(){
  try{
    let c = localStorage.getItem(CID_KEY);
    if(!c){ c = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(CID_KEY, c); }
    return c;
  }catch(_){ return 'anon'; }   // localStorage 不可用（私密模式等）→ 仍上報、不算獨立玩家
}

function send(type, fields){
  if(!TELEMETRY.url || !TELEMETRY.anonKey) return;   // 未設定 → 靜默停用
  try{
    fetch(TELEMETRY.url.replace(/\/+$/,'') + '/rest/v1/events', {
      method: 'POST',
      keepalive: true,   // 結算後立即關頁也送得出去
      headers: {
        'Content-Type': 'application/json',
        apikey: TELEMETRY.anonKey,
        Authorization: 'Bearer ' + TELEMETRY.anonKey,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(Object.assign({ type, client_id: cid(), ver: VERSION }, fields || {})),
    }).catch(()=>{});
  }catch(_){ /* 遙測永不打斷遊戲 */ }
}

export const TEL = {
  visit(){ send('visit'); },
  runStart(f){ send('run_start', f); },
  runEnd(f){ send('run_end', f); },
  originalClick(target){ send('original_click', { result: target }); },
};
