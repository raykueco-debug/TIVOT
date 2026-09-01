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
  /* ══ 本篇的持久 HP（ver -481，Ray：「hp除非回旅店睡覺或者用道具補血，
     否則會延續上一場」）══ 沒有這把鑰匙＝滿血（開局／睡醒）。
     ⚠ 只有**本篇**（storyFramed 的場次）讀寫；挑戰（試玩版）每場照舊滿血。 */
  hp:        'tivot_php_v1',
  /* 上一次睡覺的旅店（ver -481：「連敗三場被送到上一次睡覺的旅店」）。 */
  innLast:   'tivot_inn_last_v1',
  /* 飛行遭遇的連敗數（ver -481）：贏一場歸零、第三敗送回旅店並歸零。 */
  flightLoss:'tivot_flight_losses_v1',
  /* 蕾娜的 S 計數（ver -557）：她不是搭檔，每拿四次 S 好感 +1（docs 的 +0.25 整數化）。 */
  rennaS:    'tivot_renna_s_v1',
  /* 實體遊玩時間（ver -564，Ray：「在測跑中計時，玩家的實體遊玩時間」）：
     一輪內累計的**真實秒數**（分頁看得見且不在首頁才走，main.js 的計時器累加）。
     鐵律 9：newRun 插 0，只有 addPlaySeconds 能動。 */
  playtime:  'tivot_playtime_v1',
  /* 主武器兩支槍的掛件（ver -699）：`{alpha:'<道具id>', beta:'…'}`。
     ⚠⚠ **這是「一輪內」的東西**（§6.9）：護符是**道具**，而道具一輪一清 ——
       所以 `newRun()` 要清、`runSnapshot/runRestore` 要帶（同一張清單的兩面）。
       它與 `script/loadout.js` 的副武器編成**不同類**：那個是玩家的操作偏好
       （跨輪不清），這個掛的是身上真的有的東西。 */
  charms:    'tivot_charms_v1',
  /* 主武器的強化等級（ver -700）：1~9，出廠 1。一輪內（同掛件）。 */
  gunLv:     'tivot_gunlv_v1',
};

/* ⚠ 測試期間預設 3（Ray 指定，與 flight/index.html 的 STAGE_DEFAULT 一致）。
   改這個值會連帶改變閒聊聽得到哪些內容 —— 兩邊要一起改。 */
export const STAGE_DEFAULT = 5;   // ver -562：試飛/測試預設推到 S5（Ray：「以防萬一」；flight 那份同值）
/* ver -560（Ray：「預設是全 0，進帝都後諾才 5」）：預設全 0；諾薇兒的 5 是
   **進帝都那一刻**的一次性初始化（modules/town.js 的 open，旗標擋重複）。
   ⚠ flight/index.html 的 AFFECTION_DEFAULT 是同一個數字的複本（非 module 頁），
     改一邊要改另一邊（鐵律 7 的但書，兩邊註解互指）。 */
export const AFFECTION_DEFAULT = 0;
/* ⚠⚠ 預設名（ver -477，Ray 定案）：**托爾斯坦／托爾**（-395 曾是凱勞諾斯／凱）。
   ⚠ 故事文本**一律用暱稱 `{N}`**，除非 Ray 的稿特別標註使用全名（ver -477 同批指定）。
   西文的檔名/id（素材、插圖）與玩家自己輸入的名字**脫鉤** ——
   不要拿玩家輸入的字去拼路徑。 */
export const PLAYER_DEFAULT = '托爾斯坦';
export const NICK_DEFAULT   = '托爾';
/* ⚠⚠ **取名之前一律叫 `HUND`**（ver -398，Ray 指定）—— 那是蕾娜在還不知道他名字時
   對他的稱呼（德語「犬」）。所以「還沒取名」與「取了名」是**兩個不同的顯示**，
   不是「預設值」：預設值（托爾斯坦／托爾）是**輸入框裡的預填**，玩家按確定才成立。
   ⚠ `{P}` 與 `{N}` 在取名之前都代換成 HUND —— 台詞裡不必為此寫兩套。 */
export const NAME_BEFORE = 'HUND';
export const CHARS = ['renna','nouvelle','sorana','anya'];

const rd = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const wr = (k,v) => { try{ localStorage.setItem(k,String(v)); }catch(e){} };

/* ── stage ── */
/* ⚠ **stage 0 是合法章節**（ver -556 修，Ray：「開始故事是從 stage0 開始」）——
   主線開場（拿到船之前）就是 stage 0。舊寫法 setStage 夾下限 1、getStage 只認 v>0，
   0 根本存不進去 → 「開始故事」會吃到 STAGE_DEFAULT(3)。
   ⚠ STAGE_DEFAULT 仍是 3：那是**鑰匙不存在**（試玩版／沒跑主線）時的測試預設。
   ⚠ flight/index.html 有自己的一份讀取（非 module），它的預設也是 3 —— stage 0 時
     本來就沒有船、進不了飛行頁，不受影響。 */
export function getStage(){
  const v = parseInt(rd(K.stage),10);
  return (isFinite(v) && v>=0) ? v : STAGE_DEFAULT;
}
export function setStage(n){ n=Math.max(0, n|0); wr(K.stage, n); return n; }

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
/* ══ 本篇的持久 HP（ver -481）══ null＝滿血（鑰匙不存在）。
   讀寫點：combat.startGame（讀）、combat.storyBattleEnd（勝場寫回殘量）、
   inn.sleepHere（睡覺 clear＝滿血）、日後的補血道具（用時 setHp）。 */
/* ══ 戰鬥外使用回復道具（ver -497，Ray：「整備頁可以使用回復道具」）══
   **唯一的實作**（鐵律 8）：整備頁、日後任何戰鬥外的使用入口都走這一支。
   住在這裡是因為它動的是持久 HP（本檔擁有），而 progress → inventory 的依賴
   方向本來就通（反過來會循環）。
   回傳：{healed, hp, max}＝用掉了；{full:true}＝滿血不消耗；null＝這個道具不能用。 */
export function useHealItem(id){
  const d=inv.defOf(id), u=d && d.use;
  if(!u || u.hp==null || inv.count(id)<=0) return null;
  const max=GAME_CONFIG.tuning.playerHp;
  const g=getHp();
  const cur=(g!=null) ? Math.min(g, max) : max;
  if(cur>=max) return { full:true, hp:cur, max };
  const hp=Math.min(max, cur+u.hp);
  setHp(hp); inv.remove(id,1);
  return { healed:hp-cur, hp, max };
}
export function getHp(){
  const v = parseInt(rd(K.hp), 10);
  return isFinite(v) && v>0 ? v : null;
}
export function setHp(v){ wr(K.hp, String(Math.max(1, Math.round(v)))); }
export function clearHp(){ try{ localStorage.removeItem(K.hp); }catch(e){} }

/* ══ 上一次睡覺的旅店（ver -481）══ 睡覺那一刻記；連敗三場送回這裡。 */
export function setLastInn(town, node){ wr(K.innLast, JSON.stringify({ town, node })); }
export function getLastInn(){
  try{ const j=JSON.parse(rd(K.innLast)||'null');
       return (j && j.town && j.node) ? j : null; }catch(e){ return null; }
}

/* ══ 連敗數（ver -481 建、**ver -697 擴大成全域**）══════════════════════════
   Ray 的戰鬥分級：「遭遇戰防卡死就是死三次後送旅店」——
   所以它算的是**遭遇戰**的連敗（飛行的、城鎮那一格一格的），不分在哪張地圖。
   ⚠ **劇情戰不計數**：它的防卡死是「回檔點必須落在主角仍然可以自由行動的地方」
     （Ray 指定），不是三次送旅店。
   ⚠ 誰歸零：任何一場打贏（main 的 storyReturn 入口）、睡覺。誰累加：只有遭遇戰敗北。
   ⚠ 鑰匙沿用 `flightLoss` —— 舊存檔照樣讀得到，改鑰匙只會把在途的連敗數洗掉。 */
export function lossStreak(){ const v=parseInt(rd(K.flightLoss),10); return isFinite(v)?v:0; }
export function setLossStreak(n){
  if(n>0) wr(K.flightLoss, String(n));
  else { try{ localStorage.removeItem(K.flightLoss); }catch(e){} }
}
/* 舊名（ver -481~-696 的呼叫點）—— 同一個量，不要在別處再算一次（鐵律 7）。 */
export const flightLossCount = lossStreak;
export const setFlightLossCount = setLossStreak;

/* ══ 主武器的掛件（ver -699）══════════════════════════════════════════════
   `barrel` ＝ `config.mainGun.barrels[].id`（alpha／beta）。
   ⚠ 讀取一律經過這裡（鐵律 7）：`combat` 算傷害、`gear` 畫槽、存讀檔都問它。
   ⚠ **掛了之後被賣掉的護符**：`charmOf` 不查持有 —— 查持有是 `inventory` 的事，
     而掛件槽本來就該顯示「掛著什麼」。要擋「賣掉還在生效」就在賣的那一端卸下。 */
export function charms(){
  try{ const j=JSON.parse(rd(K.charms)||'null'); return (j&&typeof j==='object') ? j : {}; }
  catch(e){ return {}; }
}
export function charmOf(barrel){ return charms()[barrel] || null; }
/* ⚠⚠ **同一張護符不能同時掛兩支槍**（ver -700）：身上只有一個就只掛得了一支 ——
   裝到另一支等於**移過去**（原本那一支自動空出來）。持有兩個以上才各掛一個。
   ⚠ 收在這一支（鐵律 8）：日後有別的地方會裝護符（劇情給、遺跡開到就自動裝上），
     那條路不必記得再判一次。
   ⚠ `id` 傳 null／空 ＝ **卸下**。 */
export function setCharm(barrel, id){
  const c=charms();
  if(id){
    const have=inv.count(id);
    for(const k in c) if(k!==barrel && c[k]===id){
      /* 這張已經掛在別支上：夠用就各掛一個，不夠就把它移過來。 */
      if(have<2) delete c[k];
      break;
    }
    c[barrel]=id;
  }else delete c[barrel];
  wr(K.charms, JSON.stringify(c));
  return c;
}

/* ══ 主武器的強化等級（ver -700，Ray：「強化等級到 9」「現在強化一次就是 2」）══
   ⚠⚠ **唯一真相**（鐵律 9）：加成由等級算（`combat.gunTuneMul`），
     `np_gun_tuned` 那支旗**不再**參與 —— 它只剩「北方泊地那一次做過了」。
   ⚠ 誰改它：腳本那一拍的 `gunTune:N`（→ `addGunLevel`）。沒有別人。
   ⚠ 舊存檔（打過靶、還沒有這把鑰匙）**遷移一次並寫回**：不留「鑰匙不存在時
     用旗標推」那種查詢層預設值 —— 那正是鐵律 9 禁止的東西。 */
function gunCfg(){ return (GAME_CONFIG.tuning||{}).gunTune || {}; }
export function gunLevel(){
  const g=gunCfg(), base=g.base||1;
  const v=parseInt(rd(K.gunLv),10);
  if(isFinite(v)) return Math.max(base, Math.min(g.max||base, v));
  /* 一次性遷移：這一輪還沒有這把鑰匙。打過靶的存檔補成 base+1，其餘 base。 */
  const lv = base + (g.flag && hasFlag(g.flag) ? 1 : 0);
  wr(K.gunLv, lv);
  return lv;
}
export function setGunLevel(n){
  const g=gunCfg(), base=g.base||1;
  wr(K.gunLv, Math.max(base, Math.min(g.max||base, n|0)));
  return gunLevel();
}
export function addGunLevel(n){ return setGunLevel(gunLevel() + (n|0)); }

/* ══ 實體遊玩時間（ver -564）══ 秒。累加只有這一支（鐵律 8/9）。 */
export function playSeconds(){ const v=parseInt(rd(K.playtime),10); return isFinite(v)?v:0; }
export function addPlaySeconds(n){ wr(K.playtime, playSeconds()+Math.max(0,n|0)); return playSeconds(); }

/* ══⚠⚠ **拔旗**（ver -634 重新啟用；-480 那一版於 -495 拆掉，理由見下）══
   ⚠⚠ 鐵律 9：**旗插了以後被拔之前不動，要拔旗只有單一事件能拔**。
     所以這一支存在**不代表**可以隨手退旗 —— 目前唯一的呼叫者是安全區旗
     （`modules/town.js` 的 `pullSafehouse`：特殊戰開演前拔、演完插回去），
     那是「這張地圖現在安不安全」這個狀態的正常開關，不是把進度倒回去。
   ⚠ -480 那一版是拿它做**敗北回捲**（把記過的進度退掉），已被
     「打贏才記」原則取代（§6.5.2）—— **不要**再用它做那件事。 */
export function removeFlags(list){
  const cur=getFlags(), drop=new Set([].concat(list||[]));
  const next=cur.filter(f=>!drop.has(f));
  if(next.length!==cur.length) wr(K.flags, JSON.stringify(next));
  return next;
}

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
/* ══ 戰後評價 → 好感（ver -557，Ray 指定）════════════════════════════════
   「與搭檔的伙伴一起拿了 S 就會該伙伴好感度 +1，索拉娜例外，C 以下她才會 +1，
     蕾娜因為不是搭檔，所以她每拿四次 S +1」
   實作只有這一支（鐵律 8），inspector 的劇情結算算出等第後呼叫。
   · 搭檔＝CHARS 裡那幾位才有好感層（蕾妮／馬季諾是試玩版搭檔，沒有）。
   · 索拉娜：S 不加，**C／D／E** 才 +1（docs「評價越爛越加」的落地）。
   · 蕾娜：不看搭檔欄，累計 S 每 4 次 +1（一輪內計數 K.rennaS：newRun 清、
     snapshot/restore 帶 —— §6.9 同一張清單的兩面）。
   回傳這一場加到誰（[]＝沒人），呼叫端要顯示可以用。 */
export function applyRankAffection(grade, partnerKey){
  const got=[];
  if(CHARS.indexOf(partnerKey)>=0){
    if(partnerKey==='sorana'){
      if(grade==='C'||grade==='D'||grade==='E'){ addAffection('sorana',1); got.push('sorana'); }
    }else if(grade==='S'){ addAffection(partnerKey,1); got.push(partnerKey); }
  }
  if(grade==='S'){
    const n=(parseInt(rd(K.rennaS),10)||0)+1;
    wr(K.rennaS, n);
    if(n%4===0){ addAffection('renna',1); got.push('renna'); }
  }
  return got;
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

/* ── 玩家名 ──
   ⚠ 台詞裡寫 {P}，**顯示的那一刻才代換**（存進播放佇列就換的話，玩家中途
     改名，正在播的那段還是舊名字）。代換函式在 story.js 的 subst。 */
/* 取過名了沒。⚠ 判的是**鑰匙存不存在**，不是「等不等於預設值」——
   玩家真的把自己取名叫「托爾斯坦」也該算取過名。 */
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
/* ══ 章節（ver -429，Ray：「首頁插入管理員鈕『章節』，進去可直接選章節開始」）══
   ⚠⚠ **管理人限定的跳關工具**，不是正式流程 —— 每一章都先 `newRun()`（＝從頭開始的
     那一支，§6.9 的唯一邊界），再把「這一章開始時本來就該有的東西」放回去。
   ⚠ `flags` 只列**擋路的那幾個**：進場對白會不會重播、演出會不會插隊。
     列太多反而難維護，而且這是除錯工具 —— 重播一段對白不致命。
   ⚠ `clockMin` ＝開局起算的分鐘數（`script/clock.js` 的 EPOCH 是 6/13 11:00）。
     stage 1 是「隔天早上七點」，所以問 `clock.firstHourAt(7)` **不要寫死 1200**（鐵律 7）。
   ⚠ `enter` 由 `main.js` 執行（劇情／城鎮的入口在啟動層，這裡不認識它們）。 */
export const CHAPTERS = [
  { id:'stage0', name:'Stage 0', sub:'地宮 → 帝都探索 → 旅店睡覺',
    enter:'story' },
  { id:'stage1', name:'Stage 1', sub:'第二日・船塢 → 出航 → 北方泊地',
    stage:1, clockHour:7, named:true,
    flags:['dungeon_cleared','hq_briefed','renna_named','stage1_open'],
    enter:'town', town:'capital', node:'dock' },
  /* ══ Stage 3（ver -600，Ray：「寫入章節選擇讓我可以直接測」）══
     北方泊地：碼頭那一幕（司祭）→ 城鎮戰五格 → 教堂 Boss → 聖徒化教學戰。
     ⚠ `node` **不寫**：第一次降落走城上的 `firstEntry`（碼頭），跟正常玩一樣。
     ⚠ `stage:3` ＝ Ray 指定「初進北境插 Stage3」；正常玩是 `town.open` 從 2 升上來，
       這裡是跳關工具，直接寫。
     ⚠ `flags` 只列**擋路的那幾支**（§6.5.8）：出航／船塢那一段要當成看過，
       不然一進城會被主線段落抓走。城鎮戰與碼頭那一幕的旗標**故意不給** ——
       那正是要測的東西。 */
  { id:'stage3', name:'Stage 3', sub:'北方泊地・碼頭 → 城鎮戰 → 教堂 → 聖徒化教學戰',
    stage:3, clockHour:13, named:true,
    flags:['dungeon_cleared','hq_briefed','renna_named','stage1_open',
           'set_sail','got_ship','dock_day2'],
    enter:'town', town:'northport' },
  /* ══ Stage 4（ver -677）══ 北方泊地**第二天早上在旅店醒來**（Ray 定的 S4 起點）。
     ⚠ `np_day3` 要給、`np_day3_done` **不要給**：那是「閘門已經用掉了」與
       「早上那一幕演過了」的分別 —— 給了前者才不會一進去又被閘門抓一次，
       不給後者那一幕才演得到（那正是要測的東西）。
     ⚠ `clockHour:8` ＝ `firstHourAt(8)`（開局是 6/13 11:00，所以是**隔天 08:00**）。
     ⚠ 安全區旗要給：北方泊地這時已經不打仗了，不給的話走一格就被城鎮戰抓走。
     ⚠ `node:'inn'` ＝直接站在旅店裡（那一幕就在那裡演）。 */
  { id:'stage4', name:'Stage 4', sub:'北方泊地・第二天早上（旅店） → 自由探索 → 墓地',
    stage:4, clockHour:8, named:true,
    flags:['dungeon_cleared','hq_briefed','renna_named','stage1_open',
           'set_sail','got_ship','dock_day2',
           'np_port_arrive','np_clear_church','np_claws_done','safehouse_northport',
           'np_burial','np_burial_done','np_night','np_night_done','np_day3'],
    enter:'town', town:'northport', node:'inn' },
];

export function newRun(){
  for(const k of [K.stage, K.flags, K.affection, K.affFloor, K.name, K.nick,
                  K.hp, K.innLast, K.flightLoss, K.rennaS, K.playtime,
                  K.charms, K.gunLv]) {   // 持久HP／上次旅店／連敗數／蕾娜S計數／遊玩時間／掛件／強化等級
    try{ localStorage.removeItem(k); }catch(e){}
  }
  /* ⚠⚠ 從頭開始＝**S0 要寫進鑰匙**（ver -563）。清掉 stage 之後不寫回的話，
     getStage() 會掉進「無鑰匙＝測試預設(5)」—— 「開始故事」自己有補 0，
     但**章節工具的 Stage 0、日後任何新的 newRun 呼叫者**都會踩這個洞
     （Ray：「他媽的直接變 stage5」就是章節/舊紀錄那條路）。
     規矩收在這一支（鐵律 8）：呼叫 newRun 的人不必記得補；要跳章的
     （章節工具）在之後自己 setStage 覆寫。 */
  wr(K.stage, 0);
  wr(K.playtime, 0);   // 實體遊玩時間也插著（鐵律 9）
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

/* ── 整包讀寫（存讀檔用）──────────────────────────────────────────────
   ⚠⚠ 存**鑰匙的原始狀態**，不存查詢結果（ver -561，Ray：「你的 flag 問題很大，
   會出事」）。getStage()／getPlayerName() 這類查詢會把「鑰匙不存在」烘成預設值
   （stage 的測試預設是 3、名字是 HUND）—— 照查詢結果存，任何在鑰匙缺席時落的
   快照都會把預設值當真值寫進存檔，讀回來就毒發（「繼續又變 stage3」連環案、
   「沒取名的檔讀回來變成取過名」都是這一類）。
   原始值：null＝鑰匙不存在，restore 時**原樣移除** —— 存與讀之後的 localStorage
   狀態一模一樣，查詢層的預設值只活在查詢的那一刻。 */
const rawS = k => rd(k);                                   // 字串鑰匙原樣（null＝沒有）
const rawN = k => { const v=parseInt(rd(k),10); return isFinite(v)?v:null; };
const rawJ = k => { try{ return JSON.parse(rd(k)||'null'); }catch(e){ return null; } };
const putRaw = (k,v,json) => {
  if(v==null){ try{ localStorage.removeItem(k); }catch(e){} }
  else wr(k, json ? JSON.stringify(v) : String(v));
};
export function snapshot(){
  return { v:2,                                            // v2＝原始鑰匙制
           stageRaw:rawN(K.stage), flags:getFlags(),
           affectionRaw:rawJ(K.affection), affFloorRaw:rawJ(K.affFloor),
           nameRaw:rawS(K.name), nickRaw:rawS(K.nick),
           hp:getHp(), innLast:getLastInn(), fLoss:flightLossCount(),
           rennaS:rawN(K.rennaS), playtimeRaw:rawN(K.playtime),
           charmsRaw:rawJ(K.charms),      // 主武器掛件（ver -699，一輪內）
           gunLvRaw:rawN(K.gunLv) };     // 主武器強化等級（ver -700，一輪內）
}
export function restore(s){
  if(!s) return;
  if('stageRaw' in s){                                     // v2：原樣放回（含「沒有」）
    putRaw(K.stage, s.stageRaw);
    setFlags(s.flags||[]);
    putRaw(K.affection, s.affectionRaw, true);
    putRaw(K.affFloor,  s.affFloorRaw,  true);
    putRaw(K.name, s.nameRaw); putRaw(K.nick, s.nickRaw);
  }else{                                                   // v1（烘過預設的舊存檔）：僅相容
    if(s.stage!=null)     setStage(s.stage);
    if(s.flags)           setFlags(s.flags);
    if(s.affection)       setAffection(s.affection);
    if(s.affFloor)        wr(K.affFloor, JSON.stringify(s.affFloor));
    if(s.player)          setPlayerName(s.player);
    if(s.nick)            setPlayerNick(s.nick);
  }
  /* ⚠ 沒有也要清（舊存檔）：讀「還沒受傷」的檔不能帶著這一輪的殘血（§6.9 兩面）。 */
  if(s.hp!=null) setHp(s.hp); else clearHp();
  if(s.innLast) setLastInn(s.innLast.town, s.innLast.node);
  else { try{ localStorage.removeItem(K.innLast); }catch(e){} }
  setFlightLossCount(s.fLoss||0);
  putRaw(K.rennaS, s.rennaS);          // 蕾娜 S 計數（null＝沒有，原樣）
  putRaw(K.playtime, ('playtimeRaw' in s)?s.playtimeRaw:null);   // 遊玩時間（-564）
  /* 主武器掛件（ver -699）：舊存檔沒有這一欄 → 原樣移除（讀「還沒掛」的檔
     不該帶著這一輪掛上去的護符，§6.9 兩面）。 */
  putRaw(K.charms, ('charmsRaw' in s)?s.charmsRaw:null, true);
  putRaw(K.gunLv,  ('gunLvRaw'  in s)?s.gunLvRaw :null);
}
