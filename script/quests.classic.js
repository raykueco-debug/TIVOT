/* ══⚠⚠ 劇情推進用的任務提示（ver -2886，Ray 11-21 交辦）══════════════════════════
   顯示在**地圖頁**：城鎮的槍棺地圖（modules/town.js 的 showMap）與飛行頁的大地圖（flight/index.html 的 openMapView）。
   ⚠⚠ 這一支是**經典腳本**（非 module）：主程式（index.html）與飛行頁（另一個 document）都用 <script> 載同一份，
     資料與判定只有這裡一份（鐵律 7）。兩邊只負責「把現在這一條畫出來」。
   欄位：
     id     ＝鑰匙（程式只認 `innHold`／`pin`，不認 id）
     text   ＝任務文字（中文原文；兩邊顯示時各自過 i18nT）
     need   ＝旗（字串）或陣列（**全部**都要）—— 插了才開始
     until  ＝旗（字串）或陣列（**任一**插了就結束）
     pin    ＝飛行大地圖上點任務 → 釘選到這個地名（飛行頁 `markOf` 現查座標，不抄座標）
     innHold＝這一條還沒完成時，旅店不出「獨自坐坐」與「回房睡覺」
     stages ＝章節窗 [起,迄]（含）：章節不在窗內就不算（跳章節時舊旗不齊，不准冒出過期的任務；同飛行台詞的 talkStageIn）
   由上往下取**第一條成立的**。 */
(function(){
  var QUESTS = [
    /* 帝都 Stage 0：謁見完（hq_briefed）→ 傍晚強制回旅店那一拍（town_evening_nudge，走完所有地點或過 18:00 都插）。 */
    { id:'cap_tour',    text:'陪諾薇兒逛逛帝都',
      stages:[0,0], need:'hq_briefed', until:['town_evening_nudge','stage1_open'], innHold:true },
    /* 第一次出航：Stage 1 起 → 北泊碼頭那一段演完。 */
    { id:'to_northport', text:'前往北方泊地', pin:'北方泊地',
      stages:[1,2], need:'stage1_open', until:'np_port_arrive' },
    /* 北泊城鎮戰 → 紫黑之爪那一段整段演完（含娜塔莉）。 */
    { id:'np_siege',    text:'消滅襲擊城鎮的禍魘',
      stages:[2,2], need:'np_port_arrive', until:'np_claws_done' },
    /* 紫黑之爪戰後（安葬 → 自由探索）→ 「該回去看看了」回旅店。 */
    { id:'np_explore',  text:'探索城鎮',
      stages:[2,2], need:'np_claws_done', until:'np_night' },
    /* 夢二：北泊那一夜 → 卡耶爾碎片 02 → 回旅店推到隔天 8:00（np_day3）。 */
    { id:'canyon_dream', text:'消滅襲擊卡耶爾山谷的禍魘大軍',
      stages:[2,2], need:'np_night', until:'np_day3' },
    /* 隔日：旅店醒來 → 教堂戰地醫院那一段演完。 */
    { id:'np_church',   text:'前往教堂尋找諾薇兒',
      stages:[3,3], need:'np_day3', until:'np_church_help' },
    /* 出航以後：送行揮手（np_leave_ok）→ 遇上羽蛇（之後墜湖、改去夏爾村）。 */
    { id:'to_holysee',  text:'返回聖王廳', pin:'聖王廳',
      stages:[3,4], need:'np_leave_ok', until:'flight_serpent_met' },
  ];
  function needOk(n, on){
    if(!n) return true;
    if(Object.prototype.toString.call(n)==='[object Array]'){ for(var i=0;i<n.length;i++) if(!on(n[i])) return false; return true; }
    return on(n);
  }
  function untilHit(u, on){
    if(!u) return false;
    if(Object.prototype.toString.call(u)==='[object Array]'){ for(var i=0;i<u.length;i++) if(on(u[i])) return true; return false; }
    return on(u);
  }
  /* `flagOn(旗)` 由呼叫端給（主程式＝prog.hasFlag、飛行頁＝flagOn）：兩邊讀的是同一把鑰匙 tivot_flags_v1。 */
  /* `stage` ＝現在的章節（主程式＝prog.getStage()、飛行頁＝gameStage()）；給 null 就不看章節窗。 */
  function current(flagOn, stage){
    if(typeof flagOn!=='function') return null;
    if(flagOn('free_flight')) return null;            // 試飛＝無劇情
    for(var i=0;i<QUESTS.length;i++){
      var q=QUESTS[i];
      if(stage!=null && q.stages && (stage<q.stages[0] || stage>q.stages[1])) continue;
      if(needOk(q.need, flagOn) && !untilHit(q.until, flagOn)) return q;
    }
    return null;
  }
  window.TIVOT_QUESTS = { list:QUESTS, current:current };
})();
