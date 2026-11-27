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
 *    play_start      — 首頁「開始故事」／「繼續」（result＝new|continue）
 *    play_time       — 一段遊玩時間（time_ms）：前景每 5 分鐘、切到背景、關頁時各結算一次；加總＝總遊玩時間
 *    demo_clear      — 打到試玩結束卡（time_ms＝這台裝置累計的遊玩時間；同一台只記第一次）
 *    offline         — 網頁「離線下載」（result＝start|done|fail；done 的 time_ms＝下載花了多久）
 *  每筆都帶 platform（web｜pwa＝加到主畫面｜apk）；ver 尾巴有 `|demo` ＝試玩包。
 *  統計頁（stats.html）是密碼鎖：資料表不准匿名讀，彙總由資料庫函式 stats_summary(密碼) 回傳 —— SQL 在 docs/STATS_SETUP.sql。
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

/* ── 管理員排除 ──
 * 簽名＝首頁清盤鈕解鎖手勢（main.js testUnlockGesture → body.testmode）。解鎖瞬間
 * markAdmin() 把標記持久化到 localStorage：這台裝置從此所有事件（含之後每次開頁的
 * visit——它在手勢之前就發射，只靠當下 class 擋不住）都不再上報。
 * 要恢復計數：清掉 localStorage 的 tivot_admin_v1。 */
const ADMIN_KEY = 'tivot_admin_v1';
function isAdmin(){
  try{
    return document.body.classList.contains('testmode') || localStorage.getItem(ADMIN_KEY)==='1';
  }catch(_){ return false; }
}

const NEW_COLS = ['grade', 'platform'];   // 建表之後才補的欄（-456 grade、-3091 platform）
function platform(){
  try{
    if(window.Capacitor && (!window.Capacitor.isNativePlatform || window.Capacitor.isNativePlatform())) return 'apk';
    if((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone) return 'pwa';
  }catch(_){}
  return 'web';
}

/* ── 遊玩時間 ──
 * 「開始故事／繼續」之後才算在玩；只算前景（切到背景就結算、回來再起算）。
 * 每 5 分鐘也結算一次 —— 手機常常直接殺掉分頁、連 pagehide 都沒有，最多只丟最後那一段。
 * 這台裝置的累計放 localStorage（試玩通關那一筆用）。 */
const PLAY_KEY = 'tivot_tel_play_v1', CLEAR_KEY = 'tivot_tel_clear_v1';
const FLUSH_MS = 5 * 60 * 1000, MAX_SEG = 6 * 3600 * 1000;
let playing = false, segT0 = 0, flushT = 0;
function playTotal(){ try{ return +localStorage.getItem(PLAY_KEY) || 0; }catch(_){ return 0; } }
function flushPlay(){
  if(!playing || !segT0) return;
  const ms = Math.min(MAX_SEG, Date.now() - segT0);
  segT0 = document.visibilityState === 'hidden' ? 0 : Date.now();
  if(ms < 1000) return;
  try{ localStorage.setItem(PLAY_KEY, String(playTotal() + ms)); }catch(_){}
  send('play_time', { time_ms: ms });
}
function armPlay(){
  if(flushT) return;
  flushT = setInterval(flushPlay, FLUSH_MS);
  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState === 'hidden') flushPlay();
    else if(playing && !segT0) segT0 = Date.now();
  });
  addEventListener('pagehide', flushPlay);
}

function send(type, fields){
  if(!TELEMETRY.url || !TELEMETRY.anonKey) return;   // 未設定 → 靜默停用
  if(isAdmin()) return;                              // 管理員（清盤鈕簽名）→ 不列入計數
  try{
    const post = body => fetch(TELEMETRY.url.replace(/\/+$/,'') + '/rest/v1/events', {
      method: 'POST',
      keepalive: true,   // 結算後立即關頁也送得出去
      headers: {
        'Content-Type': 'application/json',
        apikey: TELEMETRY.anonKey,
        Authorization: 'Bearer ' + TELEMETRY.anonKey,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
    });
    const body = Object.assign({ type, client_id: cid(), ver: VERSION + (window.__tivotDemo ? '|demo' : ''), platform: platform() }, fields || {});
    /* ⚠⚠ 新欄位的退路（ver -456（-893 前用詞））：PostgREST 對**不認識的欄位**是整筆 400 拒收 ——
       資料庫還沒跑 ALTER 補欄（docs/STATS_SETUP.sql）之前，帶著新欄上報等於把整筆丟掉。
       所以 400 就把後加的欄（NEW_COLS）拿掉重送一次：舊表照樣收得到事件，只是少那幾欄。 */
    post(body).then(r=>{
      if(!r.ok && NEW_COLS.some(k=>k in body)){ const b2=Object.assign({},body); NEW_COLS.forEach(k=>delete b2[k]); post(b2).catch(()=>{}); }
    }).catch(()=>{});
  }catch(_){ /* 遙測永不打斷遊戲 */ }
}

export const TEL = {
  visit(){ send('visit'); },
  runStart(f){ send('run_start', f); },
  runEnd(f){ send('run_end', f); },
  originalClick(target){ send('original_click', { result: target }); },
  /* 首頁「開始故事」（new）／「繼續」（continue）。已經在玩（又按了一次）就先結算上一段。 */
  playStart(kind){ flushPlay(); send('play_start', { result: kind }); playing = true; segT0 = Date.now(); armPlay(); },
  /* 試玩結束卡：先結算手上這一段，再報這台裝置累計的遊玩時間。同一台只記第一次（讀檔又碰到終點不重記）。 */
  demoClear(){
    flushPlay();
    try{ if(localStorage.getItem(CLEAR_KEY)) return; localStorage.setItem(CLEAR_KEY, '1'); }catch(_){}
    send('demo_clear', { time_ms: playTotal() });
  },
  /* 網頁離線下載（offline.js 發 `tivot-offline` 事件，main 轉進來）：start／done（ms＝花多久）／fail。 */
  offline(phase, ms){ send('offline', ms ? { result: phase, time_ms: Math.round(ms) } : { result: phase }); },
  markAdmin(){ try{ localStorage.setItem(ADMIN_KEY, '1'); }catch(_){} },   // 手勢解鎖時呼叫（main.js）
  // 管理人模式改為可開可關（手勢再做一次即關閉）→ 需要能撤銷簽名，恢復遙測上報
  clearAdmin(){ try{ localStorage.removeItem(ADMIN_KEY); }catch(_){} },
  isAdminStored(){ try{ return localStorage.getItem(ADMIN_KEY)==='1'; }catch(_){ return false; } },
  isAdmin,   // 簽名查詢（目前僅內部遙測排除用；後臺鈕顯示只認 body.testmode，不讀此值）
};
