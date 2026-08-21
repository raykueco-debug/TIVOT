/* ══════════════════════════════════════════════════════════════════════
   mainScript.js — 主線 scene 鏈（TIVOT_SCRIPT_ARCHITECTURE §5）
   ──────────────────────────────────────────────────────────────────────
   主線**純線性**，不被任何條件過濾。scene 用 next 串成鏈，一段接一段跑；
   跑到某段時 setStage / setFlags 推進度。

   ⚠ **主線不讀 stage、不讀好感**（規格 §0.2 單向資料流：主線寫，其餘讀）。
     所以這裡的 scene **結構上就不該出現** when / requires / minTier 這類欄位。
     要分歧，靠玩家「去特定場景找特定角色」觸發支線，不靠對話選項（規格 §0.3）。

   ── scene 格式 ────────────────────────────────────────────────────
     { sceneId:'唯一名字',
       next:'下一段的 sceneId',   // null＝鏈結束，交還控制權
       setStage: 1,               // 選填：播完後設 stage
       setFlags:['nouvelle_joined'],  // 選填：播完後設的旗標
       context:'scene',           // scene / battle / field（過濾用，非分檔依據）
       lines:[ … ] }

   ── line 格式（規格 §3，所有腳本檔共用）────────────────────────────
     { speaker:'RENNA',          // 必填。查 speakers.js 得顯示名，也決定高亮誰
       text:'……',                // 必填。可寫 {P} ＝ 主角名（**顯示時才代換**）
       portrait:{                // 可省 ＝ 沿用上一句的畫面狀態
         char:'RENNA',           //   畫誰的立繪。省＝speaker 本人
         expr:'smile',           //   表情差分 id（查 speakers.js 的 ART[].expr）
         show:true },            //   是否在場。省＝沿用
       cg:'noue_fall' }          // 可省。全屏插圖，蓋過立繪

     ⚠ **只寫「變化」的部分。** 只換表情就只寫 {expr:'…'}，其餘沿用上一狀態。
     ⚠ **站位不寫**（規格 §3 原有的 pos 已移除，Ray 定案）：
       右位＝該段對話的**發起位**，發起人（lines[0].speaker）固定站右，
       其他人在左側輪替。由 story.js 自動判定，腳本不必也不該指定。
     ⚠ **明暗不寫**：未說話者壓暗由渲染層依 speaker 自動處理（CLAUDE.md §6.5）。
     ⚠ 插入戰鬥寫 { battle:'battleId' }，戰鬥系統接手；戰鬥**中**的觸發台詞
       掛在 battles.js 的該場戰鬥 triggers，不寫在這裡。

   ⚠ 口氣守則（四人語域、日文層、呼稱表）一律見 **flight/script/STYLE.md**，
     不要在本檔另寫一份 —— 複製會走鐘。
   ══════════════════════════════════════════════════════════════════════ */

/* ⚠⚠ 以下全部是**示範用的佔位內容**，等 Ray 的正式主線稿替換。
   放著的目的只有一個：讓「首頁 story 鈕 → 播主線 → 存讀檔」整條流程
   現在就跑得起來、測得出來。正式開稿時整段刪掉重寫。 */
export const MAIN_SCRIPT = {

  prologue_audience: {
    sceneId:'prologue_audience',
    next:'prologue_fall',
    setStage:1,
    context:'scene',
    lines:[
      { speaker:'OFFICER', text:'第四騎士團，{P}。教廷的敕令已經下來了。',
        portrait:{ char:'OFFICER', expr:'smile', show:true } },
      { speaker:'OFFICER', text:'從今天起，我會跟著你們的船。' },
      { speaker:'OFFICER', text:'名義上是監察。實際上……也是監察。',
        portrait:{ expr:'smile' } },
      { speaker:'NOUVELLE', text:'請多指教。我是諾薇兒，負責隨隊的醫護與祈禱。',
        portrait:{ char:'NOUVELLE', expr:'gentle', show:true } },
      { speaker:'OFFICER', text:'……你就這樣說得像在講天氣。',
        portrait:{ char:'OFFICER', expr:'stunned' } },
    ],
  },

  prologue_fall: {
    sceneId:'prologue_fall',
    next:null,
    setFlags:['prologue_done'],
    context:'scene',
    lines:[
      { speaker:'NOUVELLE', text:'竟然，會有那麼巨型的聖徒！',
        portrait:{ char:'NOUVELLE', expr:'pain', show:true } },
      { speaker:'NOUVELLE', text:'啊！', cg:'noue_fall' },
      { speaker:'NOUVELLE', text:'別管我！快走！' },
      { speaker:'OFFICER', text:'……{P}。這種時候，不要問我該怎麼辦。',
        portrait:{ char:'OFFICER', expr:'fluster', show:true } },
    ],
  },

};

/* 主線的起點。存檔沒有進度時從這裡開始。 */
export const MAIN_ENTRY = 'prologue_audience';
