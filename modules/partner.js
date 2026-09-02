/* ============================================================================
 *  modules/partner.js — 搭檔（被動技 + 主動技通用框架）
 *  ---------------------------------------------------------------------------
 *  本模組是「搭檔能力」的歸屬地：一個搭檔帶「被動技（自動觸發）」與「單一主動技槽
 *  （固定發動入口）」。能力屬於誰、能不能發，全部在此判定——換 partner，其能力即消失。
 *
 *  被動技 · 即死防禦（deathGuard，整場一次性）：
 *    致死傷害改為保留 1 HP 並插 cut-in。判定與執行都在 tryDeathGuard，由 combat 的致死鏈
 *    （handlePlayerLethal）在扣血致死時呼叫；回 true = 已擋下，combat 不進 lose（D1 預留，combat 不動）。
 *
 *  主動技 · 單槽 + 情境標註（context）：
 *    一個搭檔一次只有一個主動技槽（config `active`），一個固定發動入口 tryActive(context)。
 *    每個主動技在 config 帶 `context`（'saint'＝聖徒化內 / 'board'＝一般盤面）標註其發動情境。
 *    tryActive 依 active.key 分派到 handler、並先以 active.context 判定「當前情境能不能發」，
 *    不符即回 false（不執行）。行為執行靠各分域注入 api（saintApi / combatApi / defenseApi），
 *    每個 handler 只取所需。新增能力＝加一筆 handler + 一段 config，不動分派骨架。
 *    本輪只實作 lifeReturn（context='saint'，經 saintApi 中止聖徒化並保留當前血量）。
 *
 *  狀態互動：playerHp 的唯一跨擁有者寫入例外——即死防禦致死時保留 1 HP，必須走
 *    state.applyDeathGuard()（鎖 1 + 標記 deathGuardUsed），不得散寫（見 CLAUDE.md 3.2 / D3）。
 *    applyDeathGuard 不碰 DOM，故鎖 1 後由注入的 api.updateBars() 刷新血條（對齊 reference）。
 *
 *  依賴：只 import state / config。combat / defense / saint 的原語一律由 combat 於 setup()
 *    注入 api（維持 §2 依賴方向，不反向 import）。
 * ========================================================================== */

import { GAME_CONFIG, asset, sfxGain } from '../config.js';
import { state, applyDeathGuard } from '../state.js';
import { SFX } from '../audio.js';
import { L } from '../i18n.js';   // 多語言（即死防禦浮動字/cut-in 標題）
import * as prog from '../script/progress.js';   // 本篇搭檔換人的旗標（ver -671；葉節點，無循環）
import * as load from '../script/loadout.js';    // 玩家的搭檔選擇（ver -741；同為葉節點資料層）

/* combat 於啟動時注入的原語：
 *   被動技所需：updateBars / floatDmg / resetEnemyTimers / scheduleUlt / playCutin
 *   主動技分域 api：saintApi（本輪；未來再加 combatApi / defenseApi）
 * 每個 handler 只取所需，多來源共存於此單一注入袋。 */
let api = {};
export function init(a){ api = a; }

// 目前啟用的搭檔 config：讀玩家實選（state.pickedPartner，選人畫面經 setPickedPartner 寫入）。
// 換 partner 即能力切換——被動/主動的歸屬判定全在本模組、全經此函式取當前搭檔。
/* ══⚠⚠ **本篇現在的搭檔是誰**（ver -671，Ray：「從玩家跟安雅一起出旅店後，
   夥伴就從諾薇兒換成安雅了」）══
   資料在 `config.storyPartnerBy`（由上往下取第一個 `need` 成立的），
   **判定只有這一支**（鐵律 8）：`combat.startGame` 與整備頁都問它。 */
/* ══ 現在能挑的本篇搭檔（ver -741，Ray 的 stage2 稿：「選安或諾都可以」）══
   `storyPartnerBy` 每一條 need 成立的都在池子裡＋預設那一位墊底 —— 以前是
   「第一條成立的**取代**預設」（-671 的換人），現在是「入隊的都可選」。
   pool[0]＝旗標推出來的預設（沒選過的人用它，行為與 -671 相同）。 */
export function storyPartnerPool(){
  const out=[];
  for(const r of (GAME_CONFIG.storyPartnerBy||[])){
    if(r && r.key && (!r.need || prog.hasFlag(r.need)) && GAME_CONFIG.partners[r.key]
       && out.indexOf(r.key)<0) out.push(r.key);
  }
  const d = GAME_CONFIG.storyPartner || GAME_CONFIG.defaultPartner;
  if(GAME_CONFIG.partners[d] && out.indexOf(d)<0) out.push(d);
  return out;
}
export function storyPartnerKey(){
  const pool = storyPartnerPool();
  /* 玩家在整備頁挑過人（ver -741）：選擇存 loadout（跨輪偏好，§6.9），
     **還在池子裡才算** —— 讀檔回到安雅還沒入隊的章節時，「安雅」不能成立。 */
  const chosen = load.partner();
  if(chosen && pool.indexOf(chosen)>=0) return chosen;
  return pool[0];
}
export function currentPartner(){
  return GAME_CONFIG.partners[state.pickedPartner] || GAME_CONFIG.partners[GAME_CONFIG.defaultPartner];
}

/* ============================================================================
 *  被動技 · 即死防禦
 * ========================================================================== */
// 回傳 true = 已擋下（呼叫端 handlePlayerLethal 應 return，不進 lose）。
// cut-in 圖鑰匙讀 config passive.cutin（維持資料/程式分離；renee 為 'cutin_guard'＝Renee_CI_pas.jpg）。
export function tryDeathGuard(){
  const p = currentPartner();
  const pas = p && p.passive;
  if(!pas || pas.key!=='deathGuard') return false;
  if(pas.oncePerBattle && state.deathGuardUsed) return false;   // 一次性且已用掉 → 不再擋
  applyDeathGuard();          // 鎖 1 HP + 標記 deathGuardUsed（D3 契約例外的唯一入口）
  api.updateBars();           // applyDeathGuard 不碰 DOM，於此刷新血條（對齊 reference）
  const vo = asset(pas.voice); if(vo) SFX.playVoice(vo, sfxGain(pas.voice));   // SE 與 cut-in 同步（→ vo_death_guard；增益見 tuning.fileGain）
  api.floatDmg(L.battle.deathGuard,'50%','40%',true);
  const label = L.cutins.deathGuard+'<span class="cutin-en">Death Guard</span>';
  api.playCutin(()=>{
    if(state.over||state.saintMode) return;
    // 即死防禦後：cut-in 撤下瞬間重置敵大絕與延時（間隔）懲罰倒數，避免剛保命就被連段擊殺
    api.resetEnemyTimers();
    api.scheduleUlt();        // 重新排程敵大絕
    /* 免傷窗（ver -740，Ray）：cut-in 撤下才起算，秒數完整可用（同 fireBuff）。
       秒數與回血比例都在諾薇兒的卡上（`immuneSeconds`／`immuneHealPct`）——
       蕾妮的卡沒寫＝沒有這扇窗（挑戰那一套不動，ver -694）。 */
    if(pas.immuneSeconds){
      startImmune(pas.immuneSeconds);
      if(pas.immuneHealPct) guardHealUntil = Date.now() + pas.immuneSeconds*1000;
    }
    // 續命導航：標記「當前應點的數字格」一次（玩家被救回來不必找格找到被秒）。
    //   只提示這一格——點掉後回到該盤原本的提示規則（hint:false 盤不再標下一格）。
    if(api.hintCurrentCell) api.hintCurrentCell();
  }, label, pas.cutin);       // 插入 cut-in（即死防禦專屬大圖，讀 config）
  return true;
}

/* ============================================================================
 *  主動技 · 通用框架（單槽 + 情境分派）
 * ----------------------------------------------------------------------------
 *  handler 表：key 對應 config active.key。每個 handler 接注入袋 api、只取所需分域 api，
 *  回傳 true = 已執行 / false = 未執行。新增能力只需在此加一筆 + 補 config（含 context），
 *  分派骨架 tryActive 不動。
 * ========================================================================== */
const ACTIVE_HANDLERS = {
  /* ══ 生命歸還（ver -740，Ray 定案：「生命歸還只有聖徒化期間可發動，只是原本
     回血是看當前血量，現在發動一律直接全滿」）══
     一度改成「隨時可發＋免傷窗」，Ray 同日撤回 —— 聖徒化限定照舊，唯一的
     改變是**回滿**。免傷窗是即死防禦的，這一招沒有。
     ⚠ 回滿在中止**之後**：`lifeReturnAbort` 的 `exitSaint` 同步收掉 saintMode，
       血條語意回到一般血，這時回滿才是回滿（聖徒化期間血條＝倒數槽，
       推滿＝OBE，先回滿就出事）；結局的 finalHpThunk 是 no-op，不會蓋回去。 */
  lifeReturn(a, act){
    if(!state.saintMode) return false;   // 保險：非聖徒化不執行
    const vo = asset(act && act.voice); if(vo) SFX.playVoice(vo, sfxGain(act.voice));   // SE 與結局 cut-in 同步（→ vo_nou_return）
    a.saintApi.lifeReturnAbort();
    api.healPlayer(state.playerMax);     // 一律全滿（ver -740）
    return true;
  },
  // 前線補給（馬季諾·主動）：發動即進入雙槍破防射擊窗口（不吃破防值、不另播雙槍
  //   cut-in——馬季諾自己的 cut-in 撤下後經注入的 startDual 直接開窗；窗口本體/收尾
  //   仍歸 weapon：startDualWindow/endDual）。
  //   ⚠ 聖徒化期間不可發動（「聖徒化不能開雙槍」原則）：config context:'board' 在
  //   tryActive 已擋掉聖徒化入口，此處再守一道 saintMode 保險。
  supplyRefill(a, act){
    if(state.over || state.saintMode || state.dualWield || state.cutinPlaying || state.transitioning) return false;
    if(state.enemyHp<=0) return false;   // overkill（敵已死）不可發動雙槍破防 → 技能不消耗
    const vo = asset(act && act.voice); if(vo) SFX.playVoice(vo, sfxGain(act.voice));   // SE（→ vo_supply_refill；增益見 tuning.fileGain）
    a.floatDmg(act.name,'50%','40%',true);
    const label = `${act.name}<span class="cutin-en">${act.en||''}</span>`;
    a.playCutin(()=>{
      if(state.over||state.saintMode) return;
      a.resetEnemyTimers();   // cut-in 撤下瞬間重置敵大絕/延時倒數（同雙槍/即死防禦慣例）
      a.scheduleUlt();
      a.startDual();          // cut-in 撤下 → 直接進入雙槍破防窗口
    }, label, act && act.cutin);
    return true;
  },
  // 未來擴充範例（本輪不實作）：
  //   clearThreats(a){ a.defenseApi.clearAll(); return true; }        // context:'board'，清紅圈
  //   heal(a){ a.combatApi.healPlayer(a.combatApi.playerMax*0.3); return true; }  // 回血
  //   shield(a){ ... a.combatApi ... }                                // 護盾
};

/* 統一發動入口。context＝當前發動情境（'saint' / 'board'）。
 * 判定：當前搭檔有主動技、該技 config 的 context 與傳入情境相符（'any'＝皆可）、
 * 未耗盡每場次數（oncePerBattle）、且有對應 handler → 執行。
 * 任一不符回 false（不執行）。「能否發、屬於誰」全在此——換 partner 即該技消失。 */
export function tryActive(context){
  /* ⚠ `noPartner`（ver -375）：這一場不准用搭檔技（劇情插入戰）。同 saint 的作法 ——
     擋在唯一的發動點上，不要在每個呼叫端各擋一次。 */
  if(state.noPartner) return false;
  const p = currentPartner();
  const act = p && p.active;
  if(!act || (act.context !== context && act.context !== 'any')) return false;   // 無主動技 / 情境不符 → 不發
  if(act.oncePerBattle && state.partnerActiveUsed) return false;   // 每場一次且已用 → 不發
  const handler = ACTIVE_HANDLERS[act.key];
  if(!handler) return false;                            // 尚無對應 handler → 不發
  const ok = handler(api, act) === true;
  if(ok && act.oncePerBattle) state.partnerActiveUsed = true;
  return ok;
}

/* ============================================================================
 *  被動技 · 高裝藥彈（lowHpBuff，馬季諾）
 * ----------------------------------------------------------------------------
 *  計時型被動：玩家 HP 降至 playerMax×threshold（50%）以下的「瞬間」發動——
 *  普攻傷害加倍 buffSeconds（10）秒，時間到自然結束；效果可跨盤面延續
 *  （clearAtkBuff 不碰 lowHpBuff，見 combat）。
 *  邊緣觸發：發動後在門檻下不重複觸發；HP 回到門檻上（聖徒化結局回血等）重新上膛，
 *  再跌破可再發動。HP 回升不提前解除進行中的 buff（時長既定 10 秒）。
 *  觸發檢查掛在 combat.updateBars（所有 HP 變動的唯一匯流點）呼叫本函式：
 *    · 聖徒化期間不判定（血條＝倒數槽，語義不同）；結局設定血量時自然重新評估。
 *    · HP=0（致死流程中）不發動；即死防禦保 1 HP 後的 updateBars 會接著發動。
 *  發動瞬間插 cut-in＋SE（已有其他演出在播則只跳字，buff 立即起算）；
 *  走 cut-in 時 buff 於演出撤下才起算，10 秒完整可用。
 *  buff 旗標 state.lowHpBuff 為 combat 擁有（3.8），經注入的 setLowHpBuff 管道寫入；
 *  10 秒計時器為 partner 自有狀態（reset() 清理，combat 開場調度）。
 * ========================================================================== */
let lowHpArmed = true;    // 上膛旗標：HP 在門檻上方＝已上膛；跌破發動一次即卸膛
let lowHpTimer = null;    // 10 秒 buff 計時器

/* ══⚠⚠ 免傷窗（ver -740，Ray：「諾薇兒的即死防禦加上十秒免傷，期間普攻每次
   回血2%」「life return 改為…10 秒免傷」「免傷仍算受擊，只是不扣血」）══
   兩支技共用同一扇窗（`immuneUntil`）：窗開著時 `combat.enemyAttack` **只跳過
   扣血那一行** —— 受擊計數、破無傷、失誤折秒、震動特效全部照走（Ray 明訂）。
   `guardHealUntil` 是**即死防禦專屬**的第二扇窗：期間普攻每次回血
   （比例在諾薇兒的卡上 `immuneHealPct`）—— 生命歸還的免傷不回血。
   鐵律 9：誰插的＝tryDeathGuard／lifeReturn；誰拔的＝時間到（唯一事件）；
   `reset()` 開場歸零。 */
let immuneUntil = 0;
let guardHealUntil = 0;
function startImmune(sec){ if(sec>0) immuneUntil = Math.max(immuneUntil, Date.now()+sec*1000); }
export function immuneActive(){ return Date.now() < immuneUntil; }
export function guardHealPct(){
  if(Date.now() >= guardHealUntil) return 0;
  const p = currentPartner();
  const pas = p && p.passive;
  return (pas && pas.key==='deathGuard' && pas.immuneHealPct) || 0;
}

/* ══⚠⚠ **明晰之夢：每隻怪第一次反擊成功時發動**（`firstCounter`，ver -693，Ray：
   「娜塔莉戰如果先觸發 lucid dream 再進入 NI 劇情會卡住，或者同時，所以我決定改
     luciddream 的發動條件為觸發單怪觸發第一次反擊成功時發動，不算場，
     每隻怪都可以觸發一次，觸發期間 5 秒普攻 2 倍」）══
   ⚠ 為什麼換掉血量門檻：那一條與惡夢化的劇情**搶同一個時刻** ——
     NI 的倒數槽本來就會把血抽到 1，於是「跌破 30%」與「進 NI 劇情」同時發生，
     兩段演出疊在一起就卡住了。改成**反擊**之後兩者再也不會撞。
   ⚠ **每隻怪一次**（不是每場一次）：連戰換敵要重新上膛 —— 由 `enemy.setEnemy`
     經 combat 呼叫 `armFirstCounter()`（那是「換了一隻怪」的唯一時刻）。
   ⚠ 效果與原本同一支（`setLowHpBuff` ＋計時器）：只換觸發條件，不換效果。 */
let fcArmed = false;
export function armFirstCounter(){ fcArmed = true; }
/* ══ 九階強化「方舟」（ver -707，Ray：「無傷使敵 HP 歸零，可回復已使用的被動技」）══
   打倒一隻敵人的那一刻，**這一場全程無傷**就把用掉的一次性被動重新上膛：
   即死防禦（`deathGuardUsed`）＋ 明晰之夢（`fcArmed`）。
   ⚠⚠ 「無傷」是**逐隻**算的（`state.enemyHitsTaken`，ver -708，Ray：「是用逐隻，
     連戰才有意義的技能」）—— 不是整場的 `hitsTaken`：整場算的話，連戰只要中途挨過
     一次就永遠回不了，而這顆星的用處正是在連戰裡把用掉的被動一隻一隻賺回來。
   ⚠ 掛在 `combat.finishEnemyOrAdvance` 那個匯流點（自然清盤／按錯／逾時／
     聖徒化擊殺四條路都經過它，鐵律 8）。 */
export function onEnemyCleared(){
  if(!prog.hasStar('safina')) return;
  if(state.enemyHitsTaken!==0) return;
  state.deathGuardUsed = false;
  fcArmed = true;
}
export function onCounter(){
  if(state.over || state.saintMode || state.niMode) return;   // 演出中不插隊（同 checkLowHpBuff）
  const p = currentPartner();
  const pas = p && p.passive;
  if(!(pas && pas.key==='firstCounter')) return;
  if(!fcArmed) return;
  fcArmed = false;
  fireBuff(pas);
}
/* ══⚠⚠ 明晰之夢**發動中**？（ver -740，Ray：「明晰夢增加發動期間反擊不論哪一圈
   都算完美反擊，傷害跟評價都是。並且發動期間會指引每一個應點格」）══
   「發動期間」＝buff 旗標亮著的那一段（`state.lowHpBuff`，時長走 `buffSeconds`）。
   ⚠ 只有**安雅的明晰之夢**（passive `firstCounter`）算：馬季諾的高裝藥彈共用
     同一支旗標，但那是挑戰限定的另一招（ver -694：正篇不會有他，別動他）——
     所以判的是「旗亮著**而且**現任搭檔的被動是 firstCounter」。
   讀它的兩處：defense.resolveThreat（全帶升紅圈）／combat.markNext（全程指格）。 */
export function lucidActive(){
  if(!state.lowHpBuff) return false;
  const p = currentPartner();
  const pas = p && p.passive;
  return !!(pas && pas.key==='firstCounter');
}
/* 「5 秒普攻加倍」的執行體（`lowHpBuff` 與 `firstCounter` 共用，鐵律 8）。 */
function fireBuff(pas){
  const sec = pas.buffSeconds || 10;
  const fire = ()=>{
    if(state.over) return;
    api.setLowHpBuff(true);
    clearTimeout(lowHpTimer);
    lowHpTimer = setTimeout(()=>{ api.setLowHpBuff(false); lowHpTimer=null; }, sec*1000);
    /* 明晰之夢（ver -740）：發動那一刻就把當前應點格指出來 —— 之後每一格
       由 combat.markNext 接手（它看 lucidActive）。 */
    if(pas.key==='firstCounter' && api.hintCurrentCell) api.hintCurrentCell();
  };
  const vo = asset(pas.voice); if(vo) SFX.playVoice(vo, sfxGain(pas.voice));
  api.floatDmg(pas.name,'50%','34%',true);
  if(state.cutinPlaying){ fire(); return; }   // 已有演出在播 → 只跳字、buff 立即起算
  api.playCutin(()=>{
    fire();                                   // cut-in 撤下才起算，秒數完整可用
    if(state.over) return;
    api.resetEnemyTimers();                   // 同其他 cut-in 的慣例
    api.scheduleUlt();
  }, `${pas.name}<span class="cutin-en">${pas.en||''}</span>`, pas.cutin);
}
export function checkLowHpBuff(){
  /* ⚠⚠ **惡夢化期間不發動**（ver -688，Ray：「明晰之夢在夢魘期間不發動，如果是
     夢魘期間 hp 降到標準以下，要等夢魘退掉才會發動」）——
     那一段的失血是**它自己的代價**（倒數槽），不是被打到；在那裡發動等於把
     惡夢化的代價換成獎勵。
     ⚠ **不要在這裡把 `lowHpArmed` 用掉**：直接 return 就好 —— 上膛狀態留著，
       惡夢化收尾時 `saint` 會再叫一次這一支，那時才真的發動（那就是「等夢魘退掉」）。
     ⚠ 聖徒化那一條（`saintMode`）本來就在，同一個理由。 */
  if(state.saintMode || state.niMode || state.over) return;
  const p = currentPartner();
  const pas = p && p.passive;
  if(!(pas && pas.key==='lowHpBuff')) return; // 非馬季諾：不判定（lowHpBuff 由開場重置歸位）
  const th = pas.threshold || 0.20;
  const low = state.playerHp>0 && state.playerHp <= state.playerMax*th;
  if(!low){ lowHpArmed = true; return; }      // 回到門檻上 → 重新上膛（進行中的 buff 由計時器自然收）
  if(!lowHpArmed) return;                     // 門檻下已觸發過 → 不重複發動
  lowHpArmed = false;
  const sec = pas.buffSeconds || 10;
  const fire = ()=>{                          // 起算 10 秒 buff（時間到自然結束，可跨盤）
    if(state.over) return;
    api.setLowHpBuff(true);
    clearTimeout(lowHpTimer);
    lowHpTimer = setTimeout(()=>{ api.setLowHpBuff(false); lowHpTimer=null; }, sec*1000);
  };
  const vo = asset(pas.voice); if(vo) SFX.playVoice(vo, sfxGain(pas.voice));   // SE（→ vo_hc_rounds；增益見 tuning.fileGain）
  api.floatDmg(pas.name,'50%','34%',true);
  if(state.cutinPlaying){                     // 已有演出在播（如即死防禦 cut-in）→ 只跳字、buff 立即起算
    fire();
    return;
  }
  api.playCutin(()=>{
    fire();                                   // cut-in 撤下才起算，10 秒完整可用
    if(state.over) return;
    api.resetEnemyTimers();                   // cut-in 撤下瞬間重置敵大絕/延時倒數（同其他 cut-in 慣例）
    api.scheduleUlt();
  }, `${pas.name}<span class="cutin-en">${pas.en||''}</span>`, pas.cutin);
}

/* 全重置（combat.startGame / startIntruderFight 調度）：清 10 秒計時器、上膛旗標歸位。
 * state.lowHpBuff 本體由 combat 於開場自清；此處只清 partner 自有狀態。 */
export function reset(){
  fcArmed = true;                             // 開場就上膛（ver -693）
  clearTimeout(lowHpTimer); lowHpTimer=null;
  lowHpArmed = true;
  immuneUntil = 0; guardHealUntil = 0;        // 免傷窗不跨場（ver -740）
}
