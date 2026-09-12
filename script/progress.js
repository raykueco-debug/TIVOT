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
  /* 主武器的強化等級（ver -700）：舊的線性 Lv1~9，-707 已由九顆星取代，
     這把鑰匙只剩**遷移來源**（見 gunStars）。 */
  gunLv:     'tivot_gunlv_v1',
  /* 主武器的九階強化（ver -707）：`{星id: 已升幾次}`。一輪內（同掛件）。 */
  gunStars:  'tivot_gunstars_v1',
  /* ══ 女主的九級（ver -970）══ `{搭檔key: 累計 EXP}`。**一輪內**（同九星／掛件）。
     ⚠ **只存 EXP，不存等級**：等級由累計值查 `config.girls.expTo` 推出來
       （鐵律 7 —— 存了就是第二個真相，兩者一定會走鐘）。 */
  girlExp:   'tivot_girlexp_v1',
  /* ══ 女主**已點亮的星**（ver -1132，Ray：「女主的星要用戰鬥紀錄點亮」）══
     `{搭檔key: {星序(1起): 1}}`。**一輪內**（同 EXP／九星／掛件）。
     ⚠ 與等級是**兩件事**：等級（由 EXP 推）只決定「能不能點」，
       真的亮不亮看這裡（`girlBonus` 只加這裡有的）。
     ⚠ 鑰匙不存在 ＝ **舊存檔**，見 `girlStarsAll()` 的一次性遷移。 */
  girlStars: 'tivot_girlstars_v1',
  /* ══ 戰績統計（ver -1023，Ray：「統計總局數、總擊場數、各女角的局數、平均得分」）══
     `{ sessions, kills, byGirl:{ <who>:{ n, score } } }`
       · `sessions` ＝**總局數**（一次結算算一局，§0.5 的「局」）
       · `kills`    ＝**總擊場數**（打倒幾隻怪，§0.5 的「場」）
       · `byGirl[x].n`／`.score` ＝那一位出過場的局數、與那幾局的**原始分**總和
     ⚠⚠ **存原始分，不存鏡射過的**：索菈娜「反著算」是**顯示**的事
       （名單在 `rating.exp.invertFor`，鏡射只有一個計算點，鐵律 7）——
       存進去就再也分不出「這是原始分還是已經翻過的」。
     ⚠⚠ **這是「一輪內」的東西**（§6.9）：`newRun()` 要清、`runSnapshot/runRestore`
       要帶 —— 同一張清單的兩面。Ray：「這些都要跟存檔」。 */
  stats:     'tivot_stats_v1',
  /* 副武器的改裝等級（ver -714）：`{武器id: 階}`，0~卡上的 `maxMod`。一輪內。 */
  wmod:      'tivot_wmod_v1',
  /* ══ 吃過的料理（ver -953，Ray：「HP 上限＋40 是一輪內」）══ 陣列，元素＝
     `config.cooking.dishes` 的鑰匙。**每一道的加成只算一次** —— 存的是「吃過哪幾道」
     不是「吃過幾次」，不然帶食材反覆煮同一道就能無限刷上限。
     ⚠ 一輪內（同掛件／九星／改裝）：`newRun()` 清、`snapshot/restore` 帶。
     ⚠ 鐵律 9：誰插＝`addCooked`（煮出來那一刻）；誰拔＝只有 newRun／restore。 */
  dishes:    'tivot_dishes_v1',
  /* 杰羅的賭博式改造（ver -866，Ray 的 E 規格）：`{武器id: 加成小數}`（0.15~0.50，
     成功一次就定住）。一輪內（同 wmod）。 */
  jmod:      'tivot_jeromod_v1',
};

/* ⚠ 測試期間預設 3（Ray 指定，與 flight/index.html 的 STAGE_DEFAULT 一致）。
   改這個值會連帶改變閒聊聽得到哪些內容 —— 兩邊要一起改。 */
export const STAGE_DEFAULT = 7;   // ver -742（Ray：「試飛改 stage7」）：S5＝北泊出航已定案，測試預設再推開（flight 那份同值）
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
  const max=playerMaxHp();   // ⚠ 上限的計算點只有那一支（ver -953：料理會把它墊高）
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

/* ══⚠⚠ 主武器的九階強化（ver -707，Ray 交卡：水瓶座九顆星）══════════════════
   `{星id: 已升幾次}`。非線性 —— 玩家自由選要升哪一顆，沒有先後。
   ⚠⚠ **累計加成只有 `bonus` 一個查詢點**（鐵律 7）：九個效果散在
     combat／weapon／defense／saint／inspector，各自去翻 `gunStars` 的話，
     哪天改欄位名就會有一半沒跟上。
   ⚠ 舊存檔（線性 Lv1~9）**遷移成「吞噬者」的次數**：那時的效果就是 +5% 普攻
     （`tuning.gunTune`），語意完全對得上；Lv1 是出廠所以 (lv−1) 次。
     遷移之後把舊鑰匙留著不動 —— 它已經沒有人讀，刪不刪都一樣，留著可回溯。 */
function starDefs(){ return (GAME_CONFIG.gunStars||[]); }
export function gunStars(){
  try{ const j=JSON.parse(rd(K.gunStars)||'null'); if(j && typeof j==='object') return j; }catch(e){}
  /* 一次性遷移：這一輪還沒有這把鑰匙 → 由舊的線性等級換算並寫回。 */
  const lv=parseInt(rd(K.gunLv),10);
  const base=((GAME_CONFIG.tuning||{}).gunTune||{}).base || 1;
  const n=(isFinite(lv) && lv>base) ? (lv-base) : 0;
  const out=n>0 ? { albali:n } : {};
  wr(K.gunStars, JSON.stringify(out));
  return out;
}
export function starCount(id){ return (gunStars()[id]|0); }
export function hasStar(id){ return starCount(id)>0; }
export function addStar(id, n){
  const def=starDefs().find(d=>d.id===id); if(!def) return null;
  const cur=gunStars();
  const have=cur[id]|0;
  if(have>0 && !def.repeat) return cur;          // 單次的星升過就不再升
  cur[id]=have+(n==null?1:n);
  wr(K.gunStars, JSON.stringify(cur));
  return cur;
}
/* ⚠⚠ **直接設定次數：管理人模式限定的梯子**（ver -714，Ray：「管理人模式下可以
   自由點亮，熄滅槍的九星」）。正規的路只有兩條 —— 槍店的素材強化與腳本的
   `gunStar:`（都走 `addStar`）；這一支是給 `body.testmode` 的整備頁用的，
   同章節跳關那種開發工具（鐵律 9 的例外要明寫，不要讓它看起來像正規入口）。 */
export function setStarCount(id, n){
  const def=starDefs().find(d=>d.id===id); if(!def) return null;
  const cur=gunStars();
  const v=Math.max(0, n|0);
  if(v>0) cur[id]=v; else delete cur[id];
  wr(K.gunStars, JSON.stringify(cur));
  return cur;
}

/* ══⚠⚠⚠ 女主的九級（ver -970，Ray 交辦）══════════════════════════════════
   > 「像嘉尼米德那樣分九級，但是**純吃 exp**」「你先放 lv1~lv9，星名跟對應技能
   >   我會分角色給你」「蕾娜沒有」

   ⚠⚠ **與九星刻意不共用**（它們不是同一個量）：九星是非線性、吃素材、`{id:次數}`；
     這一套是線性 Lv1→Lv9、純吃 EXP、一位一個累計數字。
   ⚠⚠ **只存 EXP，等級是算出來的**（鐵律 7）：`girlLevel()` 拿累計值去查
     `config.girls.expTo` 的門檻 —— 存「等級」就是第二個真相，改了陡度就走鐘。
   ⚠ 名單問 `config.girls.who`（＝三位戰鬥搭檔），不要在這裡抄一份。
   ══════════════════════════════════════════════════════════════════════════ */
function girlCfg(){ return (GAME_CONFIG.girls||{}); }
function girlKeys(){ return girlCfg().who || []; }
export function isGirl(who){ return girlKeys().indexOf(who)>=0; }
/* 累計 EXP 表（`{key: exp}`）。⚠ 沒有鑰匙＝這一輪還沒有人拿過 EXP，回空物件。 */
export function girlExpAll(){
  try{ const j=JSON.parse(rd(K.girlExp)||'null'); if(j && typeof j==='object') return j; }catch(e){}
  return {};
}
export function girlExp(who){ return (girlExpAll()[who]|0); }
/* 累計 EXP → 等級（1~9）。⚠ 門檻是**累計值的下限**（同 `rating.tiers` 的讀法）：
   由高往低找第一個過得了的。查不到表（還沒填）就一律 Lv1 —— 不要回 0，
   「等級 0」在這個系統裡沒有意義，而且會讓顯示端跑出「Lv0」。 */
export function girlLevel(who){
  const tab = girlCfg().expTo || [0];
  const e = girlExp(who);
  for(let i=tab.length-1; i>=0; i--){ if(e >= tab[i]) return i+1; }
  return 1;
}
export function girlMaxLv(){ return (girlCfg().expTo || [0]).length; }
/* ══ 距離下一級還差多少／這一級的區間 ══ 滿級 `to` 回 null。
   ⚠⚠ ver -1022：拆成**吃「累計 EXP」的純函式**（`girlProgressOf`）＋ 讀現況的
   包裝（`girlProgress`）—— 結算頁的 EXP 進度條要畫「這一局之前」與「之後」兩個
   位置，那個「之前」是算出來的，不是現在存檔裡的值。
   ⇒ 等級的門檻表因此仍然**只有這一支在查**（鐵律 7）：呼叫端不要自己拿 `expTo` 比。 */
export function girlProgressOf(exp){
  const tab = girlCfg().expTo || [0];
  const e = Math.max(0, +exp||0);
  let lv = 1; for(let i=tab.length-1; i>=0; i--){ if(e >= tab[i]){ lv = i+1; break; } }
  if(lv >= tab.length) return { lv, exp:e, from:tab[lv-1], to:null, need:0, ratio:1 };
  const from = tab[lv-1], to = tab[lv];
  return { lv, exp:e, from, to, need:Math.max(0, to-e),
           ratio: (to>from) ? Math.min(1, Math.max(0, (e-from)/(to-from))) : 1 };
}
export function girlProgress(who){ return girlProgressOf(girlExp(who)); }
/* 加 EXP。回傳 `{who, gain, exp, from, to}`（`from`／`to` ＝等級，用來報升級）；
   不是這套系統裡的人就回 null。
   ⚠ **只有 `inspector` 的結算會叫它**（正規入口只有一個，鐵律 8）——
     日後要在別的地方給 EXP（劇情獎勵那種），照 `gunStar:` 的作法走腳本那一拍。 */
export function addGirlExp(who, n){
  if(!isGirl(who)) return null;
  const gain = Math.max(0, Math.round(+n||0));
  if(!gain) return null;
  const all = girlExpAll();
  const before = girlLevel(who);
  all[who] = (all[who]|0) + gain;
  wr(K.girlExp, JSON.stringify(all));
  const after = girlLevel(who);
  /* ══⚠⚠⚠ **升一級 ＝ 入袋一份《她的戰鬥紀錄》**（ver -1132，Ray 交辦）══
     發放**只有這一處**（鐵律 8）：任何加戰鬥紀錄的路徑都經過這一支，
     所以「升級就給」不必在每個呼叫端記得寫。
     ⚠ 一次升好幾級（跳關／大量點數）就給好幾份 —— 乘的是**級數差**。
     ⚠ 份數在資料上（`girls.recordPerLevel`，鐵律 1）。
     ⚠ 回傳多一格 `records`：結算頁要印「入手 ×N」（畫面端不要自己再算一次）。 */
  let records = 0;
  if(after > before){
    records = Math.max(0, (after-before) * ((girlCfg().recordPerLevel|0) || 0));
    if(records) inv.add(recordIdOf(who), records);
  }
  return { who, gain, exp:all[who], from:before, to:after, records };
}
/* 《她的戰鬥紀錄》的道具 id ——**只有這一支在拼**（鐵律 7）：`items.defs` 那三筆
   的鍵就是這個規則（`rec_<搭檔key>`）。 */
export function recordIdOf(who){ return 'rec_'+who; }
/* 她手上有幾份（讀道具袋，唯一的帳本）。 */
export function girlRecords(who){ return inv.count(recordIdOf(who))|0; }

/* ══⚠⚠⚠ **已點亮的星**（ver -1132）══════════════════════════════════════════
   `{who:{星序:1}}`。⚠ 星序**1 起算**（與畫面上的 LV.n 同一個數字，免得兩邊差一）。
   ⚠⚠ **舊存檔的遷移**：這把鑰匙不存在 ＝ 這個檔是 -1132 之前的，那時**等級到了
     星就自動亮** —— 直接沒收玩家手上已經有的能力是錯的，所以視為
     「Lv1~現等級全部已點亮」並寫回去（一次性，寫完就有鑰匙了）。
   ⚠ 之後新升的等級**不會**自動亮：那正是這一版要改的事。 */
export function girlStarsAll(){
  let j=null;
  try{ j=JSON.parse(rd(K.girlStars)||'null'); }catch(e){}
  if(j && typeof j==='object') return j;
  const out={};
  for(const w of girlKeys()){
    const lv=girlLevel(w), set={};
    /* ⚠ 只有真的練過的人要遷移（Lv1 且 EXP 0 ＝ 還沒開始，給她一顆 Lv1 星
       反而是憑空多給）。 */
    if(girlExp(w) > 0) for(let i=1;i<=lv;i++) set[i]=1;
    if(Object.keys(set).length) out[w]=set;
  }
  wr(K.girlStars, JSON.stringify(out));
  return out;
}
export function girlStarOn(who, i){ return !!((girlStarsAll()[who]||{})[i]); }
/* 第 i 顆星要幾份戰鬥紀錄（資料在 `girls.starCost`，鐵律 1）。
   ⚠ 表短了就用最後一格（不要回 0 ＝ 免費）。 */
export function girlStarCost(i){
  const t=girlCfg().starCost||[];
  if(!t.length) return 0;
  return Math.max(0, (t[Math.min(i, t.length)-1]|0));
}
/* 「現在點得動這一顆嗎」——**唯一的判定**（鐵律 7/8）：UI 畫暗、按下去、
   日後任何自動點亮的路徑都問它。回傳 `{ok, why, cost, have}`。 */
export function canLightStar(who, i){
  const cost=girlStarCost(i), have=girlRecords(who);
  if(!isGirl(who))            return { ok:false, why:'notgirl', cost, have };
  if(girlStarOn(who,i))       return { ok:false, why:'on',      cost, have };
  if(girlLevel(who) < i)      return { ok:false, why:'level',   cost, have };
  if(have < cost)             return { ok:false, why:'record',  cost, have };
  return { ok:true, why:'', cost, have };
}
/* 點亮。`free`＝管理人模式的梯子（不扣道具、不看門檻，同 `setGirlLevel`／
   `setStarCount` 的性質，鐵律 9 的明寫例外）。回傳有沒有真的點亮。 */
export function lightGirlStar(who, i, free){
  if(!isGirl(who)) return false;
  if(!free && !canLightStar(who,i).ok) return false;
  if(girlStarOn(who,i) && !free) return false;
  const all=girlStarsAll();
  const set=all[who]||(all[who]={});
  if(free && set[i]){ delete set[i]; wr(K.girlStars, JSON.stringify(all)); return true; }   // 管理人：再點一次熄掉
  if(!free){ const c=girlStarCost(i); if(c) inv.remove(recordIdOf(who), c); }
  set[i]=1; wr(K.girlStars, JSON.stringify(all));
  return true;
}
/* ══⚠⚠⚠ **死亡代價：掉一半現有戰鬥紀錄，但等級是棘輪**（ver -1135，Ray：
   「死亡代價是掉一半現有 exp，但是已經升的級不會往下掉，等級是棘輪」
   「掉**該場夥伴**的一半現有 exp」）══════════════════════════════════════════
   · 掉的是**點數**（`girlExp`），不是已經點亮的星 —— 星是花道具換的，不退。
   · **棘輪**：夾在**現在這一級的門檻**上，所以等級一階都不會掉
     （門檻表只有 `girlProgressOf`／這裡在查，鐵律 7 —— 呼叫端不要自己拿 `expTo` 比）。
   · 已經升起來的那一級因此只會「離下一級更遠」，不會變成 Lv 掉一格。
   ⚠ 只有**那一場出戰的搭檔**（`state.pickedPartner`，由呼叫端傳進來）——
     無夥伴（`solo`）那幾場傳 null，`isGirl` 擋掉，什麼都不會發生。
   ⚠ 唯一的呼叫點是 `combat.lose()`（鐵律 8）：`allowLose` 的「劇本要你輸」
     那幾場**不罰** —— 那是劇情不是失敗。
   回傳 `{who, from, to, lost, lv}`（沒有可罰的就 null），給結算頁印那一列。 */
export function penalizeGirlExp(who){
  if(!isGirl(who)) return null;
  const all = girlExpAll();
  const cur = all[who]|0;
  if(cur <= 0) return null;
  const tab = girlCfg().expTo || [0];
  const lv  = girlLevel(who);
  const floorExp = tab[lv-1]|0;                    // 這一級的門檻＝棘輪的地板
  const next = Math.max(floorExp, Math.floor(cur/2));
  if(next >= cur) return null;
  all[who] = next; wr(K.girlExp, JSON.stringify(all));
  return { who, from:cur, to:next, lost:cur-next, lv };
}

/* ⚠⚠ **直接設等級：管理人模式限定的梯子**（同 `setStarCount` 的性質，鐵律 9 的
   明寫例外）—— 把累計 EXP 寫成那一級的門檻值。正規的路只有結算發放。 */
export function setGirlLevel(who, lv){
  if(!isGirl(who)) return null;
  const tab = girlCfg().expTo || [0];
  const v = Math.max(1, Math.min(tab.length, lv|0));
  const all = girlExpAll();
  all[who] = tab[v-1]|0;
  wr(K.girlExp, JSON.stringify(all));
  return all;
}
/* ══⚠⚠ **女主等級的加成：唯一查詢點**（鐵律 7，同 `bonus()` 對九星做的事）══
   把 Lv1~現在這一級的 `levels[who][i][key]` 加總。
   ⚠⚠ **現在一定回 0** —— `config.girls.levels` 的九格是空的（星名與效果等 Ray
     分角色給）。這一支先立好，卡填進去那一刻所有呼叫點自動吃到，一行都不必改。
   ⚠ 它與 `bonus()` **分開**：那一支是「玩家自己」的加成（槍與料理），
     這一支是「哪一位搭檔」的 —— 混在一起就答不出「換人之後還算不算」。 */
export function girlBonus(who, key){
  if(!isGirl(who)) return 0;
  const arr = (girlCfg().levels||{})[who] || [];
  /* ⚠⚠⚠ **ver -1132：只加「已點亮」的星**（原本是 Lv1~現等級全加）——
     等級現在只是「能不能點」的門檻，真的要生效還得花《戰鬥紀錄》點亮。
     ⚠ 這是**唯一**一處在決定「她現在有哪些能力」（鐵律 7）：呼叫端照舊只問
       `girlBonus`／`girlHas`，一行都不必改。 */
  const lit = girlStarsAll()[who] || {};
  let sum = 0;
  for(let i=0; i<arr.length; i++){
    if(!lit[i+1]) continue;
    const v = arr[i] && arr[i][key];
    if(v!=null) sum += v;
  }
  return sum;
}
/* ══ 「這一位有沒有那顆星」的唯一查詢點（ver -971）══ 旗標型的效果（`saintHint`、
   `saintReload`…）在卡上寫 `1`，所以「有沒有」就是加總 >0。
   ⚠ 與 `girlBonus` 是同一件事的兩種讀法（**不要**在呼叫端自己寫 `>0`）——
     日後要改成「可疊加的次數」時，只有這兩支要動（同 `hasStar`／`bonus` 那一對）。
   ⚠ 不是這套系統裡的人（蕾妮／馬季諾）一律 false ＝ 這些規則只咬本篇的三位。 */
export function girlHas(who, key){ return girlBonus(who, key) > 0; }
/* 這一級的星名（顯示用）。⚠ 還沒填就回空字串，**不要自己編一個** ——
   顯示端看到空字串要印「Lv N」而不是印一個假名字。 */
export function girlStarName(who, lv){
  const arr = (girlCfg().levels||{})[who] || [];
  const i = (lv==null ? girlLevel(who) : lv) - 1;
  return (arr[i] && arr[i].name) || '';
}

/* ══ 吃過的料理（ver -953）══ 一輪內；每一道只記一次（見 K.dishes 的說明）。 */
export function cookedDishes(){
  try{ const j=JSON.parse(rd(K.dishes)||'null'); if(Array.isArray(j)) return j; }catch(e){}
  return [];
}
export function hasCooked(id){ return cookedDishes().indexOf(id)>=0; }
/* 回傳「這一道是不是第一次」—— 演出端要靠它決定給不給加成的大字。 */
export function addCooked(id){
  const cur=cookedDishes();
  if(cur.indexOf(id)>=0) return false;
  cur.push(id); wr(K.dishes, JSON.stringify(cur));
  return true;
}

/* ══⚠⚠ **體力上限的唯一計算點**（ver -953，鐵律 7）══
   `tuning.playerHp` 是**出廠值**，料理會把它墊高（`boon.hpMax`，一輪內）。
   兩個讀它的地方（`combat.refreshPlayerMax` 寫進 state、整備頁顯示上限）
   一律問這一支 —— 各寫一次「基礎＋bonus」的式子就是第二個計算點，
   而走鐘的症狀是「整備頁顯示 140、實際只有 100」，畫面上看不出誰對。 */
export function playerMaxHp(){
  return (GAME_CONFIG.tuning.playerHp|0) + bonus('hpMax');
}

/* ══⚠⚠ **累計加成的唯一查詢點**（鐵律 7）══════════════════════════════════
   `key` ＝效果欄位名（`dmgMul`／`critRate`／`hpMax`…）。來源有兩條，都在這裡加總：
     · 主武器九星  `config.gunStars`  的 `<key>` × 已升次數
     · 吃過的料理  `config.cooking.dishes[].boon[<key>]`（一道算一次）
   ⚠⚠ ver -953 由 `bonus` **改名**為 `bonus`：加了料理之後它就不只是「星」的
     加成了，名字要說實話（同 `counterCount`→`counterFired` 的教訓）——
     不然下一個人會以為料理沒算進去，於是在自己那邊再加一次（那就是第二個計算點）。
   ⚠ 九個呼叫點（combat／inspector／saint）**一行都不必改邏輯**，料理自動吃到。 */
export function bonus(key){
  let sum=0;
  const owned=gunStars();
  for(const d of starDefs()){
    const n=owned[d.id]|0;
    if(n>0 && d[key]!=null) sum += d[key]*n;
  }
  const dishes=(GAME_CONFIG.cooking||{}).dishes||{};
  for(const id of cookedDishes()){
    const b=(dishes[id]||{}).boon;
    if(b && b[key]!=null) sum += b[key];
  }
  return sum;
}

/* ══ 副武器的改裝（ver -714，Ray：「每次升級增加攻擊力 20%，最高五階」）══════
   ⚠ 上限問**卡上的 `maxMod`**（那是那一把槍的性質），加成率在
     `tuning.weaponMod.perLv`（全域規則）—— 兩者分開，不要合成一個數字。
   ⚠ 一輪內（同九星與掛件）：`newRun()` 清、`snapshot/restore` 帶。 */
export function weaponMods(){
  try{ const j=JSON.parse(rd(K.wmod)||'null'); if(j && typeof j==='object') return j; }catch(e){}
  return {};
}
export function weaponMod(id){ return (weaponMods()[id]|0); }
export function weaponModMax(id){
  const w=(GAME_CONFIG.weapons||{})[id];
  return (w && w.maxMod|0) || 0;
}
export function setWeaponMod(id, n){
  const cur=weaponMods();
  const v=Math.max(0, Math.min(weaponModMax(id), n|0));
  if(v>0) cur[id]=v; else delete cur[id];
  wr(K.wmod, JSON.stringify(cur));
  return v;
}

/* ══ 杰羅的賭博式改造（ver -866，Ray：「杰羅不賣槍，只改槍，50%機率會失敗白花錢，
   成功的話增加增益15~50%隨機」）══════════════════════════════════════════
   `{武器id: 加成小數}` —— 成功**一次**就定住（⚠ 我的假定：改成的槍不再收第二次，
   失敗可以一直重試；要能重賭洗加成再跟 Ray 確認）。
   ⚠ 與 `wmod`（固定 +20%/階）**分開存、相乘**：兩套是不同的來源，折進反擊傷害的
     乘點只有 weapon.js 的 `subgunPowerMul` 一支（鐵律 7）。 */
export function jeroMods(){
  try{ const j=JSON.parse(rd(K.jmod)||'null'); if(j && typeof j==='object') return j; }catch(e){}
  return {};
}
export function jeroMod(id){
  const v=jeroMods()[id];
  return (typeof v==='number' && isFinite(v) && v>0) ? v : 0;
}
export function setJeroMod(id, v){
  const cur=jeroMods();
  if(v>0) cur[id]=v; else delete cur[id];
  wr(K.jmod, JSON.stringify(cur));
  return v;
}

/* ══ 主武器的強化等級（ver -700，已由九顆星取代；保留供遷移與舊呼叫端）══
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
     tier = floor((aff-1)/20)+1 → 1..5（ver -724 由 /10 改）。這裡只做值與查詢；
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
/* ══⚠⚠⚠ **ver -981（Ray 定案）：T1＝1~19、20 進 T2** ══
   > 「t1 應該是 1~19，20 進 t2」（起因：他的蕾娜 20.5、諾薇兒 20，兩位都還在跑 T1 的台詞）
   舊式 `floor((aff−1)/20)+1` ＝ T1 1~20、T2 21~40 —— 差一點點，
   而且 (20,21) 那個空隙**只有蕾娜會踩到**（她是唯一拿得到小數的：S 級 +0.25）。
   新式 `floor(aff/20)+1` ＝ **每累積 20 點升一段**。Ray 給的表（逐字）：

       0~19 = T1　20~39 = T2　40~59 = T3　60~79 = T4　80~99 = T5

   ⚠ 上限 100 也是 T5（式子算出 6，由 `Math.min(5,…)` 夾回來）。
   ⚠ 小數落在哪一段照同一條線：19.99 是 T1、20.0 是 T2（蕾娜的 +0.25 才踩得到）。
   ⚠⚠ 這個式子在**兩個檔**各有一份（`flight/index.html` 的 `progTier`），改一邊要改另一邊
     （鐵律 7 的但書，兩邊註解互指）。⚠ `flight/talks.js` 的 `AFFECTION_BANDS`
     本來就是 `[20,40,60,80,100]`（取「不超過現值的最高門檻」），與新式天然一致，不必動。 */
export function tierOf(aff){ return Math.min(5, Math.max(1, Math.floor((+aff||0)/TIER_W)+1)); }
/* tier 的下限值（tier 1→1、2→**20**、3→40…，ver -981 跟著上面那一條改）。
   棘輪就是「不跌破這條線」。
   ⚠⚠ ver -724：上限 50→**100**、一段 10→**20**（Ray：「好感度上限改成100…每20一個tier」）。
     ⚠ 這個寬度在**三個地方**各有一份（鐵律 7 的但書，改一處要改三處）：
       · 這裡（`TIER_W`）
       · `flight/index.html` 的 `progTier`（管理人進度面板）
       · `flight/talks.js` 的 `AFFECTION_BANDS`（閒聊台詞池的門檻）
     三邊的註解互指。 */
const TIER_W = 20;
export function tierFloor(t){ return Math.max(1, (Math.min(5,Math.max(1,t|0))-1)*TIER_W); }

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
const AFF_MAX = 100;   // ver -724：上限 50→100（Ray 指定）
function getFloors(){
  /* ⚠⚠ 預設 **0** 不是 1（ver -723 修）：好感的預設值是 0（`AFFECTION_DEFAULT`），
     而地板預設 1 的話，**第一次的 +0.5 會被拉成 1** —— A（半份）與 S（整份）
     就分不出來了。舊規則全是整數所以看不出來，Ray 這一版加了「A 給一半」才露餡。
     沒存過＝還沒達到過任何 tier ＝ 沒有地板。 */
  const out={}; for(const c of CHARS) out[c]=0;
  try{ const j=JSON.parse(rd(K.affFloor)||'null');
    if(j) for(const c of CHARS) if(typeof j[c]==='number') out[c]=j[c];
  }catch(e){}
  return out;
}
/* ══ 戰後評價 → 好感（ver -557，Ray 指定）════════════════════════════════
   「與搭檔的伙伴一起拿了 S 就會該伙伴好感度 +1，索菈娜例外，C 以下她才會 +1，
     蕾娜因為不是搭檔，所以她每拿四次 S +1」
   實作只有這一支（鐵律 8），inspector 的劇情結算算出等第後呼叫。
   · 搭檔＝CHARS 裡那幾位才有好感層（蕾妮／馬季諾是試玩版搭檔，沒有）。
   ⚠ ver -723 起**次一級也給一半**（Ray：「評價A好感度也給一半。跟別人相反的
     索菈娜則是評價D＋1 評價C+0.5」）—— 數字全部搬進 `config.rating.affection`。
   · 索菈娜：方向相反，**D +1／C +0.5**（-557 的「C 以下都 +1」已由這張表取代）。
   · 蕾娜：不看搭檔欄，**S +0.5／A +0.25**（ver -724 全面 ×2 之後直接給小數）。
   回傳這一場加到誰（[]＝沒人），呼叫端要顯示可以用。 */
/* ⚠⚠ 第二個參數可以是**一位**（字串，舊用法）或**一份分配表**（ver -921）：
   `[{ key, mul }]` —— `mul` 是那一位拿到的**份額**（全拿 1、平手一人一半 0.5）。
   誰拿、拿幾分之幾由呼叫端決定（`inspector.settleAffectionShares`，它才知道
   這一局誰打了幾場）；**加多少**仍然只有這裡在查表（鐵律 7）。 */
export function applyRankAffection(grade, partnerKey){
  const got=[];
  /* ⚠ 表在 config（`rating.affection`，鐵律 1）——這一支只負責照表加。 */
  const A=((GAME_CONFIG.rating||{}).affection)||{};
  const share = Array.isArray(partnerKey) ? partnerKey
              : (CHARS.indexOf(partnerKey)>=0 ? [{ key:partnerKey, mul:1 }] : []);
  for(const one of share){
    const k=one && one.key; if(CHARS.indexOf(k)<0) continue;
    /* 索菈娜的方向與別人相反（評價越爛越加）；其餘搭檔照 `partner` 那一欄。 */
    const tbl = (k==='sorana') ? (A.sorana||{}) : (A.partner||{});
    /* ══ `always` ＝**只要出場就給的保底**（ver -1024，Ray：「索拉娜只要出場就會
       好感+1，D＋3 C+2」）══ 與等第那一格**相加**（D 總共 +4、C +3、其餘 +1）。
       ⚠ 沒寫 `always` 的人（諾薇兒／安雅／蕾娜）行為一個字不變。
       ⚠ 份額（`mul`）照乘：平手均分時保底也一起分（同等第那一份的處理）。 */
    const d = (tbl.always || 0) + (tbl[grade] || 0);
    if(d){ addAffection(k, d * (one.mul!=null ? one.mul : 1)); got.push(k); }
  }
  /* 蕾娜：不看搭檔欄，照她自己那一欄加。
     ⚠ ver -724 起**直接給小數**（S +0.5／A +0.25）—— 兩個都對得上 `addAffection`
       的 1/4 對齊，所以 -723 那套「點數換算」退休了（`K.rennaS` 已無人讀，
       留在 newRun／snapshot 只為了舊存檔載得乾淨）。 */
  const rd2=(A.renna||{})[grade];
  if(rd2){ addAffection('renna', rd2); got.push('renna'); }
  return got;
}
export function addAffection(who, delta){
  if(CHARS.indexOf(who)<0) return null;
  const aff=getAffection(), floors=getFloors();
  const q = v => Math.round(v*4)/4;                    // 對齊到 1/4（蕾娜的 +0.25）
  let v = q((typeof aff[who]==='number' ? aff[who] : AFFECTION_DEFAULT) + (+delta||0));
  v = Math.min(AFF_MAX, Math.max(0, v));
  const floor = floors[who]||0;   // ⚠ `||1` 會把「還沒有地板」當成 1（ver -723 修，見 getFloors）
  if(v < floor) v = floor;                             // ① 棘輪
  aff[who]=v; setAffection(aff);
  /* ⚠ 地板只在**真的達到那條線**之後才抬（ver -723 修）：`tierOf()` 對 0.5 也回 1，
     不加 `v >= nf` 的話 0.5 就會把地板記成 1 —— 等於把半份直接補成整份。 */
  const nf = tierFloor(tierOf(v));
  if(v >= nf && nf > floor){ floors[who]=nf; wr(K.affFloor, JSON.stringify(floors)); }
  return v;
}

/* ══⚠⚠ **管理人限定：直接把好感設成某個值**（ver -982，Ray：「讓管理人可以在
   伙伴欄手動改好感度」）══ 明寫的開發梯子（鐵律 9 的例外，同 `setStarCount`／
   `setGirlLevel`）—— 正規的路只有 `applyRankAffection`（戰後評價）。
   ⚠⚠ **連棘輪的地板一起改**：`addAffection` 只會把值往上夾（① 棘輪），
     不動地板的話這個工具**只上得去下不來**，等於沒有用。
   ⚠ 地板照 `addAffection` 的同一條規矩算（達到那條線才抬，見那一支的 ver -723 註解）
     —— 不要在這裡另訂一套，不然開發時調出來的狀態與玩家真的玩出來的不一樣。
   ⚠ 一樣對齊到 1/4（蕾娜的 +0.25）、夾在 [0, AFF_MAX]。 */
export function setAffectionDev(who, v){
  if(CHARS.indexOf(who)<0) return null;
  const aff=getAffection(), floors=getFloors();
  const val = Math.min(AFF_MAX, Math.max(0, Math.round((+v||0)*4)/4));
  aff[who]=val; setAffection(aff);
  const nf = tierFloor(tierOf(val));
  floors[who] = (val >= nf) ? nf : 0;
  wr(K.affFloor, JSON.stringify(floors));
  return val;
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
  /* ⚠⚠ 章節重編號（ver -857，Ray：「章節編排錯誤，沒有第二章 —— 修正把第三章
     變成第二章，以降回推」）：新表 S0 開頭／S1 進帝都／S2 出航＋北泊第一天／
     S3 北泊第二天／S4 北泊出航／S5 夏爾村。落點：初進北泊**不再升段**
     （town.open 那一條拔了）、np_day3 設 3、np_farewell 設 4、sv_evening 設 5，
     PLACE_STAGE_FROM 與 rebuild.fromStage 對位到 4。 */
  /* ══ Stage 2（原 -600 的 Stage 3）══
     北方泊地：碼頭那一幕（司祭）→ 城鎮戰五格 → 教堂 Boss → 聖徒化教學戰。
     ⚠ `node` **不寫**：第一次降落走城上的 `firstEntry`（碼頭），跟正常玩一樣。
     ⚠ `stage:2` ＝正常玩 sailOut 已把 1 升成 2，北泊抵達不再另升。
     ⚠ `flags` 只列**擋路的那幾支**（§6.5.8）：出航／船塢那一段要當成看過，
       不然一進城會被主線段落抓走。城鎮戰與碼頭那一幕的旗標**故意不給** ——
       那正是要測的東西。 */
  { id:'stage2', name:'Stage 2', sub:'北方泊地・碼頭 → 城鎮戰 → 教堂 → 聖徒化教學戰',
    stage:2, clockHour:13, named:true,
    flags:['dungeon_cleared','hq_briefed','renna_named','stage1_open',
           'set_sail','got_ship','dock_day2'],
    enter:'town', town:'northport' },
  /* ══ Stage 3（原 -677 的 Stage 4）══ 北方泊地**第二天早上在旅店醒來**。
     ⚠ `np_day3` 要給、`np_day3_done` **不要給**：那是「閘門已經用掉了」與
       「早上那一幕演過了」的分別 —— 給了前者才不會一進去又被閘門抓一次，
       不給後者那一幕才演得到（那正是要測的東西）。
     ⚠ `clockHour:8` ＝ `firstHourAt(8)`（開局是 6/13 11:00，所以是**隔天 08:00**）。
     ⚠ 安全區旗要給：北方泊地這時已經不打仗了，不給的話走一格就被城鎮戰抓走。
     ⚠ `node:'inn'` ＝直接站在旅店裡（那一幕就在那裡演）。 */
  { id:'stage3', name:'Stage 3', sub:'北方泊地・第二天早上（旅店） → 自由探索 → 墓地',
    stage:3, clockHour:8, named:true,
    flags:['dungeon_cleared','hq_briefed','renna_named','stage1_open',
           'set_sail','got_ship','dock_day2',
           'np_port_arrive','np_clear_church','np_claws_done','safehouse_northport',
           'np_burial','np_burial_done','np_night','np_night_done','np_day3'],
    enter:'town', town:'northport', node:'inn' },
  /* ══ Stage 4（原 -743 的 Stage 5）══
     北泊出航：直接站在碼頭，送行那一段（np_farewell）就緒 —— 演完自動插 S4
     並出航（羽蛇遭遇接著測）。
     ⚠ `stage:3`：S4 是**送行那一段自己插的**（act 的 stage 欄位），
       章節工具只把人擺到那一段之前。
     ⚠ `np_depart` 要給（閘門已用掉——直接站在碼頭，不再被抓一次）；
       `np_farewell` **不給**（那正是要演的）。 */
  { id:'stage4', name:'Stage 4', sub:'北泊出航・送行 → 羽蛇 → 甲板混亂',
    stage:3, clockHour:8, named:true,
    flags:['dungeon_cleared','hq_briefed','renna_named','stage1_open',
           'set_sail','got_ship','dock_day2','flight_centipede_met',
           'np_port_arrive','np_clear_church','np_claws_done','safehouse_northport',
           'np_burial','np_burial_done','np_night','np_night_done','np_day3',
           'np_day3_done','np_anya_join','np_dock_ask','np_grave_done','np_depart'],
    enter:'town', town:'northport', node:'port' },
  /* ══ Stage 5（原 -824 的 Stage 6）══
     夏爾村・回到索菈娜的家（那一夜）——直接站在索菈娜家，`sv_night_done` 就緒。
     ⚠ `sv_evening` 給（18:00 閘門已用掉、時鐘定在 19:00）＋`sv_arrive` 給（村子已抵達，
       廣場那一幕不重播）；`sv_night_done` **不給**——那正是這一章要演的「回小屋後的劇情」。
     ⚠ `stage:5` 直接寫（正常玩是 sv_evening 閘門把它從 4 升上來，這裡是跳關工具）。
     ⚠ `clockHour:19` ＝ firstHourAt(19)＝夜景（band 19:00 起，ver -816）；羽蛇/甲板/
       man_sorana 都在飛行/scene（無城鎮旗），所以旗只需 S4 那批＋sv_arrive＋sv_evening。 */
  { id:'stage5', name:'Stage 5', sub:'夏爾村・回到索菈娜的家（那一夜） → 村內戰',
    stage:5, clockHour:19, named:true,
    flags:['dungeon_cleared','hq_briefed','renna_named','stage1_open',
           'set_sail','got_ship','dock_day2','flight_centipede_met',
           'np_port_arrive','np_clear_church','np_claws_done','safehouse_northport',
           'np_burial','np_burial_done','np_night','np_night_done','np_day3',
           'np_day3_done','np_anya_join','np_dock_ask','np_grave_done','np_depart',
           'sv_arrive','sv_evening'],
    enter:'town', town:'shinier', node:'sorahome' },
  /* ══ Stage 6（ver -870，Ray：「加入stage6 翌日早上起床那一幕」）══
     夏爾村・翌日早上（索菈娜家 06:00）→ 晨戲 → 森林行 → 遺跡入口鹿主。
     ⚠ `sv_forest_morning` 給（翌日閘門已用掉——直接站在屋裡）；
       `sv_forest_go` **不給**（起床那一幕正是要演的，它自己會 setStage 6）。
     ⚠ `shinier_siege`＋`sv_clear_wild`＋`safehouse_shinier` 都給：圍城已打完、
       村子是安全區——少了 siege 旗踏出家門會重演出擊那一段（onLeave 的旗）。
     ⚠ `clockHour:6` ＝ firstHourAt(6)＝隔天 06:00（開局 11:00 已過 6 點）。 */
  { id:'stage6', name:'Stage 6', sub:'夏爾村・翌日早上 → 森林行 → 遺跡入口',
    stage:6, clockHour:6, named:true,
    flags:['dungeon_cleared','hq_briefed','renna_named','stage1_open',
           'set_sail','got_ship','dock_day2','flight_centipede_met',
           'np_port_arrive','np_clear_church','np_claws_done','safehouse_northport',
           'np_burial','np_burial_done','np_night','np_night_done','np_day3',
           'np_day3_done','np_anya_join','np_dock_ask','np_grave_done','np_depart',
           'sv_arrive','sv_evening','sv_night_done','shinier_siege',
           'sv_clear_wild','safehouse_shinier','sv_forest_morning'],
    enter:'town', town:'shinier', node:'sorahome' },
  /* ══ Stage 7（ver -884，Ray：「把擊敗鹿主後的對話劃作 stage7」）══
     鹿主變異戰 —— 直接站在**夏爾森林的遺跡入口**、時間已過黃昏，走進去就演。
     ⚠ `stage:6`：S7 是**戰後那一段自己升的**（那一拍的 `stage:7`），
       章節工具只把人擺到那一段之前（同 stage4 送行那一段的作法）。
     ⚠ `clockHour:18` ＝ `firstHourAt(18)`；黃昏分支的條件就是「不在 [5,17] 內」。
     ⚠ `sv_forest_intro` 要給（入口的叮嚀已經看過，不然一進去先被它抓走）；
       `sv_deer_met`／`sv_deer_harm` **不給** —— 那正是要演的。
     ⚠ `node:'ruins'` ＝直接站在遺跡入口那一格。 */
  { id:'stage7', name:'Stage 7', sub:'夏爾森林・遺跡入口（黃昏）→ 樹靈鹿主 → 紮營討論',
    stage:6, clockHour:18, named:true,
    flags:['dungeon_cleared','hq_briefed','renna_named','stage1_open',
           'set_sail','got_ship','dock_day2','flight_centipede_met',
           'np_port_arrive','np_clear_church','np_claws_done','safehouse_northport',
           'np_burial','np_burial_done','np_night','np_night_done','np_day3',
           'np_day3_done','np_anya_join','np_dock_ask','np_grave_done','np_depart',
           'sv_arrive','sv_evening','sv_night_done','shinier_siege',
           'sv_clear_wild','safehouse_shinier','sv_forest_morning',
           'sv_forest_go','sv_forest_intro'],
    enter:'town', town:'shinier_forest', node:'ruins' },
  /* ══ Stage 8（ver -956，Ray 交稿）══ 索菈娜家 → 自由探索 → 餐廳（瑪麗亞的廚房、
     科爾文登場）→ 索菈娜家（作戰課的指令）。
     ⚠ **直接站在索菈娜家、時間中午 12:00** —— 正常玩是神殿收尾那道閘門
       （`shinier_ruins` 的 `sv_s8_noon`）把人搬過來並把時鐘推到下一個中午，
       跳關工具直接把那個結果擺好（同 stage6 用掉翌日閘門的作法）。
     ⚠ `stage:8` 直接寫：正常玩是 `sv_s8_home` 那一段的第一拍升上來的，
       這裡是跳關工具，人已經站在那一段之前。
     ⚠ 神殿那一整串旗（`sr_*`／`ruins_*`）全給 —— 少了 `sr_altar`，
       走回神殿會重演收尾那一段。
     ⚠ `sv_s8_noon` 也要給：不給的話一走進神殿就會被那道閘門再搬一次。
     ⚠ `sv_s8_home`／`sv_s8_dine`／`sv_s8_corvin` **不給** —— 那正是要演的。 */
  { id:'stage8', name:'Stage 8', sub:'夏爾村・索菈娜家（正午）→ 餐廳・瑪麗亞的廚房 → 科爾文',
    stage:8, clockHour:12, named:true,
    flags:['dungeon_cleared','hq_briefed','renna_named','stage1_open',
           'set_sail','got_ship','dock_day2','flight_centipede_met',
           'np_port_arrive','np_clear_church','np_claws_done','safehouse_northport',
           'np_burial','np_burial_done','np_night','np_night_done','np_day3',
           'np_day3_done','np_anya_join','np_dock_ask','np_grave_done','np_depart',
           'sv_arrive','sv_evening','sv_night_done','shinier_siege',
           'sv_clear_wild','safehouse_shinier','sv_forest_morning',
           'sv_forest_go','sv_forest_intro','sv_deer_met','sv_deer_harm',
           'sr_intro','sr_gate_brazier','sr_gate_bridge','sr_brazier','sr_bridge',
           'sr_mural','ruins_gate_open','ruins_bell_done','ruins_thug_met','sr_altar',
           'ruins_altar_on','sv_s8_noon'],
    enter:'town', town:'shinier', node:'sorahome' },
  /* ══ Stage 9（ver -1095，Ray：「把『我好討厭他』作為 stage8 的結束，
     下一幕是 stage9，做入章節選擇」）══
     落點＝**餐廳**：Stage9 的第一段（`sv_s9_order`，聖皇諭令那一幕）就演在那裡，
     科爾文那一段一收它就原地接上。
     ⚠ 旗只列**擋路的那幾支**（§6.5.8）：這一章要的是「Stage8 整段演完」——
       `sv_s8_home`／`sv_s8_dine`／`sv_s8_corvin` 三支，缺一它就會從中間重演。
     ⚠ `sv_s8_hungry` **也列進來**：不列的話跳進這一章之後走六步，
       諾薇兒會再餓一次（ver -1095 那個 bug 的另一半 —— 章節工具這條路
       `skipIf` 擋得到，但把它插著更直接：那一段本來就算演過了）。 */
  { id:'stage9', name:'Stage 9', sub:'夏爾村・索菈娜家：聖皇的諭令 → 自由探索（可約會）',
    stage:9, clockHour:12, named:true,
    flags:['dungeon_cleared','hq_briefed','renna_named','stage1_open',
           'set_sail','got_ship','dock_day2','flight_centipede_met',
           'np_port_arrive','np_clear_church','np_claws_done','safehouse_northport',
           'np_burial','np_burial_done','np_night','np_night_done','np_day3',
           'np_day3_done','np_anya_join','np_dock_ask','np_grave_done','np_depart',
           'sv_arrive','sv_evening','sv_night_done','shinier_siege',
           'sv_clear_wild','safehouse_shinier','sv_forest_morning',
           'sv_forest_go','sv_forest_intro','sv_deer_met','sv_deer_harm',
           'sr_intro','sr_gate_brazier','sr_gate_bridge','sr_brazier','sr_bridge',
           'sr_mural','ruins_gate_open','ruins_bell_done','ruins_thug_met','sr_altar',
           'ruins_altar_on','sv_s8_noon',
           'sv_s8_home','sv_s8_hungry','sv_s8_dine','sv_s8_corvin'],
    /* ⚠ 落點＝**索菈娜家**（ver -1098，Ray：「第九章應該要直接從索菈家開始，
       幹嘛從餐廳走回去？」）—— 諭令那一幕就演在那裡（正式流程是閘門
       `sv_s8_to_home` 把人從餐廳三秒黑搬回家，章節工具直接落在終點）。 */
    enter:'town', town:'shinier', node:'sorahome' },
];

export function newRun(){
  for(const k of [K.stage, K.flags, K.affection, K.affFloor, K.name, K.nick,
                  K.hp, K.innLast, K.flightLoss, K.rennaS, K.playtime,
                  K.charms, K.gunLv, K.gunStars, K.wmod, K.jmod, K.dishes,
                  K.girlExp, K.girlStars, K.stats]) {   // stats＝戰績統計（ver -1023，一輪內）   // 持久HP／上次旅店／連敗數／蕾娜S計數／遊玩時間／掛件／強化／杰羅改造／吃過的料理／女主等級（-970）
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
           gunLvRaw:rawN(K.gunLv),       // 主武器強化等級（ver -700 的舊制，留著相容）
           gunStarsRaw:rawJ(K.gunStars),     // 主武器九階強化（ver -707，一輪內）
           wmodRaw:rawJ(K.wmod),            // 副武器改裝（ver -714，一輪內）
           jmodRaw:rawJ(K.jmod),            // 杰羅改造（ver -866，一輪內）
           dishesRaw:rawJ(K.dishes),        // 吃過的料理（ver -953，一輪內）
           girlExpRaw:rawJ(K.girlExp),      // 女主的九級（ver -970，一輪內）
           girlStarsRaw:rawJ(K.girlStars),  // 女主已點亮的星（ver -1132，一輪內）
           statsRaw:rawJ(K.stats) };        // 戰績統計（ver -1023，一輪內）
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
  putRaw(K.gunStars, ('gunStarsRaw' in s)?s.gunStarsRaw:null, true);
  putRaw(K.dishes, ('dishesRaw' in s)?s.dishesRaw:null, true);   // 料理（ver -953）：舊存檔沒有＝原樣移除
  putRaw(K.wmod,     ('wmodRaw'     in s)?s.wmodRaw    :null, true);
  putRaw(K.jmod,     ('jmodRaw'     in s)?s.jmodRaw    :null, true);
  /* 女主的九級（ver -970）：舊存檔沒有這一欄 → **原樣移除**（讀「還沒練」的檔
     不該帶著這一輪練出來的等級，§6.9 的兩面）。 */
  putRaw(K.girlExp,  ('girlExpRaw'  in s)?s.girlExpRaw :null, true);
  /* 已點亮的星（ver -1132）：同上，舊存檔沒有這一欄 → 原樣移除
     （讀回去之後 `girlStarsAll()` 會依那個檔的等級重新遷移一次）。 */
  putRaw(K.girlStars,('girlStarsRaw'in s)?s.girlStarsRaw:null, true);
  /* 戰績統計（ver -1023）：同上，舊存檔沒有這一欄 → 原樣移除。 */
  putRaw(K.stats,    ('statsRaw'    in s)?s.statsRaw   :null, true);
}

/* ══⚠⚠⚠ **戰績統計**（ver -1023，Ray 交辦）══════════════════════════════════
   讀寫只有這三支（鐵律 7/8）：`getStats()` 讀、`addSessionStat()` 記一局、
   `addKillStat()` 記一場。呼叫端不要自己碰那把鑰匙。
   ⚠ 「局」與「場」的定義照 §0.5：局＝一次結算、場＝一隻怪。
   ⚠ 分數存**原始分**；索菈娜的「反著算」在顯示端做（見 `settings` 的統計表）。 */
const STATS0 = () => ({ sessions:0, kills:0, byGirl:{} });
export function getStats(){
  const o = rawJ(K.stats);
  if(!o || typeof o!=='object') return STATS0();
  return { sessions:o.sessions|0, kills:o.kills|0, byGirl:(o.byGirl&&typeof o.byGirl==='object')?o.byGirl:{} };
}
function putStats(o){ wr(K.stats, JSON.stringify(o)); }
/* 一局結算：總局數 +1，並把**這一局出過場的每一位**各記一局與那一局的分數。
   ⚠ `whos` 由呼叫端給（`state.partnerFights` 的參與者）—— progress 不讀戰鬥狀態。 */
export function addSessionStat(whos, score){
  const o = getStats();
  o.sessions++;
  for(const w of (whos||[])){
    if(!isGirl(w)) continue;                       // 蕾妮／馬季諾不進帳（鐵律 9：答不出來的不記）
    const g = o.byGirl[w] || (o.byGirl[w] = { n:0, score:0 });
    g.n++; g.score += Math.round(+score||0);
  }
  putStats(o);
  return o;
}
export function addKillStat(n){
  const o = getStats(); o.kills += Math.max(1, n|0 || 1); putStats(o); return o;
}
