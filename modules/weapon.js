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

import { GAME_CONFIG, asset, sfxGain } from '../config.js';
import { state, addCounter, setPickedPartner } from '../state.js';
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

// 搭檔選擇：實選存 state.pickedPartner（partner.currentPartner 讀此值 → 換人即能力切換）。
// 寫入一律走 state.setPickedPartner（唯一管道）。

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
  const seGain = sfxGain(w.sound);   // 反擊層增益（全域響度階層見 tuning.sfxGain）
  // 暴擊字樣：每 hit 各自 20% 擲骰，中則傷害 ×(1+加傷) 並在該發前綴紅字「暴擊」。

  if(w.vfx==='single'){
    // 狙擊：單發，跳一個較大的數字；暴擊則轉紅並前綴「暴擊」
    const base=Math.max(1, Math.round(w.hits*w.dmgPerHit*scale));
    const h=critHit(base);
    SFX.play(se, seGain);                      // 狙擊：一發
    api.enemyDamage(h.dmg, true, true);       // 靜默扣血（含 overkill/擊殺判定）
    addCounter(h.dmg);
    api.floatDmg((h.crit?'暴擊 ':'')+h.dmg, '46%','32%', h.crit, 'snipernum');
    return;
  }
  if(w.vfx==='burst'){
    // 散彈：所有彈丸同一瞬間、同一區塊齊發，各自獨立暴擊、各自跳出數字
    const base=Math.max(1, Math.round(w.dmgPerHit*scale));
    SFX.play(se, seGain);                      // 散彈：一次一發（完防/反擊皆觸發）
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
    SFX.play(se, seGain);                      // 機槍：每 hit 播一次 → 搭搭搭搭搭
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
  SFX.play(asset('se_luna_dual'), (GAME_CONFIG.tuning.partnerSeGain||{}).se_luna_dual);   // 雙槍破防發動 SE（Luna；母帶小聲→增幅）
  api.resetEnergy();                           // 破防值歸零 + 刷新計量表（energy 為 combat 擁有）
  api.playCutin(()=>{
    if(state.over||state.saintMode) return;
    // cut-in 撤下瞬間 → 重置敵大絕與延時（間隔）懲罰倒數，避免發動瞬間被連段
    api.resetEnemyTimers();
    api.scheduleUlt();
    startDualWindow();
  }, '破防・雙槍<span class="cutin-en">Guard Crushing</span>', 'cutin_saint');
}

// 進入破防射擊窗口（窗口本體）：activateDual 的 cut-in 撤下後呼叫；馬季諾「前線補給」
// 的 cut-in 撤下後也經注入直接進窗（不吃破防值、不另播雙槍 cut-in）。
// 聖徒化中不進（「聖徒化期間不能發動雙槍破防」原則的最後一道擋門）。
export function startDualWindow(){
  if(state.over||state.saintMode||state.dualWield) return;
  state.dualWield=true;
  $('grid').classList.add('dualwield');
  api.markNext();
  clearTimeout(state.dualTimer);
  state.dualTimer=setTimeout(endDual, DUAL_SECONDS*1000);
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
  const p=GAME_CONFIG.partners[state.pickedPartner];
  const wv=$('pickWeaponValue'), pv=$('pickPartnerValue');
  if(wv) wv.textContent = w ? w.name : '—';
  if(pv) pv.textContent = p ? p.name : '—';
}

// 開啟選擇畫面：kind='weapon'（副武器 → 全螢幕卡疊，上下滑動）| 'partner'（搭檔 → 全螢幕卡疊，左右滑動）。
export function openPickSheet(kind){
  if(kind==='partner'){ openPartnerSheet(); return; }
  openWeaponSheet();
}

/* ── 卡疊佈局（選人/選武器共用）──
 * 依「與現選卡的相對距離」排前後：rel=0 在前置中；其餘依距離往後墊（axis='x' 側後方
 * 錯位＋微轉、'y' 上下錯位），變暗縮小、z-index 遞減——像一疊卡牌只抽當前這張到面前。 */
function deckLayout(frames, index, axis){
  const n = frames.length;
  frames.forEach((f,i)=>{
    let rel=(i-index+n)%n; if(rel>n/2) rel-=n;   // 循環卡疊 → 取最短簽名距離（左右/上下對稱墊後）
    const d=Math.abs(rel);
    f.style.zIndex=String(20-d);
    f.classList.toggle('back', rel!==0);
    f.style.transform = axis==='x'
      ? `translate(${rel*20}px, ${-d*12}px) rotate(${rel*3}deg) scale(${1-d*.07})`
      : `translateY(${rel*22}px) rotate(${rel*-2}deg) scale(${1-d*.08})`;
  });
}

/* ============================================================================
 *  搭檔選人畫面（全螢幕）：大立繪左右滑動切換、卡片技能描述、底部發動說明
 * ----------------------------------------------------------------------------
 *  清單以 config partners 動態產生（新增搭檔自動出現）。「選擇此搭檔」→
 *  setPickedPartner（唯一寫入管道）→ partner.currentPartner 即時切換能力。
 * ========================================================================== */
const PARTNER_KEYS = Object.keys(GAME_CONFIG.partners);
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
  SFX.menuClick();
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
  // 選擇鈕：展示中若已是實選搭檔 → 顯示「出戰中」
  const btn=$('psSelect');
  if(btn){
    const isCur = key===state.pickedPartner;
    btn.textContent = isCur ? '出戰中' : '選擇此搭檔';
    btn.classList.toggle('picked', isCur);
  }
}

function bindPartnerSheet(){
  if(psBound) return; psBound=true;
  // 立繪區左右滑動（touch + 滑鼠拖曳）
  const stage=$('psStage');
  if(stage){
    let sx=0, sy=0, tracking=false;
    const THRESH=48;
    const begin=(x,y)=>{ sx=x; sy=y; tracking=true; };
    const move=(x,y)=>{
      if(!tracking) return;
      const dx=x-sx, dy=y-sy;
      if(Math.abs(dx)>THRESH && Math.abs(dx)>Math.abs(dy)*1.2){
        tracking=false;
        psMove(dx<0 ? +1 : -1);   // 往左滑＝看下一位
      }
    };
    stage.addEventListener('touchstart',e=>{ const t=e.touches[0]; begin(t.clientX,t.clientY); },{passive:true});
    stage.addEventListener('touchmove', e=>{ const t=e.touches[0]; move(t.clientX,t.clientY); },{passive:true});
    stage.addEventListener('touchend', ()=>{ tracking=false; });
    let mDown=false;
    stage.addEventListener('mousedown',e=>{ mDown=true; begin(e.clientX,e.clientY); });
    stage.addEventListener('mousemove',e=>{ if(mDown) move(e.clientX,e.clientY); });
    window.addEventListener('mouseup', ()=>{ mDown=false; });
  }
  // 左右箭頭 / 選擇 / 返回
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
    const key = PARTNER_KEYS[psIndex];
    if(key !== state.pickedPartner){   // 實際切換才播選人確認 SE（「出戰中」重按不播）
      const p = GAME_CONFIG.partners[key];
      const vo = asset(p && p.selectVoice);
      if(vo) SFX.play(vo, (GAME_CONFIG.tuning.partnerSeGain||{})[p.selectVoice]);
    }
    setPickedPartner(key);   // 實選寫入（唯一管道）→ 能力即時切換
    refreshLoadoutLabels();
    renderPartnerSheet();
  });
  bind('psClose', ()=>{ SFX.menuClick(); closePartnerSheet(); });
}

/* ============================================================================
 *  副武器選擇畫面（全螢幕）：橫式武器卡「上下滑動」切換、卡疊同選人、下方武器介紹
 * ----------------------------------------------------------------------------
 *  清單以 config weapons 動態產生（新增武器自動出現）。「選擇此武器」→
 *  state.equippedWeapon（weapon 自有狀態 §3.4）選即換 + 播該武器擊發聲（config sound）。
 * ========================================================================== */
const WEAPON_KEYS = Object.keys(WEAPONS);
let wsIndex = 0;          // 目前展示中的武器 index
let wsBound = false;      // 手勢/按鈕只綁一次

export function openWeaponSheet(){
  wsIndex = Math.max(0, WEAPON_KEYS.indexOf(state.equippedWeapon));
  buildWeaponDeck();
  bindWeaponSheet();
  renderWeaponSheet();
  $('weaponSheet').classList.add('on');
}
export function closeWeaponSheet(){ $('weaponSheet').classList.remove('on'); }

function wsMove(dir){   // dir=+1 下一把 / -1 上一把（循環；上滑＝看下一把）
  wsIndex = (wsIndex + dir + WEAPON_KEYS.length) % WEAPON_KEYS.length;
  SFX.menuClick();
  renderWeaponSheet();
}

// 卡疊建立（一次）：每把武器一張橫式卡（圖 contain 置中）。
function buildWeaponDeck(){
  const deck=$('wsDeck');
  if(!deck || deck.childElementCount) return;
  WEAPON_KEYS.forEach(key=>{
    const w=WEAPONS[key];
    const fr=document.createElement('div'); fr.className='ws-frame';
    const img=document.createElement('img');
    img.alt=w.name||key; img.draggable=false;
    img.src=asset(w.image)||'';
    fr.appendChild(img); deck.appendChild(fr);
  });
}

function renderWeaponSheet(){
  const key = WEAPON_KEYS[wsIndex];
  const w = WEAPONS[key];
  if(!w) return;
  const deck=$('wsDeck');
  if(deck) deckLayout([...deck.children], wsIndex, 'y');   // 現選抽到面前，其餘往上下墊後
  const set=(id,txt)=>{ const el=$(id); if(el) el.textContent=txt; };
  set('wsName', w.name || key);
  set('wsDesc', w.desc || '');
  set('wsStats', `反擊勝率 ${Math.round((w.counterWin||0)*100)}% · ${w.hits||0} 發 × ${w.dmgPerHit||0} 傷`);
  const dots=$('wsDots');
  if(dots){
    dots.innerHTML = WEAPON_KEYS.map((k,i)=>
      `<i class="${i===wsIndex?'cur':''}${k===state.equippedWeapon?' picked':''}"></i>`).join('');
  }
  const btn=$('wsSelect');
  if(btn){
    const isCur = key===state.equippedWeapon;
    btn.textContent = isCur ? '裝備中' : '選擇此武器';
    btn.classList.toggle('picked', isCur);
  }
}

function bindWeaponSheet(){
  if(wsBound) return; wsBound=true;
  // 武器卡區上下滑動（touch + 滑鼠拖曳；上滑＝看下一把，同直式清單直覺）
  const stage=$('wsStage');
  if(stage){
    let sx=0, sy=0, tracking=false;
    const THRESH=48;
    const begin=(x,y)=>{ sx=x; sy=y; tracking=true; };
    const move=(x,y)=>{
      if(!tracking) return;
      const dx=x-sx, dy=y-sy;
      if(Math.abs(dy)>THRESH && Math.abs(dy)>Math.abs(dx)*1.2){
        tracking=false;
        wsMove(dy<0 ? +1 : -1);   // 往上滑＝看下一把
      }
    };
    stage.addEventListener('touchstart',e=>{ const t=e.touches[0]; begin(t.clientX,t.clientY); },{passive:true});
    stage.addEventListener('touchmove', e=>{ const t=e.touches[0]; move(t.clientX,t.clientY); },{passive:true});
    stage.addEventListener('touchend', ()=>{ tracking=false; });
    let mDown=false;
    stage.addEventListener('mousedown',e=>{ mDown=true; begin(e.clientX,e.clientY); });
    stage.addEventListener('mousemove',e=>{ if(mDown) move(e.clientX,e.clientY); });
    window.addEventListener('mouseup', ()=>{ mDown=false; });
  }
  // 上下箭頭 / 選擇 / 返回
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
    const key = WEAPON_KEYS[wsIndex];
    if(key !== state.equippedWeapon){   // 實際切換才播擊發聲（「裝備中」重按不播）
      state.equippedWeapon = key;       // 反擊武器選即換、立即驅動戰鬥（三段防禦/反擊/視覺）
      const se = asset(WEAPONS[key].sound); if(se) SFX.play(se, sfxGain(WEAPONS[key].sound));   // 對應武器擊發聲
      refreshLoadoutLabels();
    }
    renderWeaponSheet();
  });
  bind('wsClose', ()=>{ SFX.menuClick(); closeWeaponSheet(); });
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
