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

import { GAME_CONFIG, asset, sfxGain, weaponDescText } from '../config.js';
import * as load from '../script/loadout.js';
import * as inv from '../script/inventory.js';
import * as prog from '../script/progress.js';
import { setPickedPartner, state } from '../state.js';
import { showBag, bagListHtml } from './loot.js';
import * as partner from './partner.js';   // 本篇現在的搭檔是誰（ver -671，唯一那一支判定）
import { SFX } from '../audio.js';

const $ = id => document.getElementById(id);
const W = () => GAME_CONFIG.weapons||{};

/* 本篇能用的搭檔。⚠ **只有諾薇兒**（Ray 指定）—— 試玩版的選人畫面照舊列全部，
   兩邊的清單是兩回事，不要合成一份。
   ⚠ ver -510：第一位＝`config.storyPartner`（唯一真相 —— combat.startGame 進劇情戰
   也切到它，不再依賴玩家先開過這一頁）。 */
/* ⚠ 現在是誰由 `partner.storyPartnerKey()` 決定（ver -671，安雅入隊之後換她）——
   所以這裡不能是**模組載入時**算好的常數：那時旗標還沒立起來。 */
const STORY_PARTNERS = () => [partner.storyPartnerKey()];

let el=null;
/* 現在開著哪一個分頁（ver -457，Ray：「在整備頁面加入道具分頁，道具要分類」）。
   ⚠ 不進存檔：這是「玩家現在在看哪一頁」，關掉重開回到整備即可。 */
let tab='gear';
/* 道具分頁裡現在看哪一個**類別**（ver -497，Ray：「道具按類別分頁，使用類的放第一」）。
   類別的順序＝config 的 `catOrder`（鐵律 1），而那張表本來就把 `item`（使用類）
   排第一 —— 這裡只是照抄，不另訂順序。 */
let itemCat='item';

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

/* ══⚠⚠ 主武器（ver -699，Ray：「裝備欄加入雙槍…兩支算同一個武器，但是各有一個
   掛件槽，可以掛強化護符」「固定武器不可更換，但可以在槍店強化」）══════════
   ⚠ **整張卡不可點**：它不可更換，給它一個「點得到卻沒反應」的熱區只會讓玩家
     一直去戳（同 §6.5.5「還不能做不要靠藏起鈕擋」的反面 —— 不能做的東西就別做成鈕）。
     可點的只有**兩個掛件槽**。
   ⚠ ver -700：只顯示**強化等級**（Ray：「顯示強化等級就好，不用寫槍店強化」），
     而且**一直顯示**（Lv1 也顯示）—— 玩家要看得出「這個東西可以練，練到 9」。
   ⚠⚠ ver -712：那一行**點得開**（Ray：「加尼米德的改裝狀況在整備欄也要可以點開觀看」）
     —— 展開九顆星的現況。**唯讀**：升級要素材，素材在槍店，所以升級留在槍店那一頁。
     這是「整張卡不可點」的**例外而不是推翻**：可點的是「看改裝狀況」這個動作，
     不是「換一把槍」。
   ⚠ 與槍店改裝頁（`loot.modRows`）**共用的是資料**（`config.gunStars` ＋
     `prog.starCount`），不是版面：那一頁要列素材需求、要能選；這一頁只報現況。 */
/* 九顆星的現況（唯讀）。已點亮＝金色＋✓（可多次的印 ×N）；未點亮＝暗。
   ⚠ 內部數值**不顯示**（Ray 指定）：只印星名、名稱與效果那一句。 */
let starsOpen = false;
function starListHtml(){
  return (GAME_CONFIG.gunStars||[]).map(st=>{
    const n=prog.starCount(st.id);
    return '<div class="gs-star'+(n>0?' on':'')+'">'
         +   '<i class="gs-starname">'+st.star+'</i>'
         +   '<b>'+st.name+(n>0 ? (st.repeat ? '　×'+n : '　✓') : '')+'</b>'
         +   '<span>'+st.desc+'</span>'
         + '</div>';
  }).join('');
}
function mainGunHtml(){
  const MG=GAME_CONFIG.mainGun; if(!MG) return '';
  const defs=(GAME_CONFIG.items||{}).defs||{};
  /* ver -707：顯示**已點亮幾顆星**（九階是非線性的，沒有「等級」可言）。 */
  const stars=(GAME_CONFIG.gunStars||[]);
  const lit=stars.filter(st=>prog.starCount(st.id)>0).length;
  const barrels=(MG.barrels||[]).map(b=>{
    const id=prog.charmOf(b.id), d=id?defs[id]:null;
    return '<div class="gs-barrel" data-barrel="'+b.id+'">'
         +   '<b>'+b.name+'</b>'
         +   '<span class="gs-charm'+(d?' on':'')+'">'
         +     '<i>掛件</i>'+(d ? (d.name||id) : '—')+'</span>'
         +   '<span class="gs-arrow">›</span>'
         + '</div>';
  }).join('');
  return '<div class="gs-sec">主武器</div>'
       + '<div class="gs-main">'
       +   (MG.image ? '<img class="gs-mimg" src="'+(asset(MG.image)||'')+'" alt="">' : '')
       +   '<div class="gs-mname">'+MG.name
       +     (MG.tag ? '<span class="gs-mfix">'+MG.tag+'</span>' : '')+'</div>'
       +   '<button class="gs-mtune" type="button">強　化　<b>'+lit+'</b>'
       +     '<span>／'+stars.length+'</span>'
       +     '<i class="gs-mcaret">'+(starsOpen?'▾':'▸')+'</i></button>'
       +   (starsOpen ? '<div class="gs-stars">'+starListHtml()+'</div>' : '')
       +   '<div class="gs-barrels">'+barrels+'</div>'
       + '</div>';
}

function render(){
  const cats=load.order();
  const SP=STORY_PARTNERS();
  const pk=SP.find(k=>GAME_CONFIG.partners[k]) || SP[0];
  const p=GAME_CONFIG.partners[pk]||{};
  const fit=p.siFit||{};
  const rot = load.mode()==='rotate';
  /* 目前的體力（ver -497，Ray：「在整備頁顯示目前主角的hp」）。
     戰鬥外的 HP 只有一份真相：progress 的持久 HP（沒有鑰匙＝滿血），
     上限＝config 的 `tuning.playerHp` —— 兩個都不要在這裡另存。 */
  const hpMax=GAME_CONFIG.tuning.playerHp;
  const hpG=prog.getHp();
  const hpCur=(hpG!=null) ? Math.min(hpG, hpMax) : hpMax;
  const hpHtml =
      '<div class="gs-hp"><span class="gs-hplab">體　力</span>'
    +   '<i class="gs-hpbar"><i style="width:'+Math.round(hpCur/hpMax*100)+'%"></i></i>'
    +   '<b>'+hpCur+'</b><span class="gs-hpmax">／'+hpMax+'</span></div>';
  /* 道具分頁（ver -457；-497 改成**類別分頁**，Ray：「道具按類別分頁，使用類的
     放第一」）：頁籤照 config 的 `catOrder`（item 本來就排第一），清單走
     `bagListHtml`（與道具欄同一份實作，鐵律 8），`use:true` 讓回復道具長出
     「使　用」（按下去走 `prog.useHealItem`，唯一的實作）。 */
  const IT=GAME_CONFIG.items||{};
  const icats=(IT.catOrder||['item']);
  const itemsBody =
      '<div class="gs-items">'
    +   '<div class="bag-money">'+inv.moneyName()+'　<b>'+inv.getMoney()+'</b></div>'
    +   '<div class="gs-icats">'
    +     icats.map(c=>'<button class="gs-icat'+(itemCat===c?' on':'')+'" data-cat="'+c+'"'
                     + ' type="button">'+((IT.catName||{})[c]||c)+'</button>').join('')
    +   '</div>'
    +   '<div class="gs-itemlist">'+bagListHtml(itemCat, { use:true })+'</div>'
    + '</div>';
  el.innerHTML =
      '<button class="gs-close" type="button" aria-label="關閉">✕</button>'
    + '<div class="gs-tabs">'
    +   '<button class="gs-tab'+(tab==='gear' ?' on':'')+'" data-tab="gear"  type="button">整　備</button>'
    +   '<button class="gs-tab'+(tab==='items'?' on':'')+'" data-tab="items" type="button">道　具</button>'
    + '</div>'
    + hpHtml
    + (tab==='items' ? itemsBody :
      '<div class="gs-body">'
    +   '<div class="gs-left">'
    +     mainGunHtml()
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

/* 小提示（ver -497）：使用道具的回饋一句話，浮在體力條旁邊，1.4 秒自己收。
   ⚠ 不用 alert 也不彈窗 —— 這只是回饋，不是要玩家做決定。 */
let noteT=0;
function gsNote(txt){
  if(!el) return;
  let n=el.querySelector('.gs-note');
  if(!n){ n=document.createElement('div'); n.className='gs-note'; el.appendChild(n); }
  n.textContent=txt; n.classList.add('on');
  clearTimeout(noteT);
  noteT=setTimeout(()=>{ if(n) n.classList.remove('on'); }, 1400);
}

/* ── 綁事件 ── */
function bind(){
  el.querySelector('.gs-close').addEventListener('click', e=>{ e.stopPropagation(); close(); });
  el.querySelectorAll('.gs-tab').forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation();
    if(b.dataset.tab===tab) return;
    try{ SFX.menuClick(); }catch(_){}
    tab=b.dataset.tab; render();
  }));
  /* 道具的類別頁籤（ver -497）。 */
  el.querySelectorAll('.gs-icat').forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation();
    if(b.dataset.cat===itemCat) return;
    try{ SFX.menuClick(); }catch(_){}
    itemCat=b.dataset.cat; render();
  }));
  /* 「使　用」：回復道具（ver -497）。滿血不消耗，浮一句說明；用掉就重畫
     （數量、體力條、錢那一行一起跟上）。 */
  el.querySelectorAll('.bag-use').forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation();
    const res=prog.useHealItem(b.dataset.id);
    if(!res) return;
    if(res.full){ try{ SFX.menuClick(); }catch(_){} gsNote('體力已滿'); return; }
    /* 回復音（ver -499，Ray：「使用道具恢復時跑 se_healing」）—— 真的補到血才響。 */
    try{ SFX.unlock(); SFX.play(asset('se_healing'), sfxGain('se_healing')); }catch(_){}
    render();                          // ⚠ 先重畫再浮字：render 會把整頁（含提示）洗掉
    /* ── 回血特效（ver -498，Ray：「回復體力的 hp 條加入回血特效」）──
       render 是整頁重建，條直接站在新寬度上不會動 —— 所以把填色**倒回舊寬度**、
       隔一幀再放到新寬度，讓 CSS 的 width 過場真的跑一次；同時掛 .heal
       （金光脈動＋亮一階的填色，約 0.9 秒自己退）。 */
    const bar=el.querySelector('.gs-hpbar'), fill=bar && bar.querySelector('i');
    if(fill){
      const p0=Math.round((res.hp-res.healed)/res.max*100);
      const p1=Math.round(res.hp/res.max*100);
      fill.style.transition='none'; fill.style.width=p0+'%';
      void fill.offsetWidth;                       // 隔一幀（同 story.veil 那條的理由）
      fill.style.transition=''; fill.style.width=p1+'%';
      bar.classList.add('heal');
      setTimeout(()=>{ bar.classList.remove('heal'); }, 900);
    }
    gsNote('恢復了 '+res.healed+' 點體力');
  }));
  const sw=el.querySelector('.gs-sw');
  if(sw) sw.addEventListener('click', e=>{ e.stopPropagation();
    try{ SFX.menuClick(); }catch(_){}
    load.setMode(load.mode()==='rotate' ? 'fixed' : 'rotate');
    render();
  });
  el.querySelectorAll('.gs-slot').forEach(s=>bindSlot(s));
  /* 掛件槽（ver -699）：點一下開道具欄的護符類。⚠ 不做拖曳 —— 兩支槍沒有順位。 */
  { const t=el.querySelector('.gs-mtune');
    if(t) t.addEventListener('click', e=>{ e.stopPropagation();
      try{ SFX.menuClick(); }catch(_){}
      starsOpen=!starsOpen; render(); }); }
  el.querySelectorAll('.gs-barrel').forEach(b=>b.addEventListener('click', e=>{
    e.stopPropagation(); openCharm(b.dataset.barrel);
  }));
}

/* 點一個掛件槽 → 道具欄的護符類（走 `showBag` 的 equip 模式，與副武器同一支）。
   ⚠ 目前 `items.defs` 裡一張護符都沒有（Ray 的卡還沒到）—— 清單會是空的，
     那是**對的**：不要為了讓它看起來有東西就自己發明護符（同「改裝服務準備中」）。 */
function openCharm(barrel){
  const MG=GAME_CONFIG.mainGun||{};
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  closeTip();
  showBag({ cat: MG.charmCat||'charm', equip:true, current:prog.charmOf(barrel), top:8460,
            onEquip(id){ prog.setCharm(barrel, id); },
            onClose(){ render(); } });
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
  const pk=STORY_PARTNERS()[0];
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
