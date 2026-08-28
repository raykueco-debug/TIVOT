/* ══════════════════════════════════════════════════════════════════════
   gear.js — 本篇的整備畫面（ver -422，Ray 指定；由槍棺上的吊墜叫出來）
   ──────────────────────────────────────────────────────────────────────
   一張全螢幕視窗，三件事：
     ① **副武器**：三個類別各一格（一／二／三順位），**可拖曳改順序** ——
        那個順序就是戰鬥中切換鈕的順序。點一格 → 進道具欄的**那一個分類**換槍。
     ② **切換模式**：下方的開關。左＝固定順位、右＝輪轉（預設輪轉，Ray 指定）。
     ③ **搭檔**：右側立繪 ＋ 能力說明。本篇目前只有諾薇兒。

   ⚠⚠ 這一頁與試玩版的**出擊整備**（`#prepSheet`）是兩頁：那一頁是出陣流程的一站
     （按「執槍」就開打），這一頁是城鎮／劇情裡的裝備管理。共用的是**資料**
     （`script/loadout.js`）不是版面。
   ⚠⚠ 編成存在 `script/loadout.js`（唯一的真相）；戰鬥中那顆切換鈕**讀它**
     （`modules/weapon.js`）—— 不要在這裡直接寫 `state.equippedWeapon`。
   ⚠ 從劇情層叫出來，所以整頁 z-index 要在 `#storyStage`（8300）之上。
   ══════════════════════════════════════════════════════════════════════ */

import { GAME_CONFIG, asset, weaponDescText } from '../config.js';
import * as load from '../script/loadout.js';
import * as inv from '../script/inventory.js';
import * as prog from '../script/progress.js';
import { setPickedPartner, state } from '../state.js';
import { showBag, bagListHtml } from './loot.js';
import { SFX } from '../audio.js';

const $ = id => document.getElementById(id);
const W = () => GAME_CONFIG.weapons||{};

/* 本篇能用的搭檔。⚠ **只有諾薇兒**（Ray 指定）—— 試玩版的選人畫面照舊列全部，
   兩邊的清單是兩回事，不要合成一份。 */
const STORY_PARTNERS = ['nouvelle'];

let el=null;
/* 現在開著哪一個分頁（ver -457，Ray：「在整備頁面加入道具分頁，道具要分類」）。
   ⚠ 不進存檔：這是「玩家現在在看哪一頁」，關掉重開回到整備即可。 */
let tab='gear';

function ensure(){
  if(el && el.parentNode) return el;
  el=document.createElement('div'); el.id='gearSheet';
  document.body.appendChild(el);
  return el;
}

/* ── 一格副武器（順位 n、類別 cat）── */
function slotHtml(cat, n){
  const key=load.pickOf(cat);
  const w=key ? W()[key] : null;
  const img=w ? (asset(w.image)||'') : '';
  return '<div class="gs-slot" data-cat="'+cat+'">'
       +   '<i class="gs-no">'+n+'</i>'
       +   (img ? '<img src="'+img+'" alt="">' : '<span class="gs-none">—</span>')
       +   '<div class="gs-txt"><span class="gs-cat">'+cat+'</span>'
       +     '<b>'+(w ? (w.shortName||w.name) : '未持有')+'</b></div>'
       +   '<span class="gs-arrow">›</span>'
       + '</div>';
}

function render(){
  const cats=load.order();
  const pk=STORY_PARTNERS.find(k=>GAME_CONFIG.partners[k]) || STORY_PARTNERS[0];
  const p=GAME_CONFIG.partners[pk]||{};
  const fit=p.siFit||{};
  const rot = load.mode()==='rotate';
  /* 道具分頁（ver -457）：清單走 `bagListHtml`（與道具欄同一份實作，鐵律 8），
     分類（道具／武器／素材…）由 `inv.grouped` 照 config 的 `catOrder` 排。 */
  const itemsBody =
      '<div class="gs-items">'
    +   '<div class="bag-money">'+inv.moneyName()+'　<b>'+inv.getMoney()+'</b></div>'
    +   '<div class="gs-itemlist">'+bagListHtml()+'</div>'
    + '</div>';
  el.innerHTML =
      '<button class="gs-close" type="button" aria-label="關閉">✕</button>'
    + '<div class="gs-tabs">'
    +   '<button class="gs-tab'+(tab==='gear' ?' on':'')+'" data-tab="gear"  type="button">整　備</button>'
    +   '<button class="gs-tab'+(tab==='items'?' on':'')+'" data-tab="items" type="button">道　具</button>'
    + '</div>'
    + (tab==='items' ? itemsBody :
      '<div class="gs-body">'
    +   '<div class="gs-left">'
    +     '<div class="gs-sec">副武器・順位</div>'
    +     '<div class="gs-slots">' + cats.map((c,i)=>slotHtml(c,i+1)).join('') + '</div>'
    +     '<div class="gs-hint">長按拖曳可換順位</div>'
    +     '<div class="gs-mode">'
    +       '<span class="'+(rot?'':'on')+'">固定順序</span>'
    +       '<button class="gs-sw'+(rot?' right':'')+'" type="button"><i></i></button>'
    +       '<span class="'+(rot?'on':'')+'">輪轉順序</span>'
    +     '</div>'
    +     '<div class="gs-modedesc">' + (rot
          ? '按一下換下一順位，一直輪下去。'
          : '永遠從一順位開始；連按 N 下切到第 N 順位，發射完（或吃了黃／橘圈）自動歸位。')
    +     '</div>'
    +   '</div>'
    +   '<div class="gs-right">'
    +     '<div class="gs-sec">搭　檔</div>'
    +     '<div class="gs-pcard">'
    +       (p.image ? '<img class="gs-pimg" src="'+(asset(p.image)||'')+'" alt=""'
                     + ' style="--gp-zoom:'+(fit.zoom||1)+';--gp-top:'+((fit.top||0)*100)+'%">' : '')
    +       '<div class="gs-pname">'+(p.name||'—')+'</div>'
    +     '</div>'
    +     (p.passive ? '<div class="gs-perk"><b>'+p.passive.name+'（被動）</b>'
                     + '<span>'+p.passive.desc+'</span></div>' : '')
    +     (p.active  ? '<div class="gs-perk"><b>'+p.active.name+'（主動）</b>'
                     + '<span>'+p.active.desc+'</span></div>' : '')
    +   '</div>'
    + '</div>');
  bind();
  /* ⚠ 提示要**等這一頁真的顯示了**才擺（`.on` 之前量到的 rect 全是 0，同 §6.5.4 的坑）——
     所以延到下一拍；`open()` 那邊也會在掛上 `.on` 之後再叫一次。 */
  setTimeout(maybeTip, 0);
}

/* ── 綁事件 ── */
function bind(){
  el.querySelector('.gs-close').addEventListener('click', e=>{ e.stopPropagation(); close(); });
  el.querySelectorAll('.gs-tab').forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation();
    if(b.dataset.tab===tab) return;
    try{ SFX.menuClick(); }catch(_){}
    tab=b.dataset.tab; render();
  }));
  const sw=el.querySelector('.gs-sw');
  if(sw) sw.addEventListener('click', e=>{ e.stopPropagation();
    try{ SFX.menuClick(); }catch(_){}
    load.setMode(load.mode()==='rotate' ? 'fixed' : 'rotate');
    render();
  });
  el.querySelectorAll('.gs-slot').forEach(s=>bindSlot(s));
}

/* 一格：**點一下**開那個分類的道具欄換槍；**拖曳**改順位。
   ⚠ 用 pointer 事件自己做拖曳，不用 HTML5 的 drag —— 那一套在觸控上根本不會動。
   ⚠ 「點」與「拖」靠位移門檻分流（6px）：手指本來就會抖，門檻太小會變成點不動。 */
function bindSlot(s){
  let sy=0, moved=false, list=null, h=0, idx=0;
  s.addEventListener('pointerdown', e=>{
    sy=e.clientY; moved=false;
    list=[...el.querySelectorAll('.gs-slot')];
    idx=list.indexOf(s); h=s.getBoundingClientRect().height + 8;
    s.setPointerCapture(e.pointerId);
  });
  s.addEventListener('pointermove', e=>{
    if(!list) return;
    const dy=e.clientY-sy;
    if(!moved && Math.abs(dy)<6) return;
    if(!moved){ moved=true; s.classList.add('drag'); }
    e.preventDefault();
    s.style.transform='translateY('+dy+'px)';
    /* 其餘的格子讓位：跨過半格就位移一格。 */
    const to=Math.max(0, Math.min(list.length-1, idx + Math.round(dy/h)));
    list.forEach((o,i)=>{
      if(o===s) return;
      let sh=0;
      if(i>idx && i<=to) sh=-h;
      else if(i<idx && i>=to) sh=h;
      o.style.transform='translateY('+sh+'px)';
    });
  });
  const end=e=>{
    if(!list) return;
    const dy=e.clientY-sy;
    const to=Math.max(0, Math.min(list.length-1, idx + Math.round(dy/h)));
    list.forEach(o=>{ o.style.transform=''; });
    s.classList.remove('drag');
    const wasMoved=moved; list=null; moved=false;
    if(wasMoved){
      if(to!==idx){
        const cats=load.order();
        const [c]=cats.splice(idx,1); cats.splice(to,0,c);
        load.setOrder(cats);
        try{ SFX.menuClick(); }catch(_){}
      }
      render();
    }else{
      openCat(s.dataset.cat);          // 沒有拖 → 當成點一下
    }
  };
  s.addEventListener('pointerup', end);
  s.addEventListener('pointercancel', ()=>{ if(list){ list.forEach(o=>o.style.transform='');
    s.classList.remove('drag'); list=null; moved=false; } });
}

/* 點一格 → 道具欄的那一個分類（Ray：「進入道具欄的對應分類」）。 */
function openCat(cat){
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  closeTip();
  showBag({ cat, equip:true, current:load.pickOf(cat), top:8460,
            onEquip(id){ load.setPick(cat, id); },
            onClose(){ render(); } });
}

/* ── 一次性教學：拿到「龍息」之後指著霰彈槍那一格（Ray 指定）──
   ⚠ 一次性：旗標記在 progress，看過就不再擋路（同旅店那三個說明）。
   ⚠ 條件是「**持有**那把槍」而不是「打完那一場」—— 買來的、日後別的管道拿到的
     都該看到這個提示（鐵律 8：條件寫在「事實」上，不寫在某一條路徑上）。 */
const TIP_FLAG='gear_tip_dragon';
const TIP_WEAPON='Shotgun_Dragon';
function maybeTip(){
  if(!el || !el.classList.contains('on')) return;
  if(el.querySelector('.gs-tip')) return;
  if(prog.hasFlag(TIP_FLAG)) return;
  if(!inv.hasWeapon(TIP_WEAPON)) return;
  const w=W()[TIP_WEAPON]; if(!w) return;
  if(load.pickOf(w.cat)===TIP_WEAPON) return;      // 已經裝上了就不用教
  const slot=el.querySelector('.gs-slot[data-cat="'+w.cat+'"]'); if(!slot) return;
  const r=slot.getBoundingClientRect(); if(!r.width) return;
  const t=document.createElement('div'); t.className='gs-tip';
  t.innerHTML='<i class="gt-arrow">▼</i><div class="gt-txt">拿到了「'+(w.shortName||w.name)
            + '」。點這一格換上去。</div>';
  el.appendChild(t);
  /* ⚠ 箭擺在那一格的**正上方**（同旅店那一套）：擺右邊的話在窄螢幕上會被切掉
     （實測 390 寬時箭心落在 377）。文字再往上一行，不壓到格子本身。 */
  const a=t.querySelector('.gt-arrow');
  a.style.left=(r.left+r.width/2)+'px'; a.style.top=(r.top-6)+'px';
  const tx=t.querySelector('.gt-txt');
  tx.style.top=(Math.max(6, r.top-56))+'px';
  slot.classList.add('spot');
  t.addEventListener('click', e=>{ e.stopPropagation(); closeTip(); });
}
function closeTip(){
  const t=el && el.querySelector('.gs-tip'); if(!t) return;
  prog.addFlags([TIP_FLAG]);
  el.querySelectorAll('.spot').forEach(x=>x.classList.remove('spot'));
  t.remove();
}

export function open(){
  ensure();
  /* 蓋在飛行畫面上 → 底下整個暫停（ver -481，Ray 指定）。收場（close）放開。
     掛鉤走 window（main.js 掛的）：這一支是葉模組，構不到 iframe。 */
  if(document.body.classList.contains('flight-on') && window.__flightHoldToggle) window.__flightHoldToggle(true);
  tab='gear';        // 每次開都回到整備 —— 吊墜的語意是「整備」，道具是它的第二頁
  /* 本篇的搭檔固定是諾薇兒（Ray 指定）。⚠ 走 `setPickedPartner`（唯一管道，§3.6）。 */
  const pk=STORY_PARTNERS[0];
  if(GAME_CONFIG.partners[pk] && state.pickedPartner!==pk) setPickedPartner(pk);
  render();
  el.classList.add('on');
  requestAnimationFrame(()=>{ el.classList.add('vis'); maybeTip(); });
  /* ⚠ **一般的 click 音就好**（ver -433，Ray 指定）。原本用 `sfx_saint`（聖徒化那一支）——
     那是「發動」的聲音，開一頁裝備管理配不上那個份量，而且它比其他 UI 音都響。
     ⚠ 走 `SFX.menuClick()`（＝ `se_general_click`，所有按鈕的統一出口）——
       這一頁裡其他三處本來就是它，這一行是唯一的例外。 */
  try{ SFX.menuClick(); }catch(_){}
}
export function close(){
  if(!el) return;
  closeTip();
  if(document.body.classList.contains('flight-on') && window.__flightHoldToggle) window.__flightHoldToggle(false);
  el.classList.remove('vis');
  setTimeout(()=>{ if(el) el.classList.remove('on'); }, 300);
  /* ⚠ 通知**在這裡發**（唯一的收場，鐵律 8），不等 300ms 的動畫 ——
     等待者要接的是「玩家換完裝備了」這件事，不是滑出動畫的最後一格。 */
  const cbs=closedCbs; closedCbs=[];
  for(const cb of cbs){ try{ cb(); }catch(e){ console.warn('[gear] onceClosed', e); } }
}
/* ══ 「這一頁收掉了通知我」（ver -430）══════════════════════════════════
   城鎮的整備教學要等玩家**真的換完裝備**才把商店的單子擺出來（Ray 指定），
   而「換完」＝這一頁被收掉。
   ⚠ **沒開著就立刻放行**：玩家可能直接把提示點掉、根本沒按吊墜 ——
     不能把他鎖在教學裡（同 `story.openHint` 的原則）。
   ⚠ 一次性：叫過就從清單上拿掉，不會下次開整備頁又觸發一次。 */
let closedCbs=[];
export function isOpen(){ return !!(el && el.classList.contains('on')); }
export function onceClosed(cb){
  if(typeof cb!=='function') return;
  if(!isOpen()){ cb(); return; }
  closedCbs.push(cb);
}
