/* ============================================================================
 *  modules/inspector.js — 監察官（評價 + 結算）
 *  ---------------------------------------------------------------------------
 *  職責：評價等第計算（規則制 rank + EXP 顯示分數）、監察官挑選/立繪/對白
 *    （Boss 走 bossDialogues）、結算面板分階段演出與打字機、最佳成績存讀
 *    （一般/Boss 兩組 localStorage）、S 解鎖與「再度執槍/迎擊」分流。
 *
 *  狀態擁有者：3.6 評價/流程（sRankUnlocked / resultMode / currentFavor）。
 *    跨擁有者累加值只讀不反寫：counterCount/counterDamage（weapon 經 addCounter）、
 *    perfectCount（defense 經 addPerfect）、sawExecution（saint 經 markExecution）、
 *    flawlessRun（combat）。currentFavor 本輪固定 0（養成層未接），只讀。
 *
 *  依賴方向：只 import state/config。combat/enemy 原語（goHome / triggerIntruder）
 *    一律由 combat 於 setup() 注入，維持「combat 為唯一協調者」的邊界。
 *
 *  評價系統（rating）：百分制計分 → 對照 GAME_CONFIG.rating.tiers 取等級 → 換算 EXP。
 *    時間項為主（budget 隨敵人總血量自動變動），加分項（命中率/連擊/完美反擊/overkill）、
 *    受擊扣分；無傷（hitsTaken=0）直接判 S。取代舊「無傷+時間門檻」規則制與 config.evaluation。
 *    evaluate/scoreToExp 為純函式（見下），可單獨測試；stats 由 combat.win 組裝。
 * ========================================================================== */

import { GAME_CONFIG, asset, bgmVol, sfxGain } from '../config.js';
import { showLoot } from './loot.js';
import * as inv from '../script/inventory.js';   // 破紀錄的獎品要先問「是不是已經有了」
import * as prog from '../script/progress.js';   // 拿到獎品記一個旗標（城鎮的一次性提示掛在它上面）
/* 蕾娜的結算評價（ver -432）：內容全在那一檔，這裡只負責挑與演（鐵律 1）。 */
import { EVALUATOR, EVAL_FLAG, EVAL_SKIP, LINES as EVAL_LINES,
         BY_BATTLE as EVAL_BY_BATTLE } from '../script/evaluation.js';
import { SPEAKERS, ART } from '../script/speakers.js';   // 評價者的顯示名與立繪＝與對白同一份
import { state } from '../state.js';
import { SFX } from '../audio.js';   // Boss BGM 於「再度執槍（S 解鎖）」瞬間起播
import { L, fmt, decorateLine } from '../i18n.js';   // 多語言（結算標題/數據列/按鈕/台詞關鍵字）

const $ = id => document.getElementById(id);

/* ---------------------------------------------------------------------------
 *  注入點：combat.setup() 傳入自己與 enemy 的原語（維持依賴方向）。
 *    goHome         — combat 擁有：結算後回首頁。
 *    triggerIntruder— enemy 擁有：迎擊 → 進 Boss 戰（本輪為 no-op，待第 5 步）。
 * ------------------------------------------------------------------------- */
let api = { goHome(){}, triggerIntruder(){}, loseKind(){ return 'home'; } };
export function init(injected){ api = { ...api, ...injected }; }

/* ============================================================================
 *  小工具
 * ========================================================================== */
function fmtTime(sec){
  if(sec==null || !isFinite(sec)) return '--';
  const m=Math.floor(sec/60), s=sec-m*60;
  return m>0 ? fmt(L.result.timeMinSec,{m,s:s.toFixed(1)}) : fmt(L.result.timeSec,{s:s.toFixed(1)});
}

// 依「門檻 key → 值」的表，挑出不超過 current 的最高門檻對應值；找不到回 fallback。
// 好感雙軌查表器：未來加好感層＝往 dialogues/portraits 加門檻 key，此查表器不動。
function pickByThreshold(map, current, fallback){
  if(!map) return fallback;
  const keys=Object.keys(map).map(Number).filter(k=>!isNaN(k)).sort((a,b)=>a-b);
  let picked=fallback, found=false;
  for(const k of keys){ if(current>=k){ picked=map[k]; found=true; } }
  return found ? picked : fallback;
}

/* ============================================================================
 *  評價系統（rating）— 百分制計分 → 等級 → EXP
 *  ---------------------------------------------------------------------------
 *  所有可調數值集中於 GAME_CONFIG.rating，本檔不硬編任何評分參數。
 *  evaluate / scoreToExp 為「純函式」（只吃 stats/cfg，不讀 state/DOM），方便單獨測試。
 *  stats 需含：totalHP、clearTime(秒)、失誤計數（wrongTaps/ultHits/blocks/delays）、
 *              perfectCounter；⚠ `isBoss` 自 ver -602 起**不參與評價**（難度用 HP 表達）。
 *  （以下是舊百分制留下的欄位說明，已退役）：accuracy(0~1)、maxCombo、
 *             perfectCounter、overkill、hitsTaken。
 *  完美反擊 = Counter 反擊次數(counterCount)；反擊總傷 = counterDamage（皆由 combat.win 組裝進 stats）。
 * ========================================================================== */
const clamp01 = x => (x<0 ? 0 : (x>1 ? 1 : x));

/* ══ 這一場掉多少錢（ver -595 抽成一支）══ 只擲骰、**不入帳** ——
   連續戰鬥的中間幾場要先記帳、到收段那一場才一起入（見 settle 的說明）。
   ⚠ 機率與範圍在 `config.battleLoot`（鐵律 1）；Boss 加成走 `bossMul`。 */
export function rollBattleMoney(){
  const bl=(GAME_CONFIG.battleLoot||{}).money;
  if(!bl || Math.random() >= (bl.chance!=null?bl.chance:0)) return 0;
  const lo=bl.min|0, hi=Math.max(lo, bl.max|0);
  let m = lo + Math.floor(Math.random()*(hi-lo+1));
  if(state.inIntruderFight && bl.bossMul>1) m=Math.round(m*bl.bossMul);
  return m;
}
/* ══⚠⚠ 連續戰鬥的中間幾場：把這一場的**戰績**與錢記進帳（ver -595；-601 改）══
   由 combat 的 `win()` 在「不結算」那一支呼叫；到收段那一場由 `settle` 一起領走。
   ⚠⚠ 累的是**原始統計**（用時、失誤次數、血量總和…）不是分數（ver -601，Ray：
     「戰鬥用時也是要用整場的全部戰鬥總和時間」）—— 分數要在**總和**上算一次；
     各場先各算一次再相加是另一件事，等第會失真。
   ⚠ 錢照舊逐場擲、逐場記（那是掉落，不是評價）。 */
const SUM_KEYS = ['clearTime','totalHP','wrongTaps','ultHits','blocks','delays',
                  'perfectCounter','counterDamage','overkill','hitsTaken','perfectBoards'];
export function bankSessionGain(stats){
  const acc = state.sessionStats || {};
  for(const k of SUM_KEYS) acc[k] = (acc[k]||0) + (stats[k]||0);
  acc.maxCombo = Math.max(acc.maxCombo||0, stats.maxCombo||0);   // 連擊取最高，不相加
  /* 處刑是**這一場有沒有發生過**（ver -630）：布林用 OR，不是相加 ——
     一段之內任何一場以 EXSECUTIŌ 收尾，整場就算數。 */
  acc.sawExecution = !!(acc.sawExecution || stats.sawExecution);
  state.sessionStats = acc;
  state.sessionMoney = (state.sessionMoney|0) + rollBattleMoney();
}
/* 收段那一場：把累計的併進這一場的統計（`settle` 用）。沒有累計就原樣回傳。 */
export function mergeSessionStats(stats){
  const acc = state.sessionStats;
  if(!acc) return stats;
  const out = Object.assign({}, stats);
  for(const k of SUM_KEYS) out[k] = (out[k]||0) + (acc[k]||0);
  out.maxCombo = Math.max(out.maxCombo||0, acc.maxCombo||0);
  out.sawExecution = !!(out.sawExecution || acc.sawExecution);
  return out;
}
export function clearSessionGain(){ state.sessionStats=null; state.sessionMoney=0; }

// 分數 → EXP：offset 質數基底 + score×mult，尾數微擾 + overkill 加成，避免整齊倍數。
export function scoreToExp(score, stats, cfg = GAME_CONFIG.rating.exp){
  let exp = cfg.offset + score * cfg.mult;
  const jitter = Math.round((score * cfg.mult) % cfg.jitterMod);
  exp += jitter;
  exp += (stats.overkill || 0) * cfg.overkillExp;   // 每次 overkill +overkillExp
  return Math.round(exp);
}

/* ══════════════════════════════════════════════════════════════════════
   主評分（ver -600 改寫；-604 收斂成**單一係數**，Ray 交辦）
   ──────────────────────────────────────────────────────────────────────
       用時 ＝ 實際戰鬥秒數 ＋ 失誤秒 − 獎勵秒（夾在 0 以上）
       分數 ＝ 100 −（用時 ÷ 敵人總血量）× `timeK`
       等第 ＝ 分數對照 `tiers`
   ⚠⚠⚠ **難度只有 `timeK` 一個旋鈕**（Ray：「我只要一個單一係數，用來把時間
     轉換成分數的係數」）。`penalty`／`tiers` 是形狀，平常不動。
   ⚠ 除以敵人總血量：血厚的怪本來就要打比較久 —— 除掉之後 `timeK` 對每一種怪的
     意義才一致。「數個敵人算一場」時分母是**全敵 HP 總和**（`runTotalHp()`，鐵律 7）。
   ⚠ Boss 沒有額外加成（ver -602）；沒有 E（`tiers` 末項兜底）。
   ⚠ 回傳仍是 `{grade, score, exp, breakdown}` —— 畫面上顯示的是等第。
   ══════════════════════════════════════════════════════════════════════ */
export function evaluate(stats, cfg = GAME_CONFIG.rating){
  const pen = cfg.penalty || {};
  const hp  = Math.max(1, stats.totalHP || 0);
  const penSec = (stats.wrongTaps     ||0) * (pen.wrong   ||0)
               + (stats.ultHits       ||0) * (pen.ult     ||0)
               + (stats.blocks        ||0) * (pen.block   ||0)
               + (stats.delays        ||0) * (pen.delay   ||0)
               /* ⚠ 反擊與 overkill 是**負的**（ver -601／-603）：它們是表現不是失誤。 */
               + (stats.perfectCounter||0) * (pen.counter ||0)
               + (stats.overkill      ||0) * (pen.overkill||0)
               /* 完美清盤（ver -659，Ray：「完美清盤一次 −1 秒」）：負的＝獎勵。
                  ⚠ 與 overkill 相反 —— 它**不是隨機的**，是「這一盤打乾淨了」，
                    每一盤都由玩家自己決定，所以折成秒數是公平的。 */
               + (stats.perfectBoards ||0) * (pen.perfectBoard||0)
               /* ⚠ 以 **EXSECUTIŌ（處刑）** 收尾 → 一次性折抵（ver -630，Ray：
                  「excute 結束 −5 秒」）。它是**這一場有沒有發生過**，不乘次數。
                  ⚠ 與無傷那條下限是兩件事：這一條仍然走秒數（它是「打得漂亮」的
                    加分，不是「保證等第」的宣告）。 */
               + (stats.sawExecution ? (pen.execution||0) : 0);
  /* ⚠ 夾在 0 以上：反擊／overkill 夠多時折算會是負的，扣過頭會變成負秒數。 */
  const used = Math.max(0, (stats.clearTime||0) + penSec);
  let score = Math.max(0, Math.min(100, Math.round(100 - (used/hp) * (cfg.timeK||200))));
  let grade = cfg.tiers[cfg.tiers.length-1].grade;
  for(const tier of cfg.tiers){ if(score >= tier.min){ grade = tier.grade; break; } }
  /* ══⚠⚠ **整場無傷 ＝ 等第下限**（ver -626，Ray：「無傷基本讓他保證 S」）══
     說明與理由見 `config.rating.flawlessFloor`。
     ⚠ 是**下限**不是覆寫：本來就更高就不要往下壓（現在 S 是頂，但日後加 SS 就會有差）。
     ⚠ 分數一起抬到那一級的門檻 —— EXP 由分數算，等第與 EXP 不該互相打架（鐵律 7）。
     ⚠ 判定與結算頁那個「無傷」標籤是**同一個**（`stats.hitsTaken===0`）：
       畫面上標了無傷卻不是 S 會讀成壞掉。 */
  const ff = cfg.flawlessFloor;
  if(ff && (stats.hitsTaken||0)===0){
    const fi = cfg.tiers.findIndex(t=>t.grade===ff);
    const gi = cfg.tiers.findIndex(t=>t.grade===grade);
    if(fi>=0 && (gi<0 || gi>fi)){ grade = ff; score = Math.max(score, cfg.tiers[fi].min); }
  }
  const exp = scoreToExp(score, stats, cfg.exp);
  return { grade, score, exp, breakdown: { hp, penSec, used, secPerHp: used/hp } };
}

/* ============================================================================
 *  監察官挑選 / 立繪 / 對白
 * ========================================================================== */
// 取得當前啟用的監察官 config（無則 null）
/* `bossFight`＝Boss 戰（挑戰）的結算頁（ver -471 打贏；-553 起**敗北也算**，
   Ray：「boss戰落敗的話 Luna_SI_seat_angry」）→ 改用 config.bossInspector（luna）。
   迎擊警告（interceptLine）與其他一切照 defaultInspector（芙蕾雅）。 */
function getInspector(bossFight){
  const key=(bossFight && GAME_CONFIG.bossInspector) || GAME_CONFIG.defaultInspector;
  if(!key) return null;
  return GAME_CONFIG.inspectors[key] || null;
}

// 依監察官 + 好感度挑立繪鑰匙（無 portraits 則用單張 image）
/* ══ 蕾娜的結算評價（ver -432，Ray 交稿）══════════════════════════════════
   「第一次艦戰後開啟蕾娜評價，之後除了打靶之外蕾娜都會在結算畫面評價。」
   ⚠ **這一支是唯一的判定點**（鐵律 7）：要不要出現、出誰、講哪一句，全在這裡；
     `scriptSettle` 只問一次然後照演。
   ⚠ 開啟的**時機寫在戰鬥卡上**（`config.battles[x].evalFrom`）不寫死是哪一場 ——
     所以第一場艦戰自己那一次就看得到（旗標在這裡順手記下去，之後每一場都有）。
   ⚠ 回傳 `{name, portrait, line}`＝ `showResultSequence` 的 `opts.speaker` 契約；
     `portrait` 是**直接路徑**不是 ASSETS 鍵（立繪住在 `speakers.js`，不進 ASSETS）。 */
function pickEvaluator(rankKey, battleId){
  const bt = (GAME_CONFIG.battles||{})[battleId] || {};
  /* 這一場負責開啟評價 → 現在就記，於是**這一次就評得到**（Ray：「第一次艦戰後開啟」）。 */
  if(bt.evalFrom && !prog.hasFlag(EVAL_FLAG)) prog.addFlags([EVAL_FLAG]);
  if(!prog.hasFlag(EVAL_FLAG)) return null;
  if(EVAL_SKIP.indexOf(battleId) >= 0) return null;          // 打靶不評（Ray 指定）
  const who = SPEAKERS[EVALUATOR] || {};
  /* ⚠ **某一場專屬的台詞優先**（ver -597）：`evaluation.js` 的 `BY_BATTLE`
     查得到這一場就用它，查不到才回去走依章節／好感的通用表。
     那張通用表是「全部場次」的，把某一場的稿寫進去會把所有場次一起換掉。 */
  let one = (EVAL_BY_BATTLE[battleId]||{})[rankKey];
  if(!one){
    /* 章節 → 好感，兩層都是**門檻**（取不超過現值的最高那一格，同 `dialogues` 的查表法）。 */
    const byStage = pickByThreshold(EVAL_LINES, prog.getStage(), null);
    if(!byStage) return null;
    const aff = (prog.getAffection() || {})[(who.art||'')] ;
    const byAff = pickByThreshold(byStage, (aff==null ? 0 : aff), null);
    one = byAff && byAff[rankKey];
  }
  if(!one) return null;
  const art = ART[who.art] || {};
  const ex  = (art.expr||{})[one.expr];
  return { name: who.name || '',
           portrait: (ex && ex.src) || art.base || '',
           line: one.text || '' };
}

function pickInspectorPortrait(insp, rankKey){
  if(!insp) return null;
  /* 逐等第差分優先（ver -471，璐娜莉亞）：portraitsByRank[等第]；
     沒有這一組（芙蕾雅）才走原本的好感門檻表。 */
  if(insp.portraitsByRank && rankKey && insp.portraitsByRank[rankKey]) return insp.portraitsByRank[rankKey];
  return pickByThreshold(insp.portraits, state.currentFavor, insp.image||null);
}

// 依監察官 + 評價等第（或 'lose'）+ 好感度挑一句台詞；挑不到回 null。
// boss=true 時優先用 bossDialogues（Boss 戰專屬），缺該 rank 才 fallback 回一般 dialogues。
function pickInspectorDialogue(insp, rankKey, boss){
  if(!insp) return null;
  let byRank = null;
  if(boss && insp.bossDialogues) byRank = insp.bossDialogues[rankKey];
  if(!byRank && insp.dialogues)  byRank = insp.dialogues[rankKey];
  if(!byRank) return null;
  const arr = pickByThreshold(byRank, state.currentFavor, null);
  if(!arr || !arr.length) return null;
  return arr[Math.floor(Math.random()*arr.length)];
}

// 戰敗結算用：Counter（次數+累計傷害）、完美防禦（次數）
function combatStatsRows(){
  let r='';
  r += `<div class="row"><span>${L.result.rowCounter}</span><b>${fmt(L.result.timesUnit,{n:state.counterCount})} · ${fmt(L.result.dmgUnit,{n:state.counterDamage})}</b></div>`;
  r += `<div class="row"><span>${L.result.rowPerfect}</span><b>${fmt(L.result.timesUnit,{n:state.perfectCount})}</b></div>`;
  return r;
}

// 勝利結算明細。Overkill 已在標題副行呈現、無傷改為「戰鬥用時」旁的貼標（達標才出現），故此處皆不另列。
function ratingStatsRows(stats, totalTime){
  const accPct = Math.round(clamp01(stats.accuracy) * 100);
  const flawlessTag = (stats.hitsTaken === 0) ? ` <span class="tag-flawless">${L.result.tagFlawless}</span>` : '';
  let r='';
  r += `<div class="row"><span>${L.result.rowCombo}</span><b>${stats.maxCombo}</b></div>`;
  r += `<div class="row"><span>${L.result.rowHits}</span><b>${stats.hitsTaken}</b></div>`;
  r += `<div class="row"><span>${L.result.rowAccuracy}</span><b>${accPct}%</b></div>`;
  r += `<div class="row"><span>${L.result.rowPerfectCtr}</span><b>${fmt(L.result.timesUnit,{n:stats.perfectCounter})}</b></div>`;
  r += `<div class="row"><span>${L.result.rowCtrDamage}</span><b>${Math.round(stats.counterDamage || 0)}</b></div>`;
  r += `<div class="row"><span>${L.result.rowTime}</span><b>${fmtTime(totalTime)}${flawlessTag}</b></div>`;
  return r;
}

/* ============================================================================
 *  最佳成績（一般 / Boss 兩組 localStorage）
 * ========================================================================== */
const BEST_KEY='saint_best_total_v1';
const BEST_KEY_BOSS='saint_best_total_boss_v1';   // Boss 戰獨立最佳紀錄
/* 最佳總用時。`boss` 為 true 走 Boss 那一格；字串則是**那一場自己的紀錄**
   （ver -377，劇情插入戰的 `record` 欄位，例如打靶場）。 */
function bestKey(boss){
  if(typeof boss === 'string') return 'tivot_best_'+boss+'_v1';
  return boss ? BEST_KEY_BOSS : BEST_KEY;
}
function loadBestTotal(boss){
  try{ const v=localStorage.getItem(bestKey(boss)); return v?parseFloat(v):null; }catch(e){ return null; }
}
function saveBestTotal(t, boss){
  try{ localStorage.setItem(bestKey(boss), String(t)); }catch(e){}
}

/* ============================================================================
 *  結算入口：combat.win/lose 算好 totalTime/avg（它擁有計時）後呼叫。
 *    opts.isLose 為真＝戰敗流程（rows 只列反擊/完美，不算評價/最佳/EXP）。
 * ========================================================================== */
export function settle(totalTime, stats, opts={}){
  const isLose = !!opts.isLose;
  /* ══⚠⚠ **「一場」的併帳只有這一處**（ver -621，Ray：「無傷是算『場』不是算『敵』，
     所有以場為單位都是以結算為終點」）══
     「場」＝槍棺上彈 → 蕾娜評價（§6.5.4.3 的 session）。連續戰鬥中間幾格不彈
     結算頁，它們的用時／失誤／受擊／overkill 累在 `state.sessionStats`、
     錢累在 `sessionMoney` —— **在這裡一次併進來**，之後每一條結算路徑
     （監察官／教學／劇情插入戰）拿到的都是「整場」的統計。
     ⚠⚠ ver -601 的併帳只做在**監察官**那一頁，而城鎮戰／劇情戰走的是
       `scriptSettle` —— 於是整段累計的戰績與錢從來沒被領走過，
       `endSession()` 一到就清掉了（無傷、用時、EXP、金錢全部只算最後一隻）。
       併在分流**之前**，日後多一條結算路徑也自動吃到（鐵律 8）。
     ⚠ 領完就清：不然下一場會把上一段的再算一次。
     ⚠ 戰敗不併也不清 —— 那一頁不報帳，而這一段可能還要再打一次。 */
  let sessionMoney = 0;
  if(stats && !isLose){
    stats = mergeSessionStats(stats);
    sessionMoney = state.sessionMoney|0;
    clearSessionGain();
    /* ⚠ 「這一場打了多久」也跟著變成整場的總和 —— 最佳紀錄、破紀錄獎品、
       畫面上的「戰鬥用時」全部同一個數字（鐵律 7）。 */
    if(stats.clearTime) totalTime = stats.clearTime;
  }
  /* 劇情版教學（諾薇兒帶的那一場）：結算頁**整個不出**（Ray 指定，見
     script/TUTORIAL_LINES_NOUVELLE.md 第八節）。
     ⚠ 正常情況下**根本走不到這裡** —— ver -325 起 combat 的 win()/lose() 在
       第一時間就把場子交還劇情（storyBattleEnd），連「驅逐完成」過渡禎都不播。
       這一道是保險：哪天多開一條通往 settle 的路，也不會突然冒出一頁評價。 */
  /* ── 教學結算（ver -358，Ray 指定）───────────────────────────────
     「跳出結算畫面但沒有監察官，結算戰績及 exp，不評等級」。劇情版與一般版同一頁。
     ⚠ 以前劇情版是**整頁不出**（直接把場子交還劇情）；現在改成出這一頁，
       玩家按了按鈕才回劇情／首頁 —— 交還的動作由 `tutorialDone` 這個回呼負責。 */
  /* ⚠ `!isLose`（ver -376）：教學／插入戰的結算頁是**給打贏用的**（戰績＋拾得）。
     戰敗一律走下面那一頁（Ray：除劇情殺／可戰敗之外，戰敗一律 Game Over 回主選單）。 */
  if(state.tutorialRun && !isLose){ tutorialSettle(totalTime, stats, sessionMoney); return; }
  /* 劇情插入戰（ver -375）：與教學結算同一頁 —— **沒有監察官、沒有等級**，
     只有戰績、EXP 與拾得。⚠ 不是教學，所以不走教學那兩句台詞。 */
  if(state.scriptRun && !isLose){ scriptSettle(totalTime, stats, sessionMoney); return; }
  if(isLose){
    const rows=combatStatsRows();
    showResultSequence(L.result.loseTitle, L.result.loseSub, rows, 'lose', true);
    setupLoseNav();
    return;
  }
  // ── 勝利結算 ──
  // 最佳總用時 / 破紀錄判定（Boss 戰為獨立戰鬥 → 最佳紀錄分開存）。評價本身不看最佳，只作 NEW RECORD 提示。
  const bossFight = state.inIntruderFight;
  const prevBest=loadBestTotal(bossFight);
  const isRecord = (prevBest==null) || (totalTime<prevBest);
  if(isRecord) saveBestTotal(totalTime, bossFight);

  let sub=fmt(winSubOf(GAME_CONFIG.enemies[state.currentEnemyKey]),
              {name:(($('enemyName')&&$('enemyName').textContent)||'')});
  if(stats.overkill>0) sub += ` · OVERKILL ${Math.round(stats.overkill)}`;

  // ── 評價系統（rating）：大字等級（顯眼）+ 各數值明細 + EXP／金錢 ──
  /* ⚠ **整場一起評**（ver -601；-621 起併帳搬到本函式開頭，見那裡）：
     `stats` 進來就已經是整場的總和了。 */
  const evalResult = evaluate(stats);
  let rows='';
  rows += `<div class="grade-wrap"><b class="grade-badge rank-${evalResult.grade}">${evalResult.grade}</b>`
        + `<span class="grade-meta"><span class="grade-cap">${L.result.gradeCap}</span></span></div>`;
  /* ══⚠⚠ **畫面上的「戰鬥用時」是實際秒數**（ver -610，Ray：「戰鬥用時不要扣秒，
     要用實際的秒數，扣秒是後台計分算的」）══
     失誤／獎勵折算的那幾秒**只活在 `evaluate()` 裡**（`breakdown.used`），
     不進畫面 —— 玩家看到的必須是他真的打了多久，不然那個數字對不上手感。
     ⚠ 連續戰鬥（城鎮戰）顯示的是**整場的總和**（`merged`，ver -601 那一條）：
       中間幾格不彈結算頁，收段這一頁本來就是替整段報帳。
     ⚠ 其餘幾列（連擊／受擊／命中率／反擊）同理一律用 `merged`，
       不要一半顯示整場、一半只顯示最後一場。 */
  rows += ratingStatsRows(stats, totalTime);
  /* ══⚠⚠ EXP 與金錢**直接放在結算頁、當場入帳**（ver -470，Ray：「exp跟金錢
     不要放在戰利品，直接在結算計算」）══
     與劇情結算（scriptSettle，ver -453）同一套。-439 曾把兩者搬去戰利品那一頁，
     -453 只改了劇情場 —— 這裡是最後一條還在彈窗的路。
     ⚠ 掉錢的機率與範圍照舊在 `config.battleLoot`（鐵律 1），這裡只擲骰；
       Boss 加成走 `bossMul`。一般戰沒有道具掉落，戰利品視窗因此整個不彈。 */
  /* ══⚠⚠ **連續戰鬥的 EXP 與錢是「整場」結算**（ver -595，Ray：「exp 跟錢都用
     『整場』來結算」）══ 城鎮戰那五格對玩家而言是同一場（§6.5.4.3），中間幾格
     不彈結算頁 —— 那幾格的**戰績**累在 `state.sessionStats`、錢累在 `sessionMoney`，
     到收段的那一場（Boss）**一起評一次等第**、一起入帳、一起顯示（ver -601：
     「戰鬥用時也是要用整場的全部戰鬥總和時間」）。
     ⚠ 擲骰只有 `rollBattleMoney()` 一支（鐵律 7）：中間場與這裡都問它。
     ⚠ 錢**在這裡才真的入帳**（中間場只記帳）—— 不然打到一半跑掉，錢已經進口袋了。
     ⚠ 領完就清（`clearSessionGain`），不然下一場會把上一段的再算一次。 */
  let gainMoney = rollBattleMoney() + sessionMoney;
  const totalExp = evalResult.exp|0;      // EXP 由**整場的總和**算出來（ver -601）
  if(gainMoney) inv.addMoney(gainMoney);
  if(totalExp) rows += '<div class="row"><span>EXP</span><b>＋'+totalExp+'</b></div>';
  if(gainMoney) rows += '<div class="row"><span>'+inv.moneyName()+'</span><b>＋'+gainMoney+'</b></div>';
  if(isRecord) rows += `<div class="record">${L.result.newRecord}</div>`;
  // ── 監察官結算展示（依評價等第挑台詞）──
  showResultSequence(L.result.winTitle, sub, rows, evalResult.grade, false);
  _lootMoney = 0; _lootExp = 0;   // 金錢與 EXP 不再走戰利品那一頁

  // ── 隱藏關（New Hustle）解鎖判定：S 評價才解鎖，不自動觸發 ──
  //   由「再度執槍 → 迎擊」流程手動進入（見 onRematchBtn）。
  const it = GAME_CONFIG.intruder;
  state.sRankUnlocked = false;
  if(it && it.enable && !state.intruderTriggered && !state.inIntruderFight && evalResult.grade==='S'){
    state.sRankUnlocked = true;
  }

  // ── Boss 戰 S 級獎勵（銭湯インストール）：兩段式按鈕 ──
  //   第一按「再度執槍」→ 原地變身金色呼吸光「SAINT INSTALL...?」（resultMode 'sentou-offer'→'sentou'）
  //   第二按 → 進獎勵畫面（openSentouReward）。分流見 onRematchBtn。
  if(state.inIntruderFight && evalResult.grade==='S' && it && it.reward){
    const img=new Image(); img.src=asset(it.reward.image);   // 預載獎勵大圖（2.3MB，結算期間先抓）
    state.resultMode='sentou-offer';   // 覆蓋 showResultSequence 預設的 'rematch'
  }
}

/* ══ 戰敗那一頁的去向（ver -430，Ray 定案）══════════════════════════════════
   「船戰死亡點擊繼續回到戰鬥前的飛行畫面進度；其餘戰鬥死亡點再戰回到該幕對話的
     開頭，點放棄回到主畫面。」
   三種場次、三張臉：
     'flight'  船艦戰（飛行頁交棒過來的）→ 一顆「繼續」：回飛行畫面，船還在原處
     'story'   劇情／城鎮插進來的那一場   → 兩顆「放棄／再戰」
     'home'    出陣（試玩版）             → 維持原樣（一顆「再度執槍」→ 回首頁）
   ⚠ **是哪一種由啟動層回答**（`api.loseKind`）：只有它知道這一場是誰叫起來的。
     這裡不從 `state` 反推（那會變成第二個判定點，鐵律 7）。
   ⚠ **有去處時取消「自動回首頁」**：那個計時器是給看戰績用的，
     現在這一頁是個要玩家做決定的岔路 —— 時間到了自己走人會把玩家的選擇吃掉，
     而且飛行頁的交棒狀態也跟著被丟掉。 */
function setupLoseNav(){
  const kind = api.loseKind ? api.loseKind() : 'home';
  const acts=$('bannerActs'), rbtn=$('rematchBtn'), gbtn=$('giveupBtn');
  if(kind==='home') return;                 // 出陣：showResultSequence 已經擺成「再度執槍」
  clearTimeout(_resultAutoTimer);
  /* `town`（ver -496）：城鎮插入戰敗北 → 也是一顆「繼續」，按下去被抬回旅店
     （去哪裡一樣由啟動層的 storyReturn 分流 —— 這裡只管這一頁長什麼樣）。 */
  if(kind==='flight' || kind==='town'){
    state.resultMode='lose-continue';
    if(rbtn) rbtn.textContent=L.result.loseContinue;
    return;
  }
  state.resultMode='lose-retry';
  if(rbtn) rbtn.textContent=L.result.loseRetry;
  if(gbtn) gbtn.textContent=L.result.loseGiveUp;
  if(acts) acts.classList.add('two');
}
/* 戰敗那一頁的兩顆鈕**共用這一支**（鐵律 8）：防連點、音效、離場延遲只有一份。
   ⚠ 借用 `'tutorial-leaving'` 當「離場中」旗標 —— 那本來就是這個狀態機的擋門磚。 */
function leaveLose(action){
  clearTimeout(_resultAutoTimer);
  state.resultMode='tutorial-leaving';
  SFX.play(asset('sfx_start'), sfxGain('sfx_start'));
  /* ⚠ 走**同一個**交棒出口（`storyReturn`）：去哪裡是啟動層的事，
     這裡只負責把「玩家按了哪一顆」送出去。 */
  setTimeout(()=>{ if(api.storyReturn) api.storyReturn({ lost:true, lose:action });
                   else api.goHome(); }, 260);
}
/* 「放棄」（ver -430）。⚠ 只有兩顆鈕那一頁按得到 —— 其餘狀態下它根本不顯示，
   這一道是防止鍵盤／誤觸在別的結算頁把玩家踢回首頁。 */
export function onGiveupBtn(){
  if(state.resultMode!=='lose-retry') return;
  leaveLose('giveup');
}

/* ============================================================================
 *  結算畫面分階段序列：
 *   T0 立繪＋retry＋大標同時進場 → rows 由上往下刷（1s 內）→ 對話框彈出 → 逐字台詞（2s 內）
 * ========================================================================== */
let _inspTypeTimer=null;
let _resultAutoTimer=null;   // 結算/戰敗畫面自動回首頁計時
/* opts.noInspector＝這一頁**不出監察官**（ver -358，Ray 指定教學結算不要她）。
   ⚠ 不要用「傳 isLose」來偷渡：那會連按鈕文案與 BGM 分支一起改掉。 */
function showResultSequence(title, sub, statsHtml, rankKey, isLose, opts){
  const b=$('banner');
  /* ⚠⚠ **結算畫面不再自動回首頁**（ver -433，Ray：「戰鬥結算畫面放置過久會自動退回
     主頁，取消此機制」）。那個計時器原本是給看戰績用的保險，但它會在玩家還在讀
     台詞／還在決定要按哪一顆時把人帶走 —— 而 ver -430 之後這一頁常常是**岔路**
     （繼續／再戰／放棄），時間到了自己走人等於幫玩家做了決定。
     ⚠ `_resultAutoTimer` 與各處的 `clearTimeout` 留著：那幾行是冪等的，
       而且哪天要做「展示模式」時這條線還在。`config.transitions.resultAutoMs`
       也留著當紀錄，**但現在沒有人讀它**。 */
  clearTimeout(_resultAutoTimer);
  // 每次結算：按鈕歸位為「再度執槍」模式
  state.resultMode='rematch';
  /* ⚠ 兩顆鈕的版面也要歸位（ver -430）：上一場戰敗留下的 `.two` 不收的話，
     下一場打贏的結算頁會多出一顆「放棄」。同 rbtn 那幾行的理由 —— 開場一律先歸零。 */
  const acts=$('bannerActs'); if(acts) acts.classList.remove('two');
  const rbtn=$('rematchBtn');
  rbtn.textContent=L.result.rematch;
  rbtn.classList.remove('intercept','ready','saintinstall');
  rbtn.style.display='';
  rbtn.style.visibility='';   // 復位：避免沿用上一場「迎擊」流程的 visibility:hidden
  $('bannerTitle').textContent=title;
  $('bannerSub').textContent=sub;
  const stats=$('resultStats');
  stats.innerHTML=statsHtml||'';
  stats.classList.remove('sweep');

  /* ⚠ `opts.speaker`＝**這一頁由別人來講**（ver -432，蕾娜的結算評價）：
     `{name, portrait, line}` 三樣都給齊，於是這裡不再問 `getInspector()`，
     台詞也不走 `pickInspectorDialogue` —— 那一整套是監察官（芙蕾雅）的，
     兩者共用的只有**這個版面**，不是那份資料（同「框是共用的，教學那一套不是」）。
     ⚠ `portrait` 是**直接路徑**不是 ASSETS 鍵：立繪住在 `speakers.js`，沒進 ASSETS。 */
  const spk = (opts && opts.speaker) || null;
  // 監察官立繪＋台詞（一般失敗不跑監察官；Boss 戰失敗仍顯示監察官，播 Boss 失敗台詞）
  /* Boss 戰（挑戰）勝敗**都**由璐娜莉亞評（ver -553，Ray：「boss戰落敗的話
     Luna_SI_seat_angry『討人厭的夢......』」）—— -471 的「敗北回芙蕾雅」作廢。 */
  const insp = spk ? null
             : (opts && opts.noInspector) ? null
             : ((isLose && !state.inIntruderFight) ? null : getInspector(state.inIntruderFight));
  const stage=$('inspectorStage');
  const bubble=$('inspectorBubble');
  const portrait=$('inspectorPortrait');
  const nameEl=$('inspectorName');
  const lineEl=$('inspectorLine');
  clearTimeout(_inspTypeTimer);
  bubble.classList.remove('show');
  lineEl.textContent='';
  /* ⚠ **膝部以上只給評價者那一頁**（ver -439，Ray 指定）：裁切的比例是照
     `speakers.js` 那組立繪量的（見 style.css 的 `--knee`），監察官（芙蕾雅）用的是
     另一組圖，沒量過就不要一起套。裁多少寫在 CSS，這裡只負責掛不掛那個 class。 */
  stage.classList.toggle('knee', !!spk);
  if(insp || spk){
    stage.style.display='flex';
    const pKey = spk ? spk.portrait : pickInspectorPortrait(insp, rankKey);
    /* ⚠ 監察官的立繪是 ASSETS 鍵，評價者的是直接路徑 —— 兩者都可能是空字串。 */
    portrait.src = spk ? (pKey||'') : (pKey ? asset(pKey) : '');
    portrait.style.display = portrait.src ? 'block' : 'none';
    nameEl.textContent = spk ? spk.name : (insp.name || L.inspector.fallbackName);
  }else{
    stage.style.display='none';
  }

  b.classList.toggle('lose', !!isLose);
  b.classList.remove('seq');
  b.classList.add('on');
  // 觸發進場動畫（立繪＋大標＋retry 同時）
  void b.offsetWidth;
  b.classList.add('seq');

  // ── 階段二：rows 由上往下刷，1 秒內刷完 ──
  const rowEls=stats.querySelectorAll('.grade-wrap, .row, .record');
  const n=rowEls.length;
  const totalSweep=1000;                       // 1 秒內刷完
  const step = n>1 ? Math.min(120, totalSweep/n) : 0;
  rowEls.forEach((el,idx)=>{ el.style.animationDelay=(idx*step)+'ms'; });
  // 稍等立繪起手後再刷 rows
  setTimeout(()=>{ stats.classList.add('sweep'); }, 260);

  // ── 階段三＋四：rows 刷完後彈出對話框，逐字顯示台詞（2 秒內）──
  //   教學戰（tutorialRun）走 tutorialSettle（noInspector，ver -358 起無台詞），不進這裡
  const sweepDone = 260 + (n>0 ? (n-1)*step : 0) + 300;
  if((insp || spk) && !state.tutorialRun){
    // 處決勝利（聖徒化 Maximum Burst 擊殺）→ 固定處決台詞，不論 rank；否則走 rank 台詞。
    // Boss 戰一律走 bossDialogues 的 rank 台詞（不套用一般處決台詞）。
    let line = spk ? spk.line
      : (!state.inIntruderFight && state.sawExecution && insp.executionLine)
      ? insp.executionLine
      : (pickInspectorDialogue(insp, rankKey, state.inIntruderFight) || L.result.lineMissing);
    // {rand3}＝隨機 3 位數，不足 3 位以 0 補滿（如 007 / 042）。Boss 落敗台詞用。
    line = line.replace('{rand3}', String(Math.floor(Math.random()*1000)).padStart(3,'0'));
    setTimeout(()=>{
      bubble.classList.add('show');
      typeInspectorLine(lineEl, line, 2000);   // 2 秒內逐字
    }, Math.max(sweepDone, 1100));
  }
}

/* ============================================================================
 *  教學戰專屬結算（config.tutorial.result）
 *  ---------------------------------------------------------------------------
 *  台詞：依「是否發動過搭檔主動技（生命歸還）」二選一 + outro 接續（同框逐字）。
 *  按鈕：改「回到主畫面」；按下先補 buttonLine（「期待你的表現。」）再回首頁。
 *  不進 S 迎擊/銭湯獎勵流程（教學戰不解鎖隱藏關）。
 * ========================================================================== */
/* 教學專屬結算頁。**沒有監察官、沒有等級**，只有戰績與 EXP，收尾彈拾得道具。
   ⚠ EXP 照樣用 `evaluate()` 算 —— 不評等級指的是「不顯示 S/A/B 那個大字」，
     不是「不算分」。等級之後要拿來解隱藏關，教學場不該污染那條線。
   ⚠ 掉落清單在 `config.tutorial.loot`，這裡不寫死。 */
function tutorialSettle(totalTime, stats, sessionMoney){
  state.sRankUnlocked = false;
  const ev = evaluate(stats);
  const tr = (GAME_CONFIG.tutorial && GAME_CONFIG.tutorial.result) || {};
  let rows = '<div class="grade-wrap grade-noRank">'
           + '<span class="grade-meta"><span class="grade-cap">' + (L.result.gradeCap||'') + '</span>'
           + '<span class="grade-exp">EXP ' + ev.exp + '</span></span></div>';
  rows += ratingStatsRows(stats, totalTime);
  showResultSequence(tr.title || L.result.winTitle, tr.sub || '', rows, 'tutorial', false,
                     { noInspector:true });
  const rbtn=$('rematchBtn');
  if(rbtn) rbtn.textContent = tr.buttonLabel || '回到主畫面';
  state.resultMode = 'tutorial-home';
  /* 拾得道具：**點畫面才跳出**（ver -361，Ray 指定；原本是 800ms 自動彈）。
     讓玩家先把戰績看完，想看下一頁再點 —— 與對話推進同一個手感。
     ⚠ 「回到主畫面」那顆鈕也會先彈道具（見 onRematchBtn）：不能讓玩家一按就走人，
       那樣掉落等於沒發生（道具其實已經入袋，但他不知道拿到什麼）。 */
  const loot=(GAME_CONFIG.tutorial||{}).loot || [];
  /* ⚠ 錢與 EXP 要**明著歸零**（ver -439）：上一場若沒被點開（玩家直接離場），
     那兩個模組變數還留著上一場的值 —— 教學這一頁不給錢也不給 EXP，
     不歸零的話會把別場的數字端上來。 */
  _lootMoney = 0; _lootExp = 0;
  _lootPending = loot.length ? loot : null;
  if(_lootPending){
    /* ⚠ 掛 `pointerup` 在捕獲階段：結算頁上有幾個 `pointer-events:none` 的層
       （對話框、立繪舞台），事件不一定冒泡到某個特定容器，掛 document 最穩。
       ⚠ `once:true` ＋ 旗標雙保險：連點兩下不會彈兩次。 */
    document.addEventListener('pointerup', popLootOnce, { capture:true, once:true });
  }
}
/* ══ 劇情插入戰的結算（ver -375）══
   Ray 的敵人標準卡上有「掉落物」與「金錢」兩欄 —— **掉落是固定的**（不擲骰），
   金錢是「HP 的 6~8 成隨機」。兩者都在敵人卡上，這裡只負責擲骰與呈現（鐵律 1）。
   ⚠ 沒有監察官、沒有等級：那一場是劇情中間插進來的一場架，不是驅逐任務。
   ⚠ 按鈕是「繼續」→ 回劇情/城鎮（不是回主畫面）。 */
function scriptSettle(totalTime, stats, sessionMoney){
  state.sRankUnlocked = false;
  const ev = evaluate(stats);
  const en = GAME_CONFIG.enemies[state.currentEnemyKey] || {};
  /* ══ 蕾娜的結算評價（ver -432，Ray 交稿）══════════════════════════════
     ⚠ **有人評 → 才有等第**：這一頁本來刻意不給等級（`grade-noRank`，教學那一套），
       但「評價」的意思就是評出一個等第 —— 沒有那個字母，她那句話就沒有著落。
     ⚠ 評分公式**用試玩版那一套**（Ray 指定）＝ 上面那個 `evaluate()`，不另訂。 */
  const spk = pickEvaluator(ev.grade, state.scriptBattleId);
  /* ══⚠⚠ **打靶不給 EXP 也不給錢**（ver -439，Ray：「靶不要給 exp 跟錢」）══════
     那是一場可以重打到膩的計時挑戰 —— 給獎勵等於開了一台印鈔機，而它的回報本來
     就是**紀錄**與**破紀錄的獎品**（`timeAttack.prize`，龍息），那兩樣照舊。
     ⚠ 判斷寫在**戰鬥卡**上（`noReward`），不是在這裡認 `range_trainee`（鐵律 1）——
       日後多一場練習用的場次只要在卡上加一欄。 */
  const bt = (GAME_CONFIG.battles||{})[state.scriptBattleId] || {};
  const noReward = !!bt.noReward;
  /* ══ 戰後評價 → 好感（ver -557，Ray 指定；規則在 prog.applyRankAffection 一支）══
     搭檔 S +1（索拉娜改 C 以下）、蕾娜每 4 次 S +1。
     ⚠ 打靶（noReward）不算：那是可以重打到膩的練習場，刷 S 刷好感等於印鈔機
       （同 EXP/金錢不給的理由）。 */
  if(!noReward) prog.applyRankAffection(ev.grade, state.pickedPartner);
  /* ══⚠⚠ EXP 與金錢**直接放在結算頁**（ver -453，Ray：「exp 跟 g 直接放結算頁，
     不要另外跳視窗顯示，有戰利品才跳」）══
     -439 曾把兩者搬去戰利品那一頁 —— 於是**每一場**打完都要多點一頁，
     而大多數場次根本沒有道具。現在：
       · EXP／金錢 ＝ 這裡兩列，**當場入帳**（錢在下面 `inv.addMoney`）
       · 戰利品視窗只在**真的有道具**時彈（見下方 `_lootPending`）
     ⚠ 金錢要在**這裡**入帳：以前是 `showLoot` 入的，視窗不彈就沒人入了。 */
  const en2loot = rollLoot(en);
  let money = 0;
  const mr = en.money && en.money.hpRatio;
  if(mr && !noReward){
    const lo=mr[0], hi=mr[1]!=null?mr[1]:mr[0];
    money = Math.round((en.hp||0) * (lo + Math.random()*(hi-lo)));
  }
  /* ⚠ 連續戰鬥中間幾格的錢在這裡一起入帳（ver -621）：那幾格不彈結算頁，
     帳記在 `state.sessionMoney`，由 `settle` 併出來傳進來（見那裡）。 */
  money += (sessionMoney|0);
  const exp = noReward ? 0 : (ev.exp|0);
  if(money) inv.addMoney(money);
  /* ⚠ 沒有評價者、又沒有等第可印時整塊就不要出 —— 一個只寫著「評價」兩個字的空行
       比沒有還糟（打靶就是這一種）。 */
  let rows = spk
    ? ('<div class="grade-wrap"><b class="grade-badge rank-'+ev.grade+'">'+ev.grade+'</b>'
       + '<span class="grade-meta"><span class="grade-cap">' + (L.result.gradeCap||'') + '</span>'
       + '</span></div>')
    : '';
  rows += ratingStatsRows(stats, totalTime);
  if(exp)   rows += '<div class="row"><span>EXP</span><b>＋'+exp+'</b></div>';
  if(money) rows += '<div class="row"><span>'+inv.moneyName()+'</span><b>＋'+money+'</b></div>';
  /* ══ 這一場自己的最佳紀錄（ver -377，Ray：「紀錄最佳紀錄，破紀錄時加上 New」）══
     ⚠ 只有卡上寫了 `record` 的場次才記（打靶場那種「一直挑戰」的）；
       一般的劇情插入戰打一次就過去了，記它沒有意義。
     ⚠ 紀錄的是**通關用時**（越短越好），與一般戰鬥的最佳總用時同一把尺。
     ⚠ `bt` 這一份卡在上面（`noReward` 那一段）就取好了，不再取第二次。 */
  /* ══ 破紀錄的獎品（ver -421，Ray：「30 秒內清完槍店的靶送你一支龍息」）══
     ⚠ 門檻與獎品都在戰鬥卡上（`timeAttack.prizeSec` / `prize`）—— 這裡只負責發，
       不寫死是哪一場、也不寫死是哪把槍（鐵律 1）。
     ⚠ **已經有了就不再給**：那是一把槍不是消耗品，重複拿沒有意義。
     ⚠ 走既有的「拾得」那一條（`_lootPending`）—— 入袋、彈窗、音效全部沿用（鐵律 8）。 */
  const ta = bt.timeAttack || {};
  let prize = null;
  if(ta.prize && ta.prizeSec>0 && totalTime < ta.prizeSec && !inv.hasWeapon(ta.prize)) prize = ta.prize;
  if(bt.record){
    const prev = loadBestTotal(bt.record);
    const isRec = (prev==null) || (totalTime < prev);
    if(isRec) saveBestTotal(totalTime, bt.record);
    rows += '<div class="row"><span>最佳紀錄</span><b>'
          + fmtTime(isRec ? totalTime : prev) + '</b></div>';
    if(isRec) rows += '<div class="record">'+L.result.newRecord+'</div>';
  }
  const sub = fmt(winSubOf(en), { name: displayName(en.name || '') });
  /* ⚠ 有評價者就把版面交給她（`speaker`）；沒有才是原本那一頁「沒有監察官」的結算。 */
  showResultSequence(L.result.winTitle, sub, rows, ev.grade, false,
                     spk ? { speaker:spk } : { noInspector:true });
  const rbtn=$('rematchBtn');
  if(rbtn) rbtn.textContent = '繼續';
  state.resultMode = 'script-continue';
  /* 掉落：卡上的 `loot`（在上面就擲好了 —— 金錢與 EXP 要先印上結算頁）。
     ⚠ **有道具才彈視窗**（ver -453，Ray 指定）：金錢與 EXP 已經在結算頁上、
       也已經入帳，這一頁只剩「你撿到了什麼東西」。
     ⚠ 與教學同一個手感：**點畫面才彈**，不自動蓋掉戰績。 */
  const loot = en2loot;
  if(prize){
    loot.push({ id:prize, n:1 });
    /* 「拿到獎品了」記一個旗標（ver -429）：城鎮那邊的一次性提示掛在它上面
       （取得「龍息」之後才教整備）。⚠ 旗標名**由武器 id 推**，不寫死是哪一把（鐵律 1）。 */
    prog.addFlags(['got_'+prize]);
  }
  /* ⚠ 獎品（龍息）**不受 `noReward` 影響**：它是這一場的目的，不是它的報酬。 */
  _lootMoney = 0; _lootExp = 0;         // 金錢與 EXP 不再走這一頁（見上面）
  _lootPending = loot.length ? loot : null;
  if(_lootPending){
    document.addEventListener('pointerup', popLootOnce, { capture:true, once:true });
  }
}
/* 結算副標：**依敵人卡的 `kind` 換用詞**（ver -423，Ray：「禍魘＝已淨化、人類＝已擊敗、
   船隻＝已擊沉」）。⚠ 只有這一支在決定（鐵律 7）—— 兩個結算路徑都問它。
   ⚠ 卡上沒寫 `kind`、或那一版語言沒有對照表，就退回原本那一句（舊怪不受影響）。 */
function winSubOf(en){
  const by = L.result.winSubBy;
  const k = en && en.kind;
  return (by && k && by[k]) ? by[k] : L.result.winSub;
}

/* 敵人顯示名：底線後是給作者辨識的，不顯示（同 enemy.displayEnemyName 的規約）。
   ⚠ 這裡不 import enemy（依賴方向：inspector 不在 enemy 之下），字串處理很短就地做。 */
function displayName(n){ return String(n||'').split('_')[0]; }

/* 掉落：卡上的 `loot`，**每一項各自擲骰**（ver -423，Ray：「可能都掉，可能都不掉」）。
   ⚠ `p` 沒寫＝必掉（舊卡不受影響）。⚠ 只有這一支在擲（鐵律 7）。 */
function rollLoot(en){
  return (en && en.loot ? en.loot : []).filter(r=>!(r.p>0) || Math.random()<r.p)
                                       .map(r=>({ id:r.id, n:r.n }));
}

/* 戰利品的待彈狀態（見 tutorialSettle、settle 的掉落段與 onRematchBtn）。
   ⚠ `_lootExp`（ver -439）：EXP 從結算頁那一行搬到這一頁，與金錢同一列 —— 見
     `modules/loot.js` 的 `showLoot`。 */
let _lootPending = null, _lootMoney = 0, _lootExp = 0;
function popLootOnce(){
  const list=_lootPending, money=_lootMoney, exp=_lootExp;
  _lootPending=null; _lootMoney=0; _lootExp=0;
  document.removeEventListener('pointerup', popLootOnce, { capture:true });
  if(list || money || exp) showLoot(list||[], afterLoot, money, { exp, title:'戰利品' });
}
/* ══⚠⚠ 「戰利品確認完點擊後就離開結算頁」（ver -439，Ray 指定）══════════════
   以前要按兩次：確認戰利品收掉視窗 → 再按一次「繼續」才走。但戰利品本來就是這一頁
   的最後一件事，看完就沒有別的可看了。
   ⚠ **只有劇情／城鎮那一場（`script-continue`）自動走**：
     · `rematch`（試玩版出陣）拿到 S 之後那一按是「迎擊」的岔路 —— 自動按下去會替
       玩家把那個選擇做掉。
     · `tutorial-home` 是教學收尾，「繼續」那一按交還玩家。
     兩者都留給玩家自己按。 */
function afterLoot(){
  if(state.resultMode==='script-continue') onRematchBtn();
}

/* applyTutorialResult（監察官兩段台詞版的教學結算）已於 ver -358 被 tutorialSettle
   取代（Ray：教學結算改成無監察官不評等級），死體於 ver -567 清死碼時移除。 */

/* ============================================================================
 *  Boss 戰 S 級獎勵演出：銭湯インストール
 *  ---------------------------------------------------------------------------
 *  全圖（2/3 框完整顯示）→ 左上白牆毛筆橫排兩行（config intruder.reward.sign，
 *  「銭湯」＋「INSTALL」，逐字由左往右「寫」出）→ 寫完ツケ板（拍子木）兩聲 → 顯示返回提示，
 *  點畫面任意處回首頁。演出中（done 前）點擊無效，避免誤觸跳過。
 * ========================================================================== */
let _sentouTimer=null, _sentouBannerTimer=null, _sentouBound=false, _sentouLeaving=false;
function openSentouReward(){
  const ov=$('sentouReward');
  if(!ov) return;
  const rw=(GAME_CONFIG.intruder && GAME_CONFIG.intruder.reward) || {};
  SFX.stopBgm(800);   // 靜場：墨與拍子木的留白
  const img=$('sentouImg');
  const src=asset(rw.image);
  if(img && src) img.src=src;
  // 建字：每行一個 .sentou-col、每字一個 <i>，動畫延遲逐字排 → 毛筆逐字寫出
  const sign=$('sentouSign');
  const per=rw.charMs || 380;
  let idx=0;
  sign.innerHTML='';
  (rw.sign || ['銭湯','インストール']).forEach(txt=>{
    const col=document.createElement('span'); col.className='sentou-col';
    [...txt].forEach(ch=>{
      const s=document.createElement('i'); s.textContent=ch;
      s.style.animationDelay=(600 + idx*per)+'ms';   // 進場淡入 0.6s 後起筆
      idx++;
      col.appendChild(s);
    });
    sign.appendChild(col);
  });
  if(!_sentouBound){
    _sentouBound=true;
    ov.addEventListener('click', ()=>{
      if(!ov.classList.contains('done') || _sentouLeaving) return;   // 寫完+響板前不可離開；防連點重入
      _sentouLeaving=true;
      api.goHome();   // 獎勵畫面續留原地，待 goHome 黑幕全蓋後（mid）才收——立即收會露出底下戰鬥畫面
    });
  }
  _sentouLeaving=false;
  ov.classList.remove('done');
  ov.classList.add('on');
  // 收結算畫面：待獎勵層淡入（sentouIn .8s）完全遮蓋後才收。
  // 立即收會在淡入期間透出底下凍結的戰鬥畫面（banner 之下即戰場）。
  clearTimeout(_sentouBannerTimer);
  _sentouBannerTimer=setTimeout(()=>{ $('banner').classList.remove('on'); }, 850);
  clearTimeout(_sentouTimer);
  _sentouTimer=setTimeout(()=>{
    SFX.tsuke();                // 寫完 → ツケ板兩聲（チョン、チョン）
    ov.classList.add('done');   // 響板起 → 顯示「點擊返回」
  }, 600 + idx*per + 420);
}

// 逐字打字機：total 毫秒內把整句顯示完
function typeInspectorLine(el, text, total){
  clearTimeout(_inspTypeTimer);
  const chars=[...text];
  const per = chars.length ? Math.max(30, total/chars.length) : 0;
  let i=0;
  el.textContent='';
  const tick=()=>{
    if(i<chars.length){
      el.innerHTML = decorateLine(chars.slice(0,i+1).join(''));   // 關鍵字（聖徒化）金色粗字
      i++;
      _inspTypeTimer=setTimeout(tick, per);
    }
  };
  tick();
}

/* ============================================================================
 *  結算按鈕：依 resultMode 分流
 *   'rematch'  ：一律回首頁（goHome）。唯一例外＝S 評價解鎖 → 芙蕾雅台詞 → 鈕變「迎擊」。
 *   'intercept'：迎擊 → 呼叫注入的 enemy.triggerIntruder（本輪 no-op，Boss 遭遇待第 5 步）。
 * ========================================================================== */
export function onRematchBtn(){
  const rbtn=$('rematchBtn');
  clearTimeout(_resultAutoTimer);   // 玩家有操作 → 取消自動回首頁
  if(state.resultMode==='tutorial-leaving') return;   // 教學結算離場中：防連點重入
  /* 戰敗那一頁（ver -430）：右邊那一顆＝「繼續」（船艦戰）或「再戰」（劇情場次）。
     ⚠ 兩者送出的動作不同、去處也不同，但離場的手續是同一份（見 leaveLose）。 */
  if(state.resultMode==='lose-continue'){ leaveLose('continue'); return; }
  if(state.resultMode==='lose-retry'){    leaveLose('retry');    return; }
  if(state.resultMode==='tutorial-home'){   // 教學戰結算：按鈕離場
    /* ⚠ 道具還沒彈過 → 這一按先彈道具，不離場（ver -361）。
       玩家一按就走的話，掉落等於沒發生 —— 東西雖然已經入袋，但他不知道拿到什麼。 */
    if(_lootPending){ popLootOnce(); return; }
    state.resultMode='tutorial-leaving';
    SFX.play(asset('sfx_start'), sfxGain('sfx_start'));
    /* ⚠ 監察官那兩句補話一起收掉（ver -358）：這一頁本來就沒有她（Ray 指定），
       留著「按鈕後補一句」等於讓一個不在場的人說話。 */
    const story = state.tutorialStoryRun;
    state.tutorialRun=false; state.tutorialStoryRun=false;
    /* 劇情叫起來的那一場 → **回劇情**（不是回首頁）。交還的實體由 main.js 注入。 */
    setTimeout(()=>{ if(story && api.storyReturn) api.storyReturn(); else api.goHome(); }, 260);
    return;
  }
  /* 劇情插入戰：「繼續」→ 先彈拾得（同教學），再把場子交還劇情/城鎮。 */
  if(state.resultMode==='script-continue'){
    if(_lootPending){ popLootOnce(); return; }
    state.resultMode='tutorial-leaving';        // 借用「離場中」防連點（同一個狀態機）
    SFX.play(asset('sfx_start'), sfxGain('sfx_start'));
    state.scriptRun=false; state.scriptBattleId=null;
    /* ⚠ 計時挑戰的「超時」要帶出去（ver -396）：對腳本而言它與「打輸了」是同一件事
       —— 接 `onLose` 那一支台詞。判定在 `combat.win()`，這裡只負責轉交。 */
    const over = !!state.timeOver;
    setTimeout(()=>{ if(api.storyReturn) api.storyReturn({ lost:over }); else api.goHome(); }, 260);
    return;
  }
  if(state.resultMode==='sentou-offer'){   // Boss S 級第一按：「再度執槍」原地變身（金色呼吸光）
    SFX.play(asset('sfx_startbt'), sfxGain('sfx_startbt'));   // 神楽鈴（StartBT_SE，與出陣鈕同）
    state.resultMode='sentou';
    const rw=(GAME_CONFIG.intruder && GAME_CONFIG.intruder.reward) || {};
    rbtn.textContent = rw.btnLabel || 'SAINT INSTALL...?';
    rbtn.classList.add('saintinstall');
    return;
  }
  if(state.resultMode==='sentou'){   // 第二按：SAINT INSTALL...? → 銭湯インストール獎勵畫面
    openSentouReward();
    return;
  }
  if(state.resultMode==='intercept'){
    SFX.gunshot();   // 迎擊：普攻槍聲（setShots 候選，同盤面射擊）
    api.triggerIntruder();
    return;
  }
  // resultMode==='rematch'（一般的再度執槍）：Start_01
  SFX.play(asset('sfx_start'), sfxGain('sfx_start'));
  if(!state.sRankUnlocked){
    api.goHome();               // 一律回首頁（含 Boss 戰勝/敗後）
    return;
  }
  // S 評價：解鎖迎擊流程（唯一例外）
  SFX.playBgm(asset('bgm_boss'), { volume: bgmVol('bgm_boss') });   // 按下再度執槍瞬間 → Boss BGM 起播（結算 BGM 淡出）
  state.intruderTriggered=true;  // 標記本場已進入隱藏流程
  // 用 visibility 而非 display：保留按鈕版位，避免 flex 重排讓立繪（flex:1 舞台）忽大忽小
  rbtn.style.visibility='hidden';
  const insp=getInspector();
  const bubble=$('inspectorBubble');
  const lineEl=$('inspectorLine');
  // 芙蕾雅重跳一次對話框：「慢著！有新的敵人！」
  bubble.classList.remove('show'); void bubble.offsetWidth;
  clearTimeout(_inspTypeTimer);
  lineEl.textContent='';
  bubble.classList.add('show');
  const warnLine = (insp && insp.interceptLine) || L.inspector.interceptLine;
  typeInspectorLine(lineEl, warnLine, 1400);
  // 台詞跳完 → 鈕變「迎擊」、變色發光
  const dur = 1400 + 300;
  setTimeout(()=>{
    state.resultMode='intercept';
    rbtn.textContent=L.result.intercept;
    rbtn.classList.add('intercept','ready');
    rbtn.style.visibility='';   // 復現（版位一直在，無重排 → 立繪不變大小）
  }, dur);
}
