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

import { GAME_CONFIG } from '../config.js';   // 只為了拿教學的 storageKey（不要抄第二份字串）
/* ⚠ 「一輪遊戲」包含道具與時鐘，所以存讀檔要一起帶（見 runSnapshot）。
   兩支都是 `script/` 的同層資料模組，沒有循環相依。 */
import * as inv from './inventory.js';
import * as shopStock from './shopstock.js';   // 店鋪存貨（ver -405）
import * as clock from './clock.js';

const K = {
  stage:     'tivot_stage_v1',
  flags:     'tivot_flags_v1',
  affection: 'tivot_affection_v1',
  /* 好感的**棘輪地板**（ver -358）：每個角色「曾經達到的 tier 的下限」。
     ⚠ 另開一支鑰匙而不是塞進 affection：`tivot_affection_v1` 的形狀
       （`{renna:10,…}` 純數字）是 flight/index.html 也在讀的，不能動。 */
  affFloor:  'tivot_aff_floor_v1',
  name:      'tivot_player_name_v1',
  /* 暱稱（ver -395）：蕾娜之後會用暱稱叫他。⚠ 另開一支鑰匙而不是塞進 name ——
     兩個是分開輸入、分開顯示的（`{P}` 名字／`{N}` 暱稱）。 */
  nick:      'tivot_player_nick_v1',
};

/* ⚠ 測試期間預設 3（Ray 指定，與 flight/index.html 的 STAGE_DEFAULT 一致）。
   改這個值會連帶改變閒聊聽得到哪些內容 —— 兩邊要一起改。 */
export const STAGE_DEFAULT = 3;
export const AFFECTION_DEFAULT = 10;
/* ⚠⚠ 預設名（ver -395，Ray 定案）：**凱勞諾斯／凱**。
   西文的 `Keraunos` / `Ky` 是**檔名與程式用的**（插圖、素材、id），
   與玩家自己輸入的名字**脫鉤** —— 不要拿玩家輸入的字去拼路徑。 */
export const PLAYER_DEFAULT = '凱勞諾斯';
export const NICK_DEFAULT   = '凱';
/* ⚠⚠ **取名之前一律叫 `HUND`**（ver -398，Ray 指定）—— 那是蕾娜在還不知道他名字時
   對他的稱呼（德語「犬」）。所以「還沒取名」與「取了名」是**兩個不同的顯示**，
   不是「預設值」：預設值（凱勞諾斯／凱）是**輸入框裡的預填**，玩家按確定才成立。
   ⚠ `{P}` 與 `{N}` 在取名之前都代換成 HUND —— 台詞裡不必為此寫兩套。 */
export const NAME_BEFORE = 'HUND';
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
/* tier 的下限值（tier 1→1、2→11、3→21…）。棘輪就是「不跌破這條線」。 */
export function tierFloor(t){ return Math.max(1, (Math.min(5,Math.max(1,t|0))-1)*10 + 1); }

/* ── 好感度的加減（ver -358，四人各自計數）───────────────────────────
   ⚠⚠ 三條規矩，缺一個都會走鐘：
     ① **棘輪**：可以扣，但**不跌破已達 tier 的下限**（docs/TIVOT_IMPL_SPEC.md §2）。
        地板另存一支鑰匙（見 K.affFloor），因為 affection 那支的形狀被 flight 頁共用。
     ② **小數要留住**：蕾娜只吃 S 評價且一次 **+0.25**（docs/TIVOT_AFFECTION_RULES.md），
        存的時候**不可以 `|0`**。這裡一律存實數，四捨到 1/4（`Math.round(v*4)/4`）——
        避免浮點誤差累積成 10.249999。
        ⚠ flight/index.html 的 `setAffection` 有 `v|0`（它自己寫入時會截斷）；
          **讀**是好的。哪天要在飛行頁加減好感，那一行也得跟著改。
     ③ 上限 50（tier 5 的頂）、下限 0。 */
const AFF_MAX = 50;
function getFloors(){
  const out={}; for(const c of CHARS) out[c]=1;
  try{ const j=JSON.parse(rd(K.affFloor)||'null');
    if(j) for(const c of CHARS) if(typeof j[c]==='number') out[c]=j[c];
  }catch(e){}
  return out;
}
export function addAffection(who, delta){
  if(CHARS.indexOf(who)<0) return null;
  const aff=getAffection(), floors=getFloors();
  const q = v => Math.round(v*4)/4;                    // 對齊到 1/4（蕾娜的 +0.25）
  let v = q((typeof aff[who]==='number' ? aff[who] : AFFECTION_DEFAULT) + (+delta||0));
  v = Math.min(AFF_MAX, Math.max(0, v));
  const floor = floors[who]||1;
  if(v < floor) v = floor;                             // ① 棘輪
  aff[who]=v; setAffection(aff);
  const nf = tierFloor(tierOf(v));
  if(nf > floor){ floors[who]=nf; wr(K.affFloor, JSON.stringify(floors)); }
  return v;
}
export function affectionOf(who){
  const v=getAffection()[who];
  return (typeof v==='number') ? v : AFFECTION_DEFAULT;
}
export function tierOfChar(who){ return tierOf(affectionOf(who)); }

/* ── 玩家名 ──
   ⚠ 台詞裡寫 {P}，**顯示的那一刻才代換**（存進播放佇列就換的話，玩家中途
     改名，正在播的那段還是舊名字）。代換函式在 story.js 的 subst。 */
/* 取過名了沒。⚠ 判的是**鑰匙存不存在**，不是「等不等於預設值」——
   玩家真的把自己取名叫「凱勞諾斯」也該算取過名。 */
export function isNamed(){ const v=rd(K.name); return !!(v && v.trim()); }
export function getPlayerName(){ const v=rd(K.name); return (v && v.trim()) ? v : NAME_BEFORE; }
export function setPlayerName(v){ wr(K.name, (v||'').trim() || PLAYER_DEFAULT); }
export function getPlayerNick(){
  const v=rd(K.nick); if(v && v.trim()) return v;
  return isNamed() ? NICK_DEFAULT : NAME_BEFORE;   // 還沒取名 → HUND
}
export function setPlayerNick(v){ wr(K.nick, (v||'').trim() || NICK_DEFAULT); }

/* ══ 開新的一輪（ver -381，Ray：「劇情只跑一次是指**一輪遊戲內**只跑一次；
   從頭開始、或從之前的存檔開始，都要跑劇情」）══
   ⚠⚠ 「一輪遊戲」的邊界寫在**這一支**：要清哪些東西只在這裡列一次（鐵律 8）。
     漏掉一項的下場 Ray 已經回報過 —— 從頭開始卻沒有劇情（城鎮的旗標還留著）。
   ⚠ 清的是「這一輪打出來的東西」：旗標、階段、好感、時鐘、道具、金錢、玩家名、
     教學看過沒。**不清**的是跨輪的設定（靜音、語言、管理人模式、最佳紀錄）——
     那些是玩家的偏好與成績，不是劇情進度。
   ⚠ 讀檔**不要走這一支**：讀檔是 `restore()`（把那個存檔的旗標放回來），
     兩者是不同的事 —— 讀檔之後該演的劇情自然會演，因為那個存檔就還沒演過。 */
export function newRun(){
  for(const k of [K.stage, K.flags, K.affection, K.affFloor, K.name, K.nick]) {
    try{ localStorage.removeItem(k); }catch(e){}
  }
  /* 其他模組自己的存檔。⚠ 這裡列出來就是「它屬於一輪遊戲」的宣告 ——
     日後新增任何一輪內的存檔（例如城鎮的所在節點），**一定要加進這一行**。 */
  const tutKey = (GAME_CONFIG.tutorial||{}).storageKey;   // ⚠ 問 config，不要抄字串（鐵律 7）
  for(const k of ['tivot_clock_v1', 'tivot_inventory_v1', 'tivot_money_v1', tutKey,
                  shopStock.KEY,                            // 店鋪存貨（ver -405）
                  /* 飛行頁的交棒（ver -382）：待打的遭遇戰、以及打完要回去的座標。 */
                  'tivot_battle_req_v1', 'tivot_flight_ret_v1']) {
    if(!k) continue;
    try{ localStorage.removeItem(k); }catch(e){}
  }
  return true;
}

/* ══ 一輪遊戲的整包存讀（ver -381）══
   ⚠⚠ 與 `newRun()` 是**同一張清單的兩面**：newRun 清掉的東西，這裡就要存得起來、
     讀得回去。加了新的「一輪內」存檔，**兩支都要加**（漏一支的下場：讀了舊存檔
     卻還帶著新一輪的錢）。
   ⚠ 不含跨輪的東西（靜音、語言、最佳紀錄、武器/搭檔的選擇）—— 那些是玩家的偏好
     與成績，讀檔不該把它們拉回去。 */
export function runSnapshot(){
  return { progress:snapshot(), clock:clock.elapsed(), inv:inv.snapshot(),
           shop:shopStock.snapshot() };
}
export function runRestore(s){
  if(!s) return;
  if(s.progress)     restore(s.progress);
  if(s.clock!=null)  clock.setElapsed(s.clock);
  if(s.inv)          inv.restore(s.inv);
  /* ⚠ 店鋪存貨**沒有也要清**（給舊存檔用）：不清的話讀了一個「還沒買過東西」的檔，
     貨架卻停在上一輪買空的狀態（§6.9 的兩面）。 */
  shopStock.restore(s.shop || {});
}

/* ── 整包讀寫（存讀檔用）── */
export function snapshot(){
  return { stage:getStage(), flags:getFlags(), affection:getAffection(),
           affFloor:getFloors(), player:getPlayerName(), nick:getPlayerNick() };
}
export function restore(s){
  if(!s) return;
  if(s.stage!=null)     setStage(s.stage);
  if(s.flags)           setFlags(s.flags);
  if(s.affection)       setAffection(s.affection);
  if(s.affFloor)        wr(K.affFloor, JSON.stringify(s.affFloor));
  if(s.player)          setPlayerName(s.player);
  if(s.nick)            setPlayerNick(s.nick);
}
