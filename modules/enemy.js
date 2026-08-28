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

import * as clock from '../script/clock.js';   // 立繪的時段差分（ver -423）
import { GAME_CONFIG, asset } from '../config.js';
import { state, initEnemyHp } from '../state.js';
import { SFX } from '../audio.js';

const $ = id => document.getElementById(id);

/* combat 於啟動時注入原語（維持依賴方向；enemy 不反向 import combat）。
 *   startIntruderFight — Boss 亂入的戰鬥重啟（combat 擁有）。
 *   updateBars         — 換敵後刷新血條（enemyHp 顯示，combat 擁有）。 */
let api = { startIntruderFight(){}, updateBars(){} };
export function init(a){ api = { ...api, ...a }; }

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
    case 'bullet':spawnBullets(fx.count||1, fx.pos==='random', fx.scale); break;
    case 'slash': spawnSlash(); break;
    /* 鈍器受擊（ver -375）：不見血的悶擊 —— 一圈迅速擴散的衝擊環＋畫面一沉。
       ⚠ 與 `bullet`（玻璃碎裂）刻意不同：那一隻獵人是拿槍托招呼你，不是開槍。 */
    case 'blunt': spawnBlunt(fx.scale); break;
    default:      triggerClaw();
  }
}
// 紅刀痕濺血：一條斜向亮紅刀痕 + 數顆散開的小血滴（按錯懲罰用）。
//   ⚠ 不沿用 spawnBlood（那是延時懲罰的寬血痕，會誤看成兩個特效同時出現）；改自帶小血滴區隔。
export function spawnSlash(){
  const d=document.createElement('div');
  d.className='fx fx-slash';
  const deg=(Math.random()<0.5?-1:1)*(20+Math.random()*35);   // 斜角 ±(20~55)°
  d.style.setProperty('--deg', deg.toFixed(1)+'deg');
  addFx(d,480);
  // 濺血：數顆小血滴自中心沿刀痕方向散開，短促淡出
  const n=7+Math.floor(Math.random()*4);
  for(let i=0;i<n;i++){
    const b=document.createElement('div'); b.className='fx fx-drop';
    const ang=deg + (Math.random()*120-60);                   // 大致沿刀痕、帶散射
    const dist=26+Math.random()*74;
    b.style.setProperty('--dx',(Math.cos(ang*Math.PI/180)*dist).toFixed(0)+'px');
    b.style.setProperty('--dy',(Math.sin(ang*Math.PI/180)*dist).toFixed(0)+'px');
    b.style.left=(45+Math.random()*10)+'%';
    b.style.top =(42+Math.random()*8)+'%';
    const sz=(3+Math.random()*5).toFixed(0);
    b.style.width=sz+'px'; b.style.height=sz+'px';
    b.style.animationDelay=(Math.random()*40).toFixed(0)+'ms';
    addFx(b,440);
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
//   scale＝彈痕放大倍率（config hitFx 可帶，如 Boss 大絕單顆大彈痕 1.6）。
//   ⚠ 放大走 width/height（動畫 keyframe 佔用 transform，不能疊 scale）。
export function spawnBullets(count, randomPos, scale){
  const px = Math.round(120*(scale||1));
  for(let i=0;i<count;i++){
    const d=document.createElement('div');
    d.className='fx fx-bullet';
    const left = randomPos ? (22+Math.random()*56) : 50;
    const top  = randomPos ? (24+Math.random()*46) : 46;
    d.style.left=left+'%'; d.style.top=top+'%';
    d.style.width=px+'px'; d.style.height=px+'px';
    d.style.margin=(-px/2)+'px 0 0 '+(-px/2)+'px';
    d.style.animationDelay=(i*60)+'ms';
    d.innerHTML = bulletSVG(px);
    addFx(d,600);
  }
}
/* 鈍器受擊：衝擊環（白→暗）＋短促的暗角壓迫。樣式見 style.css 的 .fx-blunt。 */
export function spawnBlunt(scale){
  const px = Math.round(160*(scale||1));
  const d=document.createElement('div');
  d.className='fx fx-blunt';
  d.style.left=(34+Math.random()*32)+'%'; d.style.top=(30+Math.random()*34)+'%';
  d.style.width=px+'px'; d.style.height=px+'px';
  d.style.margin=(-px/2)+'px 0 0 '+(-px/2)+'px';
  addFx(d,520);
}
// 產生一個「玻璃被擊碎」的 SVG：中心暗孔、白色高光、放射狀與環狀裂紋（隨機化角度）。
//   px＝輸出尺寸（viewBox 固定 120，內容等比放大）。
export function bulletSVG(px){
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
  const sz = px||120;
  return `<svg viewBox="0 0 120 120" width="${sz}" height="${sz}" xmlns="http://www.w3.org/2000/svg">
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
 *  一律走 ASSETS 鑰匙（en.image → resources/*）。
 *  註：舊版（含 reference 原型）會先探測外部目錄 assets/enemy/<imageBase>/portrait.<ext>
 *  四種副檔名，失敗才回退到 ASSETS。本專案圖全在 resources/、無 assets/ 目錄，
 *  那四次探測必然 404（每次換敵各噴四個無效請求），且結果永遠等於 fallback → 已移除。
 *  CLAUDE.md §5 也指定統一走 resources/ 新結構。 */
/* ══ 敵人立繪的**時段差分**（ver -423，Ray：「上午下午用 day、晚上用 night、
   黃昏黎明用 dd」）══════════════════════════════════════════════════════
   卡上的 `image` 可以是字串（一張）或 `{day, dd, night}`（三張）。
   ⚠⚠ **時段 → 槽的對應只有這一處**（鐵律 7）：`clock.band()` 出的是
     `Dawn/Day/Dusk/night/midnight`，這裡把黎明與黃昏併成 `dd`、深夜併進 `night`。
   ⚠ 缺哪一張就往 `day` 退，`day` 也沒有就取物件裡的第一個 —— 不要讓立繪變空白。 */
export function enemyImage(en){
  const im = en && en.image;
  if(!im) return '';
  if(typeof im === 'string') return asset(im);
  const b = clock.band();
  const slot = (b==='Day') ? 'day' : (b==='night'||b==='midnight') ? 'night' : 'dd';
  const key = im[slot] || im.day || im[Object.keys(im)[0]];
  return asset(key);
}
export function loadEnemyPortrait(en){
  const eImg = $('enemyImg');
  if(!eImg) return;
  eImg.src = enemyImage(en);
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
  /* 蓄力秒數。⚠ 卡上可以給**區間**（`[3,5]`，ver -423 的巨型蜈蚣）——
     那時候每次排程各自擲一次（見 `defense.scheduleUlt`），所以這裡存的是整個欄位。 */
  state.CHARGE_SECONDS = (en.atkInterval!=null) ? en.atkInterval : GAME_CONFIG.tuning.chargeSeconds;
  /* 這一隻的「打起來的手感」欄位（ver -423 的敵人卡）。⚠ 一律**每次換敵都寫**，
     沒寫要寫回預設 —— setEnemy 是連戰換敵也會走的（同下面那組絕對值的理由）。 */
  state.enemyResist    = en.resist || null;
  state.enemyWeak      = en.weak || null;
  state.enemyDualBonus = en.dualBonus || 0;
  state.enemyNoStack   = !!en.noStack;
  state.enemyCounterBuff = en.counterBuff || null;
  state.enemyCounterStun = en.counterStun || 0;
  /* 反擊硬直（ver -495，Ray：「被反擊時延時歸零；預設為 1，0 的話就算被反擊
     延時計時也不會歸零」）。卡上沒寫＝1（會硬直）。判定在 defense 的反擊分支。 */
  state.enemyCounterStagger = (en.counterStagger!=null) ? en.counterStagger : 1;
  const u = en.ult || {};                        // 3.3：Boss 專屬大絕參數（缺欄位＝一般怪預設）
  state.ULT_SHOTS  = u.shots!=null ? u.shots : 1;
  state.ULT_GAP_MS = u.gapMs!=null ? u.gapMs : 0;
  /* 發動頻率。⚠ 卡上的 `ultEvery:[3,5]`（**秒**）是最好讀的寫法（ver -423），
     舊的 `ult.minMs/maxMs`（毫秒）仍然吃 —— 兩者都在，卡上寫哪個用哪個。 */
  const ue = Array.isArray(en.ultEvery) ? en.ultEvery : null;
  state.ULT_MIN    = ue ? ue[0]*1000 : (u.minMs!=null ? u.minMs : 4000);
  state.ULT_MAX    = ue ? ue[1]*1000 : (u.maxMs!=null ? u.maxMs : 8000);
  const dp = en.delayPenalty || {};              // 3.3：延時懲罰縮放（Boss=0.5 / -1）
  state.DELAY_PENALTY_SCALE = dp.dmgScale!=null ? dp.dmgScale : 1;
  state.DELAY_TIME_DELTA    = dp.timeDelta!=null ? dp.timeDelta : 0;
  const wp = en.wrongPenalty || {};              // 3.3：按錯懲罰縮放
  state.WRONG_PENALTY_SCALE = wp.dmgScale!=null ? wp.dmgScale : 1;
  /* 絕對值版（ver -375，敵人標準卡的寫法）：卡上有寫就蓋過上面那組縮放。
     ⚠ 沒寫要寫回 null，不能留上一隻怪的值 —— setEnemy 是連戰換敵也會走的。 */
  state.DELAY_SECONDS = dp.seconds!=null ? dp.seconds : null;
  state.DELAY_DAMAGE  = dp.damage !=null ? dp.damage  : null;
  state.WRONG_DAMAGE  = wp.damage !=null ? wp.damage  : null;
  state.curEnemyHitFx = en.hitFx || null;        // 3.7：本怪受擊特效三件套
  state.curEnemySound = en.sound || null;        // 3.7：本怪攻擊音（依 kind：ult/delay/wrong）
  // 名稱與立繪；取景（config fit.pos → object-position；未設＝回 CSS 預設 center top）
  const nameEl = $('enemyName');
  if(nameEl) nameEl.textContent = displayEnemyName(en.name);
  const eImg = $('enemyImg');
  if(eImg){
    eImg.style.objectPosition = (en.fit && en.fit.pos) || '';
    /* ⚠ `fit.mode:'contain'`（ver -375）：**去背立繪**用的。滿版插圖走 cover（預設），
       但把對話立繪借來當戰鬥立繪時，cover 會把頭裁掉 —— 那種要 contain ＋ 背景。 */
    eImg.style.objectFit = (en.fit && en.fit.mode) || '';
  }
  /* 戰鬥背景（ver -375）：敵人卡的 `bg`。去背立繪身後不能是一片黑。
     ⚠ 沒寫要清掉 —— 同 setEnemy 的其他欄位，連戰換敵不能留上一隻的。 */
  const topEl = $('top');
  if(topEl) topEl.style.backgroundImage = en.bg ? ('url("resources/background/'+en.bg+'.webp")') : '';
  loadEnemyPortrait(en);
}

/* ---------- 連戰序列（局＝同場多敵）----------
 *  lineupIndex 為序列游標（§3.7 enemy 擁有）。開場載 lineup[0]、換敵時游標 +1 載下一隻。
 *  Boss 亂入（inIntruderFight）為單敵新場,不走 lineup → hasNextInLineup 恆 false。 */
export function startLineup(){
  state.lineupIndex = 0;
  const first = (GAME_CONFIG.lineup && GAME_CONFIG.lineup[0]) || GAME_CONFIG.currentEnemy;
  setEnemy(first);
}
// 局內還有沒有下一隻（Boss 戰不算）
export function hasNextInLineup(){
  if(state.inIntruderFight) return false;
  const lu = GAME_CONFIG.lineup || [];
  return state.lineupIndex < lu.length - 1;
}
// 換上序列的下一隻：敵人區「前進遭遇」進場特效（僅敵人區，非 cut-in、盤面不動）。
//   ①舊敵淡出/縮出（玩家前進掠過）→ ②換敵 config + 刷血條 → ③新敵自遠處逼近淡入。
//   done() 於進場動畫結束時回呼（combat 於此載下一敵首盤、恢復計時碼表）。
export function advanceToNextEnemy(done){
  state.lineupIndex += 1;
  const key = (GAME_CONFIG.lineup && GAME_CONFIG.lineup[state.lineupIndex]) || state.currentEnemyKey;
  const img = $('enemyImg');
  // ⚠ 先把下一敵立繪解碼完成再開換敵演出：進場動畫當下才改 src，圖未就緒時
  //   瀏覽器會續顯舊圖（「盤面已換、立繪沒換」）。decode 失敗/逾時 800ms 照樣開演（go 冪等）。
  const en = GAME_CONFIG.enemies[key] || {};
  const src = enemyImage(en);
  const start = ()=>{
    if(img){ img.classList.remove('enemy-enter'); img.classList.add('enemy-leave'); }
    setTimeout(()=>{
      setEnemy(key);            // 換立繪/名稱/血量與大絕/懲罰/hitFx config
      api.updateBars();         // 新敵血條
      if(img){
        img.classList.remove('enemy-leave'); void img.offsetWidth; img.classList.add('enemy-enter');
        setTimeout(()=>img.classList.remove('enemy-enter'), 560);
      }
      if(done) done();
    }, 260);
  };
  if(src){
    let started=false;
    const go=()=>{ if(!started){ started=true; start(); } };
    const pre=new Image(); pre.src=src;
    (pre.decode ? pre.decode() : Promise.resolve()).then(go, go);
    setTimeout(go, 800);
  } else start();
}

/* ---------- 亂入 / Boss 遭遇（New Hustle）----------
 *  由 inspector 迎擊分流（S 解鎖 → 迎擊）注入呼叫。流程：
 *    ① 播 Boss 遭遇 cut-in（saintCutin boss 版，鎖盤面 cutinPlaying）；
 *    ② 演出定長 3 秒 → 自動 enterFight：設 inIntruderFight（§3.7 enemy 擁有）→
 *       呼叫注入的 combat.startIntruderFight()（重開新場、載 witch）。不接受點擊跳過。
 *  bannerHold 為 reference 舊版自動觸發用,手動迎擊流程不使用 → 視為休眠 config,不接。 */
export function triggerIntruder(){
  const it = GAME_CONFIG.intruder;
  // Boss BGM 已於「再度執槍（S 解鎖）」瞬間起播（見 inspector.onRematchBtn），此處不重播。
  const sc = $('saintCutin');
  $('saintCutinTitle').textContent = it.cutinText || 'NEW HUSTLE INCOMING';
  $('saintCutinSub').textContent   = '';
  $('saintCutinImgBoss').src = asset('cutin_boss');   // Boss 專屬遭遇 cut-in（貝琳妲）
  sc.classList.remove('obe','execute','burst','return');
  sc.classList.add('boss','on');
  state.cutinPlaying = true;              // 鎖盤面點擊（enemy 為當下播演出的模組，允許寫 cutinPlaying）
  try{ SFX.hit && SFX.hit(); }catch(e){}

  const enterFight=()=>{
    sc.classList.remove('on','boss','burst','obe','execute','return');
    $('banner').classList.remove('on','seq','lose');
    state.inIntruderFight = true;         // 3.7：標記進入 Boss 戰（結算讀此走 boss 存檔/台詞）
    api.startIntruderFight();             // combat 擁有的戰鬥重置：重開新場、載 witch
  };
  setTimeout(enterFight, 3000);           // 演出 3 秒後自動進 Boss 戰
}

/* ---------- 開場：把 GAME_CONFIG 的圖/名稱套到畫面上 ---------- */
export function applyConfigToDOM(){
  const pn = GAME_CONFIG.partners[GAME_CONFIG.defaultPartner];
  setEnemy(GAME_CONFIG.currentEnemy);
  const cImg = $('cutinImg');
  if(cImg && pn && pn.cutin) cImg.src = asset(pn.cutin);
  const emb = $('homeEmblem');
  if(emb && !emb.src) emb.src = asset('home_emblem');   // 主畫面徽記
}
