/* ══════════════════════════════════════════════════════════════════════
   inventory.js — 道具欄（ver -358）
   ──────────────────────────────────────────────────────────────────────
   玩家手上有什麼，**只有這裡知道**。三條來源（戰鬥後獲取、商店購買、劇情取得）
   一律呼叫 `add()`；沒有第二個地方記持有量。

   ⚠ 為什麼放 `script/` 而不是 `modules/`：這裡是**存檔資料**，與 `progress.js`
     （stage / flags / 好感 / 玩家名）同一層 —— 兩支都是「跨頁共用、寫進 localStorage
     的單一真相」。`modules/` 放的是戰鬥與演出的邏輯。
   ⚠ 存的是 **id → 數量**，不存名稱。改名只動 `config.js` 的 `items.defs`，存檔不受影響。
   ⚠ 分類（道具/武器/素材/裝備/特殊）也在 config，這裡不寫死 —— 要加第六類只改 config。
   ══════════════════════════════════════════════════════════════════════ */

import { GAME_CONFIG } from '../config.js';

const KEY = 'tivot_inventory_v1';
const MONEY_KEY = 'tivot_money_v1';

const rd = () => { try{ return localStorage.getItem(KEY); }catch(e){ return null; } };
const wr = v  => { try{ localStorage.setItem(KEY, JSON.stringify(v)); }catch(e){} };

function ITEMS(){ return GAME_CONFIG.items || { catOrder:[], catName:{}, defs:{} }; }

/* 目前持有：`{id:數量}`。⚠ 每次都從 localStorage 讀，不做記憶體快取 ——
   飛行頁與主遊戲是同一組鑰匙，兩邊都可能寫，快取會走鐘（同 progress.js 的作法）。 */
export function all(){
  try{
    const j = JSON.parse(rd() || '{}');
    if(!j || typeof j!=='object') return {};
    const out={};
    for(const k in j){ const n = j[k]|0; if(n>0) out[k]=n; }
    return out;
  }catch(e){ return {}; }
}
export function count(id){ return all()[id] || 0; }

/* 道具定義（查不到回 null —— 呼叫端要能容忍，別讓一個打錯的 id 弄壞整個道具欄）。 */
export function defOf(id){ const d = ITEMS().defs[id]; return d || null; }
export function nameOf(id){ const d=defOf(id); return d ? d.name : String(id); }
export function catOf(id){ const d=defOf(id); return d ? d.cat : 'item'; }

/* 加道具。n 可為負（＝扣除），扣到 0 就從存檔裡拿掉。回傳加完之後的數量。
   ⚠ 未定義的 id **照樣收下**：素材是資料，程式不該因為 config 還沒寫就把玩家的東西吃掉。
     但會在 console 記一筆，讓漏填的定義現形。 */
const warned = new Set();
export function add(id, n){
  if(!id) return 0;
  n = (n==null ? 1 : n)|0;
  if(!defOf(id) && !warned.has(id)){ warned.add(id);
    console.info('[inventory] config.items.defs 裡沒有這個道具：', id); }
  const inv = all();
  const next = (inv[id]||0) + n;
  if(next>0) inv[id]=next; else delete inv[id];
  wr(inv);
  return Math.max(0, next);
}
/* 一次加一串（戰鬥掉落／商店一次買多樣／劇情給一包）。list＝`[{id,n},…]`。 */
export function addMany(list){
  for(const it of (list||[])) if(it && it.id) add(it.id, it.n==null?1:it.n);
  return all();
}
export function remove(id, n){ return add(id, -Math.abs((n==null?1:n)|0)); }

/* 依分類分組，順序照 config 的 `catOrder`。給道具欄 UI 用。
   回傳 `[{cat, name, rows:[{id,name,n,desc}]}, …]`，空的分類也會在（UI 決定要不要畫）。 */
export function grouped(){
  const I=ITEMS(), inv=all();
  const buckets={};
  for(const c of I.catOrder) buckets[c]=[];
  for(const id in inv){
    const c = catOf(id);
    (buckets[c] = buckets[c] || []).push({ id, name:nameOf(id), n:inv[id],
                                           desc:(defOf(id)||{}).desc || '' });
  }
  const out=[];
  for(const c of I.catOrder){
    const rows=(buckets[c]||[]).sort((a,b)=>a.id<b.id?-1:1);
    out.push({ cat:c, name:(I.catName[c]||c), rows });
  }
  /* config 沒列到的分類也不要吞掉（同 add 的原則）。 */
  for(const c in buckets) if(I.catOrder.indexOf(c)<0)
    out.push({ cat:c, name:c, rows:buckets[c] });
  return out;
}

/* ══ 金錢（ver -368）══
   ⚠ 與道具**分開存**（`tivot_money_v1`）：道具是 `{id:數量}`，硬把錢塞成一個假 id
     會讓「全部道具」那類走訪多一個特例，而且分類要為它開一個假分類。
   ⚠ 一律走 `addMoney`：扣到負數會被夾在 0（沒有欠款這回事）。 */
export function getMoney(){
  try{ const n=parseInt(localStorage.getItem(MONEY_KEY),10); return isFinite(n)&&n>0 ? n : 0; }
  catch(e){ return 0; }
}
function setMoney(n){ try{ localStorage.setItem(MONEY_KEY, String(Math.max(0, n|0))); }catch(e){} }
export function addMoney(n){ const v=Math.max(0, getMoney()+(n|0)); setMoney(v); return v; }
/* 花錢：夠才扣，回傳有沒有成功（商店用）。 */
export function spendMoney(n){
  n=Math.max(0, n|0); const have=getMoney();
  if(have<n) return false;
  setMoney(have-n); return true;
}
export function moneyName(){ return (ITEMS().moneyName)||'克朗'; }

/* ══ 變賣 ══
   ⚠ 沒寫 `sell` 的道具**不能賣**（劇情道具／任務物品）。回傳實際賣掉的數量與入袋金額。 */
export function sellPrice(id){ const d=defOf(id); return (d && d.sell>0) ? (d.sell|0) : 0; }
export function canSell(id){ return sellPrice(id)>0; }
export function sell(id, n){
  const price=sellPrice(id); if(!price) return { n:0, gain:0 };
  n=Math.max(1, (n==null?1:n)|0);
  const have=count(id); if(have<=0) return { n:0, gain:0 };
  n=Math.min(n, have);
  add(id, -n);
  const gain=price*n; addMoney(gain);
  return { n, gain };
}

/* 整包讀寫（存讀檔用；與 progress.snapshot/restore 同一套慣例）。 */
export function snapshot(){ return { items:all(), money:getMoney() }; }
export function restore(o){
  if(!o || typeof o!=='object') return;
  /* ⚠ 舊存檔是「直接一包道具」（沒有 items/money 兩層）—— 認得出來就照舊吃下去，
     不要讓玩家的道具因為格式升級而消失。 */
  if(o.items || o.money!=null){ if(o.items) wr(o.items); if(o.money!=null) setMoney(o.money); }
  else wr(o);
}
export function clear(){ wr({}); setMoney(0); }
