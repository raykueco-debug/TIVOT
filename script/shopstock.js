/* ══════════════════════════════════════════════════════════════════════
   shopstock.js — 店鋪的存貨（ver -405，Ray：「給店鋪加入存貨數量，購買時可選擇
   購買數量，槍店武器存貨量都是 1，除非玩家賣給他才會入庫再賣」）
   ──────────────────────────────────────────────────────────────────────
   ⚠⚠ 初始貨量是**內容資料**（`config.shop.stock`），這裡只管「現在還剩幾個」——
     鐵律 1：程式不寫死任何內容數值。貨單長什麼樣見 config 那一段的說明。
   ⚠ 存的是**絕對值**（現在還剩幾個），不是「與初始值的差」。差值的寫法在 config
     改動之後會算出負數或憑空長出貨；絕對值頂多是「改了 config 但舊存檔沒吃到」，
     那個代價小得多。
   ⚠ 只存**動過的**：沒買過也沒賣過的品項不進存檔，讀出來時回去問 config。
   ⚠⚠ 這是**一輪遊戲內**的狀態（§6.9）：`progress.newRun()` 要清它、
     `runSnapshot()/runRestore()` 要存得起來讀得回去 —— **同一張清單的兩面**，
     漏一支的下場是「讀了舊存檔卻還帶著新一輪買空的貨架」。
   ══════════════════════════════════════════════════════════════════════ */

import { GAME_CONFIG } from '../config.js';

export const KEY = 'tivot_shopstock_v1';

const rd = () => { try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ return {}; } };
const wr = o => { try{ localStorage.setItem(KEY, JSON.stringify(o||{})); }catch(e){} };

/* config 上的貨單。一筆可以是字串（＝**不限量**）或 `{id,n}`。 */
function cfgList(shopKey){
  const st=((GAME_CONFIG.shop||{}).stock||{})[shopKey];
  return Array.isArray(st) ? st : [];
}
function cfgEntry(shopKey, id){
  for(const e of cfgList(shopKey)){
    if(typeof e === 'string'){ if(e===id) return { id, n:null }; }
    else if(e && e.id===id) return e;
  }
  return null;
}
/* 不限量：config 那一筆寫成字串、或 `n` 沒給／給 null。 */
const UNLIMITED = Infinity;
function baseCount(e){ return (e && e.n!=null) ? Math.max(0, e.n|0) : UNLIMITED; }

/* 這家店現在的貨架：`[{id, n}]`，`n` 是數字或 `Infinity`。
   ⚠ 順序＝**config 的順序在前，玩家賣進來的在後** —— 貨架的排法要穩定，
     玩家才記得住東西在哪一列。 */
export function list(shopKey){
  const saved=rd()[shopKey] || {};
  const out=[], seen=new Set();
  for(const e of cfgList(shopKey)){
    const id = (typeof e==='string') ? e : (e && e.id);
    if(!id || seen.has(id)) continue;
    seen.add(id);
    const n = (saved[id]!=null) ? Math.max(0, saved[id]|0) : baseCount(cfgEntry(shopKey,id));
    out.push({ id, n });
  }
  /* 玩家賣進來、但貨單上原本沒有的東西 —— 店家收了就會擺出來賣（Ray 指定）。 */
  for(const id in saved){
    if(seen.has(id)) continue;
    out.push({ id, n: Math.max(0, saved[id]|0) });
  }
  return out;
}

export function count(shopKey, id){
  const saved=rd()[shopKey] || {};
  if(saved[id]!=null) return Math.max(0, saved[id]|0);
  const e=cfgEntry(shopKey, id);
  return e ? baseCount(e) : 0;
}

/* 內部：把某一項的**現值**寫回去。⚠ 不限量的品項永遠不記帳 ——
   記了就變成有限的了（第一次買完之後就再也回不去 Infinity）。 */
function setCount(shopKey, id, n){
  if(!isFinite(n)) return;
  const all=rd();
  const shop = all[shopKey] || (all[shopKey]={});
  shop[id]=Math.max(0, n|0);
  wr(all);
}

/* 玩家買走 k 個。回傳真的買到幾個（不夠就只賣得出剩下那些）。 */
export function take(shopKey, id, k){
  const want=Math.max(0, (k==null?1:k)|0);
  const have=count(shopKey, id);
  if(!isFinite(have)) return want;              // 不限量：要幾個有幾個
  const got=Math.min(want, have);
  if(got>0) setCount(shopKey, id, have-got);
  return got;
}
/* 玩家賣給店家 k 個 → **入庫，之後買得回來**（Ray 指定）。 */
export function give(shopKey, id, k){
  const add=Math.max(0, (k==null?1:k)|0);
  if(!add) return;
  const have=count(shopKey, id);
  if(!isFinite(have)) return;                   // 不限量的東西不必記
  setCount(shopKey, id, have+add);
}

/* ── 一輪遊戲的存讀（§6.9：與 newRun 是同一張清單的兩面）── */
export function snapshot(){ return rd(); }
export function restore(o){ wr(o || {}); }
export function clear(){ wr({}); }
