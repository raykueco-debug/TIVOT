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

import { GAME_CONFIG, weaponStatRows, weaponOf, weaponDescText, asset, sfxGain } from '../config.js';
import * as inv from '../script/inventory.js';
import * as shopStock from '../script/shopstock.js';   // 店鋪存貨（ver -405）
import * as prog from '../script/progress.js';         // 主武器的強化等級（ver -701）
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
                 +   '<span class="loot-n">×'+qtyText(n)+'</span>'
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
/* 道具清單（分類標題＋逐列）的 HTML —— **只有這一份**（鐵律 8）：
   `showBag`（獨立視窗）與整備頁的「道具」分頁（ver -457）都用它。
   純顯示、不含裝備鈕（裝備那一版有自己的分支，見 showBag 的 equip 段）。 */
/* 數量的字面（ver -661）：永遠帶著的東西是 `Infinity` → 印「∞」。
   ⚠ 只有這一支在轉（鐵律 8）：四個印「×n」的地方都問它，漏一個就會出現「×Infinity」。 */
function qtyText(n){ return (n===Infinity || n===-Infinity || !isFinite(n)) ? '∞' : String(n); }

export function bagListHtml(catFilter, opts){
  ensureCss();
  const o=opts||{};
  /* `catFilter` 吃分類鍵（'item'）或顯示名（'道具'）—— 呼叫端兩種都出現過。 */
  return inv.grouped().filter(g=>!catFilter || g.name===catFilter || g.cat===catFilter).map(g=>{
    const rows=g.rows.length
      ? g.rows.map(r=>{
          /* 「使　用」只長在**有使用效果**的道具上（`defs[].use`，目前只有回 HP）——
             呼叫端開 `o.use` 才給（ver -497，整備頁；按下去做什麼由呼叫端綁）。 */
          const u=o.use && ((inv.defOf(r.id)||{}).use||null);
          const useBtn=(u && u.hp!=null)
            ? '<button class="bag-use" data-id="'+r.id+'" type="button">使　用</button>' : '';
          return '<div class="loot-row"><span class="loot-name">'+r.name+'</span>'
               + '<span class="loot-n">×'+qtyText(r.n)+'</span>'
               + (r.desc?'<span class="loot-desc">'+r.desc+'</span>':'')
               + useBtn + '</div>';
        }).join('')
      : '<div class="bag-empty">—</div>';
    /* 分頁模式（單一分類）不再印分類標題 —— 頁籤本身就是標題。 */
    return (catFilter ? '' : '<div class="bag-cat">'+g.name+'</div>')+rows;
  }).join('');
}

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
    }else groups=null;   // 一般（非裝備）視圖 → 共用 bagListHtml（見上）
    const body=(groups||[]).map(g=>{
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
                 + (o.equip ? '' : '<span class="loot-n">×'+qtyText(r.n)+'</span>')
                 + (r.desc?'<span class="loot-desc">'+r.desc+'</span>':'')+btn+'</div>';
          }).join('')
        : '<div class="bag-empty">—</div>';
      return '<div class="bag-cat">'+g.name+'</div>'+rows;
    }).join('') || bagListHtml(o.cat);
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
  /* ══ 主武器的九階強化（ver -707，Ray 交卡：水瓶座九顆星）══════════════════
     **非線性**：九顆星各自獨立，玩家自由選要升哪一顆 —— 所以這一頁是「選一列
     再按強化」，不是「只有下一級可以按」（-701 的線性版已推翻）。
     ⚠ 星的資料、配方全在 config（鐵律 1）；`modReady` 是素材夠不夠的唯一判定（鐵律 7）。
     ⚠⚠ **內部數值不顯示給玩家**（Ray 指定）：只印星名、名稱與效果那一句。 */
  const STARS=()=>GAME_CONFIG.gunStars||[];
  const modRecipe=(id)=>((GAME_CONFIG.gunUpgrade||{}).recipes||{})[id]||null;
  const modDone=(st)=>prog.starCount(st.id)>0 && !st.repeat;    // 單次的星升過就滿了
  function modReady(id){
    const st=STARS().find(d=>d.id===id); if(!st || modDone(st)) return false;
    const r=modRecipe(id); if(!r) return false;
    if((r.money||0) > inv.getMoney()) return false;
    for(const k in (r.items||{})) if(inv.count(k) < r.items[k]) return false;
    return true;
  }
  function modRows(){
    const lit=STARS().filter(st=>prog.starCount(st.id)>0).length;
    const rows=STARS().map(st=>{
      const n=prog.starCount(st.id), r=modRecipe(st.id), done=modDone(st);
      const mats=r ? Object.keys(r.items||{}).map(id=>{
        const have=inv.count(id), need=r.items[id];
        return '<span class="mod-mat'+(have>=need?'':' lack')+'">'
             + inv.nameOf(id)+' '+(isFinite(have)?have:'∞')+'/'+need+'</span>';
      }).join('') : '<span class="mod-mat lack">配方未定</span>';
      return '<div class="shop-row mod-row'+(done?' done':'')+(pick===st.id?' pick':'')+'"'
           +   ' data-id="'+st.id+'">'
           + '<span class="loot-name"><i class="mod-star">'+st.star+'</i>'+st.name
           +   (n>0 ? (st.repeat ? '　×'+n : '　✓') : '')+'</span>'
           + '<span class="mod-eff">'+st.desc+'</span>'
           + '<span class="mod-need">'+(done ? '' : mats
             + (r&&r.money ? '<span class="mod-mat'+(inv.getMoney()>=r.money?'':' lack')+'">'
                           + r.money+' '+inv.moneyName()+'</span>' : ''))
           + '</span></div>';
    });
    return '<div class="mod-head">主武器　'+((GAME_CONFIG.mainGun||{}).name||'')
         + '　已點亮 '+lit+' / '+STARS().length+'</div>' + rows.join('');
  }
  const cfg=((SHOP.shops||{})[stockKey])||{};
  const TABS=(cfg.tabs&&cfg.tabs.length)?cfg.tabs:['buy','sell'];
  const TABNAME=Object.assign({ buy:'買', sell:'賣', mod:'改裝' }, cfg.tabName||{});
  let tab=TABS[0], pick=null;
  /* ══ 購物車（ver -496，Ray：「商店購物可以選要購買的商品數量一次結帳」）══
     `cart[id]=n`：每一列自己的 −/＋ 加減，底下一顆「結帳」一次付清。
     取代 -405 的「選一項→調數量→買下」——那一套一次只能結一項。
     ⚠ 換頁籤一律清空：留著會把上一頁的總價帶進結帳鈕（-405 同一個理由）。
     ⚠ 上限照舊三個取最小（鐵律 7 的那組）：店裡剩幾個／錢夠付整車／武器的 1。 */
  /* ⚠⚠ **賣也走購物車**（ver -662，Ray：「賣沒有做結帳啊」）——-496 只把買的那一邊
     做成車，賣的那一邊還是「選一項→按一下賣一個」，兩邊的操作邏輯不一致。
     現在**同一台車、同一顆結帳鈕**（鐵律 8），差別只有單價從哪裡問、上限是誰。 */
  let cart={};
  const cartCount=()=>Object.values(cart).reduce((a,b)=>a+b,0);
  /* 這一頁的單價：買＝市價、賣＝收購價（唯一那一支在算，鐵律 7）。 */
  const unitOf=(id)=> (tab==='sell') ? inv.sellPrice(id) : inv.priceOf(id);
  const cartTotal=()=>Object.keys(cart).reduce((a,id)=>a+unitOf(id)*cart[id],0);
  /* 這一列最多能加幾個。
       買 → 店裡剩幾個／武器只有 1／上限 99
       賣 → 手上有幾個（`Infinity` 的夾成 99：一次賣 99 個已經夠，
             而 UI 上「×∞」那一列還是可以再結一次帳） */
  const capOf=(id)=>{
    if(tab==='sell'){ const h=inv.count(id); return isFinite(h) ? h : 99; }
    const left=shopStock.count(stockKey, id);
    const w=!!(GAME_CONFIG.weapons||{})[id];
    return Math.min(w?1:99, isFinite(left)?left:99);
  };
  /* 這一列的 −/＋（買賣共用的那一段 HTML）。 */
  const cartCtrl=(id)=>{ const n=cart[id]||0;
    return '<span class="shop-cartline">'
         + '<button class="cr-m'+(n<=0?' off':'')+'" type="button">−</button>'
         + '<b class="cr-n'+(n>0?' on':'')+'">×'+n+'</b>'
         + '<button class="cr-p" type="button">＋</button></span>'; };

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

  /* 結帳音（ver -499 買／-663 賣）：**只在真的成交那一刻**響，買賣共用一支
     （鐵律 8）—— 那是「結帳」的聲音，不是「買東西」的聲音。 */
  const checkoutSfx=()=>{ try{ SFX.play(asset('se_buy'), sfxGain('se_buy')); }catch(_){} };

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
        /* 這一列的 −/＋（ver -496 購物車）：買不到的不給 —— 售完、以及**已持有的武器**
           （`hasWeapon` 是布林，第二把在資料上表達不出來）。一般道具持有了照樣加購
           （-405 的 `owned` 擋掉整鈕是連牛奶都不能買第二瓶，那是 bug 不是規則）。
           數量為 0 時「−」暗掉 —— 控件常駐，玩家才知道每一列都能加。 */
        const isW=!!(GAME_CONFIG.weapons||{})[id];
        const ctrl = (!out && !(isW && has)) ? cartCtrl(id) : '';
        return '<div class="shop-row'+(pick===id?' pick':'')+(out?' out':'')+'" data-id="'+id+'">'
             + '<span class="loot-name">'+(d.name||id)+'</span>'
             + '<span class="loot-n">'+price+' '+inv.moneyName()+'</span>'
             + ((tags||ctrl) ? '<span class="shop-tags">'+tags+ctrl+'</span>' : '')+'</div>';
      }).join('') : '<div class="bag-empty">這家店沒有在賣東西。</div>';
    }else if(tab==='sell'){
      rows = sellable.length ? sellable.map(r=>
            '<div class="shop-row'+(pick===r.id?' pick':'')+'" data-id="'+r.id+'">'
          + '<span class="loot-name">'+r.name+'</span>'
          + '<span class="loot-n">×'+qtyText(r.n)+'　'+inv.sellPrice(r.id)+' '+inv.moneyName()+'</span>'
          + '<span class="shop-tags">'+cartCtrl(r.id)+'</span></div>'
          ).join('') : '<div class="bag-empty">沒有可以賣的東西。</div>';
    }else{
      /* ══⚠⚠ 改裝＝**主武器的素材強化**（ver -701，Ray：「強化原則上走的是素材
         收集，打靶給強化是特殊事件」）══════════════════════════════════════
         九顆星全部列出來，玩家才知道**要去收什麼** —— 那正是這個玩法
         的內容。⚠ ver -707 改成**非線性**：九顆星各自獨立，選哪一列就升哪一顆。
         ⚠ 配方在 `config.gunUpgrade.recipes`（鐵律 1）；這裡只讀、不算。
         ⚠ 素材夠不夠**只有 `modReady` 一支在判**（鐵律 7）：列的樣式與底下那顆
           鈕都問它，各判一次必然出現「列是亮的、鈕卻按不動」。 */
      rows = modRows();
    }

    const d=pick ? (inv.defOf(pick)||{}) : null;
    const price = pick ? (tab==='buy' ? inv.priceOf(pick) : inv.sellPrice(pick)) : 0;
    /* 結帳鈕（ver -496 購物車）：車裡有東西才亮。「錢不夠」不會發生在這裡 ——
       每一列的「＋」在總價會超過持有金額的那一刻就擋掉了。 */
    const total = cartTotal();
    const can = (tab==='mod') ? (!!pick && modReady(pick)) : cartCount()>0;

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
      + '<div class="shop-acts">'
      +   (tab==='mod'
          ? ('<button class="shop-do'+(can?'':' broke')+'" type="button">強　化</button>')
          : '<button class="shop-do'+(can?'':' broke')+'" type="button">'
            /* 結帳（ver -496）：整車一次付清；車是空的鈕就暗著（字不變，
               玩家看得到這一顆是幹嘛的）。售完／已持有的狀態在各自那一列上。 */
            /* ⚠ 賣的總價前面加「＋」：同一顆鈕在兩頁的金額方向相反，
               不標的話「結帳 1000」讀起來像要付錢。 */
            + (can ? ('結帳　'+(tab==='sell'?'＋':'')+total+' '+inv.moneyName()) : '結　帳')
            +'</button>')
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
      e.stopPropagation(); tab=b.dataset.tab; pick=null; cart={};
      try{ SFX.menuClick(); }catch(_){} render(); }));
    ov.querySelectorAll('.shop-row').forEach(b=>b.addEventListener('click', e=>{
      e.stopPropagation();
      if(b.classList.contains('out')) return;      // 售完的那一列點不動
      pick=b.dataset.id;
      try{ SFX.menuClick(); }catch(_){} render(); }));
    /* 每一列的 −/＋（ver -496 購物車）。上限三個取最小（店裡剩幾個／武器的 1），
       錢的上限擋在「＋」這一刻：整車總價要罩得住，罩不住就按不動。 */
    ov.querySelectorAll('.shop-row .cr-p').forEach(b=>b.addEventListener('click', e=>{
      e.stopPropagation();
      const id=b.closest('.shop-row').dataset.id;
      const n=cart[id]||0;
      if(n >= capOf(id)) return;
      /* 錢的上限只有**買**才擋（賣是進帳）。 */
      if(tab==='buy' && cartTotal()+inv.priceOf(id) > inv.getMoney()) return;
      cart[id]=n+1; pick=id;
      try{ SFX.menuClick(); }catch(_){} render(); }));
    ov.querySelectorAll('.shop-row .cr-m').forEach(b=>b.addEventListener('click', e=>{
      e.stopPropagation();
      const id=b.closest('.shop-row').dataset.id;
      const n=cart[id]||0; if(n<=0) return;
      if(n<=1) delete cart[id]; else cart[id]=n-1;
      pick=id;
      try{ SFX.menuClick(); }catch(_){} render(); }));
    const doBtn=ov.querySelector('.shop-do');
    if(doBtn) doBtn.addEventListener('click', e=>{
      e.stopPropagation();
      if(!can) return;
      if(tab!=='buy' && !pick) return;   // 賣與改裝都要先選一列（ver -707）
      /* ⚠ 結帳鈕的音在**成交那一刻**才響 —— 這裡只解鎖，不先「喀」一聲，
         不然會兩聲疊在一起。
         ⚠⚠ **買與賣同一支 `se_buy`**（ver -663，Ray：「賣也要有結帳音效喔」）：
           那是「結帳」的聲音，不是「買東西」的聲音 —— 兩邊是同一個動作。
           -662 之前賣走的是 `menuClick`，而且在**按下去**就響（不管成不成交）。 */
      try{ SFX.unlock(); }catch(_){}
      /* ══ 強化（ver -701）══ ⚠ **先扣素材再扣錢**（同買的那一支）：
         少扣可以，不能發生「錢扣了等級沒升」。⚠ `can` 已經確認過夠了。 */
      if(tab==='mod'){
        const r=modRecipe(pick); if(!r || !modReady(pick)) return;
        for(const id in (r.items||{})) inv.remove(id, r.items[id]);
        if(r.money) inv.spendMoney(r.money);
        prog.addStar(pick);
        checkoutSfx();
        render();
        return;
      }
      if(tab==='buy'){
        /* ══ 一次結帳（ver -496 購物車）══
           ⚠ **先扣店裡的貨再扣錢**（-405 的原則不變）：`take` 回傳「真的拿到幾個」——
             貨不夠永遠只會少賣，不會發生「錢扣了東西沒拿到」。
           付不出來理論上不會發生（「＋」那一刻就擋了），真發生就整車放回。 */
        const got={}; let sum=0;
        for(const id of Object.keys(cart)){
          const g=shopStock.take(stockKey, id, cart[id]);
          if(g>0){ got[id]=g; sum+=inv.priceOf(id)*g; }
        }
        if(!sum) return;
        if(!inv.spendMoney(sum)){
          for(const id in got) shopStock.give(stockKey, id, got[id]);
          return;
        }
        for(const id in got) inv.add(id, got[id]);
        cart={};
        checkoutSfx();
      }else{
        /* ══ 一次結帳（賣，ver -662）══
           ⚠ **先確認手上真的有**（`count`），再扣、再入袋 —— 同買的那一支
             「先扣貨再扣錢」的精神：少賣可以，不能發生「錢進來了東西沒少」。 */
        let sum=0;
        for(const id of Object.keys(cart)){
          const have=inv.count(id);
          const n=Math.min(cart[id], isFinite(have)?have:cart[id]);
          if(n<=0) continue;
          inv.remove(id, n); sum += inv.sellPrice(id)*n;
          /* ⚠ **賣給店家＝入庫**（Ray 指定：「除非玩家賣給他才會入庫再賣」）——
             武器店那三把各只有一支，賣掉之後想反悔就得靠這一條。
             ⚠ **永遠帶著的東西不入庫**（ver -661）：那一條是給「真的會變少」的東西
               用的，紋章賣了還在他身上，再堆進貨架等於憑空生出一堆。 */
          if(!inv.isAlways(id)) shopStock.give(stockKey, id, n);
        }
        if(!sum) return;
        inv.addMoney(sum);
        cart={};
        checkoutSfx();
        if(pick && inv.count(pick)<=0) pick=null;     // 賣光了就取消選取
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
