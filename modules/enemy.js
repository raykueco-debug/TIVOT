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
import { GAME_CONFIG, asset, sfxGain } from '../config.js';
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
  /* 受擊行可加掛**全畫面閃色**（ver -509，空賊船卡：「蓄力攻擊…畫面閃紅」）——
     疊在受擊特效之上、300ms 自己退。目前只有 'red' 一種，要新色再加 class。 */
  if(fx.flash) screenFlash(fx.flash);
}
function screenFlash(color){
  const d=document.createElement('div');
  d.className='fx fx-screenflash fx-screenflash-'+color;
  addFx(d, 340);
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
/* 牙印（ver -745 改，Ray：「上下兩道，尖一點」）：上顎＋下顎各一排尖齒，
   同一個中心相對而咬。齒形在 CSS（.fx-bite-up/.fx-bite-dn 的 clip-path 鋸齒）。 */
export function spawnBite(){
  /* ver -761：改用 Ray 交件的 ef_bite（黑底紅光牙）——一個外層帶隨機旋轉縮放，
     裡面上下顎兩半各自閉合（動畫全在 style.css 的 .fx-bitei，變形式）。 */
  /* 落點＝剛剛那顆光圈（ver -766，Ray）：defense 發佈的座標**讀完即清**——
     不經光圈的 'ult' 擊（劇情殺三擊那種）拿不到座標，照舊隨機。 */
  const pos = state.lastUltPos; state.lastUltPos = null;
  const cx = pos ? pos.x : (30+Math.random()*40);
  const cy = pos ? pos.y : (36+Math.random()*24);
  const d=document.createElement('div');
  d.className='fx fx-bitei';
  d.style.left=cx+'%';
  d.style.top =cy+'%';
  d.style.setProperty('--rot', ((Math.random()*24)-12).toFixed(1)+'deg');
  d.style.setProperty('--sc',  (0.9+Math.random()*0.35).toFixed(2));
  d.innerHTML='<i class="up"></i><i class="dn"></i>';
  addFx(d,420);   // 動畫 .3s（ver -764 的 HotD 節奏）＋餘裕
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
/* ══⚠⚠ 顯形：**背景先出，怪才從背景裡解析出來**（ver -588，Ray：「戰鬥中讓背景
   先出，怪快速淡入」）══════════════════════════════════════════════════════
   `setEnemy` 已經先把 `#top` 的底圖擺好了（那一段在這一支之前），所以這裡只要
   讓立繪**晚一拍**再起 —— 演出本身在 CSS 的 `enemy-rise`（失焦去彩 → 收斂成焦）。
   ⚠ 要等**圖真的載到**才起（`onload`）：沒載到就播動畫，前半段是在演一張空圖。
     已經在快取裡時 `complete` 是真的，直接起。
   ⚠ 每次都要先把 class 拿掉再重加（`offsetWidth` 強制重排），不然連戰換第二隻時
     class 已經在身上、動畫不會重播。
   ⚠ `enemy-purge`（上一隻的淨化）也要一起清 —— 不清的話新的一隻會頂著
     「被抹掉一半」的遮罩出場。 */
/* ══⚠⚠ **降臨與淨化只給「禍魘」**（ver -657，Ray：「只有分類為禍魘的敵人會有
   降臨跟擊敗淨化特效」）══════════════════════════════════════════════════
   兩個演出**共用這一份名單**（鐵律 7）：它們是同一件事的兩端 —— 從惡夢裡
   降下來、被淨化之後散成白光。人類（賞金獵人／魔女）、靶、船、獸各有各的
   出場與死法，不該共用這一套。
   ⚠ 判定看**敵人卡的 `kind`**（ver -423 就有的那一格，結算副標讀的也是它）——
     不要另立一個「要不要播特效」的欄位，那是同一件事的第二個真相。
   ⚠ 其餘 kind 目前**沒有專屬演出**：立繪載到就直接在那裡（維持原本的行為）。
     Ray 給了再照這裡加一支。 */
/* ⚠⚠ **聖徒系列（`slay`）效果上等同禍魘**（ver -658，Ray 指定）——
   牠們不是禍魘，但**降臨與淨化這兩個演出**用同一套。
   ⚠ 這與**結算副標**的 `kind` 是兩回事：那邊 `slay` 仍是「已擊殺」、`harm` 是
     「已淨化」（`i18n` 的 `result.winSubBy`）—— 同一格 `kind` 兩種用途，
     各查各的表，不要為了對齊演出而去改副標。 */
const PURIFY_KINDS = { harm:1, slay:1 };
/* ⚠⚠ **登場特效比淨化死法多一類：船（ver -787，Ray：「每一個船戰的敵人都會有出場
   特效，每次都要播」）**。降臨（rise＋震動＋衝擊波）與淨化（死亡散白光）本來共用
   `PURIFY_KINDS`，但 Ray 要**所有船戰敵人**都有登場震動衝擊波 —— 空賊船 `kind:'ship'`
   不是禍魘（死掉不該散白光），所以只把它加進**登場**這一類，**淨化死法維持
   harm/slay**。羽蛇／蜈蚣是 `harm`，本來就在登場類裡（＝「每次都播」已成立）。 */
const ENTRANCE_KINDS = { harm:1, slay:1, ship:1 };
function isPurify(){
  const en = GAME_CONFIG.enemies[state.currentEnemyKey];
  return !!(en && PURIFY_KINDS[en.kind]);
}
const RISE_DELAY_MS = 120;      // 背景先出的那一拍（讓玩家看得到「那裡本來就有個地方」）
/* 落地的時刻（毫秒）。⚠ **必須對上 CSS `enemyRise` 的 78% 那一格**
   （0.9s × 0.78 = 702ms）—— 改一邊要改另一邊（ver -640）。 */
const LAND_AT = 702;
/* ⚠⚠ 著地的計時器要**掛在模組上**不是掛在 `rise` 那個閉包上（ver -640）：
   `loadEnemyPortrait` 每次呼叫都會做一個新的 `rise`，掛閉包等於每一次都是新的
   計時器，前一次的取消不掉 —— 實測換一次敵人就疊出**兩圈**落地光。 */
let landT = 0;
/* ⚠⚠⚠ **上一隻還在路上的降臨要取消掉**（ver -659，Ray：「我現在打靶還是有降臨特效」）。
   降臨是**延後**執行的（`setTimeout(rise, RISE_DELAY_MS)`，圖還沒載到時再等 `onload`）——
   而 `startGame` 會先擺一隻預設的怪、再換成這一場真正的那一隻。於是：
     ① setEnemy(聖徒) → 排了一個 rise ② setEnemy(靶) → 清掉 class、依 kind 不排 rise
     ③ ①那個 timeout 到期 → **把 `enemy-rise` 加到靶身上**
   `kind` 的守門完全正確，錯的是「沒有取消上一次的延後」——
   這與 §6.5「上場是延後執行的，所以撤場一定要把那個延後取消掉」是同一條。
   ⚠ 三樣都要收：`setTimeout` 的握把、`onload` 的回呼、著地的計時器。 */
let riseT = 0;
export function loadEnemyPortrait(en){
  const eImg = $('enemyImg');
  if(!eImg) return;
  clearTimeout(riseT); riseT=0;
  clearTimeout(landT); landT=0;
  eImg.onload = null;
  eImg.classList.remove('enemy-rise','enemy-purge');
  /* ⚠⚠ **演完要把 class 拿掉**（ver -598 修）：`enemy-rise` 帶 `both` 填充，
     留在身上等於 `#enemyImg` 永遠掛著 `animation:enemyRise`；而它與命中反應
     （`#enemyImg.hit`）specificity 相同、宣告在後面 —— **後面的贏**，
     於是「打中敵人」那一記從頭到尾播不出來（Ray 回報看不到命中效果）。
     ⚠ 用 `animationend` 而不是計時器：時長只寫在 CSS 一處（鐵律 7）。 */
  const rise=()=>{ void eImg.offsetWidth; eImg.classList.add('enemy-rise');
    /* ══ 著地（ver -640，見 CSS 的 `enemyRise` 78% 那一格）══
       落到定位的那一刻補兩件事：**一圈擴散的聖光**與**鏡頭一震**。
       ⚠ 鏡頭震動走 `api.screenShake`（combat 擁有的那一支，鐵律 8）——
         不要在這裡自己加 class，那會變成第二份實作。
       ⚠ 時間點寫成 `LAND_AT`：它必須對上 CSS 那一格（0.9s × 78%），
         改一邊要改另一邊（鐵律 7 的但書，兩邊註解互指）。 */
    clearTimeout(landT);
    landT=setTimeout(()=>{
      /* 著地的聲音：`se_saint_install` **原音**（ver -649，Ray：「se_saintinstall
         不要降 key，用原 pitch」）。-641 的執行期變調與 -643 的降調檔案都已撤掉。
         ⚠ 增益問 `sfxGain`（全域響度階層，§6.6）。 */
      { /* 出場音效（ver -790，Ray 更正：「船戰登場特效音是每一個都有獨立的，跟陸戰
           禍魘分開」「原本放 se_saintinstall 的鐘聲變成受擊音了」）：
           · **船戰敵人**（羽蛇／蜈蚣／空賊船）＝卡上各自的 `landSe`（每隻獨立）。
           · **陸戰禍魘／聖徒**＝沒有 `landSe`，退回 `sfx_saint`（＝se_saintinstall 鐘聲，
             ver -649 的原音）。
           ⚠ -773 曾把預設改成「自己的攻擊音 `sound.ult`」——但 `sound.ult` 正是玩家
             被那隻怪打到的**受擊音**，套到陸戰的登臨就變成受擊音（Ray 回報）。所以
             **拿掉那個 fallback**：船戰各自的登場音一律寫成卡上的 `landSe`（資料驅動，
             鐵律 1），陸戰一律鐘聲。 */
        const k=state.curEnemyLandSe || 'sfx_saint';
        SFX.play(asset(k), sfxGain(k)); }
      if(api.screenShake) api.screenShake();
      const top=$('top');
      if(top){
        const ring=document.createElement('div');
        ring.className='enemy-land';
        top.appendChild(ring);
        setTimeout(()=>ring.remove(), 700);
      }
    }, LAND_AT);
    eImg.addEventListener('animationend', function off(e){
      if(e.animationName!=='enemyRise') return;
      eImg.removeEventListener('animationend', off);
      eImg.classList.remove('enemy-rise');
    }); };
  /* ⚠ 不在登場類就不演降臨（ver -657；-787 登場類含 ship）：立繪載到就直接在那裡。
     ⚠ 判定用**傳進來的這張卡**不是查 state：`setEnemy` 在寫
       `state.currentEnemyKey` 之前就可能叫到這裡，問 state 會問到上一隻。 */
  if(!ENTRANCE_KINDS[en && en.kind]) return void (eImg.src = enemyImage(en));
  const arm=()=>{ eImg.onload=null; clearTimeout(riseT); riseT=setTimeout(rise, RISE_DELAY_MS); };
  eImg.onload = arm;
  eImg.src = enemyImage(en);
  if(eImg.complete && eImg.naturalWidth) arm();
}
/* ══ 淨化：血歸零那一刻把怪抹掉（ver -588）══
   ⚠ 演出在 CSS（`enemy-purge`：聖光漂白 → 由下往上抹除），這裡只負責掛上去。
   ⚠ **冪等**：overkill 期間 `enemyHp<=0` 會被判到好幾次，重複加 class 不會重播
     （沒有 remove/reflow），這正是要的 —— 淨化只演一次。
   ⚠ `both` 讓它停在最後一格（怪維持消失），不會在動畫結束後跳回來。 */
/* ══ 淨化的**白光星芒飄散**（ver -594，Ray：「拉長抖動還要白光星芒飄散」）══
   在怪的身上撒一把十字光斑，往上飄散開來。演出在 CSS 的 `.fx-star`／`purgeStar`，
   這裡只負責**撒**：每一顆的位置、大小、角度、飄散方向、壽命都在這裡擲。
   ⚠ 撒的範圍對著**立繪站的地方**（中間偏下的一塊），不是整個 `#top` ——
     怪在中央，星芒撒到畫面邊角會變成「畫面在發光」而不是「牠在散」。
   ⚠ 方向**偏上**（dy 一律往負、dx 左右各半）：怪同時在往上拉長，
     光往上飄才是同一件事的兩面；四面八方散開會把那個方向感抵消掉。
   ⚠ 逐顆給不同的 `delay` 與 `life`：同時出現同時消失讀起來是一次閃光，
     錯開才像「一直有東西在飄」。
   ⚠ 生命結束要自己移除（走既有的 `addFx`，它會定時 remove）。 */
const STAR_N = 18;
function spawnPurgeStars(){
  for(let i=0;i<STAR_N;i++){
    const d=document.createElement('div');
    d.className='fx fx-star';
    d.appendChild(document.createElement('i'));      // 中心光核
    const size = 14 + Math.random()*30;
    const life = 520 + Math.random()*420;
    const delay = Math.random()*260;
    d.style.left = (30 + Math.random()*40) + '%';    // 立繪站的那一塊
    d.style.top  = (28 + Math.random()*46) + '%';
    d.style.setProperty('--s', size.toFixed(0)+'px');
    d.style.setProperty('--r', (Math.random()*90).toFixed(0)+'deg');
    d.style.setProperty('--dx', ((Math.random()*2-1)*70).toFixed(0)+'px');
    d.style.setProperty('--dy', (-40 - Math.random()*110).toFixed(0)+'px');
    d.style.setProperty('--life', life.toFixed(0)+'ms');
    d.style.animationDelay = delay.toFixed(0)+'ms';
    addFx(d, life+delay+80);
  }
}
/* ══⚠⚠ **只有「禍魘」這一類用這個死法**（ver -594，Ray 指定）══════════════
   拉長抖動 ＋ 白光星芒是**淨化**的樣子 —— 禍魘被淨化才是那個畫面。
   人類（賞金獵人／魔女）、靶、船、獸、聖徒系列各有各的死法，不該共用這一套。
   ⚠ 判定看**敵人卡的 `kind`**（ver -423 就有的那一格，結算副標也是讀它）——
     不要另立一個「要不要播特效」的欄位，那是同一件事的第二個真相（鐵律 7）。
   ⚠ 其餘 kind 目前**沒有專屬死法**（維持原本的行為）；Ray 給了再照這裡加一支。 */
export function purgeEnemy(){
  if(!isPurify()) return;
  const eImg = $('enemyImg');
  if(eImg) eImg.classList.add('enemy-purge');
  spawnPurgeStars();
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
  state.enemyHitsTaken = 0;                     // 換了一隻怪 → 「這一隻」的受擊數歸零（九階「方舟」，ver -708）
  initEnemyHp(en.hp);                           // 3.2：敵血基準（載入時 setter）
  state.ULT_DAMAGE = en.attack;                 // 3.3：大絕單擊傷害
  /* 蓄力秒數。⚠ 卡上可以給**區間**（`[3,5]`，ver -423 的巨型蜈蚣）——
     那時候每次排程各自擲一次（見 `defense.scheduleUlt`），所以這裡存的是整個欄位。 */
  state.CHARGE_SECONDS = (en.atkInterval!=null) ? en.atkInterval : GAME_CONFIG.tuning.chargeSeconds;
  /* 這一隻的「打起來的手感」欄位（ver -423 的敵人卡）。⚠ 一律**每次換敵都寫**，
     沒寫要寫回預設 —— setEnemy 是連戰換敵也會走的（同下面那組絕對值的理由）。 */
  state.enemyResist    = en.resist || null;
  /* 副武器調整（ver -796，Ray：一欄搞定）：`weaponMod:{ 類別:[傷害, 迴避] }` ——
     [0]傷害＝反擊增傷率（正）/抗性減傷率（負），加法；[1]迴避＝額外 miss 率(0~1)，加法。 */
  state.enemyWeaponMod = en.weaponMod || null;
  state.enemyWeak      = en.weak || null;
  state.enemyDualBonus = en.dualBonus || 0;
  state.enemyNoStack   = !!en.noStack;
  state.enemyCounterBuff = en.counterBuff || null;
  state.enemyCounterStun = en.counterStun || 0;
  /* 反擊硬直（ver -495，Ray：「被反擊時延時歸零；預設為 1，0 的話就算被反擊
     延時計時也不會歸零」）。卡上沒寫＝1（會硬直）。判定在 defense 的反擊分支。 */
  state.enemyCounterStagger = (en.counterStagger!=null) ? en.counterStagger : 1;
  const u = en.ult || {};                        // 3.3：Boss 專屬大絕參數（缺欄位＝一般怪預設）
  /* 大絕的 hp 門檻行為（ver -760）：`ult:{ hp:30, act:'ring4' }` —— 見 state 的說明。 */
  state.enemyUltAct = (u.act!=null) ? { hp:(u.hp||0), act:u.act } : null;
  state.ULT_SHOTS  = u.shots!=null ? u.shots : 1;
  state.ULT_GAP_MS = u.gapMs!=null ? u.gapMs : 0;
  /* 發動頻率。⚠ 卡上的 `ultEvery:[3,5]`（**秒**）是最好讀的寫法（ver -423），
     舊的 `ult.minMs/maxMs`（毫秒）仍然吃 —— 兩者都在，卡上寫哪個用哪個。 */
  const ue = Array.isArray(en.ultEvery) ? en.ultEvery : null;
  state.ULT_MIN    = ue ? ue[0]*1000 : (u.minMs!=null ? u.minMs : 4000);
  state.ULT_MAX    = ue ? ue[1]*1000 : (u.maxMs!=null ? u.maxMs : 8000);
  /* 開場第一發大絕的延遲（ver -795，Ray：「編入逐個，預設 1~2 秒」）：卡上
     `openUlt:[1,2]`（**秒**，同 ultEvery 的讀法）覆寫；沒寫＝預設 1~2 秒隨機。
     以前是全域寫死 0~3 秒（defense 的 ULT_OPEN_MS），現在逐怪可調。 */
  const oue = Array.isArray(en.openUlt) ? en.openUlt : null;
  state.ULT_OPEN_MIN = oue ? oue[0]*1000 : 1000;
  state.ULT_OPEN_MAX = oue ? oue[1]*1000 : 2000;
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
  state.curEnemyLandSe = en.landSe || null;      // 降臨著地音的卡上覆寫（ver -745，羽蛇＝吼叫）
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
  /* ⚠⚠ **城鎮插入戰用「你站的那一格」的背景**（ver -592，Ray：「打完敵人應該會
     留在原背景，不要自動切背景」）：`state.battleBg` 有值就蓋過卡上的 `bg` ——
     不然打完一場，上半的圖會從卡上那張跳回節點原本那張，讀起來是換了個地方。
     ⚠ 覆寫存的是**檔名**（城鎮那邊真的載到的那一個，含副檔名與時段）；
       卡上的 `bg` 是**基底名**，要自己補 `.webp`。兩種寫法差在這裡，別搞混。
     ⚠ 沒寫要清掉 —— 同 setEnemy 的其他欄位，連戰換敵不能留上一隻的。 */
  const topEl = $('top');
  if(topEl){
    const ov = state.battleBg;
    topEl.style.backgroundImage =
      ov ? ('url("resources/background/'+ov+'")')
         : (en.bg ? ('url("resources/background/'+en.bg+'.webp")') : '');
  }
  loadEnemyPortrait(en);
  /* 換了一隻怪（ver -693）：讓搭檔的「每隻怪一次」那一類被動重新上膛。
     ⚠ 這裡是那件事的唯一時刻 —— 開場、連戰換敵、Boss 亂入全部經過 setEnemy。 */
  if(api.onEnemySet) api.onEnemySet();
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
