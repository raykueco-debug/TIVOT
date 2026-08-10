/* ============================================================================
 *  modules/enemy.js — 敵人（立繪 / 受擊特效 / 設定當前敵人參數）
 *  ---------------------------------------------------------------------------
 *  職責（本輪）：faceless 立繪載入、受擊特效（血痕/齒痕/三爪/彈痕）、
 *    設定當前敵人時把大絕大寫參數與受擊特效寫入 state（供 defense 讀取執行）。
 *
 *  狀態：3.7 亂入/Boss（currentEnemyKey / curEnemyHitFx）為本模組所有。
 *    大絕大寫參數（3.3）由本模組於 setEnemy 寫入——此為 CLAUDE.md 3.3 明文
 *    授權的「設定敵人時寫入、defense 讀取執行」。敵方血量（3.2 combat-owned）
 *    的載入基準走 state.initEnemyHp() 具名 setter。
 *
 *  依賴：只 import state / config（不 import combat/defense，維持依賴方向）。
 *    受擊特效為純 DOM 輸出，不寫任何狀態。
 * ========================================================================== */

import { GAME_CONFIG, asset } from '../config.js';
import { state, initEnemyHp } from '../state.js';

const $ = id => document.getElementById(id);

/* ---------- 受擊特效派工 ----------
 *  依當前怪 curEnemyHitFx[kind] 播放對應特效。
 *  kind：'delay'（延時懲罰）/'wrong'（按錯懲罰）/'ult'（大絕）。
 *  缺設定或未知 kind → 退回既有爪痕。 */
export function showHitFx(kind){
  const fx = state.curEnemyHitFx && state.curEnemyHitFx[kind];
  if(!fx){ triggerClaw(); return; }
  switch(fx.type){
    case 'claw':  triggerClaw(fx.count||3, fx.angle==='random'); break;
    case 'blood': spawnBlood(fx.angle==='random'); break;
    case 'bite':  spawnBite(); break;
    case 'bullet':spawnBullets(fx.count||1, fx.pos==='random'); break;
    default:      triggerClaw();
  }
}
// 既有三爪：可指定 count 與是否隨機整體角度（透過父層旋轉）
export function triggerClaw(count, randomAngle){
  const claw=$('claw');
  if(randomAngle){ claw.style.transform = 'rotate('+((Math.random()*60)-30).toFixed(1)+'deg)'; }
  else { claw.style.transform=''; }
  claw.classList.remove('on'); void claw.offsetWidth; claw.classList.add('on');
}
export function hitLayer(){ return $('hitFxLayer'); }
export function addFx(el, life){ hitLayer().appendChild(el); setTimeout(()=>{ if(el.parentNode) el.remove(); }, life||650); }
// 血痕：一道，角度隨機
export function spawnBlood(randomAngle){
  const d=document.createElement('div');
  d.className='fx fx-blood';
  const deg = randomAngle ? (Math.random()*140-70) : 20;
  d.style.setProperty('--deg', deg.toFixed(1)+'deg');
  d.style.left=(38+Math.random()*24)+'%';
  d.style.top =(38+Math.random()*20)+'%';
  addFx(d,600);
}
// 齒痕：一組上下咬痕，水平位置隨機
export function spawnBite(){
  const d=document.createElement('div');
  d.className='fx fx-bite';
  d.style.left=(30+Math.random()*40)+'%';
  d.style.top =(38+Math.random()*22)+'%';
  d.style.transform='translate(-50%,-50%) rotate('+((Math.random()*30)-15).toFixed(1)+'deg)';
  addFx(d,560);
}
// 彈痕（玻璃碎裂）：count 顆，位置隨機。每顆用內嵌 SVG 畫中心孔＋放射裂紋＋環裂。
export function spawnBullets(count, randomPos){
  for(let i=0;i<count;i++){
    const d=document.createElement('div');
    d.className='fx fx-bullet';
    const left = randomPos ? (22+Math.random()*56) : 50;
    const top  = randomPos ? (24+Math.random()*46) : 46;
    d.style.left=left+'%'; d.style.top=top+'%';
    d.style.animationDelay=(i*60)+'ms';
    d.innerHTML = bulletSVG();
    addFx(d,600);
  }
}
// 產生一個「玻璃被擊碎」的 SVG：中心暗孔、白色高光、放射狀與環狀裂紋（隨機化角度）。
export function bulletSVG(){
  const cx=60, cy=60;
  let cracks='';
  const spokes=7+Math.floor(Math.random()*3);
  for(let i=0;i<spokes;i++){
    const a=(360/spokes)*i + Math.random()*18;
    const r1=10, r2=40+Math.random()*14;
    const x1=cx+r1*Math.cos(a*Math.PI/180), y1=cy+r1*Math.sin(a*Math.PI/180);
    const mx=cx+((r1+r2)/2)*Math.cos((a+ (Math.random()*10-5))*Math.PI/180);
    const my=cy+((r1+r2)/2)*Math.sin((a+ (Math.random()*10-5))*Math.PI/180);
    const x2=cx+r2*Math.cos(a*Math.PI/180), y2=cy+r2*Math.sin(a*Math.PI/180);
    cracks+=`<path d="M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" stroke="rgba(255,255,255,.85)" stroke-width="1.4" fill="none"/>`;
  }
  cracks+=`<circle cx="${cx}" cy="${cy}" r="20" stroke="rgba(255,255,255,.5)" stroke-width="1" fill="none" stroke-dasharray="6 5"/>`;
  cracks+=`<circle cx="${cx}" cy="${cy}" r="34" stroke="rgba(255,255,255,.35)" stroke-width="1" fill="none" stroke-dasharray="4 7"/>`;
  return `<svg viewBox="0 0 120 120" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="7" fill="rgba(10,10,14,.92)"/>
    <circle cx="${cx}" cy="${cy}" r="10" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="1.5"/>
    ${cracks}
  </svg>`;
}

/* ---------- 每次點擊的兩個小特效（供 combat.tap 呼叫）---------- */
// 破碎消失：任何被點掉的格子播放破碎動畫
export function shatterCell(cell){ cell.classList.add('shatter'); }
// 彈殼
export function ejectShell(cell){
  const s=document.createElement('div'); s.className='shell';
  s.style.right='6px'; s.style.top='6px'; cell.appendChild(s);
  setTimeout(()=>s.remove(),500);
}

/* ---------- 立繪載入 ----------
 *  優先外部目錄（imageBase → assets/enemy/<base>/portrait.<ext>），
 *  全部失敗才 fallback 到 ASSETS 內嵌暫代圖。本專案圖已放在 resources/，
 *  ASSETS 的鑰匙即指向 resources/*，故一般直接命中 fallback 即為正解。 */
const ASSET_BASE = './assets/';
export function loadEnemyPortrait(en){
  const eImg = $('enemyImg');
  if(!eImg) return;
  const fallback = asset(en.image);
  if(fallback) eImg.src = fallback;
  if(en.imageBase){
    const exts = (en.imageExt ? [en.imageExt] : ['jpeg','jpg','png','webp']);
    const base = ASSET_BASE + 'enemy/' + en.imageBase + '/portrait.';
    let i = 0;
    const tryNext = ()=>{
      if(i >= exts.length){ if(!fallback) eImg.src = ''; return; }
      const probe = new Image();
      const url = base + exts[i++];
      probe.onload  = ()=>{ eImg.src = url; };
      probe.onerror = tryNext;
      probe.src = url;
    };
    tryNext();
  }else{
    eImg.src = fallback;
  }
}

// UI 顯示名：一律隱藏「_」之後的內容（如 '地下聖徒_A' → '地下聖徒'）。
export function displayEnemyName(name){ return String(name==null?'':name).split('_')[0]; }

/* ---------- 換上指定敵人（開場、亂入、日後連戰共用）----------
 *  把該怪的數值寫入 state：
 *    3.2（combat-owned）敵血基準 → state.initEnemyHp() 具名 setter
 *    3.3（大絕大寫參數）        → 直接寫 state.*（CLAUDE.md 3.3 授權）
 *    3.7（enemy-owned）         → currentEnemyKey / curEnemyHitFx 直接寫 */
export function setEnemy(key){
  const en = GAME_CONFIG.enemies[key];
  if(!en) return;
  state.currentEnemyKey = key;                 // 3.7：記住目前怪 key，供 boardGridFor 查每盤格數
  initEnemyHp(en.hp);                           // 3.2：敵血基準（載入時 setter）
  state.ULT_DAMAGE = en.attack;                 // 3.3：大絕單擊傷害
  state.CHARGE_SECONDS = (en.atkInterval!=null) ? en.atkInterval : GAME_CONFIG.tuning.chargeSeconds;
  const u = en.ult || {};                        // 3.3：Boss 專屬大絕參數（缺欄位＝一般怪預設）
  state.ULT_SHOTS  = u.shots!=null ? u.shots : 1;
  state.ULT_GAP_MS = u.gapMs!=null ? u.gapMs : 0;
  state.ULT_MIN    = u.minMs!=null ? u.minMs : 4000;
  state.ULT_MAX    = u.maxMs!=null ? u.maxMs : 8000;
  const dp = en.delayPenalty || {};              // 3.3：延時懲罰縮放（Boss=0.5 / -1）
  state.DELAY_PENALTY_SCALE = dp.dmgScale!=null ? dp.dmgScale : 1;
  state.DELAY_TIME_DELTA    = dp.timeDelta!=null ? dp.timeDelta : 0;
  const wp = en.wrongPenalty || {};              // 3.3：按錯懲罰縮放
  state.WRONG_PENALTY_SCALE = wp.dmgScale!=null ? wp.dmgScale : 1;
  state.curEnemyHitFx = en.hitFx || null;        // 3.7：本怪受擊特效三件套
  // 名稱與立繪
  const nameEl = $('enemyName');
  if(nameEl) nameEl.textContent = displayEnemyName(en.name);
  loadEnemyPortrait(en);
}

/* ---------- 開場：把 GAME_CONFIG 的圖/名稱套到畫面上 ---------- */
export function applyConfigToDOM(){
  const pn = GAME_CONFIG.partners[GAME_CONFIG.defaultPartner];
  setEnemy(GAME_CONFIG.currentEnemy);
  const cImg = $('cutinImg');
  if(cImg && pn && pn.cutin) cImg.src = asset(pn.cutin);
}
