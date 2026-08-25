/* ══════════════════════════════════════════════════════════════════════
   settings.js — 選單（ver -397，Ray：「選單裡面有回到主選單，音量調節，
   自動播放速度調節等選項，音量分 BGM SE 跟語音」）
   ──────────────────────────────────────────────────────────────────────
   ⚠⚠ 這裡存的是**玩家的偏好**，不是一輪遊戲的進度 —— 所以 `progress.newRun()`
     **不清它**（同靜音、語言的處理，見 CLAUDE.md §6.9）。
   ⚠ 分軌音量與 `config` 那份「每一支音檔的實測增益」是兩回事：那份負責把三層拉齊
     （§6.6 的 LUFS 表），這一層負責讓玩家再調整。**兩者相乘**，不要互相取代。
   ⚠ 套用只有一支（`apply()`）：開機、改設定都呼叫它，不要在別處各自 setLayerVolume。
   ══════════════════════════════════════════════════════════════════════ */

import { SFX } from '../audio.js';

const K = {
  bgm:  'tivot_vol_bgm_v1',
  se:   'tivot_vol_se_v1',
  vo:   'tivot_vol_vo_v1',
  auto: 'tivot_auto_ms_v1',
  hap:  'tivot_haptics_v1',
};

/* 自動播放：一句唸完之後停多久才走下一句。
   ⚠ 掛在**「這一句唸完」**的回呼上，不是固定秒數（§6.5）—— 這個數字是「讀完之後」的停頓。
   ⚠ 範圍與預設：400~2000ms，預設 1100（= ver -367 訂的那個值，改這裡等於改預設）。 */
export const AUTO_MIN = 400, AUTO_MAX = 2000, AUTO_DEFAULT = 1100;

const rd = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const wr = (k,v) => { try{ localStorage.setItem(k, String(v)); }catch(e){} };
const num = (v, d) => { const n=parseFloat(v); return isFinite(n) ? n : d; };

export function volOf(layer){ return Math.max(0, Math.min(1, num(rd(K[layer]), 1))); }
export function autoDelayMs(){
  return Math.max(AUTO_MIN, Math.min(AUTO_MAX, num(rd(K.auto), AUTO_DEFAULT)));
}

/* 震動開關（ver -398，Ray 指定）。預設**開**。
   ⚠ 這裡只管「玩家要不要」；「這台裝置做不做得到」由 `modules/haptics.js` 判
     （iOS Safari 沒有 `navigator.vibrate`）。兩件事分開，開關才不會因為裝置不支援
     就自己變成關的。 */
export function haptics(){ return rd(K.hap) !== '0'; }
export function setHaptics(on){ wr(K.hap, on ? '1' : '0'); }

/* 套用到音訊層。⚠ **唯一的套用點**（鐵律 8）：開機時由 main.js 呼叫一次，
   面板每動一下也呼叫。 */
export function apply(){
  for(const l of ['bgm','se','vo']) SFX.setLayerVolume(l, volOf(l));
}

/* ══ 面板 ══
   ⚠ 蓋在最上層並吃掉點擊：它是選單，底下的畫面不該被誤觸。
   ⚠ 音量拖動時**即時套用**（放開才套的話玩家聽不出自己在調什麼）。 */
export function open(opts){
  if(document.getElementById('gameMenu')) return;
  const o = opts || {};
  const ov = document.createElement('div'); ov.id='gameMenu';
  ov.innerHTML='<div class="gm-panel"></div>';
  document.body.appendChild(ov);
  ov.addEventListener('pointerdown', e=>e.stopPropagation());
  ov.addEventListener('click', e=>e.stopPropagation());
  const panel = ov.querySelector('.gm-panel');
  const close = ()=>{ ov.classList.remove('on');
    setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 200); };

  /* ⚠ 面板是**換頁**的（主頁 ⇄ 確認頁），所以每一頁各自 render＋綁事件 ——
     不要 close 完再 open 一次：`open()` 開頭那道「已經開著就不重開」的守門會擋掉
     （移除是 200ms 之後才發生的）。 */
  const renderMain = ()=>{
    const row = (id, label, val) =>
        '<label class="gm-row"><span>'+label+'</span>'
      + '<input id="'+id+'" type="range" min="0" max="100" step="1" value="'+Math.round(val*100)+'">'
      + '<b id="'+id+'V">'+Math.round(val*100)+'</b></label>';
    const autoPct = Math.round((autoDelayMs()-AUTO_MIN)/(AUTO_MAX-AUTO_MIN)*100);
    panel.innerHTML =
        '<div class="gm-title">選　單</div>'
      + '<div class="gm-sec">音　量</div>'
      +   row('gmBgm','音　樂', volOf('bgm'))
      +   row('gmSe', '音　效', volOf('se'))
      +   row('gmVo', '語　音', volOf('vo'))
      + '<div class="gm-sec">自動播放</div>'
      + '<label class="gm-row"><span>間　隔</span>'
      +   '<input id="gmAuto" type="range" min="0" max="100" step="1" value="'+autoPct+'">'
      +   '<b id="gmAutoV">'+(autoDelayMs()/1000).toFixed(1)+'s</b></label>'
      + '<div class="gm-note">一句唸完之後停多久才走下一句。往左＝快。</div>'
      + '<div class="gm-sec">其　他</div>'
      + '<label class="gm-row gm-toggle"><span>震　動</span>'
      +   '<button class="gm-sw'+(haptics()?' on':'')+'" id="gmHap" type="button">'
      +     '<i></i></button>'
      +   '<b>'+(haptics()?'開':'關')+'</b></label>'
      + '<div class="gm-acts">'
      +   (o.onHome ? '<button class="gm-btn gm-home" type="button">回到主選單</button>' : '')
      +   '<button class="gm-btn gm-close" type="button">關　閉</button>'
      + '</div>';
    const bind=(id, layer)=>{
      const el=panel.querySelector('#'+id), lab=panel.querySelector('#'+id+'V');
      el.addEventListener('input', ()=>{
        const v=(+el.value)/100;
        wr(K[layer], v.toFixed(2)); if(lab) lab.textContent=Math.round(v*100);
        apply();
      });
      /* 放開手才試音：拖的過程中每一格都響會變成一串雜音。⚠ 音樂那一軌不試音
         （它本來就在播，音量是即時的）。 */
      if(layer!=='bgm') el.addEventListener('change', ()=>{ try{ SFX.menuClick(); }catch(_){} });
    };
    bind('gmBgm','bgm'); bind('gmSe','se'); bind('gmVo','vo');
    const au=panel.querySelector('#gmAuto'), auV=panel.querySelector('#gmAutoV');
    au.addEventListener('input', ()=>{
      const ms=Math.round(AUTO_MIN + (+au.value)/100*(AUTO_MAX-AUTO_MIN));
      wr(K.auto, ms); if(auV) auV.textContent=(ms/1000).toFixed(1)+'s';
    });
    const sw=panel.querySelector('#gmHap');
    if(sw) sw.addEventListener('click', e=>{ e.stopPropagation();
      const on=!haptics(); setHaptics(on);
      sw.classList.toggle('on', on);
      const lab=sw.parentNode.querySelector('b'); if(lab) lab.textContent = on ? '開' : '關';
      try{ SFX.menuClick(); }catch(_){}
      /* 打開的時候震一下當作試用 —— 沒有回饋的話玩家不知道這台到底震不震得動
         （iOS 完全沒有這個 API）。 */
      if(on && navigator && navigator.vibrate) try{ navigator.vibrate(45); }catch(_){}
    });
    const hb=panel.querySelector('.gm-home');
    if(hb) hb.addEventListener('click', e=>{ e.stopPropagation();
      try{ SFX.menuClick(); }catch(_){} renderConfirm(); });
    panel.querySelector('.gm-close').addEventListener('click', e=>{ e.stopPropagation();
      try{ SFX.menuClick(); }catch(_){} close(); });
  };

  /* ══ 回到主選單：**先確認**（ver -398，Ray 指定）══
     ⚠ 這一步會丟掉未存檔的進度 —— 旗標、時鐘、道具是即時寫的，但**演到哪一句**不是。
     ⚠ 用面板換頁不疊第二層對話框：疊兩層很難點得準。 */
  const renderConfirm = ()=>{
    panel.innerHTML =
        '<div class="gm-title">回到主選單</div>'
      + '<div class="gm-warn">尚未儲存的進度將會遺失。<br>確定要回到主選單嗎？</div>'
      + '<div class="gm-acts">'
      +   '<button class="gm-btn gm-back" type="button">返　回</button>'
      +   '<button class="gm-btn gm-yes" type="button">確　定</button>'
      + '</div>';
    panel.querySelector('.gm-back').addEventListener('click', e=>{ e.stopPropagation();
      try{ SFX.menuClick(); }catch(_){} renderMain(); });
    panel.querySelector('.gm-yes').addEventListener('click', e=>{ e.stopPropagation();
      try{ SFX.menuClick(); }catch(_){} close(); if(o.onHome) o.onHome(); });
  };

  renderMain();
  requestAnimationFrame(()=>ov.classList.add('on'));
}
