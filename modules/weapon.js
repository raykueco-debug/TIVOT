/* ============================================================================
 *  modules/weapon.js — 武器（反擊武器反擊演算 + 雙槍破防窗口 + 換裝面板）
 *  ---------------------------------------------------------------------------
 *  命名框架（見本輪定案）：
 *    · 雙槍（普攻／主武器）＝ combat.tap 的正確點擊本身（基本盤面）。正確點擊累積「破防值」
 *      （state.energy / #energyClasp 計量表）。
 *    · 雙槍破防（獎勵射擊窗口）＝ 破防值滿後點計量表發動 → activateDual → 4 秒 dualWield
 *      快速清盤（hitDamage()×dmgDualMult，不吃暴擊／atkBuff）。
 *      ⚠ dualWield 這段是「破防射擊窗口」，不是另一把武器；主武器目前只有此一形態。
 *    · 反擊武器（副武器：mg / shotgun / sniper）＝ 三段防禦 Counter/Perfect 的反擊演算
 *      （weaponCounter），與雙槍破防各自獨立。換裝面板選的「副武器」即此。
 *
 *  未來擴充點（本輪不建、僅預留）：
 *    · 主武器 config 槽：目前主武器（雙槍）無獨立 config，參數維持 tuning 的
 *      dualSeconds / dmgDualMult。日後若要「可更換主武器（不影響性能、可能影響結算獎勵）」，
 *      再抽獨立 config 槽並定義獎勵語義。
 *    · 結算獎勵掛鉤：★TODO(future/main-weapon→result-bonus)★ 未來主武器的「結算獎勵係數」
 *      插在 inspector 結算算分處（乘在最終分數上）；本輪 inspector 未接、無第二把主武器，
 *      故只留此具名註解點，不寫係數。
 *    · 吸血/回血反擊（D3）：目前三把反擊武器都不回血。日後若加吸血反擊，回血一律走
 *      combat.healPlayer（統一改血 API，經注入），不得直接寫 state.playerHp（見 DECISIONS.md D3）。
 *
 *  狀態：dualWield / dualTimer / equippedWeapon 為 weapon 擁有（3.4）。反擊計數/傷害走
 *    state.addCounter()（3.6 跨擁有者計數例外）。energy 為 combat 擁有（3.1）：破防值歸零走
 *    注入的 resetEnergy。
 *
 *  依賴：import state / config / audio；對敵傷害、盤面/演出/敵計時等一律走 combat 注入的 api
 *    （enemyDamage / floatDmg / playCutin / resetEnemyTimers / scheduleUlt / markNext /
 *     buildGrid / resetEnergy），不 import combat/saint/defense（維持依賴方向）。
 * ========================================================================== */

import { GAME_CONFIG, asset, sfxGain, weaponDescText, weaponOf } from '../config.js';
import * as hap from './haptics.js';   // 震動（ver -398）
import { state, addCounter, setPickedPartner, storyMode } from '../state.js';
import { SFX } from '../audio.js';
import { L } from '../i18n.js';   // 多語言（cut-in 標題/選單鈕/暴擊前綴）
import * as inv from '../script/inventory.js';   // 武器持有（買來的才上得了卡疊，ver -377）
import * as load from '../script/loadout.js';    // 副武器的編成（整備頁排的順序與模式，ver -422）
import * as prog from '../script/progress.js';   // 副武器的改裝等級（ver -714；葉節點，無循環）

const $ = id => document.getElementById(id);
const WEAPONS = GAME_CONFIG.weapons;
const DUAL_SECONDS = GAME_CONFIG.tuning.dualSeconds;   // 雙槍破防窗口時長（秒）
const COUNTER_CRIT_RATE = GAME_CONFIG.tuning.counterCritRate;  // 反擊武器固定暴擊率（每 hit 獨立擲骰）
const COUNTER_CRIT_DMG  = GAME_CONFIG.tuning.counterCritDmg;   // 反擊武器暴擊加傷（+10%）
/* 反擊單發暴擊：回傳 { dmg, crit }。crit → 該發傷害 ×(1+加傷)。
   ⚠ 暴擊率**逐武器**（ver -377，Ray 的武器卡有這一欄）：卡上沒寫才回去用全域值。 */
function critRate(){
  const w = weaponOf(state.equippedWeapon, storyMode());
  return (w && w.critRate!=null) ? w.critRate : COUNTER_CRIT_RATE;
}
function critHit(base){
  const crit = Math.random() < critRate();
  const dmg = crit ? Math.max(1, Math.round(base*(1+COUNTER_CRIT_DMG))) : base;
  return { dmg, crit };
}

// combat 於啟動時注入所需回呼
let api = {};
export function init(a){ api = a; }

// 搭檔選擇：實選存 state.pickedPartner（partner.currentPartner 讀此值 → 換人即能力切換）。
// 寫入一律走 state.setPickedPartner（唯一管道）。

/* ============================================================================
 *  反擊武器 · 反擊演算（三段防禦 Counter／散彈 Perfect 呼叫）
 * ----------------------------------------------------------------------------
 *  依選配反擊武器造成多段/單發傷害，視覺依 w.vfx 呈現。一次反擊事件累計傷害後，
 *  透過 state.addCounter(總傷) 記一次（+1 次 +總傷；inspector 結算讀取）。
 *  ⚠ 未來若加吸血反擊，回血走 combat.healPlayer（D3），此處不碰 playerHp。
 * ========================================================================== */
/* ══ 「這一次反擊真的開火了」（ver -693 建、**ver -719 移走**）══
   ⚠⚠ 這一支現在是 no-op：**明晰之夢改成只有「完美反擊」（紅圈）才發動**
     （Ray：「明晰之夢要在完美反擊的狀況下才能發動，黃橘圈不會發動」）。
     -706 之後黃圈與橘圈也會呼叫 `weaponCounter`，掛在這裡就變成「隨便擋一下
     就發動」—— 而**只有 `defense` 知道這一次是哪一帶**，所以判定搬去那裡
     （`combat` 的 `onThreatResolved(grade)`，grade==='counter' 才通知，鐵律 7）。
   ⚠ 留著空殼是為了讓三個分支旁邊那一行不用刪 —— 日後若有「開火就觸發」的
     被動（不分帶），接回這裡就好。 */
function onCounterFired(){ /* 見上：判定已移到 defense 的判定等級 */ }
/* `hitRate`（ver -706，Ray：「機槍黃圈命中率只有 30%，擊發數不變，沒中的跳 miss，
   橘圈 70%，紅圈 100%。**但不論如何第一發一定不會 miss**」）。
   ⚠ 第一發保底不是體貼，是必要的：8 發 30% 全 miss 的機率有 5.7% ——
     那一次玩家會以為遊戲壞了，而不是「運氣不好」。
   ⚠ 命中率由**卡上的 `bands[帶].hit`** 決定，呼叫端只負責傳進來（鐵律 1＋7）。 */
export function weaponCounter(dmgScale, hitRate, dmgRoll){
  /* ⚠ 本篇與試玩版是**兩套數值**（ver -378）——一律走 `weaponOf`，不要直接查 WEAPONS。 */
  const w = weaponOf(state.equippedWeapon, storyMode());
  if(!w) return;
  /* 副武器的改裝加成（ver -714）：每階 +20%，上限＝卡上的 `maxMod`。
     ⚠ **折進 `scale`** —— 三種 vfx 分支各自算 `base`，在這裡乘一次就三條都吃到
       （鐵律 7：不要在每個分支各乘一遍）。
     ⚠ 只影響反擊：副武器只在反擊時開火，普攻是主武器的事。 */
  const WM     = GAME_CONFIG.tuning.weaponMod || {};
  /* ⚠ 第 5 階**不加數值**（換成特殊能力）—— 所以夾在 `statLv`（4）。 */
  const modLv  = Math.min(prog.weaponMod(state.equippedWeapon), WM.statLv || 99);
  const modMul = 1 + modLv * (WM.perLv || 0);
  const scale = ((dmgScale==null) ? 1 : dmgScale) * modMul;
  /* ══ 武器抗性（ver -760，Ray：「％數代表對該副武器產生的額外迴避率，但即使
     全 miss 也會清掉延時跟主動攻擊」）══ 卡上 `weaponResist`，id 優先於類別
     （同 weaponSound 慣例）。每一發的命中 ×(1−r)。
     ⚠ 「全 miss 也清延時／主動攻擊」不用另寫：紅點的收點在 resolveThreat、
       反擊硬直在 staggerOnCounter —— 兩者本來就不看打沒打中。
     ⚠ 有抗性時「第一發必中」與「hitR≥1 不擲骰」都不成立（不然單發武器吃不到抗性）。 */
  const _rz = state.enemyWeaponResist
    && (state.enemyWeaponResist[state.equippedWeapon]!=null
          ? state.enemyWeaponResist[state.equippedWeapon]
          : state.enemyWeaponResist[w.cat]);
  const resist = Math.max(0, Math.min(0.95, +_rz || 0));
  const hitR  = ((hitRate==null) ? 1 : Math.max(0, Math.min(1, hitRate))) * (1-resist);
  /* 第 k 發中不中。⚠ `k===0` 一定中（見上）—— **無抗性時**；有抗性一律擲。 */
  const hits = (k)=> (resist<=0 && (hitR>=1 || k===0)) ? true : (Math.random() < hitR);
  const MISS = (L.battle && L.battle.miss) || 'MISS';
  /* `dmgRoll`（ver -708）：這一發打幾點從清單裡等機率抽（散彈黃圈＝`[0,1]`）。
     ⚠ 抽到 0 **不是 miss** —— 照樣跳一個「0」出來（Ray：「不要全都 1 很沒感」）。
     ⚠ 0 不呼叫 `enemyDamage`：那一支會帶受擊特效與擊殺判定，打 0 不該驚動它。 */
  const roll = Array.isArray(dmgRoll) && dmgRoll.length ? dmgRoll : null;
  /* ⚠ `dmgRoll` 走 `scale` 之外的路（它是絕對值清單），所以改裝要在這裡自己乘。 */
  const rollOne = ()=> Math.round(roll[(Math.random()*roll.length)|0] * modMul);
  // 反擊武器 SE：反擊（Counter）與完美防禦（散彈 Perfect 反擊）都會出聲——散彈 blast 兩路徑皆觸發。
  //   機槍＝逐發播（搭搭搭搭搭連續感）、散彈＝一發、狙擊＝一發。散彈完防由此 SE 出聲，defense 端不再疊合成重擊。
  /* ⚠ 「這一場」可以覆寫武器音（ver -423，Ray：船艦戰的機槍／霰彈／步槍各換一支）——
     覆寫的是**場次**不是武器卡，同一把槍在陸戰還是原本的聲音。
     ⚠ 值可以是 `'se_key'` 或 `{key, times}`（`times`＝同一瞬間疊播幾聲，
       Ray：「霰彈槍換成 se_weapon_pistol_01 **同時播放 6 聲**」）。 */
  /* 這一場的武器音覆寫（船戰卡）：**id 優先、類別次之**（ver -504，Ray：「數值跟著
     玩家裝備的副武器，音效固定用船戰的」）—— 卡上照類別寫（重機槍/霰彈槍/萊福槍），
     換上任何一把同類的槍都吃得到艦載音；要給特定武器開例外才寫 id。 */
  const ov = state.weaponSound &&
             (state.weaponSound[state.equippedWeapon] || state.weaponSound[w.cat]);
  const soundKey = ov ? (ov.key || ov) : w.sound;
  const soundTimes = (ov && ov.times) ? ov.times : 1;
  /* 卡上 weaponSound 的 `once`（ver -503，Ray：「se_bulletpiece 跟船戰散射武器
     同時播放，但只播一次，不用隨 hit 數增加」）：這一次反擊開火的同一瞬間
     疊播一支 —— 不乘 times、不進每發的迴圈，三種 vfx 路徑都只在這裡響一次。 */
  if(ov && ov.once){ try{ SFX.play(asset(ov.once), sfxGain(ov.once)); }catch(_){} }
  /* `after`（ver -506，Ray：「發射瞬間播砲聲，0.2 秒後播彈殼，可重疊」）：
     開火之後延遲跟播一支，同樣整串只一次。SFX.play 每次都是新的 source，
     與還在響的砲聲自然重疊，不必特別處理。 */
  if(ov && ov.after && ov.after.key){
    setTimeout(()=>{ try{ SFX.play(asset(ov.after.key), sfxGain(ov.after.key)); }catch(_){} },
               ov.after.delayMs||0);
  }
  const se = asset(soundKey);
  const seGain = sfxGain(soundKey);   // 反擊層增益（全域響度階層見 tuning.sfxGain）
  /* 疊播：同一瞬間播 N 聲（音量分攤，否則 6 支疊起來會撞到 limiter）。 */
  const playSe = ()=>{ for(let i=0;i<soundTimes;i++)
    SFX.play(se, seGain * (soundTimes>1 ? 1/Math.sqrt(soundTimes) : 1)); };
  // 暴擊字樣：每 hit 各自 20% 擲骰，中則傷害 ×(1+加傷) 並在該發前綴紅字「暴擊」。

  if(w.vfx==='single'){
    // 狙擊：單發，跳一個較大的數字；暴擊則轉紅並前綴「暴擊」
    const base=Math.max(1, Math.round(w.hits*w.dmgPerHit*scale));
    playSe();                      // 狙擊：一發（無抗性時第一發必中；有抗性要擲）
    hap.shot();
    /* 武器抗性（ver -760）：單發武器被迴避＝這一發整個 MISS——開火照記
       （counterFired＝「開火了」），紅點的收點與硬直在 resolveThreat 那端不受影響。 */
    if(!hits(0)){
      api.floatDmg(MISS, '46%','32%', false, 'snipernum');
      addCounter(0); onCounterFired();
      flushPending();
      return;
    }
    const h=critHit(base);
    api.enemyDamage(h.dmg, true, true, 'counter');   // 靜默扣血（含 overkill/擊殺判定）
    addCounter(h.dmg); onCounterFired();
    api.floatDmg((h.crit?L.battle.crit:'')+h.dmg, '46%','32%', h.crit, 'snipernum');
    flushPending();                            // 單發：一瞬間就結束，排隊中的切換立刻生效
    return;
  }
  if(w.vfx==='burst'){
    // 散彈：所有彈丸同一瞬間、同一區塊齊發，各自獨立暴擊、各自跳出數字
    const base=Math.max(1, Math.round(w.dmgPerHit*scale));
    playSe();                      // 散彈：一次一發（完防/反擊皆觸發）
    hap.shot();
    const bx=40+Math.random()*20;
    let sum=0;
    for(let k=0;k<w.hits;k++){
      if(!hits(k)){ api.floatDmg(MISS, (bx-6+k*3)+'%', (34+(k%2)*6)+'%', false); continue; }
      if(roll){
        const n=rollOne(); sum+=n;
        if(n>0) api.enemyDamage(n, true, true, 'counter');
        api.floatDmg(String(n), (bx-6+k*3)+'%', (34+(k%2)*6)+'%', n>0);
        continue;
      }
      const h=critHit(base); sum+=h.dmg;
      api.enemyDamage(h.dmg, true, true, 'counter');
      api.floatDmg((h.crit?L.battle.crit:'')+h.dmg, (bx-6+k*3)+'%', (34+(k%2)*6)+'%', true);
    }
    addCounter(sum); onCounterFired();
    flushPending();                            // 齊發：同上，一瞬間結束
    return;
  }
  // 預設（重機槍等）：逐發跳出（每 90ms 一發），每發各自獨立暴擊
  const base=Math.max(1, Math.round(w.dmgPerHit*scale));
  /* 先擲定全彈（此期間 over 不會被觸發）→ 一次記總傷。
     ⚠ ver -706：命中與否也在**這裡**一起擲定 —— 逐發現擲的話，中途若被別的路徑
       打斷，已記的總傷與實際打出去的發數會對不起來。 */
  const rolls=[]; let sum=0;
  for(let k=0;k<w.hits;k++){
    if(!hits(k)){ rolls.push(null); continue; }
    if(roll){ const n=rollOne(); rolls.push({dmg:n, crit:false, zero:n<=0}); sum+=n; continue; }
    const h=critHit(base); rolls.push(h); sum+=h.dmg;
  }
  addCounter(sum); onCounterFired();
  /* 連射間隔：預設 90ms；場次可覆寫（ver -476，Ray：「船戰的速射砲連射速度
     調降50%」→ flight 船戰卡 counterGapMs:180）。同 weaponSound 的機制：
     覆寫的是**場次**不是武器卡。震動長度與 setTimeout 都讀這一個變數（鐵律 7）。 */
  const gap = state.counterGapMs || 90;
  /* ⚠ 機槍反擊：**一條連續的震動，長度＝整串的持續時間**（ver -398，Ray 指定）——
     不是每發各震一下：手機會把密集的短震合併成一串黏在一起的抖動，讀起來比一條長震還糊。
     長度＝(發數−1)×間隔 ＋ 最後一發的尾巴。 */
  hap.burst((w.hits-1)*gap + 60);
  /* ⚠⚠ **這一串期間不換槍**（ver -410）：`critRate()` 是每發現查 `state.equippedWeapon` 的，
     中途換掉的話後半串會用新槍的暴擊率 —— 同一次反擊變成兩把槍混出來的傷害。
     玩家照樣按得動那顆鈕，只是排隊（見 tapSwitch）。 */
  counterBusy = true;
  let i=0;
  const fire=()=>{
    if(state.over||i>=w.hits){ flushPending(); return; }
    const h=rolls[i];
    playSe();                      // 機槍：每 hit 播一次 → 搭搭搭搭搭（miss 也有槍聲，是打空不是沒開槍）
    if(h){
      if(!h.zero) api.enemyDamage(h.dmg, true, true, 'counter'); // 靜默扣血 → 由自訂 float 控制「暴擊」字樣
      api.floatDmg((h.crit?L.battle.crit:'')+h.dmg, (30+Math.random()*40)+'%','35%', !h.zero);
    }else{
      api.floatDmg(MISS, (30+Math.random()*40)+'%','35%', false);
    }
    i++;
    if(i<w.hits) setTimeout(fire, gap);
    else flushPending();                       // 打完最後一發 → 排隊中的切換生效
  };
  fire();
}

/* ============================================================================
 *  雙槍破防（獎勵射擊窗口）
 * ----------------------------------------------------------------------------
 *  ⚠ 這是主武器（雙槍/普攻）的「破防射擊窗口」，不是另一把武器。
 *    破防值（energy）滿後點 #energyClasp 發動 → cut-in → 4 秒 dualWield 快速清盤。
 *    期間點擊邏輯在 combat.tap 的 dualWield 分支（基本盤面）；此處只管發動與收尾。
 * ========================================================================== */
/* 破防語音的輪替旗標（ver -711）。⚠ **不要**放進 `reset()`：跨敵、跨場都要接著輪。 */
let dualVoFlip = false;
export function activateDual(){
  if(state.over||state.dualWield||state.saintMode||state.cutinPlaying||state.transitioning) return;
  if(state.enemyHp<=0) return;                 // overkill（敵已死）不可發動；雙槍中殺敵觸發 overkill 則照常（見 enterOverkillFx）
  if(state.energy<100) return;                 // 破防值未滿不能發動
  SFX.unlock(); SFX.ultCharge();
  /* 雙槍破防發動語音：試玩版＝Luna；本篇＝托爾斯坦專屬（ver -479，Ray 交檔
     vo_Torsten_DualCrush；-475 曾暫借馬季諾的高裝藥彈語音）。
     分流同 cut-in 圖（下面那行）：走 storyMode()（鐵律 8：唯一的判定）。 */
  /* ══⚠⚠ 本篇的破防語音**兩支交互**（ver -711，Ray：「vo_torsten_dualcrush2 跟
     vo_torsten_dualcrush 這兩個交互使用，不要連播兩次，跨敵也一樣」）══
     ⚠ 旗標是**模組級**的，`reset()` 與換敵都不動它 —— 「跨敵也一樣」的意思就是
       它不歸零；歸零的話連戰換一隻怪就可能連著聽到同一支。
     ⚠ 試玩版只有一支（露娜），不進這個輪替。 */
  const dualVo = storyMode() ? (dualVoFlip = !dualVoFlip, dualVoFlip ? 'vo_dual_torsten' : 'vo_dual_torsten2')
                             : 'se_luna_dual';
  SFX.playVoice(asset(dualVo), sfxGain(dualVo));
  api.resetEnergy();                           // 破防值歸零 + 刷新計量表（energy 為 combat 擁有）
  api.playCutin(()=>{
    if(state.over||state.saintMode) return;
    // cut-in 撤下瞬間 → 重置敵大絕與延時（間隔）懲罰倒數，避免發動瞬間被連段
    api.resetEnemyTimers();
    api.scheduleUlt();
    startDualWindow();
  }, L.cutins.dualBreak+'<span class="cutin-en">Bullets Rain</span>',   // ver -750，Ray：「Bullets Rain 彈雨傾洩」
     /* 破防 cut-in 分流（ver -454，Ray：「story 版的破防 CI 換成這一張
        CI_Torsten_Dualcrush」）：本篇＝托爾斯滕、試玩版照舊 Luna。
        ⚠ 走 `storyMode()`（＝scriptRun || tutorialStoryRun，唯一的判定，鐵律 8）。 */
     storyMode() ? 'cutin_dual_torsten' : 'cutin_saint');
}

// 進入破防射擊窗口（窗口本體）：activateDual 的 cut-in 撤下後呼叫；馬季諾「前線補給」
// 的 cut-in 撤下後也經注入直接進窗（不吃破防值、不另播雙槍 cut-in）。
// 聖徒化中不進（「聖徒化期間不能發動雙槍破防」原則的最後一道擋門）。
export function startDualWindow(){
  if(state.over||state.saintMode||state.dualWield||state.enemyHp<=0) return;   // overkill 中不開窗
  state.dualWield=true;
  $('grid').classList.add('dualwield');
  api.markNext();
  clearTimeout(state.dualTimer);
  // 教學：引導式雙槍破防不限時（清完盤才收窗）——玩家可邊讀提示邊打，不會窗口過期
  if(!state.tutorialActive) state.dualTimer=setTimeout(endDual, DUAL_SECONDS*1000);
}

// 窗口收尾（4 秒到期、清盤結束或敵死瞬間呼叫）：清旗標/計時器、移 class；
// 盤面點一半則重建、否則重標下一格。冪等（重複呼叫無害）。
// ⚠ 敵死（enemyHp<=0＝overkill 窗口）不重建也不標記——重建會在敵已清空時
//   憑空冒出一整盤新 overkill 盤面；殘盤保留原樣交給 overkill 免順序追打收尾。
export function endDual(){
  state.dualWield=false;
  clearTimeout(state.dualTimer); state.dualTimer=null;
  $('grid').classList.remove('dualwield');
  if(!state.over && !state.saintMode && state.enemyHp>0){
    const cells=state.cells;
    if(cells.some(c=>c.classList.contains('done')) && !cells.every(c=>c.classList.contains('done'))){
      api.buildGrid();     // 點了一半 → 重建整盤（回到普攻依序點）
    }else{
      api.markNext();      // 全新盤或已清完 → 重標下一格
    }
  }
}

/* ============================================================================
 *  戰鬥中的副武器切換（ver -410；-422 接上整備頁的編成）
 * ----------------------------------------------------------------------------
 *  血條右側一顆牌卡。**順序與模式都讀 `script/loadout.js`**（整備頁排的那一份）——
 *  這裡不再自己決定類別順序，也不自己記「每個類別拿哪一把」（鐵律 7：一個量一個來源）。
 *
 *  兩種模式（Ray 指定，整備頁下方那個開關）：
 *    `rotate`（預設）按一下換下一順位，一直輪下去。
 *    `fixed`  永遠從**一順位**開始；**連按 N 下切到第 N 順位**（350ms 內算連按），
 *             發射完（或吃了黃／橘圈）自動歸位一順位。
 *    ⚠ 「連按 N 下＝第 N 順位」是我依「快速按兩下二順位」推的一般化寫法，
 *      三順位就是連按三下。要改成別的手勢就改 `tapSlot()` 這一支。
 *
 *  ⚠⚠ **發射中可切換，但要等發動中的反擊結束才生效**（ver -410，Ray 指定）：
 *    `critRate()` 是每一發現查 `state.equippedWeapon` 的，重機槍那一串是 8 發 × 90ms ——
 *    中途換槍，後半串就用新槍的暴擊率，同一次反擊變成兩把槍混出來的傷害。
 *    所以按下去只寫進 `pendingWeapon`，`flushPending()` 才真的換。
 * ========================================================================== */
const WS_FLIP_MS = 340;      // 牌卡翻面時間。⚠ 與 style.css 的 `wsFlip` 同源，改一邊要改另一邊
const WS_TAP_MS  = 350;      // 連按的判定窗（固定模式）
let counterBusy = false;     // 反擊正在打（重機槍那一串）
let pendingWeapon = null;    // 排隊中的切換
let wsFlipT = 0;
let tapN = 0, tapAt = 0;     // 固定模式的連按計數

/* 現在這把槍在編成裡的第幾順位（1 起算；不在編成裡回 0）。 */
function slotNow(){
  const w=WEAPONS[state.equippedWeapon];
  if(!w) return 0;
  return load.activeCats().indexOf(w.cat) + 1;
}
/* 輪轉：下一順位。⚠ 只有一個類別有槍時回 null（沒得換，鈕就不出現）。 */
function nextWeaponKey(){
  const cs=load.activeCats();
  if(cs.length<2) return null;
  const i=slotNow();                       // 0（不在編成裡）→ 從第一順位開始
  return load.weaponAt(i>=cs.length ? 1 : i+1);
}
/* 真的換上去。⚠ 順手把「這個類別現在拿哪一把」記回編成 —— 試玩版的出擊整備
   也是改 `state.equippedWeapon`，記回去兩邊才不會各說各話。 */
function applyWeapon(key){
  if(!key || !WEAPONS[key]) return;
  state.equippedWeapon = key;
  const c=WEAPONS[key].cat; if(c) load.setPick(c, key);
  refreshLoadoutLabels();
}
/* 反擊打完（或中斷）→ 把排隊中的那一把換上去。 */
function flushPending(){
  counterBusy = false;
  if(!pendingWeapon) return;
  const key = pendingWeapon; pendingWeapon = null;
  applyWeapon(key);
  const b=$('wpSwitch'); if(b) b.classList.remove('pending');
}
/* 換上去（或排隊）。反擊中只排隊，卡面立刻翻成新的那一把（要有回饋）。 */
function useWeapon(key){
  if(!key || key===(pendingWeapon||state.equippedWeapon)) return false;
  const b=$('wpSwitch');
  if(counterBusy){
    pendingWeapon = key;
    if(b) b.classList.add('pending');
  }else applyWeapon(key);
  return true;
}
/* ⚠ **固定模式：一次防禦結束就歸位一順位**（Ray：「發射完畢後或發射失敗
   （點了黃橘圈）歸位一順位」）。由 `combat` 在三段防禦判完時呼叫（唯一的呼叫點）。
   ⚠ 走 `useWeapon` → 反擊還在打的話一樣排隊，不會打斷那一串。 */
export function onThreatResolved(){
  if(load.mode()!=='fixed') return;
  tapN = 0;
  const first=load.firstWeapon();
  if(first && useWeapon(first)){ flip(); setTimeout(renderSwitch, WS_FLIP_MS/2); }
}
/* 開一場新的戰鬥／回主選單時歸零 —— 排隊中的切換不可以跨場留著。 */
export function resetWeaponSwitch(){
  counterBusy=false; pendingWeapon=null; tapN=0; tapAt=0;
  const b=$('wpSwitch'); if(b) b.classList.remove('pending','flip');
  /* ⚠ 把現在這把記回編成：試玩版的出擊整備是直接改 `state.equippedWeapon` 的，
     不記回去的話整備頁與戰鬥裡會各說各話。 */
  const w=WEAPONS[state.equippedWeapon];
  if(w && w.cat) load.setPick(w.cat, state.equippedWeapon);
  /* 固定模式：**永遠從一順位開始**（Ray 指定）。輪轉模式沿用玩家帶進來的那一把。 */
  if(load.mode()==='fixed'){ const f=load.firstWeapon(); if(f) applyWeapon(f); }
  renderSwitch();
}

/* ══ 切換鈕的徽章（ver -549，Ray 交圖）══════════════════════════════════
   類別 → ASSETS 鑰匙在 config.weaponCatIcons（鐵律 1）；這裡只負責把圖掛上卡面。
   -481 的手繪 SVG 圖示（WS_ICONS）已退場。 */
/* 卡面：圓鈕＋類別圖示（ver -481；-465 的 Alpha 槍圖已退場 —— Ray 改要圖示）。
   ⚠ 只有一個類別有槍時整顆藏起來：一顆按了不會變的鈕比沒有還糟。
   ⚠ **試玩版教學戰不出現**：那一場的裝備是**鎖死的**（forceTutorialLoadout 強制換上
     機槍），教學正是在教機槍那一串反擊 —— 中途換槍會讓引導與手上的槍對不上。
     **story 帶起來的教學戰（tutorialStoryRun）要出現**（ver -465，Ray 指定）——
     本篇的裝備是玩家自己的編成，教學照講、槍隨玩家換。 */
function renderSwitch(){
  const b=$('wpSwitch'); if(!b) return;
  const key = pendingWeapon || state.equippedWeapon;
  const w = WEAPONS[key];
  const has = load.activeCats().length>1;
  const disp = (w && has && (!state.tutorialRun || state.tutorialStoryRun)) ? '' : 'none';
  if(b.style.display!==disp){
    b.style.display=disp;
    /* 鈕的顯示與否影響血條讓位量（combat.layoutClasp）——用 resize 通知它重量，
       不直接 import combat（會循環）。 */
    window.dispatchEvent(new Event('resize'));
  }
  if(!w) return;
  const card=$('wpSwitchCard');
  const ic=(GAME_CONFIG.weaponCatIcons||{})[w.cat] || 'switch_mg';
  if(card && card.dataset.icon!==ic){ card.dataset.icon=ic;
    card.innerHTML='<img src="'+asset(ic)+'" alt="" draggable="false">'; }
}

function flip(){
  const b=$('wpSwitch'); if(!b) return;
  b.classList.remove('flip'); void b.offsetWidth; b.classList.add('flip');
  clearTimeout(wsFlipT);
  wsFlipT = setTimeout(renderSwitch, WS_FLIP_MS/2);   // 翻到 90°（看不見卡面）才換內容
}

/* 按下去。⚠ **不擋**（Ray：「發射中可切換」）—— 反擊中只是排隊。 */
function tapSwitch(){
  const cs=load.activeCats();
  if(cs.length<2) return;
  let key;
  if(load.mode()==='fixed'){
    /* 連按 N 下 → 第 N 順位。⚠ 超過順位數就回到最後一個（`weaponAt` 自己夾）。 */
    const t=performance.now();
    tapN = (t - tapAt < WS_TAP_MS) ? tapN+1 : 1;
    tapAt = t;
    key = load.weaponAt(tapN);
  }else key = nextWeaponKey();
  if(!key) return;
  SFX.unlock();
  SFX.play(asset('sfx_start'), sfxGain('sfx_start'));   // se_ui_sortie（Ray 指定）
  flip();
  useWeapon(key);
  setTimeout(renderSwitch, WS_FLIP_MS/2);
}
export function bindWeaponSwitch(){
  const b=$('wpSwitch'); if(!b || b.__bound) return;
  b.__bound = true;
  b.addEventListener('pointerup', e=>{ e.stopPropagation(); e.preventDefault(); tapSwitch(); });
  renderSwitch();
}

/* ============================================================================
 *  換裝面板（首頁 loadout）
 * ----------------------------------------------------------------------------
 *  反擊武器（副武器）：選即換 state.equippedWeapon、立刻驅動三段防禦/反擊/視覺。
 *  搭檔：本輪顯示層（能開/列/選中標記/label 變）；「換人→能力切換」留擴充、partner.js 不動。
 * ========================================================================== */
export function refreshLoadoutLabels(){
  renderSwitch();                       // 戰鬥中的副武器卡也走這一支（同步點只有一個）
  const w=WEAPONS[state.equippedWeapon];
  const p=GAME_CONFIG.partners[state.pickedPartner];
  // 出擊整備頁卡片（名稱＋圖）：選定即同步——選擇畫面（z-60）關閉後整備頁（z-55）仍在下層
  const pn=$('prepPartnerName'), wn=$('prepWeaponName');
  if(pn) pn.textContent = p ? p.name : '—';
  if(wn) wn.textContent = w ? (w.shortName || w.name) : '—';   // 綽號（全名過長）
  const pi=$('prepPartnerImg'), wi=$('prepWeaponImg');
  if(pi && p){
    const src=asset(p.image)||''; if(pi.getAttribute('src')!==src) pi.src=src;
    // 取景（config siFit：單眼寬度基準的相對倍率，蕾妮=1）：頭頂對齊卡頂的上身特寫
    const fit=p.siFit||{};
    pi.style.setProperty('--prep-zoom', fit.zoom||1);
    pi.style.setProperty('--prep-top', ((fit.top||0)*100)+'%');
  }
  if(wi && w){ const src=asset(w.image)||''; if(wi.getAttribute('src')!==src) wi.src=src; }
}

/* ── 教學固定裝備：蕾妮＋機槍（config defaultPartner/defaultWeapon）──
 *  教學戰開場（combat.startGame 教學分支）強制換上；玩家原選擇暫存，
 *  回主選單（combat.goHome）還原。equippedWeapon/pickedPartner 皆本模組擁有（§3.4）。 */
let _tutLoadoutStash = null;
export function forceTutorialLoadout(){
  if(_tutLoadoutStash) return;   // 教學段內重開（陣亡該段重來）不重複暫存
  _tutLoadoutStash = { w: state.equippedWeapon, p: state.pickedPartner };
  state.equippedWeapon = GAME_CONFIG.defaultWeapon;      // 機槍（MG_Squall）
  setPickedPartner(GAME_CONFIG.defaultPartner);          // 蕾妮（renee）
  refreshLoadoutLabels();
}
export function restoreTutorialLoadout(){
  if(!_tutLoadoutStash) return;
  state.equippedWeapon = _tutLoadoutStash.w;
  setPickedPartner(_tutLoadoutStash.p);
  _tutLoadoutStash = null;
  refreshLoadoutLabels();
}

// 開啟選擇畫面：kind='weapon'（副武器 → 全螢幕卡疊，上下滑動）| 'partner'（搭檔 → 全螢幕卡疊，左右滑動）。
export function openPickSheet(kind){
  if(kind==='partner'){ openPartnerSheet(); return; }
  openWeaponSheet();
}

/* ── 卡疊佈局（選人/選武器共用）──
 * 依「與現選卡的相對距離」排前後：rel=0 在前置中；其餘依距離往後墊（axis='x' 側後方
 * 錯位＋微轉、'y' 上下錯位），變暗縮小、z-index 遞減——像一疊卡牌只抽當前這張到面前。
 * 抽換動畫：各卡 transform 有 CSS 過渡（.ps-frame/.ws-frame），配合 swingDeck 整疊擺轉。 */
function deckLayout(frames, index, axis){
  const n = frames.length;
  frames.forEach((f,i)=>{
    let rel=(i-index+n)%n; if(rel>n/2) rel-=n;   // 循環卡疊 → 取最短簽名距離（左右/上下對稱墊後）
    const d=Math.abs(rel);
    f.style.zIndex=String(20-d);
    f.classList.toggle('back', rel!==0);
    f.style.transform = axis==='x'
      ? `translate(${rel*30}px, ${-d*14}px) rotate(${rel*5}deg) scale(${1-d*.08})`
      : `translateY(${rel*26}px) rotate(${rel*-3}deg) scale(${1-d*.08})`;
  });
}

/* 輪轉動畫：抽換瞬間整疊往滑動方向小幅擺轉再回正（swing-a/swing-b 交替觸發 keyframe），
 * 疊上各卡自身的 transform 過渡 → 卡疊像轉盤轉了一格。 */
function swingDeck(deck, dir){
  if(!deck) return;
  deck.classList.remove('swing-a','swing-b');
  void deck.offsetWidth;   // 重觸發動畫
  deck.classList.add(dir>0 ? 'swing-a' : 'swing-b');
}

/* ============================================================================
 *  搭檔選人畫面（全螢幕）：大立繪左右滑動切換、卡片技能描述、底部發動說明
 * ----------------------------------------------------------------------------
 *  清單以 config partners 動態產生（新增搭檔自動出現）。選定（點展示中的卡 / 底部鈕）→
 *  setPickedPartner（唯一寫入管道）→ partner.currentPartner 即時切換能力。
 *  底部鈕兼返回：按下＝選定展示中的搭檔並關閉畫面（已出戰時顯示「返回」）。
 * ========================================================================== */
/* ⚠⚠ **這一頁是「挑戰」（試玩版）的出陣選人**，所以只列 `challengePartners`
   那幾位（ver -694，Ray：「挑戰的伙伴只留馬跟蕾妮可選」）——
   `partners` 現在也裝著本篇的搭檔（諾薇兒、安雅），那兩位是劇情給的。
   ⚠ 白名單裡的鑰匙查不到卡就跳過（打錯字不會讓整頁空掉）。
   ⚠ 沒寫 `challengePartners` 就退回「全部」—— 舊行為，不會突然變空。 */
const PARTNER_KEYS = (GAME_CONFIG.challengePartners || Object.keys(GAME_CONFIG.partners))
  .filter(k => GAME_CONFIG.partners[k]);
let psIndex = 0;          // 目前展示中的搭檔 index
let psBound = false;      // 手勢/按鈕只綁一次

export function openPartnerSheet(){
  psIndex = Math.max(0, PARTNER_KEYS.indexOf(state.pickedPartner));
  buildPartnerDeck();
  bindPartnerSheet();
  renderPartnerSheet();
  $('partnerSheet').classList.add('on');
}
export function closePartnerSheet(){ $('partnerSheet').classList.remove('on'); }

function psMove(dir){   // dir=+1 下一位 / -1 上一位（循環）
  psIndex = (psIndex + dir + PARTNER_KEYS.length) % PARTNER_KEYS.length;
  SFX.play(asset('se_pageflip'), sfxGain('se_pageflip'));   // 換卡翻頁音
  swingDeck($('psDeck'), dir);   // 輪轉動畫：整疊往滑動方向擺轉一下
  renderPartnerSheet();
}

// 實際選定第 index 位搭檔（點卡直選與底部鈕共用）：實際切換才播確認 SE（重選同一位不重播）。
function selectPartnerAt(index){
  const key = PARTNER_KEYS[index];
  if(key !== state.pickedPartner){
    const p = GAME_CONFIG.partners[key];
    const vo = asset(p && p.selectVoice);
    if(vo) SFX.playVoice(vo, sfxGain(p.selectVoice));
    setPickedPartner(key);   // 實選寫入（唯一管道）→ 能力即時切換
    refreshLoadoutLabels();
  }
  renderPartnerSheet();
}

// 卡疊建立（一次）：每位搭檔一張取景框卡。取景參數（config siFit：zoom＝相對框高的
// 放大倍率、top＝垂直偏移）於建卡時寫死在各自的 img——統一頭部大小（以蕾妮 zoom:1 為基準）。
function buildPartnerDeck(){
  const deck=$('psDeck');
  if(!deck || deck.childElementCount) return;
  PARTNER_KEYS.forEach(key=>{
    const p=GAME_CONFIG.partners[key], fit=p.siFit||{};
    const fr=document.createElement('div'); fr.className='ps-frame';
    const img=document.createElement('img'); img.className='ps-portrait';
    img.alt=p.name||key; img.draggable=false;
    img.src=asset(p.image)||'';
    img.style.setProperty('--ps-zoom', fit.zoom||1);
    img.style.setProperty('--ps-top', ((fit.top||0)*100)+'%');
    fr.appendChild(img); deck.appendChild(fr);
  });
}

function renderPartnerSheet(){
  const key = PARTNER_KEYS[psIndex];
  const p = GAME_CONFIG.partners[key];
  if(!p) return;
  const deck=$('psDeck');
  if(deck) deckLayout([...deck.children], psIndex, 'x');   // 現選抽到面前，其餘墊後
  const set=(id,txt)=>{ const el=$(id); if(el) el.textContent=txt; };
  set('psName', p.name || key);
  set('psActiveName',  p.active  ? p.active.name  : '—');
  set('psActiveDesc',  (p.active  && p.active.desc)  || '');
  set('psPassiveName', p.passive ? p.passive.name : '—');
  set('psPassiveDesc', (p.passive && p.passive.desc) || '');
  // 圓點指示：目前頁 + 已實選標記
  const dots=$('psDots');
  if(dots){
    dots.innerHTML = PARTNER_KEYS.map((k,i)=>
      `<i class="${i===psIndex?'cur':''}${k===state.pickedPartner?' picked':''}"></i>`).join('');
  }
  // 底部鈕（選擇兼返回）：展示中已是實選搭檔 → 顯示「返回」；否則「選擇此搭檔」（按下＝選定並返回）
  const btn=$('psSelect');
  if(btn){
    const isCur = key===state.pickedPartner;
    btn.textContent = isCur ? L.partners.back : L.partners.select;
    btn.classList.toggle('picked', isCur);
  }
}

function bindPartnerSheet(){
  if(psBound) return; psBound=true;
  // 立繪區：左右滑動換卡 + 點展示中的卡直選（touch + 滑鼠拖曳）
  const stage=$('psStage');
  if(stage){
    let sx=0, sy=0, tracking=false, swiped=false, moved=0, onBtn=false;
    const THRESH=48, TAP_SLOP=10;
    const begin=(x,y,target)=>{ sx=x; sy=y; moved=0; swiped=false; tracking=true;
      onBtn = !!(target && target.closest && target.closest('button')); };   // 起點在箭頭鈕上 → 抬手不當點卡
    const move=(x,y)=>{
      if(!tracking||swiped) return;
      moved=Math.max(moved, Math.hypot(x-sx, y-sy));
      const dx=x-sx, dy=y-sy;
      if(Math.abs(dx)>THRESH && Math.abs(dx)>Math.abs(dy)*1.2){
        swiped=true;
        psMove(dx<0 ? +1 : -1);   // 往左滑＝看下一位
      }
    };
    // 抬手：整段位移很小（點擊而非滑動）且落在卡疊範圍內 → 直選展示中的搭檔（含確認 SE）
    const end=(x,y)=>{
      const was=tracking; tracking=false;
      if(!was || swiped || onBtn || moved>TAP_SLOP) return;
      const r=$('psDeck').getBoundingClientRect();
      if(x>=r.left && x<=r.right && y>=r.top && y<=r.bottom){
        SFX.unlock();
        selectPartnerAt(psIndex);
      }
    };
    stage.addEventListener('touchstart',e=>{ const t=e.touches[0]; begin(t.clientX,t.clientY,e.target); },{passive:true});
    stage.addEventListener('touchmove', e=>{ const t=e.touches[0]; move(t.clientX,t.clientY); },{passive:true});
    stage.addEventListener('touchend', e=>{ const t=(e.changedTouches&&e.changedTouches[0])||{}; end(t.clientX,t.clientY); });
    let mDown=false;
    stage.addEventListener('mousedown',e=>{ mDown=true; begin(e.clientX,e.clientY,e.target); });
    stage.addEventListener('mousemove',e=>{ if(mDown) move(e.clientX,e.clientY); });
    window.addEventListener('mouseup', e=>{ if(mDown){ mDown=false; end(e.clientX,e.clientY); } });
  }
  // 左右箭頭 / 選擇兼返回
  const bind=(id,fn)=>{
    const el=$(id); if(!el) return;
    let h=false;
    el.addEventListener('touchstart',e=>{e.preventDefault();h=true;SFX.unlock();fn();},{passive:false});
    el.addEventListener('click',()=>{ if(h){h=false;return;} SFX.unlock(); fn(); });
  };
  bind('psPrev', ()=>psMove(-1));
  bind('psNext', ()=>psMove(+1));
  bind('psSelect', ()=>{
    SFX.menuClick();
    selectPartnerAt(psIndex);   // 展示中尚未實選 → 按下即選定（含確認 SE）
    closePartnerSheet();        // 選擇鈕兼返回：一律關閉畫面回主選單
  });
}

/* ============================================================================
 *  副武器選擇畫面（全螢幕）：橫式武器卡「上下滑動」切換、卡疊同選人、下方武器介紹
 * ----------------------------------------------------------------------------
 *  清單以 config weapons 動態產生（新增武器自動出現）。選定（點展示中的卡 / 底部鈕）→
 *  state.equippedWeapon（weapon 自有狀態 §3.4）選即換 + 播該武器擊發聲（config sound）。
 *  底部鈕兼返回：按下＝選定展示中的武器並關閉畫面（已裝備時顯示「返回」）。
 * ========================================================================== */
/* ⚠ **只列持有的**（ver -377）：買來的槍才會出現在出擊整備的卡疊上。
   ⚠ 每次開整備頁重算，不能存成模組常數 —— 玩家可能剛在槍店買了一把。 */
function weaponKeys(){
  const ks=inv.ownedWeapons();
  return ks.length ? ks : Object.keys(WEAPONS).slice(0,1);   // 保險：至少留一把，不讓整備頁變空
}
/* 這一次開整備頁是**本篇**還是試玩版的出陣（ver -421）。
   ⚠ 兩套數值（§6.5.3）：試玩版的出陣整備顯示 `weapons[key]` 本體，
     本篇（點吊墜開的那一頁）顯示 `story:{…}` 覆寫過的那一組。 */
let prepStory = false;
export function setPrepStory(v){ prepStory = !!v; }
let wsIndex = 0;          // 目前展示中的武器 index
let wsBound = false;      // 手勢/按鈕只綁一次

export function openWeaponSheet(){
  wsIndex = Math.max(0, weaponKeys().indexOf(state.equippedWeapon));
  buildWeaponDeck();
  bindWeaponSheet();
  renderWeaponSheet();
  $('weaponSheet').classList.add('on');
}
export function closeWeaponSheet(){ $('weaponSheet').classList.remove('on'); }

function wsMove(dir){   // dir=+1 下一把 / -1 上一把（循環；上滑＝看下一把）
  wsIndex = (wsIndex + dir + weaponKeys().length) % weaponKeys().length;
  // 換卡 stinger（Start_01，與出陣共用；已列第一梯關鍵預載 → 即切即響）
  SFX.play(asset('sfx_start'), sfxGain('sfx_start'));
  swingDeck($('wsDeck'), dir);   // 輪轉動畫：整疊往滑動方向擺轉一下
  renderWeaponSheet();
}

// 實際選定第 index 把武器（點卡直選與底部鈕共用）：實際切換才播擊發聲（重選同一把不重播）。
function selectWeaponAt(index){
  const key = weaponKeys()[index];
  if(key !== state.equippedWeapon){
    state.equippedWeapon = key;       // 反擊武器選即換、立即驅動戰鬥（三段防禦/反擊/視覺）
    const se = asset(WEAPONS[key].sound); if(se) SFX.play(se, sfxGain(WEAPONS[key].sound));   // 對應武器擊發聲
    refreshLoadoutLabels();
  }
  renderWeaponSheet();
}

// 卡疊建立（一次）：每把武器一張橫式卡（圖 contain 置中）。
function buildWeaponDeck(){
  const deck=$('wsDeck');
  if(!deck) return;
  /* ⚠ **持有的槍變了就重建**（ver -377）：原本是「已經有東西就不重建」，
     於是在槍店買了一把回來，卡疊還是舊的那幾張。用一個鑰匙字串當指紋比對。 */
  const sig=weaponKeys().join(',');
  if(deck.childElementCount && deck.dataset.sig===sig) return;
  deck.innerHTML=''; deck.dataset.sig=sig;
  weaponKeys().forEach(key=>{
    const w=WEAPONS[key];
    const fr=document.createElement('div'); fr.className='ws-frame';
    const img=document.createElement('img');
    img.alt=w.name||key; img.draggable=false;
    img.src=asset(w.image)||'';
    fr.appendChild(img); deck.appendChild(fr);
  });
}

function renderWeaponSheet(){
  const key = weaponKeys()[wsIndex];
  const w = WEAPONS[key];
  if(!w) return;
  const deck=$('wsDeck');
  if(deck) deckLayout([...deck.children], wsIndex, 'y');   // 現選抽到面前，其餘往上下墊後
  const set=(id,txt)=>{ const el=$(id); if(el) el.textContent=txt; };
  set('wsName', w.name || key);
  /* ⚠ 規格文字是**算出來的**（ver -377，見 config.weaponDescText）——
     不要改回手寫，數值一動文案就會對不上（鐵律 7）。 */
  /* ⚠ 顯示哪一組數值看**這一次是從哪裡開的**（ver -421）：試玩版的出陣整備走本體，
     本篇（點吊墜開的整備頁）走 `story:{…}` 覆寫（§6.5.3）。 */
  set('wsDesc', weaponDescText(key, prepStory));
  set('wsStats', '');   // 規格已整合進 desc（反擊效果/減傷/暴擊率 多行文案），不再另列
  const dots=$('wsDots');
  if(dots){
    dots.innerHTML = weaponKeys().map((k,i)=>
      `<i class="${i===wsIndex?'cur':''}${k===state.equippedWeapon?' picked':''}"></i>`).join('');
  }
  // 底部鈕（選擇兼返回）：展示中已是裝備武器 → 顯示「返回」；否則「選擇此武器」（按下＝選定並返回）
  const btn=$('wsSelect');
  if(btn){
    const isCur = key===state.equippedWeapon;
    btn.textContent = isCur ? L.weapons.back : L.weapons.select;
    btn.classList.toggle('picked', isCur);
  }
}

function bindWeaponSheet(){
  if(wsBound) return; wsBound=true;
  // 武器卡區：上下滑動換卡（上滑＝看下一把，同直式清單直覺）+ 點展示中的卡直選（touch + 滑鼠拖曳）
  const stage=$('wsStage');
  if(stage){
    let sx=0, sy=0, tracking=false, swiped=false, moved=0, onBtn=false;
    const THRESH=48, TAP_SLOP=10;
    const begin=(x,y,target)=>{ sx=x; sy=y; moved=0; swiped=false; tracking=true;
      onBtn = !!(target && target.closest && target.closest('button')); };   // 起點在箭頭鈕上 → 抬手不當點卡
    const move=(x,y)=>{
      if(!tracking||swiped) return;
      moved=Math.max(moved, Math.hypot(x-sx, y-sy));
      const dx=x-sx, dy=y-sy;
      if(Math.abs(dy)>THRESH && Math.abs(dy)>Math.abs(dx)*1.2){
        swiped=true;
        wsMove(dy<0 ? +1 : -1);   // 往上滑＝看下一把
      }
    };
    // 抬手：整段位移很小（點擊而非滑動）且落在卡疊範圍內 → 直選展示中的武器（含擊發聲）
    const end=(x,y)=>{
      const was=tracking; tracking=false;
      if(!was || swiped || onBtn || moved>TAP_SLOP) return;
      const r=$('wsDeck').getBoundingClientRect();
      if(x>=r.left && x<=r.right && y>=r.top && y<=r.bottom){
        SFX.unlock();
        selectWeaponAt(wsIndex);
      }
    };
    stage.addEventListener('touchstart',e=>{ const t=e.touches[0]; begin(t.clientX,t.clientY,e.target); },{passive:true});
    stage.addEventListener('touchmove', e=>{ const t=e.touches[0]; move(t.clientX,t.clientY); },{passive:true});
    stage.addEventListener('touchend', e=>{ const t=(e.changedTouches&&e.changedTouches[0])||{}; end(t.clientX,t.clientY); });
    let mDown=false;
    stage.addEventListener('mousedown',e=>{ mDown=true; begin(e.clientX,e.clientY,e.target); });
    stage.addEventListener('mousemove',e=>{ if(mDown) move(e.clientX,e.clientY); });
    window.addEventListener('mouseup', e=>{ if(mDown){ mDown=false; end(e.clientX,e.clientY); } });
  }
  // 上下箭頭 / 選擇兼返回
  const bind=(id,fn)=>{
    const el=$(id); if(!el) return;
    let h=false;
    el.addEventListener('touchstart',e=>{e.preventDefault();h=true;SFX.unlock();fn();},{passive:false});
    el.addEventListener('click',()=>{ if(h){h=false;return;} SFX.unlock(); fn(); });
  };
  bind('wsUp',   ()=>wsMove(-1));
  bind('wsDown', ()=>wsMove(+1));
  bind('wsSelect', ()=>{
    SFX.menuClick();
    selectWeaponAt(wsIndex);   // 展示中尚未裝備 → 按下即選定（含擊發聲）
    closeWeaponSheet();        // 選擇鈕兼返回：一律關閉畫面回主選單
  });
}

/* ============================================================================
 *  生命週期（combat 調度）
 * ========================================================================== */
// 全重置（combat.startGame 調度）：清雙槍破防旗標/計時器 + #grid dualwield class（防跨場殘留）。
export function reset(){
  clearTimeout(state.dualTimer); state.dualTimer=null;
  state.dualWield=false;
  $('grid').classList.remove('dualwield');
}
// 停計時器（combat.stopAll 調度）：清 dualTimer。
export function stopTimers(){
  clearTimeout(state.dualTimer); state.dualTimer=null;
}
