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

import { GAME_CONFIG, asset } from '../config.js';
import { state, addCounter } from '../state.js';
import { SFX } from '../audio.js';

const $ = id => document.getElementById(id);
const WEAPONS = GAME_CONFIG.weapons;
const DUAL_SECONDS = GAME_CONFIG.tuning.dualSeconds;   // 雙槍破防窗口時長（秒）
const COUNTER_CRIT_RATE = GAME_CONFIG.tuning.counterCritRate;  // 反擊武器固定暴擊率（每 hit 獨立擲骰）
const COUNTER_CRIT_DMG  = GAME_CONFIG.tuning.counterCritDmg;   // 反擊武器暴擊加傷（+10%）
// 反擊單發暴擊：回傳 { dmg, crit }。crit → 該發傷害 ×(1+加傷)。
function critHit(base){
  const crit = Math.random() < COUNTER_CRIT_RATE;
  const dmg = crit ? Math.max(1, Math.round(base*(1+COUNTER_CRIT_DMG))) : base;
  return { dmg, crit };
}

// combat 於啟動時注入所需回呼
let api = {};
export function init(a){ api = a; }

// 搭檔選擇（本輪顯示層：選中標記／label；「換人→能力切換」留擴充，partner.js 不動）。
// 預設為 config defaultPartner；currentPartner 的實際技能歸屬仍讀 partner 模組（未受此影響）。
let pickedPartner = GAME_CONFIG.defaultPartner;

/* ============================================================================
 *  反擊武器 · 反擊演算（三段防禦 Counter／散彈 Perfect 呼叫）
 * ----------------------------------------------------------------------------
 *  依選配反擊武器造成多段/單發傷害，視覺依 w.vfx 呈現。一次反擊事件累計傷害後，
 *  透過 state.addCounter(總傷) 記一次（+1 次 +總傷；inspector 結算讀取）。
 *  ⚠ 未來若加吸血反擊，回血走 combat.healPlayer（D3），此處不碰 playerHp。
 * ========================================================================== */
export function weaponCounter(dmgScale){
  const w = WEAPONS[state.equippedWeapon];
  if(!w) return;
  const scale = (dmgScale==null) ? 1 : dmgScale;
  // 反擊武器 SE：反擊（Counter）與完美防禦（散彈 Perfect 反擊）都會出聲——散彈 blast 兩路徑皆觸發。
  //   機槍＝逐發播（搭搭搭搭搭連續感）、散彈＝一發、狙擊＝一發。散彈完防由此 SE 出聲，defense 端不再疊合成重擊。
  const se = asset(w.sound);
  // 暴擊字樣：每 hit 各自 20% 擲骰，中則傷害 ×(1+加傷) 並在該發前綴紅字「暴擊」。

  if(w.vfx==='single'){
    // 狙擊：單發，跳一個較大的數字；暴擊則轉紅並前綴「暴擊」
    const base=Math.max(1, Math.round(w.hits*w.dmgPerHit*scale));
    const h=critHit(base);
    SFX.play(se);                              // 狙擊：一發
    api.enemyDamage(h.dmg, true, true);       // 靜默扣血（含 overkill/擊殺判定）
    addCounter(h.dmg);
    api.floatDmg((h.crit?'暴擊 ':'')+h.dmg, '46%','32%', h.crit, 'snipernum');
    return;
  }
  if(w.vfx==='burst'){
    // 散彈：所有彈丸同一瞬間、同一區塊齊發，各自獨立暴擊、各自跳出數字
    const base=Math.max(1, Math.round(w.dmgPerHit*scale));
    SFX.play(se);                              // 散彈：一次一發（完防/反擊皆觸發）
    const bx=40+Math.random()*20;
    let sum=0;
    for(let k=0;k<w.hits;k++){
      const h=critHit(base); sum+=h.dmg;
      api.enemyDamage(h.dmg, true, true);
      api.floatDmg((h.crit?'暴擊 ':'')+h.dmg, (bx-6+k*3)+'%', (34+(k%2)*6)+'%', true);
    }
    addCounter(sum);
    return;
  }
  // 預設（重機槍等）：逐發跳出（每 90ms 一發），每發各自獨立暴擊
  const base=Math.max(1, Math.round(w.dmgPerHit*scale));
  const rolls=[]; let sum=0;                   // 先擲定全彈（全彈必中，此期間 over 不會被觸發）→ 一次記總傷
  for(let k=0;k<w.hits;k++){ const h=critHit(base); rolls.push(h); sum+=h.dmg; }
  addCounter(sum);
  let i=0;
  const fire=()=>{
    if(state.over||i>=w.hits) return;
    const h=rolls[i];
    SFX.play(se);                              // 機槍：每 hit 播一次 → 搭搭搭搭搭
    api.enemyDamage(h.dmg, true, true);        // 靜默扣血 → 由自訂 float 控制「暴擊」字樣（僅暴擊發才顯示）
    api.floatDmg((h.crit?'暴擊 ':'')+h.dmg, (30+Math.random()*40)+'%','35%', true);
    i++;
    if(i<w.hits) setTimeout(fire, 90);
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
export function activateDual(){
  if(state.over||state.dualWield||state.saintMode||state.cutinPlaying||state.transitioning) return;
  if(state.energy<100) return;                 // 破防值未滿不能發動
  SFX.unlock(); SFX.ultCharge();
  SFX.play(asset('se_luna_dual'));             // 雙槍破防發動 SE（Luna）
  api.resetEnergy();                           // 破防值歸零 + 刷新計量表（energy 為 combat 擁有）
  api.playCutin(()=>{
    if(state.over||state.saintMode) return;
    // cut-in 撤下瞬間 → 重置敵大絕與延時（間隔）懲罰倒數，避免發動瞬間被連段
    api.resetEnemyTimers();
    api.scheduleUlt();
    state.dualWield=true;
    $('grid').classList.add('dualwield');
    api.markNext();
    clearTimeout(state.dualTimer);
    state.dualTimer=setTimeout(endDual, DUAL_SECONDS*1000);
  }, '破防・雙槍<span class="cutin-en">Guard Crushing</span>', 'cutin_saint');
}

// 窗口收尾（4 秒到期或清盤結束呼叫）：清旗標/計時器、移 class；盤面點一半則重建、否則重標下一格。
export function endDual(){
  state.dualWield=false;
  clearTimeout(state.dualTimer); state.dualTimer=null;
  $('grid').classList.remove('dualwield');
  if(!state.over && !state.saintMode){
    const cells=state.cells;
    if(cells.some(c=>c.classList.contains('done')) && !cells.every(c=>c.classList.contains('done'))){
      api.buildGrid();     // 點了一半 → 重建整盤（回到普攻依序點）
    }else{
      api.markNext();      // 全新盤或已清完 → 重標下一格
    }
  }
}

/* ============================================================================
 *  換裝面板（首頁 loadout）
 * ----------------------------------------------------------------------------
 *  反擊武器（副武器）：選即換 state.equippedWeapon、立刻驅動三段防禦/反擊/視覺。
 *  搭檔：本輪顯示層（能開/列/選中標記/label 變）；「換人→能力切換」留擴充、partner.js 不動。
 * ========================================================================== */
export function refreshLoadoutLabels(){
  const w=WEAPONS[state.equippedWeapon];
  const p=GAME_CONFIG.partners[pickedPartner];
  const wv=$('pickWeaponValue'), pv=$('pickPartnerValue');
  if(wv) wv.textContent = w ? w.name : '—';
  if(pv) pv.textContent = p ? p.name : '—';
}

// 開啟選擇彈層：kind='weapon'（反擊武器）| 'partner'（搭檔）。清單以 config 動態產生（多筆自動出現）。
export function openPickSheet(kind){
  const isWeapon = kind==='weapon';
  const map = isWeapon ? WEAPONS : GAME_CONFIG.partners;
  const cur = isWeapon ? state.equippedWeapon : pickedPartner;
  $('pickSheetTitle').textContent = isWeapon ? '選擇副武器' : '選擇搭檔';
  const list=$('pickSheetList'); list.innerHTML='';
  Object.keys(map).forEach(key=>{
    const it=map[key];
    const div=document.createElement('div');
    div.className='pick-item'+(key===cur?' selected':'');
    const sub = isWeapon
      ? `反擊勝率 ${Math.round((it.counterWin||0)*100)}% · ${it.hits||0}發×${it.dmgPerHit||0}`
      : (it.perk||'');
    // 副武器縮圖（讀 config image 鑰匙 → ASSETS；無圖則不顯示，版面自適應）
    const imgSrc = (isWeapon && it.image) ? asset(it.image) : '';
    const thumb = imgSrc ? `<img class="pi-thumb" src="${imgSrc}" alt="">` : '';
    div.innerHTML = `${thumb}<span class="pi-body">${it.name||key}${sub?`<span class="pi-sub">${sub}</span>`:''}</span>`;
    const choose=()=>{
      SFX.unlock(); SFX.menuClick();
      if(isWeapon){
        state.equippedWeapon=key;   // 反擊武器選即換、立即驅動戰鬥（三段防禦/反擊/視覺）
      }else{
        pickedPartner=key;          // 搭檔：本輪僅顯示層（選中標記/label）；換技留擴充，不動 partner.js
      }
      refreshLoadoutLabels();
      closePickSheet();
    };
    div.addEventListener('click',choose);
    div.addEventListener('touchstart',e=>{e.preventDefault();choose();},{passive:false});
    list.appendChild(div);
  });
  $('pickSheet').classList.add('on');
}
export function closePickSheet(){ $('pickSheet').classList.remove('on'); }

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
