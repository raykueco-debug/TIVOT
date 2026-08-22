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

  /* ══ 地宮：追擊 → 戰鬥教學 → 璐娜莉亞登場（Ray 的第一段正式稿）══════════
     ⚠ 演出欄位（bg/cg/cgPan/ci/se/shake/fx）的規格見 modules/story.js 的
       「演出層」註解。全部「只寫變化」，省略＝沿用上一句。
     ⚠ 這一段有**兩個素材缺口**，先照現況接、不要當成完成品：
       · 彈殼落地音沒有這個檔（se/ 裡最接近的只有 reload 與各槍種射擊音）。
       · 諾薇兒的五張表情差分是**不同姿勢**，取景值 top/bot/fx 還沒逐張量，
         目前沿用 front 那一組，人會偏（見 speakers.js 的警告）。 */
  dungeon_chase: {
    sceneId:'dungeon_chase',
    next:'dungeon_lunaria',
    context:'scene',
    lines:[
      /* 情境卡：先立背景，蓋半透黑，打時間與地點（Ray 指定）。
         ⚠ 這一拍沒有台詞也沒有立繪 —— speaker 只是為了讓資料結構一致，
           有 card 的句子不顯示對話框。 */
      { speaker:'NOUVELLE', text:'',
        bg:'HolyseeDungeonWhole', bgm:'crisis',
        card:'1908年6月13日\n聖王廳地宮　G2 區',
        /* ⚠ 一定要明寫 show:false —— 立繪的預設是 show:true，不寫的話她會先用
           base 立繪站在卡片後面，下一句才換成跑姿，看起來像閃了一下。 */
        portrait:{ char:'NOUVELLE', show:false } },
      /* 開場：腳步聲與喘息。 */
      { speaker:'NOUVELLE', text:'追、追上來了！', se:'se_steps',
        portrait:{ char:'NOUVELLE', expr:'run', show:true } },
      { speaker:'NOUVELLE', text:'啊！', portrait:{ expr:'cringe' } },
      /* 跌倒：切全屏插圖。⚠ cg 一上來就蓋住立繪，所以這一句不必也不要再改 expr。 */
      { speaker:'NOUVELLE', text:'別管我！你快走！', cg:'001_Nouvelle_Fell' },
      /* 上膛：兩聲隔 0.5 秒交疊。 */
      { speaker:'NOUVELLE', text:'你……！',
        se:[{n:'se_weapon_reload'},{n:'se_weapon_reload',delay:500}] },
      /* 戰鬥教學。⚠ 戰鬥系統尚未接線，story.js 目前會跳過並在 console 記一筆。 */
      { battle:'tutorial' },
    ],
  },

  dungeon_lunaria: {
    sceneId:'dungeon_lunaria',
    next:null,
    setFlags:['dungeon_cleared'],
    context:'scene',
    lines:[
      /* 戰勝之後：聖徒咆哮。 */
      { speaker:'NOUVELLE', text:'對不起，我已經……！',
        cg:'002_SaintAssult', portrait:{ expr:'desperate' } },
      /* 暗調 CI 插入。⚠ 說話的是「？？？」不是 LUNARIA —— 這一刻她還沒表明身分，
         顯示名要真的是「？？？」（見 speakers.js 的說明）。 */
      { speaker:'UNKNOWN', text:'讓開。', ci:'Lunaria_SI_Armed' },
      { speaker:'NOUVELLE', text:'！！', ci:null, portrait:{ expr:'scared' } },
      /* 密集槍擊：命中點灑在 002 上，畫面同時抖一下。
         ⚠ 這一句沒有台詞（text 空字串）——它是**演出拍**，玩家點一下推過去。
         ⚠ 槍聲暫用重機槍的連射音（se_mg_squall）；Ray 原稿只指定了彈殼落地音，
           而那個檔案不存在。兩者都待確認。 */
      { speaker:'UNKNOWN', text:'', fx:'gunfire', shake:true, se:'se_mg_squall' },
      /* 回地宮。⚠ cg:null 要明寫，否則插圖會一直蓋著。 */
      { speaker:'NOUVELLE', text:'那就是......聖約第四騎士團......！',
        cg:null, bg:'HolyseeDungeonWhole', portrait:{ expr:'surprise' } },
      /* 璐娜莉亞的插畫：由下往上平移。 */
      { speaker:'NOUVELLE', text:'璐娜莉亞團長……！',
        cg:'003_Lunaria_Armed', cgPan:'up' },
    ],
  },


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
/* ⚠ 入口暫時指到新寫的地宮段，方便直接驗這一幕。
   正式串主線時改回 'prologue_audience'（或把地宮段接進鏈裡）。 */
export const MAIN_ENTRY = 'dungeon_chase';
