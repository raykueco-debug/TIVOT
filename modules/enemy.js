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
import * as prog from '../script/progress.js';  // stage 加成要問現在第幾章（ver -1584b）
import { ENEMY_IDLE, ENEMY_ATK, ENEMY_DELAY, ENEMY_MISS, ENEMY_ENTER, GAME_CONFIG, HITFX, asset, sfxGain, assetVer } from '../config.js';
import { state, initEnemyHp, addPartnerFight } from '../state.js';
import { SFX } from '../audio.js';
import * as story from './story.js';   // 背景 URL 只有 story.bgUrl 一支在組（ver -905，鐵律 7）
import * as groundShadow from './groundShadow.js';   // 接地陰影（ver -1702，葉節點）
import { sakuraBurst } from './sakura.js';   // 鹿主的櫻花狂亂（ver -899）——同一支花瓣引擎，見 spawnSakura

const $ = id => document.getElementById(id);

/* combat 於啟動時注入原語（維持依賴方向；enemy 不反向 import combat）。
 *   startIntruderFight — Boss 亂入的戰鬥重啟（combat 擁有）。
 *   updateBars         — 換敵後刷新血條（enemyHp 顯示，combat 擁有）。 */
let api = { startIntruderFight(){}, updateBars(){} };
export function init(a){ api = { ...api, ...a }; }

/* ══⚠⚠ **重擊：敵人劇烈一震**（ver -1659，Ray：「步槍跟高爆彈在紅圈命中時
   敵人都要劇烈一震，像遭到重擊」）══
   ⚠ **只有這一支在演**（鐵律 8）：誰在什麼時候該震是 `defense` 的判斷
     （爆發型 ＋ 紅圈），份量與曲線是 CSS 的 `#enemyImg.slam`（鐵律 1／7）。
   ⚠ `remove → reflow → add`：連續兩發之間不 reflow 的話瀏覽器會把它併成一次，
     第二發就不播（同 `hit`／`enemy-rise` 那一族的作法）。
   ⚠ 計時器掛在**模組**上不是閉包（同 -640 落地光那次的教訓：掛閉包的話
     前一次取消不掉，兩次疊起來會互相把 class 拔掉）。 */
let slamT=0;
export function slamEnemy(){
  const el=$('enemyImg'); if(!el) return;
  clearTimeout(slamT);
  el.classList.remove('slam'); void el.offsetWidth; el.classList.add('slam');
  slamT=setTimeout(()=>el.classList.remove('slam'), 460);
}

/* ---------- 受擊特效派工 ----------
 *  依當前怪 curEnemyHitFx[kind] 播放對應特效。
 *  kind：'delay'（延時懲罰）/'wrong'（按錯懲罰）/'assault'（一般攻擊）/'ult'（門檻波的大絕，ver -932）。
 *  缺設定或未知 kind → 退回既有爪痕。 */
export function showHitFx(kind){
  if(isAirBio(curCard())) return;   // dragon rule 的空戰生物不演受擊特效（ver -2502，Ray；音效另外找，照舊在 combat）
  const hf = state.curEnemyHitFx;
  /* ⚠⚠ **缺 `ult` 就退回 `assault`**（ver -932）：受擊分四格是這一版才加的
     （延時／按錯／攻擊／大絕），六十張既有的卡上只有前三格 —— 沒有退路的話
     門檻波打中會掉回預設的三爪，而那是**沉默的退化**（畫面上看不出是漏寫）。
     ⚠ 只退這一個方向：`assault` 缺了就是真的沒寫，照舊走三爪。 */
  const raw = hf && (hf[kind] || (kind==='ult' ? hf.assault : null));
  if(raw==='none') return;   // 卡上寫 'none'＝不放受擊圖，只留畫面震動（ver -2525）
  if(!raw){ triggerClaw(); return; }
  /* ══⚠⚠ **卡上寫的是一個名字**（ver -951）：`'claw'`／`'bite'`…
     樣子（爪數、位置、大小、閃色）全部查 `config.HITFX`（鐵律 1）——
     卡上不再帶參數，Excel 那四格就是一個下拉選單。
     ⚠ 仍吃得下舊的物件寫法（`{type:'claw',count:4}`）：卡上寫的優先、表上的當底，
       這樣舊資料不會突然變樣；但**新資料一律寫名字**。
     ⚠ `angle` 不再看卡：一律 random（Ray：「已經全默認 random 了根本不用再列」）。 */
  const key = (typeof raw === 'string') ? raw : raw.type;
  const fx  = Object.assign({}, HITFX[key] || {}, (typeof raw === 'string') ? {} : raw);
  spawnFxNamed(key, fx);
  /* 攻擊打中時的語音（卡上 `assaultVoice`，ver -1964 米夏）：只給主動攻擊（assault／ult），
     延時與點錯不出聲。走語音閘，不疊。 */
  if(kind==='assault' || kind==='ult') rotVoice('assaultVoice');
}
/* ══⚠⚠⚠ **依「特效的名字」直接放一個特效**（ver -1455，Ray：「為什麼三轉四型態
   我會看到爪擊特效？我不是說要放光特效嗎？」）══
   ⚠⚠⚠ 真因：`showHitFx(kind)` 吃的是**受擊的種類**（`delay`／`wrong`／`assault`／`ult`）
     —— 它拿那個字去查**敵人卡的 `hitFx`**。而 `combat.maybeMorph` 傳的是
     `m.fx`＝**特效的名字**（`'holyburst'`）⇒ `hf['holyburst']` 查不到
     ⇒ 掉進 `if(!raw){ triggerClaw(); }` 這條退路 ⇒ **變成三爪**。
     卡上宣告的是放光，畫面上放的是爪 —— 而且**沒有任何錯誤訊息**。
   ⇒ 換型態那一條改走這一支（同一份 `switch`，鐵律 8：一個動作一個實作）。
   ⚠ 這兩支的差別要記牢：**`showHitFx` 問「玩家被怎麼打到」，`playFx` 問「放哪一個特效」**。 */
export function playFx(name){
  const key=String(name||'');
  if(!key) return;
  spawnFxNamed(key, Object.assign({}, HITFX[key] || {}));
}
/* 名字打錯只唸一次（同 story.js 的 `missingExpr`：一行 console，不要洗版）。 */
const warnedFx = new Set();
function spawnFxNamed(key, fx){
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
    /* 米夏的大絕（ver -1957）：殘影脈動彈出＋最後一斬。 */
    case 'afterimage': spawnAfterimage(fx); break;
    /* 王座徘徊者的放光（ver -1351）。⚠ **冷卻中就退回三爪**（ver -1666）：
       那一發照樣打中、照樣扣血，只是不再放光 —— 打中卻什麼都不演比放光太多還糟。 */
    case 'holyburst': if(!spawnHolyBurst(fx)) triggerClaw(); break;
    /* ⚠ 名字打錯時才走到這裡（`HITFX` 沒有它、也不是上面任何一個 base）。
       ⚠ 留一行 console：靜靜變成爪就是 -1455 那個查了很久的 bug。 */
    default:
      if(!warnedFx.has(key)){ warnedFx.add(key);
        console.info('[enemy] 沒有這個特效名，退回三爪：', key); }
      triggerClaw();
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
/* ══ 殘影彈出＋斬（ver -1957，米夏的大絕；Ray：「Misha attack 像殘影一樣脈動彈出＋斬」）══
   `fx.img` 那張攻擊圖（ASSETS 鍵）疊**三層**：前兩層是偏冷的殘影，一拍一拍往外脈動、
   一閃就散；第三層是實體，最後落定一斬（`spawnSlash`，同按錯那一支刀痕，鐵律 8）。
   ⚠ 節奏在 CSS（`.fx-ghost` 的 `--i` 錯開），這裡只負責擺圖與收尾。
   ⚠ 全部掛在受擊層（`addFx`）—— 壽命管理同其他受擊特效，換敵／離場不必另收。 */
const AFTERIMG_LIFE = 900;   // 與 CSS `ghostPulse`（.72s ＋ 最後一層延遲）同一段，改一邊要改另一邊
const AFTERIMG_CUT  = 470;   // 實體那一層落定的時刻 → 斬
export function spawnAfterimage(fx){
  const src = asset((fx && fx.img) || 'misha_attack');
  if(!src){ spawnSlash(); return; }
  const wrap=document.createElement('div');
  wrap.className='fx fx-afterimg';
  for(let i=0;i<3;i++){
    const g=document.createElement('div');
    g.className='fx-ghost'+(i===2?' solid':'');
    g.style.backgroundImage='url("'+src+'")';
    g.style.setProperty('--i', i);
    /* 殘影各自往左右偏一點：疊在同一個位置只會讀成「一張在閃」，不是殘影。 */
    g.style.setProperty('--gx', (i===2 ? 0 : (i ? 7 : -7))+'%');
    wrap.appendChild(g);
  }
  addFx(wrap, AFTERIMG_LIFE);
  setTimeout(spawnSlash, AFTERIMG_CUT);
}
/* ══ 劈落（ver -1957，Ray：「射出的子彈會被銀色刀光擋下，該特效定義為『劈落』」）══
   普攻打到卡上 `parryBasic:1` 的敵人時，命中點不噴槍火，改成一道**銀色刀光**把子彈
   劈下來（斜向弧光＋幾顆白火星）。座標是 `#fxTop` 相對的（與槍火同一個落點，
   由 combat 的 `gunHitOnEnemy` 算好交過來，鐵律 7）。
   ⚠ 浮字 GUARD 由 combat 那一邊打（傷害數字的擁有者是它，`floatDmg`）。
   ⚠ 音效 `se_bulletguard` 會連點連響：節流 90ms，免得機槍般的連點疊成一片白噪。 */
let parrySeAt=0;
/* 刀弧的形狀（Ray 給了三張參考，定案：「用最後兩個，隨機交互，水平翻轉出現」）——
   兩種，每一刀隨機挑一種、隨機左右翻（`--flip`）：
   · **A 橢圓刀弧**（參考二）：斜的橢圓弧，一端細細起刀、另一端粗亮收尾；
     內側一條細副弧、下方一道直的細光。
   · **B 實心刀弧**（參考三）：一道實心白弧，尖細起刀、越揮越粗，收尾內側三根毛刺。
   沿橢圓取點、逐點給厚度，算一次快取成 SVG（每一刀只是 innerHTML 一份字串）。 */
let parrySvgs=null;
/* 沿橢圓 (cx,cy,rx,ry) 從 a0 到 a1 畫一道帶狀；`wOf(t,k)` 給第 k 點的厚度。 */
function bandPath(cx, cy, rx, ry, a0, a1, wOf, squash){
  const N=60, out=[], inn=[];
  for(let k=0;k<=N;k++){
    const t=k/N, th=a0+(a1-a0)*t, c=Math.cos(th), sn=Math.sin(th), w=wOf(t,k);
    out.push((cx+rx*c).toFixed(1)+' '+(cy+ry*sn).toFixed(1));
    inn.push((cx+(rx-w)*c).toFixed(1)+' '+(cy+(ry-w*squash)*sn).toFixed(1));
  }
  return 'M'+out.join(' L')+' L'+inn.reverse().join(' L')+'Z';
}
/* 起刀慢慢長、過了 peak 急收成尖（不對稱，才是「揮出去」不是一圈環）。 */
const swing = (wMax, peak, grow, cut) => (t)=>
  wMax * (t<peak ? Math.pow(t/peak, grow) : Math.pow((1-t)/(1-peak), cut));
function parrySvgList(){
  if(parrySvgs) return parrySvgs;
  const D=Math.PI/180;
  /* A：橢圓刀弧 */
  const a = '<svg viewBox="-170 -80 340 160" width="340" height="160">'
    +'<path d="'+bandPath(0,0,150,52,200*D,395*D, swing(22,0.82,1.4,0.6), 0.55)+'" fill="#fff"/>'
    +'<path d="'+bandPath(0,0,124,38,215*D,330*D, swing(3.4,0.6,1.4,0.6), 0.55)+'" fill="#fff" opacity=".85"/>'
    +'<path d="M-95 38 L60 60 L135 66 L60 63 Z" fill="#fff" opacity=".9"/></svg>';
  /* B：實心刀弧。毛刺＝收尾那一段內緣挑三個點往裡多咬一口（單點 ⇒ 尖的三角）。 */
  const SPIKE={ 38:16, 46:20, 54:13 };
  const wB = swing(36, 0.94, 2.2, 0.5);
  const b = '<svg viewBox="-170 -80 340 160" width="340" height="160">'
    +'<path d="'+bandPath(-70,95,210,185,-128*D,-8*D, (t,k)=>wB(t)+(SPIKE[k]||0), 1)
    +'" fill="#fff" transform="translate(30,-30) scale(.72)"/></svg>';
  parrySvgs=[a,b];
  return parrySvgs;
}
export function spawnParry(px, py){
  const host=$('fxTop'); if(!host) return;
  const d=document.createElement('div');
  d.className='fx-parry';
  d.style.left=px+'px'; d.style.top=py+'px';
  d.style.setProperty('--deg', (Math.random()*50-25).toFixed(1)+'deg');
  d.style.setProperty('--flip', Math.random()<0.5 ? -1 : 1);   // 隨機水平翻轉（Ray 指定）
  const L=parrySvgList(); d.innerHTML=L[(Math.random()*L.length)|0];
  host.appendChild(d);
  setTimeout(()=>d.remove(), 360);
  for(let i=0;i<5;i++){
    const k=document.createElement('div'); k.className='fx-parry-spark';
    const a=Math.random()*Math.PI*2, r=18+Math.random()*34;
    k.style.left=px+'px'; k.style.top=py+'px';
    k.style.setProperty('--dx',(Math.cos(a)*r).toFixed(0)+'px');
    k.style.setProperty('--dy',(Math.sin(a)*r).toFixed(0)+'px');
    host.appendChild(k);
    setTimeout(()=>k.remove(), 320);
  }
  const now=Date.now();
  if(now-parrySeAt>90){ parrySeAt=now;
    const se=asset('se_bulletguard'); if(se) SFX.play(se, sfxGain('se_bulletguard')); }
  playParryVoice();   // 卡上 `parryVoice` 兩句輪播（語音閘擋重疊）
}
/* ══ 六角護罩（ver -2120，Ray：「被子彈打中的地方會閃六邊型構成的防護罩」）══
   `spawnHexShield(x,y)` ＝命中點閃一片六角格（沒給座標＝隨機落在牠身上：BR／反擊沒有落點）；
   `breakHexShield()` ＝清盤那一刻整片護罩碎掉。全部程式生成（SVG），樣式在 style.css 的 .fx-hex*。 */
let hexSeAt=0;
/* `n` ＝半徑裡排幾格（越大越密）。⚠ ver -2129：原本固定 3.2 ⇒ 整片只有 7 格，讀起來是「幾塊大磚」。 */
function hexCells(r, n){
  const out=[]; const s=r/n, h=s*Math.sqrt(3)/2, m=Math.ceil(n)+1;
  for(let q=-m;q<=m;q++) for(let k=-m;k<=m;k++){
    const x=q*s*1.5, y=(k+(q&1?0.5:0))*h*2;
    if(Math.hypot(x,y)>r-s*0.6) continue;
    out.push([x,y]);
  }
  return { s, cells:out };
}
function hexSvg(r, n){
  const { s, cells:C }=hexCells(r, n||5);
  const cells=C.map(([x,y])=>{
    const pts=[0,1,2,3,4,5].map(i=>{ const a=Math.PI/3*i; return (x+s*0.92*Math.cos(a)).toFixed(1)+','+(y+s*0.92*Math.sin(a)).toFixed(1); }).join(' ');
    return '<polygon points="'+pts+'"/>';
  });
  return '<svg viewBox="'+(-r)+' '+(-r)+' '+(2*r)+' '+(2*r)+'" width="'+(2*r)+'" height="'+(2*r)+'">'+cells.join('')+'</svg>';
}
export function spawnHexShield(px, py){
  const host=$('fxTop'); if(!host) return;
  if(px==null){ const b=host.getBoundingClientRect(); px=b.width*(0.32+Math.random()*0.36); py=b.height*(0.25+Math.random()*0.4); }
  const d=document.createElement('div'); d.className='fx-hex';
  d.style.left=px+'px'; d.style.top=py+'px';
  d.innerHTML=hexSvg(46, 4);
  host.appendChild(d); setTimeout(()=>d.remove(), 420);
  const now=Date.now();
  if(now-hexSeAt>90){ hexSeAt=now; const se=asset('se_bulletguard'); if(se) SFX.play(se, sfxGain('se_bulletguard')); }
}
/* ⚠ ver -2129（Ray：「防壁要真的破碎四散的效果，現在是莫名出現一個大六角磚」）：
   護罩先**整片亮一下**（罩在牠身上的那一圈六角格），隨即**裂成一片片小六角形**往外噴、旋轉、往下掉、淡出。
   每一片是獨立的元素（位置＝蜂巢格的格心），飛行向量由「離中心的方向」＋隨機量決定 —— 讀起來是從牠身上炸開。 */
export function breakHexShield(){
  const host=$('fxTop'); if(!host) return;
  const hb=host.getBoundingClientRect();
  /* 罩在立繪上：中心＝#enemyImg 的框（群體沒有這張就退回畫面中央） */
  const ei=$('enemyImg'), er=ei && ei.getBoundingClientRect();
  const cx = er && er.width ? (er.left+er.width/2-hb.left) : hb.width/2;
  const cy = er && er.height ? (er.top+er.height*0.45-hb.top) : hb.height*0.45;
  const R = Math.round(Math.min(hb.width, hb.height)*0.40);
  /* ① 整片亮一下 */
  const flash=document.createElement('div'); flash.className='fx-hexbreak';
  flash.style.left=cx+'px'; flash.style.top=cy+'px'; flash.innerHTML=hexSvg(R, 8);
  host.appendChild(flash); setTimeout(()=>flash.remove(), 220);
  /* ② 碎片：蜂巢格心，逐片飛散 */
  const { s, cells:SH }=hexCells(R, 8);
  setTimeout(()=>{
    for(const [x,y] of SH){
      const a=Math.atan2(y,x)+(Math.random()-0.5)*0.6, sp=R*(0.55+Math.random()*0.9);
      const d=document.createElement('div'); d.className='fx-hexshard';
      d.style.left=(cx+x)+'px'; d.style.top=(cy+y)+'px';
      d.style.setProperty('--dx', (Math.cos(a)*sp).toFixed(0)+'px');
      d.style.setProperty('--dy', (Math.sin(a)*sp + R*(0.35+Math.random()*0.5)).toFixed(0)+'px');   // 往外噴＋往下掉
      d.style.setProperty('--rot', ((Math.random()-0.5)*540).toFixed(0)+'deg');
      d.style.animationDelay=(Math.random()*70).toFixed(0)+'ms';
      d.innerHTML='<svg viewBox="-10 -10 20 20" width="'+Math.round(s*1.85)+'" height="'+Math.round(s*1.85)+'"><polygon points="9.2,0 4.6,8 -4.6,8 -9.2,0 -4.6,-8 4.6,-8"/></svg>';
      host.appendChild(d); setTimeout(()=>d.remove(), 900);
    }
  }, 120);
  const se=asset('se_glasscrack'); if(se) SFX.play(se, sfxGain('se_glasscrack'));
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
/* ⚠ ver -1418 放慢一半（550→1100／1350→2700）、-1433 再放慢一半（→2200／5400）。
   ⚠⚠⚠ **ver -1449：節奏直接抄首頁那一顆**（Ray：「放光特效速度完全與首頁放光一樣，
     但一滿畫面就要快速淡出」）—— 首頁是 `#alFlash`：
       `transition: transform 2.5s cubic-bezier(.3,.35,.25,1), opacity …`，起始 `scale(.85)`。
     ⇒ 綻放 **2500ms**（連曲線與起始倍率一起照抄，不然「速度一樣」只是數字一樣）；
       淡出**不照首頁的 1.2s**，Ray 要的是「一滿畫面就**快速**淡出」⇒ **400ms**。
   與 CSS `#holyBurst` 的 transition 是同一組數字（鐵律 7 的但書）—— 改一邊要改另一邊。
   ⚠⚠ `modules/combat.js` 的 `HOLY_SWAP_MS`（型態切換等多久才換圖）**也是同一個數字**
     （＝綻放完、光蓋滿畫面的那一刻），三處要一起動。 */
const HOLY_GROW_MS = 2500;    // 與 CSS 的 transform transition 同一個數字（＝首頁那一顆）
const HOLY_LIFE_MS = 2900;    // 綻放 2500 ＋ 快速淡出 400
let holyFx=null, holySe=null;
/* ══⚠⚠ **放光的冷卻**（ver -1666，Ray：「怎麼沒 CD 啊」）══
   秒數在資料上（`config.HITFX.holyburst.cdSec`，卡上可覆寫，鐵律 1）——
   這裡只記「上一發是什麼時候」。
   ⚠ **換敵就歸零**（`stopHolyBurst`）：冷卻是「這一隻剛放過」，不是全域節流。 */
let holyAt=0;
/* 回傳 **true＝真的放了**。呼叫端據此決定要不要退回三爪（冷卻中／已經有一發在演）。 */
export function spawnHolyBurst(fx){
  if(holyFx) return false;                 // 同一發不疊第二層（同櫻花那一支）
  /* 冷卻幾秒：**卡上的那一欄優先**（`hitFxCd`／Excel「受擊特效／CD秒」，ver -1667
     Ray：「CD 沒有在 enemie.xls 嗎?」）→ 這一拍自己寫的 → `config.HITFX` 的保底。
     ⚠ 表上那一格是**沒填時的保底**，不是「真正在用的值」—— 逐怪要調就填 Excel
       那一欄（鐵律 1：數字歸資料，而且要填得到）。 */
  const cdSec = (state.curEnemyHitFxCd > 0) ? state.curEnemyHitFxCd
              : ((fx && fx.cdSec!=null) ? fx.cdSec : ((HITFX.holyburst||{}).cdSec||0));
  const cdMs = Math.max(0, (cdSec*1000)|0);
  if(cdMs && (Date.now() - holyAt) < cdMs) return false;
  holyAt = Date.now();
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
  /* ══⚠⚠⚠ **發動＝清場，而且光退了才重新開始算攻擊**（ver -1449 清圈；
     -1666 補齊，Ray：「光砲應該發動以後清掉所有攻擊圈啊」「應該從特效跑完
     開始重算攻擊」）══
     那一圈光蓋滿整個畫面（連盤面一起），底下的紅點玩家根本看不見 ——
     留著等於「看不到卻還在扣血」。三件事（清畫面上的／取消這一波還沒出的／
     光退了才重排）**全部在 `defense.holdAssaultFor` 一支**（它才擁有 threats
     與排程，鐵律 7/8），這裡只把「光要亮多久」告訴它。
     ⚠ 長度就是這一發的壽命（`HOLY_LIFE_MS` ＝ 2500 綻放 ＋ 400 淡出）。
     ⚠ 劇情裡放光（`playFx`）時那一支自己會判斷「沒有排程就不重排」。 */
  if(api.holdAssault){ try{ api.holdAssault(HOLY_LIFE_MS); }catch(_){} }
  /* 音效（ver -1449，Ray 指定 `se_enemy_holyburst`；-1351~-1448 是 `em_firebeam`）。
     ⚠ 走 `playCue` 的把手：它有頭有尾，換型態／換敵時要收得掉（見 stopHolyBurst）。 */
  const src=asset('se_enemy_holyburst') || asset('em_firebeam');
  if(src){ try{ holySe = SFX.playCue(src, sfxGain(src)); }catch(_){ holySe=null; } }
  return true;
}
/* 收乾淨：換敵／離場（§6.5.4 的檢查表：新增任何蓋在畫面上的層，先回答「誰收它」）。 */
export function stopHolyBurst(){
  holyAt=0;                                // 冷卻是「這一隻剛放過」：換敵／離場就歸零
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
/* ══⚠⚠⚠ **子彈的火線**（ver -1622，Ray：「點擊方格時有子彈的火線高速射向敵人，
   從點擊方格的位置朝敵人射出，但**圖層在控制面板以下**，所以效果是從控制面板底下
   射出，類似索拉娜飛刀」）══════════════════════════════════════════════════════
   ⚠⚠⚠ **「在控制面板以下」不必動任何 z-index** —— 畫在既有的 `#fxTop` 就是了：
     那一層是 `#top` 的子元素、`overflow:hidden`，而 `#top` 的下緣**就是控制面板的
     上緣**。起點落在盤面（在 `#top` 之外）⇒ 那一段自動被裁掉，看到的正好是
     「從面板底下竄出來」。自己另開一層再去調 z-index，反而會與 `#bottom`
     沒有 `position` 這件事打架（非定位元素永遠畫在定位元素之下）。
   ⚠ 座標一律是 **`#top` 相對**（呼叫端換算好再傳）：這一支不量任何 rect ——
     它每一發都會跑，逐發量 rect 是每一發一次強制重排。
   ⚠ 素材是零：一條帶漸層的細長 div，`mix-blend-mode:screen`（同飛刀與星芒那條）。 */
const TRACER_MS = 90;        // 飛行時間：要「高速」，比飛刀（150）再快一截
const TRACER_LEN = 150;      // streak 的長度（px）；距離不夠時縮短
/* 四支略有變化的飛行聲隨機挑一支（ver -1622，Ray 指定）。
   ⚠⚠ **節流 50ms**：BR（破防彈雨）是連發，不節流會疊成一片白噪音 ——
     而普攻本來就點不到那麼快，所以只有 BR 感覺得到。 */
let bfLast = 0;
/* ══⚠⚠⚠ **飛行音要往後推 0.2 秒**（ver -1626，Ray：「音效前面的飛行音被槍聲吃掉，
   只剩最後的擊中血肉音」）══
   同一拍還有普攻的槍聲，而這一支的**前 0.2 秒正是飛行的咻聲** —— 兩個疊在一起，
   咻聲整段被遮蔽掉，玩家只聽得到後面那一下。往後推就閃開了。
   ⚠⚠ **推的是播放時刻，不是在檔案前面補靜音**：補靜音等於四支檔案都要重做才能改
     這個數字，而且每一發都白解碼 0.2 秒的零。
   ⚠ 節流（下面那 50ms）看的是**發射的時刻**不是播放的時刻 —— 要擋的是「連發疊成
     白噪音」，而那是由發射頻率決定的。 */
const BF_DELAY_MS = 200;
function bulletsFlySe(){
  const now = (typeof performance!=='undefined' ? performance.now() : Date.now());
  if(now - bfLast < 50) return;
  bfLast = now;
  const k = 'se_bulletsfly' + (1 + ((Math.random()*4)|0));
  setTimeout(()=>{ try{ SFX.play(asset(k), sfxGain(k)); }catch(_){} }, BF_DELAY_MS);
}
/* ══⚠⚠ **怪的中心**（`#top` 相對；ver -1622b，Ray：「火線要有角度，往怪的中心飛」）══
   立繪是 `object-fit:cover` ＋ `object-position:center top` 鋪滿 `#top`，
   身體的重心大約落在**水平正中、垂直四成**的位置。
   ⚠⚠ 火線要射到**同一個點**才會有角度：原本射的是槍火那一點
     （`gunHitOnEnemy` 把格子的相對位置**映射**到敵人身上），而那個映射與格子的
     位置幾乎同相位 ⇒ 每一發都是「從正下方往正上方」，看起來就是沒有角度。
   ⚠ 槍火照舊打在映射那一點（那是**彈著點**，本來就該散開）——
     火線是「從哪裡射出來」，兩件事。 */
const ENEMY_CX = 0.50, ENEMY_CY = 0.40;
/* 立繪在 `#top` 裡大致佔的那一塊（半寬／半高，比例）。
   ⚠ 不逐發去量 `#enemyImg` 的 rect：那是每一發一次強制重排，而立繪的 `fit`
     逐張卡不同（`cover`／`contain`），量到的框也不等於**畫出來的怪**有多大。
     這一組是「怪大概站在哪」的常數，改一個數字就能整體收放。 */
/* ══⚠⚠ **落點：往中心的方向飛，落在立繪範圍內隨機，而且盡量交叉**
   （ver -1624／**-1625 加「交叉」**，Ray：「往怪的中心方向飛，落點在怪的立繪範圍內
   隨機」「**盡量讓火線交叉 大角度**」）══════════════════════════════════════════
   ⚠⚠ **只射正中心是不行的**（-1623 那一版）：每一發都打在同一個點，
     讀起來是雷射筆不是子彈。
   ⚠⚠⚠ **交叉靠「鏡射」不靠亂數**：落點取起點**對中心的另一側**
     （左邊的格子打右半邊、右邊的格子打左半邊）—— 亂數只會讓角度忽大忽小，
     鏡射才保證**每一發都穿過中線**，連著幾發就自然交叉成網。
   ⚠ 再把起點**往外推**（`SPREAD`）：起點在 `#top` 之外、本來就被裁掉，
     所以往外推只會讓**看得見的那一段**更斜，不會露出破綻。
   ⚠ 亂數（三角分佈，中心密）留著當抖動，讓同一格連點不會是同一條線。 */
const ENEMY_RX = 0.26, ENEMY_RY = 0.28;
const MIRROR = 0.95;   // 鏡射的強度（1＝完全對稱）
const SPREAD = 1.45;   // 起點往外推的倍率（只影響看得見那一段的斜度）
/* ══⚠⚠⚠ **落點貼著「畫面上真的那一格圖」**（ver -2500，Ray：「動畫化以後子彈常常打不到影像上，
   看起來像一直沒打中」）══ 上面那組常數是「怪大概站在哪」—— 待機／攻擊動檔、站遠（far）、空戰漂移
   一來，怪就不在那一塊了。現在：
   ① 找出此刻**看得見的那一個元素**（攻擊動檔 → 待機格 → 立繪本體），用它的 rect（含 scale／translate／transform）
   ② 立繪本體要再換算 object-fit／object-position，拿到**圖真正畫在哪**
   ③ 照舊的鏡射＋抖動在那個框裡挑一點，再**吸到最近的不透明像素**（每一張圖縮成 48 格的遮罩，依 src 快取）
   ⚠ 量不到（沒圖、還沒解碼、透明遮罩取不到）就退回舊的常數，行為不變。 */
const impMask=new Map();   // src → { w, h, on:Uint8Array, pts:[[gx,gy]…] }
const IMP_G=48;
function maskOf(img){
  const src=img.currentSrc || img.src; if(!src || !img.naturalWidth) return null;
  let m=impMask.get(src); if(m!==undefined) return m;
  try{
    const ar=img.naturalWidth/img.naturalHeight, gw=ar>=1?IMP_G:Math.max(8,Math.round(IMP_G*ar)), gh=ar>=1?Math.max(8,Math.round(IMP_G/ar)):IMP_G;
    const c=document.createElement('canvas'); c.width=gw; c.height=gh; const x=c.getContext('2d', { willReadFrequently:true });
    x.drawImage(img,0,0,gw,gh); const d=x.getImageData(0,0,gw,gh).data, pts=[];
    for(let i=0;i<gw*gh;i++) if(d[i*4+3]>90) pts.push(i);
    m = pts.length>=6 ? { w:gw, h:gh, pts } : null;
  }catch(_){ m=null; }
  if(impMask.size>400) impMask.clear();
  impMask.set(src, m); return m;
}
function visibleEnemyEl(){
  if(flock){ const a=flockAlive(); return a.length ? a[(Math.random()*a.length)|0].im : null; }   // 空戰編隊：挑一隻還在飛的
  for(const el of [clipEl, idleEl, $('enemyImg')]){
    if(!el || !el.isConnected || !el.naturalWidth) continue;
    const cs=getComputedStyle(el); if(cs.visibility==='hidden' || cs.display==='none' || +cs.opacity<0.2) continue;
    return el;
  }
  return null;
}
/* 圖真正畫在哪（#top 相對）：object-fit 只有立繪本體有；動檔格子的 box 就是圖本身。 */
function drawnRect(el, tr){
  const r=el.getBoundingClientRect(); let L=r.left-tr.left, T=r.top-tr.top, W=r.width, H=r.height;
  const cs=getComputedStyle(el), fit=cs.objectFit, iw=el.naturalWidth, ih=el.naturalHeight;
  if((fit==='cover' || fit==='contain') && iw && ih){
    const s = fit==='cover' ? Math.max(W/iw, H/ih) : Math.min(W/iw, H/ih), dw=iw*s, dh=ih*s;
    const pos=(cs.objectPosition||'50% 50%').split(/\s+/), pc=v=> /%$/.test(v) ? parseFloat(v)/100 : (v==='left'||v==='top') ? 0 : (v==='right'||v==='bottom') ? 1 : 0.5;
    const px=pc(pos[0]||'50%'), py=pc(pos[1]||'50%');
    L+= (W-dw)*px; T+=(H-dh)*py; W=dw; H=dh;
  }
  return { L, T, W, H };
}
export function enemyImpact(sx, w, h){
  const j=()=> (Math.random()+Math.random()-1);              // −1~1，中心密
  try{
    const el=visibleEnemyEl(), top=$('top');
    const m=el && maskOf(el);
    if(el && m && top){
      const R=drawnRect(el, top.getBoundingClientRect());
      if(R.W>4 && R.H>4){
        /* 鏡射＋抖動，換到「圖」的框（不是整個 #top） */
        const cx=R.L+R.W/2, off=(sx-w*ENEMY_CX)/w, bx=Math.max(-1, Math.min(1, -off*MIRROR/ENEMY_RX));
        const tx=cx+R.W*0.36*(bx*0.75+j()*0.25), ty=R.T+R.H*(0.45+0.30*j());
        /* 吸到最近的不透明格（只在 #top 看得到的範圍內） */
        const fl=parseFloat(String(getComputedStyle(el).scale||'1').split(' ')[0])<0;   // fit.flip／漂移的翻轉：遮罩要鏡射
        const fx=px=> fl ? m.w-1-px : px;
        const gx=(tx-R.L)/R.W*m.w, gy=(ty-R.T)/R.H*m.h, cw=R.W/m.w, ch=R.H/m.h;
        let best=-1, bd=1e18;
        for(const i of m.pts){ const px=fx(i%m.w), py=(i/m.w)|0, X=R.L+(px+0.5)*cw, Y=R.T+(py+0.5)*ch;
          if(X<4 || X>w-4 || Y<4 || Y>h-4) continue;
          const d=(px+0.5-gx)**2+(py+0.5-gy)**2; if(d<bd){ bd=d; best=i; } }
        if(best>=0){ const px=fx(best%m.w), py=(best/m.w)|0;
          return { x:R.L+(px+0.5+j()*0.35)*cw, y:R.T+(py+0.5+j()*0.35)*ch }; }
      }
    }
  }catch(_){}
  const off=(sx - w*ENEMY_CX)/w;                             // 起點離中線多遠（比例）
  const bx=Math.max(-1, Math.min(1, -off*MIRROR/ENEMY_RX));  // 鏡射到另一側，夾在框內
  return { x:w*(ENEMY_CX + ENEMY_RX*(bx*0.75 + j()*0.25)),
           y:h*(ENEMY_CY + ENEMY_RY*j()) };
}
/* 起點往外推（見上）：回傳推過之後的 x。 */
export function tracerOrigin(sx, w){ return w*ENEMY_CX + (sx - w*ENEMY_CX)*SPREAD; }
/* ══⚠⚠⚠ **船戰的副武器會拉煙**（ver -1653，Ray：「船戰用的副武器除了火線，還要拉煙，
   軌跡速度同火線然後往左上或右上飄散，**每一場只會有左上或右上其中一個方向**」）══
   ⚠⚠ **方向是「這一場」的性質，不是每一發各擲一次**：一場之內所有的煙往同一邊飄，
     讀起來才是「風從那一邊吹」；逐發重擲會變成一團亂噴（同鐵律 7 的精神：
     那是一個量，只在一個時刻決定）。
   ⚠ 擲的時刻＝`setEnemy`（「換了一隻怪」的唯一時刻，鐵律 9）——
     船戰本來就是一隻一場，所以「每一場一個方向」是它天生的結果。
   ⚠ 只有**船戰**才拉煙（`state.shipBattle`）：陸戰的副武器沒有這回事。 */
let smokeDir = 1;                       // +1＝往右上　−1＝往左上
export function rollSmokeDir(){ smokeDir = (Math.random()<0.5) ? -1 : 1; }
/* ⚠⚠ ver -1733（Ray：「煙機槍降成三條頭中尾出，霰彈就一條大的就好，blur 拿掉看看效果」）——
   -1732 量到一次機槍反擊半秒內 56 團帶 blur 的煙（8 發 × 7 團），是火線那一組最貴的東西。
   · 機槍／步槍：**三團**，頭、中、尾（f＝0.12／0.5／0.88）
   · 霰彈（`vfx:'burst'`）：**一團大的**在軌跡中段，而且 50ms 節流 —— 六顆彈丸同一個 tick 打出去，
     不節流就是六團疊在同一處
   · blur 在 CSS 拿掉（`.tracer-smoke`／`.muzzle-smoke`），漸層本來就是軟邊。 */
let trailLast = 0;
function trailSmoke(host, sx, sy, tx, ty, vfx){
  if(!state.shipBattle) return;
  const burst = (vfx==='burst');
  if(burst){
    const now = (typeof performance!=='undefined' ? performance.now() : Date.now());
    if(now - trailLast < 50) return;
    trailLast = now;
  }
  const FS = burst ? [0.5] : [0.12, 0.5, 0.88];
  for(let i=0;i<FS.length;i++){
    const f=FS[i];
    const el=document.createElement('i');
    el.className='tracer-smoke';
    el.style.setProperty('--x', (sx+(tx-sx)*f).toFixed(1)+'px');
    el.style.setProperty('--y', (sy+(ty-sy)*f).toFixed(1)+'px');
    el.style.setProperty('--sz', (burst ? (44+Math.random()*30) : (16+Math.random()*22)).toFixed(0)+'px');
    /* 飄散：往左上或右上（這一場固定），再各自加一點抖動。 */
    el.style.setProperty('--dx', (smokeDir*(34+Math.random()*46)).toFixed(0)+'px');
    el.style.setProperty('--dy', (-46-Math.random()*54).toFixed(0)+'px');
    /* ⚠ 出現的時刻**跟著火線走**（Ray：「軌跡速度同火線」）：
       第 i 團在火線飛到那裡的那一刻才冒出來。 */
    el.style.setProperty('--d', (f*TRACER_MS).toFixed(0)+'ms');
    el.style.setProperty('--t', (900+Math.random()*700).toFixed(0)+'ms');
    host.appendChild(el);
    setTimeout(()=>{ if(el.parentNode) el.remove(); }, TRACER_MS+1800);
  }
}
/* 最後一條火線的幾何（ver -1654）：硝煙要冒在**它竄出面板的那一點**，
   而那一點只有射出來的那一支知道。⚠ 只是個把手，不是狀態 —— 用完就被下一發蓋掉。 */
let lastShot = null;
/* ══⚠⚠⚠ **步槍的硝煙**（ver -1654，Ray：「步槍開槍加上硝煙效果」）══
   冒在火線**穿出控制面板上緣的那一點**（＝玩家看得到的第一格），往上慢慢散開。
   ⚠⚠ 與船戰那條「拉煙」是兩件事，不要混：
     · 拉煙（-1653）＝沿著**整條軌跡**撒、往固定的一邊飄、**只有船戰的副武器**
     · 硝煙（這一支）＝只在**槍口那一點**一團、往上散、**只有步槍**（每一場都有）
   ⚠ 步槍是一發一響的爆發型：一發就一團，量要夠大才看得出是硝煙而不是雜訊。 */
let smokeLast = 0;
export function muzzleSmoke(k){
  const host=$('fxTop'); if(!host || !lastShot) return;
  /* ══⚠⚠ **節流 50ms**（ver -1655）══ 機槍逐發、散彈逐顆都會叫這一支 ——
     散彈的六顆在**同一個 tick** 打出去，不節流就是六團疊在同一個地方（而且是
     六倍的 DOM）。節流之後：散彈一團、機槍每五十毫秒一團，讀起來才是「一股煙」。
     ⚠ 鐵律 12：這是每一發都會跑的特效，手機上的成本要壓在這裡，不是事後再調。 */
  const now = (typeof performance!=='undefined' ? performance.now() : Date.now());
  if(now - smokeLast < 50) return;
  smokeLast = now;
  const r=host.getBoundingClientRect();
  const { sx, sy, tx, ty } = lastShot;
  /* 線段與下緣（y=r.height）的交點；起點本來就在下緣之外，所以一定交得到。 */
  const f = (sy===ty) ? 1 : Math.max(0, Math.min(1, (r.height-sy)/(ty-sy)));
  const px = sx+(tx-sx)*f, py = r.height;
  /* ⚠⚠ **`k` ＝這一槍的份量**（ver -1655，Ray：「普攻也加煙，步槍跟高爆砲加大煙」）：
     團數與大小一起乘 —— 只放大不加團會變成「一顆大氣球」，只加團不放大看不出差別。
     · 普攻（雙槍）k≈0.55 ⇒ **1 團**小的（ver -1790 由 3 團減下來）：它**每一下都會響**，份量要壓得住。
     · 爆發型（陸戰萊福槍／船戰高爆砲，同一支 `vfx:'single'`）k≈1.6 ⇒ 7 團大的。
     ⚠ 機槍與散彈**刻意不冒**：逐發／逐顆都冒的話整個畫面都是煙（同 -1654 的理由）。 */
  const kk = (k==null ? 1 : k);
  /* ⚠⚠ ver -1790（Ray：「戰鬥仍然大發熱」）：**普攻（k<1）一下只冒一團** ——
     舊式 round(5×0.55)＝3 團，每點一下三團、每團活 1.1~1.8 秒，整場戰鬥畫面上
     一直維持十幾團在動。爆發型（k≈1.6 ⇒ 8 團）不變：它一發一響，份量要夠。 */
  const n  = kk<1 ? 1 : Math.round(5*kk);
  for(let i=0;i<n;i++){
    const el=document.createElement('i');
    el.className='muzzle-smoke';
    el.style.setProperty('--x', (px+(Math.random()*26-13)).toFixed(1)+'px');
    el.style.setProperty('--y', (py-Math.random()*10).toFixed(1)+'px');
    el.style.setProperty('--sz', ((30+Math.random()*34)*kk).toFixed(0)+'px');
    el.style.setProperty('--dx', ((Math.random()*44-22)*kk).toFixed(0)+'px');
    el.style.setProperty('--dy', ((-52-Math.random()*48)*kk).toFixed(0)+'px');
    el.style.setProperty('--d', (Math.random()*90).toFixed(0)+'ms');
    el.style.setProperty('--t', (1100+Math.random()*700).toFixed(0)+'ms');
    host.appendChild(el);
    setTimeout(()=>{ if(el.parentNode) el.remove(); }, 2100);
  }
}
export function fireTracer(sx, sy, tx, ty){
  const host=$('fxTop'); if(!host) return;
  lastShot = { sx, sy, tx, ty };
  const dx=tx-sx, dy=ty-sy;
  const dist=Math.hypot(dx,dy) || 1;
  const ang=Math.atan2(dy,dx)*180/Math.PI;
  const len=Math.min(TRACER_LEN, dist);
  const ux=dx/dist, uy=dy/dist;
  const el=document.createElement('i');
  el.className='tracer';
  el.style.width=len+'px';
  host.appendChild(el);
  /* 尾端從起點出發、頭端在終點收尾 ⇒ 平移的終點要退掉一個 streak 的長度。 */
  const a='translate('+sx+'px,'+sy+'px) rotate('+ang+'deg)';
  const b='translate('+(tx-ux*len)+'px,'+(ty-uy*len)+'px) rotate('+ang+'deg)';
  try{
    el.animate([{ transform:a, opacity:0.35 },
                { transform:b, opacity:1 }],
               { duration:TRACER_MS, easing:'cubic-bezier(.2,.7,.4,1)', fill:'forwards' });
  }catch(_){ el.style.transform=b; }
  setTimeout(()=>{ if(el.parentNode) el.remove(); }, TRACER_MS+60);
  bulletsFlySe();
}
/* ══⚠⚠ **朝「視窗上的某一點」射一條火線**（ver -1652，Ray：「機槍反擊按發數射火線，
   散彈槍也是按發數射，但散射一點，步槍就一發」）══
   反擊沒有盤面格子可當起點 —— 起點取**面板底下、對中線鏡射的那一側**（同 -1625
   的作法），所以左右會交叉、而且被 `#fxTop` 的 `overflow:hidden` 裁成「從面板下竄出」。
   ⚠⚠ **「幾發」不在這裡決定**：呼叫端（`weapon.mzHit`）本來就是**一發一次**
     —— 機槍逐發、散彈逐顆、狙擊一發，三種的發數與散佈全部沿用既有那一份
     （鐵律 7：不要在這裡再判一次武器類別）。
   ⚠ 吃**視窗座標**（與 `muzzleAtPoint` 同一組），換算成 `#fxTop` 相對在這裡做。 */
export function fireTracerAt(clientX, clientY, vfx){
  const host=$('fxTop'); if(!host) return;
  const r=host.getBoundingClientRect();
  const tx=clientX-r.left, ty=clientY-r.top;
  const cx=r.width*ENEMY_CX;
  const sx=tracerOrigin(cx + (cx-tx)*MIRROR, r.width);   // 鏡射到另一側
  const sy=r.height*1.55;                                // 起點在面板底下（會被裁掉）
  /* ⚠⚠⚠ **拉煙只掛在這一支**（ver -1653，Ray：「**船戰用的副武器**除了火線，
     還要拉煙」）—— `fireTracer` 是共用入口，普攻與 BR 也在用，而那兩者是
     **主武器**（迦尼米德雙槍）。掛在那裡等於每一發普攻都在冒煙。 */
  trailSmoke(host, sx, sy, tx, ty, vfx);   // vfx：哪一種副武器（決定幾團煙，ver -1733）
  fireTracer(sx, sy, tx, ty);
}
/* ══ BR（破防彈雨）的火線：**從演出畫面兩側隨機高度射出**（ver -1622，Ray 指定）══
   ⚠ 盤面那時沒有格子可點（BR 打的是敵人身上），所以起點不是「哪一格」，
     是畫面兩側 —— 左右隨機、高度隨機，打向被點的那一點。 */
export function fireTracerSide(tx, ty){
  const host=$('fxTop'); if(!host) return;
  const r=host.getBoundingClientRect();
  const left=Math.random()<0.5;
  const sx=left ? -40 : r.width+40;
  const sy=Math.random()*r.height;
  fireTracer(sx, sy, tx, ty);
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
  if(portraitOverride && en && en===curCard() && portraitOverride.key===state.currentEnemyKey)
    return portraitOverride.src;   // NI 換上的立繪（見 swapPortrait）
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
/* ══⚠⚠ 登場音在戰鬥結束時淡出（ver -1881，Ray：「怪的登場音效在戰鬥結束後就淡出」）══
   長的吼聲（龍吟、詠唱）會一路響進結算頁 —— 所以 SE 走 `playCue` 拿一個把手，
   `stopEntranceSe` 由 combat 的 `stopAll`（所有結束路徑的匯流點）收掉（鐵律 8）。
   ⚠ 語音照舊一次播完：那是台詞，短，而且 `playVoice` 走語音鏈沒有把手。 */
let entranceCues = [];
/* ══ 敵人立繪的取景：**唯一的套用點**（ver -1883 由 setEnemy 抽出，鐵律 8）══
   `fit` ＝卡上的 `{ mode, pos, scale, shiftY }`。setEnemy 與管理人的「敵立繪」編輯面板
   （main.js，即時預覽）都走這一支 —— 兩邊各寫一份，預覽與實戰就會對不上。 */
export function applyEnemyFit(fit){
  const eImg = $('enemyImg'); if(!eImg) return;
    eImg.style.objectPosition = (fit && fit.pos) || '';
    /* `fit.flip`（ver -2131，Ray：「戰鬥中的敵繪修改也要有翻轉選項」）＝水平翻轉。
       ⚠ 用獨立的 `scale` 屬性，**不可以用 transform**（下面那段說明的同一個理由：transform 被受擊／降臨演出佔走了）。 */
    eImg.style.scale = (fit && fit.flip) ? '-1 1' : '';
    /* ══⚠⚠ **`fit.scale`／`fit.shiftY` ＝把他擺遠一點**（ver -1565，Ray：「尼莫戰
       讓他站稍遠一點，應該是圖稍縮 上移 全身入鏡但不要太上面」）══
       · `scale`  ＝畫面上佔多大（1 ＝滿框；0.86 ＝縮到 86%）
       · `shiftY` ＝往上／下挪，單位是**框高的比例**（負數往上）
       ⚠⚠⚠ **不可以用 `transform`**：`#enemyImg` 的 `transform` 已經被**受擊演出**
         佔走了（`.hit` 那一串位移與縮放，ver -598）—— 一個元素只有一份 transform，
         寫上去會在挨打那一瞬整個被蓋掉，而且不會報錯（同 §6.5.4.4 淨化那一條的坑）。
       ⇒ 改成**縮元素框自己**（`inset`）：它是 `position:absolute;inset:0`，
         而 `object-fit:contain` 會跟著框縮 —— 等於把人擺遠。
       ⚠ 沒寫這兩格的怪**一個像素都不會動**（`inset` 歸零回預設）。 */
    { const f=fit||{}, k=(+f.scale||1), dy=(+f.shiftY||0);
      if(k!==1 || dy!==0){
        const h=(1-k)/2*100, v=(1-k)/2*100;
        eImg.style.left=h+'%'; eImg.style.right=h+'%';
        eImg.style.top=(v+dy*100)+'%'; eImg.style.bottom=(v-dy*100)+'%';
        /* ⚠⚠⚠ **寬高也要一起給**（ver -1702 修）：CSS 的 `#enemyImg` 寫死了
           `width:100%;height:100%` —— 有明寫寬高時 `right`／`bottom` 是**被忽略的**，
           於是 -1565 起這一條從來沒有縮放過，只是把整張圖往左上（或右下）平移。
           （尼莫的 0.86 其實只往右下挪了 7%；墓主的 1.4 只往左上挪、根本沒變大。） */
        eImg.style.width=(k*100)+'%'; eImg.style.height=(k*100)+'%';
      }else{ eImg.style.left=eImg.style.right=eImg.style.top=eImg.style.bottom='';
             eImg.style.width=eImg.style.height=''; } }
    /* ⚠ `fit.mode:'contain'`（ver -375）：**去背立繪**用的。滿版插圖走 cover（預設），
       但把對話立繪借來當戰鬥立繪時，cover 會把頭裁掉 —— 那種要 contain ＋ 背景。 */
    eImg.style.objectFit = (fit && fit.mode) || '';
    placeIdle();   // 待機層跟著新的取景重新對位（ver -2075）
    /* 群體敵人（ver -2043，Ray：「縮放要讓我縮敵人，那個是戰鬥用背景」）：取景套在**人那一組**上 ——
       框（inset／寬高）照抄 #enemyImg，每一層的 object-position／object-fit 也照抄。 */
    { const g=$('enemyGroup');
      if(g){ for(const k of ['left','right','top','bottom','width','height']) g.style[k]=eImg.style[k];
             for(const im of g.querySelectorAll('.eg-guard,.eg-cover')){ im.style.objectPosition=eImg.style.objectPosition; im.style.objectFit=eImg.style.objectFit; }
             placeGroupShadows(); } }
}
export function stopEntranceSe(ms){
  for(const h of entranceCues){ try{ h.stop(ms==null ? 700 : ms); }catch(_){} }
  entranceCues = [];
}
/* ══ 敵人語音不疊（ver -1964，Ray：「語音注意不要重疊，播放中就不要播下一個語音」）══
   這一隻的語音只有一條聲道：上一句還在播，下一句**直接不播**（不排隊 —— 排隊的話
   連點劈落會積一長串，播到後面早就不對拍了）。長度問 `SFX.duration`（音檔本身，鐵律 7），
   還沒解碼就保守當 1.5 秒。⚠ 所有敵人卡的語音（登場／受擊／戰敗戰勝／劈落／NI／斬）
   都走這一支，所以這條閘門一處就管全部（鐵律 8）。 */
let voBusyUntil = 0;
function playEntranceSe(key, force){
  if(!key) return false;
  const p = asset(key);
  if(!p) return false;
  try{
    if(/\/vo\//.test(p)){
      const now = performance.now();
      /* `force` ＝必播（Ray：「NI 語音必播」）：不看閘門，播完照樣佔住聲道。 */
      if(!force && now < voBusyUntil) return false;
      SFX.playVoice(p, sfxGain(key));
      voBusyUntil = now + (SFX.duration(p) || 1500) + 80;
    }
    else entranceCues.push(SFX.playCue(p, sfxGain(key)));
  }catch(_){ return false; }
  return true;
}
/* 給 combat 用的同一支（米夏的 NI 發動／斬殺語音）。 */
export function playCardVoice(key, force){ return playEntranceSe(key, force); }
/* ══ 卡上語音的輪播（ver -1967，米夏第二批：攻擊／受創／劈落各一串）══
   卡上欄位寫一個鍵或一串鍵；一串就輪播。`rate` ＝出聲機率（`<欄位>Rate`）。
   ⚠ 被語音閘擋掉的那一次**不推進輪播**，下一次還是輪到同一句 ——
     不然連點時各句的出現比例會被閘門的節奏打亂。
   ⚠ 換一隻怪輪播從頭來。 */
const rotIdx = {};   // 欄位 → 下一句
let rotKey = null;
function rotVoice(field){
  const en = curCard(); if(!en) return;
  let list = en[field]; if(!list) return;
  if(!Array.isArray(list)) list=[list];
  if(!list.length) return;
  if(rotKey !== state.currentEnemyKey){ rotKey = state.currentEnemyKey; for(const k in rotIdx) delete rotIdx[k]; for(const k in rotLeft) delete rotLeft[k]; }
  /* `<欄位>Every:[min,max]` ＝每 min~max 次才出一句（間隔逐次重擲；ver -2005，Ray：「米夏防禦語音太密，防 7~9 次出一次」）。
     語音閘擋掉時計數不歸零 —— 下一次再試。有寫它就不看 `Rate`。 */
  const every = en[field+'Every'];
  if(every){
    if(rotLeft[field] == null) rotLeft[field] = rollEvery(every);   // 這隻怪第一次：先擲間隔
    if(--rotLeft[field] > 0) return;
  } else {
    const rate = (en[field+'Rate'] != null) ? en[field+'Rate'] : 1;
    if(Math.random() >= rate) return;
  }
  const i = rotIdx[field] || 0;
  if(playEntranceSe(list[i % list.length])){ rotIdx[field] = i + 1; if(every) rotLeft[field] = rollEvery(every); }
}
const rotLeft = {};
function rollEvery(e){ const [a,b] = Array.isArray(e) ? e : [e,e]; return a + Math.floor(Math.random()*(b-a+1)); }
/* 劈落（卡上 `parryVoice`；頻率走 `parryVoiceEvery`，ver -2005 起取代 `parryVoiceRate`）。 */
function playParryVoice(){ rotVoice('parryVoice'); }
/* 玩家**有效攻擊**打中牠（卡上 `damageVoice`，Ray：「countered 為被玩家有效攻擊，tag 改成 damage」）。
   ⚠ 「有效」＝真的扣到血；被劈落擋掉的普攻不算（那一下 combat 根本不叫這一支）。 */
export function playDamageVoice(){ rotVoice('damageVoice'); }
/* 血量門檻語音（卡上 `hpVoice:{50:'…', 20:'…'}`，Ray：「50 為 hp50% 以下、20 為 hp20% 以下」）——
   每一個門檻一隻怪只講一次；一擊跨過兩條只講最低那一條。**必播**（劇情性的一句，不給閘門吃掉）。 */
const hpVoSaid = new Set(); let hpVoKey = null;
export function checkHpVoice(pct){
  const en = curCard(); const map = en && en.hpVoice; if(!map) return;
  if(hpVoKey !== state.currentEnemyKey){ hpVoKey = state.currentEnemyKey; hpVoSaid.clear(); }
  const due = Object.keys(map).map(Number).filter(t => pct <= t && !hpVoSaid.has(t)).sort((a,b)=>a-b);
  if(!due.length) return;
  due.forEach(t => hpVoSaid.add(t));
  playEntranceSe(map[due[0]], true);
}
/* 換這一隻的立繪（不重演降臨、不動數值）：米夏 NI 那一刻換成 `enemy_misha_ni`。
   ⚠ 先解碼再換：直接設 `src` 的話新圖解碼完之前會閃一格空白。 */
/* ⚠ 換上之後**鎖住**（Ray：「NI 後把戰鬥立繪改成 NI 版」）：記進 `portraitOverride`，
   `enemyImage()` 對這一隻一律回它 —— 之後任何重掛立繪的路（門放行、重載）都拿到 NI 版，
   不會被換回去。換敵（`setEnemy`）時清掉。 */
let portraitOverride=null;   // { key:這一隻的卡鍵, src }
export function swapPortrait(assetKey, opts){
  const el=$('enemyImg'); const u=asset(assetKey);
  if(!el || !u) return;
  opts=opts||{};
  portraitOverride={ key:state.currentEnemyKey, src:u };
  const im=new Image(); im.src=u;
  /* 換上的那張可以有**自己的取景**與**待機循環**（ver -2068，米夏 NI 重畫：人縮小、四周留白給光效）——
     卡上 `lastStand.fit`／`lastStand.idle`。沒寫＝照舊沿用卡的取景、靜態圖。 */
  const go=()=>{ stopIdleLoop(); el.src=u; if(opts.fit) applyEnemyFit(opts.fit); if(opts.idle) startIdleLoop(opts.idle); };
  (im.decode ? im.decode() : Promise.resolve()).then(go, go);
}
/* 立繪畫布上的一塊（anim.json 的 canvas／box）→ `#top` 座標：照 #enemyImg 現在的框與 object-fit／object-position。
   單人倒地（playKillFall）與待機循環（startIdleLoop）共用（鐵律 7）。 */
function canvasBoxInTop(eImg, j){
  const top=$('top'); if(!eImg || !top) return null;
  const cw=(j.canvas||[eImg.naturalWidth||1024, eImg.naturalHeight||1536])[0], ch=(j.canvas||[eImg.naturalWidth||1024, eImg.naturalHeight||1536])[1], b=j.box||[0,0,cw,ch];
  const er=eImg.getBoundingClientRect(), tr=top.getBoundingClientRect(), cs=getComputedStyle(eImg);
  const W=er.width, H=er.height, k = cs.objectFit==='contain' ? Math.min(W/cw, H/ch) : Math.max(W/cw, H/ch);
  const dw=cw*k, dh=ch*k, p=String(cs.objectPosition||'50% 0%').split(/\s+/).map(x=>parseFloat(x)/100);
  const ox=er.left-tr.left+(W-dw)*(isNaN(p[0])?0.5:p[0]), oy=er.top-tr.top+(H-dh)*(isNaN(p[1])?0:p[1]);
  return { left:ox+b[0]*k, top:oy+b[1]*k, width:b[2]*k, height:b[3]*k };
}
/* ══ 待機循環（ver -2068，動畫 dc7527d8：米夏夢魘化待機 24 格 3 秒）══ 資料夾裡 anim.json（canvas／box／frames／fps／loop）＋ frame_NN。
   全部載好才換上（沒好就照舊靜態圖）；換怪／換立繪時收掉（stopIdleLoop）。
   ⚠ 格子是縮成六成的版本（_s60，解碼約 22 MB；原尺寸 64 MB），照 box 拉回原大小 —— 畫面上看不出差別。 */
let idleT=0, idleEl=null, idleJ=null;
/* 視窗尺寸／取景變了：待機層照立繪現在的框重新對位。 */
function placeIdle(){ if(!idleEl || !idleJ) return; const r=canvasBoxInTop($('enemyImg'), idleJ); if(!r) return;
  idleEl.style.left=r.left+'px'; idleEl.style.top=r.top+'px'; idleEl.style.width=r.width+'px'; idleEl.style.height=r.height+'px'; }
try{ window.addEventListener('resize', ()=>placeIdle()); }catch(_){}
/* 這張卡的待機動檔資料夾：卡上 `idle` 明寫優先（false＝關），否則照立繪檔名查 config 的 ENEMY_IDLE（ver -2075）。群體敵人不吃。 */
function imgStem(en){ const p=String(asset(en && en.image)||'').split('?')[0]; return p.slice(p.lastIndexOf('/')+1).replace(/\.\w+$/,''); }
function idleDirFor(en){
  if(!en || en.group || en.idle===false) return null;
  if(typeof en.idle==='string') return en.idle;
  return ENEMY_IDLE[imgStem(en)] || null;
}
function startCardIdle(en){ applyFar(en); if(portraitOverride) return; const d=idleDirFor(en); if(d) startIdleLoop(d); preloadActionClips(en); }
/* ══ 攻擊／延時動畫（ver -2472）══ 一次性的動檔：從待機切進來、播完切回待機（Ray：「所有攻擊都要回到原本的中立動畫」）。
   動檔在換上這隻怪的那一刻預載（戰鬥內，鐵律 13）；還沒載好就不演（照舊只有受擊特效）。 */
const clipCache={};
function loadClip(dir){
  if(clipCache[dir]) return; const c={}; clipCache[dir]=c;
  fetch(dir+'anim.json').then(r=>r.ok?r.json():null).then(j=>{ if(!j) return;
    const fr=Array.from({length:j.frames||0},(_,i)=>{ const f=new Image(); f.src=dir+'frame_'+String(i).padStart(2,'0')+'.webp'; return f; });
    return Promise.all(fr.map(f=>f.decode ? f.decode().catch(()=>{}) : 0)).then(()=>{ if(fr.every(f=>f.naturalWidth)){ c.j=j; c.fr=fr; } });
  }).catch(()=>{});
}
function clipFor(kind, en){ en=en||curCard(); if(!en || en.group) return null; const s=imgStem(en);
  if(kind==='miss') return ENEMY_MISS[s] || ENEMY_DELAY[s] || null;
  if(kind==='enter') return ENEMY_ENTER[s] || null;   // 點錯：有 M 用 M，沒有就借延時那一支（ver -2524）
  return ((kind==='atk'?ENEMY_ATK:ENEMY_DELAY)[s])||null; }
function preloadActionClips(en){ for(const k of ['atk','delay','miss','enter']){ const c=clipFor(k,en); if(c && c.dir) loadClip(c.dir); } }
/* 這隻怪有沒有 M（點錯）動作：點錯播的是延時那一支（ENEMY_DELAY），有它就算有 M（ver -2523）。 */
export function hasMissClip(){ return !!clipFor('miss'); }
export function hasActionClips(){ return !!(clipFor('atk') || clipFor('delay')); }   // 這隻怪有攻擊／延時動畫嗎（ver -2496）
let clipT=0, clipEl=null;
/* 平時站遠（ENEMY_ATK 的 `far`，ver -2473）：用 CSS 的獨立 `scale` 屬性縮 —— 不碰 transform，受擊動畫照常疊上去。
   立繪本體、待機層、攻擊層三個都套（誰在畫面上就是誰）。 */
const FAR_ORIGIN='50% 78%';
function farOf(en){ en=en||curCard(); const c=clipFor('atk',en); return (c && c.far) || 1; }
function applyFar(en){ const k=farOf(en); for(const el of [$('enemyImg'), idleEl, clipEl]) if(el){ el.style.transformOrigin=FAR_ORIGIN; el.style.scale = k===1 ? '' : String(k); } }
/* 演一次；回傳「還要幾毫秒才打到玩家」（扣血延到那一格），沒演就回 0。 */
export function playActionClip(kind, onDone){
  const c=clipFor(kind), L=c && clipCache[c.dir]; if(!L || !L.fr) return 0;
  const eImg=$('enemyImg'), r=canvasBoxInTop(eImg, L.j); if(!r) return 0;
  clearTimeout(clipT); clearInterval(idleT); idleT=0;
  let el=idleEl; if(!el){ if(!clipEl){ clipEl=document.createElement('img'); clipEl.className='en-idle'; clipEl.alt=''; eImg.after(clipEl); } el=clipEl; }
  eImg.style.visibility='hidden';
  el.style.left=r.left+'px'; el.style.top=r.top+'px'; el.style.width=r.width+'px'; el.style.height=r.height+'px';
  let i=0; el.src=L.fr[0].src; if(el===clipEl) applyFar();
  const fps=L.j.fps||24, N=L.fr.length;
  const hitF=Math.min(N-1, (c.hit!=null) ? c.hit : Math.floor(N*0.4));
  /* 收回加速（`retMul`，-2486 Ray「撲咬收回再快一點」）：打到那一格之後的格子以 fps×retMul 播 */
  /* 前撲加速（`preMul`，-2512 Ray「收回加速 前撲也加速」）：打到那一格之前（含）以 fps×preMul 播 */
  const rm=c.retMul||1, pm=c.preMul||1, tAt=f=> f<=hitF ? f*1000/(fps*pm) : (hitF*1000/(fps*pm) + (f-hitF)*1000/(fps*rm));
  const T=tAt(N), tHit=tAt(hitF);
  { const k=farOf(); if(k!==1 || (kind==='atk' && c.near)){   // 攻擊時撲近：打到那一格到最大，收回的路上退回遠處（ver -2529：平時不站遠也能撲近）
      el.style.transformOrigin=FAR_ORIGIN;
      const off=t=>Math.max(0,Math.min(1,t/T)), hold=Math.min(T, tHit+60), back=Math.min(T, tHit+Math.max(120,(T-tHit)*0.7));
      const n=String(c.near || 1), kf = (kind==='atk' || c.near) ? [{scale:String(k),offset:0},{scale:n,offset:off(tHit)},{scale:n,offset:off(hold)},{scale:String(k),offset:off(back)},{scale:String(k),offset:1}] : [{scale:String(k)},{scale:String(k)}];
      el.animate(kf.map(q=>({...q, easing:'ease-in-out'})),{duration:T}); } }   /* ease 逐段套，峰值才準準落在 hit 那一格（-2485） */
  const t0=performance.now();
  const fxAt=new Map((c.fx||[]).map(f=>[f.frame, f]));   // 動作段的程式特效（ver -2524：光翼下拍噴瓦礫）
  const step=()=>{ i++;
    if(fxAt.has(i)) clipFx(fxAt.get(i));
    if(i<N){ el.src=L.fr[i].src; clipT=setTimeout(step, Math.max(0, t0+tAt(i+1)-performance.now())); return; }
    clipT=0;
    if(idleEl && idleFr){ placeIdle(); runIdle(); }                 // 回待機 loop
    else { if(clipEl){ clipEl.remove(); clipEl=null; } eImg.style.visibility=''; }
    if(onDone) onDone();
  };
  clipT=setTimeout(step, tAt(1));
  return Math.round(tHit);
}
/* ══ 動作段掛的程式特效（ver -2524）══ `fx:[{frame,type}]`，播到那一格觸發。
   · `rubble` ＝ 瓦礫噴襲（Ray：「振翅下拍到底，碎石從瓦礫堆往鏡頭噴」）：畫面下方中央（瓦礫堆）噴出一把碎石，
     由小變大、往四周散開飛出畫面 —— 讀起來是朝鏡頭砸過來。一張 canvas，約 0.9 秒拆掉。 */
function clipFx(f){
  if(!f) return;
  if(f.type==='rubble') return spawnRubble();
  if(f.type==='violetFlash') return spawnVioletFlash();
}
/* 紫白光芒（ver -2525，Ray：「暴炎時從中心發出紫白光芒快速籠罩畫面後快速淡出，用首頁的光圈特效來改，外圈改紫色」）：
   首頁那一顆聖光綻放的配方（白核心＋多層羽化），外圈換紫（CSS `--violet-glow`）；從敵人圖的中心發出，
   1 秒蓋滿上半、0.6 秒淡出（只在 #top 裡，不蓋數字面板）。純演出：不清攻擊圈、不擋排程（傷害照動作段的打到那一格）。 */
/* ══ 蓄力（下一發加倍）的特效與提示（ver -2525，Ray：「下一發攻擊會 200% 傷害要有能力提升特效跟提示」）══
   `setEmpowered(n)`：n>1＝上 buff（敵人身上紫色脈動光暈＋一行「下一擊威力 ×n」浮字、名牌旁常駐標記）；0＝收掉。
   擁有者是 combat（state.enemyNextAtkMul），這裡只演。換怪時 setEnemy 收掉。 */
export function setEmpowered(n){
  const top=$('top'); if(!top) return;
  let tag=document.getElementById('enEmpowerTag');
  if(!(n>1)){ top.classList.remove('en-empowered'); if(tag) tag.remove(); return; }
  top.classList.add('en-empowered');
  if(!tag){ tag=document.createElement('div'); tag.id='enEmpowerTag'; top.appendChild(tag); }
  tag.textContent='▲ 下一擊威力 ×'+n;
  const pop=document.createElement('div'); pop.className='en-empower-pop'; pop.textContent='威力提升！下一擊 ×'+n;
  top.appendChild(pop); setTimeout(()=>pop.remove(), 1500);
}
const VF_GROW_MS=1000, VF_FADE_MS=600;   // ＝ CSS #violetFlash 的 transition（兩邊互指）；ver -2526 Ray「光圈太快了」由 350/400 放慢
function spawnVioletFlash(){
  const old=document.getElementById('violetFlash'); if(old) old.remove();
  /* ver -2526 Ray「不要遮到數字面板」：關在 #top（上半）裡，座標換成 #top 相對 */
  const top=$('top'); if(!top) return;
  const tr=top.getBoundingClientRect(), el0=idleEl || clipEl || $('enemyImg'), W=tr.width, H=tr.height;
  let cx=W*0.5, cy=H*0.55;
  if(el0){ const R=drawnRect(el0, tr); if(R.W>4){ cx=R.L+R.W/2; cy=R.T+R.H*0.55; } }
  const d=Math.max(90, Math.min(W,H)*0.22), need=2*Math.hypot(Math.max(cx,W-cx), Math.max(cy,H-cy));
  const el=document.createElement('div'); el.id='violetFlash'; el.innerHTML='<div class="vf-glow"></div>';
  el.style.left=cx+'px'; el.style.top=cy+'px'; el.style.width=d+'px'; el.style.height=d+'px';
  el.style.setProperty('--vf-scale', (need/d/0.30).toFixed(2));
  top.appendChild(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('grow')));
  setTimeout(()=>el.classList.add('fade'), VF_GROW_MS);
  setTimeout(()=>{ if(el.parentNode) el.remove(); }, VF_GROW_MS+VF_FADE_MS+50);
}
function spawnRubble(){
  const top=$('top'); if(!top) return;
  const W=top.clientWidth, H=top.clientHeight, cv=document.createElement('canvas');
  cv.width=W; cv.height=H; cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';
  top.appendChild(cv); const cx=cv.getContext('2d');
  const ox=W*0.5, oy=H*0.82, rnd=(a,b)=>a+Math.random()*(b-a), rocks=[];
  for(let i=0;i<26;i++){ const ang=rnd(-Math.PI*0.95,-Math.PI*0.05), sp=rnd(0.35,1.1);
    rocks.push({ x:ox+rnd(-W*0.08,W*0.08), y:oy+rnd(-H*0.04,H*0.04), vx:Math.cos(ang)*sp*W/900, vy:Math.sin(ang)*sp*H/900,
      r:rnd(3,9)*W/390, rot:rnd(0,6.28), vr:rnd(-0.02,0.02), g:(60+Math.random()*50)|0, sides:(4+Math.random()*3)|0, d:rnd(0,80) }); }
  const t0=performance.now(), END=900;
  const tick=now=>{ const t=now-t0; cx.clearRect(0,0,W,H);
    /* 一團塵爆墊底 */
    if(t<500){ const q=t/500, rr=W*(0.12+q*0.35), gr=cx.createRadialGradient(ox,oy,0,ox,oy,rr);
      gr.addColorStop(0,`rgba(120,105,95,${(0.55*(1-q)).toFixed(3)})`); gr.addColorStop(1,'rgba(120,105,95,0)');
      cx.fillStyle=gr; cx.beginPath(); cx.arc(ox,oy,rr,0,6.283); cx.fill(); }
    for(const k of rocks){ const a=t-k.d; if(a<0) continue;
      const z=1+a/260;                                   // 往鏡頭飛：越飛越大、越散越開
      const x=ox+(k.x-ox+k.vx*a)*z, y=oy+(k.y-oy+k.vy*a)*z, r=k.r*z*z*0.7;
      if(x<-r*2||x>W+r*2||y<-r*2||y>H+r*2) continue;
      cx.save(); cx.translate(x,y); cx.rotate(k.rot+k.vr*a);
      cx.fillStyle=`rgb(${k.g},${k.g-6},${k.g-12})`; cx.strokeStyle='rgba(20,16,14,.85)'; cx.lineWidth=Math.max(1,r*0.12);
      cx.beginPath(); for(let s=0;s<k.sides;s++){ const an=s/k.sides*6.283, rr=r*(0.7+0.3*((s*37+k.g)%10)/10); s?cx.lineTo(Math.cos(an)*rr,Math.sin(an)*rr):cx.moveTo(Math.cos(an)*rr,Math.sin(an)*rr); }
      cx.closePath(); cx.fill(); cx.stroke(); cx.restore(); }
    if(t<END) requestAnimationFrame(tick); else cv.remove(); };
  requestAnimationFrame(tick);
}
let idleFr=null;
function runIdle(){ clearInterval(idleT); if(!idleEl || !idleFr) return; let i=0; idleEl.src=idleFr[0].src;
  idleT=setInterval(()=>{ i=(i+1)%idleFr.length; idleEl.src=idleFr[i].src; }, 1000/((idleJ&&idleJ.fps)||8)); }
function stopIdleLoop(){ clearInterval(idleT); idleT=0; clearTimeout(clipT); clipT=0; if(clipEl){ clipEl.remove(); clipEl=null; } idleFr=null; if(idleEl){ idleEl.remove(); idleEl=null; }
  const e=$('enemyImg'); if(e && e.style.visibility==='hidden' && !document.querySelector('#top .en-fall')) e.style.visibility=''; }
function startIdleLoop(dir){
  stopIdleLoop();
  const key=state.currentEnemyKey;
  fetch(dir+'anim.json').then(r=>r.ok?r.json():null).then(j=>{
    if(!j || state.currentEnemyKey!==key) return;
    const fr=Array.from({length:j.frames||0},(_,i)=>{ const f=new Image(); f.src=dir+'frame_'+String(i).padStart(2,'0')+'.webp'; return f; });
    return Promise.all(fr.map(f=>f.decode ? f.decode().catch(()=>{}) : Promise.resolve())).then(()=>{
      if(state.currentEnemyKey!==key || !fr.length || !fr.every(f=>f.naturalWidth)) return;
      const eImg=$('enemyImg'), r=canvasBoxInTop(eImg, j); if(!r) return;
      const el=document.createElement('img'); el.className='en-idle'; el.alt='';
      el.style.left=r.left+'px'; el.style.top=r.top+'px'; el.style.width=r.width+'px'; el.style.height=r.height+'px';
      el.src=fr[0].src; eImg.after(el); idleEl=el; idleJ=j; idleFr=fr; eImg.style.visibility='hidden'; applyFar();
      if(!clipT) runIdle();   // 攻擊動畫正在演就等它演完再接（它收尾會叫 runIdle）
    });
  }).catch(()=>{});
}
/* ══ 空戰的視差背景（ver -2444，Ray：「我想做出機戰那樣的背景效果」）══════════════════════════════
   敵卡寫 `sky:'<鍵>'` ⇒ #top 裡鋪 `tuning.skyBattle[鍵]` 的四層（由底至上）：
     base（不透明、水平無縫、最慢）→ mid（alpha、無縫、較快）→【敵人】→ 近景樹（單根，每 10~12 秒從右往左一閃而過，蓋在敵人之上）
     ＋程式跑的落葉／綠光點（Ray：「葉子另外用程式跑」）。世界往左捲＝龍往右飛（龍頭朝右）。
   ⚠ 一個 rAF 推全部（捲動、近景樹、落葉），換敵／結束一律走 stopSkyBattle（鐵律 8；combat.stopAll 也叫）。 */
/* ══ 戶外空戰的天空：分層橫向 loop 緩平移（ver -2467／-2468，Ray：「把空戰的背景改成橫軸 loop 緩平移」
   「戶外空戰，古城站不用改」「要分層平移，像古城戰那樣」）══
   卡上的 `bg` 是 `sky_*` 那一族、而且卡上沒有 `sky`（古城走自己那一套四層視差＋龍的攻擊演出，不吃這一條）：
   · `tuning.skyPan[bg名]` 有寫 ⇒ 照它的 `layers`（由底至上；每層 `src`／`sec`＝捲過一張圖幾秒／`fixed`＝不捲（月亮）／`mirror`＝圖本身不無縫時用「原圖＋鏡像」接）
     分層捲動，**最底一層在敵人後面、`front:true` 的層蓋在敵人前面**。
   · 沒寫（分層圖還沒交）⇒ 退回整張圖「原圖／鏡像」交替、90 秒一輪（-2467）。
   每一層是一條四張的長條往左走一半＝一輪（無縫）。⚠ 每次 setEnemy 都明確設一次（null＝拆掉）。 */
function setSkyPan(nm, url){
  const top=$('top'); if(!top) return;
  const old=[...top.querySelectorAll(':scope > .sky-pan')], key=nm ? nm+'|'+url : '';
  if(old.length && old[0].dataset.key===key) return;
  old.forEach(e=>e.remove());
  if(!nm) return;
  const cfg=((GAME_CONFIG.tuning||{}).skyPan||{})[nm.toLowerCase()];
  const layers=cfg ? cfg.layers.map(L=>({ ...L, src:L.src+assetVer(L.src) })) : [{ src:url, sec:45, mirror:true }];
  const eImg=$('enemyImg'), vig=$('topVignette');
  layers.forEach((L,li)=>{
    const el=document.createElement('div'); el.className='sky-pan'+(L.front?' front':'')+(L.fixed?' fixed':''); el.dataset.key=key;
    el.style.animationDuration=((L.sec||45)*2)+'s';   // sec＝捲過一張圖的秒數；長條一輪走兩張
    if(L.fixed){ const im=document.createElement('img'); im.alt=''; im.src=L.src; el.appendChild(im); }   // 不捲的層（月亮：世界觀固定不動）；對位同原圖的 center/cover
    else for(let i=0;i<4;i++){ const im=document.createElement('img'); im.alt=''; im.src=L.src; if(L.mirror && i%2) im.className='mir'; el.appendChild(im); }
    if(L.front) top.insertBefore(el, vig||null);
    else top.insertBefore(el, li===0 ? top.firstChild : ($('enemyShadow')||eImg));
  });
}
let sky=null;
export function stopSkyBattle(force){
  if(!sky) return;
  /* 龍正在斜墜（deathFx:'skyfall'）時，打贏的 stopAll 不要當場拆背景（ver -2459，Ray：「背景不要黑掉」）——
     視差背景陪牠一起演到閉棺蓋上才收；換怪／重開（setSkyBattle）一律 force 立刻收。 */
  if(!force && sky.dying){ if(!sky.dieT) sky.dieT=setTimeout(()=>stopSkyBattle(true), 2600); return; }
  clearTimeout(sky.dieT);
  cancelAnimationFrame(sky.raf);
  for(const el of sky.els) el.remove();
  clearTimeout(sky.showT);
  const top=$('top'); if(top) top.classList.remove('sky-on');
  const eImg=$('enemyImg'); if(eImg) eImg.style.opacity = sky.defeated ? '0' : '';   // 戰敗收掉時龍維持藏著（ver -2460）
  sky=null;
}
/* 空戰玩家戰敗（ver -2460，Ray：「被龍攻擊敗，畫面上不要留龍」）：龍本體藏起來，衝出去的那條照舊飛出畫面，攻擊演出收尾也不再把牠淡回來。
   combat.lose 呼叫；不是空戰（沒有 sky）就什麼都不做。 */
export function skyDefeatHide(){
  if(!sky) return;
  sky.defeated=true;
  for(const el of [idleEl, $('enemyImg')]) if(el){ el.style.transition='opacity .3s'; el.style.opacity='0'; }
}
export function restoreSkyBattle(){ const en=(GAME_CONFIG.enemies||{})[state.currentEnemyKey]; setSkyBattle(en && en.sky); }
function setSkyBattle(key){
  stopSkyBattle(true);
  { const e0=$('enemyImg'); if(e0) e0.style.opacity=''; }   // 上一場空戰戰敗藏起來的龍（skyDefeatHide，ver -2460）；這一場是空戰的話下面會再藏
  const C=key && ((GAME_CONFIG.tuning||{}).skyBattle||{})[key]; if(!C) return;
  const top=$('top'), eImg=$('enemyImg'), vig=$('topVignette'); if(!top || !eImg) return;
  const mk=(cls,before)=>{ const d=document.createElement('div'); d.className='sky-l '+cls; top.insertBefore(d,before); return d; };
  const base=mk('sky-base', top.firstChild), mid=mk('sky-mid', $('enemyShadow')||eImg);
  base.style.backgroundImage=`url("${C.base}")`; mid.style.backgroundImage=`url("${C.mid}")`;
  const near=document.createElement('img'); near.className='sky-near'; near.alt=''; top.insertBefore(near, vig||null);
  const lv=document.createElement('canvas'); lv.className='sky-leaves'; top.insertBefore(lv, vig||null);
  top.classList.add('sky-on');
  /* 靜態立繪不露面（ver -2445，Ray：「為什麼你是用靜態圖？有動圖啊」）：待機動畫 48 格要約一秒才載齊，
     那一秒畫面上站的是靜態圖 ⇒ 空戰時先藏著，待機層一上來就是它（startIdleLoop 自己會把靜態圖 visibility 收掉）；
     4 秒還沒載到（抓不到動檔）才把靜態圖放出來，不然畫面上就沒有龍了。 */
  eImg.style.opacity='0';
  const showT=setTimeout(()=>{ if(!idleEl && eImg) eImg.style.opacity=''; }, 4000);
  const nearImgs=C.near.map(u=>{ const im=new Image(); im.src=u; return im; });
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const leaves=Array.from({length:C.leaves||40},()=>({ x:Math.random(), y:Math.random(), z:rnd(0.3,1), r:Math.random()*6.28, w:rnd(-1,1), g:Math.random()<0.25 }));
  sky={ C, showT, els:[base,mid,near,lv], raf:0, t0:performance.now(), last:performance.now(), nearAt:performance.now()+rnd(3,6)*1000, nearT:-1, nearPause:false, lunge:null };
  const tick=now=>{
    if(!sky) return;
    const dt=Math.min(now-sky.last,60); sky.last=now;
    const H=top.clientHeight, W=top.clientWidth, tw=H*(C.aspect||1.5), t=(now-sky.t0)/1000;
    base.style.backgroundSize=`${tw}px ${H}px`; mid.style.backgroundSize=`${tw}px ${H}px`;
    base.style.backgroundPositionX=`${-((t/C.baseSec)%1)*tw}px`;
    mid.style.backgroundPositionX=`${-((t/C.midSec)%1)*tw}px`;
    /* 近景樹：每 nearEvery 秒挑一根，從右往左掃過（攻擊演出期間暫停，結束後重新排） */
    /* （攻擊演出那一根由 onAssaultLand 直接刷） */
    if(!sky.nearPause && sky.nearT<0 && now>=sky.nearAt){ const im=nearImgs[(Math.random()*nearImgs.length)|0]; near.src=im.src; sky.nearT=now; }
    if(sky.nearT>=0){ const k=(now-sky.nearT)/(C.nearSweep*1000), ns=C.nearScale||1, nh=H*ns, nw=nh*(C.nearAspect||0.36);   // 粗一點＝整根放大（ver -2446），上下超出畫面
      near.style.height=nh+'px'; near.style.width=nw+'px'; near.style.top=(-(nh-H)/2)+'px'; near.style.opacity='1';
      const nx=W+nw*0.2-(W+nw*1.4)*k; near.style.transform=`translateX(${nx}px)`;
      /* 攻擊演出那一根：龍「被樹幹掃掉」—— 樹幹中線以右的龍一律不畫（樹幹本身蓋著中線以左那半根），
         樹幹掃過去的地方龍就不見了，不會露出「龍突然消失」那一瞬（-2448 Ray：「不要露餡」） */
      if(sky.vanishEl){ const el=sky.vanishEl, tr=top.getBoundingClientRect(), r=el.getBoundingClientRect();
        const cut=Math.max(0, (r.right-tr.left)-(nx+nw*0.5)); el.style.clipPath=`inset(0 ${Math.min(r.width,cut)}px 0 0)`; }
      if(k>=1){ sky.nearT=-1; near.style.opacity='0'; sky.nearAt=now+rnd(C.nearEvery[0],C.nearEvery[1])*1000;
        if(sky.vanishEl){ sky.vanishEl.style.opacity='0'; sky.vanishEl.style.clipPath=''; sky.vanishEl=null; } } }
    /* 落葉／光點：往左下飄（世界往左捲）、慢慢翻 */
    if(lv.width!==W || lv.height!==H){ lv.width=W; lv.height=H; }
    const cx=lv.getContext('2d'); cx.clearRect(0,0,W,H);
    for(const l of leaves){ l.x-=dt*0.00010*(0.6+l.z*1.6); l.y+=dt*0.000035*(0.4+l.z); l.r+=dt*0.003*l.w;
      if(l.x<-0.05){ l.x=1.05; l.y=Math.random()*0.9; } if(l.y>1.05) l.y=-0.05;
      const px=l.x*W, py=l.y*H+Math.sin(now*0.001+l.r*3)*6;
      if(l.g){ const a=0.35+0.35*Math.sin(now*0.003+l.r*5); cx.fillStyle=`rgba(170,255,150,${a.toFixed(2)})`; cx.beginPath(); cx.arc(px,py,1.2+l.z*1.6,0,6.283); cx.fill(); }
      else { cx.save(); cx.translate(px,py); cx.rotate(l.r); cx.fillStyle=`rgba(${(90+40*l.z)|0},${(120+30*l.z)|0},${(40+15*l.z)|0},${(0.55+0.35*l.z).toFixed(2)})`;
        cx.beginPath(); cx.ellipse(0,0,2+l.z*4,(1+l.z*2)*Math.abs(Math.cos(now*0.004+l.r)),0,0,6.283); cx.fill(); cx.restore(); } }
    sky.raf=requestAnimationFrame(tick);
  };
  sky.raf=requestAnimationFrame(tick);
}
/* ══ 空戰怪的攻擊演出（ver -2444，Ray：「讓牠在前景掃過時消失在畫面 → 極近距離竄出：用同一支待機 loop 拉到極近，
   快速由左下往右上平移 → 然後再近景樹復歸」）══ **收圈那一刻**（攻擊落下；defense 的 releaseAssault → combat 轉交，ver -2445 Ray：「龍的攻擊是收圈才會發動」）演一次：
     ① 龍（待機層）往右滑出畫面 ② 同一支動畫放大到幾乎遮滿，從左下往右上快速掠過 ③ 回到原位淡入；
     演出期間近景樹暫停、結束後重新排它的節奏。⚠ 只在有 `sky` 的怪上演（其餘怪照舊）。 */
/* ══ 側舷齊射（ver -2489，卡上 assaultFx.type:'broadside'）══ 砲口火光＋往船尾快速飛走的煙。
   一張蓋在 #top 上的畫布，跑完自己拆；位置照立繪畫布換算（canvasBoxInTop，同待機層），所以船怎麼取景都對得上。 */
let broadsideCv=null;
/* ══ 受損冒黑煙（ver -2490，Ray：「空賊船被擊敗跟樹寄生龍一樣向斜下沉沒，但是要冒黑煙，從半血就開始冒煙」）══
   卡上 `damageSmoke:{ hp:0.5, canvas, pts }`：敵血 ≤ hp 起，從 pts（立繪畫布座標）持續噴黑煙，往船尾（右）與上方拖走；
   血越少噴越密。煙源跟著立繪現在的位置走（斜墜時煙一路拖著）。換怪收掉；打贏後跟著墜落再噴 3 秒自己收（不留在背景跑）。 */
/* ══ 戶外空戰的生物型敵人：接舷空戰的漂移（ver -2499，Ray：「空中戰的生物型敵人入場都是從近到遠進入畫面，
   並且會緩近緩遠（不能太遠），戰鬥期間會微幅往八向放大／縮小平移，像真的接舷空戰一樣」）══
   · 判定只有 `isAirBio` 一支：`aerial` ＋ 天空背景（`sky_*`）＋ 沒有 `sky`（古城那一套四層視差另有自己的演出）。
     ⚠ 船（`ship`）不吃 —— Ray 說的是「生物型」。
   · 空中怪都不走降臨（`isRise` 擋掉 aerial／ship）；生物型的入場＝從畫面外由近（大）到遠（小）飛進來（`airEnter`，門開那一刻演），演完才起待機、漂移才淡入振幅。
   · ⚠ 用 CSS 的**獨立 `translate`／`scale` 屬性**，不碰 `transform`（受擊、降臨、斜墜都在 transform 上）；
     `scale` 要乘回卡上的翻轉與站遠（`baseScale`），不然一動就把它們洗掉。
   · 收：換怪（setEnemy）／死亡（purgeEnemy，停在當下那一格不歸位）／stopAll。 */
function isAirBio(en){ return !!(en && en.kind==='aerial' && !en.sky && /^sky_/i.test(en.bg||'')); }
function isAirShip(en){ return !!(en && en.kind==='ship' && !en.sky && /^sky_/i.test(en.bg||'')); }
/* 機頭朝哪邊：側面飛行圖一律畫成朝左（天空往右捲，-2488）；卡上 fit.flip 就是朝右。−1＝往左飛。 */
function fwdOf(en){ return (en && en.fit && en.fit.flip) ? 1 : -1; }
let airDrift=null, airInAnim=null;
function stopAirDrift(reset){
  if(airDrift){ cancelAnimationFrame(airDrift.raf); airDrift=null; }
  if(airAtk){ const a=airAtk; airAtk=null; try{ a.cancel(); }catch(_){} }   // 攻擊途中被打死／換怪：歸回原位
  if(reset && airInAnim){ const a=airInAnim; airInAnim=null; try{ a.cancel(); }catch(_){} }   // 換怪：上一隻還在飛進來
  if(reset) for(const el of [$('enemyImg'), idleEl, clipEl]) if(el){ el.style.translate=''; }
}
/* 飄浮系（卡上 `float`，ver -2506，Ray：「飄浮系的敵人要微幅上下飄動」）：只上下浮，不縮放。
   `float:1`＝預設（振幅畫面高 1.6%、約 3.4 秒一輪）；寫成數字以外的物件 `{amp, sec}` 可逐隻調。
   ⚠ 用獨立 `translate`（同漂移），不碰 transform；收的路同 stopAirDrift。 */
function startFloatBob(en){
  const f=en.float, amp=(f && f.amp!=null) ? f.amp : 0.016, sec=(f && f.sec) ? f.sec : 3.4, ph=Math.random()*6.283;
  const S={ raf:0, t0:performance.now() }; airDrift=S;
  const tick=now=>{ if(airDrift!==S) return;
    const top=$('top'), H=top?top.clientHeight:400, t=(now-S.t0)/1000, e=Math.min(1,t/1.2);
    const dy=e*H*amp*(Math.sin(t*6.283/sec+ph) + 0.25*Math.sin(t*6.283/sec*2.3+ph*1.7))/1.25;
    const tr='0px '+dy.toFixed(1)+'px';
    for(const el of [$('enemyImg'), idleEl, clipEl]) if(el) el.style.translate=tr;
    S.raf=requestAnimationFrame(tick); };
  S.raf=requestAnimationFrame(tick);
}
/* ══ 空戰群體（卡上 `flock:{min,max}`，ver -2516，Ray：「骨脊長帶 3~4 隻一組、面具長幡 2~3 隻一組，擊落順序跟群戰一樣」）══
   同一張側面圖（含待機動檔）複製成 n 隻排成編隊（n 在 min～max 之間每場擲一次）；本尊 `#enemyImg`／待機層藏起來只當來源。
   · 血量照卡上的總血，平均分給每一隻；每掉一份擊落一隻 ——**擊落誰照群戰**：最後一發子彈落點壓在誰身上 → 離落點最近 → 最前排。
   · 入場、接舷漂移、攻擊劃過都改套在整個編隊容器上（`motionTargets`）；每一隻另有自己的小幅上下浮。
   · 被擊落＝往機頭斜下方墜出畫面、淡出（同樹寄生龍的斜墜）。 */
const FLOCK_SLOTS=[ [0.00, 0.06, 0.74], [-0.28,-0.08, 0.58], [0.29,-0.12, 0.54], [0.02,-0.22, 0.44] ];   // [橫, 縱（畫面比例）, 大小]，前→後
let flock=null;   // { el, ms:[{im,slot,ph,down}], each, t }
function stopFlock(){
  if(!flock) return; clearInterval(flock.t); flock.el.remove(); flock=null;
  const top=$('top'); if(top) top.classList.remove('flock-on');
}
function startFlock(en){
  stopFlock(); if(!en || !en.flock || !isAirBio(en)) return;
  const top=$('top'), eImg=$('enemyImg'); if(!top || !eImg) return;
  const lo=en.flock.min||2, hi=Math.max(lo, en.flock.max||lo), n=Math.min(FLOCK_SLOTS.length, lo+Math.floor(Math.random()*(hi-lo+1)));
  const el=document.createElement('div'); el.id='airFlock';
  el.style.cssText='position:absolute;inset:0;pointer-events:none;transform-origin:50% 50%;';
  (idleEl||eImg).after(el);
  const ms=[];
  for(let i=n-1;i>=0;i--){   // 後排先放（疊在下面）
    const im=document.createElement('img'); im.alt=''; im.className='af-m'; im.style.cssText='position:absolute;transform-origin:50% 50%;';
    el.appendChild(im); ms.push({ im, slot:FLOCK_SLOTS[i], ph:Math.random()*6.283, down:false, front:i, off:0 });
  }
  ms.sort((a,b)=>b.front-a.front);   // ms：後→前（同群戰的 order）
  ms.forEach((m,j)=>{ m.off = j ? Math.round(j*7 + Math.random()*5) : 0; });   // 振翅錯開（Ray：「空中群戰時振翅頻率要錯開」）：每隻差幾格
  top.classList.add('flock-on');
  const fl=fwdOf(en), sf=(en.fit && en.fit.flip) ? -1 : 1;   // fl＝機頭朝向（擊落往那邊墜）；sf＝圖要不要水平翻
  flock={ el, ms, n, fl };
  const sync=()=>{ if(!flock || flock.el!==el) return;
    const src=(idleEl && idleEl.isConnected && idleEl.getAttribute('src')) ? idleEl : eImg; if(!src.getAttribute('src')) return;
    const cs=getComputedStyle(src), W=top.clientWidth, H=top.clientHeight, t=performance.now()/1000;
    const fr=(src===idleEl) ? idleFr : null, fi=fr ? fr.findIndex(f=>f.src===src.src) : -1;
    for(const m of ms){ const im=m.im;
      const want=(fi>=0) ? fr[(fi+m.off)%fr.length].src : src.src;
      if(im.src!==want) im.src=want;
      if(src===idleEl){ im.style.left=src.style.left; im.style.top=src.style.top; im.style.width=src.style.width; im.style.height=src.style.height; im.style.objectFit=''; }
      else { im.style.left='0'; im.style.top='0'; im.style.width='100%'; im.style.height='100%'; im.style.objectFit=cs.objectFit; im.style.objectPosition=cs.objectPosition; }
      if(m.down) continue;
      const s=m.slot[2], bob=Math.sin(t*1.7+m.ph)*H*0.012;
      im.style.translate=(m.slot[0]*W).toFixed(1)+'px '+(m.slot[1]*H+bob).toFixed(1)+'px';
      im.style.scale=(sf*s).toFixed(3)+' '+s.toFixed(3);
    } };
  sync(); flock.t=setInterval(sync, 40);
}
function flockAlive(){ return flock ? flock.ms.filter(m=>!m.down && m.im.naturalWidth) : []; }
function flockVictim(){
  const alive=flock.ms.filter(m=>!m.down); if(!alive.length) return null;
  const top=$('top');
  if(lastImpact && top){ const tr=top.getBoundingClientRect(), x=tr.left+lastImpact.x, y=tr.top+lastImpact.y;
    for(let i=alive.length-1;i>=0;i--){ const r=alive[i].im.getBoundingClientRect(); if(x>=r.left && x<=r.right && y>=r.top && y<=r.bottom) return alive[i]; }
    let best=null, bd=1e18; for(const m of alive){ const r=m.im.getBoundingClientRect(), d=((r.left+r.right)/2-x)**2+((r.top+r.bottom)/2-y)**2; if(d<bd){ bd=d; best=m; } }
    if(best) return best; }
  return alive[alive.length-1];
}
function shootDown(m){
  m.down=true; const top=$('top'), W=top?top.clientWidth:390, H=top?top.clientHeight:400, f=flock?flock.fl:-1;
  m.im.animate([{ transform:'none', opacity:1 }, { transform:`translate(${f*W*0.35}px, ${H*0.95}px) rotate(${f*-25}deg)`, opacity:0 }],
    { duration:1800, easing:'cubic-bezier(.45,.05,.55,.95)', fill:'forwards' });
}
function syncFlock(){
  if(!flock) return;
  const each=Math.max(1, state.enemyMax/flock.n);
  const stand=Math.max(0, Math.min(flock.n, Math.ceil(Math.max(0,state.enemyHp)/each)));
  let alive=flock.ms.filter(m=>!m.down).length;
  while(alive>stand){ const v=flockVictim(); if(!v) break; shootDown(v); alive--; }
}
/* 入場／漂移／攻擊要動的那一個（有編隊＝整個編隊容器）。 */
function motionTargets(){ return flock ? [flock.el] : [$('enemyImg'), idleEl, clipEl]; }
function startAirDrift(en){
  stopAirDrift(true);
  if(en && en.float && !isAirBio(en)) return startFloatBob(en);
  if(!isAirBio(en)) return;
  const fl=en.fit && en.fit.flip ? -1 : 1, ph=Math.random()*100;
  const S={ raf:0, t0:Infinity }; airDrift=S;   // t0＝入場演完那一刻（airArrived 設），之前振幅 0
  const tick=now=>{ if(airDrift!==S) return;
    const top=$('top'), W=top?top.clientWidth:390, H=top?top.clientHeight:400;
    const t=(now-S.t0)/1000, a=Math.max(0,Math.min(1,t/1.8)), e=a*a*(3-2*a);   // 入場演完後 1.8 秒淡入振幅
    const u=t+ph;
    /* 緩近緩遠：主週期約 9 秒，0.90～1.06（不能太遠）；八向平移＝兩軸各兩組不可公約的正弦，橫向約 ±4%、縱向約 ±3% */
    const k=1 + e*(0.06*Math.sin(u*0.70) - 0.04*(1-Math.cos(u*0.31)) + 0.012*Math.sin(u*1.9));
    const dx=e*W*(0.030*Math.sin(u*0.53) + 0.012*Math.sin(u*1.37+1.1));
    const dy=e*H*(0.022*Math.sin(u*0.61+2.0) + 0.009*Math.sin(u*1.61+0.4));
    const far=farOf(en), ff=flock ? 1 : fl, sc=(ff*far*k).toFixed(4)+' '+(far*k).toFixed(4), tr=dx.toFixed(1)+'px '+dy.toFixed(1)+'px';   // 編隊：翻轉已在每一隻身上
    for(const el of motionTargets()) if(el){ el.style.scale=sc; el.style.translate=tr; }
    S.raf=requestAnimationFrame(tick); };
  S.raf=requestAnimationFrame(tick);
}
export function stopAirMotion(){ stopAirDrift(false); }
/* 入場：門開那一刻演；演完才起待機與漂移。被 suppressRiseOnce 壓掉的那一場直接站好。
   · 生物型＝從畫面外由近（大）到遠（小）飛進來定位
   · 空賊船＝從後方追上來、追過頭一點再停下（ver -2500，Ray） */
function airEnter(en, eImg, play){
  const done=()=>{ if(airInAnim){ airInAnim=null; } if(curCard()!==en) return;   // 入場途中換了怪：上一隻的收尾不准掛回來
    eImg.classList.remove('enemy-airin'); eImg.style.opacity=''; startCardIdle(en); if(airDrift) airDrift.t0=performance.now(); };
  if(!play) return done();
  if(isAirShip(en)){
    const top=$('top'), W=top.clientWidth, tr=top.getBoundingClientRect(), er=eImg.getBoundingClientRect(), f=fwdOf(en);
    const off = f<0 ? (tr.right-er.left)+20 : -(er.right-tr.left)-20;   // 從機尾那一側的畫面外
    eImg.style.opacity='';
    const a=eImg.animate([
      { transform:`translate(${off}px,0px)`, offset:0, easing:'cubic-bezier(.2,.55,.35,1)' },
      { transform:`translate(${f*W*0.06}px,${-W*0.005}px)`, offset:0.72, easing:'cubic-bezier(.45,0,.55,1)' },
      { transform:'translate(0px,0px)', offset:1 }], { duration:2600 });
    airInAnim=a; a.onfinish=done; a.oncancel=done; return;
  }
  /* 生物型（ver -2501，Ray：「牠是從畫面外進來的，不是淡入進去的，由近（大）到遠（小）然後定位開戰」）：
     不淡入 —— 從機尾那側的畫面外、斜下方、放大三倍（貼著鏡頭）飛進來，一路縮回原尺寸，越過一點再定位。 */
  { const top=$('top'), W=top.clientWidth, H=top.clientHeight, f=fwdOf(en), K=3, mv=flock ? flock.el : eImg;
    eImg.style.opacity=''; mv.style.transformOrigin='50% 50%';
    const a=mv.animate([
      { transform:`translate(${-f*W*1.15}px, ${H*0.9}px) scale(${K})`, offset:0, easing:'cubic-bezier(.22,.6,.35,1)' },
      { transform:`translate(${f*W*0.04}px, ${-H*0.025}px) scale(.97)`, offset:0.8, easing:'cubic-bezier(.45,0,.55,1)' },
      { transform:'none', offset:1 }], { duration:1900 });
    airInAnim=a; a.onfinish=done; a.oncancel=done; }
}
let dmgSmoke=null;
function stopDamageSmoke(){ if(!dmgSmoke) return; cancelAnimationFrame(dmgSmoke.raf); dmgSmoke.cv.remove(); dmgSmoke=null; }
function startDamageSmoke(cfg){
  stopDamageSmoke(); if(!cfg) return;
  const top=$('top'); if(!top) return;
  const cv=document.createElement('canvas'); cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3';
  top.appendChild(cv); const cx=cv.getContext('2d'), puffs=[], rnd=(a,b)=>a+Math.random()*(b-a);
  const S={ cv, raf:0, last:performance.now(), acc:0, fallAt:0 }; dmgSmoke=S;
  const tick=now=>{ if(dmgSmoke!==S) return; const dt=Math.min(now-S.last,60); S.last=now;
    const W=top.clientWidth, H=top.clientHeight; if(cv.width!==W||cv.height!==H){ cv.width=W; cv.height=H; }
    const eImg=$('enemyImg'), el=(idleEl && idleEl.isConnected) ? idleEl : eImg;
    const ratio=state.enemyMax ? state.enemyHp/state.enemyMax : 1, falling=!!(el && el._falling);
    if(falling && !S.fallAt) S.fallAt=now;
    if(state.over && !falling && !puffs.length){ stopDamageSmoke(); return; }
    if(S.fallAt && now-S.fallAt>3000 && !puffs.length){ stopDamageSmoke(); return; }
    const emit = (ratio<=(cfg.hp||0.5) || falling) && !(S.fallAt && now-S.fallAt>2600);
    if(emit && eImg){ const r=canvasBoxInTop(eImg, { canvas:cfg.canvas, box:[0,0,cfg.canvas[0],cfg.canvas[1]] });
      if(r){ const tr=top.getBoundingClientRect(), br=el.getBoundingClientRect();   // 立繪被 transform 推走多少（斜墜／受擊抖）
        const dx=br.left-tr.left-el.offsetLeft, dy=br.top-tr.top-el.offsetTop, k=r.width/cfg.canvas[0];
        const rate=(cfg.rate||14)*(1+1.6*Math.max(0,(cfg.hp||0.5)-ratio)/(cfg.hp||0.5));   // 每秒幾團，血越少越密
        S.acc+=dt*rate/1000;
        while(S.acc>=1){ S.acc-=1; const [px,py]=cfg.pts[(Math.random()*cfg.pts.length)|0];
          puffs.push({ x:r.left+px*k+dx+rnd(-8,8)*k*3, y:r.top+py*k+dy, vx:rnd(0.04,0.09)*W/390, vy:-rnd(0.05,0.11)*W/390, r0:rnd(12,20)*k*3, life:rnd(1800,2600), a:0, g:rnd(30,55)|0 });   /* -2490b：深灰、大團、慢一點 —— 純黑在夜空與暗色船身上看不見 */ } } }
    cx.clearRect(0,0,W,H);
    for(let i=puffs.length-1;i>=0;i--){ const p=puffs[i]; p.a+=dt; if(p.a>p.life){ puffs.splice(i,1); continue; }
      const q=p.a/p.life, x=p.x+p.vx*p.a, y=p.y+p.vy*p.a, rr=p.r0*(1+q*3.5), al=0.92*(q<0.1?q/0.1:1)*(1-q*q);
      const gr=cx.createRadialGradient(x,y,0,x,y,rr); gr.addColorStop(0,`rgba(${p.g},${p.g},${p.g},${al.toFixed(3)})`); gr.addColorStop(1,`rgba(${p.g},${p.g},${p.g},0)`);
      cx.fillStyle=gr; cx.beginPath(); cx.arc(x,y,rr,0,6.283); cx.fill(); }
    S.raf=requestAnimationFrame(tick); };
  S.raf=requestAnimationFrame(tick);
}
function playBroadside(fx){
  const top=$('top'), eImg=$('enemyImg'); if(!top || !eImg || !fx || !fx.ports) return;
  const r=canvasBoxInTop(eImg, { canvas:fx.canvas, box:[0,0,fx.canvas[0],fx.canvas[1]] }); if(!r) return;
  if(broadsideCv) broadsideCv.remove();
  const W=top.clientWidth, H=top.clientHeight, cv=document.createElement('canvas'); broadsideCv=cv;
  cv.width=W; cv.height=H; cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4';
  top.appendChild(cv); const cx=cv.getContext('2d');
  const k=r.width/fx.canvas[0], gap=fx.gap||55, rnd=(a,b)=>a+Math.random()*(b-a);
  const shots=fx.ports.map(([x,y],i)=>({ x:r.left+x*k, y:r.top+y*k, t:i*gap }));
  const puffs=[]; shots.forEach(s=>{ for(let j=0;j<5;j++) puffs.push({ x:s.x, y:s.y, t:s.t+30+j*25, vx:rnd(0.55,1.1)*W/390, vy:rnd(-0.06,0.03)*W/390, r0:rnd(5,9)*k*3, life:rnd(700,1100), g:rnd(150,200)|0 }); });
  const t0=performance.now(), END=shots[shots.length-1].t+1300;
  const tick=now=>{ if(broadsideCv!==cv) return; const t=now-t0; cx.clearRect(0,0,W,H);
    cx.globalCompositeOperation='source-over';
    for(const p of puffs){ const a=t-p.t; if(a<0||a>p.life) continue; const q=a/p.life;   // 煙：往右（船尾）快速拖走、越飄越大越淡
      const x=p.x+p.vx*a, y=p.y+p.vy*a-q*8, rr=p.r0*(1+q*3.2);
      const gr=cx.createRadialGradient(x,y,0,x,y,rr); gr.addColorStop(0,`rgba(${p.g},${p.g},${p.g-8},${(0.55*(1-q)).toFixed(3)})`); gr.addColorStop(1,`rgba(${p.g},${p.g},${p.g-8},0)`);
      cx.fillStyle=gr; cx.beginPath(); cx.arc(x,y,rr,0,6.283); cx.fill(); }
    cx.globalCompositeOperation='lighter';
    for(const s of shots){ const a=t-s.t; if(a<0||a>170) continue; const q=a/170, rr=(18+40*q)*k*3*(1-q*0.3);   // 火光：朝鏡頭爆開的一團白黃光＋幾道放射焰
      const gr=cx.createRadialGradient(s.x,s.y,0,s.x,s.y,rr); gr.addColorStop(0,`rgba(255,250,220,${(1-q).toFixed(3)})`); gr.addColorStop(0.35,`rgba(255,190,80,${(0.85*(1-q)).toFixed(3)})`); gr.addColorStop(1,'rgba(255,90,20,0)');
      cx.fillStyle=gr; cx.beginPath(); cx.arc(s.x,s.y,rr,0,6.283); cx.fill();
      cx.strokeStyle=`rgba(255,220,140,${(0.9*(1-q)).toFixed(3)})`; cx.lineWidth=Math.max(1,2.2*k*3*(1-q));
      for(let j=0;j<6;j++){ const ang=j*1.047+s.t, L=rr*1.5; cx.beginPath(); cx.moveTo(s.x,s.y); cx.lineTo(s.x+Math.cos(ang)*L, s.y+Math.sin(ang)*L); cx.stroke(); } }
    if(t<END) requestAnimationFrame(tick); else { cv.remove(); if(broadsideCv===cv) broadsideCv=null; } };
  requestAnimationFrame(tick);
}
/* ══ 戶外空戰生物型的主動攻擊（ver -2500，Ray：「大部份的空中戰生物都是快速下潛（斜前），像樹生龍一樣
   從下方往上劃過再從畫面外飛進畫面；或者快速上飛（斜後），然後從斜上方俯衝劃過再從畫面外飛進畫面」）══
   兩型每一發隨機一種：① 斜前下潛出畫面 → 放大從下方往上劃過（撞到玩家在正中）→ 從機尾那側畫面外飛回、追過頭一點再停
   ② 斜後上飛出畫面 → 放大從斜上方俯衝劃過 → 同上飛回。
   ⚠ 全程一支 el.animate（transform）—— 漂移用的是獨立 translate／scale，兩者疊加不打架；
     受擊的 CSS 動畫蓋不過 WAAPI（-2457 斜墜踩過的同一件事）。回傳撞到玩家的那一刻（defense 照它延後扣血）。 */
let airAtk=null;
function airAssault(en){
  if(airAtk) return 0;
  /* 編隊（ver -2516，Ray：「群體的話攻擊只有其中一隻發動，輪流隨機」）：隨機挑一隻還在飛的去劃過，其他照常漂 */
  const fa=flock ? flock.ms.filter(m=>!m.down) : null;
  const el=(fa && fa.length) ? fa[(Math.random()*fa.length)|0].im : (idleEl || $('enemyImg')), top=$('top'); if(!el || !top) return 0;
  const W=top.clientWidth, H=top.clientHeight, tr=top.getBoundingClientRect(), er=el.getBoundingClientRect();
  if(!er.width) return 0;
  const f=fwdOf(en), dive=Math.random()<0.5, K=3.4;
  const cx=er.left-tr.left+er.width/2, cy=er.top-tr.top+er.height/2, bw=er.width*K, bh=er.height*K;
  const T={ out:380, gap:140, sweep:620, gap2:260, ret:1700 };
  const tot=T.out+T.gap+T.sweep+T.gap2+T.ret, o=ms=>ms/tot;
  const exit = dive ? `translate(${f*W*0.35}px, ${(tr.bottom-er.top)+10}px) scale(.9) rotate(${f*20}deg)`
                    : `translate(${-f*W*0.3}px, ${-(er.bottom-tr.top)-10}px) scale(.85) rotate(${-f*20}deg)`;
  const p=(x,y,rot)=>`translate(${x-cx}px, ${y-cy}px) scale(${K}) rotate(${rot}deg)`;
  const s0 = dive ? p(W/2-f*W*0.3, H+bh/2, -f*28) : p(W/2-f*W*0.3, -bh/2, f*28);
  const s1 = dive ? p(W/2+f*W*0.3, -bh/2, -f*28) : p(W/2+f*W*0.3, H+bh/2, f*28);
  const back = f<0 ? (tr.right-er.left)+er.width*0.15+20 : -(er.right-tr.left)-er.width*0.15-20;
  let t=0; const kf=[{ transform:'none', opacity:1, offset:0, easing:'cubic-bezier(.5,0,.9,.6)' }];
  t+=T.out; kf.push({ transform:exit, opacity:1, offset:o(t) }); kf.push({ transform:exit, opacity:0, offset:o(t)+0.0001 });
  t+=T.gap; kf.push({ transform:s0, opacity:0, offset:o(t) }); kf.push({ transform:s0, opacity:1, offset:o(t)+0.0001, easing:'cubic-bezier(.3,.1,.7,.9)' });
  const hitAt=t+T.sweep*0.5;
  t+=T.sweep; kf.push({ transform:s1, opacity:1, offset:o(t) }); kf.push({ transform:s1, opacity:0, offset:o(t)+0.0001 });
  t+=T.gap2; kf.push({ transform:`translate(${back}px, ${H*0.06}px) scale(1.25)`, opacity:0, offset:o(t) });
  kf.push({ transform:`translate(${back}px, ${H*0.06}px) scale(1.25)`, opacity:1, offset:o(t)+0.0001, easing:'cubic-bezier(.2,.55,.35,1)' });
  kf.push({ transform:`translate(${f*W*0.05}px, ${-H*0.02}px) scale(.98)`, opacity:1, offset:o(t+T.ret*0.72), easing:'cubic-bezier(.45,0,.55,1)' });
  kf.push({ transform:'none', opacity:1, offset:1 });
  el.style.transformOrigin='50% 50%';
  playEntranceSe(en.assaultSe || 'se_enemy_dragonroar');   // 發動攻擊那一刻吼一聲（ver -2502，Ray）
  const a=el.animate(kf, { duration:tot }); airAtk=a;
  const end=()=>{ if(airAtk===a) airAtk=null; };
  a.onfinish=end; a.oncancel=end;
  return Math.round(hitAt);
}
export function onAssaultLand(){
  if(!sky){ const en=curCard(); if(isAirBio(en)) return airAssault(en);
    if(en && en.assaultFx && en.assaultFx.type==='broadside') playBroadside(en.assaultFx); return playActionClip('atk'); }   // 一般怪：有攻擊動畫就演（ver -2472），回傳打到玩家的那一刻
  if(sky.lunge) return 0;
  const el=idleEl || $('enemyImg'); if(!el) return 0;
  const top=$('top'), W=top.clientWidth, H=top.clientHeight, C=sky.C;
  /* ① 近樹：馬上刷一根，從右往左掃過；樹幹掃到龍的那一刻龍就不見（龍站在畫面中央 ⇒ 掃過一半的時候） */
  sky.nearPause=true; sky.nearT=performance.now(); const nimg=sky.els[2]; nimg.src=C.near[(Math.random()*C.near.length)|0];
  /* -2448（Ray：「要大到花了 1 秒才把整條龍跑完」）：衝過畫面整整 1 秒（頭進來到尾巴出去），撞到玩家在正中那一刻 */
  const SW=C.nearSweep*1000, LUNGE=1000, hitAt=SW+LUNGE*0.5;
  const ghost=el.cloneNode(); ghost.className='sky-lunge'; ghost.style.cssText=''; ghost.style.opacity='0'; top.insertBefore(ghost, sky.els[2]);
  if(idleEl){ ghost._sync=setInterval(()=>{ if(!idleEl||!ghost.isConnected){ clearInterval(ghost._sync); return; } ghost.src=idleEl.src; }, 50); }
  sky.lunge=ghost;
  el.style.transition='none'; sky.vanishEl=el;   // 龍被這一根樹幹掃掉（逐禎裁，見 tick）
  { const en=curCard(); if(en && en.assaultSe) setTimeout(()=>playEntranceSe(en.assaultSe), SW); }   // 衝出那一刻吼一聲（卡上 assaultSe；-2450 Ray：「龍主動攻擊時放 dragonroar」）
  /* ② 從左下往右上衝出，放大到幾乎遮滿畫面（同一支待機 loop）；衝到一半撞到玩家 ⇒ 扣血與震畫面在那一刻（defense 照回傳值延後） */
  /* -2447（Ray：「龍攻擊時要再放大，龍頭要往上 45 度，同飛的角度」）：寬 4.2 個畫面寬；整條龍轉 −45°（頭朝右上），
     沿著穿過畫面中心的 45° 斜線從左下飛到右上 —— 頭的方向＝飛的方向。中心對位用 translate（圖心先挪到 #top 的左上角）。 */
  const bw=W*14, ar=   /* -2455 Ray：「龍攻再大一點」10.5→14 */ (el.naturalHeight||180)/(el.naturalWidth||640), bh=bw*ar, reach=W*0.9+bw*0.5;
  ghost.style.width=bw+'px'; ghost.style.height=bh+'px'; ghost.style.left=(-bw/2)+'px'; ghost.style.top=(-bh/2)+'px';
  const at=t=>`translate(${W/2-t}px, ${H/2+t}px) rotate(-45deg)`;   // t＞0 左下、t＜0 右上
  ghost.style.transform=at(reach);
  setTimeout(()=>{ ghost.style.opacity='1'; ghost.style.transition=`transform ${LUNGE}ms cubic-bezier(.35,.05,.65,1)`;
    ghost.style.transform=at(-reach); }, SW);
  /* ③ 復歸（-2462 Ray：「龍攻完後從畫面左側飛回原位，要飛過頭一點點再定回原位，從畫面出現時較大，然後再縮回原尺寸」）：
     從畫面左緣外、放大 1.35 倍飛進來 → 衝過原位一點（約 6% 畫面寬）→ 拉回定位、縮回原尺寸。近樹恢復平常的節奏。
     ⚠ 用 el.animate 不用 CSS transition：受擊的 `#enemyImg.hit + .en-idle{animation}` 會蓋過 transform（-2457 斜墜踩過）。 */
  const RET=2300;   /* -2463 Ray：「要從斜下進入，由大到小，不用那麼快，悠揚感」1100→2300 */
  setTimeout(()=>{ clearInterval(ghost._sync); ghost.remove(); if(sky) sky.lunge=null;
    if(sky) sky.vanishEl=null; el.style.clipPath='';
    if(!sky || sky.defeated) return;   // 玩家被這一擊打倒了（skyDefeatHide）⇒ 龍不回來
    const tr=top.getBoundingClientRect(), er=el.getBoundingClientRect(), K=1.6;
    const offL=-(er.right-tr.left) - er.width*(K-1)/2 - 20;   // 放大之後整條都在畫面左緣外
    const offD=(tr.bottom-er.top) + er.height*(K-1)/2;         // 從左下角斜著滑進來：起點在畫面下緣外
    el.style.animation='none'; el.style.transition='none'; el.style.transformOrigin='50% 50%'; el.style.opacity='1';
    const a=el.animate([
      { transform:`translate(${offL}px, ${offD}px) scale(${K})`, offset:0, easing:'cubic-bezier(.25,.1,.3,1)' },
      { transform:`translate(${W*0.04}px, ${-H*0.03}px) scale(0.98)`, offset:0.78, easing:'cubic-bezier(.45,0,.55,1)' },
      { transform:'translate(0px, 0px) scale(1)', offset:1 }],
      { duration:RET });   // 悠揚：前段一路緩緩減速滑進、由大縮小；末段輕輕越過一點再沉回原位
    a.onfinish=()=>{ el.style.animation=''; };
    setTimeout(()=>{ el.style.transition=''; if(sky){ sky.nearPause=false; sky.nearAt=performance.now()+(C.nearEvery[0]*1000); } }, RET); }, SW+LUNGE+80);
  return Math.round(hitAt);
}
/* ══ 點錯／延時的懲罰演出（ver -2449，Ray：「點錯或延時龍會往後噴鱗片，然後鱗片雨刮過受擊，畫面抖動」）══
   ① 龍身往後（龍頭朝右 ⇒ 往左）噴出一把鱗片 ② 鱗片雨從右上斜刮過整個畫面。畫在 #top 的一張畫布上，跑完就拆。
   ⚠ 只給有 `sky` 的怪（hitPlain 的那幾隻）；扣血與畫面抖動照舊在 combat.enemyAttack 那一刻。 */
let scaleRainCv=null;
const SCALE_RAIN_AT=1150;   /* -2451 Ray：「時間差再多一點」750→1150：噴完到鱗雨中間空約半秒 */   // 鱗片雨刮到玩家那一刻（毫秒；噴鱗在 0～500，中間空一拍）—— combat 照這個回傳值延後扣血
export function skyScaleRain(){
  /* 龍正在衝出（主動攻擊演出中）就不噴（-2452，Ray：「龍攻不用噴鱗，噴鱗只有延時跟點錯會噴」）——
     演出那一秒多玩家多半沒在點，延時懲罰常常剛好落在裡面；那一擊照樣扣、照樣震，只是不另外噴鱗 */
  if(!sky || sky.lunge) return 0;
  const top=$('top'), W=top.clientWidth, H=top.clientHeight;
  const cv=document.createElement('canvas'); cv.className='sky-scales'; cv.width=W; cv.height=H; top.appendChild(cv);
  if(scaleRainCv) scaleRainCv.remove(); scaleRainCv=cv;
  const cx=cv.getContext('2d'), tr=top.getBoundingClientRect();
  const el=idleEl || $('enemyImg'), r=el ? el.getBoundingClientRect() : { left:tr.left+W*0.2, right:tr.left+W*0.8, top:tr.top+H*0.35, bottom:tr.top+H*0.6 };
  const bx0=r.left-tr.left, bx1=r.right-tr.left, by0=r.top-tr.top, by1=r.bottom-tr.top, P=[], rnd=(a,b)=>a+Math.random()*(b-a);
  for(let i=0;i<70;i++) P.push({ x:rnd(bx0+(bx1-bx0)*0.2, bx1-(bx1-bx0)*0.1), y:rnd(by0+(by1-by0)*0.3, by1-(by1-by0)*0.2),   // ① 噴：從龍身往左後方
    vx:rnd(-1.2,-0.45), vy:rnd(-0.35,0.25), rot:rnd(0,6.28), vr:rnd(-0.02,0.02), s:rnd(4,9), t0:0, life:rnd(300,480) });
  /* ② 鱗片雨（-2453，Ray：「鱗雨要尖銳快速，但不要一整片，是依序落下，有快有慢」）：一片一片陸續落（散在約 0.55 秒裡），
     每一片自己的速度、尖長的碎片順著飛的方向（不轉），從右上斜刮向左下 */
  /* -2454 Ray：「雨再快一點，像子彈一樣」：速度 ×3（1.4～3.2 → 4.5～8 px/ms）、從畫面右上外面射進來、一閃就穿過畫面，拖一條長曳光 */
  for(let i=0;i<64;i++){ const sp=rnd(4.5,8), ang=rnd(2.05,2.35);   // 往左下（約 120～135°）
    P.push({ shard:true, x:rnd(W*0.35, W*1.45), y:rnd(-H*0.45, -H*0.05), vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp, rot:ang, vr:0,
      s:rnd(9,18), t0:SCALE_RAIN_AT-180+Math.pow(Math.random(),0.8)*560, life:rnd(170,280) }); }
  const t0=performance.now();
  const draw=now=>{ if(!cv.isConnected) return;
    const t=now-t0; cx.clearRect(0,0,W,H); let alive=false;
    for(const p of P){ const u=t-p.t0; if(u<0 || u>p.life){ if(u<0) alive=true; continue; } alive=true;
      const x=p.x+p.vx*u, y=p.y+p.vy*u, a=p.shard ? Math.min(1,u/20)*Math.min(1,(p.life-u)/60) : Math.min(1,u/80)*Math.min(1,(p.life-u)/200);   // 雨像子彈：瞬間出現、瞬間沒
      cx.save(); cx.translate(x,y); cx.rotate(p.rot+p.vr*u); cx.globalAlpha=a;
      if(p.shard){   // 雨：尖長的碎片（順著飛的方向），後面拖一小段殘影
        cx.fillStyle='rgba(225,218,204,.35)'; cx.beginPath(); cx.moveTo(-p.s*4.5,-1); cx.lineTo(-p.s*0.4,0); cx.lineTo(-p.s*4.5,1); cx.closePath(); cx.fill();
        cx.fillStyle='#ddd3c2'; cx.beginPath(); cx.moveTo(p.s*0.6,0); cx.lineTo(-p.s*0.4,-p.s*0.13); cx.lineTo(-p.s*0.55,0); cx.lineTo(-p.s*0.4,p.s*0.13); cx.closePath(); cx.fill();
      } else {
      cx.fillStyle='#c9bfae'; cx.beginPath(); cx.moveTo(0,-p.s); cx.lineTo(p.s*0.55,0); cx.lineTo(0,p.s*0.8); cx.lineTo(-p.s*0.55,0); cx.closePath(); cx.fill();   // 一片鱗：菱形、灰白骨色
      cx.fillStyle='rgba(90,78,64,.8)'; cx.beginPath(); cx.moveTo(0,-p.s*0.35); cx.lineTo(p.s*0.2,0.1*p.s); cx.lineTo(0,p.s*0.5); cx.closePath(); cx.fill(); }
      cx.restore(); }
    if(alive) requestAnimationFrame(draw); else { cv.remove(); if(scaleRainCv===cv) scaleRainCv=null; } };
  requestAnimationFrame(draw);
  /* 鱗片擊中：一串子彈飛行音，一聲聲錯開、高低不一（-2453，Ray：「噴鱗擊中時用無數的子彈飛行音，做一點高低音變化」） */
  const WH=(curCard()||{}).rainSe || ['se_bulletsfly1','se_bulletsfly2','se_bulletsfly3','se_bulletsfly4'];   // 卡上 rainSe（戰鬥的音效預載掃得到它）
  for(let i=0;i<14;i++){ const k=WH[(Math.random()*WH.length)|0], at=SCALE_RAIN_AT-120+Math.pow(Math.random(),0.9)*520;
    setTimeout(()=>{ try{ SFX.playRate(asset(k), sfxGain(k)*0.55, 0.78+Math.random()*0.6); }catch(_){} }, at); }
  return SCALE_RAIN_AT;
}
/* ══ 敵人的台詞語音（ver -1920，Ray：尼莫「玩家受擊用 slow1／slow2／feint 輪播、玩家戰敗播 bulletrain、戰勝播 win」）══
   卡上三格（開戰那一聲照舊走 `entrance`）：
     `hitVoice:[…]`  玩家**被打到**時輪播（同一隻怪換一句；上一句還在講就不疊，至少隔 `HIT_VO_GAP_MS`）
     `loseVoice`     玩家**戰敗**那一刻
     `winVoice`      玩家**戰勝**那一刻
   ⚠ 一律走 `playEntranceSe`（路徑在 /vo/ ⇒ playVoice、過 voiceChain），唯一的播法（鐵律 8）。 */
const HIT_VO_GAP_MS = 2600;
let hitVoAt = 0, hitVoIdx = 0, hitVoKey = null;
function curCard(){ return (GAME_CONFIG.enemies||{})[state.currentEnemyKey] || null; }
export function playHitVoice(){
  const en = curCard(); const list = en && en.hitVoice;
  if(!list || !list.length) return;
  if(hitVoKey !== state.currentEnemyKey){ hitVoKey = state.currentEnemyKey; hitVoIdx = 0; hitVoAt = 0; }
  const now = performance.now();
  if(now - hitVoAt < HIT_VO_GAP_MS) return;
  hitVoAt = now;
  playEntranceSe(list[hitVoIdx++ % list.length]);
}
export function playEndVoice(won){
  const en = curCard(); if(!en) return;
  playEntranceSe(won ? en.winVoice : en.loseVoice);
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
/* ⚠⚠⚠ **`riseFx:1` ＝卡上的明寫例外：這一隻要降臨，不管它是什麼 kind**
   （ver -1615，Ray：「**每一次守墓者戰都要有降臨特效**」）。
   與 `purgeFx` 是同一族的旋鈕，方向相反 —— 那一格是「分類不給淨化、但我要淨化」，
   這一格是「分類不給降臨、但我要降臨」。
   ⚠⚠ **為什麼守墓者不能改 `kind`**：牠是 `kind:'multi'`，而那一格同時擋著
     **淨化**與結算副標的「已淨化」—— 而「沒有淨化反應，那東西沒有死」正是
     那一段戲的台詞（§gk_* 四張卡的註解）。改 kind 會把台詞打臉，
     所以降臨要另外一格開，不能共用 kind。
   ⚠ 能不寫就不寫：kind 仍然是預設判定，這一格只給「分類與演出要分家」的個案用。 */
/* ══⚠⚠⚠ **一次性的「這一場不降臨」**（ver -1650，Ray：「推棺以後那一隻墓主直接
   在原地就好，不用再跑降臨」）══
   走**完整推棺**的那一場，劇情層在門推上去之前已經演過一次降臨（`cgBackRise`），
   而門一開又降一次就是同一件事演兩遍 —— 而且 -1414 的規格本來就是
   「**槍棺開的時候就在那裡了**」。
   ⚠⚠ 做成**一次性**（用完就清）不是卡上的欄位：同一張卡（`tomb_gk1`）在登場戲要
     「已經站好」、在追擊戰要降臨 —— 那是**這一場**的性質，不是這一隻的性質。
   ⚠ 由 `main` 在交棒那一刻依 `line.kerbRise` 設；沒設就照 `riseFx`／`kind` 走。 */
/* 降臨用哪一組動畫（ver -1704）：卡上 `riseStyle:'unpurge'` ＝淨化倒放，其餘照舊。
   ⚠ 劇情層的中景降臨（`story` 的 `cgBackRise`＋`cgBackAs`）也問這一支，兩邊同一個答案。 */
export function riseClass(en){ return (en && en.riseStyle==='unpurge') ? 'enemy-unpurge' : 'enemy-rise'; }
let riseOff = false, riseOffMute = true;
/* `mute`（ver -1926）＝連登場音／衝擊一起壓。只有**劇情層真的降臨過**（`storyRose`）才壓聲音 ——
   完整推棺（`kerbRise`）只代表「門一開牠已經站好」，劇情裡沒降臨過的（尼莫）那一聲 `entrance` 要照播
   （Ray：「開棺以後沒播 play」）。 */
export function suppressRiseOnce(mute){ riseOff = true; riseOffMute = (mute !== false); }
/* ⚠⚠ 「這一次被壓掉了」要讓 `loadEnemyPortrait` 知道（ver -1715）：`isRise` 回 false 之後
   走的是**不降臨那一條**，而那一條會在圖出現時發登場音＋衝擊（`arrive`）——
   於是「不再降臨」變成「畫面不降，鐘聲與咆哮照樣再響一遍」（Ray 回報的正是這個）。
   壓掉降臨＝連它的聲音與衝擊一起壓（那些是同一件事的三個面），所以留一個旗給下面讀。 */
let riseSuppressedNow = false;
function isRise(en){
  riseSuppressedNow = false;
  if(riseOff){ riseOff=false; riseSuppressedNow=riseOffMute; return false; }
  if(en && (en.kind==='aerial' || en.kind==='ship')) return false;   // 空中怪都不走降臨（ver -2499，Ray）
  if(en && !en.group && ENEMY_ENTER[imgStem(en)]) return false;   // 有出場動畫的怪：出場取代降臨（ver -2527）
  return !!(en && (ENTRANCE_KINDS[en.kind] || en.riseFx));
}
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
            eImg.classList.remove('enemy-rise','enemy-unpurge','enemy-purge','enemy-quake','enemy-airin'); }
  clearTimeout(riseHoldT);
  riseHoldT=setTimeout(()=>{ if(riseHeld) releaseRise(); }, 10000);
}
export function releaseRise(){
  riseHeld=false; clearTimeout(riseHoldT); riseHoldT=0;
  if(risePending){ const f=risePending; risePending=null; f(); }
}
/* ══ 接地陰影（ver -1702，Ray：「怪跟背景間加入適當陰影，所有怪都要」）══
   量腳、換算、擺位全在 `groundShadow.place`；這裡只決定**這一隻要不要**：
   · 飛在天上的（`aerial`）與船（`ship`）沒有地面可以投影 ⇒ 不畫
   · 卡上 `noShadow:1` ＝個案關掉（鐵律 1）
   · 沒有 alpha 的整張插畫 → `place` 自己量不出腳，不畫
   觸發：立繪每一次 `load`（換圖）、`setEnemy` 收尾（同一張圖不會再 load，但框可能變了）、
   視窗尺寸變了。 */
const NO_SHADOW_KINDS = { aerial:1, ship:1 };
let shadowCard = null;
export function placeEnemyShadow(){
  const sh=$('enemyShadow'), eImg=$('enemyImg');
  if(!sh || !eImg) return;
  const en=shadowCard;
  if(!en || en.noShadow || NO_SHADOW_KINDS[en.kind] || !eImg.getAttribute('src')){ groundShadow.hide(sh); return; }
  groundShadow.place(eImg, sh);
}
try{
  const eImg0=document.getElementById('enemyImg');
  if(eImg0) eImg0.addEventListener('load', ()=>placeEnemyShadow());
  window.addEventListener('resize', ()=>placeEnemyShadow());
}catch(_){}
/* ══ 群體敵人（ver -2043，Ray：「一個人 100 血，每打掉 100 血倒一個」，帝都教廷衛士戰）══════════
   卡上 `group:{ dir, order, hpEach | hp, plate?, cover?, prefix?, shadow? }`（cover／prefix／hp／shadow 見 buildGroup，ver -2061）：
     · `image` ＝**去人背景**（plate），照舊進 `#enemyImg`（cover）；
     · 每個人一層透明圖（`<dir>guard_<n>.webp`，與 plate 同尺寸，疊上去就對位），
       依 `order`（後→前，美術給的）疊在 `#enemyGroup` 裡 —— 版型與 `#enemyImg` 同一套；
     · 血量＝人數 × `hpEach`（`groupHp`，combat.startGame 只算這一次，鐵律 7）；
     · 每掉 `hpEach` 倒一個。**倒哪一個**（Ray：「倒的會是 hp 達標時被子彈打到的那一個」）：
       ① 最後一發子彈的落點（`noteImpact`，combat 的 gunHitOnEnemy 記）壓在誰身上（逐人 alpha 判定，前排優先）
       ② 落在背景上 ⇒ 離落點最近的那一個（各人輪廓的重心）
       ③ 沒有落點（反擊、聖徒化之類）⇒ 最前排還站著的那一個
   ⚠ 倒下只有 `fallGuard()` 一支（Ray：「之後會有倒地動畫，記得預留」）——
     現在演「下沉淡出」（style.css 的 `.eg-down`）；換成逐格動畫時只改這一支。
   ⚠ 命中的閃縮：只抖被打中的那一個（`groupHitFlash`，ver -2154；以前整組一起抖）。 */
let groupCard=null, groupMasks={}, lastImpact=null, groupWaitT=0;
const MASK_W=192;
function groupEl(){
  let g=$('enemyGroup');
  if(!g){ const eImg=$('enemyImg'); if(!eImg) return null;
    g=document.createElement('div'); g.id='enemyGroup'; eImg.after(g); }
  return g;
}
/* 每個人的輪廓（縮小的 alpha 遮罩＋重心）：落點判定用。圖載到才建。 */
function buildMask(im){
  try{
    const w=MASK_W, h=Math.round(MASK_W*im.naturalHeight/im.naturalWidth);
    const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
    const cx=cv.getContext('2d'); cx.drawImage(im,0,0,w,h);
    const d=cx.getImageData(0,0,w,h).data, a=new Uint8Array(w*h);
    let sx=0, sy=0, cnt=0;
    const pts=[];
    for(let k=0;k<w*h;k++){ const v=d[k*4+3]; a[k]=v; if(v>96){ sx+=k%w; sy+=(k/w)|0; cnt++; if(!(k%3)) pts.push(k); } }
    groupMasks[im.dataset.n]={ w, h, a, pts, cx:cnt?sx/cnt/w:0.5, cy:cnt?sy/cnt/h:0.5 };
  }catch(_){}
}
function buildGroup(en){
  const g=groupEl(); if(!g) return;
  groupCard = (en && en.group) ? en : null;
  groupMasks={}; lastImpact=null; g.innerHTML='';
  if(!groupCard) return;
  const G=en.group;
  /* 整組一起出場（ver -2047）：冷快取時一個一個冒出來很難看 —— 全部載到才掀（保險 4 秒）。 */
  g.classList.add('eg-wait');
  let left=G.order.length+(G.cover?1:0); const done=()=>{ if(--left<=0) g.classList.remove('eg-wait'); };
  clearTimeout(groupWaitT); groupWaitT=setTimeout(()=>g.classList.remove('eg-wait'), 4000);
  /* 掩體（ver -2061，聖索菲亞惡棍群戰）：`group.cover` ＝一層**最底下**的掩體（木桶／石柱／馬車…），
     不算人頭、打不到、不會倒；戰鬥背景照舊是城鎮那一張。人層已依原圖剪掉被擋的部分，疊在它上面。 */
  if(G.cover){ const cv=document.createElement('img'); cv.className='eg-cover'; cv.alt='';
    cv.onload=cv.onerror=done; cv.src=G.cover; g.appendChild(cv); }
  const pre=G.prefix||'guard_', shadow=G.shadow!==false;
  for(const n of G.order){
    const im=document.createElement('img'); im.className='eg-guard'; im.dataset.n=n; im.alt='';
    /* 接地陰影：每個人一顆（ver -2045，Ray：「他們是不是沒給影子啊」）——
       美術的人物層是去背的、不帶影子；量腳與擺位照舊走 `groundShadow.place`（鐵律 8）。
       影子全部排在人之前（DOM 序＝圖層）：後排的人也該站在前排的影子之上。 */
    /* ⚠ `group.shadow:false` ＝不畫（人站在掩體後面、腳被剪掉了：量到的「腳」是掩體頂端，影子會浮在木桶上）。 */
    /* `group.noShadow:[n…]` ＝這幾層不畫接地影子（飛在空中的，ver -2164：卡耶爾的骨鴉）。 */
    if(shadow && !(G.noShadow && G.noShadow.includes(n))){ const sh=document.createElement('div'); sh.className='ground-shadow eg-shadow';
      g.insertBefore(sh, g.querySelector('.eg-guard')); im._sh=sh; }
    im.onload=()=>{ buildMask(im); if(im._sh) groundShadow.place(im, im._sh); done(); };
    im.onerror=done;
    im.src=G.dir+pre+n+'.webp';
    /* 中槍倒下（ver -2062，動畫交件 56d17af4）：`group.fall` ＝倒地動畫的資料夾，每人一組 `<prefix><n>/frame_00..` ＋ anim.json
       （canvas＝分層畫布、box＝這人 5 格在畫布上的位置、kind＝back／forward／prone）。開場就抓（每場只有幾個人、一人 5 格）。 */
    if(G.fall){ const base=G.fall+pre+n+'/';
      fetch(base+'anim.json').then(r=>r.ok?r.json():null).then(j=>{
        if(!j || groupCard!==en) return;
        im._fall={ j, frames:Array.from({length:j.frames||0},(_,i)=>{ const f=new Image(); f.src=base+'frame_'+String(i).padStart(2,'0')+'.webp'; return f; }) };
      }).catch(()=>{}); }
    g.appendChild(im);
  }
}
/* 取景變了（fit／視窗尺寸）就重擺每個人的影子。 */
function placeGroupShadows(){
  const g=$('enemyGroup'); if(!g || !groupCard) return;
  for(const im of g.querySelectorAll('.eg-guard')) if(im._sh) groundShadow.place(im, im._sh);
}
try{ window.addEventListener('resize', ()=>placeGroupShadows()); }catch(_){}
/* 最後一發子彈打在 `#top` 的哪一點（px，#top 相對）。combat 的 gunHitOnEnemy 每一發都記。 */
export function noteImpact(x, y){ lastImpact = (x!=null && y!=null) ? { x, y } : null; }
/* `#top` 上的一點 → 圖上的比例座標（照 object-fit:cover ＋ object-position 換算）。 */
function toImageUV(x, y, im){
  const g=$('enemyGroup'), top=$('top'); if(!g || !top || !im.naturalWidth) return null;
  const gr=g.getBoundingClientRect(), tr=top.getBoundingClientRect();
  x += tr.left-gr.left; y += tr.top-gr.top;          // 落點是 #top 相對 → 換成這一層的框
  const W=gr.width, H=gr.height, iw=im.naturalWidth, ih=im.naturalHeight;
  const k=Math.max(W/iw, H/ih), dw=iw*k, dh=ih*k;
  const p=String(getComputedStyle(im).objectPosition||'50% 0%').split(/\s+/).map(v=>parseFloat(v)/100);
  const ox=(W-dw)*(isNaN(p[0])?0.5:p[0]), oy=(H-dh)*(isNaN(p[1])?0:p[1]);
  return { u:(x-ox)/dw, v:(y-oy)/dh };
}
/* 反方向：圖上的比例座標 → `#top` 的百分比（BR 瞄準點用的座標系）。 */
function imageUVToTopPct(u, v, im){
  const g=$('enemyGroup'), top=$('top'); if(!g || !top || !im.naturalWidth) return null;
  const gr=g.getBoundingClientRect(), tr=top.getBoundingClientRect();
  const W=gr.width, H=gr.height, iw=im.naturalWidth, ih=im.naturalHeight;
  const k=Math.max(W/iw, H/ih), dw=iw*k, dh=ih*k;
  const p=String(getComputedStyle(im).objectPosition||'50% 0%').split(/\s+/).map(x=>parseFloat(x)/100);
  const ox=(W-dw)*(isNaN(p[0])?0.5:p[0]), oy=(H-dh)*(isNaN(p[1])?0:p[1]);
  const x=gr.left-tr.left+ox+u*dw, y=gr.top-tr.top+oy+v*dh;
  if(x<0 || y<0 || x>tr.width || y>tr.height) return null;
  return { l:x/tr.width*100, t:y/tr.height*100 };
}
function standingGuards(){
  const g=$('enemyGroup'); if(!g || !groupCard) return [];
  return [...g.querySelectorAll('.eg-guard')].filter(im=>!im.classList.contains('eg-down') && !im.classList.contains('eg-leaving'));
}
/* BR 瞄準點（ver -2048，Ray：「br 時不要往已經沒人的地方射」）：只落在**還站著的人**身上。 */
function groupBodyPoint(){
  const alive=standingGuards().filter(im=>groupMasks[im.dataset.n] && groupMasks[im.dataset.n].pts.length);
  if(!alive.length) return null;
  const im=alive[(Math.random()*alive.length)|0], m=groupMasks[im.dataset.n];
  const k=m.pts[(Math.random()*m.pts.length)|0];
  return imageUVToTopPct(((k%m.w)+Math.random())/m.w, (((k/m.w)|0)+Math.random())/m.h, im);
}
/* 這一點（`#top` 的百分比）還壓在某個站著的人身上嗎？—— 不是群體敵人一律 true。 */
export function onStandingBody(l, t){
  if(!groupCard) return true;
  const top=$('top'); if(!top) return true;
  const tr=top.getBoundingClientRect(), x=l/100*tr.width, y=t/100*tr.height;
  return standingGuards().some(im=>{ const m=groupMasks[im.dataset.n], uv=toImageUV(x, y, im);
    return m && uv && uv.u>=0 && uv.u<=1 && uv.v>=0 && uv.v<=1
      && m.a[Math.min(m.h-1,(uv.v*m.h)|0)*m.w + Math.min(m.w-1,(uv.u*m.w)|0)] > 96; });
}
function pickVictim(alive){
  if(!alive.length) return null;
  if(lastImpact){
    /* ① 壓在誰身上：前排先問（order 是後→前，所以倒著找） */
    for(let i=alive.length-1;i>=0;i--){
      const im=alive[i], m=groupMasks[im.dataset.n], uv=toImageUV(lastImpact.x, lastImpact.y, im);
      if(!m || !uv || uv.u<0 || uv.u>1 || uv.v<0 || uv.v>1) continue;
      if(m.a[Math.min(m.h-1,(uv.v*m.h)|0)*m.w + Math.min(m.w-1,(uv.u*m.w)|0)] > 96) return im;
    }
    /* ② 落在背景上：離落點最近的那一個 */
    let best=null, bd=1e9;
    for(const im of alive){ const m=groupMasks[im.dataset.n], uv=toImageUV(lastImpact.x, lastImpact.y, im);
      if(!m || !uv) continue; const d=(uv.u-m.cx)**2+(uv.v-m.cy)**2; if(d<bd){ bd=d; best=im; } }
    if(best) return best;
  }
  return alive[alive.length-1];   // ③ 最前排
}
/* 群體敵人的受擊抖動（ver -2154，Ray：「震動只發生在受擊的怪身上，沒受擊的怪不要抖動」）——
   以前是整組一起抖（`#enemyImg.hit + #enemyGroup`）。現在只抖這一發打到的那一個（`pickVictim`，同倒下的判定，鐵律 7）。 */
export function groupHitFlash(){
  if(!groupCard) return false;
  const im=pickVictim(standingGuards()); if(!im) return true;
  im.classList.remove('eg-hit'); void im.offsetWidth; im.classList.add('eg-hit');
  clearTimeout(im._hitT); im._hitT=setTimeout(()=>im.classList.remove('eg-hit'), 180);
  return true;
}
/* ══ 群體裡的一隻禍魘被淨化（ver -2223，Ray：「禍魘大軍的怪被擊倒要跑淨化」）══
   死法與單隻同一套（CSS 的 `enemyPurge` 拉長抖動淡出 ＋ `spawnPurgeStars` 白光星芒，鐵律 8）—— 差別只在**對著哪裡**：
   · 每一層都是整張畫布大小（與背景同尺寸、疊上去就對位），所以 `transform-origin` 不能用 50% 100%（那是畫面底），
     要換成**這一隻的腳**（遮罩的重心 x、最低的不透明列 y），才會從牠自己腳下往上抽。
   · 星芒撒在**這一隻的輪廓框**裡，不是畫面正中央。
   ⚠ 判定照舊是 `isPurify()`（卡上的 kind／purgeFx），不另立欄位（鐵律 7）。 */
function guardBox(im){
  const m=groupMasks[im.dataset.n]; if(!m) return null;
  let u0=1, u1=0, v0=1, v1=0;
  for(let k=0;k<m.a.length;k++) if(m.a[k]>96){ const u=(k%m.w)/m.w, v=((k/m.w)|0)/m.h; if(u<u0)u0=u; if(u>u1)u1=u; if(v<v0)v0=v; if(v>v1)v1=v; }
  return u1>u0 ? { u0, u1, v0, v1, cx:m.cx } : null;
}
function purgeGuard(im){
  const g=$('enemyGroup'), b=guardBox(im);
  if(g && b && im.naturalWidth){
    const W=g.clientWidth, H=g.clientHeight, iw=im.naturalWidth, ih=im.naturalHeight;
    const k=Math.max(W/iw, H/ih), dw=iw*k, dh=ih*k;
    const p=String(getComputedStyle(im).objectPosition||'50% 0%').split(/\s+/).map(v=>parseFloat(v)/100);
    const ox=(W-dw)*(isNaN(p[0])?0.5:p[0]), oy=(H-dh)*(isNaN(p[1])?0:p[1]);
    im.style.transformOrigin=(ox+b.cx*dw).toFixed(1)+'px '+(oy+b.v1*dh).toFixed(1)+'px';
    const a=imageUVToTopPct(b.u0, b.v0, im), z=imageUVToTopPct(b.u1, b.v1, im);
    if(a && z) spawnPurgeStars({ l:a.l, t:a.t, w:z.l-a.l, h:z.t-a.t, n:10 });
  }
  im.style.transition='none';
  im.classList.add('eg-purge','eg-down');   // eg-down＝其他判定（還站著幾個、BR 瞄準）照舊把牠當成倒下
  fallUntil=Math.max(fallUntil, Date.now()+450);
}
/* 倒下：**唯一的一支**（Ray：之後會有倒地動畫 —— 換的時候只改這裡）。 */
function fallGuard(im){
  const F=im._fall;
  if(F && F.frames.length && F.frames.every(f=>f.complete && f.naturalWidth)) playFall(im, F);
  else if(isPurify()) purgeGuard(im);   // 禍魘大軍（ver -2223，Ray：「禍魘大軍的怪被擊倒要跑淨化」）
  else { im.classList.add('eg-down'); fallUntil=Math.max(fallUntil, Date.now()+500); }   // 沒有動畫／還沒載好 → 原本的下沉淡出
  if(im._sh) im._sh.classList.add('eg-down');
  try{ window.dispatchEvent(new CustomEvent('tivot:groupfall')); }catch(_){} }   // weapon 據此清掉落空的 BR 瞄準點
/* ══ 單人敵人的倒地（ver -2065，Ray：「man 戰閉棺也要等倒地播了才開始關」）══
   卡上 `fall:'<資料夾>/'`（同群戰的格式：anim.json＋frame_00..，box 是**立繪畫布**上的位置）。
   擊殺那一刻（combat.skipOverkill）立繪換成這幾格，播完停一下才閉棺 —— 沒寫 `fall` 的照舊立刻閉棺。 */
let singleFall=null;   // { key, j, frames }
function loadSingleFall(en){
  singleFall=null;
  const dir=en && !en.group && en.fall; if(!dir) return;
  const key=state.currentEnemyKey, rec={ key:null, j:null, frames:[] };
  fetch(dir+'anim.json').then(r=>r.ok?r.json():null).then(j=>{
    if(!j) return;
    rec.j=j; rec.frames=Array.from({length:j.frames||0},(_,i)=>{ const f=new Image(); f.src=dir+'frame_'+String(i).padStart(2,'0')+'.webp'; return f; });
  }).catch(()=>{});
  rec.card=en; singleFall=rec;
}
export function playKillFall(){
  const F=singleFall; if(!F || !F.j || !F.frames.length || !F.frames.every(f=>f.complete && f.naturalWidth)) return 0;
  const eImg=$('enemyImg'), top=$('top'); if(!eImg || !top || !eImg.naturalWidth) return 0;
  const en=F.card||{}, j=F.j, r=canvasBoxInTop(eImg, j); if(!r) return 0;
  stopIdleLoop();
  const el=document.createElement('img'); el.className='en-fall'; el.alt='';
  el.style.left=r.left+'px'; el.style.top=r.top+'px'; el.style.width=r.width+'px'; el.style.height=r.height+'px';
  el.src=F.frames[0].src; eImg.after(el);
  eImg.style.visibility='hidden';
  const ms=en.fallMs||500, hold=en.fallHold!=null?en.fallHold:600, n=F.frames.length;
  let i=0; const t=setInterval(()=>{ i++; if(i>=n){ clearInterval(t); return; } el.src=F.frames[i].src; }, ms/n);
  singleFall=null;
  const closeAt=ms/n*2;   // 播到第 3 格就開始閉棺（ver -2082，Ray：「倒到第三 F 開始閉就好」）
  fallUntil=Math.max(fallUntil, Date.now()+closeAt);
  return closeAt;
}
/* 倒地要等多久才閉棺（ver -2063 立；-2082 Ray：「倒地不用播完才閉棺，倒到第三 F 開始閉就好」）：最後一個人倒下時，combat 等到第 3 格出現就收尾。 */
let fallUntil=0;
export function fallPendingMs(){ return Math.max(0, fallUntil-Date.now()); }
/* 倒地動畫：分層換成 5 格依序播（每格等長，`group.fallMs` 總長，預設 500ms），**換上去那一刻就同時淡出**（ver -2127）。
   ⚠ 位置：格子貼在 anim.json 的 box（畫布座標），照分層同一套 cover＋object-position 換算到畫面（同 toImageUV 的反算）。
   ⚠ 疊層：`back`（掩體後往後倒、往下掉出視線）**改畫在掩體下面**，才會掉到掩體後；forward／prone 照舊在原位（掩體上面）。 */
function playFall(im, F){
  const g=$('enemyGroup'); if(!g || !groupCard) return;
  const G=groupCard.group, j=F.j, cw=(j.canvas||[1024,1536])[0], ch=(j.canvas||[1024,1536])[1], b=j.box||[0,0,cw,ch];
  const W=g.clientWidth, H=g.clientHeight, k=Math.max(W/cw, H/ch), dw=cw*k, dh=ch*k;
  const p=String(getComputedStyle(im).objectPosition||'50% 0%').split(/\s+/).map(x=>parseFloat(x)/100);
  const ox=(W-dw)*(isNaN(p[0])?0.5:p[0]), oy=(H-dh)*(isNaN(p[1])?0:p[1]);
  const el=document.createElement('img'); el.className='eg-fall'; el.alt='';
  el.style.left=(ox+b[0]*k)+'px'; el.style.top=(oy+b[1]*k)+'px';
  el.style.width=(b[2]*k)+'px'; el.style.height=(b[3]*k)+'px';
  el.src=F.frames[0].src;
  const cover=g.querySelector('.eg-cover');
  /* `group.fallLead`（ver -2070，帝都衛士／米夏親衛隊：「第 1 格就是原本那張分層」）＝中彈後原圖先停這麼久，才換成 5 格。
     先標成倒下（`eg-down` 的判定照舊立刻生效），只是畫面晚一拍換。 */
  const lead=+G.fallLead||0, n=F.frames.length, step=(G.fallMs||500)/n, hold=G.fallHold!=null?G.fallHold:600;
  fallUntil=Math.max(fallUntil, Date.now()+lead+step*2);   // 播到第 3 格就開始閉棺（ver -2082，Ray：「倒到第三 F 開始閉就好」）
  /* ⚠ ver -2127（Ray：「敵人被擊倒播放擊倒動畫同時就開始淡出」）：換成倒地那一刻**同時**開始淡出，
     淡出長度＝動畫長度（`fallMs`），播完剛好消失 —— 以前是播完、停 `fallHold`、再淡 0.4 秒。
     ⚠ `hold` 因此不再用在畫面上（欄位留著，卡上寫了也不會出錯）。 */
  const swap=()=>{
    if(j.kind==='back' && cover) g.insertBefore(el, cover); else im.after(el);
    im.style.transition='none'; im.classList.add('eg-down');   // 分層當場換掉（不走淡出）
    const total=step*n;
    el.style.transition='opacity '+total+'ms linear';
    requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('eg-gone')));   // 隔一幀才加，過場才會跑（同 story.veil 的理由）
    let i=0; const t=setInterval(()=>{ i++;
      if(i>=n){ clearInterval(t); setTimeout(()=>el.remove(), 60); return; }
      el.src=F.frames[i].src; }, step);
  };
  if(lead>0){ im.classList.add('eg-leaving'); setTimeout(swap, lead); } else swap();
}
/* 依現在的敵血決定該倒幾個（combat.updateBars 每次都叫，冪等）：還沒倒夠就再倒，每一個照落點挑。 */
export function syncGroup(){
  syncFlock();   // 空戰編隊（ver -2516）
  const g=$('enemyGroup'); if(!g || !groupCard) return;
  const G=groupCard.group, n=G.order.length, each=groupEach(G);
  const shouldStand=Math.max(0, Math.min(n, Math.ceil(Math.max(0,state.enemyHp)/each)));
  let alive=[...g.querySelectorAll('.eg-guard')].filter(im=>!im.classList.contains('eg-down') && !im.classList.contains('eg-leaving'));
  while(alive.length>shouldStand){ const v=pickVictim(alive); if(!v) break; fallGuard(v); alive=alive.filter(x=>x!==v); }
}
/* 這一場的敵人圖（群體＝每個人那一層；單隻＝#enemyImg）載完了沒（ver -2052）。
   給「次要的預熱」排隊用：搭檔 CI 動檔一開戰就丟上百張請求，會把衛士圖擠到後面（實測等了快 7 秒）。
   最多等 maxMs，到了照樣放行。 */
export function visualsReady(maxMs){
  maxMs = maxMs || 3000;
  return new Promise(res=>{
    const ok=()=>{ const ims = groupCard ? [...document.querySelectorAll('#enemyGroup .eg-guard')] : [$('enemyImg')];
      return ims.every(im=>!im || !im.getAttribute('src') || im.complete); };
    if(ok()) return res();
    const t0=Date.now(), iv=setInterval(()=>{ if(ok() || Date.now()-t0>maxMs){ clearInterval(iv); res(); } }, 80);
  });
}
/* 每個人幾血：`hpEach`（帝都衛士：一人 100）；或寫整群的 `hp`、平均分（惡棍群戰沿用原卡的總血，ver -2061）。 */
function groupEach(G){ return G.hpEach || ((G.hp||0)/(G.order.length||1)) || 100; }
export function groupHp(en){ return (en && en.group) ? (en.group.hp || en.group.order.length*groupEach(en.group)) : 0; }
export function loadEnemyPortrait(en){
  const eImg = $('enemyImg');
  if(!eImg) return;
  /* 上一隻留下的動畫層先收掉（ver -2149，Ray：「帝都第一戰有米夏的聖徒化殘留」）—— 以前寫在群體敵人的 return 之後，
     於是「米夏 NI 待機循環 → 下一場是群體敵人（帝都衛士）」那一層就一直留在 #top 上。 */
  document.querySelectorAll('#top .en-fall').forEach(e=>e.remove());   // 上一隻的倒地動畫（ver -2065）
  stopIdleLoop();                                                       // 上一隻的待機循環（ver -2068）
  buildGroup(en);   // 群體敵人的每一層（沒有 group 的怪＝清空，ver -2043）
  /* 群體敵人：`#enemyImg` 不放圖（背景在 #top 的背景層，人在 #enemyGroup）——
     元素留著（命中閃縮改由 `groupHitFlash` 只抖被打中的那一個，ver -2154），但不畫。 */
  if(en && en.group){ eImg.removeAttribute('src'); eImg.style.visibility='hidden'; applyEnemyFit(en.fit); return; }
  eImg.style.visibility='';
  shadowCard = en || null;
  groundShadow.hide($('enemyShadow'));     // 換怪：新的腳量好之前不留上一隻的影子
  clearTimeout(riseT); riseT=0;
  clearTimeout(landT); landT=0;
  risePending=null;
  eImg.onload = null;
  eImg.classList.remove('enemy-rise','enemy-unpurge','enemy-purge','enemy-quake','enemy-airin');
  if(eImg._falling){ eImg._falling=false; if(eImg._fallAnim){ eImg._fallAnim.cancel(); eImg._fallAnim=null; } eImg.style.animation=''; eImg.style.transition=''; }   // 上一隻的斜下墜（deathFx:'skyfall'，ver -2456）
  /* ⚠⚠⚠ **換怪的第一件事是把上一張拔掉**（ver -1467）：`<img>` 在**新圖解碼完成
     之前不會重繪** —— 只設 `src` 的話，慢網下整段空窗畫面上站著的是**上一隻怪**，
     而且沒有任何錯誤訊息（Ray 在空戰看到地下聖徒的那一半就是這個）。
     ⚠ 這與 `setEnemy` 的 `noArt` 是**同一條規矩**（那裡的註解早就寫著「只是不載的話
       上一次留下的那張還掛在 `#enemyImg` 上」）—— 現在收成一處，每一條換怪的路
       都吃得到（鐵律 8）。
     ⚠ 只在**真的要換一張**時拔：同一張圖（重播降臨、同一隻怪再 setEnemy 一次）
       拔了會多一次空白閃爍。 */
  { const next = enemyImage(en);
    if(next && eImg.getAttribute('src') && eImg.getAttribute('src') !== next)
      eImg.removeAttribute('src'); }
  /* ⚠⚠ **演完要把 class 拿掉**（ver -598 修）：`enemy-rise` 帶 `both` 填充，
     留在身上等於 `#enemyImg` 永遠掛著 `animation:enemyRise`；而它與命中反應
     （`#enemyImg.hit`）specificity 相同、宣告在後面 —— **後面的贏**，
     於是「打中敵人」那一記從頭到尾播不出來（Ray 回報看不到命中效果）。
     ⚠ 用 `animationend` 而不是計時器：時長只寫在 CSS 一處（鐵律 7）。 */
  /* ⚠ 卡上 `riseStyle:'unpurge'` ＝降臨改成**淨化倒著放**（ver -1704，Ray：「降臨效果用淨化的
     倒放，並保留降臨時的圓圈」）—— 被打散的東西重新聚回原形。著地光環（landT）照舊。
     class 名由 `riseClass` 一支決定，收尾的 animationend 兩種名字都認。 */
  const riseCls = riseClass(en);
  const rise=()=>{ void eImg.offsetWidth; eImg.classList.add(riseCls);
    /* ══ 著地（ver -640，見 CSS 的 `enemyRise` 78% 那一格）══
       落到定位的那一刻補兩件事：**一圈擴散的聖光**與**鏡頭一震**。
       ⚠ 鏡頭震動走 `api.screenShake`（combat 擁有的那一支，鐵律 8）——
         不要在這裡自己加 class，那會變成第二份實作。
       ⚠⚠ **卡上宣告了 `entranceBlast` 就改演迎面衝擊的模糊**（ver -1443，
         Ray：「龍吟的特效不應該是震動，應該是動態模糊，像被迎面衝擊那樣」）——
         空中戰那一張龍卡走的是降臨這一條，而牠照樣會龍吟；不接的話同一隻龍
         **兩個形態兩種特效**。⚠ 是「**改演**」不是「兩個都演」：兩個一起跑的話
         `transform` 會互相蓋掉（一個元素只有一份 transform）。
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
        playEntranceSe(state.curEnemyEntranceSe || 'sfx_saint');
        if(en && en.entranceAlso) playEntranceSe(en.entranceAlso); }   // 同時第二聲（ver -1703，卡上的 entranceAlso）
      if(en && en.entranceBlast && api.roarBlast){
        api.roarBlast();
        /* ⚠ ver -1881（Ray：「守墓者降臨時畫面要有震動效果」）：卡上開了 `riseFx`（守墓者、古墓那幾張）
           的，衝擊波過完再震一下 —— 兩個一起跑會互搶 `#app` 的 transform，所以接在後面。 */
        if(en.riseFx && api.screenShake) setTimeout(()=>{ try{ api.screenShake(); }catch(_){} }, 500);
      }
      else if(api.screenShake) api.screenShake();
      const top=$('top');
      if(top){
        const ring=document.createElement('div');
        ring.className='enemy-land';
        top.appendChild(ring);
        setTimeout(()=>ring.remove(), 700);
      }
    }, LAND_AT);
    eImg.addEventListener('animationend', function off(e){
      if(e.animationName!=='enemyRise' && e.animationName!=='enemyPurge') return;
      eImg.removeEventListener('animationend', off);
      eImg.classList.remove(riseCls);
      if(e.animationName==='enemyRise' || riseCls==='enemy-unpurge') startCardIdle(en);   // 降臨演完才換成待機循環（ver -2075）
    }); };
  /* ══⚠⚠ **登場音只有一格**（ver -948，Ray：「entranceVo 跟 landSe 應該是同一時間
     發生，併為一格」）══ 卡上寫 `entrance`，播的**時機由這隻怪自己決定**：
       · 有降臨的（`isRise`＝`ENTRANCE_KINDS` 禍魘／聖徒／船，或卡上 `riseFx`）→ **著地那一刻**（見上面 landT）
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
  if(!isRise(en)){
    /* ⚠⚠ **`entranceBlast:true` ＝牠一出現就來一記迎面衝擊**（ver -1433 立、
       **-1443 由震動改成動態模糊**，Ray：「龍吟的特效不應該是震動，應該是動態模糊，
       像被迎面衝擊那樣」）—— 龍是 `kind:'multi'`（不走降臨），而降臨那一條的
       著地演出掛在 `landT` 裡，這條路上沒有人演。
       ⚠⚠ 欄位跟著改名（`entranceShake` → `entranceBlast`）：**名字要說實話** ——
         留著舊名字的話，下一個人會以為它還是在震（同 `counterCount`→`counterFired`
         那次改名的理由，§「完美反擊」）。
       ⚠ 走 `api.roarBlast`（combat 擁有的那一支，鐵律 8）—— **不要**退回
         `screenShake`：那是「你被打到了」，這是「衝擊波撞上來」，兩件事。
       ⚠ 龍吟就是卡上的 `entrance`（登場音那一格）—— 不另開欄位。 */
    const air=isAirBio(en) || isAirShip(en);
    /* 出場動畫（ENEMY_ENTER，ver -2527）：門開那一刻播一次，播完才起待機；動檔還沒載好就直接站好。 */
    const enterC=clipFor('enter', en);
    if(enterC) loadClip(enterC.dir);
    /* 動檔還在載：人先藏著等（最多 2.5 秒），載到就播；等不到才直接站好。 */
    const enterNow=(play, t0)=>{ if(curCard()!==en) return;
      const L=clipCache[enterC.dir];
      if(play && !(L && L.fr) && performance.now()-(t0||performance.now())<2500){ const s0=t0||performance.now(); setTimeout(()=>enterNow(play, s0), 80); return; }
      eImg.style.opacity='';
      if(play && L && L.fr){ playActionClip('enter', ()=>{ if(curCard()===en) startCardIdle(en); }); if(clipT) return; }
      startCardIdle(en); };
    const arrive=()=>{
      if(air) airEnter(en, eImg, true);
      if(enterC) enterNow(true);
      if(playEntranceVo) playEntranceVo();
      if(en && en.entranceBlast && api.roarBlast) api.roarBlast();
    };
    /* ══⚠⚠⚠ **音與震要等門開**（ver -1441，Ray：「龍每次出場畫面都要震動，
       為什麼播了音就不震，震了就不播？」；-1443 起「震」改成迎面衝擊的模糊）══
       兩件事**一直都是一起發的**（就在上面那一支裡）—— 看不到震動的原因是**時機**：
       這一支跑在 `startGame` 那一刻，而那時 `#storyStage.on` 還蓋著，
       **`#app` 整層 `visibility:hidden`**（鐵律 10）—— 震動照樣跑完了，
       只是沒有人看得到；聲音不受 `visibility` 影響，所以「只聽得到聲音」。
       ⇒ 掛進既有的 `risePending`（＝門全開才放行的那一支，`releaseRise`）：
         **圖照舊立刻掛**（-1414 的「槍棺開的時候就在那裡了」不變），
         只有音與震延到門開的那一刻。
       ⚠ 已經放行了（`riseHeld` 是 false，例如不走門的路徑）就當場發，行為不變。 */
    /* ⚠ 被 `suppressRiseOnce` 壓掉的那一場：登場音與衝擊也不發（見 riseSuppressedNow）。 */
    const fire=()=>{ if(riseSuppressedNow){ if(air) airEnter(en, eImg, false); if(enterC) enterNow(false); return; } if(riseHeld) risePending=arrive; else arrive(); };
    const shown=()=>{ eImg.onload=null; fire(); if(!air && !enterC) startCardIdle(en); };   // 空中生物型／有出場動畫：待機等入場演完
    if(air || enterC) eImg.style.opacity='0';   // 門開才進場（門開前那一格不能已經站著）   // 門開才由近到遠飛進來（門開前那一格不能已經站著）
    eImg.onload = shown;
    eImg.src = enemyImage(en);
    if(eImg.complete && eImg.naturalWidth) shown();
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
function spawnPurgeStars(box){
  const B=box||{ l:30, t:28, w:40, h:46, n:STAR_N };   // 預設＝立繪站的那一塊；群體淨化傳那一隻的輪廓框（ver -2223）
  for(let i=0;i<(B.n||STAR_N);i++){
    const d=document.createElement('div');
    d.className='fx fx-star';
    d.appendChild(document.createElement('i'));      // 中心光核
    const size = 14 + Math.random()*30;
    const life = 520 + Math.random()*420;
    const delay = Math.random()*260;
    d.style.left = (B.l + Math.random()*B.w) + '%';
    d.style.top  = (B.t + Math.random()*B.h) + '%';
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
/* ══⚠⚠ **`deathFx:'quake'` ＝血歸零了但「那東西沒死」**（ver -1700，Ray：「沒有淨化
   反應 那東西沒死的震動配 brickcrush」）══ 守墓者那一族（`gk_*`）用：牠只是古墓的
   算力投影，打散了還會再來 —— 所以**不淨化**（台詞「沒有淨化反應」要成立），
   改成整隻劇烈一震 ＋ 瓦礫崩落聲，讀起來是「牠被打回牆裡了」。
   ⚠ 掛在同一支（`purgeEnemy` 就是「一隻怪倒下的死法」的唯一入口，鐵律 8），
     優先於淨化判定 —— 卡上寫了它就不會同時淨化。
   ⚠ 聲音走 `story.playSe`（音效表只有那一份，鐵律 7；它自己擋 brickcrush 疊播）。
   ⚠ 冪等：同 `enemy-purge`，overkill 期間重複叫到不會重播。 */
export function purgeEnemy(){
  const en = GAME_CONFIG.enemies[state.currentEnemyKey];
  stopAirDrift(false);   // 死亡就停在當下那一格（ver -2499）
  /* `deathFx:'skyfall'`（ver -2456，樹寄生石龍；Ray：「龍被擊敗是斜下墜出畫面外」）：不淨化，
     整條龍（照舊播待機動檔，沒動檔就用靜態圖）往右下斜墜平移、加速掉出畫面。冪等（掛 _falling）。 */
  if(en && en.deathFx==='skyfall'){
    const el = idleEl || $('enemyImg'); if(!el || el._falling) return;
    el._falling = true; el.style.visibility=''; el.style.opacity='1'; el.style.clipPath='';
    if(sky && sky.lunge){ clearInterval(sky.lunge._sync); sky.lunge.remove(); sky.lunge=null; sky.vanishEl=null; }
    const top=$('top'), W=top.clientWidth, H=top.clientHeight;
    /* ⚠ 不能用 CSS transition：受擊的 `#enemyImg.hit + .en-idle{animation:…}` 那幾條動畫會蓋過 transform，
       動畫一結束就直接跳到終點（ver -2457 實測：一格就到底，沒有墜落的過程）⇒ 先關掉 CSS 動畫、改用 el.animate 跑完停在最後一格 */
    el.style.animation='none'; el.style.transition='none'; el.style.transformOrigin='50% 50%';
    /* -2458 Ray：「跟閉棺要同時發生，誰讓你轉暗了」：只斜下平移（不轉、不暗），與閉棺同時開始。
       -2459 Ray：「龍緩緩落下，不要像掉下去」：慢慢往右下沉（緩起緩停、不加速），閉棺蓋上時牠還在往下飄 */
    if(sky) sky.dying=true;
    el._fallAnim = el.animate([{ transform:'none' }, { transform:`translate(${W*0.4}px, ${H*0.95}px)` }],
      { duration:2400, easing:'cubic-bezier(.45,.05,.55,.95)', fill:'forwards' });   // 900＝story.js 的 KERB_T.open（兩扇合上；story.js 有別人未提交的改動，先不去動它加 export）
    return;
  }
  stopIdleLoop();   // 死亡演出在立繪本體上演（ver -2075）
  if(en && en.deathFx==='quake'){
    const eImg = $('enemyImg');
    if(!eImg || eImg.classList.contains('enemy-quake')) return;
    eImg.classList.add('enemy-quake');
    try{ story.playSe('se_brickcrush'); }catch(_){}
    return;
  }
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
  if(groupCard) return groupBodyPoint();   // 群體敵人：只挑還站著的人（ver -2048）
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
  portraitOverride=null;                        // 換了一隻（或重開一場）→ NI 鎖住的立繪放掉（ver -1965）
  loadSingleFall(en);                           // 單人的倒地動畫（ver -2065）：有寫 `fall` 就先抓
  stopSakura();                                 // 換了一隻怪 → 上一隻的櫻花與 Sturm 一起收（ver -899）
  stopHolyBurst();                              // 同上：放光也是全螢幕的層＋一支還在響的音（ver -1351）
  setSkyBattle(en.sky);                         // 空戰的視差背景（ver -2444）：沒有 `sky` 的怪＝收掉上一隻的
  startDamageSmoke(en.damageSmoke);             // 受損冒黑煙（ver -2490）：沒寫的怪＝收掉上一隻的
  startFlock(en);                               // 空戰編隊（ver -2516）：沒寫 flock 的怪＝收掉上一隻的
  setEmpowered(0);                              // 換怪：上一隻的蓄力光與提示收掉（ver -2525）
  startAirDrift(en);                            // 戶外空戰生物型的接舷漂移（ver -2499）：不是的怪＝收掉上一隻的
  rollSmokeDir();                               // 船戰的煙往哪一邊飄：這一場擲一次（ver -1653）
  state.currentEnemyKey = key;                 // 3.7：記住目前怪 key，供 boardGridFor 查每盤格數
  state.enemyHitsTaken = 0;                     // 換了一隻怪 → 「這一隻」的受擊數歸零（九階「方舟」，ver -708）
  /* 這一局的出場帳（ver -921，Ray：「好感度給出場數最多的那一位全拿」）——
     記在**現在出場的那一位**頭上。⚠ 掛在這裡是因為 `setEnemy` 就是「一場」的
     唯一邊界（§0.5）：連戰換第二隻也走這一支，那確實是新的一場。 */
  addPartnerFight(state.pickedPartner);
  /* ══⚠⚠⚠ **stage 加成：唯一的計算點就在這裡**（ver -1584b，Ray：「stage 加成從
     stage8 開始算，每升一個 stage ×1.025」）══ 卡上存的永遠是**基準值**（＝S8 的值），
     加成在載入這一刻才乘上去 —— 烘進卡裡的話就再也分不出「這是基準還是加過的」
     （鐵律 7；同「卡上寫絕對值就存絕對值」那一條的理由）。
     ⚠ `stageScale` ＝這一隻吃多少（1＝標準、0＝完全不吃，給手動設製的那幾張）。
     ⚠ **每次換敵都算**（連戰換第二隻也走這一支），不要快取成模組常數。 */
  const SC = (GAME_CONFIG.tuning||{}).stageCurve || {};
  const _steps = Math.max(0, prog.getStage() - (SC.from||8));
  const _sScale = (en.stageScale != null) ? en.stageScale : 1;
  const stageMul = 1 + (Math.pow(SC.k || 1, _steps) - 1) * _sScale;
  /* ══⚠⚠ Boss 加成：HP 與攻擊 ×`rating.bossMul.stat`（ver -1878，Ray：「Boss=1 則
     全能力+20%」）—— 與 stage 加成同一個計算點（鐵律 7），卡上照舊存基準值。 */
  const _bm = (GAME_CONFIG.rating||{}).bossMul || {};
  const bossStat = (en.boss && _bm.stat > 0) ? _bm.stat : 1;
  initEnemyHp(Math.round((en.hp||0) * stageMul * bossStat));   // 3.2：敵血基準（載入時 setter）
  state.ASSAULT_DAMAGE = Math.round((en.attack||0) * stageMul * bossStat);   // 3.3：大絕單擊傷害
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
  /* ══ 劈落（ver -1957，Ray：「普攻無效，射出的子彈會被銀色刀光擋下，該特效定義為『劈落』」）══
     卡上 `parryBasic:1` ＝普攻（`basic`）整發不計傷害，命中點改演刀光＋浮字 GUARD。
     ⚠ 與 `Ganymede:-1` 不是同一件事：抗性那一條至少留 1 點（`applyEnemyMods`），
       而且畫面上照樣噴槍火 —— 讀起來是「打不痛」不是「被擋下」。
     ⚠ 只擋普攻：反擊／雙槍破防／聖徒化追打照常（那些才是打得動牠的路）。 */
  state.enemyParry     = (en.parryBasic===true) ? 1 : (+en.parryBasic || 0);   // 機率（ver -2043：1＝每發都擋、0.5＝一半）
  /* 六角護罩（ver -2120，碼頭戰愛里歐）：卡上 `hexShield:true` ＝只吃清盤傷害（combat 的 shieldUp）。 */
  state.enemyHexShield = !!en.hexShield; state.shieldDown=false; state.shieldBank=0;
  state.enemyCounterImmune = !!en.counterImmune;   // 反擊完全免疫（ver -2131）：護罩期間反擊不記帳（combat.enemyDamage）
  state.enemyShieldClearPct = +en.shieldClearPct || 1;   // 清盤時把那一盤擋下的傷害打這個比例進去（ver -2122：沒寫＝全額）
  /* 卡上 `healOnFault:0.1` ＝玩家點錯／受擊／逾時，敵回最大 HP 的這一成（ver -1858，羅賽爾「慈愛殘像」）。 */
  state.enemyHealOnFault = +en.healOnFault || 0;
  /* 防禦型的 BR 增傷（ver -1584，Ray：「防禦型 BR 統一增傷 50%」）——
     卡上的 `brBonus` 由 `enemies_baseline.py` 依類型寫進去；沒寫＝0。 */
  state.enemyBrBonus   = (en.brBonus != null) ? en.brBonus : 0;
  /* 副武器調整（ver -796，Ray：一欄搞定）：`weaponMod:{ 類別:[傷害, 迴避] }` ——
     [0]傷害＝反擊增傷率（正）/抗性減傷率（負），加法；[1]迴避＝額外 miss 率(0~1)，加法。 */
  state.enemyWeaponMod = en.weaponMod || null;
  /* 疊圈（ver -1582，Ray：「改成疊圈，1 開 0 關，C 以下預設不疊圈」）——
   ⚠ **沒寫＝可疊**（＝ -1582 之前的行為）：漏寫不會改變既有那幾張卡的手感。 */
  state.enemyNoStack   = (en.stack != null) && !en.stack;
  /* 卡上 maxRings（同時最多幾顆圈）／enrage（血量掉到 hp% 以下縮圈時間 ×chargeMul）（ver -2459，樹寄生石龍；
     Ray：「半血以後縮圈速度加倍，畫面最多一次兩個圈」）。enrage 由 defense 在排程那一刻判、只套一次（enrageOn）。 */
  state.enemyMaxRings  = en.maxRings || 0;
  state.enemyEnrage    = en.enrage || null;
  state.enrageOn       = false;
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
  /* 受擊音效（ver -1881，Ray：「受擊特效後面加一欄受擊音效」）：卡上 `hitSe` ＝**這一隻的受擊音一律用它**
     （四種受擊共用），留白＝照舊跟著 hitFx 的 type 走（config.HITFX，ver -800）。 */
  state.curEnemyHitSe = en.hitSe || null;
  state.curEnemyHitFx = en.hitFx || null;        // 3.7：本怪受擊特效三件套（音效綁在 type 上，見 config.HITFX；卡上不再有 sound，ver -800）
  /* 受擊特效的冷卻（秒，ver -1667）：卡上的 `hitFxCd`（Excel「受擊特效／CD秒」）。
     ⚠ 沒寫要清成 0 —— 同 setEnemy 的其他欄位，連戰換敵不能留上一隻的。 */
  state.curEnemyHitFxCd = (+en.hitFxCd || 0);
  state.curEnemyEntranceSe = en.entrance || null;     // 登場音（ver -948 併成一格；-949 欄名定為 entrance）
  // 名稱與立繪；取景（config fit.pos → object-position；未設＝回 CSS 預設 center top）
  const nameEl = $('enemyName');
  /* ══⚠⚠ **這一場要顯示別的名字**（ver -1671，Ray 的古墓稿：「祭壇終戰，最終型態。
     **怪名從守墓者換成「伊甸古墓」**」）══ 戰鬥卡上的 `enemyName`。
     ⚠⚠ 寫在**戰鬥卡**不寫在敵人卡：那一場用的就是 `gk_crypt`（Ray 指定），
       而「牠其實是古墓本身」是**那一場的揭露**，不是那隻怪的屬性 ——
       改敵人卡會讓追擊時遇到的同一張卡也跟著改名（鐵律 7：一個量一個計算點，
       而這裡本來就是兩個量）。
     ⚠ 沒寫就照舊讀敵人卡，所以既有 95 張卡一個字都不必動。 */
  { const bc = state.scriptBattleId && GAME_CONFIG.battles && GAME_CONFIG.battles[state.scriptBattleId];
    const nm = (bc && bc.enemyName) || en.name;
    if(nameEl) nameEl.textContent = displayEnemyName(nm); }
  const eImg = $('enemyImg');
  if(eImg){
    applyEnemyFit(en.fit);   // 取景（ver -1883 抽出：戰鬥中的「敵立繪」編輯面板也用這一支預覽）
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
    const nm = (en.bgLock && en.bg) || state.battleBg || en.bg || '';   // 卡上 bgLock：這一場一定用自己的背景（ver -2524，安雅光翼的教堂殘垣）
    /* 群體敵人的去人背景（ver -2043）：**它就是這一場的戰鬥背景**，蓋過城鎮那一格的（battleBg）。
       ⚠ 直接寫路徑（四張都叫 plate.webp，走 bgUrl 的資料夾表會撞名）。 */
    const plate = en.group && en.group.plate;
    topEl.style.backgroundImage = plate ? ('url("'+plate+'")') : nm ? ('url("'+story.bgUrl(nm)+'")') : '';
    /* plate 與人層是**同一張原圖拆出來的**：背景要照卡上的 `fit.pos` 對位，人才會落回原位（ver -2066，米夏親衛隊 35%）。
       縮放／上下偏移照舊只套在人那一組（applyEnemyFit）。不是 plate 的背景維持 CSS 原本的對位。 */
    topEl.style.backgroundPosition = plate ? (((en.fit||{}).pos)||'50% 50%') : '';
    { const on=!plate && !en.sky && /^sky_/i.test(nm); setSkyPan(on ? nm : null, on ? story.bgUrl(nm) : ''); }
  }
  /* ⚠ `noArt`：開機那一次不載圖，而且**把 src 整個拔掉** —— 只是不載的話
     上一次留下的那張還掛在 `#enemyImg` 上，空窗一樣會露出來。 */
  if(opts && opts.noArt){ const ei=$('enemyImg'); if(ei) ei.removeAttribute('src'); }
  else{ applyFar(en);   // 平時站遠（ver -2473）：降臨那一段就已經在遠處
        loadEnemyPortrait(en);
        placeEnemyShadow(); }      // 同一張圖不會再 load，但框可能變了（fit／scale）⇒ 影子重擺（ver -1702）
  /* 換了一隻怪（ver -693）：讓搭檔的「每隻怪一次」那一類被動重新上膛。
     ⚠ 這裡是那件事的唯一時刻 —— 開場、連戰換敵、Boss 亂入全部經過 setEnemy。 */
  if(api.onEnemySet) api.onEnemySet();
}

/* ---------- 連戰序列（局＝同場多敵）----------
 *  lineupIndex 為序列游標（§3.7 enemy 擁有）。開場載 lineup[0]、換敵時游標 +1 載下一隻。
 *  Boss 亂入（inIntruderFight）為單敵新場,不走 lineup → hasNextInLineup 恆 false。 */
/* ⚠⚠⚠ **`key` ＝這一場的怪由呼叫端指定**（ver -1467）——劇情插入戰走這一條。
   以前這一支**只認挑戰那一串**，而 `startGame` 又無條件叫它 ⇒ 每一場劇情戰都先把
   `GAME_CONFIG.currentEnemy`（挑戰的第一隻＝**地下聖徒**）整隻載上去，
   七十行之後才換成卡上真正的那一隻。網路慢的時候玩家就看著地下聖徒
   （`#enemyImg` 在新圖解碼完成前不會重繪）。見 combat.startGame 那一段的說明。
   ⚠ `lineupIndex` 照舊一律歸零 —— 那是「新的一局」的游標，與載哪一隻無關。 */
export function startLineup(key){
  state.lineupIndex = 0;
  const first = key || (GAME_CONFIG.lineup && GAME_CONFIG.lineup[0]) || GAME_CONFIG.currentEnemy;
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
    stopIdleLoop();   // 連戰換敵：掠過演出在立繪本體上演（ver -2075）
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
  /* ══⚠⚠⚠ **開機不要掛任何一隻怪**（ver -1587，Ray：「faceless 是開機就掛在 `#app`
     上的挑戰用怪，別再掛了，把它拿掉」）══════════════════════════════════════
     以前這裡是 `setEnemy(GAME_CONFIG.currentEnemy, {noArt:true})` —— -1321 已經把
     **立繪**擋掉了，但**名字、血條、盤面格數**照樣被擺成「挑戰第一戰」那一隻。
     ⇒ 任何一瞬間 `#app` 露出來（讀取頁淡入的那 300ms、換場、飛行收掉的空窗），
       玩家看到的就是那隻怪 —— Ray 為這件事回報過三次（-576／-1321／-1587）。
     ⚠ 拿掉不會壞：`boardGridFor` 查不到怪就退回 `GAME_CONFIG.boards`（背景盤面照擺），
       而真的要打的時候 `startGame` → `enemy.startLineup()` 本來就會載。
     ⚠ 這也是鐵律 13 的同一條：**開機那一刻擺上去的東西，就是首頁的成本**。 */
  { const nm=$('enemyName'); if(nm) nm.textContent=''; }
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
