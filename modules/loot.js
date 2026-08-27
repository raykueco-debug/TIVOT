/* ══════════════════════════════════════════════════════════════════════
   loot.js — 拾得道具視窗 ＋ 道具欄（ver -358）
   ──────────────────────────────────────────────────────────────────────
   「你撿到了什麼」的那一頁。三條來源共用同一個視窗（戰鬥後獲取、商店購買、
   劇情取得）—— 不要為了商店或劇情各做一個。

   ⚠ **道具是在這裡真正入袋的**（`inventory.addMany`）：呼叫端只要把清單交出來，
     不必自己記得寫存檔 —— 少一個「顯示了但沒入袋」的破口。
   ⚠ DOM 動態生成（同 story.js 的讀取頁）：這一頁只在拿到東西時出現，
     常駐在 index.html 裡只是多一塊沒人看的節點。
   ══════════════════════════════════════════════════════════════════════ */

import { GAME_CONFIG, weaponStatRows, weaponOf, weaponDescText } from '../config.js';
import * as inv from '../script/inventory.js';
import * as shopStock from '../script/shopstock.js';   // 店鋪存貨（ver -405）
import { SFX } from '../audio.js';

/* ══ 樣式（ver -380）══
   這一套視窗的 CSS 抽在 `css/lootsheet.css`，**由這裡自己掛上來** ——
   主遊戲與飛行頁都 import 這支模組，兩邊就都有樣式，不必逐頁記得加 <link>（鐵律 8）。
   ⚠ 路徑由 `import.meta.url` 推出來，所以不管宿主頁面在哪一層（`/` 或 `/flight/`）都對。
   ⚠ 掛過就不再掛（`data-lootsheet` 當指紋）。 */
function ensureCss(){
  if(document.querySelector('link[data-lootsheet]')) return;
  const href=new URL('../css/lootsheet.css', import.meta.url).href;
  const l=document.createElement('link');
  l.rel='stylesheet'; l.href=href; l.dataset.lootsheet='1';
  document.head.appendChild(l);
}

/* 顯示並入袋。list＝`[{id,n},…]`；done＝按下確認之後要做的事。
   ⚠ 空清單直接跳過（連視窗都不出）—— 「你什麼都沒撿到」不需要一頁。 */
/* `list`＝`[{id,n},…]`；`money`＝這一次掉的錢（可省）；`opts`＝`{exp,title}`（可省）。
   ⚠ 金錢與道具**同一個視窗**（Ray：「併入道具欄顯示」）—— 分兩頁彈會讓玩家點兩次。
   ⚠⚠ **EXP 也在這一頁，而且與金錢同一列**（ver -439，Ray：「把獲得的錢跟 exp
     放同一排」）。原本 EXP 印在結算頁的等第那一行、金錢印在這一頁 —— 同樣是
     「這一場拿到什麼」，卻分在兩個畫面上。合成一列之後這一頁就是**這一場的收穫**，
     結算頁那一行只剩等第。
   ⚠ `title` 可換（戰後叫「戰利品」、商店／劇情取得仍是「拾得道具」）—— 那是
     **來源**的差別，不是這一頁的職責變了，所以是參數不是第二支實作（鐵律 8）。
   ⚠ ver -453 起**戰鬥的金錢與 EXP 不再走這一頁**（Ray：「exp 跟 g 直接放結算頁，
     有戰利品才跳」）—— 兩者印在結算頁、錢也在那裡入帳（inspector.scriptSettle）。
     money/exp 這兩個參數留著給日後別的來源用，battle 路徑一律傳 0。 */
export function showLoot(list, done, money, opts){
  ensureCss();
  const o=opts||{};
  const rows=(list||[]).filter(x=>x && x.id && (x.n==null || x.n>0));
  money=Math.max(0, money|0);
  const exp=Math.max(0, o.exp|0);
  if(!rows.length && !money && !exp){ done && done(); return; }
  inv.addMany(rows);                                   // ← 真正入袋
  if(money) inv.addMoney(money);

  /* 金錢＋EXP 那一列。⚠ 兩個都沒有就整列不出（例如打靶只拿到獎品那一次）。
     ⚠ 用 `.loot-gain` 這個新類，不沿用 `.loot-money`：那個類是「名稱＋數量」的
       兩欄版面，這一列是**兩組**名稱＋數量並排，撐不進同一份樣式。 */
  const gain = (money || exp)
    ? '<div class="loot-row loot-gain">'
      + (money ? '<span class="lg-item"><span class="loot-name">'+inv.moneyName()
               + '</span><span class="loot-n">＋'+money+'</span></span>' : '')
      + (exp   ? '<span class="lg-item"><span class="loot-name">EXP</span>'
               + '<span class="loot-n">＋'+exp+'</span></span>' : '')
      + '</div>'
    : '';

  const ov=document.createElement('div'); ov.id='lootSheet';
  ov.innerHTML =
      '<div class="loot-panel">'
    +   '<div class="loot-title">'+(o.title || '拾得道具')+'</div>'
    +   '<div class="loot-list">'
    +     gain
    +     rows.map(r=>{
            const n = (r.n==null?1:r.n);
            const d = inv.defOf(r.id) || {};
            return '<div class="loot-row">'
                 +   '<span class="loot-name">'+inv.nameOf(r.id)+'</span>'
                 +   '<span class="loot-n">×'+n+'</span>'
                 +   (d.desc ? '<span class="loot-desc">'+d.desc+'</span>' : '')
                 + '</div>';
          }).join('')
    +   '</div>'
    +   '<button class="loot-ok" type="button">確認</button>'
    + '</div>';
  document.body.appendChild(ov);
  requestAnimationFrame(()=>ov.classList.add('on'));
  try{ SFX.menuClick(); }catch(e){}

  const close=()=>{
    ov.classList.remove('on');
    setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); done && done(); }, 220);
  };
  /* ⚠ 只有「確認」關得掉：點背景關掉的話，玩家常常還沒看清楚就手滑收了。 */
  const btn=ov.querySelector('.loot-ok');
  btn.addEventListener('click', e=>{ e.stopPropagation();
    try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
    close(); });
}

/* ══ 道具欄 ══
   同一套外觀（共用 `#lootSheet` 的 CSS），差別只在「分類分組、可捲動、沒有入袋動作」。
   ⚠ 分類順序與名稱都讀 config（`items.catOrder` / `catName`）—— 這裡不寫死五種。
   ⚠ 空的分類**照樣列出標題**：玩家要看得出「素材我還沒有」，而不是以為沒這一類。 */
/* `opts`（ver -422，整備頁用）：
     cat      只列這一個分類（武器的分類就是 `重機槍`／`霰彈槍`／`萊福槍`）
     equip    每一列多一顆「裝　備」（目前使用中的那一把顯示「使用中」）
     onEquip  按下去回呼（由整備頁決定要把它記到哪一個順位）
     top      z-index 覆寫（從劇情層叫出來時要抬到 8300 之上）
   ⚠ 道具欄本來是**只顯示不交易**（ver -368，買賣只在商店）——「裝備」不是交易，
     所以放這裡是對的；買賣那條規矩不受影響。 */
export function showBag(opts){
  ensureCss();
  const o=opts||{};
  const ov=document.createElement('div'); ov.id='lootSheet'; ov.classList.add('bag');
  if(o.top) ov.style.zIndex=o.top;
  document.body.appendChild(ov);
  /* ⚠ 內容**重畫**而不是局部更新：賣掉最後一個時整列要消失、分類可能變空、
     金額要跟著變 —— 局部更新要處理的分支比重畫多，而這一頁最多幾十列。 */
  const render=()=>{
    /* ⚠⚠ **裝備清單不能用 `inv.grouped()`**（ver -422）：那一支走的是道具袋
       （`{id:數量}`），而**開局就有的那三把槍從來沒進過袋子**（config 的 `owned:true`）
       —— 用它列的話玩家只看得到買來的槍，換不回原本那把。
       持有與否只有一支真相：`inv.hasWeapon()`／`inv.ownedWeapons()`（§6.5.3）。 */
    let groups;
    if(o.equip && o.cat){
      const WP=GAME_CONFIG.weapons||{};
      const ids=inv.ownedWeapons().filter(k=>WP[k] && WP[k].cat===o.cat);
      groups=[{ name:o.cat, rows:ids.map(id=>({ id, name:inv.nameOf(id), n:1,
                 /* 規格用**本篇**那一組（這一頁只在城鎮／劇情裡開得到，§6.5.3）。 */
                 desc:weaponDescText(id, true) })) }];
    }else groups=inv.grouped().filter(g=>!o.cat || g.name===o.cat);
    const body=groups.map(g=>{
      /* ⚠ 道具欄**只顯示，不交易**（ver -368，Ray：「只有在商店能買賣」）。
         賣東西在 `showShop()`，那一頁才有價格與確認。 */
      const rows = g.rows.length
        ? g.rows.map(r=>{
            /* ⚠ 「裝備」只給**武器**：`inv.defOf` 查不到的道具沒有 `cat` 對得上，
               而且裝備的概念只存在於副武器（鐵律 8：不要讓別的道具也長出這顆鈕）。 */
            const isW = !!(GAME_CONFIG.weapons||{})[r.id];
            const cur = o.equip && isW && o.current===r.id;
            const btn = (o.equip && isW)
              ? '<button class="bag-eq'+(cur?' cur':'')+'" data-id="'+r.id+'" type="button">'
                + (cur?'使用中':'裝　備')+'</button>' : '';
            return '<div class="loot-row"><span class="loot-name">'+r.name+'</span>'
                 + (o.equip ? '' : '<span class="loot-n">×'+r.n+'</span>')
                 + (r.desc?'<span class="loot-desc">'+r.desc+'</span>':'')+btn+'</div>';
          }).join('')
        : '<div class="bag-empty">—</div>';
      return '<div class="bag-cat">'+g.name+'</div>'+rows;
    }).join('');
    ov.innerHTML='<div class="loot-panel"><div class="loot-title">'+(o.cat||'道具欄')+'</div>'
               + '<div class="bag-money">'+inv.moneyName()+'　<b>'+inv.getMoney()+'</b></div>'
               + '<div class="loot-list">'+body+'</div>'
               + '<button class="loot-ok" type="button">關閉</button></div>';
    ov.querySelector('.loot-ok').addEventListener('click', e=>{ e.stopPropagation();
      try{ SFX.unlock(); SFX.menuClick(); }catch(_){} close(); });
    ov.querySelectorAll('.bag-eq').forEach(b=>b.addEventListener('click', e=>{
      e.stopPropagation();
      try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
      o.current=b.dataset.id;
      if(o.onEquip) o.onEquip(b.dataset.id);
      render();                       // 重畫：「使用中」要換到新的那一列
    }));
  };
  const close=()=>{ ov.classList.remove('on');
    setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 220);
    if(o.onClose) o.onClose(); };
  render();
  requestAnimationFrame(()=>ov.classList.add('on'));
  return close;
}

/* ══ 商店（ver -368）══
   **買賣只能在這裡**（Ray 指定；道具欄純顯示）。
   ⚠ 目前只有「賣」：買什麼、賣多少是內容資料，`config.shop.buy` 還是空的 ——
     Ray 給貨單就填在那裡，這一頁不必改（鐵律 1）。
   ⚠ 賣價 ＝ `items.defs[].sell` × `config.shop.sellRate`。日後要做「不同城鎮不同行情」
     就是每家店各帶一個 rate，不要把價錢寫進這支 UI。
   ⚠ 沒寫 `sell` 的道具**不出現在賣的清單裡**（劇情道具／任務物品賣不掉）。 */
/* ══ 商店（ver -371 改版）══
   分頁：**買 / 賣**。店主立繪在一旁，點到的品項會出說明（Ray 指定）。
   ⚠ 賣什麼、多少錢**全在 config**，這一頁只負責演（鐵律 1）。
   ⚠ 特殊物品不能賣 —— 那條擋在 `inv.sellPrice()`（價錢層），不是這裡（見那支的說明）。
   ⚠ 店主對話是**一段對白**（兩個人輪流講），所以不塞進這一頁：
     按下去先收商店，交給劇情播放器演，演完再開回來（`onTalk` 由呼叫端提供）。 */
/* `onChallenge`（ver -398）：這一家店的「再挑戰」（槍店的射擊挑戰）。
   ⚠ 與 `onTalk` 同一個作法：**先收商店**，交給呼叫端去演，演完由呼叫端決定要不要開回來 ——
     戰鬥會蓋掉整個畫面，商店留在底下只會在回來時閃一格。 */
/* `opts.dock:'left'`（ver -404，Ray：「直接右店主左選單」）：這一張單子**靠左停**、
   背景不壓黑、也**不吃掉畫面其他地方的點擊** —— 因為右邊站著店主、底下的面盤還要
   能走出店門。⚠ 只有城鎮的店舖會給這個參數；拾得／道具欄仍是置中的強制視窗。
   `opts.info`：標題右邊那一行小字（地名＋時刻）。⚠ 停靠模式會蓋掉上緣的 `#townInfo`，
   所以那兩個資訊要在這張單子上找得到（見 modules/town.js 的說明）。
   回傳 `close` —— 呼叫端（走出店門、進戰鬥）要收得掉它。 */
export function showShop(stockKey, keeper, onTalk, onChallenge, opts){
  ensureCss();
  const o=opts||{};
  const ov=document.createElement('div'); ov.id='lootSheet'; ov.classList.add('bag','shop');
  if(o.dock) ov.classList.add('dock-'+o.dock);
  document.body.appendChild(ov);
  const SHOP=GAME_CONFIG.shop||{};
  /* ⚠ 貨架問 `shopStock`，不要直接讀 `config.shop.stock`（ver -405）——
     那裡只有**開店時**的數量，賣掉幾個、玩家又賣回來幾個是那一支在記帳（鐵律 7）。 */
  const shelf=()=>shopStock.list(stockKey);
  /* 這一家店的長相（ver -377）。沒登記就走預設 —— 舊的雜貨舖不必改任何呼叫端。 */
  const cfg=((SHOP.shops||{})[stockKey])||{};
  const TABS=(cfg.tabs&&cfg.tabs.length)?cfg.tabs:['buy','sell'];
  const TABNAME=Object.assign({ buy:'買', sell:'賣', mod:'改裝' }, cfg.tabName||{});
  let tab=TABS[0], pick=null;
  /* 購買數量（ver -405，Ray：「購買時可選擇購買數量」）。⚠ 換頁籤／換選取一律歸 1 ——
     沿用上一項的數量會讓「買下 3000」變成「買下 9000」，那是會出人命的預設值。 */
  let qty=1;

  /* ⚠ `o.onClose`（ver -404）：**任何**收掉這張單子的路徑都要通知呼叫端 ——
     城鎮那邊記著「單子開著沒」，不通知的話玩家按了關閉之後就再也開不回來。
     `close` 是唯一的收尾（鐵律 8），所以掛在這裡就夠。 */
  const close=()=>{ ov.classList.remove('on');
    setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 200);
    if(o.onClose){ const f=o.onClose; o.onClose=null; try{ f(); }catch(_){} } };

  /* 規格表（武器）。⚠ 數值一律問 `config.weaponStatRows`（唯一一處），這裡只排版。 */
  /* ⚠ 商店只存在於城鎮（本篇），所以規格一律顯示**本篇那一組**數值（ver -378）。
     試玩版的出陣整備頁顯示的是另一組 —— 那是刻意的，兩邊本來就是兩套。 */
  const statTable=(id, cls)=>{
    const rows=weaponStatRows(id, true);
    if(!rows.length) return '';
    return '<div class="wp-stats '+(cls||'')+'">'
         + rows.map(r=>'<span class="wp-k">'+r[0]+'</span><span class="wp-v">'+r[1]+'</span>').join('')
         + '</div>';
  };
  /* 「跟現有的同類比一比」（Ray 指定）：找**持有中**、分類相同、且不是同一把的武器。
     ⚠ 只挑一把（第一把）—— 並排兩張表已經夠讀，三張以上會變成規格書。 */
  const rivalOf=(id)=>{
    const W=GAME_CONFIG.weapons||{}; const w=W[id]; if(!w||!cfg.compare) return null;
    return inv.ownedWeapons().find(k=>k!==id && W[k] && W[k].cat===w.cat) || null;
  };

  const render=()=>{
    /* 賣出清單。⚠ `only` 過濾（武器店只收武器）；賣價 0 的一律不列
       （沒定價的劇情道具、以及**開局就有的那幾把槍**——它們沒有 price）。 */
    const sellable=[];
    for(const g of inv.grouped()) for(const r of g.rows)
      if(inv.sellPrice(r.id)>0 && (!cfg.only || inv.catOf(r.id)===cfg.only)) sellable.push(r);

    const shelfNow = shelf();
    let rows='';
    if(tab==='buy'){
      rows = shelfNow.length ? shelfNow.map(e=>{
        const id=e.id, d=inv.defOf(id)||{}, price=inv.priceOf(id);
        const has=inv.count(id)>0 || ((GAME_CONFIG.weapons||{})[id]||{}).owned;
        /* 存貨：不限量的不標（標了反而讓人以為那是一個數字）；賣完的整列變暗、不能選。 */
        const out=(e.n<=0);
        const left = isFinite(e.n) ? ('<i class="wp-stock">'+(out?'售完':'庫存 '+e.n)+'</i>') : '';
        /* ⚠ 標籤（持有／庫存）自己一列（ver -405）：塞在品名後面的話，長品名一換行
           就會與右邊的價錢疊在一起（實測「短板霰彈槍『龍息』」那一列，
           `持有` 的框被拆成兩半夾著 3000 G）。 */
        const tags = (has?'<i class="wp-have">持有</i>':'') + left;
        return '<div class="shop-row'+(pick===id?' pick':'')+(out?' out':'')+'" data-id="'+id+'">'
             + '<span class="loot-name">'+(d.name||id)+'</span>'
             + '<span class="loot-n">'+price+' '+inv.moneyName()+'</span>'
             + (tags ? '<span class="shop-tags">'+tags+'</span>' : '')+'</div>';
      }).join('') : '<div class="bag-empty">這家店沒有在賣東西。</div>';
    }else if(tab==='sell'){
      rows = sellable.length ? sellable.map(r=>
            '<div class="shop-row'+(pick===r.id?' pick':'')+'" data-id="'+r.id+'">'
          + '<span class="loot-name">'+r.name+'</span>'
          + '<span class="loot-n">×'+r.n+'　'+inv.sellPrice(r.id)+' '+inv.moneyName()+'</span></div>'
          ).join('') : '<div class="bag-empty">沒有可以賣的東西。</div>';
    }else{
      /* 改裝：**這一頁先留空**（Ray 指定）。⚠ 不要偷偷做一個半套的出來 ——
         留一句話讓玩家知道這裡以後有東西，比一個做一半的介面好。 */
      rows = '<div class="bag-empty">改裝服務準備中。<br>素材帶來給店主，他說馬上能幫你打出趁手的武器。</div>';
    }

    const d=pick ? (inv.defOf(pick)||{}) : null;
    const price = pick ? (tab==='buy' ? inv.priceOf(pick) : inv.sellPrice(pick)) : 0;
    const owned = pick && (inv.count(pick)>0 || ((GAME_CONFIG.weapons||{})[pick]||{}).owned);
    /* ══ 一次最多買幾個（ver -405）══
       三個上限取最小：**店裡還有幾個**、**錢夠買幾個**、以及武器的 1。
       ⚠ 武器夾在 1：`hasWeapon` 是布林（持有／沒有），買第二把在資料上根本表達不出來。
       ⚠ 價格 0 的東西不讓它算出無限 —— 夾一個 99 的上限。 */
    const isWeapon = pick && !!(GAME_CONFIG.weapons||{})[pick];
    const left  = pick ? shopStock.count(stockKey, pick) : 0;
    const afford= (price>0) ? Math.floor(inv.getMoney()/price) : 99;
    const maxQty= pick && tab==='buy'
                ? Math.max(0, Math.min(isWeapon?1:99, isFinite(left)?left:99, afford)) : 1;
    if(qty>maxQty) qty=Math.max(1, maxQty);
    const can = pick && tab!=='mod' &&
                (tab==='buy' ? (maxQty>0 && !owned) : inv.count(pick)>0);
    /* 買下的總價（賣出仍是一次一個）。 */
    const total = (tab==='buy') ? price*qty : price;

    /* 說明區：武器 → 規格表（＋同類比較）；其餘 → 文字說明。 */
    let desc;
    if(!pick) desc = (tab==='mod') ? '' : '選一項看說明。';
    else if(weaponStatRows(pick, true).length){
      const rk=rivalOf(pick);
      desc = statTable(pick)
           + (rk ? '<div class="wp-vs">對比現有：'+(GAME_CONFIG.weapons[rk].shortName||rk)+'</div>'
                 + statTable(rk,'rival') : '')
           + (((GAME_CONFIG.weapons||{})[pick]||{}).flavor ?
              '<div class="wp-flavor">'+GAME_CONFIG.weapons[pick].flavor+'</div>' : '');
    }else desc = (d.desc||'');

    ov.innerHTML='<div class="loot-panel shop-panel">'
      + '<div class="loot-title">'+(cfg.title||'商店')
      +   (o.info ? '<span class="shop-info">'+o.info+'</span>' : '')+'</div>'
      + (o.dock ? '<i class="lt-exp">'+(ov.classList.contains('dock-'+o.dock)?'⤢':'⤡')+'</i>' : '')
      + '<div class="bag-money">'+inv.moneyName()+'　<b>'+inv.getMoney()+'</b></div>'
      + '<div class="shop-tabs">'
      +   TABS.map(t=>'<button class="shop-tab'+(tab===t?' on':'')+'" data-tab="'+t+'" type="button">'
                    + (TABNAME[t]||t)+'</button>').join('')
      + '</div>'
      /* ⚠ **買賣視窗裡不放店主立繪**（ver -387，Ray 指定）：店主本來就畫在背景的
         櫃台後面，買賣視窗是**疊在他前面**的一張單子 —— 單子上再放一次同一個人，
         等於同一個角色在畫面上有兩份，而且把清單擠成半寬。
         ⚠ `config.shop.shops[].art` 這個欄位先留著（別家店日後要用得到），
           只是這一頁不再讀它。 */
      + '<div class="shop-body">'
      +   '<div class="shop-list">'+rows+'</div>'
      + '</div>'
      + '<div class="shop-desc">'+desc+'</div>'
      /* 數量（ver -405）。⚠ **只有買得到兩個以上時才出現**：武器永遠是 1、
         只剩一個的東西也是 1 —— 那時候一列不能動的加減號只是噪音。 */
      + ((tab==='buy' && pick && maxQty>1)
         ? '<div class="shop-qty"><button class="qty-m" type="button">−</button>'
         + '<b>'+qty+'</b><button class="qty-p" type="button">＋</button>'
         + '<span class="qty-max">／'+maxQty+'</span></div>' : '')
      + '<div class="shop-acts">'
      +   (tab==='mod' ? ''
          : '<button class="shop-do'+(can?'':' broke')+'" type="button">'
            /* ⚠ 「售完」與「錢不夠」是兩件事（ver -405）：店裡沒貨才寫售完；
               買得起買不起由鈕**暗掉**表示（`.broke`），字仍然是「買下 N」——
               玩家要看得到還差多少錢。 */
            + (tab==='buy' ? (owned?'已持有':((pick && left<=0)?'售完':'買下 '+total))
                           : '賣出 '+total)+'</button>')
      /* ⚠ 字短一點（ver -404 由「與店主交談」改）：靠左停的窄單子上，四顆鈕
         （買下／交談／挑戰／關閉）要排進一列，五個字會被擠成兩行。店主就站在右邊，
         「交談」跟誰交談不會有疑義。 */
      +   (keeper&&keeper.length ? '<button class="shop-talk" type="button">交　談</button>' : '')
      +   ((cfg.challenge && onChallenge)
          ? '<button class="shop-challenge" type="button">'+(cfg.challengeLabel||'挑戰')+'</button>' : '')
      +   '<button class="loot-ok" type="button">關閉</button>'
      + '</div></div>';

    /* 點標題 → 靠左停 ⇄ 全寬（ver -404，Ray 指定）。⚠ 只是加減 `dock-left` 這個
       class，版面兩邊都用這一份的既有規則（鐵律 8）。 */
    if(o.dock){
      const t=ov.querySelector('.loot-title');
      if(t) t.addEventListener('click', e=>{ e.stopPropagation();
        try{ SFX.menuClick(); }catch(_){}
        ov.classList.toggle('dock-'+o.dock); render(); });
    }
    ov.querySelectorAll('.shop-tab').forEach(b=>b.addEventListener('click', e=>{
      e.stopPropagation(); tab=b.dataset.tab; pick=null; qty=1;
      try{ SFX.menuClick(); }catch(_){} render(); }));
    ov.querySelectorAll('.shop-row').forEach(b=>b.addEventListener('click', e=>{
      e.stopPropagation();
      if(b.classList.contains('out')) return;      // 售完的那一列點不動
      pick=b.dataset.id; qty=1;
      try{ SFX.menuClick(); }catch(_){} render(); }));
    const qm=ov.querySelector('.qty-m'), qp=ov.querySelector('.qty-p');
    if(qm) qm.addEventListener('click', e=>{ e.stopPropagation();
      if(qty<=1) return; qty--; try{ SFX.menuClick(); }catch(_){} render(); });
    if(qp) qp.addEventListener('click', e=>{ e.stopPropagation();
      if(qty>=maxQty) return; qty++; try{ SFX.menuClick(); }catch(_){} render(); });
    const doBtn=ov.querySelector('.shop-do');
    if(doBtn) doBtn.addEventListener('click', e=>{
      e.stopPropagation();
      if(!pick || !can) return;
      try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
      if(tab==='buy'){
        /* ⚠ **先扣店裡的貨再扣錢**（ver -405）：`take` 回傳「真的買到幾個」——
           兩個入口同時買不會發生（單機），但這樣寫的話「貨不夠」永遠只會少賣，
           不會發生「錢扣了東西沒拿到」。 */
        const got=shopStock.take(stockKey, pick, qty);
        if(got<=0) return;
        const p=inv.priceOf(pick)*got;
        if(!inv.spendMoney(p)){ shopStock.give(stockKey, pick, got); return; }  // 錢不夠：貨放回去
        inv.add(pick, got);
        qty=1;
      }else{
        const p=inv.sellPrice(pick);
        if(inv.count(pick)<=0) return;
        inv.remove(pick, 1); inv.addMoney(p);
        /* ⚠ **賣給店家＝入庫**（Ray 指定：「除非玩家賣給他才會入庫再賣」）——
           武器店那三把各只有一支，賣掉之後想反悔就得靠這一條。 */
        shopStock.give(stockKey, pick, 1);
        if(inv.count(pick)<=0) pick=null;     // 賣光了就取消選取
      }
      render();
    });
    const talk=ov.querySelector('.shop-talk');
    if(talk) talk.addEventListener('click', e=>{ e.stopPropagation();
      try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
      close();
      if(onTalk) onTalk();                    // 收商店 → 演對白 → 呼叫端負責開回來
    });
    const ch=ov.querySelector('.shop-challenge');
    if(ch) ch.addEventListener('click', e=>{ e.stopPropagation();
      try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
      close();
      if(onChallenge) onChallenge(cfg.challenge);   // 收商店 → 開打 → 呼叫端負責收尾
    });
    ov.querySelector('.loot-ok').addEventListener('click', e=>{ e.stopPropagation();
      try{ SFX.unlock(); SFX.menuClick(); }catch(_){} close(); });
  };
  render();
  requestAnimationFrame(()=>ov.classList.add('on'));
  return close;
}

/* ══ 懸賞榜（ver -375）══
   賞金獵人公會的委託榜。**目前只有展示** —— 接單／完成／領賞還沒做（Ray 的稿到「登記」
   為止），所以這一頁沒有按鈕，只有一張清單與關閉。
   ⚠ 委託內容在 `config.bounties`，這裡只負責演（鐵律 1）。要加委託就加資料，不動這支。
   ⚠ 依 `city` 篩選：櫃台說了「各個城市的委託也會不同」，那句話得在資料上成立。 */
export function showBounty(city, opts){
  ensureCss();
  const o=opts||{};
  const all=GAME_CONFIG.bounties||{};
  const list=Object.keys(all).filter(k=> !city || all[k].city===city).map(k=>all[k]);
  const unit=(GAME_CONFIG.items&&GAME_CONFIG.items.moneyName)||'G';
  const ov=document.createElement('div'); ov.id='lootSheet'; ov.classList.add('bag','bounty');
  if(o.dock) ov.classList.add('dock-'+o.dock);
  document.body.appendChild(ov);
  const body = list.length
    ? list.map(b=>'<div class="loot-row bounty-row"><span class="loot-name">'+b.name+'</span>'
        + '<span class="loot-n">'+b.reward+unit+'</span>'
        + (b.desc?'<span class="loot-desc">'+b.desc+'</span>':'')+'</div>').join('')
    : '<div class="bag-empty">目前沒有委託。</div>';
  ov.innerHTML='<div class="loot-panel"><div class="loot-title">懸賞榜'
             + (o.info ? '<span class="shop-info">'+o.info+'</span>' : '')+'</div>'
             + (o.dock ? '<i class="lt-exp">⤢</i>' : '')
             + '<div class="loot-list">'+body+'</div>'
             + '<button class="loot-ok" type="button">關閉</button></div>';
  const close=()=>{ ov.classList.remove('on');
    setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 220);
    if(o.onClose){ const f=o.onClose; o.onClose=null; try{ f(); }catch(_){} } };
  ov.querySelector('.loot-ok').addEventListener('click', e=>{ e.stopPropagation();
    try{ SFX.unlock(); SFX.menuClick(); }catch(_){} close(); });
  /* 點標題 → 靠左停 ⇄ 全寬（同 showShop）。 */
  if(o.dock){
    const t=ov.querySelector('.loot-title'), ic=ov.querySelector('.lt-exp');
    if(t) t.addEventListener('click', e=>{ e.stopPropagation();
      try{ SFX.menuClick(); }catch(_){}
      const on=ov.classList.toggle('dock-'+o.dock);
      if(ic) ic.textContent = on ? '⤢' : '⤡'; });
  }
  requestAnimationFrame(()=>ov.classList.add('on'));
  return close;
}
