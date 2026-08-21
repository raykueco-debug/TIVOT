/* ══════════════════════════════════════════════════════════════════════
   progress.js — 劇情層進度狀態（跨頁共用的單一真相）
   ──────────────────────────────────────────────────────────────────────
   stage / flags / 好感 / 玩家名。**主遊戲與 flight 頁讀寫同一組 localStorage
   鑰匙**，不會兩邊各有一份而走鐘（作法沿用 flight/index.html 的既有慣例）。

   ⚠ 資料流（TIVOT_SCRIPT_ARCHITECTURE §0.2）：**主線寫，其餘讀**。
     只有 mainScript 的 scene 有權 setStage / setFlags；閒聊、支線、旅店互動
     一律只讀。這裡不強制，但寫入點請保持在 story.js 的 scene 收尾。
   ⚠ flight/index.html 目前有自己的一份讀取程式（STAGE_KEY / AFFECTION_KEY），
     **鑰匙字串與本檔相同故不會走鐘**；哪天要收斂成單一實作，改 flight 那邊
     來 import 本檔即可。
   ══════════════════════════════════════════════════════════════════════ */

const K = {
  stage:     'tivot_stage_v1',
  flags:     'tivot_flags_v1',
  affection: 'tivot_affection_v1',
  name:      'tivot_player_name_v1',
};

/* ⚠ 測試期間預設 3（Ray 指定，與 flight/index.html 的 STAGE_DEFAULT 一致）。
   改這個值會連帶改變閒聊聽得到哪些內容 —— 兩邊要一起改。 */
export const STAGE_DEFAULT = 3;
export const AFFECTION_DEFAULT = 10;
export const PLAYER_DEFAULT = '托爾斯';
export const CHARS = ['renna','nouvelle','sorana','anya'];

const rd = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const wr = (k,v) => { try{ localStorage.setItem(k,String(v)); }catch(e){} };

/* ── stage ── */
export function getStage(){
  const v = parseInt(rd(K.stage),10);
  return (isFinite(v) && v>0) ? v : STAGE_DEFAULT;
}
export function setStage(n){ n=Math.max(1, n|0); wr(K.stage, n); return n; }

/* ── flags：一次性旗標集合（scene 播完寫入，存檔要帶）── */
export function getFlags(){
  try{ const j=JSON.parse(rd(K.flags)||'[]'); return Array.isArray(j)? j : []; }catch(e){ return []; }
}
export function setFlags(list){ wr(K.flags, JSON.stringify([...new Set(list||[])])); }
export function addFlags(list){
  if(!list || !list.length) return getFlags();
  const s=new Set(getFlags()); for(const f of list) s.add(f);
  const out=[...s]; setFlags(out); return out;
}
export function hasFlag(f){ return getFlags().indexOf(f)>=0; }

/* ── 好感 ──
   ⚠ tier 界線 10/20/30/40/50，**棘輪只升不降**（docs/TIVOT_IMPL_SPEC.md §2）。
     tier = floor((aff-1)/10)+1 → 1..5。這裡只做值與查詢；
     tier_lock 的落地（affection 可跌但不跌破已達 tier 的底）尚未實作。 */
export function getAffection(){
  const out={}; for(const c of CHARS) out[c]=AFFECTION_DEFAULT;
  try{
    const j=JSON.parse(rd(K.affection)||'null');
    if(j) for(const c of CHARS) if(typeof j[c]==='number') out[c]=j[c];
  }catch(e){}
  return out;
}
export function setAffection(obj){ wr(K.affection, JSON.stringify(obj||{})); }
export function tierOf(aff){ return Math.min(5, Math.max(1, Math.floor((aff-1)/10)+1)); }

/* ── 玩家名 ──
   ⚠ 台詞裡寫 {P}，**顯示的那一刻才代換**（存進播放佇列就換的話，玩家中途
     改名，正在播的那段還是舊名字）。代換函式在 story.js 的 subst。 */
export function getPlayerName(){ const v=rd(K.name); return (v && v.trim()) ? v : PLAYER_DEFAULT; }
export function setPlayerName(v){ wr(K.name, (v||'').trim() || PLAYER_DEFAULT); }

/* ── 整包讀寫（存讀檔用）── */
export function snapshot(){
  return { stage:getStage(), flags:getFlags(), affection:getAffection(), player:getPlayerName() };
}
export function restore(s){
  if(!s) return;
  if(s.stage!=null)     setStage(s.stage);
  if(s.flags)           setFlags(s.flags);
  if(s.affection)       setAffection(s.affection);
  if(s.player)          setPlayerName(s.player);
}
