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

import { i18nT } from '../i18n/scriptTr.js';   // 介面字譯文（ver -1909；中文時原樣回傳）
import * as clock from '../script/clock.js';   // 立繪的時段差分（ver -423）
import * as prog from '../script/progress.js';  // stage 加成要問現在第幾章（ver -1584b）
import { ENEMY_IDLE, SHIP_TRAIL, ENEMY_FLY, ENEMY_ATK, ENEMY_DELAY, ENEMY_MISS, ENEMY_ENTER, ENEMY_DOWN, ENEMY_HURT, ENEMY_DODGE, GAME_CONFIG, HITFX, asset, sfxGain, assetVer } from '../config.js';
import { state, initEnemyHp, addPartnerFight } from '../state.js';
import { SFX } from '../audio.js';
import * as story from './story.js';
import { BG_FX } from '../script/bg_fx.js';   // 戰鬥背景的程式層（水面／雲，ver -2826）
import { prepFx, drawFx } from './bgfx.js';
import { BG_ANIM } from '../script/bg_anim.js';   // 戰鬥背景也用動態背景（ver -2729）   // 背景 URL 只有 story.bgUrl 一支在組（ver -905，鐵律 7）
import { GROUP_MEMBERS } from '../script/group_members.js';
import { GROUP_LAYOUT } from '../script/group_layout.js';
import { GROUP_COMPS } from '../script/group_comps.js';   // 群戰編組：立繪＋位置（ver -2635，tools/group_editor.html 存檔寫回）   // 群戰成員的位置與大小（ver -2632，編輯器存檔寫回）   // 群戰分層 → 原立繪的對位（自動產生，ver -2623）
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
/* ══ 群戰成員自己的受擊特效（ENEMY_ATK 的 `hitFx`／`strikes`，ver -2651，Ray：「鉗類的受擊用單爪痕 要跟著打擊節奏」）══
   群戰卡只有一組 hitFx（整組共用）；成員的攻擊片上寫了 `hitFx` 的，牠那一擊落地時改用牠自己的（特效與音效）。
   `strikes:[格…]` ＝片子裡每一下打擊的格：最後一格＝扣血（取代 `hit`），前面每一格各補一道同款特效＋音效 —— 節奏跟著片子走。
   落地那一刻怎麼認：成員出手時記「哪一款、預計幾點打到」，combat 扣血時在 ±ACT_FX_WIN 內就認（同一閃的 takeIssenHit）。 */
const ACT_FX_WIN=400;
let actFx=null, lastActIm=null;   // lastActIm＝最近一次出手的群戰成員（聲波從牠身上擴出）
function actFxLive(kind){ return (kind==='assault' || kind==='ult' || kind==='delay' || kind==='wrong') && actFx && Math.abs(performance.now()-actFx.at)<ACT_FX_WIN ? actFx : null; }   // ver -2678：延時／點錯也認（那一隻出手演的片寫了 hitFx 就用牠的，Ray：「蠕蟲全攻擊受擊跟音效都一樣」）
export function actHitSe(kind){ const a=actFxLive(kind); return a ? ((HITFX[a.key]||{}).se || null) : null; }
/* ══ 聲波（`hitFx:'sonic'`，ver -2652，Ray：「他是聲波攻擊 聲波用程式跑 模糊 效果是讓盤面數字迅速淡出消失 再慢慢淡入回來」）══
   打到那一刻：從這隻的本體中心擴出幾圈模糊的聲波環（蓋過敵人區）；盤面每一格的數字快速淡出、停一下、再慢慢淡回。
   ⚠ 只淡數字（格內那個 span），格子本身、點擊判定都照舊 —— 玩家還是點得到，只是一時看不見號碼。 */
const SONIC_RINGS=3, SONIC_RING_MS=620, SONIC_RING_GAP=110, SONIC_FADE_MS=2600, SONIC_OUT=0.06, SONIC_HOLD=0.28;
function sonicHit(im){
  const g=$('enemyGroup'), gr=g && g.getBoundingClientRect();
  if(gr && gr.width){
    const o=(im && im._ov && im._ov.getBoundingClientRect()) || null;
    const cx=o && o.width ? (o.left+o.width/2-gr.left) : gr.width/2, cy=o && o.height ? (o.top+o.height*0.45-gr.top) : gr.height/2;
    const R=Math.hypot(gr.width, gr.height)*0.75;
    for(let k=0;k<SONIC_RINGS;k++){
      const r=document.createElement('div'); r.className='eg-sonic';
      r.style.cssText=`left:${cx-R}px;top:${cy-R}px;width:${R*2}px;height:${R*2}px;`;
      g.appendChild(r);
      const a=r.animate([{ transform:'scale(0.08)', opacity:0.9 }, { transform:'scale(1)', opacity:0 }], { duration:SONIC_RING_MS, delay:k*SONIC_RING_GAP, easing:'cubic-bezier(.2,.6,.4,1)', fill:'both' });
      a.onfinish=()=>r.remove(); setTimeout(()=>r.remove(), SONIC_RING_MS+k*SONIC_RING_GAP+200);
    }
  }
  for(const sp of document.querySelectorAll('#grid .cell > span'))
    if(sp.animate) sp.animate([{ opacity:1, offset:0 }, { opacity:0, offset:SONIC_OUT }, { opacity:0, offset:SONIC_HOLD, easing:'ease-in' }, { opacity:1, offset:1 }], { duration:SONIC_FADE_MS });
}
/* ══ 起手音（ENEMY_ATK／DELAY／MISS 的 `windupSe`，ver -2657，Ray：「吼聲從攻擊開始…咬下那一格應該是最後，適當伸縮音效讓他跟畫面對齊」）══
   動作片第 0 格起播；音檔本身已伸縮成「起手→打擊格」那一段長度，所以吼聲收在打擊格上。
   單隻（playActionClip）與群戰成員（memberActOnce）都走這一支（鐵律 8）。 */
/* 腳步音（ENEMY_ATK／DELAY／MISS 的 `stepSe:{ se, at:[格…] }`，ver -2724，Ray：「配合腳部給他爪在地上走的聲音」）：
   片子播到那幾格各放一聲；`skip:[a,b]` 跳掉的那一段會照實扣掉時間。單隻與群戰成員共用（鐵律 8）。 */
function clipFrameMs(sp, f, fps){ const sk=sp.skip; const g=(sk && f>sk[0]) ? (f>=sk[1] ? f-(sk[1]-sk[0]) : sk[0]) : f; return g*1000/fps; }
function stepSes(sp, fps, alive){ const st=sp && sp.stepSe; if(!st || !st.se) return;
  for(const f of (st.at||[])) setTimeout(()=>{ if(!alive || alive()) SFX.play(asset(st.se), sfxGain(st.se)); }, clipFrameMs(sp, f, fps)); }
/* ══ 戰鬥的動態背景（ver -2729，Ray：「戰鬥時要用動態背景」）══
   背景名（例 canyon_bones_day）查 `BG_ANIM`（城鎮舞台用的同一張表），有就在 #top 最底層放一支靜音循環影片，
   靜態圖照舊墊在底下（影片沒載到也不會黑）。換怪換背景就換片、結束戰鬥（combat.stopAll）就收掉，不在背景偷跑（鐵律 10）。 */
let battleVid=null, battleVidName='';
export function resumeBattleBgVideo(){ setBattleBgVideo(battleVidName); }   // startGame 的 stopAll 在換敵之後 ⇒ 開打時再接回來
export function stopBattleBgVideo(){ stopBattleBgFx(); if(battleVid){ try{ battleVid.pause(); battleVid.removeAttribute('src'); battleVid.load(); battleVid.remove(); }catch(_){} battleVid=null; } }
/* ══ 戰鬥背景的程式層（ver -2826，索菈娜湖上甲板：Ray「走動水摳雲規則」）══
   背景名查 `BG_FX`（城鎮舞台用的同一張表、同一支 `bgfx.drawFx`，鐵律 8）：有就在 #top 最底層放一張 canvas，
   底圖＝那張靜態背景，照 #top 的 center/cover 貼；每秒最多 30 格（同 story 的 BG_FX_FRAME_MS），分頁藏起來就不畫。
   收場跟影片同一支 stopBattleBgVideo（combat.stopAll）—— 戰鬥結束不在背景偷跑（鐵律 10）。 */
let battleFx=null;
function stopBattleBgFx(){ const o=battleFx; battleFx=null; if(!o) return; cancelAnimationFrame(o.raf); try{ o.cv.remove(); }catch(_){}
  if(o.v){ try{ o.v.pause(); o.v.removeAttribute('src'); o.v.load(); o.v.remove(); }catch(_){} } }
function startBattleBgFx(stem, url){
  const spec=BG_FX[stem]; const top=$('top');
  if(!spec || !top){ stopBattleBgFx(); return false; }
  if(battleFx && battleFx.url===url && battleFx.cv.isConnected) return true;
  stopBattleBgFx();
  const cv=document.createElement('canvas'); cv.className='battle-bgfx';
  cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;opacity:0;transition:opacity .3s';
  top.style.isolation='isolate'; top.prepend(cv);
  const img=new Image(); img.decoding='async'; img.src=url;
  const o={ cv, ctx:cv.getContext('2d'), img, url, fx:prepFx(spec), raf:0, last:0, t0:performance.now() }; battleFx=o;
  /* 底圖可以是影片（spec.video，ver -2832 索菈娜帆微動）：有畫面就用影片的這一格當來源（live），還沒載到先用靜態圖。 */
  if(spec.video){ const v=document.createElement('video'); o.v=v;
    v.muted=true; v.defaultMuted=true; v.playsInline=true; v.loop=true; v.preload='auto';
    v.setAttribute('muted',''); v.setAttribute('playsinline',''); v.setAttribute('webkit-playsinline','');
    v.style.cssText='position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1;';
    document.body.appendChild(v);
    v.onloadeddata=()=>{ if(battleFx!==o) return; const p=v.play(); if(p && p.catch) p.catch(()=>{}); };
    v.onerror=()=>{ if(battleFx!==o) return; try{ v.remove(); }catch(_){} o.v=null; };
    v.src=spec.video+assetVer(spec.video); }
  const loop=now=>{
    if(battleFx!==o || !cv.isConnected) return;
    o.raf=requestAnimationFrame(loop);
    if(document.hidden || now-o.last<33) return; o.last=now;
    if(o.fx.failed){ stopBattleBgFx(); return; }
    if(!o.fx.ready) return;
    const vd=o.v && o.v.videoWidth && o.v.readyState>=2 ? o.v : null;
    if(!vd && (!img.complete || !img.naturalWidth)) return;
    const sw=vd ? vd.videoWidth : img.naturalWidth, sh=vd ? vd.videoHeight : img.naturalHeight, src=drawFx(o.fx, vd||img, sw, sh, (now-o.t0)/1000, !!vd);
    const W=top.clientWidth, H=top.clientHeight; if(!W||!H) return;
    const dpr=Math.min(2, window.devicePixelRatio||1), cw=Math.round(W*dpr), ch=Math.round(H*dpr);
    if(cv.width!==cw || cv.height!==ch){ cv.width=cw; cv.height=ch; }
    const k=Math.max(cw/sw, ch/sh), dw=sw*k, dh=sh*k;
    o.ctx.drawImage(src, (cw-dw)/2, (ch-dh)/2, dw, dh);
    cv.style.opacity='1';
  };
  o.raf=requestAnimationFrame(loop);
  return true;
}
function setBattleBgVideo(nm){
  battleVidName=nm||'';
  const stem=String(nm||'').split('?')[0].replace(/^.*\//,'').replace(/\.\w+$/,'').toLowerCase(), src=stem && BG_ANIM[stem];
  if(!src){ stopBattleBgVideo(); if(stem && BG_FX[stem]) startBattleBgFx(stem, story.bgUrl(nm)); return; }
  const top=$('top'); if(!top) return;
  if(battleVid && battleVid.dataset.src===src && battleVid.isConnected) return;
  stopBattleBgVideo();
  const v=document.createElement('video'); battleVid=v; v.dataset.src=src;
  v.muted=true; v.defaultMuted=true; v.playsInline=true; v.loop=true; v.preload='auto';
  v.setAttribute('muted',''); v.setAttribute('playsinline',''); v.setAttribute('webkit-playsinline','');
  v.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:-1;pointer-events:none;opacity:0;transition:opacity .3s';
  top.style.isolation='isolate';   // 讓 z-index:-1 的影片落在 #top 的底圖之上、所有內容之下
  top.prepend(v);
  v.onloadeddata=()=>{ if(battleVid!==v) return; v.style.opacity='1'; const p=v.play(); if(p && p.catch) p.catch(()=>{}); };
  v.onerror=()=>{ if(battleVid===v) stopBattleBgVideo(); };
  v.src=src;
}
function windupSe(key, ms, alive, fit){ if(!key) return; const go=()=>{ if(!alive || alive()){ if(fit) SFX.playFit(asset(key), sfxGain(key), fit); else SFX.play(asset(key), sfxGain(key)); } };   // fit＝保持音高的時間伸縮 {from,to,dur}（`windupFit`，ver -2692）
 if(ms>0) setTimeout(go, ms); else go(); }   // ms＝起手後幾毫秒才放（`windupMs`，ver -2659）；alive＝那時這一擊還在演嗎
/* ══ 噴火（ENEMY_ATK 的 `flame:{from,to,at:[u,v]}`，ver -2683，Ray：「換成從尾部噴射火燄的特效」）══
   from～to 格之間，從片子上 (u,v)（那一格畫面的比例座標，肋籠獸＝長頸末端的嘴）往鏡頭噴：
   一團團火焰由噴口冒出、邊長大邊往畫面下方（玩家這一側）撲過來、淡掉。掛在 #fxTop 的上層，每一團自己收。 */
function spawnFlame(srcEl, spec, fps, alive){
  const host=$('top'); if(!host || !srcEl) return;
  const n0=(spec.to-spec.from)*1000/fps, step=45, t0=performance.now();
  const emit=()=>{
    if(alive && !alive()) return; if(performance.now()-t0>n0) return;
    const hr=host.getBoundingClientRect(), r=srcEl.getBoundingClientRect(); if(!r.width){ setTimeout(emit, step); return; }
    const x=r.left-hr.left + spec.at[0]*r.width, y=r.top-hr.top + spec.at[1]*r.height;
    /* ver -2684（Ray：「橘紅白煙霧 要像火燄 掃過之處還有黑煙冒起」）：
       火＝一團團不規則的煙霧狀火舌（白熱／橘／紅三種色，拉長、旋轉、邊走邊翻滾），
       每一團燒完的地方冒一縷黑煙，往上飄、慢慢散。 */
    for(let k=0;k<3;k++){
      const b=document.createElement('i'); b.className='fx-flame f'+((Math.random()*3)|0);
      const sz=46+Math.random()*40; b.style.cssText=`left:${x-sz/2}px;top:${y-sz/2}px;width:${sz}px;height:${sz*(0.7+Math.random()*0.6)}px;`;
      host.appendChild(b);
      const tx=(Math.random()*2-1)*hr.width*0.32, ty=hr.height*(0.28+Math.random()*0.40), life=520+Math.random()*300;
      const r0=(Math.random()*360)|0, r1=r0+(Math.random()*160-80);
      const a=b.animate([{ transform:`translate(0,0) rotate(${r0}deg) scale(.35,.3)`, opacity:1 },
                         { transform:`translate(${tx*0.5}px,${ty*0.45}px) rotate(${(r0+r1)/2}deg) scale(2.4,1.7)`, opacity:.95, offset:.35 },
                         { transform:`translate(${tx}px,${ty}px) rotate(${r1}deg) scale(4.4,3.4)`, opacity:0 }], { duration:life, easing:'cubic-bezier(.3,.6,.5,1)' });
      a.onfinish=()=>b.remove(); setTimeout(()=>b.remove(), life+200);
      if(Math.random()<0.55) setTimeout(()=>{   // 燒過的地方冒黑煙
        const s=document.createElement('i'); s.className='fx-smoke'; const ss=60+Math.random()*70, sx=x+tx*0.85, sy=y+ty*0.85;
        s.style.cssText=`left:${sx-ss/2}px;top:${sy-ss/2}px;width:${ss}px;height:${ss}px;`; host.appendChild(s);
        const sl=1400+Math.random()*900, dx=Math.random()*60-30;
        const sa=s.animate([{ transform:'translate(0,0) scale(.5)', opacity:0 }, { transform:`translate(${dx*0.3}px,-20px) scale(1)`, opacity:.75, offset:.2 },
                            { transform:`translate(${dx}px,-${120+Math.random()*120}px) scale(2.2)`, opacity:0 }], { duration:sl, easing:'ease-out' });
        sa.onfinish=()=>s.remove(); setTimeout(()=>s.remove(), sl+200);
      }, life*0.6);
    }
    setTimeout(emit, step);
  };
  emit();
}
function strikeFx(key){ spawnFxNamed(key, Object.assign({}, HITFX[key]||{})); for(const se of [].concat((HITFX[key]||{}).se||[])) SFX.play(asset(se), sfxGain(se)); }   // se 可為陣列（ver -2689）
export function showHitFx(kind){
  if(isAirBio(curCard())) return;   // dragon rule 的空戰生物不演受擊特效（ver -2502，Ray；音效另外找，照舊在 combat）
  { const a=actFxLive(kind); if(a){ actFx=null; if(a.key==='sonic' || (HITFX[a.key]||{}).base==='sonic') sonicHit(a.im); else spawnFxNamed(a.key, Object.assign({}, HITFX[a.key]||{})); rotVoice('assaultVoice'); return; } }
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
    case 'claw':  if(fx.sets) clawSets(fx); else triggerClaw(fx.count||3, true, fx); break;
    case 'blood': spawnBlood(true); break;
    case 'bite':  spawnBite(); break;
    case 'bullet':spawnBullets(fx.count||1, fx.pos==='random', fx.scale); break;
    case 'sonic': sonicHit(lastActIm); break;
    case 'dust':  spawnGroundDust(); break;
    case 'none':  break;   // 只要音效、不要受擊圖（ver -2686，肋籠獸噴火：畫面交給 spawnFlame）   // 地面揚塵（ver -2681，鐵衣苦修者錘砸）   // 聲波（ver -2655）：從剛出手的那一隻身上擴出
    case 'slash': spawnSlash(fx); break;
    /* 鈍器受擊（ver -375）：不見血的悶擊 —— 一圈迅速擴散的衝擊環＋畫面一沉。
       ⚠ 與 `bullet`（玻璃碎裂）刻意不同：那一隻獵人是拿槍托招呼你，不是開槍。 */
    case 'blunt': spawnBlunt(fx.scale); break;
    /* 迎面衝擊模糊（ver -2846，Ray：地下聖徒「拳頭受擊用 impact 效果 透明那個」→ 選了龍吟那一個）：
       沒有受擊圖，整個鏡頭被撞一下。走 combat 擁有的 `roarBlast`（鐵律 8，同咆哮音波／龍吟）。 */
    case 'blast': if(api.roarBlast) api.roarBlast(); break;
    case 'sakura':spawnSakura(); break;
    /* 米夏的大絕（ver -1957）：殘影脈動彈出＋最後一斬。 */
    case 'afterimage': spawnAfterimage(fx); break;
    /* 王座徘徊者的放光（ver -1351）。⚠ **冷卻中就退回三爪**（ver -1666）：
       那一發照樣打中、照樣扣血，只是不再放光 —— 打中卻什麼都不演比放光太多還糟。 */
    case 'holyburst': if(!spawnHolyBurst(fx)) triggerClaw(); break;
    /* 光波（ver -2759 心魘）：紫黑之爪那一道放光，換色＋換起點；`plunder`＝打中時從盤面抽掉一個數字（ver -2763） */
    case 'wave':  spawnVioletFlash(fx); if(fx.plunder && api.plunderCell) setTimeout(()=>api.plunderCell(), 250); break;
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
/* ══ 敵回血特效（ver -2696，Ray：「敵回血要有 rpg 那樣的補血特效」）══
   RPG 的治癒術：敵人腳下升起一道綠色光柱、一圈光環往外擴，十幾顆綠白光點（十字與圓點）從身上往上飄散。
   掛在 #top（只在上半），每一顆自己收；combat 的回血（healEnemyPct／healOnFault）都叫這一支（鐵律 8）。 */
export function spawnHealFx(){
  const host=$('top'); if(!host) return;
  const hr=host.getBoundingClientRect(); const src=(clipEl && clipEl.style.visibility!=='hidden' && clipEl.isConnected ? clipEl : null) || idleEl || $('enemyImg');
  const r=src && src.getBoundingClientRect && src.getBoundingClientRect();
  const cx=r && r.width ? r.left-hr.left+r.width/2 : hr.width/2, top=r && r.height ? Math.max(0,r.top-hr.top) : hr.height*0.1, bot=r && r.height ? Math.min(hr.height, r.bottom-hr.top) : hr.height*0.95;
  const w=Math.min(hr.width*0.7, (r && r.width ? r.width*0.75 : hr.width*0.5));
  const col=document.createElement('i'); col.className='fx-heal-col'; col.style.cssText=`left:${cx-w/2}px;top:${top}px;width:${w}px;height:${bot-top}px;`; host.appendChild(col);
  const ca=col.animate([{opacity:0,transform:'scaleY(.2)'},{opacity:1,transform:'scaleY(1)',offset:.25},{opacity:.85,offset:.6},{opacity:0,transform:'scaleY(1.05)'}],{duration:1100,easing:'ease-out'}); ca.onfinish=()=>col.remove(); setTimeout(()=>col.remove(),1300);
  const ring=document.createElement('i'); ring.className='fx-heal-ring'; const rw=w*1.1; ring.style.cssText=`left:${cx-rw/2}px;top:${bot-rw*0.18}px;width:${rw}px;height:${rw*0.36}px;`; host.appendChild(ring);
  const ra=ring.animate([{opacity:.95,transform:'scale(.3)'},{opacity:0,transform:'scale(1.4)'}],{duration:900,easing:'cubic-bezier(.2,.6,.4,1)'}); ra.onfinish=()=>ring.remove(); setTimeout(()=>ring.remove(),1100);
  for(let k=0;k<16;k++){
    const p=document.createElement('i'); p.className='fx-heal-p'+(k%3===0?' x':''); const sz=k%3===0 ? 16+Math.random()*10 : 6+Math.random()*7;
    const x=cx+(Math.random()*2-1)*w*0.45, y=bot-(bot-top)*(0.05+Math.random()*0.55);
    p.style.cssText=`left:${x-sz/2}px;top:${y-sz/2}px;width:${sz}px;height:${sz}px;`; host.appendChild(p);
    const life=900+Math.random()*700, rise=(bot-top)*(0.35+Math.random()*0.35), dl=Math.random()*350;
    const a=p.animate([{opacity:0,transform:'translateY(0) scale(.4)'},{opacity:1,transform:`translateY(${-rise*0.3}px) scale(1)`,offset:.25},{opacity:0,transform:`translateY(${-rise}px) scale(.7)`}],{duration:life,delay:dl,easing:'ease-out',fill:'both'});
    a.onfinish=()=>p.remove(); setTimeout(()=>p.remove(),life+dl+200);
  }
}
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
export function spawnSlash(fx){
  const d=document.createElement('div');
  d.className='fx fx-slash';
  /* `deg`（HITFX 可帶，ver -2824，Ray：「A的刀痕要跟動畫一致」）＝固定斜角、只抖幾度；沒帶＝照舊隨機 ±(20~55)°。 */
  const deg=(fx && fx.deg!=null) ? fx.deg+(Math.random()*8-4) : (Math.random()<0.5?-1:1)*(20+Math.random()*35);
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
/* 多組爪痕（HITFX 的 `sets`，ver -2772，Ray：心魘「爪痕不是單爪 要配合動畫角度」）：
   每一組＝一張三爪圖，擺在敵人畫面上的 `at:[u,v]`（比例座標，以敵人實際畫出來的框為準）、寬 `w`（框寬的比例）、
   轉 `angle` 度（順時針為正）、`flip` 左右翻（原圖是左下→右上，翻了是左上→右下）。每組錯開 `gap` 毫秒，自己收。 */
function clawSets(fx){
  const top=$('top'); if(!top) return;
  const tr=top.getBoundingClientRect(), el0=idleEl || clipEl || $('enemyImg');
  let R={L:0,T:0,W:tr.width,H:tr.height}; if(el0){ const r=drawnRect(el0, tr); if(r.W>4) R=r; }
  fx.sets.forEach((st,k)=>setTimeout(()=>{
    const w=R.W*(st.w||0.4), x=R.L+R.W*st.at[0], y=R.T+R.H*st.at[1];
    const e=document.createElement('div'); e.className='claw-set';
    e.style.cssText=`left:${x-w/2}px;top:${y-w/2}px;width:${w}px;height:${w}px;transform:rotate(${st.angle||0}deg)${st.flip?' scaleX(-1)':''};`;
    top.appendChild(e); setTimeout(()=>e.remove(), 600);
  }, k*(fx.gap||40)));
}
export function triggerClaw(count, randomAngle, fx){
  const claw=$('claw'), sc=(fx && fx.scale>0) ? fx.scale : 1;
  /* `scale`／`drawMs`（HITFX 的欄位，ver -2669，Ray：「爪痕大一點 要跟揮爪速度一樣」）：
     scale＝整張放大；drawMs＝爪痕由左往右「劃出來」花多久（照那一隻揮爪的格數換算），沒寫＝舊的一閃即現。 */
  /* `angle`／`flip`（ver -2669，Ray：「跟揮爪角度一樣才對」）：寫了就照那一隻的揮爪方向擺，不再隨機。
     原圖的三道是「左下→右上」；flip＝左右翻成「左上→右下」，angle 再微調（度，順時針為正）。 */
  const fixed = fx && fx.angle!=null;
  const rot = fixed ? fx.angle : (randomAngle ? (Math.random()*60)-30 : 0);
  claw.style.transform = 'rotate('+Number(rot).toFixed(1)+'deg)' + (sc!==1 || (fx && fx.flip) ? ' scale('+((fx && fx.flip) ? -sc : sc)+','+sc+')' : '');
  claw.classList.toggle('flip', !!(fx && fx.flip));
  claw.style.setProperty('--claw-draw', (fx && fx.drawMs>0 ? fx.drawMs : 0)+'ms');
  claw.classList.toggle('draw', !!(fx && fx.drawMs>0));
  claw.classList.toggle('one', count===1);   // 單爪（`HITFX.claw1`，ver -2652）：換 ef_claw1（從 ef_claws 裁出中間那一道）；其餘照舊三爪圖
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
const KNIFE_MS = 90;     // 索菈娜飛刀（ver -2822，Ray：「飛刀要再快一點」；共鬥那把照舊 DAGGER_MS）
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
      { transform:'translate('+sx+'px,'+sy+'px) rotate('+(rot+wob)+'deg) scale('+s0+')', opacity:0.85 },
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
             for(const im of g.querySelectorAll('.eg-guard,.eg-cover')){ im.style.objectPosition=eImg.style.objectPosition; im.style.objectFit=eImg.style.objectFit; if(im.classList.contains('eg-guard')){ syncMemberFit(im); placeMember(im); } }
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
  return idleDirOf(ENEMY_IDLE[imgStem(en)]);
}
/* 待機表的值可以是**陣列**（ver -2859，空賊船 4／5 號 Ray：「兩版都要」）＝每次登場隨機抽一版。讀 ENEMY_IDLE 一律過這一支（鐵律 8）。 */
export function idleDirOf(v){ return Array.isArray(v) ? (v.length ? v[(Math.random()*v.length)|0] : null) : (v || null); }
function startCardIdle(en){ applyFar(en); if(portraitOverride) return; const d=idleDirFor(en); if(d) startIdleLoop(d); preloadActionClips(en); preloadDodge(en); }
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
  if(kind==='miss'){ if(ENEMY_MISS[s]) return ENEMY_MISS[s]; const d=ENEMY_DELAY[s]; return (d && !d.noMiss) ? d : null; }   // 延時片寫 noMiss＝點錯不借它（只扣秒，ver -2801）
  if(kind==='enter') return ENEMY_ENTER[s] || null;
  if(kind==='hurt') return ENEMY_HURT[s] || null;   // 受擊（ver -2895）
  if(kind==='down') return ENEMY_DOWN[s] || null;   // 倒地（ver -2858）   // 點錯：有 M 用 M，沒有就借延時那一支（ver -2524）
  return ((kind==='atk'?ENEMY_ATK:ENEMY_DELAY)[s])||null; }
function preloadActionClips(en){ for(const k of ['atk','delay','miss','enter','down','hurt']){ const c=clipFor(k,en); if(c && c.dir) loadClip(c.dir); if(c && c.sweep) loadClip(c.sweep); if(c && c.sweepImg) (new Image()).src=c.sweepImg; } }
function preloadDodge(en){ const S=dodgeSpec(en); if(!S) return; for(const seg of [...Object.values(S.dodge||{}), S.parry]) if(seg){ loadClip(seg.out); if(seg.back) loadClip(seg.back); } }   // sweep＝A 本體（準備動作之後那一支，-2550）
/* 這隻怪有沒有 M（點錯）動作：點錯播的是延時那一支（ENEMY_DELAY），有它就算有 M（ver -2523）。 */
/* ══ 只有一支攻擊動畫的怪：延時／點錯一律照攻擊的受擊特效與音效（ver -2678，Ray：「蠕蟲全攻擊受擊跟音效都一樣」「都要一樣」「只有單一攻擊動畫的怪一體適用」）══
   單隻：有 ENEMY_ATK、沒有延時片（點錯沒有自己的片時借的也是延時片）⇒ combat 的 fxKind 把 delay／wrong 讀成 assault（判定只有這一支）。
   群戰：那一隻拿攻擊片代演 D／M 時，memberActOnce 記的 actFx 用牠攻擊那一套（片上 hitFx，沒寫就是群戰卡的 assault）。 */
export function singleAttackAnim(){ return !groupCard && !!clipFor('atk') && !clipFor('delay'); }
function cardAssaultKey(){ const h=groupCard && groupCard.hitFx && groupCard.hitFx.assault; return typeof h==='string' ? h : (h && h.type) || null; }
export function hasMissClip(){ return groupCard ? groupHas('miss') : (!!clipFor('miss') || !!(curCard()||{}).featherBlock); }   // 羽蛇的 M＝羽毛封窗（程式特效，沒有動檔，ver -2792）
export function hasActionClips(){ return groupCard ? (groupHas('atk') || groupHas('delay')) : !!(clipFor('atk') || clipFor('delay')); }   // 這隻怪有攻擊／延時動畫嗎（ver -2496）
let clipT=0, clipEl=null, downFor=null;   // downFor：這一隻的倒地片已經播了（purgeEnemy 冪等用）
/* 平時站遠（ENEMY_ATK 的 `far`，ver -2473）：用 CSS 的獨立 `scale` 屬性縮 —— 不碰 transform，受擊動畫照常疊上去。
   立繪本體、待機層、攻擊層三個都套（誰在畫面上就是誰）。 */
const FAR_ORIGIN='50% 78%';
function farOf(en){ en=en||curCard(); const c=clipFor('atk',en); return (c && c.far) || 1; }
function applyFar(en){ const k=farOf(en); for(const el of [$('enemyImg'), idleEl, clipEl]) if(el){ el.style.transformOrigin=FAR_ORIGIN; el.style.scale = k===1 ? '' : String(k); } }
/* 演一次；回傳「還要幾毫秒才打到玩家」（扣血延到那一格），沒演就回 0。 */
export function playActionClip(kind, onDone, opts){   // opts.hold：播完停在最後一格、不回待機（交給 onDone 收，ver -2546 蜈蚣的 A 準備動作）
  if(groupCard && groupCard.group && (kind==='delay' || kind==='miss')) return groupAction(kind);   // 群戰：逐人的 D／M（ver -2623）
  const c=clipFor(kind), L=c && clipCache[c.dir]; if(!L || !L.fr) return 0;
  if(dodgePlaying==='parry') return 0;   // 格擋播完之前不切別的動畫（傷害照常、不演）
  if(dodgePlaying||dodgeCur) resetShift(); dodgeCur=null; dodgeBusy=false; dodgePend=null; dodgePlaying=null;   // 攻擊片接手：閃避狀態作廢（從待機重新起）
  const eImg=$('enemyImg'), r=canvasBoxInTop(eImg, L.j); if(!r) return 0;
  clearTimeout(clipT); clearInterval(idleT); idleT=0;
  let el=idleEl; if(!el){ if(!clipEl){ clipEl=document.createElement('img'); clipEl.className='en-idle'; clipEl.alt=''; eImg.after(clipEl); } el=clipEl; }
  eImg.style.visibility='hidden';
  el.style.left=r.left+'px'; el.style.top=r.top+'px'; el.style.width=r.width+'px'; el.style.height=r.height+'px';
  let i=0; el.src=L.fr[0].src; if(el===clipEl) applyFar();
  const fps=L.j.fps||24, N=L.fr.length;
  const hitF=Math.min(N-1, (c.strikes && c.strikes.length) ? Math.max(...c.strikes) : (c.hit!=null) ? c.hit : Math.floor(N*0.4));   // `strikes` 的最後一下＝扣血（同群戰成員，ver -2663）
  /* 收回加速（`retMul`，-2486 Ray「撲咬收回再快一點」）：打到那一格之後的格子以 fps×retMul 播 */
  /* 前撲加速（`preMul`，-2512 Ray「收回加速 前撲也加速」）：打到那一格之前（含）以 fps×preMul 播 */
  const rm=c.retMul||1, pm=c.preMul||1, tAt=f=> f<=hitF ? f*1000/(fps*pm) : (hitF*1000/(fps*pm) + (f-hitF)*1000/(fps*rm));
  const T=tAt(N), tHit=tAt(hitF);
  { const k=farOf(); if(k!==1 || c.near){   // 攻擊時撲近：打到那一格到最大，收回的路上退回遠處（ver -2529：平時不站遠也能撲近）；ver -2846：任何一支寫了 `near` 的動作片都吃（地下聖徒的 D／M 揮拳）
      el.style.transformOrigin=FAR_ORIGIN;
      const off=t=>Math.max(0,Math.min(1,t/T)), hold=Math.min(T, tHit+(c.nearHold>0?c.nearHold:60)),   /* `nearHold`＝撲到最近停多久（ms，預設 60；ver -2915） */ back=Math.min(T, c.nearOut>0 ? hold+c.nearOut : tHit+Math.max(120,(T-tHit)*0.7));   // `nearOut`＝打到停留之後幾毫秒退回原位（ver -2846，Ray：「位移不要太多幀」）；不寫＝照舊跟著收回段慢慢退
      const n=String(c.near || 1), kf = (kind==='atk' || c.near) ? [{scale:String(k),offset:0}, ...(c.nearIn>0 && tHit>c.nearIn ? [{scale:String(k),offset:off(tHit-c.nearIn)}] : []), {scale:n,offset:off(tHit)},{scale:n,offset:off(hold)},{scale:String(k),offset:off(back)},{scale:String(k),offset:1}] : [{scale:String(k)},{scale:String(k)}];
      el.animate(kf.map(q=>({...q, easing: c.nearSteps>0 ? `steps(${c.nearSteps},end)` : 'ease-in-out'})),{duration:T}); } }   /* `nearSteps`＝位移每一段只跳這幾格（ver -2913，Ray：「位移少幀」——像手繪抽格，不平滑補間） */   /* ease 逐段套，峰值才準準落在 hit 那一格（-2485） */
  const t0=performance.now();
  windupSe(c.windupSe, c.windupMs, ()=>clipT || i<N, c.windupFit);
  stepSes(c, fps, ()=>!!clipT);
  if(c.retractSe && c.retractAt!=null) windupSe(c.retractSe, c.retractAt*1000/fps, ()=>clipT && i<N);   // 單隻：收回音（ver -2720）
  const fxAt=new Map((c.fx||[]).map(f=>[f.frame, f]));   // 動作段的程式特效（ver -2524：光翼下拍噴瓦礫）
  const step=()=>{ i++;
    if(fxAt.has(i)) clipFx(fxAt.get(i), el);
    if(c.flame && i===c.flame.from) spawnFlame(el, c.flame, fps, ()=>!!clipT);
    if(c.hitFx && c.strikes && i<hitF && c.strikes.indexOf(i)>=0) strikeFx(c.hitFx);   // 前面幾下各補一道特效＋音效（單隻也跟著片子的打擊節奏，ver -2663）
    if(i<N){ el.src=L.fr[i].src; clipT=setTimeout(step, Math.max(0, t0+tAt(i+1)-performance.now())); return; }
    clipT=0;
    if(opts && opts.hold){ if(onDone) onDone(el); return; }
    if(idleEl && idleFr){ placeIdle(); runIdle(); }                 // 回待機 loop
    else { if(clipEl){ clipEl.remove(); clipEl=null; } eImg.style.visibility=''; }
    if(onDone) onDone();
  };
  clipT=setTimeout(step, tAt(1));
  return Math.round(tHit);
}
/* 受擊（ver -2895）：玩家的傷害真的扣到血時由 combat.enemyDamage 叫（唯一入口）。
   有任何動作片在播（clipT：攻擊／延時／點錯／登場／受擊自己）就不演 —— 受擊不打斷別人、也不重播；
   攻擊片接手時 playActionClip 自己會蓋掉受擊。閃避型（索菈娜）有自己那一套，不吃。 */
export function playHurt(){ if(clipT || state.enemyHp<=0 || dodgeSpec() || !clipFor('hurt')) return; playActionClip('hurt'); }
/* ══ 閃避／格擋（ver -2805，Ray 11-19 索菈娜：「閃避圖是玩家開槍時播放 打中時則是用刀防禦」
   「如果玩家沒有持續攻擊就歸位 有持續攻擊就換另一個閃避動作」）══
   表在 config.ENEMY_DODGE（鑰匙＝立繪檔名）：每個動作兩段 out（站姿→過渡格→姿勢，停在姿勢）＋ back（姿勢→站姿）。
   · 閃出播完立刻接：途中有開槍 → 下一個閃避，沒有 → 歸位（ver -2806 取消停留）。
   · 還停在某個閃避姿勢時又開槍 → 換另一個閃避，從它的過渡格（`chainFrom`，跳過開頭的站姿格）直接接上，不先歸位。
   · 攻擊／延時片接手時（playActionClip）整個狀態作廢。 */
let dodgeCur=null, dodgeBusy=false, dodgePlaying=null;
function dodgeSpec(en){ en=en||curCard(); return (en && !en.group) ? (ENEMY_DODGE[imgStem(en)]||null) : null; }
function playDodgeDir(dir, from, hold, onDone, shift){   // shift：這一段播完時人要在的橫向位移（#top 寬的比例；左負右正，0＝回原位）
  const L=clipCache[dir]; if(!L || !L.fr) return false;
  const eImg=$('enemyImg'), r=canvasBoxInTop(eImg, L.j); if(!r) return false;
  clearTimeout(clipT); clearInterval(idleT); idleT=0;
  let el=idleEl; if(!el){ if(!clipEl){ clipEl=document.createElement('img'); clipEl.className='en-idle'; clipEl.alt=''; eImg.after(clipEl); } el=clipEl; }
  eImg.style.visibility='hidden';
  el.style.left=r.left+'px'; el.style.top=r.top+'px'; el.style.width=r.width+'px'; el.style.height=r.height+'px';
  const N=L.fr.length, dt=1000/(L.j.fps||24); let i=Math.min(from|0, N-1); el.src=L.fr[i].src; if(el===clipEl) applyFar();
  if(shift && typeof shift==='object'){   // 一段到底的左右閃（ver -2812）：第 peak 格滑到最遠、播完回原位
    const top=$('top'), px=(top ? top.clientWidth : 0)*shift.to, n=Math.max(1,N-i), pk=Math.max(1,Math.min(n-1,(shift.peak|0)-i));
    el.style.transition=''; el.style.translate='';
    el.animate([{translate:'0px 0px'},{translate:px.toFixed(1)+'px 0px',offset:pk/n,easing:'ease-in-out'},{translate:'0px 0px'}],{duration:n*dt,easing:'linear'});
  } else if(shift!=null){   // 左右閃的位移（ver -2811，Ray：「左右閃要有位移」）：整段播放期間平滑滑到目標位置
    const top=$('top'), px=(top ? top.clientWidth : 0)*shift, dur=Math.max(1,(N-i))*dt;
    el.style.transition='translate '+Math.round(dur)+'ms cubic-bezier(.2,.8,.3,1)'; el.style.translate=px.toFixed(1)+'px 0'; }
  dodgeBusy=true;
  const step=()=>{ i++;
    if(i<N){ el.src=L.fr[i].src; clipT=setTimeout(step, dt); return; }
    clipT=0; dodgeBusy=false;
    if(!hold){ if(idleEl && idleFr){ placeIdle(); runIdle(); } else { if(clipEl){ clipEl.remove(); clipEl=null; } eImg.style.visibility=''; } }
    if(onDone) onDone(); };
  clipT=setTimeout(step, dt);
  return true;
}
/* ver -2806（Ray：「閃完不要停 立刻歸位或換下一個動作」）：閃出播完**不停在姿勢**——
   閃出途中又開了槍 → 立刻接下一個閃避（從它的過渡格接）；沒有 → 立刻播歸位。 */
let dodgePend=null;
function dodgeNext(S){
  const k=dodgePend; dodgePend=null;
  if(k){ if(startEvade(S, k)) return; }
  const seg=dodgeCur==='parry' ? S.parry : (S.dodge||{})[dodgeCur]; dodgeCur=null;
  if(seg && seg.back) playDodgeDir(seg.back, 0, false, ()=>{ if(dodgePend){ const k=dodgePend; dodgePend=null; startEvade(S, k); } }, 0);   // 歸位途中又開槍：歸位播完立刻再閃
  else { idleBack(); resetShift(); }   // 這個動作沒有 back（一段到底，例：格擋 v2）：直接回待機
}
function resetShift(){ for(const e of [idleEl, clipEl]) if(e){ e.style.transition='translate 200ms ease-out'; e.style.translate=''; } }
function idleBack(){ const eImg=$('enemyImg'); if(idleEl && idleFr){ placeIdle(); runIdle(); } else { if(clipEl){ clipEl.remove(); clipEl=null; } if(eImg) eImg.style.visibility=''; } }
function startEvade(S, kind){
  let key, seg;
  if(kind==='parry'){ key='parry'; seg=S.parry; }
  else { const ks=Object.keys(S.dodge||{}).filter(k=>k!==dodgeCur); if(!ks.length) return false; key=ks[(Math.random()*ks.length)|0]; seg=S.dodge[key]; }
  if(!seg) return false;
  dodgePlaying=key;
  const ok=playDodgeDir(seg.out, dodgeCur ? (seg.chainFrom!=null ? seg.chainFrom : (S.chainFrom||3)) : 0, true, ()=>{ dodgePlaying=null; dodgeCur=key; dodgeNext(S); }, (seg.shift && !seg.back) ? { to:seg.shift, peak:seg.shiftPeak||1 } : (seg.shift||0));
  if(!ok) dodgePlaying=null;
  else if(key==='parry'){ const se=asset(S.parrySe||'se_bulletguard'); if(se) SFX.play(se, sfxGain(S.parrySe||'se_bulletguard')); }   // 格擋音＝米夏的劈落音（ver -2827，Ray：「防禦用米夏的劈落音」）
  return ok;
}
/* 這隻怪有沒有閃避／格擋表（combat 用來決定「被擋下的那一發」演閃避而不是刀光）。 */
export function hasEvade(){ return !!dodgeSpec(); }
/* 格擋正在播嗎（ver -2810，Ray：「格擋動畫要播完期間不觸發其他動畫且攻擊有效」）——combat 讀它讓這段期間每一發都有效。 */
export function parryPlaying(){ return dodgePlaying==='parry'; }
/* kind：'dodge'（三種閃避擇一，不重複上一個）／'parry'（格擋）。回傳有沒有演。 */
export function enemyEvade(kind){
  const S=dodgeSpec(); if(!S || state.over) return false;
  if(dodgePlaying==='parry') return false;                       // 格擋播完之前不觸發任何其他動畫（ver -2810）
  if(dodgeBusy){ dodgePend=kind; return false; }                 // 閃出／歸位途中：記一筆，播完立刻接
  if(clipT) return false;                                        // 攻擊／延時片正在播：不搶
  dodgeCur=null; dodgePend=null;
  return startEvade(S, kind);
}
/* 飛刀（ver -2820，Ray：「飛刀用共鬥的那個效果」）：同索菈娜共鬥的那把（`vfx_dagger`＋`.dagger-fly`，screen 混合），
   從這一格的手朝鏡頭擲出 n 把 —— 由小變大、扇形散開，命中點閃一圈 `.dagger-hit`（同共鬥）。座標一律換成視窗座標（.dagger-fly 是 fixed）。 */
function spawnKnives(o, n){
  const top=$('top'); if(!top) return; const tr=top.getBoundingClientRect();
  const x0=tr.left+(o ? o.x : tr.width*0.7), y0=tr.top+(o ? o.y : tr.height*0.2);
  try{ SFX.play(asset('se_soranacounter'), sfxGain('se_soranacounter')); }catch(_){}   // 音效同共鬥那版（ver -2825，Ray）：擲出一聲、每把命中各一聲
  for(let k=0;k<n;k++){
    const spread=k-(n-1)/2, x1=tr.left+tr.width*(0.5+spread*0.34), y1=y0+tr.height*(0.03+Math.abs(spread)*0.02);   // 平飛（ver -2823，Ray：「角度還是太低 要平飛」）：落點與出手同高   // 朝 viewer 飛來（ver -2822，Ray：「刀要往viewer飛來 不是往地上掉」）：落點在畫面中段、由小變大
    const rot=Math.atan2(y1-y0, x1-x0)*180/Math.PI-90, wob=Math.random()*16-8;
    const el=document.createElement('img'); el.src=asset('vfx_dagger'); el.className='dagger-fly'; el.alt='';
    document.body.appendChild(el);
    const dur=KNIFE_MS, delay=k*35, s0=(0.3+Math.random()*0.1).toFixed(2), scl=(2.2+Math.random()*0.6).toFixed(2);   // 直線等速一閃；起手小、到眼前放大＝朝鏡頭飛來
    try{ el.animate([
      { transform:'translate('+x0+'px,'+y0+'px) rotate('+(rot+wob)+'deg) scale('+s0+')', opacity:0.85 },
      { transform:'translate('+x1+'px,'+y1+'px) rotate('+(rot+wob*0.25)+'deg) scale('+scl+')', opacity:1 },
    ], { duration:dur, delay, easing:'linear', fill:'both' }); }catch(_){}
    setTimeout(()=>{ if(el.parentNode) el.remove();
      try{ SFX.play(asset('se_soranacounterhit'), sfxGain('se_soranacounterhit')); }catch(_){}
      const hit=document.createElement('div'); hit.className='dagger-hit'; hit.style.left=x1+'px'; hit.style.top=y1+'px';
      document.body.appendChild(hit); setTimeout(()=>{ if(hit.parentNode) hit.remove(); }, 320); }, dur+delay);
  }
}
/* 裹屍布（ver -2917，Ray：裹屍寡婦「攻擊會在數字盤蒙上一條裹屍布 角度隨機 遮住數字 伸手時向 VIEWER 射出布 布讓 GPT 出」）：
   從手（`o`）射出一條布、由小變大朝鏡頭飛到數字盤上，落成一條隨機角度的布蓋住幾個數字。
   布掛在 #grid 裡：換盤（buildGrid 的 innerHTML=''）自然清掉；pointer-events:none ＝ 只遮視線、點擊照樣穿過去。 */
function spawnShroud(o){
  const top=$('top'), grid=$('grid'); if(!top || !grid) return;
  const tr=top.getBoundingClientRect(), gr=grid.getBoundingClientRect(); if(!gr.width) return;
  const x0=tr.left+(o ? o.x : tr.width*0.5), y0=tr.top+(o ? o.y : tr.height*0.45);
  const ang=Math.random()*140-70, cx=gr.left+gr.width*(0.25+Math.random()*0.5), cy=gr.top+gr.height*(0.25+Math.random()*0.5);
  const w=gr.width*1.35, h=w*303/1529, src=asset('vfx_shroud_strip');
  const fly=document.createElement('img'); fly.src=src; fly.alt=''; fly.className='shroud-fly';
  fly.style.cssText=`position:fixed;left:0;top:0;width:${w}px;height:${h}px;pointer-events:none;z-index:60;`;
  document.body.appendChild(fly);
  const T=(x,y,r,s)=>`translate(${x-w/2}px,${y-h/2}px) rotate(${r}deg) scale(${s})`;
  try{ fly.animate([{transform:T(x0,y0,ang*0.3,0.15),opacity:0.9},{transform:T(cx,cy,ang,1.25),opacity:1,offset:0.8},{transform:T(cx,cy,ang,1),opacity:1}],
    {duration:300, easing:'ease-in', fill:'both'}); }catch(_){}
  setTimeout(()=>{ fly.remove(); if(!grid.isConnected) return;
    const g2=grid.getBoundingClientRect(), s=document.createElement('img'); s.src=src; s.alt=''; s.className='shroud-strip';
    s.style.cssText=`position:absolute;left:${cx-g2.left-w/2}px;top:${cy-g2.top-h/2}px;width:${w}px;height:${h}px;transform:rotate(${ang}deg);pointer-events:none;z-index:5;`;
    grid.appendChild(s); }, 300);
}
/* 散骨（ver -2917，Ray 骷髏塚：「攻擊時是散骨高速飛向 VIEWER」；素材＝GPT 同畫風 17 個骨頭 vfx_bone_00～16）：
   從身上（`o`）噴出 n 個，邊轉邊由小變大、朝四周散開飛出畫面 —— 讀起來是朝鏡頭砸過來。 */
function spawnBones(o, n){
  const top=$('top'); if(!top) return; const tr=top.getBoundingClientRect(), vw=innerWidth, vh=innerHeight;
  const x0=tr.left+(o ? o.x : tr.width*0.5), y0=tr.top+(o ? o.y : tr.height*0.45);
  const pool=[...Array(17).keys()].sort(()=>Math.random()-0.5);
  for(let k=0;k<n;k++){
    const a=Math.random()*Math.PI*2, R=Math.hypot(vw,vh)*(0.55+Math.random()*0.25);
    const x1=x0+Math.cos(a)*R, y1=y0+Math.sin(a)*R*0.8, sz=tr.width*(0.16+Math.random()*0.08);
    const el=document.createElement('img'); el.src=asset('vfx_bone_'+String(pool[k%17]).padStart(2,'0')); el.alt='';
    el.style.cssText=`position:fixed;left:0;top:0;width:${sz}px;height:auto;pointer-events:none;z-index:60;`;
    document.body.appendChild(el);
    const r0=Math.random()*360, r1=r0+(Math.random()<0.5?-1:1)*(360+Math.random()*360), dur=240+Math.random()*90, delay=k*12;   /* -2918 Ray：「骨飛快一點」 */
    try{ el.animate([{transform:`translate(${x0-sz/2}px,${y0-sz/2}px) rotate(${r0}deg) scale(0.25)`,opacity:1},
                     {transform:`translate(${x1-sz/2}px,${y1-sz/2}px) rotate(${r1}deg) scale(${(2.4+Math.random()*1.2).toFixed(2)})`,opacity:1}],
                    {duration:dur, delay, easing:'cubic-bezier(.5,0,1,1)', fill:'both'}); }catch(_){}
    setTimeout(()=>el.remove(), dur+delay+30);
  }
}
/* ══ 動作段掛的程式特效（ver -2524）══ `fx:[{frame,type}]`，播到那一格觸發。
   · `rubble` ＝ 瓦礫噴襲（Ray：「振翅下拍到底，碎石從瓦礫堆往鏡頭噴」）：畫面下方中央（瓦礫堆）噴出一把碎石，
     由小變大、往四周散開飛出畫面 —— 讀起來是朝鏡頭砸過來。一張 canvas，約 0.9 秒拆掉。 */
function clipFx(f, el){
  if(!f) return;
  if(f.se) SFX.play(asset(f.se), sfxGain(f.se));   // 這一格順手放一支音效（ver -2700，巨像飛石：石塊音）
  /* `at:[u,v]`＝噴口在這一格畫面上的比例座標（ver -2700，巨像正拳：飛石從拳頭朝鏡頭飛來）；沒寫＝畫面下方中央的瓦礫堆（-2524 原行為） */
  if(f.type==='rubble'){ let o=null;
    if(f.at && el){ const top=$('top'), hr=top && top.getBoundingClientRect(), r=el.getBoundingClientRect();
      if(hr && r.width) o={ x:r.left-hr.left+f.at[0]*r.width, y:r.top-hr.top+f.at[1]*r.height }; }
    return spawnRubble(o, f.n, f.speed); }
  if(f.type==='violetFlash') return spawnVioletFlash();
  /* 槍口火光（ver -2854，賞金獵人：片子沒畫火光，Ray 交代程式補）：`at`＝這一格畫面上槍口的比例座標，`r`＝半徑（框寬的比例）。
     樣子沿用空賊群戰那一顆（`.eg-muzzle`，鐵律 7：火光只有一份配方）。 */
  if(f.type==='muzzle'){ const top=$('top'); if(!top || !el || !f.at) return;
    const hr=top.getBoundingClientRect(), r=el.getBoundingClientRect(); if(!r.width) return;
    const x=r.left-hr.left+f.at[0]*r.width, y=r.top-hr.top+f.at[1]*r.height, R=Math.max(18, r.width*(f.r||0.13));
    const d=document.createElement('div'); d.className='eg-muzzle';
    d.style.cssText=`left:${x-R}px;top:${y-R}px;width:${R*2}px;height:${R*2}px;z-index:6;`;
    top.appendChild(d); setTimeout(()=>d.remove(), 220); return; }
  /* 飛刀（ver -2819，Ray 索菈娜 DM：「飛刀用程式畫」）：從這一格的手（`at`）朝鏡頭擲出 n 把，由小變大、扇形散開、飛出畫面。 */
  if(f.type==='knives'){ let o=null;
    if(f.at && el){ const top=$('top'), hr=top && top.getBoundingClientRect(), r=el.getBoundingClientRect();
      if(hr && r.width) o={ x:r.left-hr.left+f.at[0]*r.width, y:r.top-hr.top+f.at[1]*r.height }; }
    return spawnKnives(o, f.n||3); }
  if(f.type==='bones'){ let o=null;   // 散骨（ver -2917）
    if(f.at && el){ const top=$('top'), hr=top && top.getBoundingClientRect(), r=el.getBoundingClientRect();
      if(hr && r.width) o={ x:r.left-hr.left+f.at[0]*r.width, y:r.top-hr.top+f.at[1]*r.height }; }
    return spawnBones(o, f.n||12); }
  if(f.type==='shroud'){ let o=null;   // 裹屍布（ver -2917）
    if(f.at && el){ const top=$('top'), hr=top && top.getBoundingClientRect(), r=el.getBoundingClientRect();
      if(hr && r.width) o={ x:r.left-hr.left+f.at[0]*r.width, y:r.top-hr.top+f.at[1]*r.height }; }
    return spawnShroud(o); }
  if(f.type==='dust'){ const n=f.n||1; for(let k=0;k<n;k++) setTimeout(spawnGroundDust, k*120); return; }   // 地面煙塵（ver -2782，Ray：「用特效加煙塵遮」攻擊接回待機那一下）
  /* 咆哮音波（ver -2784，Ray：背負祭壇者吼叫「要有音波效果，震掉所有格子不計傷」）：從嘴（`at`＝這一格畫面上的比例座標）放出一圈圈音波＋龍吟的衝擊模糊；`wipe`＝震掉整盤換下一盤（同崩岩巨像，不傷敵）。 */
  if(f.type==='roar'){ let o=null;
    if(f.at && el){ const top=$('top'), hr=top && top.getBoundingClientRect(), r=el.getBoundingClientRect();
      if(hr && r.width) o={ x:r.left-hr.left+f.at[0]*r.width, y:r.top-hr.top+f.at[1]*r.height }; }
    spawnSoundwave(o, f.n||4); if(api.roarBlast) api.roarBlast();
    if(f.wipe && api.wipeBoard) setTimeout(()=>api.wipeBoard(), 160); return; }
  if(f.type==='shake'){ if(api.screenShake) api.screenShake(); if(f.heal>0 && api.healEnemyPct) api.healEnemyPct(f.heal); if(f.wipe && api.wipeBoard) api.wipeBoard(); return; }   // wipe＝震掉整盤換下一盤（ver -2694）   // 震畫面＋（可選）敵回血 heal＝最大 HP 比例（ver -2692 崩岩巨像咆哮）
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
  tag.textContent=i18nT('▲ 下一擊威力 ×')+n;
  const pop=document.createElement('div'); pop.className='en-empower-pop'; pop.textContent=i18nT('威力提升！下一擊 ×')+n;
  top.appendChild(pop); setTimeout(()=>pop.remove(), 1500);
}
const VF_GROW_MS=1000, VF_FADE_MS=600;   // ＝ CSS #violetFlash 的 transition（兩邊互指）；ver -2526 Ray「光圈太快了」由 350/400 放慢
function spawnVioletFlash(o){   // o.tone＝色調 class（'orange'）、o.at＝起點在立繪上的比例座標（ver -2759 心魘：從心臟發出）
  const old=document.getElementById('violetFlash'); if(old) old.remove();
  /* ver -2526 Ray「不要遮到數字面板」：關在 #top（上半）裡，座標換成 #top 相對 */
  const top=$('top'); if(!top) return;
  const tr=top.getBoundingClientRect(), el0=idleEl || clipEl || $('enemyImg'), W=tr.width, H=tr.height;
  let cx=W*0.5, cy=H*0.55;
  const at=(o&&o.at)||[0.5,0.55];
  if(el0){ const R=drawnRect(el0, tr); if(R.W>4){ cx=R.L+R.W*at[0]; cy=R.T+R.H*at[1]; } }
  const d=Math.max(90, Math.min(W,H)*0.22), need=2*Math.hypot(Math.max(cx,W-cx), Math.max(cy,H-cy));
  const el=document.createElement('div'); el.id='violetFlash'; el.innerHTML='<div class="vf-glow"></div>';
  if(o && o.tone) el.classList.add(o.tone);
  el.style.left=cx+'px'; el.style.top=cy+'px'; el.style.width=d+'px'; el.style.height=d+'px';
  el.style.setProperty('--vf-scale', (need/d/0.30).toFixed(2));
  top.appendChild(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('grow')));
  setTimeout(()=>el.classList.add('fade'), VF_GROW_MS);
  setTimeout(()=>{ if(el.parentNode) el.remove(); }, VF_GROW_MS+VF_FADE_MS+50);
}
/* ══ 地面揚塵（HITFX base 'dust'，ver -2681，Ray：「受擊效果是地面揚塵」）══
   沿敵人區底緣揚起一叢土灰（樣子借劇情揚煙那一顆 `.dustpuff`，同一份漸層與動畫）。每一顆自己收。 */
function spawnSoundwave(o, n){
  const top=$('top'); if(!top) return;
  const x=o?o.x:top.clientWidth*0.5, y=o?o.y:top.clientHeight*0.3;
  for(let i=0;i<n;i++){
    const el=document.createElement('i'); el.className='soundwave';
    el.style.left=x+'px'; el.style.top=y+'px'; el.style.animationDelay=(i*110)+'ms';
    top.appendChild(el); setTimeout(()=>el.remove(), 1000+i*110);
  }
}
function spawnGroundDust(){
  const host=hitLayer(); if(!host) return;
  for(let i=0;i<14;i++){
    const el=document.createElement('i'); el.className='dustpuff';
    el.style.setProperty('--x',  (18 + Math.random()*64).toFixed(1)+'%');
    el.style.setProperty('--sz', (70 + Math.random()*130).toFixed(0)+'px');
    el.style.setProperty('--dx', (Math.random()*120-60).toFixed(0)+'px');
    el.style.setProperty('--dy', (-60 - Math.random()*140).toFixed(0)+'px');
    el.style.setProperty('--d',  (Math.random()*160).toFixed(0)+'ms');
    const t=900 + Math.random()*700; el.style.setProperty('--t', t.toFixed(0)+'ms');
    host.appendChild(el); setTimeout(()=>el.remove(), t+400);
  }
}
function spawnRubble(o, n, speed){
  const top=$('top'); if(!top) return;
  const W=top.clientWidth, H=top.clientHeight, cv=document.createElement('canvas');
  cv.width=W; cv.height=H; cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';
  top.appendChild(cv); const cx=cv.getContext('2d');
  const ox=o?o.x:W*0.5, oy=o?o.y:H*0.82, rnd=(a,b)=>a+Math.random()*(b-a), rocks=[];
  for(let i=0;i<(n||26);i++){ const ang=o ? rnd(-Math.PI,Math.PI) : rnd(-Math.PI*0.95,-Math.PI*0.05), sp=rnd(0.35,1.1);   // 有噴口＝四面散開（拳頭朝鏡頭撞來，碎石往四周炸開）
    rocks.push({ x:ox+rnd(-W*0.08,W*0.08), y:oy+rnd(-H*0.04,H*0.04), vx:Math.cos(ang)*sp*W/900, vy:Math.sin(ang)*sp*H/900,
      r:rnd(3,9)*W/390, rot:rnd(0,6.28), vr:rnd(-0.02,0.02), g:(60+Math.random()*50)|0, sides:(4+Math.random()*3)|0, d:rnd(0,80) }); }
  const t0=performance.now(), END=900;
  const tick=now=>{ const t=(now-t0)*(speed||1); cx.clearRect(0,0,W,H);   // speed＝整段加速（ver -2701，巨像飛石 Ray：「快一點」）
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
function stopIdleLoop(){ downFor=null; clearInterval(idleT); idleT=0; clearTimeout(clipT); clipT=0; if(clipEl){ clipEl.remove(); clipEl=null; } idleFr=null; if(idleEl){ idleEl.remove(); idleEl=null; }
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
/* ══ 浪花雲浪（ver -2859～-2862）已撤（ver -2863，Ray：「浪花太密 造成程式雲一直出」「浪可以有 但是不能有裁切線」）══
   改成素材端處理：空賊船 4／5 號待機的浪花底部（生成畫框切出的水平直線）只在浪花遮罩上羽化 14px，交 `…_idle_*_fade/`。
   splash.json／splash_mask.webp 留在原資料夾（動畫線的資料），程式不再讀。 */

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
    el.appendChild(im); ms.push({ im, slot:FLOCK_SLOTS[i], ph:Math.random()*6.283, dph:Math.random()*100, down:false, front:i, off:0 });
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
      /* 每一隻各自的接舷漂移（-2545）：同一條 driftAt、各自的相位（m.dph），振幅同一個淡入 */
      const dd=driftAt(t+m.dph, driftEnv(performance.now()));
      const s=m.slot[2]*dd.k, bob=Math.sin(t*1.7+m.ph)*H*0.012;
      im.style.translate=(m.slot[0]*W+dd.x*W).toFixed(1)+'px '+(m.slot[1]*H+bob+dd.y*H).toFixed(1)+'px';
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
/* ══ 空賊船的勾索（卡上 `grapple:{hp,sec,to}`，ver -2545，Ray：「空賊船 hp 50 以下會射出勾鎖，勾在數字盤上方，
   中間有程式畫的繩索連結；勾索射出後沒戰勝就進登艦戰：敵船往上飛出畫面外、敵人從鉤索滑下、閉棺再開棺、背景是甲板」）══
   這裡只管畫面：砲響＋煙、鉤子飛出去勾住、繩子每一幀從船身（跟著漂移）連到鉤子、船飛走。
   何時射、何時登艦、換卡由 combat 決定（maybeGrapple／boardShip）。
   卡上 `grapple.hookImg` 有寫就用圖（美術交件 491ab6e0），沒寫用程式畫的暫代。-2556 起不演船員滑索（Ray「人滑過來就不用了」）。 */
const GRAPPLE_FLY_MS=0;   // -2569 Ray「鉤爪射出直接出現帶煙霧，不要飛行」：0＝射出那一刻就扣在盤緣
function screenShakeLite(){ const app=$('app'); if(!app) return; app.classList.remove('hitshake'); void app.offsetWidth; app.classList.add('hitshake'); setTimeout(()=>app.classList.remove('hitshake'), 280); }   // 砲響那一下震一下（同受擊的 #app.hitshake）
/* 鉤子圖的對位（美術交件單 491ab6e0）：螢幕寬 HOOK_W；盤面上緣對在圖高 HOOK_LINE；繫繩環在圖的 HOOK_RING（寬、高比例） */
const HOOK_W=60, HOOK_LINE=0.607, HOOK_RING=[0.5, 20/265];
let grapple=null;   // { cv, raf, hook:{x,y}, t0, sec, g, puffs, fire, anims }
/* 繩子在船上的那一端（-2556 Ray「船索頭要索好船身不要跑掉」）：卡上 `grapple.anchor`＝立繪畫布上的一點（同側舷齊射砲口那一套對位），
   每一幀照 #enemyImg 現在的框換算 —— 漂移、飛走都跟著（getBoundingClientRect 含 translate／scale／WAAPI）。回傳 #app 座標。 */
function shipAnchor(g){
  const app=$('app'), top=$('top'), eImg=$('enemyImg'); if(!app || !top || !eImg) return null;
  const cv=(g && g.canvas) || [1536,1024], an=(g && g.anchor) || [cv[0]*0.33, cv[1]*0.78];
  const r=canvasBoxInTop(eImg, { canvas:cv, box:[0,0,cv[0],cv[1]] }); if(!r) return null;
  const ar=app.getBoundingClientRect(), tr=top.getBoundingClientRect(), k=r.width/cv[0];
  return { x:tr.left-ar.left+r.left+an[0]*k, y:tr.top-ar.top+r.top+an[1]*k, k };
}
export function fireGrapple(g){
  clearGrapple();
  const app=$('app'), gw=$('gridWrap')||$('grid'); if(!app || !gw) return;
  const ar=app.getBoundingClientRect(), gr=gw.getBoundingClientRect();
  const W=ar.width, H=ar.height, dpr=Math.min(2, window.devicePixelRatio||1);
  const cv=document.createElement('canvas'); cv.className='grapple-fx'; cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); app.appendChild(cv);
  const cx=cv.getContext('2d'); cx.setTransform(dpr,0,0,dpr,0,0);
  const hook={ x:gr.left-ar.left+gr.width*(0.35+Math.random()*0.3), y:gr.top-ar.top };   // 扣在數字盤上緣的那一點
  let hookImg=null; if(g && g.hookImg){ hookImg=new Image(); hookImg.src=g.hookImg; }
  const hookRing=(x,y)=>{ if(hookImg && hookImg.naturalWidth){ const h=HOOK_W*hookImg.naturalHeight/hookImg.naturalWidth; return { x:x-HOOK_W/2+HOOK_W*HOOK_RING[0], y:y-h*HOOK_LINE+h*HOOK_RING[1] }; } return { x, y:y-10 }; };
  const a0=shipAnchor(g)||{x:W*0.5,y:H*0.2,k:0.25}, rnd=(p,q)=>p+Math.random()*(q-p);
  /* 射出那一下：砲口火光＋煙往船尾拖走（-2556 Ray「登船索射出時要有砲響跟煙」；畫法同側舷齊射） */
  const hp=[]; for(let j=0;j<8;j++) hp.push({ t:j*18, vx:rnd(-0.35,0.35)*W/390, vy:rnd(-0.32,-0.06)*W/390, r0:rnd(5,9)*a0.k*3, life:rnd(600,950), g:rnd(170,215)|0 });   // 鉤子落點的煙（-2569）
  const puffs=[]; for(let j=0;j<9;j++) puffs.push({ dx:0, dy:0, t:20+j*22, vx:rnd(0.35,0.9)*W/390*(fwdOf(curCard())<0?1:-1), vy:rnd(-0.08,0.03)*W/390, r0:rnd(6,11)*a0.k*3, life:rnd(800,1300), g:rnd(150,205)|0 });
  const G={ cv, raf:0, hook, t0:performance.now(), sec:(g && g.sec)||10, from:a0, gone:null, hookImg, g, puffs, hookPuffs:hp, fire:{ x:a0.x, y:a0.y, k:a0.k } }; grapple=G;
  /* 登艦時落下的人影動畫（卡上 `shadowAnims`，-2565 美術交件：黑色剪影、衣服頭髮往上飄，4 格 12fps loop）：
     射勾索這一刻就隨機挑一支先載好（登艦在 sec 秒後，來得及）；沒載好就退回靜態的 shadowImg。 */
  if(g && g.shadowAnims && g.shadowAnims.length){
    const dir=g.shadowAnims[(Math.random()*g.shadowAnims.length)|0], SH={ dir, fr:null, fps:12 }; G.shadow=SH;
    const vq=g.shadowVer ? '?v='+g.shadowVer : '';   // 同名覆蓋的快取（檔名都叫 frame_NN，ASSET_VER 的檔名表會撞，所以版本寫在卡上）
    fetch(dir+'anim.json'+vq).then(r=>r.ok?r.json():null).then(j=>{ if(!j) return;
      const fr=Array.from({length:j.frames||0},(_,i)=>{ const f=new Image(); f.src=dir+'frame_'+String(i).padStart(2,'0')+'.webp'+vq; return f; });
      return Promise.all(fr.map(f=>f.decode ? f.decode().catch(()=>{}) : 0)).then(()=>{ if(fr.length && fr.every(f=>f.naturalWidth)){ SH.fr=fr; SH.fps=j.fps||12; } });
    }).catch(()=>{});
  }
  const drawHook=(x,y)=>{
    if(hookImg && hookImg.naturalWidth){ const w=HOOK_W, h=w*hookImg.naturalHeight/hookImg.naturalWidth; cx.drawImage(hookImg, x-w/2, y-h*HOOK_LINE, w, h); return; }   // 盤緣對在圖高 HOOK_LINE 那條線
    cx.save(); cx.translate(x,y); cx.strokeStyle='#3a3530'; cx.fillStyle='#8a8378'; cx.lineWidth=2;   // 暫代：環＋鉤身＋三支鉤爪
    cx.beginPath(); cx.arc(0,-10,4,0,6.283); cx.stroke();
    cx.beginPath(); cx.rect(-2.5,-6,5,16); cx.fill(); cx.stroke();
    for(const s of [-1,0,1]){ cx.beginPath(); cx.moveTo(0,9); cx.quadraticCurveTo(s*14,10,s*12+ (s===0?0:0),24); cx.lineWidth=3.2; cx.strokeStyle='#5a544c'; cx.stroke(); }
    cx.restore(); };
  const draw=now=>{ if(grapple!==G) return;
    cx.clearRect(0,0,W,H);
    const t=now-G.t0, k=GRAPPLE_FLY_MS>0 ? Math.min(1,t/GRAPPLE_FLY_MS) : 1;
    let a=shipAnchor(G.g)||G.from;   // 繩頭釘在船身上（船飛走時跟著一起上去）
    const hx=a.x+(hook.x-a.x)*k, hy=a.y+(hook.y-a.y)*k - Math.sin(k*3.1416)*40;   // 鉤子飛出去：一道弧線
    const rg=hookRing(hx,hy), rx=rg.x, ry=rg.y;   // 繩子接在鉤子頂端的環
    for(const p of G.puffs){ const u=t-p.t; if(u<0 || u>p.life) continue; const q=u/p.life;   // 煙：從砲口往船尾拖走、越飄越大越淡
      const x=G.fire.x+p.vx*u, y=G.fire.y+p.vy*u-q*8, rr=p.r0*(1+q*3.2);
      const gr=cx.createRadialGradient(x,y,0,x,y,rr); gr.addColorStop(0,`rgba(${p.g},${p.g},${p.g-8},${(0.6*(1-q)).toFixed(3)})`); gr.addColorStop(1,`rgba(${p.g},${p.g},${p.g-8},0)`);
      cx.fillStyle=gr; cx.beginPath(); cx.arc(x,y,rr,0,6.283); cx.fill(); }
    for(const p of G.hookPuffs){ const u=t-p.t; if(u<0 || u>p.life) continue; const q=u/p.life;   // 鉤子扣上那一下，盤緣冒一團煙往上散
      const x=G.hook.x+p.vx*u, y=G.hook.y+p.vy*u, rr=p.r0*(1+q*2.6);
      const gr=cx.createRadialGradient(x,y,0,x,y,rr); gr.addColorStop(0,`rgba(${p.g},${p.g},${p.g-6},${(0.65*(1-q)).toFixed(3)})`); gr.addColorStop(1,`rgba(${p.g},${p.g},${p.g-6},0)`);
      cx.fillStyle=gr; cx.beginPath(); cx.arc(x,y,rr,0,6.283); cx.fill(); }
    if(t<200){ const q=t/200, rr=(20+46*q)*G.fire.k*3*(1-q*0.3);   // 砲口火光
      cx.globalCompositeOperation='lighter';
      const gr=cx.createRadialGradient(G.fire.x,G.fire.y,0,G.fire.x,G.fire.y,rr); gr.addColorStop(0,`rgba(255,250,220,${(1-q).toFixed(3)})`); gr.addColorStop(0.35,`rgba(255,190,80,${(0.85*(1-q)).toFixed(3)})`); gr.addColorStop(1,'rgba(255,90,20,0)');
      cx.fillStyle=gr; cx.beginPath(); cx.arc(G.fire.x,G.fire.y,rr,0,6.283); cx.fill();
      cx.globalCompositeOperation='source-over'; }
    /* 繩子：船 → 鉤子，中間微微下垂（飛行中拉直） */
    /* 鬆緊跟著船的遠近（-2571 Ray「船遠時緊、船近時鬆」）：遠近＝船身此刻的縮放比射出那一刻（G.fire.k）。
       比射出時小（遠了）＝拉直；比射出時大（近了）＝往下垂，越近垂越多。 */
    const near=(a.k && G.fire.k) ? a.k/G.fire.k : 1, sag=k<1 ? 0 : Math.max(0, Math.min(90, (near-0.97)*420));
    cx.lineCap='round';
    for(const [w,c] of [[3.6,'rgba(8,8,10,.95)'],[1.2,'rgba(60,60,66,.8)']]){   // 黑繩，中間一道暗灰讓它有一點厚度（-2571 Ray「繩子換成黑色的」）
      cx.strokeStyle=c; cx.lineWidth=w; cx.beginPath(); cx.moveTo(a.x,a.y); cx.quadraticCurveTo((a.x+rx)/2,(a.y+ry)/2+sag,rx,ry); cx.stroke(); }
    drawHook(hx,hy);
    /* -2557 Ray「不用倒數」：鉤子旁邊不顯示秒數（時限照舊由 combat 計） */
    G.raf=requestAnimationFrame(draw); };
  G.raf=requestAnimationFrame(draw);
  try{ SFX.play(asset('se_weapon_cannon'), sfxGain('se_weapon_cannon')); }catch(_){}   // 砲響（全音量）
  screenShakeLite();
}
export function grappleFlyMs(){ return GRAPPLE_FLY_MS; }
export function clearGrapple(){ if(!grapple) return; cancelAnimationFrame(grapple.raf); grapple.cv.remove(); (grapple.anims||[]).forEach(a=>{ try{ a.cancel(); }catch(_){} }); grapple=null; }   // 船飛走那一段的 forwards 也要收，不然換上的船員還停在畫面外
/* 登艦：船往上飛出畫面 → 船員沿繩滑下 → 回呼（combat 接著閉棺、換卡、開棺）。回傳整段長度。 */
/* 登艦：船往上飛出畫面（繩頭跟著上去）→ 一個人影的剪影全景從上往下劃過 → 劃過畫面正中那一刻換成甲板戰（onSwap）→ 劃完（onDone）。
   -2559 Ray「不用閉棺了，船升上去以後一個人影全景落下，剪影就好，剪影劃過就換成甲板戰」。
   剪影＝卡上 `shadowImg`（預先壓黑的單人空賊），沒寫就拿登艦那張卡的立繪壓黑；蓋滿 #app（上下兩半一起），所以換卡那一下被它擋住。 */
const BOARD_FLY_MS=900, BOARD_DROP_MS=220;   // -2868 Ray「落下的人影速度再快一點」：520 → 330；-2875「再快 1.5」：330 → 220
/* 對艦戰那張天空是哪個時段（登艦戰的甲板跟著它，-2868）：檔名尾巴 _dawn/_day/_dusk/_night；沒有尾巴的那幾張照表（sky_towers 原圖＝夜，量過與 _night 同色）。 */
let boardBand=null;
const PLAIN_SKY_BAND={ sky_towers:'night' };
function skyBandNow(){ const top=$('top'), m=/\/([^\/"?]+?)\.(?:webp|png|jpe?g)/i.exec((top && top.style.backgroundImage)||''); if(!m) return null;
  const t=/_(dawn|day|dusk|night)$/i.exec(m[1]); return t ? t[1].toLowerCase() : (PLAIN_SKY_BAND[m[1].toLowerCase()] || null); }
export function boardingRun(g, onSwap, onDone){
  if(!grapple){ onSwap&&onSwap(); onDone&&onDone(); return 0; }
  stopAirDrift(false);
  const app=$('app'), top=$('top'), H=top ? top.clientHeight : 400;
  grapple.anims=[]; for(const el of motionTargets()) if(el) grapple.anims.push(el.animate([{ transform:'none' },{ transform:`translateY(${-H*1.4}px)` }], { duration:BOARD_FLY_MS, easing:'cubic-bezier(.5,0,.85,.4)', fill:'forwards' }));
  boardBand=skyBandNow();   // 換卡前記下對艦戰的天色（setEnemy 的 bandBg 讀它）
  const SH=grapple.shadow && grapple.shadow.fr ? grapple.shadow : null;   // 會動的人影（載好了才用）
  const src=SH ? SH.fr[0].src : ((g && g.shadowImg) || asset(((GAME_CONFIG.enemies||{})[g && g.to]||{}).image));   // 卡上 shadowImg＝單人空賊的剪影（-2560 Ray「人影先找個落單的空賊圖」）；沒寫退回登艦那張卡的立繪
  setTimeout(()=>{
    if(!app || !src){ onSwap&&onSwap(); onDone&&onDone(); return; }
    const AH=top.clientHeight, AW=top.clientWidth, h=AH*1.35;   // 以演出區（#top）的高為準
    /* -2570 Ray「剪影的圖層在數字盤之下」「影子還是蓋到盤面了」：人影只在上半的演出區（#top）裡落下，裁在 #top 內，
       不蓋到數字盤（-2564 我讀反了，把它抬到最上層蓋過盤面；已改回）。 */
    const box=document.createElement('div'); box.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:6;';
    const im=document.createElement('img'); im.className='board-shadow'; im.alt=''; im.src=src;
    im.style.cssText=`position:absolute;left:50%;top:0;height:${h}px;width:auto;pointer-events:none;`+((SH || (g && g.shadowImg)) ? '' : 'filter:brightness(0);');   // 交件的人影本來就是黑的，不必再壓
    box.appendChild(im); top.appendChild(box);
    const a=im.animate([{ transform:`translate(-50%, ${-h}px) rotate(-4deg)` },{ transform:`translate(-50%, ${AH}px) rotate(3deg)` }], { duration:BOARD_DROP_MS, easing:'linear' });   // 等速：時間的一半＝剪影中心落在畫面正中（換卡藏在它後面）
    setTimeout(()=>{ onSwap&&onSwap(); }, BOARD_DROP_MS*0.5);   // 剪影蓋住畫面正中那一刻換
    let ft=0; if(SH){ const t0=performance.now(); ft=setInterval(()=>{ im.src=SH.fr[Math.floor((performance.now()-t0)*SH.fps/1000)%SH.fr.length].src; }, 1000/SH.fps); }
    a.onfinish=()=>{ clearInterval(ft); box.remove(); if(api.screenShake) api.screenShake(); onDone&&onDone(); };   // 落地＝震一下（-2868 Ray「落地時畫面震動」；鏡頭震動走 combat 的那一支，鐵律 8）
  }, BOARD_FLY_MS);
  return BOARD_FLY_MS+BOARD_DROP_MS;
}
/* 接舷漂移的形狀（唯一一份，鐵律 7）：u＝秒（各自加相位）、e＝振幅淡入 0～1 ⇒ { k 縮放倍率, x, y 佔畫面寬高的比例 }。
   緩近緩遠：主週期約 9 秒；八向平移＝兩軸各兩組不可公約的正弦。
   -2544 Ray：「幅度加倍」⇒ 縮放 0.80～1.12、橫向約 ±8%、縱向約 ±6%（-2499 原值的兩倍） */
function driftAt(u, e){
  return { k: 1 + e*(0.12*Math.sin(u*0.70) - 0.08*(1-Math.cos(u*0.31)) + 0.024*Math.sin(u*1.9)),
           x: e*(0.060*Math.sin(u*0.53) + 0.024*Math.sin(u*1.37+1.1)),
           y: e*(0.044*Math.sin(u*0.61+2.0) + 0.018*Math.sin(u*1.61+0.4)) };
}
/* 振幅淡入：入場演完（airDrift.t0）後 1.8 秒淡入；還沒演完＝0。編隊每一隻也讀這一支。 */
function driftEnv(now){ if(!airDrift) return 0; const t=(now-airDrift.t0)/1000, a=Math.max(0,Math.min(1,t/1.8)); return a*a*(3-2*a); }
function startAirDrift(en){
  stopAirDrift(true);
  if(en && en.float && !isAirBio(en)) return startFloatBob(en);
  /* -2545 Ray：「船也要走同一套，空戰怎麼可能是站著對射」⇒ 空賊船（isAirShip）也漂 */
  if(!isAirBio(en) && !isAirShip(en)) return;
  const fl=en.fit && en.fit.flip ? -1 : 1, ph=Math.random()*100;
  const S={ raf:0, t0:Infinity }; airDrift=S;   // t0＝入場演完那一刻（airEnter 的 done 設），之前振幅 0
  const tick=now=>{ if(airDrift!==S) return;
    /* -2545 Ray：「3 4 成群的要分別移動，不要一起移動」⇒ 有編隊時整個容器不動，每一隻在 startFlock 的 sync 裡各自漂（各自的相位）
       A 的準備動作期間（airAtk.freeze）凍在當下那一格：下潛的位置是對著操作盤線量好的，漂移會把它帶走（-2548） */
    if(!flock && !(airAtk && airAtk.freeze)){
      const top=$('top'), W=top?top.clientWidth:390, H=top?top.clientHeight:400;
      const d=driftAt((now-S.t0)/1000+ph, driftEnv(now)), far=farOf(en);
      const sc=(fl*far*d.k).toFixed(4)+' '+(far*d.k).toFixed(4), tr=(d.x*W).toFixed(1)+'px '+(d.y*H).toFixed(1)+'px';
      for(const el of motionTargets()) if(el){ el.style.scale=sc; el.style.translate=tr; }
    }
    S.raf=requestAnimationFrame(tick); };
  S.raf=requestAnimationFrame(tick);
}
export function stopAirMotion(){ stopAirDrift(false); }
/* 開場重起漂移（ver -2532，Ray：「怎麼沒有遠近及平面游移？」）：startGame 的 setEnemy 在 stopAll 之前就起了漂移，stopAll 會把它收掉
   ⇒ 照這一隻的卡重起一次（同 restoreSkyBattle）。入場（airEnter）在門開那一刻才演，t0 照舊由它設。 */
export function restoreAirMotion(){ startAirDrift(curCard()); }
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
/* ══ 空賊船的雲與煙（ver -2865／-2866，空戰副理；Ray 11-21：「前景要有雲霧飄過」「用程式給船拉兩條細煙尾巴」）══
   一張畫布兩件事，只在空戰的船（isAirShip）上跑：
   ⓪ 船尾兩條細煙＋船首下緣一條雲線（`SHIP_TRAIL[立繪名]`，config）：跟著待機層的框走（漂移／縮放／翻轉），往船尾流走變淡。
   ② 前景雲霧：每隔幾秒一大片半透明的霧從機頭那一側的畫面外飄進來、橫過船前、往船尾出去（世界往船尾流）。
   顏色一律取**這一場的戰鬥背景**（亮部＋暗部兩色）⇒ 清晨／白天／黃昏／夜晚自然各一版。
   ⚠ -2865 的「船底雲浪＋墊原圖船底」（補浪花羽化掉的船首下緣）已撤（-2866）：4、5 號改用「飛空船」提示詞重跑，本來就沒有浪。
   收：換怪（setEnemy 重叫）／打完（state.over：不再噴，剩下的散完自己拆）。 */
let shipAir=null;
const skyToneCache={};
function skyTone(url){
  if(!url) return Promise.resolve(null);
  if(skyToneCache[url]) return skyToneCache[url];
  return skyToneCache[url]=new Promise(res=>{ const im=new Image();
    im.onload=()=>{ try{ const c=document.createElement('canvas'); c.width=24; c.height=24; const x=c.getContext('2d'); x.drawImage(im,0,0,24,24);
      const d=x.getImageData(0,0,24,24).data, px=[]; for(let i=0;i<d.length;i+=4) px.push([d[i],d[i+1],d[i+2], d[i]*0.3+d[i+1]*0.59+d[i+2]*0.11]);
      px.sort((a,b)=>b[3]-a[3]); const avg=(a,b)=>{ const s=[0,0,0]; for(let i=a;i<b;i++) for(let k=0;k<3;k++) s[k]+=px[i][k]; return s.map(v=>v/(b-a)); };
      res({ hi:avg(0, Math.ceil(px.length*0.12)), mid:avg(Math.floor(px.length*0.35), Math.floor(px.length*0.65)) }); }catch(_){ res(null); } };
    im.onerror=()=>res(null); im.src=url; });
}
function stopShipAir(){ if(!shipAir) return; cancelAnimationFrame(shipAir.raf); shipAir.cv.remove(); if(shipAir.pitch) for(const t of [idleEl, $('enemyImg')]) if(t) t.style.rotate=''; shipAir=null; }
function startShipAir(en){
  stopShipAir(); if(!isAirShip(en)) return;
  const top=$('top'); if(!top) return;
  const cv=document.createElement('canvas'); cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3';
  top.appendChild(cv); const cx=cv.getContext('2d'), rnd=(a,b)=>a+Math.random()*(b-a);
  const mixc=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  /* 預設色（背景還沒取到）：灰白 */
  const S={ cv, raf:0, last:performance.now(), mists:[], nextMist:performance.now()+rnd(1200,2600),
            lit:[236,240,246], sh:[170,182,200], fwd:fwdOf(en) }; shipAir=S;
  { const T=SHIP_TRAIL[imgStem(en)] || {}, c=T.prop || [1336,715], bw=T.bow || [417,810]; S.pitch=T.pitch||0;
    /* 螺旋槳中心兩條＝遠（細淡、略高）／近（粗亮、略低）——前後關係不是上下關係（-2867）；
       船首下緣一條雲線（-2870，Ray「船首下緣也拉雲線」）：較粗、較淡、往下微沉，沿船底往後拖。 */
    S.trailPts=[[c[0],c[1]-9],[c[0],c[1]+9],bw];
    S.trailSty=[{ al:0.30, w:0.55, ph:0 },{ al:0.60, w:1, ph:2.1 },{ al:0.42, w:2.4, ph:4.2, sink:0.012 }];
    S.trails=S.trailPts.map(()=>[]); }
  const bgm=/url\("?([^")]+)"?\)/.exec(top.style.backgroundImage||'');
  skyTone(bgm && bgm[1]).then(t=>{ if(shipAir!==S || !t) return;
    S.lit=mixc(t.hi,[255,255,255],0.35); S.sh=mixc(t.mid,t.hi,0.45); });
  /* 一團雲：三顆重疊的軟球（亮部在上、暗部壓底），比單一漸層圓像雲 */
  const puff=(x,y,r,al,k)=>{ if(al<=0.004) return;
    const L=S.lit, D=S.sh;
    for(const [ox,oy,s,c] of [[0,0.18,1,D],[-0.35,-0.05,0.72,L],[0.32,0.02,0.66,L]]){
      const px=x+ox*r*k, py=y+oy*r, rr=r*s, g=cx.createRadialGradient(px,py,0,px,py,rr);
      g.addColorStop(0,`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${al.toFixed(3)})`); g.addColorStop(0.55,`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${(al*0.6).toFixed(3)})`); g.addColorStop(1,`rgba(${c[0]|0},${c[1]|0},${c[2]|0},0)`);
      cx.fillStyle=g; cx.beginPath(); cx.arc(px,py,rr,0,6.283); cx.fill(); } };
  const tick=now=>{ if(shipAir!==S) return;
    if(curCard()!==en || !cv.isConnected){ stopShipAir(); return; }
    const dt=Math.min(now-S.last,60); S.last=now;
    const W=top.clientWidth, H=top.clientHeight, dpr=Math.min(2, window.devicePixelRatio||1);
    if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
    cx.setTransform(dpr,0,0,dpr,0,0); cx.clearRect(0,0,W,H);
    const el=(idleEl && idleEl.isConnected) ? idleEl : null, falling=!!((el||$('enemyImg'))||{})._falling;
    const live=!state.over && !falling, back=-S.fwd;   // back＝船尾方向（畫面 x 的正負）
    /* 船首起伏（SHIP_TRAIL.pitch 度，-2871）：獨立 `rotate` 屬性（不碰 transform／scale／translate），船頭朝左 ⇒ 正角＝船首往下點 */
    if(S.pitch){ const d=live ? (S.pitch*(Math.sin(now/1100*Math.PI)*0.8+Math.sin(now/470)*0.2)*-S.fwd).toFixed(3)+'deg' : '';
      for(const t of [idleEl, $('enemyImg')]) if(t) t.style.rotate=d; }
    /* ⓪ 船尾兩條細煙（ver -2866，Ray：「用程式給船拉兩條細煙尾巴」）：SHIP_TRAIL[立繪名]＝兩個畫布點（沒寫＝船尾預設兩點）。
       每幀在點上落一個節點，節點往船尾流走、變淡、略變粗 ⇒ 船漂移時尾巴自然拉出弧線。 */
    { const tr=top.getBoundingClientRect(); let m=null;
      if(el && idleJ){ const br=el.getBoundingClientRect(), b=idleJ.box, kx=br.width/b[2], ky=br.height/b[3];
        m={ x:c=> br.left-tr.left + (S.fwd>0 ? (b[0]+b[2]-c) : (c-b[0]))*kx, y:c=> br.top-tr.top + (c-b[1])*ky, k:kx }; }
      else { const eI=$('enemyImg'), r=eI && eI.getAttribute('src') && canvasBoxInTop(eI, { canvas:[1536,1024], box:[0,0,1536,1024] });
        if(r){ const k=r.width/1536; m={ x:c=> r.left+(S.fwd>0 ? 1536-c : c)*k, y:c=> r.top+c*k, k }; } }
      if(m && live) S.trailPts.forEach((p,i)=>S.trails[i].push({ x:m.x(p[0]), x0:m.x(p[0]), y:m.y(p[1]), a:0, w:m.k }));
      const sp=back*0.16*W/390;
      S.trails.forEach((tl,ti)=>{ const st=S.trailSty[ti];
        for(const q of tl){ q.a+=dt; q.x+=sp*dt; q.y+=(Math.sin((q.a+q.x)/260+st.ph)*0.02+(st.sink||0))*dt*W/390; }
        /* -2871 Ray「雲線要一路拉到畫面外」：不再按時間收，節點流出畫面才丟；f＝從噴口到畫面邊走了幾成（淡化與變粗跟著它） */
        while(tl.length && (back>0 ? tl[0].x>W+40 : tl[0].x<-40)) tl.shift();
        for(let i=1;i<tl.length;i++){ const q0=tl[i-1], q1=tl[i], span=Math.max(40, back>0 ? W-q1.x0 : q1.x0), f=Math.min(1, Math.abs(q1.x-q1.x0)/span)*0.85;
          cx.strokeStyle=`rgba(${S.lit[0]|0},${S.lit[1]|0},${S.lit[2]|0},${(st.al*(1-f)*(1-f)).toFixed(3)})`;
          cx.lineWidth=Math.max(0.6, (4+10*f)*q1.w*st.w); cx.lineCap='round';
          cx.beginPath(); cx.moveTo(q0.x,q0.y); cx.lineTo(q1.x,q1.y); cx.stroke(); } }); }
    /* ② 前景雲霧：機頭那一側的畫面外進、船尾那一側出；一片＝一串軟團，橫跨 0.6~1.1 個畫面寬 */
    if(live && now>=S.nextMist){ S.nextMist=now+rnd(5200,9000);
      const span=W*rnd(0.6,1.1), n=7+((Math.random()*4)|0), y0=H*rnd(0.18,0.85), lobes=[];
      for(let k=0;k<n;k++) lobes.push({ dx:(k/(n-1)-0.5)*span, dy:rnd(-0.07,0.07)*H, r:H*rnd(0.16,0.28), ph:Math.random()*6.283 });
      const dur=rnd(3600,5200);
      S.mists.push({ lobes, y0, span, dur, t:0, peak:rnd(0.42,0.62) }); }
    for(let i=S.mists.length-1;i>=0;i--){ const m=S.mists[i]; m.t+=dt; const q=m.t/m.dur; if(q>=1){ S.mists.splice(i,1); continue; }
      const from=-back*(W/2+m.span/2+H*0.3), to=back*(W/2+m.span/2+H*0.3), cxm=W/2+from+(to-from)*q;   // 機頭側 → 船尾側
      const al=m.peak*Math.sin(Math.PI*Math.min(1,Math.max(0,q)));
      for(const l of m.lobes) puff(cxm+l.dx, m.y0+l.dy+Math.sin(m.t/900+l.ph)*H*0.01, l.r*(1+0.08*Math.sin(m.t/700+l.ph)), al*0.55, 1.2); }
    if(!live && !S.mists.length && !S.trails.some(t=>t.length)){ stopShipAir(); return; }
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
/* ══ A 的準備動作（ENEMY_ATK 的 `prep:true`，ver -2546，Ray：「centipi_dive_joined_v2_cut 蜈蚣用這個，動畫跑完就平移出畫面」
   「那是 A 的準備動作，A 等等給你」）══ 有準備動作的空戰生物：先播那一支（側面轉正、下潛），播完停在最後一格往下平移出畫面，
   再接劃過（A 的動畫還沒到之前沿用程式的劃過）→ 從畫面外飛回。回傳撞到玩家的那一刻（含準備動作的長度）。 */
const PREP_SLIDE_TAIL_MS=140;   // 動畫播完之後還要再滑多久才完全出畫面
const PREP_PULL_MS=200;         // 下潛前「快速拉到定位」的長度
/* -2547 Ray「怎麼留了個尾巴在那裡」：只剩尾巴的那幾格（slideFrom 之後）就邊播邊往下滑出去，不等播完才開始滑。
   -2548 Ray「下潛動作的消失點一定要在操作盤線以下才不會穿幫，所以在下潛前一定要快速拉到定位再放動畫」：
   先把牠往下拉，讓動畫畫布的下緣（頭衝出去的那條線）落到 #top 的下緣（＝操作盤線）以下一點（#top 會裁掉），再播。 */
function airPrepAssault(en, c, L){
  const top=$('top'), el0=idleEl || $('enemyImg'); if(!top || !el0) return 0;
  const N=L.fr.length, fps=L.j.fps||24, Tclip=Math.round(N*1000/fps), H=top.clientHeight;
  const tail=(c.slide && c.slide.tail!=null) ? c.slide.tail : PREP_SLIDE_TAIL_MS;
  const from=Math.max(0, Math.min(N-1, c.slideFrom!=null ? c.slideFrom : N-4)), tSlide=Math.round(from*1000/fps), slideMs=Tclip-tSlide+tail;
  /* 拉多少：動畫畫布在畫面上的下緣 → 操作盤線以下 4%（多一點餘裕給漂移的上下浮動） */
  /* 量法：在動畫畫布會擺的那個框放一個看不見的量尺，套上同一組漂移的 translate／scale，直接量它的下緣（不用推算，-2548 推算差了 36px） */
  const tr=top.getBoundingClientRect(), box=canvasBoxInTop($('enemyImg'), L.j);
  let boxBottom=el0.getBoundingClientRect().bottom;
  if(box){ const pr=document.createElement('div');
    pr.style.cssText=`position:absolute;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;visibility:hidden;pointer-events:none;`;
    pr.style.translate=el0.style.translate; pr.style.scale=el0.style.scale; pr.style.transformOrigin=getComputedStyle(el0).transformOrigin;
    el0.after(pr); boxBottom=pr.getBoundingClientRect().bottom; pr.remove(); }
  const sl=c.slide;   /* `slide:{dx,dy,scale,ms}`（ver -2786，羽蛇 rollinB：「平移出畫面外 往斜下移動 要有一點拉近」）：不先往下拉定位，從 slideFrom 起往機頭那側斜下平移出畫面、同時放大；dx/dy＝上半畫面寬／高的倍數 */
  const dy=sl ? 0 : Math.max(0, Math.round(tr.bottom - boxBottom + H*0.04));
  [].concat(en.assaultSe || 'se_enemy_dragonroar').forEach(k=>playEntranceSe(k));   // assaultSe 可寫陣列（ver -2768，羽蛇：叫聲＋劃破空氣）
  const busy={ dead:false, freeze:true, a:[], cancel(){ this.dead=true; this.a.forEach(x=>{ try{ x.cancel(); }catch(_){} }); } }; airAtk=busy;   // 準備動作期間佔住 airAtk（換怪／打死時 stopAirDrift 會 cancel）
  /* 上浮方向＝下潛的反方向（ver -2788，Ray：「上拉要跟下降反方向」）：沿下潛向量倒退 H×rise 的距離 */
  const dvx=sl ? fwdOf(en)*top.clientWidth*(sl.dx||0.6) : 0, dvy=sl ? H*(sl.dy||1.1) : 1, dl=Math.hypot(dvx,dvy)||1;
  const rr=sl && sl.rise ? H*sl.rise : 0, rx=-Math.round(dvx/dl*rr), ry=-Math.round(dvy/dl*rr), pullMs=sl && sl.rise ? (sl.riseMs||320) : PREP_PULL_MS;   /* `slide.rise`（ver -2787，Ray：「先往上升一點點再轉身下潛」）：先往上浮 H×rise 再播 */
  busy.a.push(el0.animate([{ transform:'none' },{ transform:`translate(${rx}px, ${dy+ry}px)` }], { duration:pullMs, easing:'cubic-bezier(.2,.7,.3,1)', fill:'forwards' }));
  setTimeout(()=>{ if(busy.dead || airAtk!==busy) return;
    setTimeout(()=>{ if(busy.dead || airAtk!==busy) return; const e2=idleEl || clipEl; if(!e2) return;
      if(sl){ const f=fwdOf(en), W=top.clientWidth; e2.style.transformOrigin='50% 50%';
        busy.a.push(e2.animate([{ transform:`translate(${rx}px, ${ry}px)` },{ transform:`translate(${rx+f*W*(sl.dx||0.6)}px, ${ry+H*(sl.dy||1.1)}px) scale(${sl.scale||1.3})` }], { duration:slideMs, easing:'cubic-bezier(.4,0,.85,.6)', fill:'forwards' })); return; }
      busy.a.push(e2.animate([{ transform:`translateY(${dy}px)` },{ transform:`translateY(${dy+H*1.25}px)` }], { duration:slideMs, easing:'cubic-bezier(.35,0,.9,.55)', fill:'forwards' })); }, tSlide);
    const toSweep=()=>{ if(busy.dead || airAtk!==busy) return;
      const e2=idleEl || clipEl; if(e2) e2.style.opacity='0';
      busy.a.forEach(x=>{ try{ x.cancel(); }catch(_){} }); busy.a=[];
      if(idleEl && idleFr){ placeIdle(); runIdle(); } else { if(clipEl){ clipEl.remove(); clipEl=null; } $('enemyImg').style.visibility=''; }
      airAtk=null; if(e2) e2.style.opacity='';
      const S2=c.sweep && clipCache[c.sweep]; if(c.sweepImg) airTopSweep(en, c.sweepImg); else if(S2 && S2.fr) airBellySweep(en, S2); else airAssault(en, { noOut:true }); };
    playActionClip('atk', ()=>{ setTimeout(toSweep, tail); }, { hold:true });
  }, pullMs);
  /* 撞到的時間＝拉到定位＋準備動作＋滑完＋A 本體撞到的那一刻（有 A 動畫＝腹面上衝的一半；沒有＝程式劃過的一半） */
  const S2=c.sweep && clipCache[c.sweep] && clipCache[c.sweep].fr;
  return Math.round(pullMs+Tclip+tail+(c.sweepImg ? TOP_SWEEP_MS*0.5 : S2 ? BELLY_SWEEP_MS*BELLY_HIT : AIR_SWEEP_MS*0.5));
}
/* ══ A 本體：俯視圖快速劃過（ENEMY_ATK 的 `sweepImg`，ver -2787／-2788，Ray：「攻擊用 topdown view 那張快速劃過 用程式給點殘影」）══
   一張靜態俯視圖（頭朝機頭那側＝跟側面立繪同向）從操作盤線底下、機尾那側斜衝到畫面另一側上方出去，圖轉到頭對準行進方向；
   後面拖幾張同路徑、延遲幾十毫秒、越來越淡的分身＝殘影。衝到一半撞到玩家，衝出去之後待機那一隻從畫面外飛回（同腹面上衝）。 */
const TOP_SWEEP_MS=420, TOP_SIZE=1.25, TOP_GHOSTS=[[40,.5],[80,.32],[120,.2],[165,.11]];   // SIZE＝圖寬佔上半畫面寬的倍數；GHOSTS＝[延遲 ms, 不透明度]
function airTopSweep(en, src){
  const top=$('top'), eImg=$('enemyImg'); if(!top || !eImg) return;
  const W=top.clientWidth, H=top.clientHeight, w=W*TOP_SIZE;
  const idle=idleEl || eImg; idle.style.opacity='0';
  const ang=Math.random()*360, rad=ang*Math.PI/180, ux=Math.cos(rad), uy=Math.sin(rad);   // -2791 Ray：「劃過的角度隨機」—— 每一次隨機一個行進方向（全 360°）
  const D=Math.hypot(W,H)+w*1.3, sx=W/2-ux*D/2, sy=H/2-uy*D/2+H*0.15, ex=W/2+ux*D/2, ey=H/2+uy*D/2+H*0.15;
  const rot=ang-180, flip=1;   // 原圖頭朝左（＝180°）：轉到頭對準行進方向；俯視圖左右對稱，不必鏡射
  const pos=(x,y)=>`translate(${x-W/2}px, ${y-H/2}px) rotate(${rot}deg) scaleX(${flip})`;
  const kf=[{ transform:pos(sx,sy) },{ transform:pos(ex,ey) }];
  const mk=(op)=>{ const im=document.createElement('img'); im.className='en-belly'; im.alt=''; im.src=src;
    im.style.cssText=`position:absolute;left:${(W-w)/2}px;top:0;width:${w}px;height:auto;translate:0 ${H/2}px;margin-top:${-w*0.32}px;pointer-events:none;z-index:${op<1?2:3};opacity:${op};`; eImg.after(im); return im; };
  const ims=[], as=[], ease='cubic-bezier(.3,.05,.7,.95)';
  TOP_GHOSTS.slice().reverse().forEach(([d,op])=>{ const g=mk(op); g.style.filter='blur(1.5px)'; ims.push(g); as.push(g.animate(kf, { duration:TOP_SWEEP_MS, delay:d, easing:ease, fill:'both' })); });
  const im=mk(1); ims.push(im); as.push(im.animate(kf, { duration:TOP_SWEEP_MS, easing:ease, fill:'both' }));
  const clean=()=>{ ims.forEach(x=>x.remove()); };
  const hold={ cancel(){ clean(); idle.style.opacity=''; as.forEach(x=>{ try{ x.cancel(); }catch(_){} }); } }; airAtk=hold;
  const last=TOP_GHOSTS[TOP_GHOSTS.length-1][0];
  setTimeout(()=>{ if(airAtk!==hold) return; clean(); airAtk=null; airReturn(en); }, TOP_SWEEP_MS+last);
}
/* ══ A 本體：腹面上衝（ENEMY_ATK 的 `sweep`，ver -2550，Ray：「A 動畫出了 mon_centipi_belly_even2_wave_cut，
   讓蜈蚣從畫面下方、放大、快速上平移、略斜」）══ 腹面 loop（腳一波一波抽）照 fps 播，同時整張放大從操作盤線底下
   往上衝出畫面頂端、略往機頭那側斜；衝到 BELLY_HIT 那一刻撞到玩家。衝出去之後待機的那一隻從機尾那側畫面外飛回定位。 */
const BELLY_SWEEP_MS=640, BELLY_HIT=0.5, BELLY_SIZE=4.65;   // SIZE＝圖高佔上半畫面高的倍數（-2552 Ray「A 要大一點，大三倍」1.55→4.65）
function airBellySweep(en, S){
  const top=$('top'), eImg=$('enemyImg'); if(!top || !eImg) return;
  const W=top.clientWidth, H=top.clientHeight, f=fwdOf(en);
  const h=H*BELLY_SIZE, w=h*S.j.canvas[0]/S.j.canvas[1];
  const im=document.createElement('img'); im.className='en-belly'; im.alt='';
  im.style.cssText=`position:absolute;left:${(W-w)/2}px;top:${(H-h)/2}px;width:${w}px;height:${h}px;pointer-events:none;z-index:2;`;
  im.src=S.fr[0].src; eImg.after(im);
  const idle=idleEl || eImg; idle.style.opacity='0';   // 上衝期間原位那一隻藏起來（牠已經下潛出去了），飛回時才現身
  const fps=S.j.fps||24, N=S.fr.length, t0=performance.now();
  const tick=setInterval(()=>{ im.src=S.fr[Math.floor((performance.now()-t0)*fps/1000)%N].src; }, 1000/fps);
  /* 略斜：身體傾 tilt，**平移方向＝頭朝的方向**（-2553 Ray「平移角度要跟頭同一角度」）——
     沿傾角走 D（整隻從操作盤線下走到畫面頂外），路徑中點在畫面正中。 */
  const tilt=f*14, rad=tilt*Math.PI/180, D=(H+h)/Math.cos(rad)+8, vx=Math.sin(rad)*D/2, vy=Math.cos(rad)*D/2;
  const a=im.animate([
    { transform:`translate(${-vx}px, ${vy}px) rotate(${tilt}deg)` },
    { transform:`translate(${vx}px, ${-vy}px) rotate(${tilt}deg)` }], { duration:BELLY_SWEEP_MS, easing:'cubic-bezier(.3,.05,.7,.95)' });
  const hold={ cancel(){ clearInterval(tick); im.remove(); idle.style.opacity=''; try{ a.cancel(); }catch(_){} } }; airAtk=hold;
  a.onfinish=()=>{ clearInterval(tick); im.remove(); if(airAtk!==hold) return; airAtk=null; airReturn(en); };
}
/* 衝出去之後飛回定位（同 airAssault 最後那一段）：從機尾那側畫面外、放大一點飛進來，追過頭一點再停 */
function airReturn(en){
  const el=idleEl || $('enemyImg'), top=$('top'); if(!el || !top) return;
  const W=top.clientWidth, H=top.clientHeight, tr=top.getBoundingClientRect(), er=el.getBoundingClientRect(), f=fwdOf(en);
  const back = f<0 ? (tr.right-er.left)+er.width*0.15+20 : -(er.right-tr.left)-er.width*0.15-20;
  el.style.transformOrigin='50% 50%';
  el.style.opacity='';
  const a=el.animate([
    { transform:`translate(${back}px, ${H*0.06}px) scale(1.25)`, opacity:1, offset:0, easing:'cubic-bezier(.2,.55,.35,1)' },
    { transform:`translate(${f*W*0.05}px, ${-H*0.02}px) scale(.98)`, opacity:1, offset:0.72, easing:'cubic-bezier(.45,0,.55,1)' },
    { transform:'none', opacity:1, offset:1 }], { duration:1700 });
  airAtk=a; const end=()=>{ if(airAtk===a) airAtk=null; }; a.onfinish=end; a.oncancel=end;
}
function airAssault(en, opts){
  if(airAtk) return 0;
  if(!(opts && opts.noOut) && !flock){ const c=clipFor('atk',en), L=c && c.prep && clipCache[c.dir]; if(L && L.fr) return airPrepAssault(en, c, L); }
  /* 編隊（ver -2516，Ray：「群體的話攻擊只有其中一隻發動，輪流隨機」）：隨機挑一隻還在飛的去劃過，其他照常漂 */
  const fa=flock ? flock.ms.filter(m=>!m.down) : null;
  const el=(fa && fa.length) ? fa[(Math.random()*fa.length)|0].im : (idleEl || $('enemyImg')), top=$('top'); if(!el || !top) return 0;
  const W=top.clientWidth, H=top.clientHeight, tr=top.getBoundingClientRect(), er=el.getBoundingClientRect();
  if(!er.width) return 0;
  const f=fwdOf(en), dive=Math.random()<0.5, K=3.4;
  const cx=er.left-tr.left+er.width/2, cy=er.top-tr.top+er.height/2, bw=er.width*K, bh=er.height*K;
  const noOut=!!(opts && opts.noOut);   // 準備動作已經把牠帶出畫面了：直接從劃過開始
  const T={ out:noOut?0:380, gap:noOut?0:140, sweep:AIR_SWEEP_MS, gap2:260, ret:1700 };
  const tot=T.out+T.gap+T.sweep+T.gap2+T.ret, o=ms=>ms/tot;
  const exit = dive ? `translate(${f*W*0.35}px, ${(tr.bottom-er.top)+10}px) scale(.9) rotate(${f*20}deg)`
                    : `translate(${-f*W*0.3}px, ${-(er.bottom-tr.top)-10}px) scale(.85) rotate(${-f*20}deg)`;
  const p=(x,y,rot)=>`translate(${x-cx}px, ${y-cy}px) scale(${K}) rotate(${rot}deg)`;
  const s0 = dive ? p(W/2-f*W*0.3, H+bh/2, -f*28) : p(W/2-f*W*0.3, -bh/2, f*28);
  const s1 = dive ? p(W/2+f*W*0.3, -bh/2, -f*28) : p(W/2+f*W*0.3, H+bh/2, f*28);
  const back = f<0 ? (tr.right-er.left)+er.width*0.15+20 : -(er.right-tr.left)-er.width*0.15-20;
  let t=0; const kf=[];
  if(noOut) kf.push({ transform:s0, opacity:0, offset:0 }, { transform:s0, opacity:1, offset:0.0001, easing:'cubic-bezier(.3,.1,.7,.9)' });
  else {
    kf.push({ transform:'none', opacity:1, offset:0, easing:'cubic-bezier(.5,0,.9,.6)' });
    t+=T.out; kf.push({ transform:exit, opacity:1, offset:o(t) }); kf.push({ transform:exit, opacity:0, offset:o(t)+0.0001 });
    t+=T.gap; kf.push({ transform:s0, opacity:0, offset:o(t) }); kf.push({ transform:s0, opacity:1, offset:o(t)+0.0001, easing:'cubic-bezier(.3,.1,.7,.9)' }); }
  const hitAt=t+T.sweep*0.5;
  t+=T.sweep; kf.push({ transform:s1, opacity:1, offset:o(t) }); kf.push({ transform:s1, opacity:0, offset:o(t)+0.0001 });
  t+=T.gap2; kf.push({ transform:`translate(${back}px, ${H*0.06}px) scale(1.25)`, opacity:0, offset:o(t) });
  kf.push({ transform:`translate(${back}px, ${H*0.06}px) scale(1.25)`, opacity:1, offset:o(t)+0.0001, easing:'cubic-bezier(.2,.55,.35,1)' });
  kf.push({ transform:`translate(${f*W*0.05}px, ${-H*0.02}px) scale(.98)`, opacity:1, offset:o(t+T.ret*0.72), easing:'cubic-bezier(.45,0,.55,1)' });
  kf.push({ transform:'none', opacity:1, offset:1 });
  el.style.transformOrigin='50% 50%';
  if(!noOut) [].concat(en.assaultSe || 'se_enemy_dragonroar').forEach(k=>playEntranceSe(k));   // 發動攻擊那一刻吼一聲（ver -2502，Ray）；有準備動作的在準備動作開頭吼過了
  const a=el.animate(kf, { duration:tot }); airAtk=a;
  const end=()=>{ if(airAtk===a) airAtk=null; };
  a.onfinish=end; a.oncancel=end;
  return Math.round(hitAt);
}
export function onAssaultLand(){
  if(!sky){ const en=curCard(); if(isAirBio(en)) return airAssault(en);
    if(groupCard && groupCard.group) return groupAttack();   // 群戰：隨機一人開槍（-2581）／照原立繪生成的逐人動作（-2623）
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
  { const en=curCard(); if(en && en.assaultSe) setTimeout(()=>[].concat(en.assaultSe).forEach(k=>playEntranceSe(k)), SW); }   // 衝出那一刻吼一聲（卡上 assaultSe；-2450 Ray：「龍主動攻擊時放 dragonroar」）
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
/* ══ 延時／點錯＝羽毛封窗（卡上 `featherBlock`，ver -2792，Ray：「給羽蛇一個特效攻擊 快速向後噴出大量羽毛 然後數個羽毛擋住敵人窗
   清盤或被攻擊才會被吹走 檔住的部份看不到攻擊圈也點不到 用來做D跟m」）══
   ① 0～520ms 從身體往後（機頭的反方向）噴出一大把羽毛（畫布，跑完就拆）
   ② FEATHER_STICK_AT 起 n 根大羽毛「啪」地貼上上半畫面（DOM，z 在攻擊圈之上、吃掉點擊）—— combat 照回傳值延後扣血
   ③ 清盤（combat.clearBoard）或玩家被主動攻擊打到（assault／block）→ clearFeathers() 吹走；換怪／收場直接拆。
   ⚠ 擋點擊兩條路都要擋：攻擊圈自己的 DOM 監聽（羽毛蓋在上面自然吃掉）＋聖徒化手勢層的座標判定（main.hitThreatAt 問 featherAt）。 */
const FEATHER_STICK_AT=640, FEATHER_MAX=6;
let featherCv=null, featherTok=0, featherSet=null, featherDir='';
const featherEls=[];
/* 羽毛圖（ver -2792 第二版，Ray：「羽毛太醜了 給gpt畫16格不同樣子的羽毛 同色系」）：卡上 featherBlock.dir 底下 feather_00..NN.webp。
   每張另存一份 alpha（點擊判定照羽毛的實際形狀，不是整個方框）。 */
function loadFeathers(card){
  const fb=(card||curCard()||{}).featherBlock; if(!fb || !fb.dir) return null;
  if(featherSet && featherDir===fb.dir) return featherSet;
  featherDir=fb.dir; featherSet=[];
  for(let i=0;i<(fb.count||16);i++){ if(fb.skip && fb.skip.indexOf(i)>=0) continue;   // skip＝不用的那幾根（ver -2795，Ray：「破洞的黑色不要用」）
    const im=new Image(); const o={ im, a:null };
    im.onload=()=>{ try{ const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; const x=c.getContext('2d'); x.drawImage(im,0,0); o.a=x.getImageData(0,0,c.width,c.height).data; }catch(_){} };
    im.src=fb.dir+'feather_'+String(i).padStart(2,'0')+'.webp'+(fb.v ? '?v='+fb.v : ''); featherSet.push(o); }   // v＝同名覆蓋時跳號（快取）
  return featherSet;
}
function readyFeathers(){ const S=loadFeathers(); return S ? S.filter(o=>o.im.complete && o.im.naturalWidth) : []; }
export function featherBurst(){
  const top=$('top'); if(!top) return 0;
  const S=readyFeathers(); if(!S.length) return 0;
  const W=top.clientWidth, H=top.clientHeight, tr=top.getBoundingClientRect();
  const cv=document.createElement('canvas'); cv.className='feather-burst';
  const dpr=Math.min(2, window.devicePixelRatio||1); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); top.appendChild(cv);
  if(featherCv) featherCv.remove(); featherCv=cv;
  const cx=cv.getContext('2d'); cx.setTransform(dpr,0,0,dpr,0,0);
  const f=fwdOf(curCard()), rnd=(a,b)=>a+Math.random()*(b-a);
  const el=(idleEl && idleEl.isConnected) ? idleEl : $('enemyImg'), r=el ? el.getBoundingClientRect() : null;
  const bx=r && r.width ? r.left-tr.left+r.width*0.5 : W*0.5, by=r && r.height ? r.top-tr.top+r.height*0.5 : H*0.45, bw=r && r.width ? r.width*0.3 : W*0.2;
  const P=[];
  for(let i=0;i<80;i++){ const sp=rnd(0.9,2.4), ang=rnd(-0.65,0.65);   // 往後（-f）噴，扇形散開
    P.push({ img:S[(Math.random()*S.length)|0].im, x:bx+rnd(-bw,bw), y:by+rnd(-bw*0.5,bw*0.5), vx:-f*Math.cos(ang)*sp, vy:Math.sin(ang)*sp-0.15, rot:rnd(0,6.28), vr:rnd(-0.03,0.03),
      s:H*rnd(0.07,0.17), t0:Math.pow(Math.random(),1.6)*260, life:rnd(380,620) }); }
  const t0=performance.now();
  const draw=now=>{ if(!cv.isConnected) return;
    const t=now-t0; cx.clearRect(0,0,W,H); let alive=false;
    for(const p of P){ const u=t-p.t0; if(u<0){ alive=true; continue; } if(u>p.life) continue; alive=true;
      const k=1-Math.exp(-u/260), x=p.x+p.vx*260*k, y=p.y+p.vy*260*k+0.00018*u*u;   // 噴出去之後被空氣拖慢、略往下飄
      const iw=p.img.naturalWidth, ih=p.img.naturalHeight, sc=p.s/Math.max(iw,ih);
      cx.save(); cx.translate(x,y); cx.rotate(p.rot+p.vr*u); cx.globalAlpha=Math.min(1,u/40)*Math.min(1,(p.life-u)/160);
      cx.drawImage(p.img, -iw*sc/2, -ih*sc/2, iw*sc, ih*sc); cx.restore(); }
    if(alive) requestAnimationFrame(draw); else { cv.remove(); if(featherCv===cv) featherCv=null; } };
  requestAnimationFrame(draw);
  const n=Math.max(1, (((curCard()||{}).featherBlock||{}).n|0) || 3+((Math.random()*2)|0));
  const tok=++featherTok; setTimeout(()=>{ if(tok===featherTok && !state.over) stickFeathers(n); }, FEATHER_STICK_AT-160);
  return FEATHER_STICK_AT;
}
function stickFeathers(n){
  const top=$('top'); if(!top) return;
  const W=top.clientWidth, H=top.clientHeight, rnd=(a,b)=>a+Math.random()*(b-a);
  const S=readyFeathers().slice().sort(()=>Math.random()-0.5); if(!S.length) return;
  const cols=Array.from({length:n},(_,i)=>(i+0.5)/n).sort(()=>Math.random()-0.5);   // 橫向大致分散，不全疊在同一處
  cols.forEach((u,i)=>{
    while(featherEls.length>=FEATHER_MAX){ const o=featherEls.shift(); o.el.remove(); }
    const F=S[i%S.length], iw=F.im.naturalWidth, ih=F.im.naturalHeight, d=H*rnd(0.62,0.85), sc=d/Math.max(iw,ih), w=iw*sc, h=ih*sc;
    const cxp=W*(0.1+u*0.8)+rnd(-W*0.06,W*0.06), cyp=H*rnd(0.3,0.66), rot=rnd(-80,80);
    const im=document.createElement('img'); im.className='feather-block'; im.alt=''; im.src=F.im.src; im.draggable=false;
    im.style.cssText=`left:${(cxp-w/2).toFixed(1)}px;top:${(cyp-h/2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;--fr:${rot.toFixed(1)}deg;`;
    top.appendChild(im); featherEls.push({ el:im, F, cx:cxp, cy:cyp, w, h, rot });
    /* 從左邊刮進畫面（ver -2795，Ray：「羽毛從左到右刮到畫面上」）：由畫面左外側高速掃到落點，邊掃邊轉正，到位時略過衝再收 */
    const dx=-(cxp+w*0.9), r0=rot-35;
    im.animate([{ transform:`translate(${dx.toFixed(0)}px, ${(H*0.06).toFixed(0)}px) rotate(${r0}deg)`, opacity:0.9 },
                { transform:`translate(${(w*0.06).toFixed(0)}px, 0px) rotate(${rot+4}deg)`, opacity:1, offset:0.82 },
                { transform:`translate(0px, 0px) rotate(${rot}deg)`, opacity:1 }],
      { duration:260, delay:i*80, easing:'cubic-bezier(.15,.75,.3,1)', fill:'backwards' });
  });
  bindFeatherGuard(top);
}
/* 座標（client）上有沒有羽毛擋著 —— 照羽毛圖的 alpha 判（方框的透明角落不擋）。
   兩條點擊路都問它：#top 上的 capture 監聽（攻擊圈自己的 DOM 點擊）＋聖徒化手勢層（main.hitThreatAt 之前）。 */
export function featherAt(x,y){
  if(!featherEls.length) return false;
  const top=$('top'); if(!top) return false; const tr=top.getBoundingClientRect(), px=x-tr.left, py=y-tr.top;
  for(const o of featherEls){
    const rad=-o.rot*Math.PI/180, dx=px-o.cx, dy=py-o.cy, lx=dx*Math.cos(rad)-dy*Math.sin(rad)+o.w/2, ly=dx*Math.sin(rad)+dy*Math.cos(rad)+o.h/2;
    if(lx<0||ly<0||lx>=o.w||ly>=o.h) continue;
    const A=o.F.a; if(!A) return true;
    const iw=o.F.im.naturalWidth, ix=Math.floor(lx/o.w*iw), iy=Math.floor(ly/o.h*o.F.im.naturalHeight);
    if(A[(iy*iw+ix)*4+3]>40) return true;
  }
  return false;
}
let featherGuard=false;
function bindFeatherGuard(top){
  if(featherGuard) return; featherGuard=true;
  const eat=e=>{ if(!featherEls.length) return; const t=(e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    if(featherAt(t.clientX, t.clientY)){ e.stopPropagation(); if(e.cancelable) e.preventDefault(); } };   // 點到羽毛＝什麼都沒點到（不穿透給攻擊圈）
  for(const t of ['pointerdown','pointerup','click','touchstart','touchend','mousedown','mouseup']) top.addEventListener(t, eat, { capture:true, passive:false });
}
/* 吹走（清盤／被主動攻擊打到）；instant＝換怪／收場直接拆 */
export function clearFeathers(instant){
  if(instant){ featherTok++; if(featherCv){ featherCv.remove(); featherCv=null; } }
  const list=featherEls.splice(0);
  for(const o of list){ const im=o.el;
    if(instant){ im.remove(); continue; }
    const rot=o.rot, a=Math.random()*Math.PI*2, d=(im.parentNode ? im.parentNode.clientWidth : 400)*1.2;
    const an=im.animate([{ transform:`rotate(${rot}deg)`, opacity:1 },{ transform:`translate(${(Math.cos(a)*d).toFixed(0)}px, ${(Math.sin(a)*d-80).toFixed(0)}px) rotate(${(rot+(Math.random()<0.5?-1:1)*(180+Math.random()*200)).toFixed(0)}deg)`, opacity:0 }],
      { duration:420+Math.random()*160, easing:'cubic-bezier(.5,0,.8,.6)', fill:'forwards' });
    an.onfinish=()=>im.remove(); setTimeout(()=>im.remove(), 900);
  }
}
/* ══ 延時＝噴毒（卡上 `delayVenom:true`，ver -2533，Ray：「蜈蚣的延時是往前噴綠色毒液 一秒後綠色毒液由左向右襲向全畫面
   並污損數字盤使數字部份被遮住 清盤才解除」）══
   ① 0～600ms 從頭部往機頭方向噴出一股毒液（出畫面）② VENOM_WAVE_AT 起毒液由左往右刷過整個 #app（含控制區）
   回傳「刷到玩家那一刻」—— combat 照它延後扣血、再污損數字盤（combat.venomBoard）。同 skyScaleRain 的延後法。 */
const VENOM_WAVE_AT=1000, VENOM_SWEEP_MS=520, VENOM_HIT_AT=VENOM_WAVE_AT+Math.round(VENOM_SWEEP_MS*0.55);
export function venomSpit(){
  const app=$('app'), top=$('top'); if(!app || !top) return 0;
  const ar=app.getBoundingClientRect(), W=ar.width, H=ar.height;
  const cv=document.createElement('canvas'); cv.className='venom-fx';
  const dpr=Math.min(2, window.devicePixelRatio||1); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
  app.appendChild(cv);
  const cx=cv.getContext('2d'); cx.setTransform(dpr,0,0,dpr,0,0);
  const en=curCard(), f=fwdOf(en), rnd=(a,b)=>a+Math.random()*(b-a);
  const el=(idleEl && idleEl.isConnected) ? idleEl : $('enemyImg'), r=el.getBoundingClientRect();
  const hx=(f<0 ? r.left+r.width*0.12 : r.right-r.width*0.12)-ar.left, hy=r.top+r.height*0.6-ar.top;   // 頭：機頭那一端、身體中段偏下
  const P=[];
  for(let i=0;i<46;i++){ const sp=rnd(0.9,1.9), ang=rnd(-0.32,0.22);   // ① 噴：一股往前（機頭方向）的毒液，略往下墜
    P.push({ x:hx, y:hy, vx:f*Math.cos(ang)*sp, vy:Math.sin(ang)*sp, g:0.0012, s:rnd(3,8), t0:i*11, life:rnd(420,640) }); }
  /* ② 毒雨（-2535，Ray：「太卡通了，參考樹寄龍的鱗雨，綠色毒雨」）：同鱗雨那一套 —— 一滴一滴陸續射進來（散在約 0.55 秒裡）、
     有快有慢、像子彈，只是方向由左往右、形狀是拉長的黏液滴（半透明，頭亮尾淡） */
  for(let i=0;i<95;i++){ const sp=rnd(4.2,7.5), ang=rnd(0.12,0.42);   // 往右略下
    P.push({ rain:true, x:rnd(-W*0.45, -W*0.02), y:rnd(-H*0.15, H*0.95), vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp, rot:ang,
      s:rnd(10,22), t0:VENOM_WAVE_AT-160+Math.pow(Math.random(),0.8)*VENOM_SWEEP_MS, life:rnd(200,330) }); }
  const t0=performance.now();
  const draw=now=>{ if(!cv.isConnected) return;
    const t=now-t0; cx.clearRect(0,0,W,H); let alive=false;
    for(const p of P){ const u=t-p.t0; if(u<0 || u>p.life){ if(u<0) alive=true; continue; } alive=true;
      if(p.rain){ const x=p.x+p.vx*u, y=p.y+p.vy*u, a=Math.min(1,u/20)*Math.min(1,(p.life-u)/70);
        cx.save(); cx.translate(x,y); cx.rotate(p.rot); cx.globalAlpha=a;
        cx.fillStyle='rgba(120,205,70,.34)'; cx.beginPath(); cx.moveTo(-p.s*4.2,0); cx.quadraticCurveTo(-p.s*1.4,-p.s*0.34,0,-p.s*0.3); cx.lineTo(0,p.s*0.3); cx.quadraticCurveTo(-p.s*1.4,p.s*0.34,-p.s*4.2,0); cx.closePath(); cx.fill();   // 曳尾：由滴的寬度收成尖
        cx.fillStyle='rgba(118,214,64,.72)'; cx.beginPath(); cx.ellipse(0,0,p.s*0.7,p.s*0.32,0,0,6.283); cx.fill();   // 黏液滴
        cx.fillStyle='rgba(225,255,200,.7)'; cx.beginPath(); cx.ellipse(p.s*0.2,-p.s*0.1,p.s*0.24,p.s*0.08,0,0,6.283); cx.fill();   // 反光
        cx.restore(); continue; }
      const x=p.x+p.vx*u, y=p.y+p.vy*u+p.g*u*u, a=Math.min(1,u/60)*Math.min(1,(p.life-u)/160)*0.8;   // 噴：半透明的黏液滴，順著飛的方向拉長
      cx.save(); cx.translate(x,y); cx.rotate(Math.atan2(p.vy+2*p.g*u, p.vx)); cx.globalAlpha=a;
      cx.fillStyle='rgba(96,186,52,.75)'; cx.beginPath(); cx.ellipse(0,0,p.s*1.3,p.s*0.5,0,0,6.283); cx.fill();
      cx.fillStyle='rgba(225,255,200,.55)'; cx.beginPath(); cx.ellipse(p.s*0.35,-p.s*0.15,p.s*0.35,p.s*0.12,0,0,6.283); cx.fill();
      cx.restore(); }
    if(alive) requestAnimationFrame(draw); else cv.remove(); };
  requestAnimationFrame(draw);
  try{ SFX.play(asset('se_enemy_centipi'), sfxGain('se_enemy_centipi')*0.7); }catch(_){}
  /* 毒雨擊中：同鱗雨的一串子彈飛行音，壓低一點音高（黏液比鱗片鈍） */
  const WH=(en||{}).rainSe || [];   // 卡上 rainSe（戰鬥的音效預載掃得到它）
  if(WH.length) for(let i=0;i<14;i++){ const k=WH[(Math.random()*WH.length)|0], at=VENOM_WAVE_AT-100+Math.pow(Math.random(),0.9)*VENOM_SWEEP_MS;
    setTimeout(()=>{ try{ SFX.playRate(asset(k), sfxGain(k)*0.5, 0.62+Math.random()*0.4); }catch(_){} }, at); }
  return VENOM_HIT_AT;
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
  if(castMode(en)){ groundShadow.hide(sh); startShadowFollow(); shadowFollowSrc=''; return; }   // 程式投影接手（ver -2841 起全體預設）
  groundShadow.place(eImg, sh);
}
/* 卡上 `shadowFollow:1`（ver -2837，索菈娜）：影子跟著**畫面上那一格動畫**走（待機／攻擊／閃避／格擋都是 .en-idle 那一層換 src），
   腳寬與位置逐格量（groundShadow.placeOnFrame）—— 姿勢一變影子就跟著大小變、閃避與撲近的位移也跟著走。
   每一幀只在那一格的 src 換掉時才擺一次（rAF 裡比對 src，沒換就什麼都不做）；換怪／收場時 shadowCard 沒有這一格就停。 */
let shadowFollowRaf=0, shadowFollowSrc='', shadowBase=null;
/* ⚠⚠ **敵影預設＝程式投影**（ver -2841，Ray：「很好 以後敵影都這樣做」）：剪影塗黑、壓扁斜倒在地上、腳底接著原圖，跟著每一格動畫走。
   例外照舊走腳底橢圓／不畫：卡上 `noShadow`、飛行與船（NO_SHADOW_KINDS）、群體敵人（各人自己的影子）、卡上 `shadowFollow:0`（明寫不要投影）或 `shadowFollow:1`（腳底橢圓跟格）。
   卡上 `castShadow:{squash, skew}` 調壓扁幾成與斜的角度（預設 0.3／-38°）。 */
function castMode(en){ return !!en && !en.noShadow && !NO_SHADOW_KINDS[en.kind] && !en.group && en.shadowFollow!==0 && en.shadowFollow!==1; }
let shadowFollowLast=0;
function shadowFollowTick(now){
  shadowFollowRaf=0;
  const en=shadowCard; if(!en || !(castMode(en) || en.shadowFollow===1) || state.over) { shadowFollowSrc=''; const s0=$('enemyShadow'); if(s0){ s0.style.transition=''; s0.style.transform=''; } const c0=$('enemyCast'); if(c0) c0.remove(); return; }
  shadowFollowRaf=requestAnimationFrame(shadowFollowTick);
  if(document.hidden || (now||0)-shadowFollowLast<33) return; shadowFollowLast=now||0;   // 上限每秒 30 次（手機發熱，鐵律 12）
  const top=$('top'), sh=$('enemyShadow'); if(!top || !sh) return;
  let im=[...top.querySelectorAll(':scope > img.en-idle')].reverse().find(x=>x.offsetWidth && x.getAttribute('src') && getComputedStyle(x).visibility!=='hidden' && +getComputedStyle(x).opacity>0.05);
  if(!im && castMode(en)){ const e0=$('enemyImg'); if(e0 && e0.offsetWidth && e0.getAttribute('src') && getComputedStyle(e0).visibility!=='hidden') im=e0; }   // 沒有動畫格（靜態立繪）就投 #enemyImg
  if(!im){ const c0=$('enemyCast'); if(c0) c0.classList.remove('on'); return; }
  const b0=im.getBoundingClientRect(), key=im.getAttribute('src')+'|'+Math.round(b0.left)+'|'+Math.round(b0.top)+'|'+Math.round(b0.width)+'|'+Math.round(b0.height)+'|'+getComputedStyle(im).opacity;   // 外框（含降臨／撲近的 transform）與透明度變了也要重擺
  if(key===shadowFollowSrc) return;
  if(castMode(en)){   // 程式投影（ver -2840）：塗黑的剪影倒在地上、腳底接著原圖；橢圓影子收起來
    let ce=$('enemyCast'); if(!ce){ ce=document.createElement('img'); ce.id='enemyCast'; ce.className='enemy-cast'; ce.alt=''; const e0=$('enemyImg'); if(e0) top.insertBefore(ce, e0); else top.prepend(ce); }
    groundShadow.hide(sh);
    if(groundShadow.castOnFrame(im, ce, top, en.castShadow)) shadowFollowSrc=key;
    return;
  }
  const w=groundShadow.placeOnFrame(im, sh, top, shadowBase || undefined);
  if(w){ shadowFollowSrc=key; if(!shadowBase) shadowBase={ base:w, vary:0.15 }; }   // 第一格（站姿）的腳掌大小當基準，之後只准 ±15%   // 第一格（站姿）的寬當基準；撲近時外框變大，影子照比例一起變大
  sh.style.transition='left .08s linear, top .08s linear, width .08s linear, height .08s linear, transform .08s linear';
}
export function startShadowFollow(){ shadowBase=null; if(!shadowFollowRaf){ shadowFollowSrc=''; shadowFollowRaf=requestAnimationFrame(shadowFollowTick); } }
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
/* ══ 閉棺就清一次記憶體（ver -2595，Ray：「背景跟敵人都改為動畫，內存量佔變高，讓每一次閉棺都清一次內存」）══
   門完全關上那一刻由 combat 叫（每一條閉棺路徑都經過它：結算前關門／城鎮戰中間場原地閉棺／挑戰敗北關門）。
   放掉的是**持有解碼後圖像的參照**：攻擊／延時／點錯／出場動畫格（clipCache）、群戰逐人 I／A／E（memberClips）、
   待機格、單人倒地格、群戰分層與疊在上面的動畫層。參照一斷，瀏覽器就能回收；下一場 setEnemy 會照需要重新載。
   ⚠ 只在門關上之後叫：門還開著時底下的戰鬥畫面還看得到。 */
export function releaseBattleMemory(){
  for(const k of Object.keys(clipCache)) delete clipCache[k];
  memberClips.clear();
  stopIdleLoop();
  clearInterval(groupAnimT); groupAnimT=0;
  singleFall=null;
  stopFlock();
  const g=$('enemyGroup'); if(g){ for(const im of g.querySelectorAll('img')) im.removeAttribute('src'); g.innerHTML=''; }
  groupCard=null; groupMasks={}; lastImpact=null;
}
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
/* ══ 群戰編組（卡上 `group:{ comp:'<鑰匙>' }`，ver -2635，Ray：「做一個編輯器 可以點選放山谷的所有怪進去 然後調整大小跟位置」）══
   資料在 `script/group_comps.js`：每一隻＝一張**原立繪**（resources/enemy/<stem>.webp）＋它在畫布上的縮放與位置（＋翻面／飛行）。
   跟分層圖那一套（`group.dir`＋guard_N）並存：分層圖是「美術排好的整張」，這一套是「照編輯器擺的立繪」——
   每一隻的圖框直接擺成那個矩形（layerMap 一支算，鐵律 7），命中、影子、待機／攻擊動畫全部讀同一份；
   動畫用的就是立繪座標（box 不必再換算）。翻面的那一隻先鏡成一張圖（遮罩跟著鏡），動畫層用 scale -1 1。 */
/* `comp:'@bg'` ＝照**現在這一格的背景**取編組（ver -2639，Ray：「換一個背景應該是空的 直到我把該背景的怪存入」）：
   鑰匙 `bg_<背景基底名>`（去掉時段，例 bg_canyon_corridor）。背景讀 #storyBg（戰鬥中舞台藏著，但那一張還在）。 */
export function bgCompKey(){
  const e=$('storyBg'), p=String((e && e.getAttribute('src'))||'').split('?')[0];
  const f=p.slice(p.lastIndexOf('/')+1).replace(/\.\w+$/,'').toLowerCase().replace(/_(dawn|day|dusk|night|midnight)$/,'');
  return f ? 'bg_'+f : '';
}
function compOf(G){ if(!G || !G.comp) return null; return GROUP_COMPS[G.comp==='@bg' ? bgCompKey() : G.comp] || null; }
export function groupOrder(G){ const c=compOf(G); return c ? c.members.map((_,i)=>i+1) : (G && G.order) || []; }
function compSrc(m){ const u='resources/enemy/'+m.stem+'.webp'; return u+assetVer(u); }
export function groupWarmSrcs(G){ const c=compOf(G); return c ? c.members.map(compSrc) : groupOrder(G).map(n=>G.dir+(G.prefix||'guard_')+n+'.webp'); }
const mirrorCache=new Map();
function mirroredSrc(url){
  if(mirrorCache.has(url)) return mirrorCache.get(url);
  const p=new Promise(res=>{ const i=new Image(); i.onload=()=>{ try{ const c=document.createElement('canvas'); c.width=i.naturalWidth; c.height=i.naturalHeight;
      const x=c.getContext('2d'); x.translate(c.width,0); x.scale(-1,1); x.drawImage(i,0,0); c.toBlob(b=>res(b?URL.createObjectURL(b):url), 'image/webp', 0.92); }catch(_){ res(url); } };
    i.onerror=()=>res(url); i.src=url; });
  mirrorCache.set(url, p); return p;
}
function portraitClip(c, flip){
  const j=c.j, cv=j.canvas||[1024,1536], b=j.box||[0,0,cv[0],cv[1]], x=flip ? cv[0]-(b[0]+b[2]) : b[0];
  return { fr:c.fr, flip:!!flip, body:[(cv[0]/2-x)/b[2], (cv[1]/2-b[1])/b[3]], j:Object.assign({}, j, { box:[x, b[1], b[2], b[3]] }) };
}
function buildGroup(en){
  const g=groupEl(); if(!g) return;
  groupCard = (en && en.group) ? en : null;
  groupMasks={}; lastImpact=null; g.innerHTML='';
  if(!groupCard) return;
  const G=en.group;
  /* 整組一起出場（ver -2047）：冷快取時一個一個冒出來很難看 —— 全部載到才掀（保險 4 秒）。 */
  g.classList.add('eg-wait'); lastAtkIm=null;   // 換一組：不連抽／先攻重新算
  const comp=compOf(G), order=groupOrder(G);
  let left=order.length+(G.cover?1:0); const done=()=>{ if(--left<=0) g.classList.remove('eg-wait'); };
  clearTimeout(groupWaitT); groupWaitT=setTimeout(()=>g.classList.remove('eg-wait'), 4000);
  /* 掩體（ver -2061，聖索菲亞惡棍群戰）：`group.cover` ＝一層**最底下**的掩體（木桶／石柱／馬車…），
     不算人頭、打不到、不會倒；戰鬥背景照舊是城鎮那一張。人層已依原圖剪掉被擋的部分，疊在它上面。 */
  if(G.cover){ const cv=document.createElement('img'); cv.className='eg-cover'; cv.alt='';
    cv.onload=cv.onerror=done; cv.src=G.cover; g.appendChild(cv); }
  const pre=G.prefix||'guard_', shadow=G.shadow!==false;
  for(const n of order){
    const im=document.createElement('img'); im.className='eg-guard'; im.dataset.n=n; im.alt='';
    const cm=comp && comp.members[n-1];
    if(cm){ im._pm={ k:cm.k, ox:cm.x, oy:cm.y, cv:comp.canvas||[1536,1024], focus:!!cm.focus }; im._flip=!!cm.flip;
      if(cm.air || ENEMY_FLY.includes(cm.stem)) bobOn(im); }
    /* 接地陰影：每個人一顆（ver -2045，Ray：「他們是不是沒給影子啊」）——
       美術的人物層是去背的、不帶影子；量腳與擺位照舊走 `groundShadow.place`（鐵律 8）。
       影子全部排在人之前（DOM 序＝圖層）：後排的人也該站在前排的影子之上。 */
    /* ⚠ `group.shadow:false` ＝不畫（人站在掩體後面、腳被剪掉了：量到的「腳」是掩體頂端，影子會浮在木桶上）。 */
    /* `group.noShadow:[n…]` ＝這幾層不畫接地影子（飛在空中的，ver -2164：卡耶爾的骨鴉）。 */
    if(shadow && !(cm ? cm.air : (G.noShadow && G.noShadow.includes(n)))){ const sh=document.createElement('div'); sh.className='ground-shadow eg-shadow';
      g.insertBefore(sh, g.querySelector('.eg-guard')); im._sh=sh; }
    im.onload=()=>{ syncMemberFit(im); placeMember(im); buildMask(im); if(im._sh) groundShadow.place(im, im._sh); done(); };
    im.onerror=done;
    if(cm){ const u=compSrc(cm); if(cm.flip) mirroredSrc(u).then(v=>{ if(groupCard===en) im.src=v; }); else im.src=u;
      /* 動畫照立繪檔名查 ENEMY_* 表（同單隻怪，鐵律 7），box 本來就是立繪座標 */
      im._mem={ stem:cm.stem };
      const di=idleDirOf(ENEMY_IDLE[cm.stem]); if(di) loadMemberClip(di).then(c=>{ if(c && groupCard===en){ im._idle=portraitClip(c, cm.flip); showMemberAnim(im); } });
      for(const [key, tab] of MEMBER_ACTS){ const a=tab[cm.stem]; if(a && a.dir) loadMemberClip(a.dir).then(c=>{ if(c && groupCard===en) im[key]=Object.assign(portraitClip(c, cm.flip), { spec:a }); }); }
      g.appendChild(im); continue; }
    im.src=G.dir+pre+n+'.webp';
    /* 中槍倒下（ver -2062，動畫交件 56d17af4）：`group.fall` ＝倒地動畫的資料夾，每人一組 `<prefix><n>/frame_00..` ＋ anim.json
       （canvas＝分層畫布、box＝這人 5 格在畫布上的位置、kind＝back／forward／prone）。開場就抓（每場只有幾個人、一人 5 格）。 */
    if(G.fall){ const base=G.fall+pre+n+'/';
      fetch(base+'anim.json').then(r=>r.ok?r.json():null).then(j=>{
        if(!j || groupCard!==en) return;
        im._fall={ j, frames:Array.from({length:j.frames||0},(_,i)=>{ const f=new Image(); f.src=base+'frame_'+String(i).padStart(2,'0')+'.webp'; return f; }) };
      }).catch(()=>{}); }
    if(G.idle) loadMemberClip(G.idle+pre+n+'/').then(c=>{ if(c && groupCard===en){ im._idle=c; showMemberAnim(im); } });
    if(G.atk)  loadMemberClip(G.atk+pre+n+'/').then(c=>{ if(c && groupCard===en) im._atk=c; });
    /* 受擊播倒地前兩格（ver -2620，見 memberHitFx）：只有疊了待機層的人用得到，同一份快取（preloadGroupCard 已暖過）。 */
    if(G.fall && G.idle) loadMemberClip(G.fall+pre+n+'/').then(c=>{ if(c && groupCard===en) im._fallc=c; });
    /* 照原立繪生成的逐人動畫（ver -2623，見 memberOf）：待機／攻擊／延時／點錯照 stem 查 config 的 ENEMY_* 表（鐵律 7：同一張表）。 */
    const M=memberOf(G, n);
    if(M){ im._mem=M;
      const di=idleDirOf(ENEMY_IDLE[M.stem]); if(di) loadMemberClip(di).then(c=>{ if(c && groupCard===en){ im._idle=mapClip(c, M); showMemberAnim(im); } });
      for(const [key, tab] of MEMBER_ACTS){ const a=tab[M.stem]; if(a && a.dir) loadMemberClip(a.dir).then(c=>{ if(c && groupCard===en) im[key]=Object.assign(mapClip(c, M), { spec:a }); }); }
    }
    g.appendChild(im);
  }
  startGroupAnim();
}
/* ══ 群戰逐人的待機／攻擊（卡上 `group.idle`／`group.atk`，ver -2581，空賊 8 組 28 人）══
   每個人一組 `<prefix><n>/frame_XX.webp＋anim.json`（box 是分層畫布座標，同倒地）。
   畫在分層上面的一張 `.eg-anim`（分層本身留著、只是看不見：落點判定、影子、倒地都照舊用它）。
   · 待機：一支 setInterval 推全部人（各自的 fps，每人錯開幾格）。
   · 攻擊（onAssaultLand）：隨機挑一個還站著的人，順放 A（槍口火光由程式畫在 `group.flashFrame` 那一格），
     再倒放回去（R＝A 倒放，Ray），回待機。回傳開槍那一刻（扣血照它延後）。 */
const memberClips=new Map();   // 資料夾 → Promise（同一組預載過就不再抓第二次）
function loadMemberClip(dir){
  if(memberClips.has(dir)) return memberClips.get(dir);
  const p=loadMemberClipRaw(dir); memberClips.set(dir, p); p.then(c=>{ if(!c) memberClips.delete(dir); }); return p;
}
/* 先把一張群戰卡的逐人 I／A／E 抓下來（ver -2589：空賊船射勾索那一刻就預載要登艦的那一組，10 秒後換卡時多半已經載好） */
export function preloadGroupCard(key){
  const en=(GAME_CONFIG.enemies||{})[key], G=en && en.group; if(!G) return;
  const pre=G.prefix||'guard_';
  const comp=compOf(G);
  if(comp){ for(const m of comp.members){ const u=compSrc(m); if(m.flip) mirroredSrc(u); else { const im=new Image(); im.src=u; }
      const di=idleDirOf(ENEMY_IDLE[m.stem]); if(di) loadMemberClip(di); for(const [, tab] of MEMBER_ACTS){ const a=tab[m.stem]; if(a && a.dir) loadMemberClip(a.dir); } }
    return; }
  for(const n of G.order){
    if(G.idle) loadMemberClip(G.idle+pre+n+'/');
    if(G.atk)  loadMemberClip(G.atk+pre+n+'/');
    if(G.fall) loadMemberClip(G.fall+pre+n+'/');   // 倒地走 buildGroup 自己的讀法，這裡只是把圖暖進快取
    { const M=memberOf(G, n); if(M){ const di=idleDirOf(ENEMY_IDLE[M.stem]); if(di) loadMemberClip(di); for(const [, tab] of MEMBER_ACTS){ const a=tab[M.stem]; if(a && a.dir) loadMemberClip(a.dir); } } }
    { const im=new Image(); im.src=G.dir+pre+n+'.webp'; }
  }
}
function loadMemberClipRaw(dir){
  return fetch(dir+'anim.json').then(r=>r.ok?r.json():null).then(j=>{ if(!j) return null;
    const fr=Array.from({length:j.frames||0},(_,i)=>{ const f=new Image(); f.src=dir+'frame_'+String(i).padStart(2,'0')+'.webp'; return f; });
    return Promise.all(fr.map(f=>f.decode ? f.decode().catch(()=>{}) : 0)).then(()=> (fr.length && fr.every(f=>f.naturalWidth)) ? { j, fr } : null);
  }).catch(()=>null);
}
/* 飛行怪上下晃（ver -2647）：分層與疊在上面的動畫層（`_ov`）都掛 `.eg-bob`、同一個相位 —— 用 CSS 的獨立 `translate` 屬性晃，
   不碰 transform（攻擊拉到中間、一閃的歸位都用 transform，疊得起來）。每隻相位錯開。 */
/* ⚠ 相位走 CSS 變數 `--bob-d`，不寫 inline 的 animation-delay —— 那會一起套到受擊抖動／淨化消失（.eg-hit／.eg-purge）上，負的 delay 會讓它們一開始就播完。 */
function bobOn(im){ im._bob=-(Math.random()*2.4).toFixed(2)+'s'; im.classList.add('eg-bob'); im.style.setProperty('--bob-d', im._bob); }
function bobOv(im, ov){ if(im._bob){ ov.classList.add('eg-bob'); ov.style.setProperty('--bob-d', im._bob); } return ov; }
function showMemberAnim(im){
  if(im.classList.contains('eg-down') || im.classList.contains('eg-leaving')) return;
  if(!im._ov){ const ov=document.createElement('img'); ov.className='eg-anim'; ov.alt=''; im.after(ov); im._ov=bobOv(im, ov); }
  placeOnLayer(im._ov, im, im._idle.j); im._ov.style.scale=im._idle.flip?'-1 1':''; im._ov.src=im._idle.fr[0].src; im.style.opacity='0';
}
function dropMemberAnim(im){ if(im._ov){ im._ov.remove(); im._ov=null; } im._acting=false; im.style.opacity=''; }
let groupAnimT=0;
function startGroupAnim(){
  clearInterval(groupAnimT); groupAnimT=0;
  const G=groupCard && groupCard.group; if(!G || !(G.idle || GROUP_MEMBERS[G.dir] || compOf(G))) return;
  const t0=performance.now();
  groupAnimT=setInterval(()=>{ const g=$('enemyGroup'); if(!g || !groupCard){ clearInterval(groupAnimT); groupAnimT=0; return; }
    const t=performance.now()-t0;
    for(const im of g.querySelectorAll('.eg-guard')){ const c=im._idle; if(!c || !im._ov || im._acting) continue;
      im._ov.src=c.fr[Math.floor(t*(c.j.fps||8)/1000+(+im.dataset.n||0)*3)%c.fr.length].src; }
  }, 1000/12);
}
/* ══ 照原立繪生成的逐人動畫（ver -2623，卡耶爾；-2622 的 `group.acts` 併進來）══
   群戰的分層是「某一隻怪的立繪縮放、位移（可能左右翻）排上去的」，而逐隻的動畫是用**原立繪**生成的（box 是立繪畫布座標）。
   `script/group_members.js`（`tools/group_member_map.py` 比 alpha 量出來的，鐵律 7：一處算）告訴我們每一層是誰（stem）、
   怎麼換到分層畫布（map:[k,ox,oy,flip]）—— 載進來的那一刻就把 box 換好（mapClip），之後跟空賊那一套走同一條播放路。
   動作（A／D／M）一支到底：疊到**整組最上層**（撲向鏡頭時蓋過前排）、打到＝表上的 `hit`、播完切回待機
   （沒有待機的人播的時候才疊一張、播完拿掉）。表上 `rev:true` ＝播到底停一秒後倒放回中立（Ray 11-15「鐵衣 R＝倒放」）。
   ⚠ 點錯沒有 M 的人借 D（同單人的 clipFor）。 */
const MEMBER_ACTS=[['_atk', ENEMY_ATK], ['_dly', ENEMY_DELAY], ['_mis', ENEMY_MISS]];
const REV_HOLD_SEC=1;   // 交件單：片尾 B 有快剪補的停格約 1 秒 —— 倒放從停格之前那一格起算
function memberOf(G, n){ const t=GROUP_MEMBERS[G && G.dir]; return (t && t[n]) || null; }
function mapClip(c, M){
  const j=c.j, cv=j.canvas||[1024,1536], b=j.box||[0,0,cv[0],cv[1]], m=M.map, x=m[3] ? cv[0]-(b[0]+b[2]) : b[0];
  const B=[x*m[0]+m[1], b[1]*m[0]+m[2], b[2]*m[0], b[3]*m[0]];
  /* body＝怪本體（原立繪畫布那一塊）的中心在片框裡的比例（畫面上看到的位置，翻面已算進 B）—— 攻擊時拉到畫面中間用 */
  const body=[(m[1]+cv[0]*m[0]/2-B[0])/B[2], (m[2]+cv[1]*m[0]/2-B[1])/B[3]];
  return { fr:c.fr, flip:!!m[3], body, j:Object.assign({}, j, { canvas:M.canvas, box:B }) };
}
function memberActOnce(g, im, A){
  const J=A.j, N=A.fr.length, fps=J.fps||24, sp=A.spec||{};
  if(sp.issen && A===im._atk) return memberIssen(g, im, A);
  const hit=Math.max(0, Math.min(N-1, sp.strikes ? Math.max(...sp.strikes) : sp.hit!=null ? sp.hit : N-1));
  lastActIm=im;
  const own=!im._ov; let ov=im._ov;
  if(own){ ov=document.createElement('img'); ov.className='eg-anim'; ov.alt=''; im._ov=bobOv(im, ov); }
  g.appendChild(ov);                                   // 最上層
  im._acting=true; im._actJ=J; placeOnLayer(ov, im, J); ov.style.scale=A.flip?'-1 1':''; ov.src=A.fr[0].src; im.style.opacity='0';
  /* 編組成員（`_pm`）預設攻擊**原地演**，勾了「攻擊時拉到中間」（`focus`）才拉（ver -2640，Ray：「全部預設不跑中」）；
     舊的分層群組（沒有 `_pm`）照舊一律拉。 */
  const fill = (A===im._atk && (!im._pm || im._pm.focus)) ? attackFocusAnim(g, ov, N*1000/fps, hit*1000/fps, !!sp.fillFrame, A.body) : null;   // 只有攻擊 A 拉到中間（D／M 原地演）
  windupSe(sp.windupSe, sp.windupMs, ()=>groupCard && !im.classList.contains('eg-down'), sp.windupFit);
  stepSes(sp, fps, ()=>im._ov===ov && !!groupCard && !im.classList.contains('eg-down'));
  if(sp.retractSe && sp.retractAt!=null && !sp.rev) setTimeout(()=>{ if(im._ov===ov && groupCard && !im.classList.contains('eg-down')) windupSe(sp.retractSe); }, sp.retractAt*1000/fps);   // 片子自帶收回：收回音在那一格放（`retractAt`，ver -2720）
  if(sp.flame) setTimeout(()=>{ if(im._ov===ov && groupCard && !im.classList.contains('eg-down')) spawnFlame(ov, sp.flame, fps, ()=>im._ov===ov && !!groupCard); }, sp.flame.from*1000/fps);
  const fxKey = sp.hitFx || (A===im._atk ? cardAssaultKey() : null);   // 攻擊片（含代演 D／M）＝攻擊那一套受擊（ver -2678）
  if(fxKey){ actFx={ key:fxKey, im, at:performance.now()+hit*1000/fps };   // 這一擊用牠自己的受擊特效（見 showHitFx 上面）
    for(const f of (sp.strikes||[])) if(f<hit) setTimeout(()=>{ if(im._ov===ov && groupCard && !im.classList.contains('eg-down')) strikeFx(fxKey); }, f*1000/fps); }
  let i=0, dir=1;
  const end=()=>{ clearInterval(t); im._acting=false; im._actJ=null; if(fill) fill.cancel();
    if(own){ ov.remove(); im._ov=null; im.style.opacity=''; }
    else { im.after(ov); ov.style.scale=im._idle.flip?'-1 1':''; ov.src=im._idle.fr[0].src; placeOnLayer(ov, im, im._idle.j); } };
  const t=setInterval(()=>{
    if(im._ov!==ov || !groupCard || im.classList.contains('eg-down')){ clearInterval(t); return; }
    if(dir>0){ if(++i<N){ if(sp.skip && i===sp.skip[0]) i=sp.skip[1]; ov.src=A.fr[i].src; return; }   // `skip:[a,b]`＝播到 a 直接跳 b（剪掉片中段的定格，ver -2685）
      if(!sp.rev){ end(); return; }
      dir=-1; i=Math.max(0, N-1-Math.round(REV_HOLD_SEC*fps)); windupSe(sp.retractSe); }   // 收回音（`retractSe`，ver -2680）：倒放收回那一刻放
    if(--i>=0){ ov.src=A.fr[i].src; return; }
    end();
  }, 1000/fps);
  return Math.round(hit*1000/fps);
}
/* ══ 一閃（ENEMY_ATK 的 `issen:true`；ver -2641 起，-2646 Ray 命名：「以後這個攻擊模式就叫一閃」「歸位另算」）══
   一閃＝攻擊本身：① 原地播片（殘影消失，最後幾格主體全空）→ 這一層藏起來
   ② 一條刀斬的光線以隨機角度穿過敵人區中心，一閃就消失 —— 光線閃到滿的那一刻＝打到（回傳值，扣血照它延後）
      （Ray：「攻擊是一條光線閃過消失 像被刀斬」「線要一閃就消失 角度隨機 不要黑影 不要有其他的受擊特效」）
      ⇒ 這一擊打到時不放受擊特效／紅閃／受擊音，只留畫面震動（combat 問 `takeIssenHit()`，同卡上的 `hitPlain`）。
   **歸位另算**：一閃之後怎麼回到原位，看同一列的 `home`（表在 ISSEN_HOME；沒寫＝原地淡回）。
   · `home:'dive'` ＝ 從畫面上方略斜快速飛回、衝過原位一點再拉回，飛的時候翅膀照拍（待機加速播）
     （Ray：「要快速飛回 過頭 拉回」「飛回時翅膀也要拍」「統一從上面略斜飛回」）。 */
const ISSEN_GAP_MS=110, ISSEN_SLASH_MS=170, ISSEN_SLASH_IN=0.2, ISSEN_HIT_WIN=400;
const HOME_DIVE_MS=520, HOME_DIVE_OVER=0.22, HOME_FLAP=2, HOME_DIVE_TILT=[0.17, 0.42], HOME_FADE_MS=220;
let issenHitAt=0;
/* 這一擊是不是殘影瞬移的那一刀（打到那一刻 ±ISSEN_HIT_WIN 毫秒內，問一次就用掉）—— 被完美防禦掉的話窗口自己過期 */
export function takeIssenHit(){ const ok=issenHitAt && Math.abs(performance.now()-issenHitAt)<ISSEN_HIT_WIN; if(ok) issenHitAt=0; return !!ok; }
function memberIssen(g, im, A){
  const J=A.j, N=A.fr.length, fps=J.fps||24;
  const own=!im._ov; let ov=im._ov;
  if(own){ ov=document.createElement('img'); ov.className='eg-anim'; ov.alt=''; im._ov=bobOv(im, ov); }
  g.appendChild(ov);
  im._acting=true; im._actJ=J; placeOnLayer(ov, im, J); ov.style.scale=A.flip?'-1 1':''; ov.src=A.fr[0].src; im.style.opacity='0';
  const tOut=N*1000/fps, ang=Math.random()*Math.PI*2, dir={ x:Math.cos(ang), y:Math.sin(ang) };
  const alive=()=> im._ov===ov && groupCard && !im.classList.contains('eg-down');
  let i=0;
  const t=setInterval(()=>{
    if(!alive()){ clearInterval(t); return; }
    if(++i<N){ ov.src=A.fr[i].src; return; }
    clearInterval(t); ov.style.visibility='hidden';
    setTimeout(()=>{ if(alive()){ issenSlash(g, ang); const se=(A.spec||{}).issenSe; if(se) SFX.play(asset(se), sfxGain(se)); } }, ISSEN_GAP_MS);   // `issenSe`＝刀光閃過那一刻的音（ver -2726，聖面鷲爪擊音）
    setTimeout(()=>{ if(alive()) issenHome(g, im, ov, own, A); }, ISSEN_GAP_MS+ISSEN_SLASH_MS);
  }, 1000/fps);
  const hit=Math.round(tOut+ISSEN_GAP_MS+ISSEN_SLASH_MS*ISSEN_SLASH_IN);   // 光線閃到滿的那一刻＝打到
  issenHitAt=performance.now()+hit;
  return hit;
}
/* 刀斬的光線：一條細亮線穿過畫面中心從入口那一端閃到出口那一端，滿了就變細、淡掉。
   外層繞畫面中心轉到那個角度，內層從入口端（左端）伸長 —— 兩件事分兩層才不會互相帶偏。 */
function issenSlash(g, ang){
  const gr=g.getBoundingClientRect(); if(!gr.width) return;
  const L=Math.hypot(gr.width, gr.height)*1.1, th=Math.max(3, gr.width*0.012);
  const w=document.createElement('div'); w.className='eg-anim eg-issen';
  w.style.cssText=`left:${gr.width/2-L/2}px;top:${gr.height/2-th/2}px;width:${L}px;height:${th}px;transform:rotate(${ang}rad);`;
  const ln=document.createElement('div'); ln.className='eg-slash'; w.appendChild(ln); g.appendChild(w);
  const a=ln.animate([{ transform:'scaleX(0) scaleY(1)', opacity:1, offset:0 }, { transform:'scaleX(1) scaleY(1)', opacity:1, offset:ISSEN_SLASH_IN },
    { transform:'scaleX(1) scaleY(0.15)', opacity:0, offset:1 }], { duration:ISSEN_SLASH_MS, easing:'ease-out', fill:'both' });
  a.onfinish=()=>w.remove(); setTimeout(()=>w.remove(), ISSEN_SLASH_MS+200);
}
/* 歸位：先把這一層換回待機的樣子放回原位（看得見），再照 `home` 演進場；演完接回待機。 */
const ISSEN_HOME={ dive:homeDive, fade:homeFade };
function issenHome(g, im, ov, own, A){
  let flapT=0;
  const end=()=>{ clearInterval(flapT); im._acting=false; im._actJ=null;
    if(own){ ov.remove(); im._ov=null; im.style.opacity=''; }
    else { im.after(ov); ov.style.scale=im._idle.flip?'-1 1':''; ov.src=im._idle.fr[0].src; placeOnLayer(ov, im, im._idle.j); } };
  if(im._idle){ ov.src=im._idle.fr[0].src; placeOnLayer(ov, im, im._idle.j); ov.style.scale=im._idle.flip?'-1 1':''; }
  else ov.src=A.fr[0].src;
  ov.style.visibility='';
  const gr=g.getBoundingClientRect();
  if(!ov.animate || !gr.width){ end(); return; }
  const a=(ISSEN_HOME[(A.spec||{}).home] || homeFade)(g, im, ov, gr, id=>{ flapT=id; });
  a.onfinish=a.oncancel=end;
}
function homeFade(g, im, ov){ return ov.animate([{ opacity:0 }, { opacity:1 }], { duration:HOME_FADE_MS }); }
/* dive：從上方略斜飛回 —— 起點＝原位沿 dir（正上方往左或往右偏 HOME_DIVE_TILT 弧度）推到畫面外；衝過原位 HOME_DIVE_OVER 個身長再拉回 */
function homeDive(g, im, ov, gr, setFlap){
  const tilt=(HOME_DIVE_TILT[0]+Math.random()*(HOME_DIVE_TILT[1]-HOME_DIVE_TILT[0]))*(Math.random()<0.5?-1:1), dir={ x:Math.sin(tilt), y:-Math.cos(tilt) };
  const br=ov.getBoundingClientRect(), D=Math.hypot(gr.width, gr.height)/2+Math.max(br.width, br.height), O=Math.max(br.width, br.height)*HOME_DIVE_OVER;
  const fx=String(ov.style.scale||'').trim().startsWith('-') ? -1 : 1;
  /* 翅膀照拍：待機那一支加速播（HOME_FLAP 倍） */
  if(im._idle){ const c=im._idle; let f=0; setFlap(setInterval(()=>{ f=(f+1)%c.fr.length; ov.src=c.fr[f].src; }, 1000/((c.j.fps||24)*HOME_FLAP))); }
  return ov.animate([
    { transform:`translate(${dir.x*D*fx}px, ${dir.y*D}px) scale(1.25)`, opacity:0.7, offset:0, easing:'cubic-bezier(.25,.8,.45,1)' },
    { transform:`translate(${-dir.x*O*fx}px, ${-dir.y*O}px) scale(0.97)`, opacity:1, offset:0.55, easing:'ease-in-out' },
    { transform:'none', opacity:1, offset:1 }], { duration:HOME_DIVE_MS });
}
/* ══ 攻擊時拉到畫面中間（ver -2625，Ray：「攻擊的怪要往畫面中間拉近」）＋放大到貼框（`fillFrame:true`，Ray：「出框的就讓敵在攻時放大到貼框」）══
   群戰成員演 A 的期間：把這一層的片框（box）中心移到敵人區（#top）的中心；表上寫 `fillFrame` 的，再放大到片框蓋滿敵人區
   （Kling 16:9 的片撲到鏡頭前會被片框切掉 ⇒ 硬邊落到畫面外；本來就蓋滿＝不放大）。位移與倍率都現算（鐵律 7）。
   時間：一開始就快速移過去（FOCUS_IN_MS），撐到片尾前 FOCUS_OUT_MS 再快速退回原位 —— 片頭片尾是中立，跟待機接得上。
   ⚠ 翻面用的 `scale` 屬性是在 transform 之後繞中心翻的 ⇒ 翻面那一層的水平位移要取反。 */
const FOCUS_IN_MS=260, FOCUS_OUT_MS=260;
function attackFocusAnim(g, ov, T, tHit, fill, body){
  const top=$('top'); if(!top || !T || !ov.animate) return null;
  const tr=top.getBoundingClientRect(), br=ov.getBoundingClientRect(); if(!br.width || !br.height) return null;
  /* 把「怪本體的中心」P 移到畫面中心 F：畫面上的映射 v → F + k(v−P)。fill 時 k 取「片框四邊都蓋過畫面邊」的最小值。 */
  const P={ x:br.left+br.width*(body?body[0]:0.5), y:br.top+br.height*(body?body[1]:0.5) }, F={ x:(tr.left+tr.right)/2, y:(tr.top+tr.bottom)/2 };
  const need=(f,o,b)=> (o-b)===0 ? 1 : (f-o)/(b-o);   // 要讓 F+k(b−P) 越過畫面邊 f
  const k = fill ? Math.max(1, need(tr.left-F.x+P.x, P.x, br.left), need(tr.right-F.x+P.x, P.x, br.right), need(tr.top-F.y+P.y, P.y, br.top), need(tr.bottom-F.y+P.y, P.y, br.bottom)) : 1;
  /* 換成繞元素中心 c 的 transform：d ＝ F − c − k(P − c) */
  const cx=(br.left+br.right)/2, cy=(br.top+br.bottom)/2, flip=String(ov.style.scale||'').trim().startsWith('-');
  const dx=(F.x-cx-k*(P.x-cx))*(flip?-1:1), dy=F.y-cy-k*(P.y-cy);
  if(Math.abs(dx)<1 && Math.abs(dy)<1 && k<1.001) return null;
  const Z=`translate(${dx}px, ${dy}px) scale(${k})`;
  ov.style.transformOrigin='50% 50%';
  /* 移過去、退回來都要快（Ray：「讓怪置中跟回退都加速」）：各 FOCUS_IN_MS／FOCUS_OUT_MS，移過去最慢也在打到那一格的一半到位 */
  const inAt=Math.min(0.45, Math.min(FOCUS_IN_MS, tHit*0.5)/T), outAt=Math.max(inAt+0.01, 1-FOCUS_OUT_MS/T);
  return ov.animate([{ transform:'none', offset:0, easing:'ease-out' }, { transform:Z, offset:inAt }, { transform:Z, offset:outAt, easing:'ease-in-out' }, { transform:'none', offset:1 }], { duration:T, fill:'none' });
}
const memberLive=im=>!im._acting && !im.classList.contains('eg-down') && !im.classList.contains('eg-leaving');
const memberClipOf=(im, kind)=> kind==='atk' ? im._atk : kind==='miss' ? (im._mis || im._dly) : im._dly;
function groupHas(kind){ const g=$('enemyGroup'); return !!(g && [...g.querySelectorAll('.eg-guard')].some(im=>{ const c=memberClipOf(im, kind); return !!(c && c.spec); })); }   // 只算照原立繪生成的那幾支（空賊那一套照舊不算，行為不變）
/* ══ 誰出手：本職優先、倒了就遞補（ver -2649，Ray：「讓不同怪負責 adm 有競合就隨機」「負責 ADM 的怪死了 那就用遞補接上 由剩下的怪負責 ADM」）══
   · 本職＝手上有這個動作那一支片的怪（A＝攻擊片；D＝延時片；M＝點錯片，沒有就由有延時片的接 —— 同 -2623）。幾隻都有就隨機。
   · 本職還有人站著、只是都在演別的 ⇒ 這一次不演（不搶別人的工作）。
   · 本職**全倒**了 ⇒ 遞補：剩下還站著的怪裡隨機一隻，演牠手上最接近的那一支（ISSEN_SUB 的順序）。
     ⚠ 一閃（issen）的片只在沒有別人可遞補時才拿來代演 D／M —— 它的「打到不放受擊特效」只認攻擊那一刀。
   · 攻擊不連抽同一隻（ver -2650，Ray）：上一次出手攻擊的那隻，下一次攻擊先排除；只剩牠能出手時照樣由牠。
   · 先攻（ENEMY_ATK 的 `first:true`，ver -2652，Ray：「優先讓他先攻」）：這一組的**第一擊**優先由寫了 `first` 的本職出手（站著、空著的話）。
   ⚠ 只管照原立繪生成的那幾支（`spec`）；空賊那一套（分層＋程式火光）照舊（不連抽那一條兩邊都吃）。 */
let lastAtkIm=null;
const notLast=(arr, kind)=>{ if(kind!=='atk' || arr.length<2) return arr;
  if(!lastAtkIm){ const f=arr.filter(im=>{ const c=memberClipOf(im, 'atk'); return c && c.spec && c.spec.first; }); if(f.length) return f; }   // 這一組還沒有人攻擊過 ⇒ 先攻
  const r=arr.filter(im=>im!==lastAtkIm); return r.length ? r : arr; };
const SUB_ORDER={ atk:['_atk','_dly','_mis'], delay:['_dly','_mis','_atk'], miss:['_mis','_dly','_atk'] };
const memberStanding=im=>!im.classList.contains('eg-down') && !im.classList.contains('eg-leaving');
function memberSubClip(im, kind){ for(const k of SUB_ORDER[kind]){ const c=im[k]; if(c && c.spec) return c; } return null; }
/* ══ 輪流出手（ver -2785，Ray：「群戰怪不分 ADM 全部輪流攻擊」）══ 取代 -2649 的「本職優先、遞補」：
   不管這一下是攻擊、延時還是點錯，都照**隊伍順序輪下一隻**（還站著的），由牠演自己手上那一個動作的片
   （沒有那一支就演最接近的，SUB_ORDER）。輪到的那隻正在演別的 ⇒ 往後找下一隻空著的；全都在忙 ⇒ 這一下不演（受擊照舊，busyOwnerFx）。
   · 這一組的第一擊仍由寫了 `first:true` 的那隻先出手（-2652）；`lastAtkIm` 現在記的是「上一個出手的」（不分動作）。 */
function pickGroupActor(g, kind){
  const all=[...g.querySelectorAll('.eg-guard')].filter(memberStanding), able=im=>!!memberSubClip(im, kind);
  const clipOf=im=>{ const c=memberClipOf(im, kind); return (c && c.spec) ? c : memberSubClip(im, kind); };
  if(!all.some(able)) return null;
  if(!lastAtkIm){ const f=all.find(im=>memberLive(im) && im._atk && im._atk.spec && im._atk.spec.first && able(im)); if(f) return { im:f, clip:clipOf(f) }; }
  const i0=lastAtkIm ? all.indexOf(lastAtkIm) : -1;
  for(let k=1;k<=all.length;k++){ const im=all[(Math.max(i0,-1)+k+all.length)%all.length];
    if(able(im) && memberLive(im)) return { im, clip:clipOf(im) }; }
  return null;
}
/* 延時／點錯（playActionClip 從這裡分流給群戰，ver -2623） */
/* 這一下沒有人能演（本職都在演別的）：受擊照樣用本職那一隻的那一套（ver -2682，Ray：「一體適用啊」）——
   不然就掉回群戰卡的通用受擊（鈍擊／em_smack），聽起來像換了一隻怪。打到＝現在（combat 收到 0 就立刻扣）。 */
function busyOwnerFx(g, kind){
  const all=[...g.querySelectorAll('.eg-guard')].filter(memberStanding);
  for(const im of all){ const c=memberClipOf(im, kind) || memberSubClip(im, kind); if(!c || !c.spec) continue;
    const key=c.spec.hitFx || (c===im._atk ? cardAssaultKey() : null); if(key){ actFx={ key, im, at:performance.now() }; lastActIm=im; return; } }
}
function groupAction(kind){
  const g=$('enemyGroup'); if(!g || !groupCard) return 0;
  const p=pickGroupActor(g, kind); if(p){ lastAtkIm=p.im; return memberActOnce(g, p.im, p.clip); }
  busyOwnerFx(g, kind); return 0;
}
function groupAttack(){
  const g=$('enemyGroup'), G=groupCard && groupCard.group; if(!g || !G) return 0;
  if([...g.querySelectorAll('.eg-guard')].some(im=>memberSubClip(im, 'atk'))){ const p=pickGroupActor(g, 'atk'); if(!p){ busyOwnerFx(g, 'atk'); return 0; } lastAtkIm=p.im; return memberActOnce(g, p.im, p.clip); }
  const cand=notLast([...g.querySelectorAll('.eg-guard')].filter(im=>im._atk && im._ov && memberLive(im)), 'atk');
  if(!cand.length) return 0;
  const pick=cand[(Math.random()*cand.length)|0]; lastAtkIm=pick;
  /* `group.muzzle:false`（ver -2620，空賊 v3）＝火光已畫在格子裡，程式不畫；打到＝攻擊的最後一格（每支格數不一定一樣）。 */
  const im=pick, A=im._atk, N=A.fr.length, fps=A.j.fps||16,
        ff = G.muzzle===false ? N-1 : Math.min(N-1, G.flashFrame!=null ? G.flashFrame : 5);
  im._acting=true; placeOnLayer(im._ov, im, A.j);
  let i=0, dir=1; im._ov.src=A.fr[0].src;
  const t=setInterval(()=>{
    if(!im._ov || !groupCard){ clearInterval(t); return; }
    i+=dir;
    if(dir>0 && i===ff && G.muzzle!==false) groupMuzzle(im, A.j);
    if(i>=N-1) dir=-1;
    /* ⚠ 先把圖換回待機再換框（ver -2620，Ray：「攻擊時人會縮一下」）—— 先換框的話攻擊那一格會被畫進待機的小框。 */
    if(i<=0 && dir<0){ clearInterval(t); im._acting=false; if(im._idle){ im._ov.src=im._idle.fr[0].src; placeOnLayer(im._ov, im, im._idle.j); } return; }
    im._ov.src=A.fr[Math.max(0,Math.min(N-1,i))].src;
  }, 1000/fps);
  return Math.round(ff*1000/fps);
}
/* 槍口火光（程式畫，Ray：「開槍火光用程式」）：卡上 `group.muzzle[n]`＝那個人槍口在分層畫布上的點；沒寫就畫在 A 那一格框的上半中段（暫代）。 */
function groupMuzzle(im, j){
  const g=$('enemyGroup'); if(!g) return;
  const G=groupCard.group, cv=j.canvas||[1254,1254], m=layerMap(im, cv[0], cv[1]); if(!m) return;
  const mz=(G.muzzle && G.muzzle[im.dataset.n]) || [j.box[0]+j.box[2]*0.5, j.box[1]+j.box[3]*0.35];
  const x=m.ox+mz[0]*m.k, y=m.oy+mz[1]*m.k, R=Math.max(14, m.k*90);
  const f=document.createElement('div'); f.className='eg-muzzle';
  f.style.cssText=`left:${x-R}px;top:${y-R}px;width:${R*2}px;height:${R*2}px;`;
  g.appendChild(f); setTimeout(()=>f.remove(), 200);
}
/* 取景變了（fit／視窗尺寸）就重擺每個人的影子。 */
function placeGroupShadows(){
  const g=$('enemyGroup'); if(!g || !groupCard) return;
  for(const im of g.querySelectorAll('.eg-guard')){ placeMember(im); if(im._sh) groundShadow.place(im, im._sh);
    if(im._ov){ const j=im._acting ? (im._actJ || (im._atk && im._atk.j)) : (im._idle && im._idle.j); if(j) placeOnLayer(im._ov, im, j); } }   // 待機／攻擊層跟著重擺（-2581）
}
try{ window.addEventListener('resize', ()=>placeGroupShadows()); }catch(_){}
/* ══ 群戰編輯器用（ver -2632，main.js 的「敵立繪編輯 → 群戰」分頁）══ */
export function groupEditInfo(){
  const g=$('enemyGroup'), G=groupCard && groupCard.group; if(!g || !G || compOf(G)) return null;   // 編組的群戰改用 tools/group_editor.html
  const t=GROUP_LAYOUT[G.dir]||{};
  return { dir:G.dir, members:[...g.querySelectorAll('.eg-guard')].map(im=>({ n:im.dataset.n, stem:(memberOf(G, im.dataset.n)||{}).stem||'', v:(im._placeLive||t[im.dataset.n]||[0,0,1]).slice() })) };
}
/* 螢幕上這一點（client 座標）壓在哪一層上：前排先問（同 pickVictim 的順序）。 */
export function groupMemberAt(cx, cy){
  const top=$('top'), g=$('enemyGroup'); if(!top || !g || !groupCard) return null;
  const tr=top.getBoundingClientRect(), x=cx-tr.left, y=cy-tr.top;
  const ims=[...g.querySelectorAll('.eg-guard')];
  for(let i=ims.length-1;i>=0;i--){ const im=ims[i], m=groupMasks[im.dataset.n], uv=toImageUV(x, y, im);
    if(m && uv && uv.u>=0 && uv.u<=1 && uv.v>=0 && uv.v<=1 && m.a[Math.min(m.h-1,(uv.v*m.h)|0)*m.w + Math.min(m.w-1,(uv.u*m.w)|0)] > 96) return im.dataset.n; }
  return null;
}
/* 拖的當下：v＝[左右, 上下, 縮放]（null＝放回存檔的值）。回傳這一層「螢幕 1px ＝ 畫布幾 px」。 */
export function setMemberPlace(n, v){
  const g=$('enemyGroup'); if(!g) return 1;
  const im=g.querySelector('.eg-guard[data-n="'+n+'"]'); if(!im) return 1;
  im._placeLive = v ? v.slice() : null;
  placeGroupShadows();
  const m=layerMap(im, im.naturalWidth||1536, im.naturalHeight||1024);
  return m ? 1/m.base : 1;
}
/* 編輯器選中的那一隻描金邊（null＝全部取消）。 */
export function markMember(n){ const g=$('enemyGroup'); if(!g) return;
  for(const im of g.querySelectorAll('.eg-guard')){ const el=im._ov||im; el.style.filter = (n!=null && im.dataset.n===String(n)) ? 'drop-shadow(0 0 3px #ffd36a) drop-shadow(0 0 1px #ffd36a)' : ''; } }
/* 存檔成功後：寫回記憶體裡那一份，拖的暫存清掉。 */
export function commitGroupLayout(dir, layout){ GROUP_LAYOUT[dir]=layout; const g=$('enemyGroup'); if(g) for(const im of g.querySelectorAll('.eg-guard')) im._placeLive=null; placeGroupShadows(); }
/* 最後一發子彈打在 `#top` 的哪一點（px，#top 相對）。combat 的 gunHitOnEnemy 每一發都記。 */
export function noteImpact(x, y){ lastImpact = (x!=null && y!=null) ? { x, y } : null; }
/* `#top` 上的一點 → 圖上的比例座標（照 object-fit:cover ＋ object-position 換算）。 */
/* ══ 分層畫布 → #enemyGroup 框內的位置（唯一一支，鐵律 7；ver -2581）══
   照那一層**實際的** object-fit（cover 或 contain，卡上 fit.mode 抄過來的）與 object-position 換算。
   ⚠ -2581 之前倒地與落點各自寫死 cover（Math.max）—— contain 的卡（紫月軍、空賊）倒地格與落點都會擺錯位置。 */
function layerMap(im, cw, ch){
  const g=$('enemyGroup'); if(!g) return null;
  const W=g.clientWidth, H=g.clientHeight, cs=getComputedStyle(im);
  /* 卡的取景（fit.mode／pos）記在 dataset（syncMemberFit）—— 被移過的那一層 object-fit 是 fill，不能讀它的 computed。 */
  const fit=im.dataset.fit || cs.objectFit, pos=im.dataset.pos || cs.objectPosition;
  if(im._pm){   // 編組的成員：畫布照卡的取景鋪進來，立繪再照它在畫布上的縮放與位置（ver -2635）
    const C=im._pm.cv, L=(fit==='contain') ? Math.min(W/C[0], H/C[1]) : Math.max(W/C[0], H/C[1]);
    const KW0={ center:0.5, top:0, left:0, bottom:1, right:1 };
    const q=String(pos||'50% 0%').split(/\s+/).map(v=>(v in KW0) ? KW0[v] : parseFloat(v)/100);
    const lox=(W-C[0]*L)*(isNaN(q[0])?0.5:q[0]), loy=(H-C[1]*L)*(isNaN(q[1])?0:q[1]), pk=L*im._pm.k;
    return { k:pk, dw:cw*pk, dh:ch*pk, ox:lox+im._pm.ox*L, oy:loy+im._pm.oy*L, base:L };
  }
  const k=(fit==='contain') ? Math.min(W/cw, H/ch) : Math.max(W/cw, H/ch), dw=cw*k, dh=ch*k;
  const KW={ center:0.5, top:0, left:0, bottom:1, right:1 };
  const p=String(pos||'50% 0%').split(/\s+/).map(v=>(v in KW) ? KW[v] : parseFloat(v)/100);
  const ox=(W-dw)*(isNaN(p[0])?0.5:p[0]), oy=(H-dh)*(isNaN(p[1])?0:p[1]);
  /* 編輯器擺的位置（GROUP_LAYOUT，ver -2632）：畫布上的點 p → 原點 + (p·s + d)·k */
  const P=memberPlaceOf(im);
  if(P){ const sc=P[2]||1; return { k:k*sc, dw:dw*sc, dh:dh*sc, ox:ox+P[0]*k, oy:oy+P[1]*k, base:k }; }
  return { k, dw, dh, ox, oy, base:k };
}
/* ══ 群戰成員的位置與大小（ver -2632，Ray：「讓各怪可以被滑鼠點選拖移縮放」）══
   資料在 `script/group_layout.js`（`[左右, 上下, 縮放]`，分層畫布像素）。被移過的那一層：圖框直接改成移動後的矩形、object-fit:fill
   （不用 transform —— 倒下的 translateY、淨化的 transform-origin 照舊作用在這個框上）；layerMap 讀同一份，所以命中、影子、
   待機／攻擊層全部跟著走（鐵律 7）。`im._placeLive` ＝編輯器拖的當下（還沒存檔）。 */
function memberPlaceOf(im){
  if(im._pm) return null;   // 編組的成員位置在 GROUP_COMPS，不吃這一份
  if(im._placeLive) return im._placeLive;
  const G=groupCard && groupCard.group, t=G && GROUP_LAYOUT[G.dir], v=t && t[im.dataset.n];
  return (v && (v[0] || v[1] || (v[2] && v[2]!==1))) ? v : null;
}
function syncMemberFit(im){
  const e=$('enemyImg');
  im.dataset.fit=(e && e.style.objectFit) || 'cover';
  im.dataset.pos=(e && e.style.objectPosition) || 'center top';
}
function placeMember(im){
  if(!im.naturalWidth) return;
  if(!im.dataset.fit) syncMemberFit(im);
  if(!im._pm && !memberPlaceOf(im)){ im.style.left=im.style.top=im.style.width=im.style.height=''; im.style.objectFit=im.dataset.fit; im.style.objectPosition=im.dataset.pos; return; }
  const m=layerMap(im, im.naturalWidth, im.naturalHeight); if(!m) return;
  im.style.left=m.ox+'px'; im.style.top=m.oy+'px'; im.style.width=m.dw+'px'; im.style.height=m.dh+'px'; im.style.objectFit='fill';
}
/* anim.json 的 box（分層畫布座標）擺到 el 上 */
function placeOnLayer(el, im, j){
  const cw=(j.canvas||[1024,1536])[0], ch=(j.canvas||[1024,1536])[1], b=j.box||[0,0,cw,ch], m=layerMap(im, cw, ch); if(!m) return;
  el.style.left=(m.ox+b[0]*m.k)+'px'; el.style.top=(m.oy+b[1]*m.k)+'px'; el.style.width=(b[2]*m.k)+'px'; el.style.height=(b[3]*m.k)+'px';
}
function toImageUV(x, y, im){
  const g=$('enemyGroup'), top=$('top'); if(!g || !top || !im.naturalWidth) return null;
  const gr=g.getBoundingClientRect(), tr=top.getBoundingClientRect();
  x += tr.left-gr.left; y += tr.top-gr.top;          // 落點是 #top 相對 → 換成這一層的框
  const m=layerMap(im, im.naturalWidth, im.naturalHeight); if(!m) return null;
  return { u:(x-m.ox)/m.dw, v:(y-m.oy)/m.dh };
}
/* 反方向：圖上的比例座標 → `#top` 的百分比（BR 瞄準點用的座標系）。 */
function imageUVToTopPct(u, v, im){
  const g=$('enemyGroup'), top=$('top'); if(!g || !top || !im.naturalWidth) return null;
  const gr=g.getBoundingClientRect(), tr=top.getBoundingClientRect();
  const m=layerMap(im, im.naturalWidth, im.naturalHeight); if(!m) return null;   // ver -2632：讀唯一那一支（以前這裡自己算一次 cover，contain 的卡與被移過的成員都會偏）
  const x=gr.left-tr.left+m.ox+u*m.dw, y=gr.top-tr.top+m.oy+v*m.dh;
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
/* 留到最後才倒（ENEMY_ATK 的 `last:true`，ver -2655，Ray：「那隻怪留到最後死」）：還有別人站著就不挑牠。 */
const lastFaller=im=>!!(im._mem && (ENEMY_ATK[im._mem.stem]||{}).last);
function pickVictim(all){
  if(!all.length) return null;
  const alive = all.length>1 && all.some(im=>!lastFaller(im)) ? all.filter(im=>!lastFaller(im)) : all;
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
  memberHitFx(im);
  return true;
}
/* ══ 群戰的受擊（ver -2620，Ray：「受擊敵人也要閃動」「有倒地動畫的敵人受擊時都放倒地動畫的前兩格再倒放」）══
   ⚠ 有待機動檔的人，畫面上看到的是疊在分層上的 `.eg-anim`（`im._ov`），分層本身是 opacity:0 ——
     所以閃與倒地前兩格都要做在 `_ov` 上（`.eg-hit` 的抖動抖在看不見的那張上）。沒有 `_ov` 的人就閃分層本身。
   倒地前兩格：fall 的 frame 0 → 1 → 1 → 0（每格 42ms），播完換回待機；正在攻擊的那一個不打斷，只閃。 */
function memberHitFx(im){
  const el=im._ov || im;
  el.style.filter='brightness(2.6) saturate(.4)';
  clearTimeout(im._flT1); clearTimeout(im._flT2);
  im._flT1=setTimeout(()=>{ el.style.filter='brightness(1.6)'; }, 60);
  im._flT2=setTimeout(()=>{ el.style.filter=''; }, 140);
  const F=im._fallc;
  if(!im._ov || im._acting || !F || F.fr.length<2) return;
  im._acting=true;
  /* 先換圖再換框（同 groupAttack 收尾那一條）。 */
  im._ov.src=F.fr[0].src; placeOnLayer(im._ov, im, F.j);
  const seq=[1,1,0]; let k=0;
  const t=setInterval(()=>{
    if(!im._ov || !groupCard || im.classList.contains('eg-down')){ clearInterval(t); im._acting=false; return; }
    if(k<seq.length){ im._ov.src=F.fr[seq[k++]].src; return; }
    clearInterval(t); im._acting=false;
    if(im._idle){ im._ov.src=im._idle.fr[0].src; placeOnLayer(im._ov, im, im._idle.j); }
  }, 42);
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
    const m=layerMap(im, im.naturalWidth, im.naturalHeight);   // ver -2632：同上，讀唯一那一支
    /* transform-origin 是元素內座標：被移過的那一層，元素框就是移過的畫布矩形 */
    if(m) im.style.transformOrigin=(m.ox-im.offsetLeft+b.cx*m.dw).toFixed(1)+'px '+(m.oy-im.offsetTop+b.v1*m.dh).toFixed(1)+'px';
    const a=imageUVToTopPct(b.u0, b.v0, im), z=imageUVToTopPct(b.u1, b.v1, im);
    if(a && z) spawnPurgeStars({ l:a.l, t:a.t, w:z.l-a.l, h:z.t-a.t, n:10 });
  }
  im.style.transition='none';
  im.classList.add('eg-purge','eg-down');   // eg-down＝其他判定（還站著幾個、BR 瞄準）照舊把牠當成倒下
  fallUntil=Math.max(fallUntil, Date.now()+450);
}
/* 倒下：**唯一的一支**（Ray：之後會有倒地動畫 —— 換的時候只改這裡）。 */
function fallGuard(im){
  dropMemberAnim(im);   // 待機／攻擊那一層收掉，分層本身交給倒地（ver -2581）
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
  const G=groupCard.group, j=F.j;
  const el=document.createElement('img'); el.className='eg-fall'; el.alt='';
  placeOnLayer(el, im, j);
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
  const G=groupCard.group, n=groupOrder(G).length, each=groupEach(G);
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
function groupEach(G){ return G.hpEach || ((G.hp||0)/(groupOrder(G).length||1)) || 100; }
export function groupHp(en){ return (en && en.group) ? (en.group.hp || groupOrder(en.group).length*groupEach(en.group)) : 0; }
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
  if(en && (castMode(en) || en.shadowFollow===1)) startShadowFollow();
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
  /* 倒地片（ENEMY_DOWN，ver -2858）：播一次、停在最後一格（opts.hold），不淨化、不回待機；換下一隻怪時 stopIdleLoop 收掉。
     冪等：overkill 期間重複叫到不重播。片子還沒載好（回 0）就退回原本的死法。 */
  if(clipFor('down', en)){ if(downFor===state.currentEnemyKey) return;
    if(playActionClip('down', null, { hold:true })){ downFor=state.currentEnemyKey; return; } }
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
  clearFeathers(true);                          // 羽蛇的封窗羽毛不帶到下一隻（ver -2792）
  if(en && en.featherBlock) loadFeathers(en);    // 羽毛圖在這一場開打時就抓（16 張小圖）
  portraitOverride=null;                        // 換了一隻（或重開一場）→ NI 鎖住的立繪放掉（ver -1965）
  loadSingleFall(en);                           // 單人的倒地動畫（ver -2065）：有寫 `fall` 就先抓
  stopSakura();                                 // 換了一隻怪 → 上一隻的櫻花與 Sturm 一起收（ver -899）
  stopHolyBurst();                              // 同上：放光也是全螢幕的層＋一支還在響的音（ver -1351）
  setSkyBattle(en.sky);                         // 空戰的視差背景（ver -2444）：沒有 `sky` 的怪＝收掉上一隻的
  startDamageSmoke(en.damageSmoke);             // 受損冒黑煙（ver -2490）：沒寫的怪＝收掉上一隻的
  startShipAir(en);                             // 空戰船的船底雲浪＋前景雲霧（ver -2865）：不是空戰船＝收掉上一隻的
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
  /* 普攻減延時（ver -2834，Ray：「1 是全清，0.8 是清當前延時條的 80%，預設都先用 0.8」）：
     卡上 tapDelayClear 優先，沒寫＝ tuning.tapDelayClear（預設只住在那裡，鐵律 7）。 */
  { const td = (en.tapDelayClear!=null) ? en.tapDelayClear : (GAME_CONFIG.tuning||{}).tapDelayClear;
    state.enemyTapDelayClear = (td!=null) ? +td : 1; }
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
    /* 卡上 `bgBand`（ver -2576，登艦戰甲板四時段）：基底名＋現在的時段（dawn／day／dusk／night，深夜用 night）。 */
    /* 登艦戰（ver -2868，Ray：「登艦戰的背景天色要跟對艦戰的時候一樣」）：boardingRun 換卡前記下對艦戰那張天空的時段（boardBand），這一次換上的卡吃它、用完即丟。 */
    const bb=boardBand; boardBand=null;
    const bandBg = en.bgBand ? en.bgBand+'_'+(bb || ({ Dawn:'dawn', Day:'day', Dusk:'dusk', night:'night', midnight:'night' }[clock.band()] || 'day')) : '';
    /* 戰鬥卡的 `bg`（ver -2851，夢境戰 cap_dream 的專用背景）：**這一場**一定用它，蓋過敵人卡與城鎮那一格 ——
       寫在戰鬥卡不寫在敵人卡，因為同一張敵人卡（faceless）也是挑戰模式的第一隻，那邊不該跟著換。 */
    const sbBg = (state.scriptRun && state.scriptBattleId && ((GAME_CONFIG.battles||{})[state.scriptBattleId]||{}).bg) || '';
    const nm = sbBg || (en.bgLock && en.bg) || state.battleBg || bandBg || en.bg || '';   // 卡上 bgLock：這一場一定用自己的背景（ver -2524，安雅光翼的教堂殘垣）
    /* 群體敵人的去人背景（ver -2043）：**它就是這一場的戰鬥背景**，蓋過城鎮那一格的（battleBg）。
       ⚠ 直接寫路徑（四張都叫 plate.webp，走 bgUrl 的資料夾表會撞名）。 */
    const plate = en.group && en.group.plate;
    topEl.style.backgroundImage = plate ? ('url("'+plate+'")') : nm ? ('url("'+story.bgUrl(nm)+'")') : '';
    setBattleBgVideo(plate ? '' : nm);   // 動態背景（ver -2729，Ray：「戰鬥時要用動態背景」）：有對應影片就疊在靜態圖上播，沒有照舊
    /* plate 與人層是**同一張原圖拆出來的**：背景要照卡上的 `fit.pos` 對位，人才會落回原位（ver -2066，米夏親衛隊 35%）。
       縮放／上下偏移照舊只套在人那一組（applyEnemyFit）。不是 plate 的背景維持 CSS 原本的對位。 */
    topEl.style.backgroundPosition = plate ? (((en.fit||{}).pos)||'50% 50%') : '';
    { const on=!plate && !en.sky && /^sky_/i.test(nm); setSkyPan(on ? nm : null, on ? story.bgUrl(nm) : ''); }
    /* 前景切塊（卡上 `fgCut`，ver -2756，Ray：「取原背景的一部份疊上去…照地上殘磚的紋路切」）：
       同一張背景切出來的透明圖、跟背景一樣 center/cover ⇒ 自動對齊，疊在敵人上面（紫黑之爪：磚堆擋住黑翼根部） */
    { let fg=$('enFgCut'); if(en.fgCut){ if(!fg){ fg=document.createElement('div'); fg.id='enFgCut'; const vg=$('topVignette'); if(vg) topEl.insertBefore(fg, vg); else topEl.appendChild(fg); }   // 插在暗角之前：跟後景一起被壓暗，色調才一樣
        fg.style.backgroundImage='url("'+en.fgCut+'")'; } else if(fg) fg.remove(); }
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
