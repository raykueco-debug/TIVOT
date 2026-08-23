# TIVOT 腳本架構規格

對話與腳本系統的拆檔原則、資料結構、讀取邏輯。資料與邏輯分離：台詞是純資料，調度是邏輯。

---

## 0. 核心原則

1. **主線是尺，stage 是刻度。** 主線純線性跑，不被任何條件過濾；主線推進時去「設置」stage。stage 是主線流過留下的印記。
2. **單向資料流：主線寫，其餘讀。** 主線寫 stage/flags；閒聊、支線、旅店互動讀 stage/flags。無循環依賴。
3. **無影響劇情的選項。** 主線純跑，不出現改變劇情走向的對話選項。分歧靠玩家「去特定場景找特定角色」觸發，不靠選單。
4. **好感度不影響主線對話內容**，只影響主線分歧（走哪條線）與支線/旅店互動的觸發與差分。
5. **好感度不可視化**，靠非數值回饋（獨坐出場順序、敲門安全感、稱呼變化、升階對話）讓玩家感知。
6. **台詞綁圖。** 每句台詞可帶立繪差分（表情/動作）與全屏插圖（CG）。

---

## 1. 檔案拆分（依「性質」拆，不依「情境」拆）

| 檔案 | 職責 | 讀好感 | 讀 stage |
|------|------|--------|----------|
| `speakers.js` | 角色 id → 顯示名 + 立繪資源 | — | — |
| `dialogue.js` | 航行畫面隨機閒聊池 | 否 | 是 |
| `mainScript.js` | 主線 scene 鏈（推 stage/flags） | 否 | 否（它寫 stage） |
| `sideScript.js` | 支線（好感門檻觸發） | 是 | 是 |
| `innInteract.js` | 旅店互動（敲門/獨坐/升階） | 是 | 是 |
| `battles.js` | 戰鬥定義 + 戰鬥中 trigger 台詞 | — | — |

**情境（戰鬥/大地圖/特定背景）不是分檔依據**，是每條腳本的一個過濾欄位。戰鬥對話不獨立成檔——它屬於它所在的主線/支線，用位置標記插入。

---

## 2. speakers.js — 角色表

角色 id 對應顯示名與立繪資源。共用表，全檔 import。

```js
export const SPEAKERS = {
  OFFICER:  { zh:"監察官", ja:"…", en:"…", art:"regine" }, // 正名前的蕾娜，共用蕾娜立繪，只出現一幕多
  REGINE:   { zh:"蕾娜",   ja:"…", en:"…", art:"regine" },
  NOUVELLE: { zh:"諾薇兒", ja:"…", en:"…", art:"nouvelle" },
  ANYA:     { zh:"安雅",   ja:"…", en:"…", art:"anya" },
  SORANA:   { zh:"索拉娜", ja:"…", en:"…", art:"sorana" },
  LUNA:     { zh:"璐娜",   ja:"…", en:"…", art:"luna" },
};
```

**稱呼切換（監察官→蕾娜）以「兩個 id」處理**，不做 name 覆蓋機制。正名前台詞用 `OFFICER`，正名後用 `REGINE`；兩者 `art` 同指蕾娜立繪。好感度掛在 `REGINE`。理由：監察官稱呼只持續一幕多，當兩個角色最省事。

---

## 3. 通用 line schema（所有腳本共用的台詞單位）

```js
{
  speaker: "REGINE",        // 必填。查 speakers.js 得顯示名；也決定畫面高亮誰
  text: "……",              // 必填
  portrait: {               // 可省。省略 = 沿用上一句的畫面狀態
    char: "REGINE",         //   畫誰的立繪。省 = speaker 本人
    expr: "smile",          //   表情/動作差分 id，對應美術檔（如 regine_smile）
    pos: "right",           //   站位 left/center/right。省 = 沿用
    show: true              //   是否在場。省 = 沿用
  },
  cg: "noue_fall"           // 可省。全屏插圖，蓋過立繪
}
```

規則：
- **只寫「變化」的部分。** 站位、在場多半不變，只換表情時只寫 `{expr:"…"}`，其餘沿用上一狀態。首次登場才寫全 `{expr,pos,show}`。
- **明暗不寫。** 未說話者壓暗（蕾娜特例少壓）由渲染層依 `speaker` 自動處理，不是台詞資料。
- **portrait vs cg：** `portrait` 是半身立繪表情差分；`cg` 是全屏/大幅插圖（跌倒、登場、睡相）。
- **speaker 與畫面可不同角色：** 某角說話但畫另一角反應時，`portrait.char` 指定要畫的角色。

差分 id 命名慣例（語意命名，對應美術檔）：
- 蕾娜：`smile`(測不準微笑)、`stunned`(愣)、`fluster`(慌亂)、`silent`(沉默……)、`sleep_mess`(狼狽睡相)、`sleep_shy`(嬌羞睡相)
- 諾薇兒：`gentle`、`pain`(暴走/泛紅瞳)、`shy`、`sleep_mess`、`sleep_shy`
- 各角一套自定，schema 只吃字串 id。

---

## 4. dialogue.js — 航行隨機閒聊池

玩家在航行畫面主動點「對話」才觸發。多人一來一往的氛圍閒聊。功能：緩和氣氛、偷渡世界觀、強化角色。

- **維度**：`region` × `time` × `stage`。不吃好感。
- **萬用值**：`region:"ALL"`、`time:"ANY"`、`stage:"ANY"`／數字／數字陣列。
- **匹配**：三維度全命中或萬用，且 lines 內所有 speaker 都在該 stage 的登場名單，才進候選池。
- **抽取**：依 `weight` 權重隨機。`repeatable:true` 可重複；`false` 一次性（存 seenIds）。
- **防連續重播**：池子大了再做（近期播過短期排除）。
- **速度感/推時間**無關，這是被動召喚池，無搶佔問題。

conversation schema：
```js
{
  id: "s1_dusk_rest",
  region: "ALL",
  time: "DUSK",             // TIME_SLOTS key，見下
  stage: 1,                 // "ANY" / 數字 / [1,2]
  repeatable: true,
  weight: 1,
  lines: [ /* 通用 line schema */ ]
}
```

TIME_SLOTS（key 給 code，label 顯示）：
`DAWN 黎明 / MORNING 上午 / AFTERNOON 下午 / DUSK 黃昏 / NIGHT 夜晚 / MIDNIGHT 夜半`

STAGE_ROSTER（各 stage 登場名單，speaker 防呆用）：
```js
{
  1: ["OFFICER","REGINE","NOUVELLE"],   // 蕾娜+諾薇兒（正名後 REGINE）
  2: ["REGINE","NOUVELLE","ANYA"],      // 安雅加入
  3: ["REGINE","NOUVELLE","ANYA","SORANA"], // 索拉娜加入，四人到齊
}
```
（主角另計；roster 指同框可對話的女主。改隊伍組成只改這張表。）

---

## 5. mainScript.js — 主線 scene 鏈

主線純線性，不被過濾。scene 用 `next` 串成鏈，一段接一段跑。跑到某段時 `setStage`/`setFlags` 推進度。

scene schema：
```js
{
  sceneId: "prologue_audience",
  next: "capital_explore",   // 播完接哪個 scene。null = 鏈結束/交還控制
  setStage: 1,               // 可省。播完後設 stage
  setFlags: ["nouvelle_joined"], // 可省。播完後設的其他 flag
  context: "scene",          // scene / battle / field（過濾用，非分檔）
  lines: [
    { speaker:"NOUVELLE", text:"竟然，會有那麼巨型的聖徒！" },
    { speaker:"NOUVELLE", text:"啊！", cg:"noue_fall" },
    { speaker:"NOUVELLE", text:"別管我！快走！" },
    { battle:"tutorial_01" },        // 插入戰鬥，戰鬥系統接手
    { speaker:"NOUVELLE", text:"後面的全追上來了！" },
  ]
}
```

- **主線不讀 stage/好感**（結構上不含這些檢查欄位，保證主線穩定）。
- **戰鬥用 `{battle:"id"}` 插入 lines 序列**：敘事性戰前戰後對話在 lines 裡順播；戰鬥中觸發台詞掛在 `battles.js` 的該場戰鬥 trigger。
- **一次性**：主線每段播完寫 seen flag（存檔），不重播。跳過（skip）時務必正確設 flag，否則卡關。

---

## 6. sideScript.js — 支線

每條支線帶好感門檻，達標才進可觸發池。因「達標才出現、出現即該版」，**不做好感階層差分**。

```js
{
  sideId: "sorana_hunt_01",
  requires: { char:"SORANA", minTier:2 }, // 好感門檻（tier，見 §8）
  stage: [2,3],              // 可觸發的 stage
  trigger: { place:"capital_market", char:"SORANA" }, // 去哪、找誰觸發
  repeatable: false,
  setFlags: [],
  lines: [ /* 通用 line schema，可含 {battle:"id"} */ ]
}
```

- 支線可含戰鬥中對話（`{battle:"id"}` + 該戰鬥 trigger 台詞），同主線做法。
- 支線觸發靠玩家行動（去特定地點找特定角色），非選單。

---

## 7. innInteract.js — 旅店互動（一檔巢狀）

結構 `INN[角色][動作][階]`。含敲門、獨自坐坐、升階對話。吃好感差分。

### 7.1 房間狀態（雙層視覺信號）
- 頭像亮 = 在房 / 頭像暗 = 不在（去城裡找）
- 燈亮 = 醒著 / 燈暗 = 已睡
- 上午下午在城鎮活動；早晨/晚間/深夜在房。

### 7.2 敲門（knock）
`INN[char].knock[tier][state]`，state = `awake` / `asleep`(挖醒)。

挖醒扣好感規則：
- 諾薇兒、索拉娜：任何階段不扣。
- 安雅、蕾娜：基礎階段扣，但**睡相插圖豁免一次**。
- 全員 LV5(滿級)：無好感可扣。
- 睡相插圖：基礎版 `sleep_mess`(狼狽/起床氣)，LV5 版 `sleep_shy`(嬌羞)。

```js
INN.REGINE.knock = {
  base: {   // 基礎階（挖醒）
    lines:[
      {speaker:"OFFICER", text:"怎麼了怎麼了？", portrait:{expr:"sleep_mess"}},
      {speaker:"OFFICER", text:"你知道現在幾點了嗎？不敢相信！"},
      {speaker:"OFFICER", text:"下次再這樣我要生氣了！"},
    ],
    penalty: "affection_down_once_waived_by_cg"
  },
  lv5: {    // 滿級（挖醒）
    lines:[
      {speaker:"REGINE", text:"............", portrait:{expr:"sleep_shy"}},
      {speaker:"REGINE", text:"晚安。"},
    ],
    penalty: null
  }
}
```

### 7.3 獨自坐坐（sitAlone）— 旅店時間引擎
- **每次消耗 2 小時**（推時段，用來堵女角亮燈）。
- 好感 <20：關燈提示「旅店大廳要關燈了。」
- **有女角升階：必觸發該角升級對話**（保證不錯過福利）。
- 無升階：是否有人出來陪 = 隨機（氛圍+推時間）。
- **第一次出場 = 當前最高好感者**；之後有女角升階則優先輪到該角。
- 一晚只聊一人。獨坐本身**不加好感**（防獨走循環）。
- 蕾娜特殊：高好感獨坐會被索拉娜打斷，蕾娜扭頭就走（森住民讀心 → 蕾娜又吃味又害怕）。
- 多人同晚升階：升階對話進**佇列**，排隊逐晚播，不吞掉。

```js
INN.REGINE.sitAlone = {
  levelUp: {           // 跳階升級對話，key = 目標階
    2: { lines:[ … ] },
    3: { lines:[ … ] },
    5: { lines:[ … ], event:"regine_date" }, // LV5 = 事件化，約時間地點
  },
  interrupt_sorana: { lines:[ … ] }, // 索拉娜打斷、蕾娜離席
}
```

### 7.4 五階福利梯度
| 階 | 好感 | 福利 |
|----|------|------|
| LV1 | 20 | 台詞差分 |
| LV2 | 30 | 立繪差分 |
| LV3 | 40 | 服裝/飾品可選（每人 2–3 套預設，各套需過撞色檢查） |
| LV4 | (區間) | 立繪差分 |
| LV5 | 50 | 台詞差分 + 事件化（約主角時間地點） |

---

## 8. 好感度系統

- 滿級 50，每 10 分一區間，共 5 階；同區間視為同級。
- **只升不降**（區間內升降，不跌階）。
- tier 對照：LV1=20, LV2=30, LV3=40, LV4=(區間), LV5=50。
- **來源**：
  - 戰鬥夥伴出場次數（正比）
  - 特殊能力使用：諾薇兒正比／安雅戰績不連動／索拉娜正比且主角戰評越低升越快
  - 特殊事件
- 諾薇兒、安雅好感與戰績不連動；索拉娜、蕾娜戰績相反，需足夠場數先後疊滿。
- **閒聊不吃好感；主線不吃好感；支線讀好感門檻；旅店互動吃好感差分。**
- 不可視化。回饋管道：獨坐出場順序、敲門安全感、稱呼變化、升階對話。

---

## 9. battles.js — 戰鬥定義

戰鬥不是台詞檔，但含戰鬥中 trigger 台詞。主線/支線用 `{battle:"id"}` 引用。

```js
{
  battleId: "tutorial_01",
  type: "tutorial",         // tutorial / event / boss
  triggers: [               // 戰鬥中條件觸發的台詞
    { on:"start",       lines:[ … ] },
    { on:"hp_below_50", lines:[ … ] },
    { on:"phase_2",     lines:[ … ] },
    { on:"win",         lines:[ … ] },
  ],
  // 戰鬥數值/敵人配置等另計
}
```

- 戰鬥中觸發台詞掛這裡（trigger-based）。
- 戰前戰後敘事對話留在引用它的主線/支線 lines 序列。
- 教學台詞在連續失敗重來時應可跳過，避免重複。

---

## 10. 調度優先度（scriptDirector，自動觸發腳本用）

僅適用**自動觸發**的主線/事件腳本。航行隨機閒聊是玩家主動召喚，無搶佔。

搶佔順序（同時機多腳本合格時）：
```
主線指示 > 一次性劇情事件 > 支線指示 > 氛圍閒聊
```
- 主線推進絕不被閒聊蓋掉；閒聊是最低優先的填充。
- 每條腳本標 `repeatable`；一次性播完寫 seen flag（存檔，非僅記憶體）。
- 所有腳本（含主線/支線）的 speaker 都要過 STAGE_ROSTER 防呆。
- stage 切換時未消耗的一次性腳本，依「過期規則」處理（作廢/保留/補播）；主線關鍵事件不可錯過。
- 中斷恢復：對話中存檔/退出後的續播規則、skip 時的 flag 設置，需正確處理（漏設 = 卡關）。

---

## 附：資料流圖

```
主線 mainScript ──寫──> stage / flags
                          │
              ┌───────────┼───────────┐
              ↓           ↓           ↓
        dialogue      sideScript    innInteract
        (讀 stage)   (讀 stage+好感) (讀 stage+好感)
```
主線只寫，其餘只讀。
