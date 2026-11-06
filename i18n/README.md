# 多語系統（ver -1909／**ver -2582 介面收進一份 Excel**）

## ⭐ 介面字（台詞以外的所有字）＝根目錄 `i18n_ui.xlsx`，唯一來源

Ray（ver -2582）：「除了台詞外，所有介面都要能夠進行語種切換，最好一個檔案就能處理。格式用 EXCEL，
要有中文與譯文方便校稿，也方便 AI 一次機翻。」

| 欄 | 內容 |
|---|---|
| 鍵 | `L:<路徑>` ＝ 語言包那一格（`i18n/zh.js`，例 `L:home.start`）／`T:<雜湊>` ＝ 查表字（遊戲拿中文原文去查） |
| 類別 | 首頁／戰鬥／城鎮／整備／飛行頁／地名・人名…（給人分段看） |
| 中文 | 原文 —— **由程式同步過來，在 Excel 改中文不會回寫程式** |
| `en｜English`、`ja｜日本語`、`es｜Español` | 譯文。空白＝遊戲裡退回中文。**加一欄 `pt｜Português` 就是加一個語種** |
| 出處／備註／狀態／缺譯 | 第一次出現的位置／人寫的備註（tool 不蓋）／停用・中文已改・新增／還空著的語種 |

另有兩頁：「說明」（含整段可以直接貼給 AI 的機翻指示）、「漏網」（程式裡還沒經過翻譯層的中文）。

```
py tools/i18n_xlsx.py sync    # 程式改過介面字之後：新字補進來、不見的標「停用」（譯文與備註照留）＋重算漏網
py tools/i18n_xlsx.py build   # 譯文改過之後：產生遊戲讀的檔，接著 py tools/bust.py --bump
py tools/i18n_xlsx.py check   # 只看：缺譯／佔位符不符／漏網
py tools/i18n_xlsx.py wrap    # 新寫的程式中文自動包 i18nT('…')（改共用檔，先 git pull）
```

`build` 產生（全部在 `i18n/ui/`，**不要手改**）：

| 檔 | 誰讀 |
|---|---|
| `<lang>.js`／`<lang>.classic.js` | 查表字 `{中文: 譯文}` → `i18n/scriptTr.js` 的 `i18nT`／`trTree`／`trDom`；飛行頁同步載 classic 版 |
| `pack.<lang>.js`＋`packs.js` | 語言包（zh.js 的整棵樹換上譯文）→ `i18n.js` 的 `L` |
| `langs.js`／`langs.classic.js` | 語種清單（Excel 的譯文欄）→ `scriptTr.js`、`main.js` 語言鈕、飛行頁開頭 |

⚠ 舊的手寫 `i18n/en.js`／`ja.js`／`es.js` 與 `i18n/ui/es.json` **已不引用**，只是建表時的種子（Ray：留著不動）。
⚠ `tools/ui_i18n.py` 只剩 `extract`／`wrap`（給 i18n_xlsx 用）；它的 `check`／`xlsx`／`js` 已停用 ——
  再產一次 `ui/<lang>.js` 就會把 Excel 的成果蓋掉（鐵律 7）。
⚠ 中文母本：語言包那幾格改 `i18n/zh.js`，其餘改程式本身；改完 `sync`。

## 台詞（不在 Excel）

| 層 | 內容 | 盤點 | 譯文表 | 工具 |
|---|---|---|---|---|
| 劇本 | 對白、旁白、評價、飛行閒聊、戰鬥內對白 | `i18n/script/strings.json` | `i18n/script/<lang>.json` | `tools/script_i18n.py` |

⚠ 劇本資料裡的**地名／人名**（`name`／`label`／`closed` 欄）也進了 Excel（類別「地名・人名」）：
  執行期介面表蓋在劇本表之上（`Object.assign(S, U)`），所以這幾句以 Excel 為準。

執行期：`i18n/scriptTr.js` 只在選了該語言時載 `script/<lang>.js` 與 `ui/<lang>.js`（中文玩家 0 位元組），
合成一張表 —— 程式字面值走 `i18nT('…')`、資料走 `trTree()`、靜態 HTML 走 `trDom()`；
飛行頁（非模組）在 `<head>` 同步載 `*.classic.js`，用全域 `i18nT`；開機前就跑的 classic script
（`offline.js`／`orientation.js`）呼叫當下問 `window.i18nT`。

## 新增一個語種（例：pt）

1. `i18n_ui.xlsx` 最後一個譯文欄右邊插一欄，表頭 `pt｜Português`，翻（或丟給 AI）→ `build`。
2. 劇本台詞：`i18n/script/pt.json` → `py tools/script_i18n.py js pt`（有了才會載）。
3. `main.js` 語言鈕的 `FACE` 加 `pt` 的自稱（沒寫印 `PT`）；`i18n.js`／`flight/index.html` 的地區偵測要不要加看需要。
4. `py tools/bust.py --bump`。

⚠ 譯法定案各語種一份：`i18n/script/NOTES_<lang>.md`（西文見 `NOTES_es.md`）。
⚠ 拿中文當識別字的欄位（talks 的 `time`、武器的 `cat`…）不換：`scriptTr.js` 的 `SKIP` ＝
  `tools/ui_i18n.py` 的 `ID_KEYS`（改一邊要改另一邊）；要顯示時寫 `i18nT(變數)`。
⚠ 含 `${}` 的樣板字串查不了表：改寫成 `i18nT('第 {n} 欄').replace('{n}', n)` 的形狀（`modules/save.js` 那幾句是範例）。
⚠ 刻意保留中文的鍵：`日本語`／`中文`（語言鈕）、`月`（月名樣板的中間鍵）。
