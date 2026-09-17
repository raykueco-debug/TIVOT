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
import { GAME_CONFIG, HITFX, asset, sfxGain } from '../config.js';
import { state, initEnemyHp, addPartnerFight } from '../state.js';
import { SFX } from '../audio.js';
import * as story from './story.js';   // 背景 URL 只有 story.bgUrl 一支在組（ver -905，鐵律 7）
import { sakuraBurst } from './sakura.js';   // 鹿主的櫻花狂亂（ver -899）——同一支花瓣引擎，見 spawnSakura

const $ = id => document.getElementById(id);

/* combat 於啟動時注入原語（維持依賴方向；enemy 不反向 import combat）。
 *   startIntruderFight — Boss 亂入的戰鬥重啟（combat 擁有）。
 *   updateBars         — 換敵後刷新血條（enemyHp 顯示，combat 擁有）。 */
let api = { startIntruderFight(){}, updateBars(){} };
export function init(a){ api = { ...api, ...a }; }

/* ---------- 受擊特效派工 ----------
 *  依當前怪 curEnemyHitFx[kind] 播放對應特效。
 *  kind：'delay'（延時懲罰）/'wrong'（按錯懲罰）/'assault'（一般攻擊）/'ult'（門檻波的大絕，ver -932）。
 *  缺設定或未知 kind → 退回既有爪痕。 */
export function showHitFx(kind){
  const hf = state.curEnemyHitFx;
  /* ⚠⚠ **缺 `ult` 就退回 `assault`**（ver -932）：受擊分四格是這一版才加的
     （延時／按錯／攻擊／大絕），六十張既有的卡上只有前三格 —— 沒有退路的話
     門檻波打中會掉回預設的三爪，而那是**沉默的退化**（畫面上看不出是漏寫）。
     ⚠ 只退這一個方向：`assault` 缺了就是真的沒寫，照舊走三爪。 */
  const raw = hf && (hf[kind] || (kind==='ult' ? hf.assault : null));
  if(!raw){ triggerClaw(); return; }
  /* ══⚠⚠ **卡上寫的是一個名字**（ver -951）：`'claw'`／`'bite'`…
     樣子（爪數、位置、大小、閃色）全部查 `config.HITFX`（鐵律 1）——
     卡上不再帶參數，Excel 那四格就是一個下拉選單。
     ⚠ 仍吃得下舊的物件寫法（`{type:'claw',count:4}`）：卡上寫的優先、表上的當底，
       這樣舊資料不會突然變樣；但**新資料一律寫名字**。
     ⚠ `angle` 不再看卡：一律 random（Ray：「已經全默認 random 了根本不用再列」）。 */
  const key = (typeof raw === 'string') ? raw : raw.type;
  const fx  = Object.assign({}, HITFX[key] || {}, (typeof raw === 'string') ? {} : raw);
  const base = (HITFX[key] && HITFX[key].base) || key;
  switch(base){
    case 'claw':  triggerClaw(fx.count||3, true); break;
    case 'blood': spawnBlood(true); break;
    case 'bite':  spawnBite(); break;
    case 'bullet':spawnBullets(fx.count||1, fx.pos==='random', fx.scale); break;
    case 'slash': spawnSlash(); break;
    /* 鈍器受擊（ver -375）：不見血的悶擊 —— 一圈迅速擴散的衝擊環＋畫面一沉。
       ⚠ 與 `bullet`（玻璃碎裂）刻意不同：那一隻獵人是拿槍托招呼你，不是開槍。 */
    case 'blunt': spawnBlunt(fx.scale); break;
    case 'sakura':spawnSakura(); break;
    case 'holyburst':spawnHolyBurst(); break;   // 王座徘徊者的放光（ver -1351）
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
/* ══ 櫻花狂亂（ver -899，Ray：「鹿主的攻擊特效為櫻花狂亂飛舞，萬幸我們已經有櫻花了，
   把速度調快點，被命中的話是 3hits，音效用 sturm，但是跟櫻花一起播個兩秒就淡出」）══
   花瓣走**既有的** `modules/sakura.js`（出陣過場那一支，鐵律 8）—— 這裡只給它
   「這一次要多快多密」，不另寫一套花瓣。
   ⚠⚠ **一陣風只有一層**：「3 hits」是 `assault:{count:3}` ——同一波三顆光圈、
     每顆各自判定，全沒擋到就挨三下。三下若各生一層 canvas，就是三張全螢幕畫布
     疊著跑（手機直接掉幀），而且讀起來是「三陣風」不是「一陣狂風掃過」。
     所以**還在跑就不再開第二層**，音效也不重播。
   ⚠ 音效**不掛在 `HITFX[type].se` 上**（那張表是給一次性的受擊音用的，
     combat 會直接 `SFX.play` 放到底）—— Ray 要的是「跟櫻花一起播兩秒就淡出」，
     那是**有頭有尾的演出**，長度由這一支決定，所以走 `SFX.playCue` 的把手。
     ⚠ 這不是把音效寫成兩份：`HITFX.sakura` 那一列**刻意沒有 `se`**，
       這一支才是它唯一的聲音（鐵律 7）。 */
const SAKURA_SE_MS = 2000;      // Ray：「播個兩秒」
const SAKURA_SE_FADE = 700;     // 「就淡出」——不是硬切
let sakuraFx=null, sakuraSe=null;
export function spawnSakura(){
  if(sakuraFx) return;                       // 同一陣風不疊第二層（見上）
  sakuraFx = sakuraBurst({
    speed:2.2,        // 「速度調快點」：平移／亂流／翻轉一起放大（見 sakura.js 的 speed）
    density:1.35, emitMs:900, safetyMs:4000,
    /* ⚠⚠ **關在敵人框裡**（ver -899，Ray：「花瓣不要蓋到盤面」）：`#top` 是
       `position:relative; overflow:hidden`，掛進去就自然被裁在上半 ——
       玩家要一直讀數字盤，花瓣飄過去等於在攻擊他的眼睛。
       z-8 ＝與受擊特效層同層（在立繪之上、楣與 HUD 之下）。 */
    mount:$('top'), zIndex:8,
    onDone:()=>{ sakuraFx=null; },
  });
  /* 受擊音（ver -899，Ray：「只在第一 hit 播」）：一波三顆，但這一支「還在跑就
     直接 return」，所以它天生只響一次 —— 不必另外記「這是第幾下」。 */
  { const hit=asset('em_sakura'); if(hit) SFX.play(hit, sfxGain('em_sakura')); }
  const src=asset('se_sturm');
  if(!src) return;
  sakuraSe = SFX.playCue(src, sfxGain('se_sturm'));
  setTimeout(()=>{ if(sakuraSe){ try{ sakuraSe.stop(SAKURA_SE_FADE); }catch(_){} sakuraSe=null; } },
             SAKURA_SE_MS);
}
/* 收乾淨：換敵／離場時把還在飄的那一陣風與它的聲音一起收掉
   （§6.5.4 的檢查表：新增任何蓋在畫面上的層，先回答「換畫面時誰收它？」）。 */
export function stopSakura(){
  if(sakuraFx){ try{ sakuraFx.stop(); }catch(_){} sakuraFx=null; }
  if(sakuraSe){ try{ sakuraSe.stop(200); }catch(_){} sakuraSe=null; }
}
/* ══⚠⚠⚠ 放光（`holyburst`，ver -1351，Ray：「王座徘徊者的攻擊特效是放光，就是首頁
   點擊的那一個特效，範圍全畫面包括盤面，發動時全螢幕快速抖動」「發動點是頭部的光點」
   「音效用 enemy_firebeam」）══════════════════════════════════════════════════
   ⚠⚠ **光暈的配方是 `--holy-glow`**（開機那一頁的聖光綻放、安雅啟動祭壇那一拍
     ver -1185 都是同一份，鐵律 7）—— CSS 在 `#holyBurst`，這裡只負責圓心與大小。
   ⚠⚠ **圓心是「頭部的光點」**，逐張圖不同 ⇒ 寫在**敵人卡**上（`beamFrom:{x,y}`，
     那一張圖的比例，鐵律 1）。沒寫就退回圖框正中偏上（0.5, 0.25）——
     不要讓漏寫變成「從腳底放光」。
   ⚠⚠⚠ **要算 `object-fit:contain` 的留白**：`#enemyImg` 的元素框與**圖真正畫出來
     的那一塊**不一樣（卡上多半是 `fit:{mode:'contain'}`）。拿元素框去乘比例，
     圖越窄偏得越多 —— 這與 §6.5「立繪的錨是臉不是圖框」是同一族的坑。
   ⚠ 蓋滿全畫面的倍率照開機那一頁的算法（光暈實心區佔 30%，所以除以 0.30）。
   ⚠ 音效走 `playCue` 的把手**不是 `HITFX[].se`**：那支 6.7 秒、有頭有尾，
     而那張表是給一次性受擊音用的（combat 會直接播到底，收不掉）。 */
/* ⚠ ver -1418 放慢一半（Ray 指定）：550→1100／1350→2700。
   ⚠⚠ **ver -1433 再放慢一半**（Ray：「龍的攻擊光圈太快，再放慢 50%」）：
     1100→2200／2700→5400。
   與 CSS `#holyBurst` 的 transition 是同一組數字（鐵律 7 的但書）—— 改一邊要改另一邊。
   ⚠⚠ `modules/combat.js` 的 `HOLY_SWAP_MS`（型態切換等多久才換圖）**也是同一個數字**
     （＝綻放完、光蓋滿畫面的那一刻），三處要一起動。 */
const HOLY_GROW_MS = 2200;    // 與 CSS 的 transform transition 同一個數字
const HOLY_LIFE_MS = 5400;    // 綻放 ＋ 淡出
let holyFx=null, holySe=null;
export function spawnHolyBurst(){
  if(holyFx) return;                       // 同一發不疊第二層（同櫻花那一支）
  const img=$('enemyImg');
  const card=(GAME_CONFIG.enemies||{})[state.currentEnemyKey]||{};
  const bf=card.beamFrom||{ x:0.5, y:0.25 };
  const W=innerWidth, H=innerHeight;
  let cx=W*0.5, cy=H*0.28;
  if(img && img.naturalWidth){
    const r=img.getBoundingClientRect();
    /* contain 的實際畫面：等比縮到框內，四周留白。 */
    const k=Math.min(r.width/img.naturalWidth, r.height/img.naturalHeight);
    const dw=img.naturalWidth*k, dh=img.naturalHeight*k;
    /* `fit.pos` 多半是 `center bottom`／`center NN%` —— 橫向一律置中，
       縱向照 CSS 的 object-position 百分比擺（沒寫就當 50%）。 */
    const pos=(card.fit&&card.fit.pos)||'center bottom';
    const m=/(\d+(?:\.\d+)?)%/.exec(pos);
    const py = m ? (+m[1]/100) : (/bottom/.test(pos) ? 1 : /top/.test(pos) ? 0 : 0.5);
    const ox=r.left+(r.width-dw)/2, oy=r.top+(r.height-dh)*py;
    cx=ox+dw*bf.x; cy=oy+dh*bf.y;
  }
  const d=Math.max(90, Math.min(W,H)*0.22);
  const need=2*Math.hypot(Math.max(cx,W-cx), Math.max(cy,H-cy));
  const el=document.createElement('div'); el.id='holyBurst';
  el.innerHTML='<div class="hb-glow"></div>';
  el.style.left=cx+'px'; el.style.top=cy+'px'; el.style.width=d+'px'; el.style.height=d+'px';
  el.style.setProperty('--hb-scale', (need/d/0.30).toFixed(2));
  document.body.appendChild(el);
  holyFx=el;
  requestAnimationFrame(()=>el.classList.add('grow'));
  setTimeout(()=>{ el.classList.add('fade'); }, HOLY_GROW_MS);
  setTimeout(()=>{ if(el.parentNode) el.remove(); if(holyFx===el) holyFx=null; }, HOLY_LIFE_MS);
  /* 發動那一下的全螢幕快速抖動（Ray 指定）。⚠ 與玩家受擊的 `hitshake` 是兩件事，
     所以另一個 class —— 同時掛的話後宣告的贏，會把這一支吃掉。 */
  { const app=$('app');
    if(app){ app.classList.remove('beamshake'); void app.offsetWidth; app.classList.add('beamshake');
      setTimeout(()=>app.classList.remove('beamshake'), 400); } }
  const src=asset('em_firebeam');
  if(src){ try{ holySe = SFX.playCue(src, sfxGain('em_firebeam')); }catch(_){ holySe=null; } }
}
/* 收乾淨：換敵／離場（§6.5.4 的檢查表：新增任何蓋在畫面上的層，先回答「誰收它」）。 */
export function stopHolyBurst(){
  if(holyFx){ try{ holyFx.remove(); }catch(_){} holyFx=null; }
  if(holySe){ try{ holySe.stop(200); }catch(_){} holySe=null; }
  { const app=$('app'); if(app) app.classList.remove('beamshake'); }
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
     不經光圈的攻擊（劇情殺三擊那種）拿不到座標，照舊隨機。 */
  const pos = state.lastAssaultPos; state.lastAssaultPos = null;
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
/* 彈殼噴出（ver -808，Ray：「彈殼要有遠近感、飛速旋轉、掉出畫面外，角度幅度轉速隨機」）——
   ⚠ 舊版把彈殼掛在 `.cell`（`overflow:hidden`）上，所以「只在格子裡就消失」。改成掛在
     `document.body`、`position:fixed`（視窗座標，不被任何容器裁）→ 真的飛出畫面。
   遠近感＝飛出瞬間放大（--spop）再縮小（CSS shellEject）；角度/幅度/轉速全隨機。 */
export function ejectShell(cell){
  const r=cell.getBoundingClientRect();
  // side 由「這一格在盤面的哪一邊」決定（左排往左、右排往右，居中隨機）。
  const grid=cell.closest('#grid')||cell.parentNode;
  const gc=grid.getBoundingClientRect();
  const d=(r.left+r.width/2)-(gc.left+gc.width/2);
  const side=Math.abs(d)<4 ? (Math.random()<0.5?-1:1) : (d<0?-1:1);
  shellFrom(r.right-14, r.top+6, side);
}

/* ══ 從**一個點**拋殼（ver -1339，Ray：「BR 的彈殼是要從點擊處飛出，
   不是在盤面飛出」）══ 破防的開火點在敵人身上，殼就從那裡噴。
   ⚠ 左右由「這一點在畫面的哪一半」決定 —— 盤面那一支是拿盤心比，這裡沒有盤面可比。 */
export function ejectShellAt(x, y){
  const vw=window.innerWidth||390;
  const d=x-vw/2;
  shellFrom(x-7, y-7, Math.abs(d)<4 ? (Math.random()<0.5?-1:1) : (d<0?-1:1));
}

/* 拋殼的**唯一**實作（鐵律 8）：位置與左右由呼叫端決定，飛行的樣子只有這一份。 */
function shellFrom(left, top, side){
  const s=document.createElement('div'); s.className='shell';
  s.style.position='fixed'; s.style.left=left+'px'; s.style.top=top+'px';
  // ver -813（Ray：「主武器拋殼直接斜上低角度往兩邊噴就好」）——不再是高拋物線：
  // 直線斜上噴出畫面外。
  const vw=window.innerWidth||390;
  const dx=side*(vw*(0.7+Math.random()*0.5)+150);              // 一定飛出左／右畫面外
  const dy=-(50+Math.random()*140);                            // 斜上「低角度」：只往上一點（相對大 dx）
  const rot=(720+Math.random()*1080)*(Math.random()<0.5?-1:1); // 飛速旋轉（±720~1800°）
  const pop=1.4+Math.random()*0.6;                             // 遠近感：噴出瞬間放大
  s.style.setProperty('--sx', dx.toFixed(0)+'px');
  s.style.setProperty('--sy', dy.toFixed(0)+'px');
  s.style.setProperty('--srot', rot.toFixed(0)+'deg');
  s.style.setProperty('--spop', pop.toFixed(2));
  // 斜上直噴（shellSide）：單調不折返、ease-out 爆發感（不是拋物線，不會回頭往下）。
  s.style.animation='shellSide '+(0.5+Math.random()*0.22).toFixed(2)+'s cubic-bezier(.15,.7,.35,1) forwards';
  document.body.appendChild(s);
  setTimeout(()=>{ if(s.parentNode) s.remove(); }, 950);
}

/* 反擊彈殼（ver -812/-813，Ray）——從**反擊點**(x,y 視窗座標)噴，逐型別大小／顏色
   （opts.sc/sl/shotgun）；兩種軌跡：
     · 船戰（opts.down）＝**直接斜下拋、完全不往上**（直線 shellSide，--sy 正）。
     · 陸戰＝**往旁邊斜上噴、等速不減速、平滑弧線落下**（ver -813，Ray：「不減速不轉折
       畫一個弧落下」）——彈道拋物線由 el.animate 逐格算出、linear 播放：水平等速
       （不減速）、垂直先上後下的重力弧（不轉折）。 */
/* ══ 索菈娜共鬥反擊的飛刀（ver -839，Ray：「發動時從畫面外射出至反擊圈，刀最好能
   做一些變型來做角度變化，每次 3 hits，每 0.2 秒 1 hit」）══
   從畫面外（左右輪替、略低的位置＝索菈娜擲出）直線射向反擊圈：元素 rotate 對齊
   飛行方向（素材刀尖朝下＝方向 +90°），每一刀隨機起點/尺寸/微傾（「變型」），
   走 el.animate（linear＝擲出等速）。**命中那一刻**閃一圈 .dagger-hit 並呼叫
   onHit —— 傷害與命中音的時刻由這裡唯一決定（鐵律 7），呼叫端不自己抓秒數。
   ⚠ 素材是黑底光暈圖，CSS 走 mix-blend-mode:screen（黑自然消失，同星芒那條）。 */
const DAGGER_MS = 150;   // 飛行時間（毫秒）
export function throwDagger(x, y, onHit){
  const W=window.innerWidth||390;
  const el=document.createElement('img');
  el.src=asset('vfx_dagger'); el.className='dagger-fly';
  const side=((throwDagger._n=((throwDagger._n||0)+1))%2) ? -1 : 1;   // 左右輪替
  const sx=W/2 + side*(W*0.62+Math.random()*80);
  const sy=y + 260 + Math.random()*160;
  const ang=Math.atan2(y-sy, x-sx)*180/Math.PI;
  const rot=ang-90;                                   // 刀尖朝下＝+90°，轉到飛行方向
  const wob=Math.random()*26-13;                      // 角度變化
  const scl=(0.85+Math.random()*0.35).toFixed(2);
  document.body.appendChild(el);
  try{
    el.animate([
      { transform:'translate('+sx+'px,'+sy+'px) rotate('+(rot+wob)+'deg) scale('+scl+')', opacity:0.85 },
      { transform:'translate('+x+'px,'+y+'px) rotate('+(rot+wob*0.25)+'deg) scale('+scl+')', opacity:1 },
    ], { duration:DAGGER_MS, easing:'linear', fill:'forwards' });
  }catch(_){ el.style.transform='translate('+x+'px,'+y+'px) rotate('+rot+'deg)'; }
  setTimeout(()=>{
    if(el.parentNode) el.remove();
    const hit=document.createElement('div'); hit.className='dagger-hit';
    hit.style.left=x+'px'; hit.style.top=y+'px';
    document.body.appendChild(hit);
    setTimeout(()=>{ if(hit.parentNode) hit.remove(); }, 320);
    if(onHit) onHit();
  }, DAGGER_MS);
}
export function ejectCounterShell(x, y, opts){
  opts = opts || {};
  const s=document.createElement('div'); s.className='shell'+(opts.shotgun?' shotgun':'');
  s.style.position='fixed'; s.style.left=(x-8)+'px'; s.style.top=(y-8)+'px';
  if(opts.sc!=null) s.style.setProperty('--sc', String(opts.sc));
  if(opts.sl!=null) s.style.setProperty('--sl', String(opts.sl));   // 只拉長長邊（爆發型 1.3×）
  const H=window.innerHeight||760;
  // 方向：opts.dir 指定就用它（連射型陸戰一律往右＝+1，ver -814），否則隨機。
  const dir=(opts.dir!=null) ? opts.dir : (Math.random()<0.5?-1:1);
  const rot=(540+Math.random()*900)*(Math.random()<0.5?-1:1);
  const pop=1.4+Math.random()*0.6;
  const dyDown=(H-y)+90+Math.random()*180;               // 一路往下落出畫面外

  if(opts.down){
    // 船戰：直接斜下拋，完全不往上——直線 shellSide、--sy 為正。
    s.style.setProperty('--sx', (dir*(100+Math.random()*180)).toFixed(0)+'px');
    s.style.setProperty('--sy', dyDown.toFixed(0)+'px');
    s.style.setProperty('--srot', rot.toFixed(0)+'deg');
    s.style.setProperty('--spop', pop.toFixed(2));
    s.style.animation='shellSide '+(0.55+Math.random()*0.28).toFixed(2)+'s cubic-bezier(.2,.65,.4,1) forwards';
    document.body.appendChild(s);
    setTimeout(()=>{ if(s.parentNode) s.remove(); }, 1250);
    return;
  }

  // 陸戰：彈道拋物線——往旁邊斜上噴（水平等速）＋重力弧落下。
  const sx=dir*(120+Math.random()*150);                  // 往旁邊（水平總位移，等速）
  const apexUp=55+Math.random()*70;                      // 斜上 launch 的頂高
  const fa=0.30;                                         // 頂點落在 30% 行程
  const A=(fa*dyDown + apexUp)/(fa*(1-fa));              // y(f)=A f²+B f 過 (0,0)(fa,-apexUp)(1,dyDown)
  const B=dyDown-A;
  const N=18, frames=[];
  for(let i=0;i<=N;i++){
    const f=i/N;
    const tx=(f*sx).toFixed(1);
    const ty=(A*f*f+B*f).toFixed(1);
    const rz=(f*rot).toFixed(0);
    const sc=(f<0.18 ? 0.8+(pop-0.8)*(f/0.18) : pop+(0.55-pop)*((f-0.18)/0.82)).toFixed(3);
    const op=(f<0.72 ? 1 : 1-(f-0.72)/0.28*0.65).toFixed(2);
    frames.push({transform:`translate(${tx}px,${ty}px) rotate(${rz}deg) scale(${sc})`, opacity:op});
  }
  s.style.animation='none';
  document.body.appendChild(s);
  const anim=s.animate(frames, {duration:(880+Math.random()*260), easing:'linear', fill:'forwards'});
  anim.onfinish=()=>{ if(s.parentNode) s.remove(); };
  setTimeout(()=>{ if(s.parentNode) s.remove(); }, 1400);
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
/* ⚠ `aerial`＝飛行敵人（ver -869，Ray：「不要跑 harm，擊敗一樣寫淨化」）——
   羽蛇/蜈蚣分類獨立出來，但降臨與淨化**兩個演出都照禍魘那一套**（牠們本來就是
   空中的禍魘，只是不再擠 harm 這一格）。 */
const PURIFY_KINDS = { harm:1, slay:1, aerial:1 };
/* ⚠⚠ **登場特效比淨化死法多一類：船（ver -787，Ray：「每一個船戰的敵人都會有出場
   特效，每次都要播」）**。降臨（rise＋震動＋衝擊波）與淨化（死亡散白光）本來共用
   `PURIFY_KINDS`，但 Ray 要**所有船戰敵人**都有登場震動衝擊波 —— 空賊船 `kind:'ship'`
   不是禍魘（死掉不該散白光），所以只把它加進**登場**這一類，**淨化死法維持
   harm/slay**。羽蛇／蜈蚣是 `harm`，本來就在登場類裡（＝「每次都播」已成立）。 */
/* 登場音的**唯一**播放點（ver -948）：路徑在 `/vo/` 底下就走語音那一軌
   （`playVoice` 會過 `voiceChain`、吃 VO 的分層音量），否則走 SE。
   ⚠ 判**路徑**不判鑰匙前綴：鑰匙的命名不是每一個都守規約（`sfx_saint` 就不是
     `se_` 開頭），而路徑是實際檔案住哪一層 —— 那才是「它是不是語音」的事實。 */
function playEntranceSe(key){
  if(!key) return;
  const p = asset(key);
  if(!p) return;
  try{
    if(/\/vo\//.test(p)) SFX.playVoice(p, sfxGain(key));
    else                  SFX.play(p, sfxGain(key));
  }catch(_){}
}
/* ⚠⚠⚠ `multi`＝**多型態 BOSS 的中間型態**（ver -1413，Ray：「王座徘徊者前兩型態的
   kind 定為 multi，戰勝後綴為王座徘徊者已擊退」）——
   **有降臨、沒有淨化**，而且那是刻意的：
     · **降臨** —— 牠每一型態都是從天而降的（照樣要震、要衝擊波）。
     · **淨化** —— 淨化是「散成白光消失」＝死了。這兩型態是**被打退**的，腳本下一句
       就是索菈娜的「喔，逃了！」—— 散白光等於把後面那一場的戲先講完。
   ⚠ 最後一型態（`bl_dragon_sky`）仍是 `aerial` —— 那一場才是真的擊墜。

   ⚠⚠⚠ **ver -1414 更正（Ray：「戰鬥中不播降臨，劇情出場時播」）**：
     `multi` **兩張表都不進**。-1413 我把它放進登場那一類是錯的 ——
     牠在劇情裡已經轟轟烈烈降下來過一次了（祭壇那一拍：`cgBackRise` ＋ 龍犼 ＋ 震動），
     開打再降一次等於同一件事演兩遍，而且第二遍沒有戲劇理由。
     · **降臨** → 搬到劇情那一側（`story.js` 的 `cgBackRise`，**同一組 CSS keyframes**）
     · **淨化** → 還是不給（牠是被打退的，不是被打死的）
   ⚠ 判準因此變成一句話：**「牠是在劇情裡出場的嗎？」**——
     是的話降臨歸劇情，戰鬥只負責打。野怪沒有劇情出場，照舊在戰鬥裡降。 */
const ENTRANCE_KINDS = { harm:1, slay:1, ship:1, aerial:1 };
function isPurify(){
  const en = GAME_CONFIG.enemies[state.currentEnemyKey];
  /* `purgeFx:1`＝卡上的**明寫例外**（ver -874，Ray：「鹿主被消滅走禍魘拉長特效」）
     —— 樹靈鹿主是 beast（副標「已獵殺」），只有死法借禍魘那一套。
     ⚠ 這不是「要不要播特效」的第二個真相：kind 仍是預設判定，這一格只給
       「分類與演出要分家」的個案用（同 aerial 分家的精神），能不寫就不寫。 */
  return !!(en && (PURIFY_KINDS[en.kind] || en.purgeFx));
}
const RISE_DELAY_MS = 120;      // 背景先出的那一拍（讓玩家看得到「那裡本來就有個地方」）
/* 落地的時刻（毫秒）。⚠ **必須對上 CSS `enemyRise` 的 78% 那一格**
   （0.9s × 0.78 = 702ms）—— 改一邊要改另一邊（ver -640）。 */
const LAND_AT = 702;
/* ⚠⚠ 著地的計時器要**掛在模組上**不是掛在 `rise` 那個閉包上（ver -640）：
   `loadEnemyPortrait` 每次呼叫都會做一個新的 `rise`，掛閉包等於每一次都是新的
   計時器，前一次的取消不掉 —— 實測換一次敵人就疊出**兩圈**落地光。 */
let landT = 0;
/* ⚠⚠⚠ **上一隻還在路上的降臨要取消掉**（ver -659（-893 前用詞），Ray：「我現在打靶還是有降臨特效」）。
   降臨是**延後**執行的（`setTimeout(rise, RISE_DELAY_MS)`，圖還沒載到時再等 `onload`）——
   而 `startGame` 會先擺一隻預設的怪、再換成這一場真正的那一隻。於是：
     ① setEnemy(聖徒) → 排了一個 rise ② setEnemy(靶) → 清掉 class、依 kind 不排 rise
     ③ ①那個 timeout 到期 → **把 `enemy-rise` 加到靶身上**
   `kind` 的守門完全正確，錯的是「沒有取消上一次的延後」——
   這與 §6.5「上場是延後執行的，所以撤場一定要把那個延後取消掉」是同一條。
   ⚠ 三樣都要收：`setTimeout` 的握把、`onload` 的回呼、著地的計時器。 */
let riseT = 0;
/* ══⚠⚠ 降臨的「等門開」（ver -875（-893 前用詞），Ray：「鹿主在進入戰鬥前開門瞬間不存在，
   要 harm 出來」）══ 走 Kerberos 之門的場次，battleHandler 在門**開到縫**（onGap）
   就開戰——降臨 0.9 秒在門還蓋著時演完，玩家看到的是「門一開怪已經站好」。
   門路徑開戰前 holdRise()（main 的 battleHandler／bootBattleGate），門全開
   releaseRise()（story 的 gateOpened 掛鉤）才起演——**押的是圖也押演出**：
   held 期間立繪先不掛 src（門開前那一格不能已經站著），release 那一刻掛圖＋降臨。
   ⚠ 沒被 hold 的路徑（出陣／亂入／連戰換敵）行為不變。
   ⚠ release 沒來的保險：hold 起 10 秒自動放行（圖照樣出，只是降臨晚了）。 */
let riseHeld=false, risePending=null, riseHoldT=0;
export function holdRise(){
  riseHeld=true; risePending=null;
  /* 押住那一刻把場上的圖清空（ver -875 實測：門開瞬間殘著開機預設的舊敵圖）——
     「開門瞬間不存在」是這一整套的目的，殘影等於沒押。 */
  const eImg=$('enemyImg');
  if(eImg){ eImg.onload=null; eImg.removeAttribute('src');
            eImg.classList.remove('enemy-rise','enemy-purge'); }
  clearTimeout(riseHoldT);
  riseHoldT=setTimeout(()=>{ if(riseHeld) releaseRise(); }, 10000);
}
export function releaseRise(){
  riseHeld=false; clearTimeout(riseHoldT); riseHoldT=0;
  if(risePending){ const f=risePending; risePending=null; f(); }
}
export function loadEnemyPortrait(en){
  const eImg = $('enemyImg');
  if(!eImg) return;
  clearTimeout(riseT); riseT=0;
  clearTimeout(landT); landT=0;
  risePending=null;
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
           · **船戰敵人**（羽蛇／蜈蚣／空賊船）＝卡上各自的 `entrance`（每隻獨立）。
           · **陸戰禍魘／聖徒**＝沒有 `entrance`，退回 `sfx_saint`（＝se_saintinstall
             鐘聲，ver -649 的原音）。
           ⚠ -773 曾把預設改成「自己的攻擊音 `sound.ult`」——但 `sound.ult` 正是玩家
             被那隻怪打到的**受擊音**，套到陸戰的登臨就變成受擊音（Ray 回報）。所以
             **拿掉那個 fallback**：船戰各自的登場音一律寫成卡上的 `entrance`（資料驅動，
             鐵律 1），陸戰一律鐘聲。 */
        playEntranceSe(state.curEnemyEntranceSe || 'sfx_saint'); }
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
  /* ══⚠⚠ **登場音只有一格**（ver -948，Ray：「entranceVo 跟 landSe 應該是同一時間
     發生，併為一格」）══ 卡上寫 `entrance`，播的**時機由這隻怪自己決定**：
       · 有降臨的（`ENTRANCE_KINDS`：禍魘／聖徒／船）→ **著地那一刻**（見上面 landT）
       · 沒有降臨的（human…）      → **立繪出現那一刻**
     —— 兩者對玩家而言就是同一件事（「牠登場了」），所以資料上不該是兩格。
     ⚠ **走哪一軌是算出來的**（`playEntranceSe`）：路徑落在 `/vo/` 就走 `playVoice`
       （過 voiceChain、算 VO 那一層），否則走 `play`（SE 那一層）。
       §6.6 的命名規約本來就是 `vo_<角色>_<技能>`，所以不必再開一格「這是語音嗎」。
     ⚠ 沒寫＝有降臨的退回 `sfx_saint`（鐘聲），沒降臨的就沒有聲音。 */
  const playEntranceVo = (en && en.entrance)
    ? (()=>playEntranceSe(en.entrance)) : null;
  /* ⚠ 不在登場類就不演降臨（ver -657；-787 登場類含 ship）：立繪載到就直接在那裡。
     ⚠ 判定用**傳進來的這張卡**不是查 state：`setEnemy` 在寫
       `state.currentEnemyKey` 之前就可能叫到這裡，問 state 會問到上一隻。
     ⚠⚠⚠ **「不降臨」的規格（ver -1414，Ray 定案）：「槍棺開的時候就在那裡了，
       推上前就暖讀圖」** —— 它不是「少播一個動畫」，是**門一開牠已經站好**。
       兩件事撐起這句話，缺一個都會變成「空戰場，然後怪啪一聲貼上去」：
         ① **這一支立刻掛 `src`，不受 `riseHeld` 押住**（下面那個 `riseHeld` 分支
            只罩降臨那一條）—— 而 `holdRise()` 是在 `startGame` 之前叫的，
            所以掛上去的那一刻門還關著，時機天生就對。
         ② **圖要先暖好**：`combat.warmBattleImage`，由戰鬥那道門
            （`main.enterBattleAssets`）在**推棺之前**呼叫。 */
  if(!ENTRANCE_KINDS[en && en.kind]){
    /* ⚠⚠ **`entranceShake:true` ＝牠一出現就震一下畫面**（ver -1433，Ray：「（龍）
       每次出現都要有龍吟跟畫面震動」）—— 龍是 `kind:'multi'`（不走降臨），
       而降臨那一條的著地震動掛在 `landT` 裡，這條路上沒有人震。
       ⚠ 震動走**同一支** `api.screenShake`（鐵律 8）：與降臨的著地、玩家受擊
         是同一個鏡頭震動，不另外寫一個。
       ⚠ 龍吟就是卡上的 `entrance`（登場音那一格）—— 不另開欄位。 */
    const arrive=()=>{
      if(playEntranceVo) playEntranceVo();
      if(en && en.entranceShake && api.screenShake) api.screenShake();
    };
    /* ══⚠⚠⚠ **音與震要等門開**（ver -1441，Ray：「龍每次出場畫面都要震動，
       為什麼播了音就不震，震了就不播？」）══
       兩件事**一直都是一起發的**（就在上面那一支裡）—— 看不到震動的原因是**時機**：
       這一支跑在 `startGame` 那一刻，而那時 `#storyStage.on` 還蓋著，
       **`#app` 整層 `visibility:hidden`**（鐵律 10）—— 震動照樣跑完了，
       只是沒有人看得到；聲音不受 `visibility` 影響，所以「只聽得到聲音」。
       ⇒ 掛進既有的 `risePending`（＝門全開才放行的那一支，`releaseRise`）：
         **圖照舊立刻掛**（-1414 的「槍棺開的時候就在那裡了」不變），
         只有音與震延到門開的那一刻。
       ⚠ 已經放行了（`riseHeld` 是 false，例如不走門的路徑）就當場發，行為不變。 */
    const fire=()=>{ if(riseHeld) risePending=arrive; else arrive(); };
    eImg.onload = ()=>{ eImg.onload=null; fire(); };
    eImg.src = enemyImage(en);
    if(eImg.complete && eImg.naturalWidth){ eImg.onload=null; fire(); }
    return;
  }
  const arm=()=>{ eImg.onload=null; clearTimeout(riseT); riseT=setTimeout(rise, RISE_DELAY_MS);
                  if(playEntranceVo) playEntranceVo(); };
  const mount=()=>{
    eImg.onload = arm;
    eImg.src = enemyImage(en);
    if(eImg.complete && eImg.naturalWidth) arm();
  };
  /* 押住＝連圖都先不掛（門開前那一格不能已經站著）；release 那一刻掛圖＋降臨。
     圖先在背景預熱（new Image），release 時大多已解碼完、rise 不會等載入。 */
  if(riseHeld){
    try{ const warm=new Image(); warm.src=enemyImage(en); }catch(_){}
    risePending=mount;
    return;
  }
  mount();
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
/* ══⚠⚠⚠ **它為什麼曾經「整個不見」**（ver -1007 查到／-1008 定案）══
   演出本身沒壞（class 掛得上、18 顆星芒也生得出來）—— 壞的是**可見性**：
   `combat.win()` 在這一支的**同一拍**就叫 `story.playKerberosClose`，而那一支開頭
   就 `#storyStage.on`，CSS 的 `body:has(#storyStage.on) #app{visibility:hidden}`
   （鐵律 10，ver -849）當場把整個戰鬥層藏起來、連動畫都 paused。
   ⚠ 只在**劇情／城鎮戰**成立（那條路才走槍棺關門）；試玩版「挑戰」走
     `playTransition`，`#app` 不會被藏 —— 所以那邊一直是好的，也因此一直沒被發現。
   ⚠ 修在 style.css：門開著的那幾秒（`#storyStage.kerb-open`）把戰鬥層露回來
     —— 那本來就是那一段 CSS 的原意（「縫裡要露出底下的戰鬥畫面」）。
   ⚠⚠ **不要改成「等淨化演完再關門」**（-1007 試過，Ray 退回）：怪一散開，
     卡上自帶背景的那幾隻就會露出一張空背景。淨化 600ms、兩扇合上 900ms，
     **同時演**本來就演得完。 */
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
/* ⚠⚠⚠ `opts.noArt` ＝**只填資料，不載立繪**（ver -1321，Ray：「不進挑戰就不要
   跑那張圖」）。唯一的用途是開機那一次（`applyConfigToDOM`）——`bootIdle` 要的是
   盤面與血條，不是敵人立繪。
   ⚠⚠ 為什麼這件事會咬人：`#enemyImg` 住在 `#app`，而 `#app` **只靠別的層蓋著**
     才看不到（`#storyStage.on` 時 `visibility:hidden`）。任何「上一層收掉了、
     下一層還沒蓋滿」的空窗就會露出它 —— 實測讀取頁是**淡入**的，
     有 ~96ms 完全透明 ＋ 約 240ms 半透明。Ray 看到的「挑戰畫面的地下聖徒在
     讀取間隙一閃而過」就是這個。
   ⚠ 真的要打的時候照舊會載：`combat.startGame` 一定會再 `setEnemy()` 一次。 */
/* ══⚠⚠⚠ 敵人立繪的「身體遮罩」——破防瞄準點要落在**敵人身上**，不是背景
   （ver -1332，Ray：「準心要集中在敵人身上而不是背景」）════════════════════════
   作法：把 `#enemyImg` 縮到 40×40 畫進離屏畫布，讀 alpha —— **alpha 夠高的那些格
   就是敵人**（那批立繪是去背的）。挑一格、在格內隨機一點，再照 `object-fit` 換算成
   畫面上的百分比。

   ⚠⚠ **沒有 alpha 的圖（.jpg 那種整張都是畫的）回 null**：那種圖「哪裡是敵人」
     根本問不出來，硬挑會把點撒得到處都是。呼叫端自己退回中央帶（見 weapon）。
   ⚠ 遮罩**逐圖快取**（鑰匙＝`currentSrc`）：一場戰鬥會開好幾次窗，每次重畫一次
     canvas 是白花的；換敵人時 src 一變就自動失效。
   ⚠ canvas 被跨網域污染就放棄（同 `tone.js` 的作法）—— 不要讓它把整個窗口弄掛。
   ⚠ 換算要照 `object-fit`／`object-position` 走（現行是 `cover` ＋ `center top`）：
     圖是被裁切過的，直接拿 0~1 當螢幕比例會整個偏掉。 */
const BODY_N = 40;                 // 取樣格數（40×40）
let bodySrc = '', bodyCells = null;

function buildBodyMask(){
  const img = $('enemyImg');
  const src = (img && (img.currentSrc || img.src)) || '';
  if(!img || !src) return null;
  if(src === bodySrc) return bodyCells;          // 快取命中（含「這張沒 alpha」的 null）
  if(!img.complete || !img.naturalWidth) return null;   // 還沒載完 → 這一次先不用
  bodySrc = src; bodyCells = null;
  try{
    const c = document.createElement('canvas'); c.width = c.height = BODY_N;
    const g = c.getContext('2d', { willReadFrequently:true });
    g.drawImage(img, 0, 0, BODY_N, BODY_N);
    const d = g.getImageData(0, 0, BODY_N, BODY_N).data;
    const at = (x,y)=>{ const i=(y*BODY_N+x)*4; return [d[i],d[i+1],d[i+2],d[i+3]]; };
    const cells = []; let transparent = 0;
    for(let y=0; y<BODY_N; y++) for(let x=0; x<BODY_N; x++){
      const a = at(x,y)[3];
      if(a < 250) transparent++;
      if(a >= 200) cells.push([x, y]);
    }
    if(transparent > BODY_N*BODY_N*0.06 && cells.length > 20){
      bodyCells = cells;                    // 去背圖：alpha 就是答案（94 張裡有 75 張）
    }else{
      /* ══ 沒去背的那 19 張（jpg／船／蜈蚣那一族）══ alpha 問不出東西，改問**顏色**：
         取最外一圈當「背景色」，離它夠遠的格子就是主體。
         ⚠ 用「離背景多遠」不是「夠不夠亮」：亮度法只對「白怪配暗背景」成立，
           反過來（暗怪配亮背景）會把整片背景挑出來。 */
      let br=0,bg2=0,bb=0,n=0;
      for(let x=0;x<BODY_N;x++) for(const y of [0,1,BODY_N-2,BODY_N-1]){
        const p=at(x,y); br+=p[0]; bg2+=p[1]; bb+=p[2]; n++;
      }
      for(let y=2;y<BODY_N-2;y++) for(const x of [0,1,BODY_N-2,BODY_N-1]){
        const p=at(x,y); br+=p[0]; bg2+=p[1]; bb+=p[2]; n++;
      }
      br/=n; bg2/=n; bb/=n;
      /* ⚠⚠ 不是「超過門檻就算」，而是**取差距最大的那一撮**（前 25%）：
         像 `Saint_UG_CI.jpg` 那種「整幅畫」（地牢背景＋白色聖徒都在同一張 jpg 裡），
         連牆壁都比邊框亮一點 —— 只看門檻會把牆also挑進來，點就撒得到處都是。
         排序取頭段會集中在**真的最突出的那一塊**（那張圖就是聖徒本體）。 */
      const scored=[];
      for(let y=0;y<BODY_N;y++) for(let x=0;x<BODY_N;x++){
        const p=at(x,y);
        const dist=Math.hypot(p[0]-br,p[1]-bg2,p[2]-bb);
        if(dist > 60) scored.push([x,y,dist]);
      }
      scored.sort((a,b)=>b[2]-a[2]);
      const keep=Math.max(24, Math.round(scored.length*0.25));
      const far=scored.slice(0, keep).map(v=>[v[0],v[1]]);
      /* 太少（幾乎沒有主體）或**太多**都不可信 —— 後者的實例是蜈蚣與海盜船那一族：
         背景是**有雲的天空**，雲跟邊框差很遠，於是整片天都被判成主體（實測佔 59~63%）。
         上限收在 45%：聖徒 21%／槍之魔女 15％／貝琳達 34% 都留得住，
         那兩張天空的被擋掉 → 回去用隨機矩形（那種圖本來就是怪佔滿整幅，
         隨機撒也多半在怪身上）。 */
      /* ⚠⚠ 這個判斷要看**沒被削過的** `scored.length`（主體佔多大），不是 `far.length`
         —— `far` 已經是前 25%，拿它去比永遠都會過，天空那兩張就漏回來了。 */
      const tot=BODY_N*BODY_N;
      bodyCells = (scored.length > tot*0.04 && scored.length < tot*0.45) ? far : null;
    }
  }catch(_){ bodyCells = null; }
  return bodyCells;
}

/* 回一個落在敵人身上的點：`{l,t}` ＝ `#top` 的百分比；問不出來就回 null。 */
export function randomBodyPoint(){
  const cells = buildBodyMask();
  const img = $('enemyImg');
  if(!cells || !cells.length || !img) return null;
  const W = img.clientWidth, H = img.clientHeight;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  if(!W || !H || !iw || !ih) return null;
  const cs = getComputedStyle(img);
  const mode = cs.objectFit || 'cover';
  const scale = (mode === 'contain') ? Math.min(W/iw, H/ih)
              : (mode === 'none')    ? 1
              :                        Math.max(W/iw, H/ih);       // cover（預設）
  const dw = iw*scale, dh = ih*scale;
  /* object-position：computed 多半已經是百分比（"50% 0%"）；認不得就用 CSS 的預設
     `center top`（＝50% 0%）。 */
  const pos = (cs.objectPosition || '50% 0%').split(/\s+/);
  const pct = (v, d)=>{ const m = /^(-?[\d.]+)%$/.exec(v||''); return m ? +m[1]/100 : d; };
  const px = pct(pos[0], 0.5), py = pct(pos[1], 0);
  const offX = (W - dw)*px, offY = (H - dh)*py;
  const [cx, cy] = cells[(Math.random()*cells.length)|0];
  const u = (cx + Math.random())/BODY_N, v = (cy + Math.random())/BODY_N;
  const sx = offX + u*dw, sy = offY + v*dh;
  if(sx < 0 || sy < 0 || sx > W || sy > H) return null;   // 被裁掉的那一塊 → 這次不算
  return { l: sx/W*100, t: sy/H*100 };
}

export function setEnemy(key, opts){
  const en = GAME_CONFIG.enemies[key];
  if(!en) return;
  stopSakura();                                 // 換了一隻怪 → 上一隻的櫻花與 Sturm 一起收（ver -899）
  stopHolyBurst();                              // 同上：放光也是全螢幕的層＋一支還在響的音（ver -1351）
  state.currentEnemyKey = key;                 // 3.7：記住目前怪 key，供 boardGridFor 查每盤格數
  state.enemyHitsTaken = 0;                     // 換了一隻怪 → 「這一隻」的受擊數歸零（九階「方舟」，ver -708）
  /* 這一局的出場帳（ver -921，Ray：「好感度給出場數最多的那一位全拿」）——
     記在**現在出場的那一位**頭上。⚠ 掛在這裡是因為 `setEnemy` 就是「一場」的
     唯一邊界（§0.5）：連戰換第二隻也走這一支，那確實是新的一場。 */
  addPartnerFight(state.pickedPartner);
  initEnemyHp(en.hp);                           // 3.2：敵血基準（載入時 setter）
  state.ASSAULT_DAMAGE = en.attack;                 // 3.3：大絕單擊傷害
  /* 蓄力秒數。⚠ 卡上可以給**區間**（`[3,5]`，ver -423 的巨型蜈蚣）——
     那時候每次排程各自擲一次（見 `defense.scheduleAssault`），所以這裡存的是整個欄位。 */
  state.CHARGE_SECONDS = (en.atkInterval!=null) ? en.atkInterval : GAME_CONFIG.tuning.chargeSeconds;
  /* 這一隻的「打起來的手感」欄位（ver -423 的敵人卡）。⚠ 一律**每次換敵都寫**，
     沒寫要寫回預設 —— setEnemy 是連戰換敵也會走的（同下面那組絕對值的理由）。 */
  /* ══⚠⚠ **主武器（普攻）的增減傷改叫 `Ganymede`**（ver -949，Ray：「把原本的 resist
     換成 ganymede，把他拿去跟副武的系統放一起」）══ 它與三把副武器的 `weaponMod`
     是**同一排**：正＝增傷、負＝抗性減傷，一律加法。
     ⚠ 取代舊的 `resist{basic}`／`weak{basic}`：那一套的鑰匙是「傷害來源」，
       而玩家看得到的其實是「哪一把槍打得動牠」——同一件事用兩套表達（鐵律 7）。
     ⚠ 舊的 `weak{counter:1}`（不分槍、反擊一律加倍）已折進那三張卡的 weaponMod
       三把各 +1（-949 遷移），行為等值。 */
  state.enemyGanymede  = (en.Ganymede != null) ? en.Ganymede : 0;
  /* 副武器調整（ver -796，Ray：一欄搞定）：`weaponMod:{ 類別:[傷害, 迴避] }` ——
     [0]傷害＝反擊增傷率（正）/抗性減傷率（負），加法；[1]迴避＝額外 miss 率(0~1)，加法。 */
  state.enemyWeaponMod = en.weaponMod || null;
  state.enemyNoStack   = !!en.noStack;
  /* ⚠ ver -947 移除 `counterBuff` / `counterStun` / `dualBonus`（Ray 定案）：
     · 反擊後的普攻增益改成**全域一套**（3 秒 ×2，`tuning.atkBuffSeconds`）——
       逐卡再寫一份就是同一個量兩個計算點（鐵律 7），而且卡上的 `mult` 從來沒被讀過。
     · **反擊硬直（`counterStun`）整個拿掉**（Ray：「完美反擊後那隻 3 秒不出手，
       邏輯本身就不對，空戰要靠反擊打傷害，他不出手怎麼反擊？」）—— 獎勵不該
       把玩家的輸出來源關掉。
     · `dualBonus` 由卡上的欄位改成**船戰的規則**（見 combat.applyEnemyMods）。 */
  /* 反擊硬直（ver -495，Ray：「被反擊時延時歸零；預設為 1，0 的話就算被反擊
     延時計時也不會歸零」）。卡上沒寫＝1（會硬直）。判定在 defense 的反擊分支。 */
  state.enemyCounterStagger = (en.counterStagger!=null) ? en.counterStagger : 1;
  /* ══ 主動攻擊三分（ver -801，Ray 定案）══
     · `assaultEvery:[min,max]`（秒）＝**頻率**（多久發一次；全卡必填）。
     · `assault:{ count, gap }`＝**一般主動攻擊**的形狀：一波幾顆、每顆間隔秒
       （取代舊的 Boss `ult:{shots,gapMs}`；沒寫＝1 顆）。
     · `ult:{ hp, count, gap, cd }`＝**血量門檻的特殊波**（hp% 以下改走它；沒有就 `{}`）。
     三者分開：頻率／一般形狀／門檻波。 */
  const asl = en.assault || {};
  const u   = en.ult || {};
  state.ASSAULT_SHOTS  = (asl.count!=null) ? asl.count : 1;
  state.ASSAULT_GAP_MS = (asl.gap!=null)   ? asl.gap*1000 : 0;
  const ue = Array.isArray(en.assaultEvery) ? en.assaultEvery : [4,8];   // 沒填＝退回 4~8 秒
  state.ASSAULT_MIN    = ue[0]*1000;
  state.ASSAULT_MAX    = ue[1]*1000;
  /* ══⚠⚠⚠ **大絕（`ult`）：每張卡都有，`on` 是總開關**（ver -939，Ray：「每張敵人卡
     都要有 ult 選項，先設 01 開關，為 1 再設定發動條件血量低於 %、幾個圈、
     每個圈 atk 多少、每個圈隔多久、cd 多久」）══
       `ult:{ on:0 }`                                        ＝這隻沒有大絕
       `ult:{ on:1, hp:40, count:4, atk:20, gap:0.4, cd:4 }`  ＝血 ≤40% 起，一波 4 顆、
         每顆隔 0.4 秒依次出現、**每顆打 20**、整波之間 CD 4 秒。
     ⚠⚠ **判斷看 `on` 不看「有沒有寫 hp」**（-939 之前是後者）：欄位現在每張卡都在，
       用「有沒有寫」判等於沒有開關 —— 填了數值忘了開、或關掉卻沒清欄位，兩種都會
       變成「看起來關著其實開著」（鐵律 9：狀態要有一個明確的擁有者，這裡就是 `on`）。
     ⚠ `cd` 沒寫＝照常規頻率（`assaultEvery`）。`act` 是具名波的舊路（ULT_ACTS），保留。
     ⚠ `atk` 由 defense 的 `ringDamage()` 讀（一個計算點）——這裡只搬過去。 */
  state.enemyUltAct = (u.on==1) ? {
    hp:    u.hp||0,
    act:   u.act||null,                          // 具名波（相容舊 ring4）；沒寫走 count/gap
    count: (u.count!=null) ? u.count : 4,
    atk:   (u.atk!=null)   ? u.atk   : 0,        // 0＝沒指定，退回這隻的一般攻擊力
    gapMs: (u.gap!=null)   ? u.gap*1000 : 0,
    cdMs:  (u.cd!=null)    ? u.cd*1000  : null,
  } : null;
  /* ══⚠⚠ 開場第一發**主動攻擊**的延遲（ver -795 立；**-931 由 `openUlt` 改名**）══
     Ray：「openUlt 全部改名為 openAssault」「**ult 歸 ult 不要混用**」
          「**assault 是普攻，ult 是特殊情形觸發的大絕**」
     —— 這一格排的是**一般主動攻擊**（`assault` 那一族）的第一發，不是門檻波，
     所以舊名 `openUlt` 從一開始就掛錯家族。卡上寫 `openAssault:[1,2]`（**秒**），
     沒寫＝預設 1~2 秒隨機；以前是全域寫死 0~3 秒（defense 的 ULT_OPEN_MS）。
     ⚠ ver -932 起**引擎內部也一起正名**（Ray：「全改吧，不然我手動改的時候常常疑惑」）：
       `ULT_*` → `ASSAULT_*`、`scheduleUlt` → `scheduleAssault`、`ultEvery` → `assaultEvery`…
       整條路上現在只剩**血量門檻的特殊波**還叫 ult（`enemyUltAct`／`ULT_ACTS`／
       卡上的 `ult:{hp,…}`）—— 那才是真的大絕。 */
  const oue = Array.isArray(en.openAssault) ? en.openAssault : null;
  state.ASSAULT_OPEN_MIN = oue ? oue[0]*1000 : 1000;
  state.ASSAULT_OPEN_MAX = oue ? oue[1]*1000 : 2000;
  const dp = en.delayPenalty || {};              // 3.3：延時懲罰縮放（Boss=0.5 / -1）
  state.DELAY_PENALTY_SCALE = dp.dmgScale!=null ? dp.dmgScale : 1;
  state.DELAY_TIME_DELTA    = dp.timeDelta!=null ? dp.timeDelta : 0;
  const wp = en.wrongPenalty || {};              // 3.3：按錯懲罰（只剩絕對值 `damage`，ver -947）
  /* 絕對值版（ver -375，敵人標準卡的寫法）：卡上有寫就蓋過上面那組縮放。
     ⚠ 沒寫要寫回 null，不能留上一隻怪的值 —— setEnemy 是連戰換敵也會走的。 */
  state.DELAY_SECONDS = dp.seconds!=null ? dp.seconds : null;
  state.DELAY_DAMAGE  = dp.damage !=null ? dp.damage  : null;
  state.WRONG_DAMAGE  = wp.damage !=null ? wp.damage  : null;
  state.curEnemyHitFx = en.hitFx || null;        // 3.7：本怪受擊特效三件套（音效綁在 type 上，見 config.HITFX；卡上不再有 sound，ver -800）
  state.curEnemyEntranceSe = en.entrance || null;     // 登場音（ver -948 併成一格；-949 欄名定為 entrance）
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
  /* ⚠⚠ **城鎮插入戰用「你站的那一格」的背景**（ver -592（-893 前用詞），Ray：「打完敵人應該會
     留在原背景，不要自動切背景」）：`state.battleBg` 有值就蓋過卡上的 `bg` ——
     不然打完一場，上半的圖會從卡上那張跳回節點原本那張，讀起來是換了個地方。
     ⚠ 覆寫存的是**檔名**（城鎮那邊真的載到的那一個，含副檔名與時段）；
       卡上的 `bg` 是**基底名**，要自己補 `.webp`。兩種寫法差在這裡，別搞混。
     ⚠ 沒寫要清掉 —— 同 setEnemy 的其他欄位，連戰換敵不能留上一隻的。 */
  /* ⚠ URL 走 `story.bgUrl`（唯一那一支，ver -905）：同名覆蓋的圖要帶 `?v=` ——
     這裡自己拼字串的話，戰鬥上半會吃到舊快取，而城鎮那半是新的（同一張圖兩個樣）。
     ⚠ `bgUrl` 自己會補副檔名，所以覆寫（含副檔名）與卡上的基底名都丟給它就好。 */
  const topEl = $('top');
  if(topEl){
    const nm = state.battleBg || en.bg || '';
    topEl.style.backgroundImage = nm ? ('url("'+story.bgUrl(nm)+'")') : '';
  }
  /* ⚠ `noArt`：開機那一次不載圖，而且**把 src 整個拔掉** —— 只是不載的話
     上一次留下的那張還掛在 `#enemyImg` 上，空窗一樣會露出來。 */
  if(opts && opts.noArt){ const ei=$('enemyImg'); if(ei) ei.removeAttribute('src'); }
  else loadEnemyPortrait(en);
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
  setEnemy(GAME_CONFIG.currentEnemy, { noArt:true });   // ver -1321：開機不載挑戰那張立繪
  /* ⚠⚠⚠ **開機不預先掛 cut-in 的 src**（ver -1356，讀取分工）：`#cutinImg` 是
     `index.html` 裡本來就在的元素，這裡一設 `src`，**開機就會抓那張 cut-in**
     （實測 `Luna_CI_saint.jpg` 95 KB，initiator `img`）—— 而它要到**戰鬥裡**
     聖徒化降臨那一刻才看得到。
     ⚠ 拿掉不會壞：`saint.playCutin` 每次都自己設 `src`（每一張 CI 不同），
       而**開打時** `combat.warmPartnerCutins()`（ver -837）已經把這一場搭檔會用到的
       cut-in 全部抓下來解碼好了 —— 那才是它該被載的時候。
     ⚠ 同 `#claw` 那一條（§CLAUDE 鐵律 13）：**開機就在 DOM 上的元素，
       任何在開機那一刻給它的 `src`／CSS 背景，都會變成首頁的流量。** */
  const emb = $('homeEmblem');
  if(emb && !emb.src) emb.src = asset('home_emblem');   // 主畫面徽記
}
