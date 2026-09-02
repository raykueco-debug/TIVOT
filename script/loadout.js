/* ══════════════════════════════════════════════════════════════════════
   loadout.js — 副武器的**編成**（ver -422，Ray 指定的整備畫面）
   ──────────────────────────────────────────────────────────────────────
   三件事，全部存在這裡（唯一的真相，鐵律 7）：
     ① 三個順位各是哪一個**類別**（重機槍／霰彈槍／萊福槍），可拖曳改順序
     ② 每個類別現在拿哪一把槍（買了「絞肉機 改」之後，機槍那一格就是它）
     ③ 戰鬥中切換鈕的模式：`rotate`（輪轉，預設）／`fixed`（固定順位）

   ⚠⚠ 類別的**清單**來自 `config.weapons` 的出現順序（鐵律 1：不在程式裡寫中文字串）；
     這裡只存「玩家把它們排成什麼順序」。config 新增一個類別，它會自動排到最後。
   ⚠⚠ 這是**跨輪**的東西（§6.9：「武器與搭檔的選擇」不隨 `newRun()` 清掉）——
     它是玩家的操作偏好與持有物的搭配，不是劇情進度。
   ══════════════════════════════════════════════════════════════════════ */

import { GAME_CONFIG } from '../config.js';
import * as inv from './inventory.js';

const K_ORDER = 'tivot_wcat_order_v1';   // 類別的順序（陣列）
const K_PICK  = 'tivot_wcat_pick_v1';    // 類別 → 選用的武器鑰匙
const K_MODE  = 'tivot_wswitch_v1';      // 'rotate' | 'fixed'
const K_PTNR  = 'tivot_partner_v1';      // 本篇的戰鬥搭檔選擇（ver -741，見 partner.storyPartnerKey）

const rd = k => { try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } };
const wr = (k,v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };

/* config 裡出現過的類別，照出現順序。⚠ 這是**清單的來源**，不是玩家的順序。 */
export function allCats(){
  const out=[], W=GAME_CONFIG.weapons||{};
  for(const k in W){ const c=W[k].cat; if(c && out.indexOf(c)<0) out.push(c); }
  return out;
}

/* 玩家排好的順序。⚠ 與 config 對帳：沒見過的補在後面、已經不存在的丟掉 ——
   不對帳的話，config 改了類別之後存檔裡那份會留下幽靈。 */
export function order(){
  const all=allCats(), saved=rd(K_ORDER);
  const out=[];
  if(Array.isArray(saved)) for(const c of saved) if(all.indexOf(c)>=0 && out.indexOf(c)<0) out.push(c);
  for(const c of all) if(out.indexOf(c)<0) out.push(c);
  return out;
}
export function setOrder(list){
  const all=allCats();
  wr(K_ORDER, (list||[]).filter(c=>all.indexOf(c)>=0));
}

/* 這個類別現在拿哪一把。⚠ 只認**持有中**的（`inv.hasWeapon`）——
   存檔裡那把可能被賣掉了，這時候回退到持有清單裡的第一把。 */
export function pickOf(cat){
  const W=GAME_CONFIG.weapons||{};
  const owned=inv.ownedWeapons().filter(k=>W[k] && W[k].cat===cat);
  if(!owned.length) return null;
  const saved=(rd(K_PICK)||{})[cat];
  return (saved && owned.indexOf(saved)>=0) ? saved : owned[0];
}
export function setPick(cat, key){
  const m=rd(K_PICK)||{}; m[cat]=key; wr(K_PICK, m);
}
/* 有槍可用的類別（順序照玩家排的）。⚠ 一把都沒有的類別不進戰鬥的輪轉。 */
export function activeCats(){ return order().filter(c=>!!pickOf(c)); }

/* 切換模式。預設 `rotate`（Ray 指定）。 */
export function mode(){ return rd(K_MODE)==='fixed' ? 'fixed' : 'rotate'; }
export function setMode(m){ wr(K_MODE, m==='fixed' ? 'fixed' : 'rotate'); }

/* 一順位的武器（固定模式的歸位目標、也是開場的預設）。 */
export function firstWeapon(){
  const cs=activeCats();
  return cs.length ? pickOf(cs[0]) : null;
}
/* 第 n 順位（1 起算）。超出就回最後一個有槍的類別。 */
export function weaponAt(n){
  const cs=activeCats(); if(!cs.length) return null;
  return pickOf(cs[Math.min(Math.max(1,n|0), cs.length)-1]);
}

/* ══ 本篇的戰鬥搭檔選擇（ver -741，Ray 的 stage2 稿：「選安或諾都可以，
   選定後回到畫面」）══════════════════════════════════════════════════════
   只存「玩家挑了誰」；**現在能挑誰**由 partner.storyPartnerPool()（旗標）回答 ——
   選擇是偏好（跨輪，§6.9 不隨 newRun 清），資格是劇情（旗標）。
   讀取端（partner.storyPartnerKey）要自己驗「選的人還在 pool 裡」，
   不在＝當沒選（讀檔回到安雅還沒入隊的章節時，選『安雅』不能成立）。 */
export function partner(){ const v=rd(K_PTNR); return (typeof v==='string' && v) ? v : null; }
export function setPartner(key){ wr(K_PTNR, key||null); }
