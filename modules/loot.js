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

import { GAME_CONFIG, weaponStatRows, weaponOf } from '../config.js';
import * as inv from '../script/inventory.js';
import { SFX } from '../audio.js';

/* 顯示並入袋。list＝`[{id,n},…]`；done＝按下確認之後要做的事。
   ⚠ 空清單直接跳過（連視窗都不出）—— 「你什麼都沒撿到」不需要一頁。 */
/* `list`＝`[{id,n},…]`；`money`＝這一次掉的錢（可省）。
   ⚠ 金錢與道具**同一個視窗**（Ray：「併入道具欄顯示」）—— 分兩頁彈會讓玩家點兩次。 */
export function showLoot(list, done, money){
  const rows=(list||[]).filter(x=>x && x.id && (x.n==null || x.n>0));
  money=Math.max(0, money|0);
  if(!rows.length && !money){ done && done(); return; }
  inv.addMany(rows);                                   // ← 真正入袋
  if(money) inv.addMoney(money);

  const ov=document.createElement('div'); ov.id='lootSheet';
  ov.innerHTML =
      '<div class="loot-panel">'
    +   '<div class="loot-title">拾得道具</div>'
    +   '<div class="loot-list">'
    +     (money ? '<div class="loot-row loot-money"><span class="loot-name">'+inv.moneyName()
                 + '</span><span class="loot-n">＋'+money+'</span></div>' : '')
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
export function showBag(){
  const ov=document.createElement('div'); ov.id='lootSheet'; ov.classList.add('bag');
  document.body.appendChild(ov);
  /* ⚠ 內容**重畫**而不是局部更新：賣掉最後一個時整列要消失、分類可能變空、
     金額要跟著變 —— 局部更新要處理的分支比重畫多，而這一頁最多幾十列。 */
  const render=()=>{
    const body=inv.grouped().map(g=>{
      /* ⚠ 道具欄**只顯示，不交易**（ver -368，Ray：「只有在商店能買賣」）。
         賣東西在 `showShop()`，那一頁才有價格與確認。 */
      const rows = g.rows.length
        ? g.rows.map(r=>'<div class="loot-row"><span class="loot-name">'+r.name+'</span>'
                       + '<span class="loot-n">×'+r.n+'</span>'
                       + (r.desc?'<span class="loot-desc">'+r.desc+'</span>':'')+'</div>').join('')
        : '<div class="bag-empty">—</div>';
      return '<div class="bag-cat">'+g.name+'</div>'+rows;
    }).join('');
    ov.innerHTML='<div class="loot-panel"><div class="loot-title">道具欄</div>'
               + '<div class="bag-money">'+inv.moneyName()+'　<b>'+inv.getMoney()+'</b></div>'
               + '<div class="loot-list">'+body+'</div>'
               + '<button class="loot-ok" type="button">關閉</button></div>';
    ov.querySelector('.loot-ok').addEventListener('click', e=>{ e.stopPropagation();
      try{ SFX.unlock(); SFX.menuClick(); }catch(_){} close(); });
  };
  const close=()=>{ ov.classList.remove('on');
    setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 220); };
  render();
  requestAnimationFrame(()=>ov.classList.add('on'));
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
export function showShop(stockKey, keeper, onTalk){
  const ov=document.createElement('div'); ov.id='lootSheet'; ov.classList.add('bag','shop');
  document.body.appendChild(ov);
  const SHOP=GAME_CONFIG.shop||{};
  const stock=((SHOP.stock||{})[stockKey])||[];
  /* 這一家店的長相（ver -377）。沒登記就走預設 —— 舊的雜貨舖不必改任何呼叫端。 */
  const cfg=((SHOP.shops||{})[stockKey])||{};
  const TABS=(cfg.tabs&&cfg.tabs.length)?cfg.tabs:['buy','sell'];
  const TABNAME=Object.assign({ buy:'買', sell:'賣', mod:'改裝' }, cfg.tabName||{});
  let tab=TABS[0], pick=null;

  const close=()=>{ ov.classList.remove('on');
    setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 200); };

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

    let rows='';
    if(tab==='buy'){
      rows = stock.length ? stock.map(id=>{
        const d=inv.defOf(id)||{}, price=inv.priceOf(id);
        const has=inv.count(id)>0 || ((GAME_CONFIG.weapons||{})[id]||{}).owned;
        return '<div class="shop-row'+(pick===id?' pick':'')+'" data-id="'+id+'">'
             + '<span class="loot-name">'+(d.name||id)+(has?'<i class="wp-have">持有</i>':'')+'</span>'
             + '<span class="loot-n">'+price+' '+inv.moneyName()+'</span></div>';
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
    const can = pick && tab!=='mod' &&
                (tab==='buy' ? (inv.getMoney()>=price && !owned) : inv.count(pick)>0);

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
      + '<div class="loot-title">'+(cfg.title||'商店')+'</div>'
      + '<div class="bag-money">'+inv.moneyName()+'　<b>'+inv.getMoney()+'</b></div>'
      + '<div class="shop-tabs">'
      +   TABS.map(t=>'<button class="shop-tab'+(tab===t?' on':'')+'" data-tab="'+t+'" type="button">'
                    + (TABNAME[t]||t)+'</button>').join('')
      + '</div>'
      + '<div class="shop-body">'
      +   '<div class="shop-list">'+rows+'</div>'
      +   '<img class="shop-keeper-art" src="'+(cfg.art||'resources/SI/NPC_Grocerie_SI.webp')+'" alt="">'
      + '</div>'
      + '<div class="shop-desc">'+desc+'</div>'
      + '<div class="shop-acts">'
      +   (tab==='mod' ? ''
          : '<button class="shop-do'+(can?'':' broke')+'" type="button">'
            + (tab==='buy' ? (owned?'已持有':'買下 '+price) : '賣出 '+price)+'</button>')
      +   (keeper&&keeper.length ? '<button class="shop-talk" type="button">與店主交談</button>' : '')
      +   '<button class="loot-ok" type="button">關閉</button>'
      + '</div></div>';

    ov.querySelectorAll('.shop-tab').forEach(b=>b.addEventListener('click', e=>{
      e.stopPropagation(); tab=b.dataset.tab; pick=null;
      try{ SFX.menuClick(); }catch(_){} render(); }));
    ov.querySelectorAll('.shop-row').forEach(b=>b.addEventListener('click', e=>{
      e.stopPropagation(); pick=b.dataset.id;
      try{ SFX.menuClick(); }catch(_){} render(); }));
    const doBtn=ov.querySelector('.shop-do');
    if(doBtn) doBtn.addEventListener('click', e=>{
      e.stopPropagation();
      if(!pick || !can) return;
      try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
      if(tab==='buy'){
        const p=inv.priceOf(pick);
        if(!inv.spendMoney(p)) return;        // 錢不夠：什麼都不做（鈕本來就是暗的）
        inv.add(pick, 1);
      }else{
        const p=inv.sellPrice(pick);
        if(inv.count(pick)<=0) return;
        inv.remove(pick, 1); inv.addMoney(p);
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
    ov.querySelector('.loot-ok').addEventListener('click', e=>{ e.stopPropagation();
      try{ SFX.unlock(); SFX.menuClick(); }catch(_){} close(); });
  };
  render();
  requestAnimationFrame(()=>ov.classList.add('on'));
}

/* ══ 懸賞榜（ver -375）══
   賞金獵人公會的委託榜。**目前只有展示** —— 接單／完成／領賞還沒做（Ray 的稿到「登記」
   為止），所以這一頁沒有按鈕，只有一張清單與關閉。
   ⚠ 委託內容在 `config.bounties`，這裡只負責演（鐵律 1）。要加委託就加資料，不動這支。
   ⚠ 依 `city` 篩選：櫃台說了「各個城市的委託也會不同」，那句話得在資料上成立。 */
export function showBounty(city){
  const all=GAME_CONFIG.bounties||{};
  const list=Object.keys(all).filter(k=> !city || all[k].city===city).map(k=>all[k]);
  const unit=(GAME_CONFIG.items&&GAME_CONFIG.items.moneyName)||'G';
  const ov=document.createElement('div'); ov.id='lootSheet'; ov.classList.add('bag','bounty');
  document.body.appendChild(ov);
  const body = list.length
    ? list.map(b=>'<div class="loot-row bounty-row"><span class="loot-name">'+b.name+'</span>'
        + '<span class="loot-n">'+b.reward+unit+'</span>'
        + (b.desc?'<span class="loot-desc">'+b.desc+'</span>':'')+'</div>').join('')
    : '<div class="bag-empty">目前沒有委託。</div>';
  ov.innerHTML='<div class="loot-panel"><div class="loot-title">懸賞榜</div>'
             + '<div class="loot-list">'+body+'</div>'
             + '<button class="loot-ok" type="button">關閉</button></div>';
  const close=()=>{ ov.classList.remove('on');
    setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 220); };
  ov.querySelector('.loot-ok').addEventListener('click', e=>{ e.stopPropagation();
    try{ SFX.unlock(); SFX.menuClick(); }catch(_){} close(); });
  requestAnimationFrame(()=>ov.classList.add('on'));
}
