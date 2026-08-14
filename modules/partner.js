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

import { GAME_CONFIG, asset } from '../config.js';
import { state, applyDeathGuard } from '../state.js';
import { SFX } from '../audio.js';

/* combat 於啟動時注入的原語：
 *   被動技所需：updateBars / floatDmg / resetEnemyTimers / scheduleUlt / playCutin
 *   主動技分域 api：saintApi（本輪；未來再加 combatApi / defenseApi）
 * 每個 handler 只取所需，多來源共存於此單一注入袋。 */
let api = {};
export function init(a){ api = a; }

// 目前啟用的搭檔 config：讀玩家實選（state.pickedPartner，選人畫面經 setPickedPartner 寫入）。
// 換 partner 即能力切換——被動/主動的歸屬判定全在本模組、全經此函式取當前搭檔。
export function currentPartner(){
  return GAME_CONFIG.partners[state.pickedPartner] || GAME_CONFIG.partners[GAME_CONFIG.defaultPartner];
}

/* ============================================================================
 *  被動技 · 即死防禦
 * ========================================================================== */
// 回傳 true = 已擋下（呼叫端 handlePlayerLethal 應 return，不進 lose）。
// cut-in 圖鑰匙讀 config passive.cutin（維持資料/程式分離；freya 為 'cutin_guard'＝Renee_CI_pas.jpg）。
export function tryDeathGuard(){
  const p = currentPartner();
  const pas = p && p.passive;
  if(!pas || pas.key!=='deathGuard') return false;
  if(pas.oncePerBattle && state.deathGuardUsed) return false;   // 一次性且已用掉 → 不再擋
  applyDeathGuard();          // 鎖 1 HP + 標記 deathGuardUsed（D3 契約例外的唯一入口）
  api.updateBars();           // applyDeathGuard 不碰 DOM，於此刷新血條（對齊 reference）
  const vo = asset(pas.voice); if(vo) SFX.play(vo, (GAME_CONFIG.tuning.partnerSeGain||{})[pas.voice]);   // SE 與 cut-in 同步（→ vo_death_guard；增益見 tuning.partnerSeGain）
  api.floatDmg('即死防禦','50%','40%',true);
  const label = '即死防禦<span class="cutin-en">Death Guard</span>';
  api.playCutin(()=>{
    if(state.over||state.saintMode) return;
    // 即死防禦後：cut-in 撤下瞬間重置敵大絕與延時（間隔）懲罰倒數，避免剛保命就被連段擊殺
    api.resetEnemyTimers();
    api.scheduleUlt();        // 重新排程敵大絕
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
  // 生命歸還：聖徒化中止並保留當前血量。執行能力經 saintApi 注入（saint 內部提供）。
  lifeReturn(a, act){
    if(!state.saintMode) return false;   // 保險：非聖徒化不執行
    const vo = asset(act && act.voice); if(vo) SFX.play(vo, (GAME_CONFIG.tuning.partnerSeGain||{})[act.voice]);   // SE 與結局 cut-in 同步（→ vo_life_return；saint 不知觸發者，SE 歸 partner 播）
    a.saintApi.lifeReturnAbort();
    return true;
  },
  // 前線補給（馬季諾·主動）：發動即進入雙槍破防射擊窗口（不吃破防值、不另播雙槍
  //   cut-in——馬季諾自己的 cut-in 撤下後經注入的 startDual 直接開窗；窗口本體/收尾
  //   仍歸 weapon：startDualWindow/endDual）。
  //   ⚠ 聖徒化期間不可發動（「聖徒化不能開雙槍」原則）：config context:'board' 在
  //   tryActive 已擋掉聖徒化入口，此處再守一道 saintMode 保險。
  supplyRefill(a, act){
    if(state.over || state.saintMode || state.dualWield || state.cutinPlaying || state.transitioning) return false;
    const vo = asset(act && act.voice); if(vo) SFX.play(vo, (GAME_CONFIG.tuning.partnerSeGain||{})[act.voice]);   // SE（→ vo_supply_refill；增益見 tuning.partnerSeGain）
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

export function checkLowHpBuff(){
  if(state.saintMode || state.over) return;   // 聖徒化/結束後不判定
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
  const vo = asset(pas.voice); if(vo) SFX.play(vo, (GAME_CONFIG.tuning.partnerSeGain||{})[pas.voice]);   // SE（→ vo_hc_rounds；增益見 tuning.partnerSeGain）
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
  clearTimeout(lowHpTimer); lowHpTimer=null;
  lowHpArmed = true;
}
