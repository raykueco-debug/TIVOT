# 美術 session 交接 — 2026-09-22

> ⚠ 開工第一件事是讀**這一份**（憲法 §0.1）。
> ⚠⚠⚠ **不要只讀根目錄的 `HANDOFF.md`** —— 那是**程式** session 的交接，
>   它的「資產盤點」停在 ver -1543，今天我照它回報，**把早就做完的事講成還欠**
>   （米夏被我講成「欠整個人」，其實 ver -1549 就接上了；索拉娜重繪被講成「不欠」，
>   其實還差 18 張）。Ray 當場退回兩次。**美術的現況只在 `_HANDOFF_ART_*.md` 這一系列。**

---

# 一、今天交了什麼（全部已 commit ＋ push）

| 件 | 張數 | commit |
|---|---|---|
| **雪都大教堂・內部**（`varn_church` 四時段） | 4 | `9d994c93` |
| **索拉娜重製** 第三輪 | 11 | `82caf63f` |
| **索拉娜重製** 追加（換串＋方向詞之後過的） | 2 | `3f5a10b6` |

## 雪都大教堂 —— 全庫最後一個 `bgPending` 清掉了

> Ray：「**教堂是內部　同教派**」—— 這一句解掉了 `_ravnsdal_spec.md` §三
> 留白了十個月的那一格（宗教建築形制）。

- 底圖用 **`northport_church_day`**（這個教派**現存唯一的內部圖**）
- 規格、驗收數字、退掉的兩版與理由，全部寫在 **`resources/background/_varn_church_spec.md`**
- ⚠ **程式端還沒接**（那一格還在借中心區的圖）：spec §七 三件 ——
  ① 先跑 `py tools/bg_index.py` ② `ravnsdal.church` 的 `bg` 改成 `Varn_Church` ③ 拔 `bgPending`

## 索拉娜 —— **57/62**，還差 5 張

工單：**`resources/si/_sorana_r3_worklist.md`**（程式端要跳 `?v=` 的 13 條路徑在 §一）

| 狀況 | 鍵 |
|---|---|
| ✔ 今天交 13 張 | `battlecry` `shy` `side` `smile` `sorry` `surprise` `talk` `think` `tire` `upset` `watch` `whisper` `remind` |
| ⚠ **內容判定擋死**（各 3~4 次，兩種方向詞都試過） | `smirk` `tease` `amaze` `laugh` |
| ⚠ **alpha 出不來**（圖出得來，但它自己畫背景，角α 246~252） | `panic` |

⚠⚠ **那五張要不要繼續是 Ray 的決定**：它們**已經接進腳本**，
「換掉那一張」等於改掉那幾拍的演出。三條路寫在工單 §四。

---

# 二、⚠⚠ 今天學到的三件（下一個人先看）

1. **⚠⚠⚠ 兩份交接檔互相矛盾就是鐵律 7 的病** —— 見本檔開頭。
   **`HANDOFF.md` 的資產盤點不要當美術現況讀**，它更新得比美術這邊慢很多。
2. **`_sorana_check.py` 的 `BASE` 指向 `_originals/`，而 `_originals` 沒進版控**
   ⇒ 換一台機器它就跑不動。版控裡的那一份在 **`resources/si/soranagpt/`**
   （四張 UUID 檔名 ＝ `soranagpt_1~4`，依檔名時間排序）。複製回去就好。
3. **Gemini 的輸出就是 1024×682**，沒有更大的版本：
   · 它的「下載原尺寸圖片」**被 Chrome 擋掉**（一個位元組都沒落地）
   · 但頁面裡那張就是它真正的輸出（`canvas.drawImage` → `toBlob` → `<a download>` 拿得到）
   · ⇒ 今天的三張差分是 1024×682，**沒有放大**（憲法：重取樣會在 cel 圖的硬邊上振鈴）。
     day 那張是 GPT 畫的，1536×1024。**長寬比差 0.1%，畫面上看不出來。**

## ⚠ 工具的兩個坑（跨 session 都會踩）

- **`javascript_tool` 有 45 秒上限**：`__send()` 自己就睡 20 秒，再串長等待就 timeout，
  **而且送出其實成功了**，只是回傳被砍掉 —— 差點誤判成沒送出而重送（白燒額度）。
  ⇒ `__send` 與 `__grab` 分成兩次呼叫，中間用 `browser_batch` 的 `wait` 湊時間。
- **換新對話之後 `ref` 會失效，而且同一個編號會被重新指派給別的元素**
  ⇒ 每開一個新串就重新 `find` 一次。
- **Gemini 的送出**：合成 Enter 在**新的一串**上常常不作動；
  **真的可靠的是「對輸入框做一次真點擊 → 按 Return」**，或直接點那顆藍色送出鈕。
  （憲法寫的「Gemini ✔ 合成 Enter」只在**既有對話頁**成立。）

---

# 三、⚠ 這個 repo 今天**兩個 session 在同一個工作目錄上跑**

程式 session 在我做事的期間 commit 了 `add4f82e`（ver -1670，敵人卡降臨上 Excel）。
**沒有撞到** —— 我全程只 `git add` 自己的檔案（鐵律 11：美術不碰程式）。
⚠ 下一個美術 session 照做：**`git add` 逐檔點名，不要 `git add -A`**。

---

# 四、資產盤點（⚠ `✔ 不欠` 的也列，附理由）

## 背景

- **✔ 不欠**：`script/town.js` 的節點背景**一格都不缺**，`bgPending` **已清空**
  （雪都大教堂今天補完，那是全庫最後一個）。
- ✔ 夏爾森林 9 格／卡耶爾山谷 5 格是**刻意的三差分**（沒有也不需要 `_Dawn`）——
  **不要再叫美術補 Dawn**（ver -1542 誤報過一次，Ray 擋下來）。

## 小地圖

- **⚠ 欠 2 張**：**卡耶爾山谷**、**鏡湖**。這兩座連 `TOWNS[].map` 欄位都還沒有，
  圖到了要一起接（其餘 12 座照抄它們的寫法）。

## 立繪

- **✔ 米夏不欠**（ver -1549 就接上了）：`ART.misha` → `si/misha_si_front.webp`、
  插圖 `021-mishalookback`、CI `ci_mishastare` 三樣都在線上。
- **⚠ 索拉娜還差 5 張**（見上）。
- **⚠ 欠**：諾薇兒 `gentle`／`pain`、蕾娜（`OFFICER`）`stunned`／`fluster`
  —— 都在 `prologue_audience`／`prologue_fall`（**目前是走不到的孤兒場景**，
  會退回底圖，不會壞）；安雅 `smile`（庫裡只有 `smileshy`／`smilesneaky`，
  **要新圖還是改指，等 Ray 一句話**）。
- ✔ 蕾娜**不欠重繪也不欠 alpha**（Ray：「別惦記著我蕾娜」）—— **不要再提議重畫她的頭髮。**

## 敵人

- **⚠ 欠 1 張**：`mon_dragon_front.webp`（王座徘徊者・空中戰第一形態）——
  白底 raw 也不在庫裡（`_originals` 沒進版控，只在另一台機器上）。那一格現在是空立繪。
- **⚠ 三張舊怪圖的 alpha 還髒**：`mon_bear_husk`／`mon_shinierforest_snake`／`mon_beast_organ`。
  以 `mon_beast_reliquary`（近白 0.05%）當校準點，這三張是 **2.1~3.1%**。
- ⚠ **古墓怪的「畫風重繪」還沒做**（前兩輪只做了 alpha）——
  Ray：「古墓怪全部都要重繪，動物先不管」。

## 音訊

- **⚠ 檔案在磁碟上、但沒登記進表 ⇒ 遊戲載不到**（`script_lint.py` 每次都在叫）：
  `se_cannonslide`、`peritune_mystic_tides_loop`、`peritunematerial_pray_organ_loop`。
  ⚠ 今天工作區還多了一個**沒進版控**的 `resources/audio/se/se_heavycursh.mp3`（不是我放的）。
