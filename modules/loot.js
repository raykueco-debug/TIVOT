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

import { GAME_CONFIG } from '../config.js';
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
  let tab='buy', pick=null;

  const close=()=>{ ov.classList.remove('on');
    setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 200); };

  const render=()=>{
    const sellable=[];
    for(const g of inv.grouped()) for(const r of g.rows) if(inv.sellPrice(r.id)>0) sellable.push(r);
    const rows = (tab==='buy')
      ? (stock.length ? stock.map(id=>{
            const d=inv.defOf(id)||{}, price=inv.priceOf(id);
            return '<div class="shop-row'+(pick===id?' pick':'')+'" data-id="'+id+'">'
                 + '<span class="loot-name">'+(d.name||id)+'</span>'
                 + '<span class="loot-n">'+price+' '+inv.moneyName()+'</span></div>';
          }).join('') : '<div class="bag-empty">這家店沒有在賣東西。</div>')
      : (sellable.length ? sellable.map(r=>
            '<div class="shop-row'+(pick===r.id?' pick':'')+'" data-id="'+r.id+'">'
          + '<span class="loot-name">'+r.name+'</span>'
          + '<span class="loot-n">×'+r.n+'　'+inv.sellPrice(r.id)+' '+inv.moneyName()+'</span></div>'
          ).join('') : '<div class="bag-empty">沒有可以賣的東西。</div>');

    const d=pick ? (inv.defOf(pick)||{}) : null;
    const price = pick ? (tab==='buy' ? inv.priceOf(pick) : inv.sellPrice(pick)) : 0;
    const can = pick && (tab==='buy' ? inv.getMoney()>=price : inv.count(pick)>0);

    ov.innerHTML='<div class="loot-panel shop-panel">'
      + '<div class="loot-title">商店</div>'
      + '<div class="bag-money">'+inv.moneyName()+'　<b>'+inv.getMoney()+'</b></div>'
      + '<div class="shop-tabs">'
      +   '<button class="shop-tab'+(tab==='buy'?' on':'')+'" data-tab="buy" type="button">買</button>'
      +   '<button class="shop-tab'+(tab==='sell'?' on':'')+'" data-tab="sell" type="button">賣</button>'
      + '</div>'
      + '<div class="shop-body">'
      +   '<div class="shop-list">'+rows+'</div>'
      +   '<img class="shop-keeper-art" src="resources/SI/NPC_Grocerie_SI.webp" alt="">'
      + '</div>'
      + '<div class="shop-desc">'+(d ? (d.desc||'') : '選一項看說明。')+'</div>'
      + '<div class="shop-acts">'
      +   '<button class="shop-do'+(can?'':' broke')+'" type="button">'
      +     (tab==='buy' ? '買下 '+price : '賣出 '+price)+'</button>'
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
      if(!pick) return;
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
