# 多語系統（ver -1909）

三層，各自一份「中文母本 → 譯文表」：

| 層 | 內容 | 盤點（語種無關，只做一次） | 譯文表 | 工具 |
|---|---|---|---|---|
| 語言包 | 首頁／戰鬥浮字／教學等 `L.xxx` | `i18n/zh.js`（母本） | `i18n/<lang>.js` | 手寫 |
| 劇本 | 對白、地名、角色名、評價、飛行閒聊 | `i18n/script/strings.json` | `i18n/script/<lang>.json` | `tools/script_i18n.py` |
| 介面 | 引擎寫死的字、資料卡、HTML 標記 | `i18n/ui/strings.json`＋`i18n/ui/INVENTORY.md`（統計） | `i18n/ui/<lang>.json` | `tools/ui_i18n.py` |

執行期：`i18n/scriptTr.js` 只在選了該語言時載 `script/<lang>.js` 與 `ui/<lang>.js`（中文玩家 0 位元組），
合成一張表 —— 程式字面值走 `i18nT('…')`、資料走 `trTree()`、靜態 HTML 走 `trDom()`；
飛行頁（非模組）在 `<head>` 同步載 `*.classic.js`，用全域 `i18nT`。

## 新增一個語種（例：pt）

1. `i18n/pt.js`：照 `i18n/zh.js` 的結構翻（或先複製 `es.js` 改）。
2. 劇本：把 `i18n/script/strings.json` 的每個 `zh` 翻成 `i18n/script/pt.json`（`{中文: 譯文}`）。
   `python3 tools/script_i18n.py check pt` → `js pt` → `xlsx pt`（審稿表）。
3. 介面：只翻 `i18n/ui/strings.json` 裡 `need:true` 的 `zh` → `i18n/ui/pt.json`。
   `python3 tools/ui_i18n.py check pt` → `js pt` → `xlsx pt`。
4. 登記：`i18n.js` 的 `PACKS`／`LANG` 判定、`main.js` 語言鈕的 `LANGS`／`NEXT_FACE`、
   `i18n/scriptTr.js` 與 `flight/index.html` 開頭那兩處的 `AVAILABLE`（`['es']`）。
5. `python3 tools/bust.py --bump`。

⚠ **盤點與包裝不必重做**：`extract`／`wrap` 是語種無關的；只有中文母本改了才重跑 `extract`
（改過的句子會在 `check` 裡變成「缺譯＋孤兒」）。新寫的程式字串要再跑一次 `wrap`（冪等）。
⚠ 譯法定案各語種一份：`i18n/script/NOTES_<lang>.md`（西文見 `NOTES_es.md`）。
⚠ 拿中文當識別字的欄位（talks 的 `time`、武器的 `cat`…）不換：`scriptTr.js` 的 `SKIP` ＝
  `tools/ui_i18n.py` 的 `ID_KEYS`（改一邊要改另一邊）；要顯示時寫 `i18nT(變數)`。
⚠ 刻意保留中文的鍵：`日本語`／`中文`（語言鈕）、`月`（月名樣板的中間鍵）。
