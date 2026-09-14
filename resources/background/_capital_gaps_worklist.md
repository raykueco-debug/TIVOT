# 時段差分的缺口與定案（ver -1316 巡查 → **-1318 結案**）

> 巡法：照 `modules/story.js` 的 `bandNames()` ＋ `BAND_FALL` 把每個節點 × 五個時段
> 逐格解一次，看解到的是「專屬那一張」還是退路。**⚠ 這一份的第一版把「檔名缺一格」
> 當成「畫面缺一張」報了 6 張缺口 —— 那是錯的**：退路解到的多半已經是一張
> **看起來正確的圖**（廣場的 `midnight` 本來就是夜景、室內的 `night` 本來就是暖燈夜景）。
> **判缺口要看解到的那一張長什麼樣，不是看有沒有那個檔名。**

## ⚠⚠⚠ Ray 定案：**店類除了酒吧與旅店以外，不畫夜景**（ver -1318）

> 「店類的東西除了酒吧跟旅店以外都不用畫夜景，因為在那之前就會關門」

帝都的武器店（8–20）、雜貨舖（8–20）、賞金獵人公會（8–20）**不需要 `night`／`midnight`**。
夜的界線是 19:00，那一小時看到黃昏圖是可以接受的。
⚠ 已經生成的 `Captal_Guild_night` 當場走 `tools/recycle.sh` 回收 —— 不要再補回來。

## 結案表

| 節點 | 原本報的缺 | 結論 |
|---|---|---|
| `Capital_Square` | `night` | ✔ **已補**（ver -1318）。銀月＋亮著的窗，與既有的 `midnight`（更暗、無人）成為夜／深夜一對 |
| `Shinier_Lakeside` | `night` | ✔ **已補**（ver -1318）。**唯一一格畫面上真的不對的** —— 全天可到，原本退到 `Dusk` 的夕陽橘金 |
| `Capital_Firearm` / `Capital_Grocerie` / `Captal_Guild` | `night`／`midnight` | ⛔ **不做**（上面那條定案） |
| `Capital_Bistro` | `midnight` | ⛔ **不做**：退到的 `night` 已經是暖燈夜景的室內，深夜版會長得一樣 |
| `Capital_Hotel` | `midnight` | ⛔ **不做**：退到的 `Night` 已經只剩櫃台一盞燈 |
| `Shinier_Workshop` | `night`（`_shinier_worklist.md` 上） | ⛔ **不做**：營業 8–19，夜一到就打烊，玩家進不去。那份清單可以劃掉 |

## 不是缺口的那些（巡到但**不要**開工單）

- **`midnight` 全專案系統性沒有**：`BAND_FALL.midnight` 第一順位就是 `night`，退得乾淨。
- **森林 `Forest_*` 與山谷 `Canyon_*` 沒有 Dawn**：`_forest_spec.md`／`_canyon_spec.md`
  都寫明**三時段**，是設計就這樣。
- **拉芬斯達爾室內七格維持單張**（`_ravnsdal_spec.md` §五，憲法 §5「有室外光才有差分」）。
  ⚠ `_eastport_spec.md` §九 的「拉芬 7 格 × 4 ＝ 28 張」**Ray 還沒明講要不要補** —— 別自己開工。
- 29 個地點只有一張無時段的圖（室內／洞窟／`noTime:true`），刻意的。

## 順手做掉的

- **ver -1316**：`background` 剩下的 5 張 PNG 轉 webp（12.6 MB → 1.41 MB），原檔退役。
- **ver -1318**：**9 個位元組完全相同的重複檔**回收 —— `East_*` 七張無尾綴舊檔
  （＝各自的 `_day`）、`Belisar_Exterior`（＝`_dusk`）、`Capital_Dock_midnight`
  （＝`Capital_Dock_night`）。回收後 455 格逐格重解，**沒有一格失去圖**。

## 另外兩組重複檔的定案（ver -1318，Ray）

1. ⚠⚠ **`Renna_SI_intense2.webp` ＝ `Renna_SI_lookup.webp`（位元組相同）—— 不要動。**
   `speakers.js` 兩個差分鍵指著同一張畫、連 `top/bot/fx` 都一樣。
   Ray：「不要動，免得已寫好的劇情差分迷路」——**腳本裡已經有拍子寫著 `intense2`**，
   把鍵拔掉或把檔退役，那幾拍當場找不到圖。
   ⚠ 這是**明寫的例外**，不是漏網之魚：日後巡到重複檔請跳過這一組。
   真正的 `intense2` 交件之後，直接同名覆蓋那個檔就好（⚠ 同名覆蓋要照 §5 動 `ASSET_VER`）。
2. ✔ **`config.js` 的 `partner_twin` 那一行已拿掉**（ver -1318）。Ray：「刪了，
   已經沒這事了」＝雙槍修女立繪這件事取消 —— 而它是**沒有人讀的死鑰匙**
   （全專案只有它自己那一行），`ASSETS` 又是開機預載的來源，留著只會多吃一個 404。
   ⚠⚠ **圖本身留著**（`resources/partner/Luna_SI_01.jpg`）—— Ray：「不是叫你刪圖，
     刪註解」。我一度把它回收掉，ver -1321 已 `--restore` 放回原位、驗過位元組相同。
   ⚠ 它與 `Luna_CI_saint.jpg`（聖徒化 cut-in 暫代圖）**位元組相同**，兩張都留著 ——
     這一組是**已知的重複，不要再拿它開工單**。
