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
/* ══ 進度面板（ver -1094，Ray：「不要在飛行畫面，把進度放到管理者限定的系統設定選單」）══
   它以前住在 `flight/index.html`（-983 起，入口是那顆「進度」鈕；-1085 我把鈕拿掉
   只剩 console）。搬過來的理由是**這一頁到得了**：城鎮、戰鬥、劇情、飛行都開得出
   系統選單，而飛行頁那一份只有出航時叫得到。
   ⚠⚠ 搬家不是複製：飛行頁那一份**整組刪掉**了 —— 留著就是同一個工具兩份，
     改一邊另一邊不會跟上（鐵律 7／8）。
   ⚠ 好感的寫入走 `setAffectionDev`（它會**連棘輪的地板一起改**）——
     不要用 `addAffection`，那一支只上得去下不來，當成開發工具等於沒有用。
   ⚠ 段位的寬度（20）只問 `progress.tierOf`／`tierFloor`，這裡不再算一份。 */
import * as prog from '../script/progress.js';

const K = {
  bgm:  'tivot_vol_bgm_v1',
  se:   'tivot_vol_se_v1',
  vo:   'tivot_vol_vo_v1',
  auto: 'tivot_auto_ms_v1',
  hap:  'tivot_haptics_v1',
  text: 'tivot_dlgtext_v1',   // 對話框文字大小（ver -821）：'1'＝加大、其餘＝預設
  /* 戰鬥提示三開關（ver -748，Ray：「把延時懲罰計時器、被動技能計時器、
     敵人攻擊警告效果做進設定裡，讓玩家可以選擇開閉」）。預設**開**。 */
  fxDelay: 'tivot_fx_delayring_v1',     // 延時懲罰計時器（盤面上緣那條線）
  fxPass:  'tivot_fx_passivetimer_v1',  // 被動技能計時器（明晰之夢的兩側金光柱）
  fxAlert: 'tivot_fx_alertfx_v1',       // 敵人攻擊警告效果（盤面的 alert/hot 變色脈動）
};

/* 自動播放：一句唸完之後停多久才走下一句。
   ⚠ 掛在**「這一句唸完」**的回呼上，不是固定秒數（§6.5）—— 這個數字是「讀完之後」的停頓。
   ⚠ 範圍與預設：400~2000ms，預設 1100（= ver -367 訂的那個值，改這裡等於改預設）。 */
export const AUTO_MIN = 400, AUTO_MAX = 2000, AUTO_DEFAULT = 1100;

const rd = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const wr = (k,v) => { try{ localStorage.setItem(k, String(v)); }catch(e){} };
const num = (v, d) => { const n=parseFloat(v); return isFinite(n) ? n : d; };

/* ── 全域靜音（ver -856，Ray：「把靜音鈕拿掉，放到系統選單裡」）──
   鑰匙與套用都住在 main.js（applyMute 唯一實作，鐵律 8）—— 本模組是葉節點，
   只拿注入的 {get, toggle} 畫那一列開關。沒注入（理論上不會）就不出這一列。 */
let muteHook = null;
/* ══⚠⚠ **靜音有兩個 UI，畫面一律由狀態重畫**（ver -933）══════════════════
   左上最角落那顆浮動鈕（main.js）與這一列開關，讀寫的是**同一把鑰匙**
   （`tivot_mute_v1`）。誰切都行，但**畫**只能有一條路：
   `main.applyMute()` → 它畫角落那顆 ＋ 呼叫這一支畫這一列（鐵律 7/8）。
   ⚠ -933 第一版讓這一列在自己的 click 裡畫自己 —— 於是**從角落那顆切的時候
     這一列不會更新**（實測：鑰匙已經是 0，開關還亮著 `on`），而那不會有任何
     錯誤訊息。凡是「同一個狀態有兩個顯示」，就要有一支把兩邊一起重畫。
   ⚠ 面板沒開就是 no-op：它每次 `open()` 都重建 HTML，那時本來就會讀新的值。 */
export function syncMute(){
  const mu=document.getElementById('gmMute');
  if(!mu || !muteHook) return;
  const on=!!muteHook.get();
  mu.classList.toggle('on', on);
  const lab=mu.parentNode && mu.parentNode.querySelector('b');
  if(lab) lab.textContent = on ? '靜音中' : '關';
}
export function setMuteHook(h){ muteHook = h; }
/* ══⚠⚠ **管理人工具收進這一頁**（ver -926，Ray：「把凍結跟狀態 HUD 收到系統設定裡面，
   限管理人使用」）══ 以前是右下角兩顆常駐小鈕（`#perfToggle`／`#perfFreeze`，ver -852/-855）
   —— 它們蓋在遊戲畫面上，而且**一般玩家的 testmode 一開就看得到**。
   ⚠ 實作仍住在 `main.js`（凍結要碰 combat 的真暫停、HUD 要量版面）——
     這裡只放**入口**，由 main 注入（settings 是葉模組，不 import main）。
   ⚠ 只在 `body.testmode` 時長出來（與首頁那條白名單同一個判準，§6.9）。 */
let devTools = null;
export function setDevTools(t){ devTools = t || null; }

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

/* 對話框文字大小（ver -821，Ray：「只有加大跟預設兩種」）。預設**預設**（非加大）。
   ⚠ 只是顯示偏好，跨輪不清（同音量／震動）；套用走 apply() 的 body.dlg-large（鐵律 8）。 */
export function bigText(){ return rd(K.text) === '1'; }
export function setBigText(on){ wr(K.text, on ? '1' : '0'); }

/* 戰鬥提示開關的查詢（ver -748，鐵律 7：讀的人只問這一支）。
   kind：'delay'（延時懲罰計時器）／'pass'（被動技計時器）／'alert'（敵攻警告）。
   ⚠ 這裡只管「玩家要不要看」；紅點本體、懲罰本體是玩法不是提示，不歸這裡管。 */
const FXK = { delay:'fxDelay', pass:'fxPass', alert:'fxAlert' };
export function fxOn(kind){ return rd(K[FXK[kind]]) !== '0'; }
export function setFx(kind, on){ wr(K[FXK[kind]], on ? '1' : '0'); }

/* 套用到音訊層。⚠ **唯一的套用點**（鐵律 8）：開機時由 main.js 呼叫一次，
   面板每動一下也呼叫。 */
export function apply(){
  for(const l of ['bgm','se','vo']) SFX.setLayerVolume(l, volOf(l));
  try{ document.body.classList.toggle('dlg-large', bigText()); }catch(_){}   // 對話框文字加大（ver -821）
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
  /* 蓋在飛行畫面上 → 底下整個暫停（ver -481，Ray 指定；同 gear.open 的作法）。 */
  const overFlight = document.body.classList.contains('flight-on');
  if(overFlight && window.__flightHoldToggle) window.__flightHoldToggle(true);
  const close = ()=>{ ov.classList.remove('on');
    if(overFlight && window.__flightHoldToggle) window.__flightHoldToggle(false);
    setTimeout(()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 200); };

  /* ⚠ 面板是**換頁**的（主頁 ⇄ 確認頁），所以每一頁各自 render＋綁事件 ——
     不要 close 完再 open 一次：`open()` 開頭那道「已經開著就不重開」的守門會擋掉
     （移除是 200ms 之後才發生的）。 */
  const renderMain = ()=>{
    /* 戰鬥提示的開關列（ver -748）：同震動那顆的樣式（gm-sw），一列一個。 */
    const fxRow = (id, label, kind) =>
        '<label class="gm-row gm-toggle"><span>'+label+'</span>'
      + '<button class="gm-sw'+(fxOn(kind)?' on':'')+'" id="'+id+'" type="button" data-fx="'+kind+'">'
      +   '<i></i></button>'
      + '<b>'+(fxOn(kind)?'開':'關')+'</b></label>';
    const row = (id, label, val) =>
        '<label class="gm-row"><span>'+label+'</span>'
      + '<input id="'+id+'" type="range" min="0" max="100" step="1" value="'+Math.round(val*100)+'">'
      + '<b id="'+id+'V">'+Math.round(val*100)+'</b></label>';
    const autoPct = Math.round((autoDelayMs()-AUTO_MIN)/(AUTO_MAX-AUTO_MIN)*100);
    panel.innerHTML =
        '<div class="gm-title">選　單</div>'
      + '<div class="gm-sec">音　量</div>'
      + (muteHook
        ? '<label class="gm-row gm-toggle"><span>靜　音</span>'
          + '<button class="gm-sw'+(muteHook.get()?' on':'')+'" id="gmMute" type="button"><i></i></button>'
          + '<b>'+(muteHook.get()?'靜音中':'關')+'</b></label>'
        : '')
      +   row('gmBgm','音　樂', volOf('bgm'))
      +   row('gmSe', '音　效', volOf('se'))
      +   row('gmVo', '語　音', volOf('vo'))
      + '<div class="gm-sec">自動播放</div>'
      + '<label class="gm-row"><span>間　隔</span>'
      +   '<input id="gmAuto" type="range" min="0" max="100" step="1" value="'+autoPct+'">'
      +   '<b id="gmAutoV">'+(autoDelayMs()/1000).toFixed(1)+'s</b></label>'
      + '<div class="gm-note">一句唸完之後停多久才走下一句。往左＝快。</div>'
      + '<div class="gm-sec">戰鬥提示</div>'
      + fxRow('gmFxDelay','延時懲罰計時器','delay')
      + fxRow('gmFxPass','被動技能計時器','pass')
      + fxRow('gmFxAlert','敵人攻擊警告','alert')
      + '<div class="gm-sec">其　他</div>'
      + '<label class="gm-row gm-toggle"><span>對話文字</span>'
      +   '<button class="gm-sw'+(bigText()?' on':'')+'" id="gmBigText" type="button">'
      +     '<i></i></button>'
      +   '<b>'+(bigText()?'加大':'預設')+'</b></label>'
      + '<label class="gm-row gm-toggle"><span>震　動</span>'
      +   '<button class="gm-sw'+(haptics()?' on':'')+'" id="gmHap" type="button">'
      +     '<i></i></button>'
      +   '<b>'+(haptics()?'開':'關')+'</b></label>'
      + ((devTools && document.body.classList.contains('testmode'))
        ? '<div class="gm-sec">管理人</div>'
          + '<label class="gm-row gm-toggle"><span>凍　結</span>'
          +   '<button class="gm-sw'+(devTools.frozen&&devTools.frozen()?' on':'')+'" id="gmFreeze" type="button">'
          +     '<i></i></button>'
          +   '<b>'+(devTools.frozen&&devTools.frozen()?'凍結中':'關')+'</b></label>'
          + '<label class="gm-row gm-toggle"><span>狀態 HUD</span>'
          +   '<button class="gm-sw" id="gmHud" type="button"><i></i></button>'
          +   '<b>開關</b></label>'
          + '<div class="gm-note">凍結＝停掉這一刻所有動畫／音訊／戰鬥計時（再按解凍）。'
          + 'HUD＝版本與幀率那一片。兩者都只有管理人模式看得到。</div>'
          /* ══ 管理人的存檔與統計（ver -1023，Ray 交辦）══
             · 存檔：**一對一**的獨立格（`save.devSave`），首頁那顆「讀檔」讀它。
             · 統計：另開一頁（`renderStats`）。
             ⚠ 只長在 `body.testmode` 裡（與上面那兩顆同一個判準）。 */
          + '<div class="gm-acts gm-dev2">'
          +   '<button class="gm-btn" id="gmDevSave" type="button">存　檔</button>'
          +   '<button class="gm-btn" id="gmStats" type="button">統計表</button>'
          +   '<button class="gm-btn" id="gmProg" type="button">進　度</button>'
          + '</div>'
          + '<div class="gm-note">存檔＝管理人專用的**獨立**一格（與玩家的存檔互不影響），'
          + '在首頁用「讀檔」讀回來。</div>'
        : '')
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
    const mu=panel.querySelector('#gmMute');
    if(mu) mu.addEventListener('click', e=>{ e.stopPropagation();
      const on=muteHook.toggle();                       // 切完回讀真相（鑰匙在 main 那邊）
      /* ⚠ 這裡**不自己畫**：`toggle()` 走的是 main 的 `applyMute`，而那一支收尾會叫
         `syncMute()` 把這一列重畫回來（見下）—— 自己再畫一次就是兩個畫法。 */
      if(!on) try{ SFX.menuClick(); }catch(_){}         // 解除靜音才試音（靜音中按下去本來就該無聲）
    });
    const au=panel.querySelector('#gmAuto'), auV=panel.querySelector('#gmAutoV');
    au.addEventListener('input', ()=>{
      const ms=Math.round(AUTO_MIN + (+au.value)/100*(AUTO_MAX-AUTO_MIN));
      wr(K.auto, ms); if(auV) auV.textContent=(ms/1000).toFixed(1)+'s';
    });
    panel.querySelectorAll('.gm-sw[data-fx]').forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation();
      const kind=b.dataset.fx, on=!fxOn(kind); setFx(kind, on);
      b.classList.toggle('on', on);
      const lab=b.parentNode.querySelector('b'); if(lab) lab.textContent = on ? '開' : '關';
      try{ SFX.menuClick(); }catch(_){}
    }));
    const bt=panel.querySelector('#gmBigText');
    if(bt) bt.addEventListener('click', e=>{ e.stopPropagation();
      const on=!bigText(); setBigText(on);
      bt.classList.toggle('on', on);
      const lab=bt.parentNode.querySelector('b'); if(lab) lab.textContent = on ? '加大' : '預設';
      apply();   // 即時套用 body.dlg-large
      try{ SFX.menuClick(); }catch(_){}
    });
    /* 管理人那兩顆（ver -926）：實作在 main.js，這裡只按下去。
       ⚠ 凍結是**狀態**（要顯示現在凍著沒），HUD 是**動作**（開關同一支 show()）。 */
    { const fz=panel.querySelector('#gmFreeze');
      if(fz && devTools && devTools.freeze) fz.addEventListener('click', e=>{ e.stopPropagation();
        devTools.freeze();
        const on=!!(devTools.frozen && devTools.frozen());
        fz.classList.toggle('on', on);
        const lab=fz.parentNode.querySelector('b'); if(lab) lab.textContent = on ? '凍結中' : '關';
        try{ SFX.menuClick(); }catch(_){}
      });
      const hd=panel.querySelector('#gmHud');
      if(hd && devTools && devTools.hud) hd.addEventListener('click', e=>{ e.stopPropagation();
        devTools.hud(); try{ SFX.menuClick(); }catch(_){}
      }); }
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
    /* 管理人：存檔／統計（ver -1023）。實作經 `setDevTools` 注入（settings 不 import
       save/progress —— 它是設定面板，不該知道存檔怎麼存，鐵律：依賴方向）。 */
    { const ds=panel.querySelector('#gmDevSave');
      if(ds) ds.addEventListener('click', e=>{ e.stopPropagation();
        try{ SFX.menuClick(); }catch(_){}
        if(devTools && devTools.devSave) devTools.devSave(); });
      const pgb=panel.querySelector('#gmProg');
      if(pgb){ pgb.addEventListener('click', e=>{ e.stopPropagation();
        try{ SFX.menuClick(); }catch(_){} renderProg(); }); }
      const stb=panel.querySelector('#gmStats');
      if(stb) stb.addEventListener('click', e=>{ e.stopPropagation();
        try{ SFX.menuClick(); }catch(_){} renderStats(); }); }
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

  /* ══ 統計表（ver -1023，Ray：「在系統頁面做一個按鈕打開統計表，統計總局數、
     總擊場數、各女角的局數，平均得分（索拉娜是反著算）」）══
     ⚠ **數字由 `devTools.stats()` 交出來**（main 注入）—— settings 不 import
       progress／config：它是設定面板，不該知道分數怎麼算、誰要反著算（依賴方向）。
     ⚠ 用面板換頁不疊第二層（同「回到主選單」那一頁的理由）。 */
  const renderStats = ()=>{
    const d = (devTools && devTools.stats) ? devTools.stats() : null;
    const rows = (d && d.rows || []).map(r =>
        '<div class="gm-row gm-stat"><span>'+r[0]+'</span><b>'+r[1]+'</b></div>').join('');
    panel.innerHTML =
        '<div class="gm-title">統　計</div>'
      + (rows || '<div class="gm-note">還沒有任何紀錄。</div>')
      + (d && d.note ? '<div class="gm-note">'+d.note+'</div>' : '')
      + '<div class="gm-acts">'
      +   '<button class="gm-btn gm-back" type="button">返　回</button>'
      + '</div>';
    panel.querySelector('.gm-back').addEventListener('click', e=>{ e.stopPropagation();
      try{ SFX.menuClick(); }catch(_){} renderMain(); });
  };

  /* ══ 進度（管理人）══ 章節與四個人的好感，好感可直接調。
     ⚠ 四個人**都列**（含蕾娜）：整備頁的伙伴欄沒有她的格子，而她正是唯一
       拿得到小數好感的那一位（S +0.5／A +0.25），不列就看不到她。
     ⚠ 段位名沿用 docs/TIVOT_IMPL_SPEC.md §2 的五段。 */
  const PROG_CHARS=[['renna','蕾娜'],['nouvelle','諾薇兒'],['sorana','索菈娜'],['anya','安雅']];
  const TIER_NAME=['同行','朋友','摯友','羈絆','愛'];
  const renderProg = ()=>{
    const st=prog.getStage(), aff=prog.getAffection();
    const rows=PROG_CHARS.map(([k,nm])=>{
      const v=(typeof aff[k]==='number')?aff[k]:0, t=prog.tierOf(v);
      /* ⚠ ver -1124（Ray：「把好感設置的加個大鍵，一次加減10」）：±10 擺在**外側**、
         ±1 在內側 —— 由外而內是「粗調 → 微調」，手指從邊緣往中間收，順序讀得出來。
         一段是 20 點，所以 ±10 剛好是半段：連按兩下就跨一段。 */
      return '<div class="gm-row gm-stat gm-prog"><span>'+nm+'</span>'
           +   '<b class="pr-b pr-big" data-aff="'+k+':-10">−10</b>'
           +   '<b class="pr-b" data-aff="'+k+':-1">−</b>'
           +   '<i class="pr-aff" data-affjump="'+k+'">'+v+'　T'+t+'・'+TIER_NAME[t-1]+'</i>'
           +   '<b class="pr-b" data-aff="'+k+':1">＋</b>'
           +   '<b class="pr-b pr-big" data-aff="'+k+':10">＋10</b>'
           + '</div>';
    }).join('');
    panel.innerHTML =
        '<div class="gm-title">進　度</div>'
      + '<div class="gm-row gm-stat"><span>章節 STAGE</span>'
      +   '<b class="pr-b" data-stage="-1">−</b><i class="pr-aff">'+st+'</i>'
      +   '<b class="pr-b" data-stage="1">＋</b></div>'
      + '<div class="gm-sec">好　感</div>' + rows
      /* ⚠ 地板寫「1」不是 0：`progress.tierFloor` 對 T1 回的是 1（它有一道
         `Math.max(1,…)`）—— 這裡照它的實際行為寫，不要照「一段 20」推。 */
      + '<div class="gm-note">±10／± 各動 10 與 1；點中間的數字跳到下一段的地板'
      + '（1→20→40→60→80→回 0）。一段 20 點，上限 100。</div>'
      + '<div class="gm-acts">'
      +   '<button class="gm-btn gm-back" type="button">返　回</button>'
      + '</div>';
    /* 事件每次 render 之後重掛（`innerHTML` 換掉了整批節點）。 */
    panel.querySelectorAll('.pr-b[data-aff]').forEach(d=>d.addEventListener('click', e=>{
      e.stopPropagation();
      const [who,dv]=String(d.dataset.aff||'').split(':');
      const cur=prog.getAffection(); const now=(typeof cur[who]==='number')?cur[who]:0;
      prog.setAffectionDev(who, now + (+dv||0));
      renderProg();
    }));
    panel.querySelectorAll('.pr-aff[data-affjump]').forEach(d=>d.addEventListener('click', e=>{
      e.stopPropagation();
      const who=d.dataset.affjump, cur=prog.getAffection();
      const v=(typeof cur[who]==='number')?cur[who]:0, t=prog.tierOf(v), here=prog.tierFloor(t);
      /* 已經站在這一段的地板上 → 跳下一段；否則先跳到這一段的地板。T5 再點歸 0。 */
      prog.setAffectionDev(who, (v===here) ? (t>=5 ? 0 : prog.tierFloor(t+1)) : here);
      renderProg();
    }));
    panel.querySelectorAll('.pr-b[data-stage]').forEach(d=>d.addEventListener('click', e=>{
      e.stopPropagation();
      prog.setStage(Math.max(0, prog.getStage() + (+d.dataset.stage||0)));
      renderProg();
    }));
    panel.querySelector('.gm-back').addEventListener('click', e=>{ e.stopPropagation();
      try{ SFX.menuClick(); }catch(_){} renderMain(); });
  };

  renderMain();
  requestAnimationFrame(()=>ov.classList.add('on'));
}
