# 四主立繪差分・擴充（`resources/SI/ext/`）— 工單 ver -1502

> Ray（2026-09-19）：「幫我擴充立繪差分吧。為 NPC 以外的各角色加上現在沒有的表情動作，
>   但是要注意**符合角色形象**，新差分放在 SI 裡面**新開一個資料夾不要污染到舊圖池**」
> → 範圍＝**四主**（蕾娜／諾薇兒／索拉娜／安雅）；**每人 15~20 張**；內容**參考 `reference/script.docx`**

**交件位置**：`resources/SI/ext/`（新資料夾，**不碰舊池**）。命名沿用 `角色_SI_名稱.webp`，1024×1536。

---

## 一、怎麼決定要畫什麼（方法，不是憑感覺）

1. **先算「劇本點名但缺圖」** —— `reference/script.docx` 直接寫檔名（`Nouvelle_SI_Run`…）。
   全文 156 個引用，**只缺 4 個**：`Renna_SI_lookaside`／`Renna_SI_shockedCalmC`／
   `Renna_SI_writtingC`／`Sorana_SI_point`。⇒ **已寫出來的劇本，現有池子是夠的。**
2. ⇒ 所以要補的是**「這個角色照理會有、但池子裡沒有」**的那些。判準兩條：
   · **結構性缺口**：別人都有、她沒有的基本取景（見下，蕾娜缺 `side`/`back` 就是）
   · **情緒範圍的洞**：劇本把她寫成什麼樣的人，那個範圍裡哪一段是空的
     （索拉娜整個池子**沒有一張 sad／scared／angry**——一個開朗角色缺的正是落差）

## 二、⚠⚠⚠ 結構性缺口（優先，這幾張不補會出現「這個人沒辦法轉身」）

| 角色 | 缺 | 為什麼重要 |
|---|---|---|
| **蕾娜** | `side`、`back` | 其他三人都有。站位／背對的演出對她做不出來 |
| **索拉娜** | `point` | **劇本已經點名**（`Sorana_SI_point`），現在是缺檔 |
| **蕾娜** | `lookaside`、`shockedCalmC`、`writtingC` | 同上，劇本點名的缺檔（`C` 結尾是同一姿勢的差分，**取景直接沿用本尊**，憲法 §5） |

## 三、逐角色清單（各 18 張）

### 蕾娜 Renna（池 62）—— 她是**端著的人**，缺的是「卸下來」與「公務動作」
`side` `back` `lookaside` `laugh` `smilesoft` `nod` `salute` `armcross`
`holdfile` `pointmap` `handout` `sipdrink` `blushangry` `coldstare`
`determined` `apologize` `whisper` `sleepdesk`
> ⚠ 她池子裡**沒有 whisper**（另外三人都有）、**沒有真的笑出聲**（只有 smile）。
> `salute`／`holdfile`／`pointmap` 是監察官的職業動作，現在完全沒有。

### 諾薇兒 Nouvelle（池 48）—— 她是**慌張又愛解釋的人**，缺的是「認真起來」與「靜下來」
`point` `blushed` `laugh` `nod` `armcross` `determined` `coldstare` `stare`
`salute` `handout` `eat` `sleep` `cry` `smug` `lookdown` `covermouth`
`reach` `wet`
> ⚠ 她**沒有 point**（要指東西時無圖可用）、**沒有臉紅**（只有 Shy）、
> **沒有單純的哭**（只有 dying／Desperate 那種極端）。

### 索拉娜 Sorana（池 35，**缺口最大**）—— 她是**開朗好戰的人**，缺的正是落差
`point` `sad` `crying` `scared` `angry` `serious` `worry` `lookaway`
`stare` `shy` `blushed` `sleepy` `sleep` `wave` `nod` `armcross`
`determined` `eat`
> ⚠ 整個池子**沒有一張 sad／crying／scared／angry／worry** ——
> 她現在只演得出「開心、好戰、鬧、累」。主線一到低潮她就沒有表情可用。

### 安雅 Anya（池 38）—— 她是**沉默寡言的人**（`Silent` 是她最常用的），缺的是「有話沒說出口」
`thinking` `angry` `serious` `determined` `nod` `whisper` `wave` `stare`
`relief` `worry` `laugh` `armcross` `hug` `read` `eat` `sleep`
`wheeltalk` `wheelback`
> ⚠ 她**沒有 thinking、沒有 angry、沒有 whisper**；輪椅只有 `wheel`／`wheelpoint`
> 兩張，坐著講話與坐著背對都沒有。

## 四、⚠ 取景（交件時要一起交）

· **同一姿勢的差分直接沿用本尊的 `fx/top/bot`**（憲法 §5，ver -649：「這麼簡單的事不要繞」）。
· **站姿但構圖不同的**（`side`／`back`／`armcross`／`holdfile`／`sipdrink`／`hug`／
  輪椅那兩張）**要逐張重量**。
· ⚠⚠ 量到的值寫進**這份工單**，由程式端接進 `script/speakers.js`（鐵律 11，美術不動 `.js`）。

## 五、進度

| 角色 | 已產 / 目標 |
|---|---|
| 索拉娜 | 0 / 18 |
| 安雅 | 0 / 18 |
| 諾薇兒 | 0 / 18 |
| 蕾娜 | 0 / 18 |
