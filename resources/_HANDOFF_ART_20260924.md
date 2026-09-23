# 美術 session 交接 — 2026-09-24（涵蓋 09-23 晚 ～ 09-24）

> ⚠ 開工第一件事是讀**這一份**（憲法 §0.1）。程式的交接是根目錄 `HANDOFF.md`，美術的現況只在這一系列。
> ⚠⚠ **09-23 晚，`resources/_HANDOFF_734.md` 與 `_HANDOFF_ART_20260904~0923.md` 共 11 份從磁碟上被刪了**
>   （不是美術 session 刪的、沒走回收區）。**它們仍在 git 裡**：`git show HEAD~N:resources/_HANDOFF_ART_20260923.md`。
>   已問 Ray、**還沒回覆** —— 刪除狀態**沒有被 commit**，不要順手 `git add -A` 把它 commit 進去。
>   §四（破內容判定）／§八（工具的坑）／§十（matting 環境）／§十一（投放夾）那幾段還在 `_HANDOFF_ART_20260922.md`（git 裡）。

---

## 一、這一輪交了什麼（全部已 commit ＋ push）

| commit | 件 |
|---|---|
| `e93ed143` `75e6d43f` | **索拉娜 realpha 12 張**（Ray 的 SD 臉 ＋ GPT 原 alpha，畫布回 GPT 原尺寸）—— 表在 `si/_sorana_r3_worklist.md` §十三 |
| `75e6d43f` | **米夏五張刀鞘一致修正**（draw／wound／close／frown／talk） |
| `34bff5ee` | 索拉娜 `carrynouvelleshock2`（shock 的索拉娜 ＋ jealous 的諾薇兒臉）§十四 |
| `722d3ba7` | 蕾娜公主抱四差分 `hugserious／hugshock／hugtalk／hugtalk2` §十五 |
| `88c0839e` | **米夏 12 張**：10 個表情差分 ＋ `order` 強透視重畫 ＋ `back`（背影回頭）—— `si/_misha_program_worklist.md` 末段 |
| `9035ea6d` | 米夏 `frontshock` 換強烈版（Ray：初版「太清澈」；用在「！！」那一拍、無冷汗） |
| `e75d030b` | 安雅 `happy`（笑瞇眼幸福微笑、嘴閉）—— `si/_ext_worklist.md` 末段 |
| `77f465d2` | **畜生道尺寸鎖定規格** `si/_misha_sword_lock.md` ＋ 比例尺參考圖 `weapon/_chikushoudou_scale_ref.png` |

另：墓主倒地 `mon_gravekeeper_seal_down.webp` —— 程式端已接（-1701~-1704）。

---

## 二、⚠⚠⚠ 程式端還沒接的（**會出錯的排前面**）

1. **索拉娜 realpha 12 張的 `top`/`bot`＋版號沒接**（`speakers.js` 仍是 1600 畫布的舊值、`?v=` 沒跳）
   ⇒ 那 12 張在遊戲裡**位置偏、而且可能吃到舊快取**。表：`_sorana_r3_worklist.md` §十三（`amaze`／`cringe`／`excite2` 在 `flight/index.html` 也有一份）。
2. **`sorana_si_excite.webp`／`sorana_si_furiouscute.webp` 被刪了（工作區，未 commit）**，
   `speakers.js:688／690` 還指著它們；同時多了一個未追蹤的 `sorana_si_furious.webp`。
   —— 看起來是 Ray 正在換檔。**不是美術 session 動的**，等他說明；commit 之前程式端要改指向，不然就是 404。
3. 安雅 `happy` 新鍵沒接（一行，`_ext_worklist.md` 末段）。
4. 米夏：21 鍵已在 -1706 接上 ✔。但 `order` 重畫後的 `top/bot`（8／1527）、`back` 的 fx 要看畫面複核。

---

## 三、進行中 ／ 等 Ray 決定

- **米夏 `close` 改自然站姿**：Ray 交辦「close 跟 closeopen 不要立正站好」。
  新圖已選 `_originals/si/misha_si_close_natural_src.png`（重心單腳、手搭刀柄）—— **還沒上線**，
  而且**刀長還沒照新規格量**；`closeopen` 要用它當底圖重做（GPT 送出前被 Ray 喊停：「先讓 gpt 休一下」）。
- **畜生道刀長不合格的 7 張**（規格：刀長＝身高 70%，容許 0.66~0.74）：
  `side` 0.83／`stare` 0.78（太長）、`close` 0.61／`talk` 0.57／`frown` 0.47（太短）、`guard`≈0.59／`back` 0.57（可能含透視）。
  ⚠ 重畫底圖時，對應的 `*open` 差分要一起重做（差分是只換臉貼回底圖的）。等 Ray 說要不要重畫。
- 工作區還有 Ray 丟的未追蹤檔：`anya_si_nod.png`、`renna_si_hugangry2.png`、`renna_si_hug{,close,lookaway}.png`（後三張是已上線 webp 的 RGB 原檔，該進 `_originals/`）。**沒動，等他一句話。**

---

## 四、這一輪學到的（下一個 session 照做）

1. ⚠⚠⚠ **GPT 做「表情差分」會把整張重畫**（頭髮、衣褶、alpha 全部微變）——
   **不要整張採用**。作法：只把 GPT 版的臉貼回原圖、alpha 沿用原圖（羽化 2.5 px）。
   · 「只改嘴」的一律**只取下半臉** —— `frownopen` 的 GPT 版把眼睛畫成金色，差點混進來。
   · 表情整個換（咬牙／驚愕／笑眼）才連眼眉一起取（往上擴 55~60 px）。
   · 工具：`scratchpad` 裡的 `facesplice.py` 沒入庫 —— 要用就重寫（膚色框出臉 → 差異∩臉區 → 羽化貼回）。
2. **Ray 的 SD 稿可能是 GPT 圖「從左上裁掉右／下緣」**（不是縮放）：先試裁切對位（誤差 0.3~0.4 ＝對上了），再套原 alpha。
3. **畜生道要鎖尺寸就要「附比例尺圖 ＋ 用身體部位寫長度 ＋ 收件量」三件一起做**（`_misha_sword_lock.md`）。
   自動量刀長**不可行**（刀鞘被黃銅箍切成好幾段），用格線人工讀兩端點。
4. ChatGPT 並行 4~6 個分頁可行；「訊息遞送逾時」＝那一串壞了 → **換新對話重送**（憲法 §5）。
   `javascript_tool` 單次上限 45 秒 —— 輪詢要分段，不要一個迴圈等到底。

---

## 五、資產盤點（`✔ 不欠` 附理由；沒列的＝還沒盤）

| 項 | 狀態 |
|---|---|
| 索拉娜立繪 | ✔ 62/62 ＋ realpha 12 張重做完（**但程式端未接，見 §二-1**） |
| 米夏立繪 | ✔ 本尊＋21 差分＋back；⚠ 欠：`close` 自然站姿上線、`closeopen` 重做、刀長不合格 7 張（等 Ray） |
| 蕾娜公主抱 | ✔ hug／close／lookaway／angry／shy ＋ 新 4 張 |
| 安雅 | ✔ `happy` 交了；⚠ `smile` 那筆舊帳：庫裡已有 `anya_si_smile.webp`（誰交的待查），程式端未接 |
| 背景 | ✔ 不欠（09-23 份的盤點，沒有新節點） |
| 小地圖 | ⚠ 欠 `canyon`／`lake` 2 張（同 09-23） |
| 敵人 | ✔ `mon_gravekeeper_seal_down` 交了；⚠ 欠 `mon_dragon_front`、三張髒 alpha、古墓怪重繪（同 09-23） |
| 插圖 | ⚠ 6 張古墓插圖仍是 png（同 09-23；轉檔要與改路徑同時做） |
