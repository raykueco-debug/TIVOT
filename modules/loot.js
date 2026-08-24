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

import * as inv from '../script/inventory.js';
import { SFX } from '../audio.js';

/* 顯示並入袋。list＝`[{id,n},…]`；done＝按下確認之後要做的事。
   ⚠ 空清單直接跳過（連視窗都不出）—— 「你什麼都沒撿到」不需要一頁。 */
export function showLoot(list, done){
  const rows=(list||[]).filter(x=>x && x.id && (x.n==null || x.n>0));
  if(!rows.length){ done && done(); return; }
  inv.addMany(rows);                                   // ← 真正入袋

  const ov=document.createElement('div'); ov.id='lootSheet';
  ov.innerHTML =
      '<div class="loot-panel">'
    +   '<div class="loot-title">拾得道具</div>'
    +   '<div class="loot-list">'
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
  const groups=inv.grouped();
  const body=groups.map(g=>{
    const rows = g.rows.length
      ? g.rows.map(r=>'<div class="loot-row"><span class="loot-name">'+r.name+'</span>'
                     +'<span class="loot-n">×'+r.n+'</span>'
                     +(r.desc?'<span class="loot-desc">'+r.desc+'</span>':'')+'</div>').join('')
      : '<div class="bag-empty">—</div>';
    return '<div class="bag-cat">'+g.name+'</div>'+rows;
  }).join('');
  const ov=document.createElement('div'); ov.id='lootSheet'; ov.classList.add('bag');
  ov.innerHTML='<div class="loot-panel"><div class="loot-title">道具欄</div>'
             + '<div class="loot-list">'+body+'</div>'
             + '<button class="loot-ok" type="button">關閉</button></div>';
  document.body.appendChild(ov);
  requestAnimationFrame(()=>ov.classList.add('on'));
  const close=()=>{ ov.classList.remove('on');
    setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 220); };
  ov.querySelector('.loot-ok').addEventListener('click', e=>{ e.stopPropagation();
    try{ SFX.unlock(); SFX.menuClick(); }catch(_){} close(); });
}
