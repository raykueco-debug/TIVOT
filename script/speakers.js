/* ══════════════════════════════════════════════════════════════════════
   speakers.js — 角色表（TIVOT_SCRIPT_ARCHITECTURE §2）
   ──────────────────────────────────────────────────────────────────────
   角色 id → 顯示名 ＋ 立繪資源。所有腳本檔（mainScript / sideScript /
   dialogue / innInteract）共用這一份，**不要在腳本裡寫死人名或圖檔路徑**。

   ⚠ 命名：監察官正名前後當**兩個 id** 處理（規格 §2），不做 name 覆蓋機制。
     正名前用 OFFICER、正名後用 RENNA，兩者 art 同指蕾娜立繪。好感掛在 RENNA。
   ⚠⚠ **蕾娜 Renna ≠ 蕾妮 Renee**。Renna 是監察官（本檔），Renee 是戰鬥搭檔
     （config.js 的 partners.renee，即死防禦/生命歸還）。中文只差一個字、
     西文只差兩個字母，是全專案最容易寫錯的一組。
   ⚠ Regine 是蕾娜的**本名**，隊伍中一律喊 Renna（Ray 定案）。程式 id 用 RENNA；
     本名只在劇情需要時當台詞內容出現，不另立 id。
   ══════════════════════════════════════════════════════════════════════ */

export const SPEAKERS = {
  OFFICER:  { name:'監察官', art:'renna'    },   // 正名前的蕾娜，只出現一幕多
  RENNA:    { name:'蕾娜',   art:'renna'    },
  NOUVELLE: { name:'諾薇兒', art:'nouvelle' },
  ANYA:     { name:'安雅',   art:'anya'     },
  SORANA:   { name:'索拉娜', art:'sorana'   },
  LUNA:     { name:'璐娜',   art:'luna'     },
};

/* ══ 立繪素材 ＋ 取景實測值 ══
   ⚠ cm / eye / fx / top / bot 是**量出來的**，不是估的。量法與原委見
     CLAUDE.md §6.5 與 flight/HANDOFF.md F 節。這份數字與 flight/index.html
     的 PORTRAIT 是**同一組**（同樣的圖、同樣的量測），改一邊要改兩邊。
       cm   角色身高（全域通用，任何畫面的立繪都照這個比例）
       top  圖中人物最上緣（頭頂）的像素 y
       bot  最下緣像素 y —— (bot-top) ÷ cm ＝ 這張圖的「每公分幾像素」
       fx   臉中心佔圖寬的比例（兩眼中心的中點）；橫向站位錨這個，不是圖框中心
       eye  單眼寬。**目前不參與運算**（CAST_EYE_MIX=0，鎖身高不鎖眼寬），
            留著是為了哪天要調回混合模式。
   ⚠ 縮放**鎖身高**不鎖眼寬（ver -266 起）。鎖眼寬會把畫風差異放大成體型差異。

   side：**固定站位**（ver -289，Ray 定案）：右 索拉娜・安雅／左 蕾娜・諾薇兒。
        不隨台詞變動 —— 同一個人每次都站同一邊，玩家才記得住誰是誰。
        與 flight/index.html 的 PORTRAIT.side 同義同值，改一邊要改兩邊。
   ⚠ ver -288 曾短暫改成「發起位制」（發起人站右、其他人左側輪），**已退回**。
     退回的原因不是規則不好，是**素材做不到**：立繪朝向是畫死的，換邊必須水平
     翻轉，而翻轉會把髮旋、配件、持物全部左右顛倒（實測蕾娜的板夾會換手）。

   alt：**另一側專用立繪**，目前四個人都是 null（圖還沒畫）。正解是同一個角色
        畫左右兩版，兩版到位之後要不要改回發起位制再議。
   ⚠⚠ 補圖時 **eye/fx/top/bot 四個值全部要重量** —— 那是**那一張圖**的數字，
     不同的畫不可能沿用。沿用的話人會歪掉，而且很難看出原因。
   ⚠ 目前沒有任何程式路徑會用到 alt（固定站位下沒有人會站到另一側），
     它是留給日後的接口，不是死碼。

   expr：表情/動作差分。鍵是腳本 line.portrait.expr 寫的 id，值是圖檔路徑。
   ⚠ **差分素材目前全部不存在**，所以每個人的 expr 都是空的 —— 這是預期狀態，
     不是漏填。story.js 查不到 expr 會**自動回退 base 立繪**並在 console 記一筆
     （見 story.js 的 missingExpr），所以腳本可以先照規格寫 expr，圖到位再補這張表。 */
export const ART = {
  renna: { cm:169, eye:32, fx:0.519, top:1, bot:1521,
           side:'L', alt:null, base:'resources/SI/Renna_SI_front.webp', expr:{} },
  nouvelle: { cm:165, eye:40, fx:0.564, top:1, bot:1535,
           side:'L', alt:null, base:'resources/SI/Nouvelle_SI_front.webp', expr:{} },
  /* ⚠ 索拉娜用 **side** 那張：front 橫向佔 78%，兩人同台一定疊；側面只佔 69%。 */
  sorana: { cm:176, eye:27, fx:0.527, top:4, bot:1522,
           side:'R', alt:null, base:'resources/SI/Sorana_SI_side.webp', expr:{} },
  anya:   { cm:162, eye:34, fx:0.478, top:0, bot:1530,
           side:'R', alt:null, base:'resources/SI/Anya_SI_front.webp', expr:{} },
  /* 璐娜：戰鬥搭檔，劇情立繪尚未指定 —— 先指 cut-in 圖，數字**沒有量過**。
     ⚠ 真的要讓她在劇情裡站台，top/bot/fx 一定要重量（cut-in 是胸像構圖，
       照 alpha 上下緣量會把人放大好幾倍，見 CLAUDE.md §6.5）。 */
  luna:   { cm:160, eye:30, fx:0.500, top:0, bot:1000,
           side:'L', alt:null, base:'resources/partner/Luna_CI_exc.webp', expr:{}, unmeasured:true },
};

/* 最高的人：她定義相機（頭頂貼在舞台頂線，其餘人依身高往下排）。 */
export const CAST_TALL = Math.max(...Object.values(ART).filter(a=>!a.unmeasured).map(a=>a.cm));

/* 顯示名。查不到就原樣回傳 id —— 讓漏填的角色在畫面上直接現形，不要靜默變空白。 */
export function nameOf(id){ const s=SPEAKERS[id]; return s ? s.name : String(id||''); }
/* 該角色的立繪資料。OFFICER 會轉指到 renna。 */
export function artOf(id){ const s=SPEAKERS[id]; return s ? ART[s.art] : null; }
