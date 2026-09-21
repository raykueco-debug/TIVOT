# 場景盤點 — 2026-09-21（美術 session）

> 照 §0.1（ver -1543）：**不欠的也要註記不欠，而且要寫為什麼。**
> 判準的兩邊都有出處：**磁碟上有什麼**（`find` 量的）＋**規格說要什麼**
> （`script/town.js` 的節點 `bg` / 各 spec / `tools/script_lint.py`）。

## 一、結論先講

| | |
|---|---|
| `script/town.js` 的節點背景 | **227 個 bg 基底、0 個找不到檔案** —— 一格都不欠 |
| 磁碟上的背景檔 | 716 張（`resources/background/` 含 16 個子資料夾） |
| **真的欠的場景** | **1 張**：`Varn_Church`（拉芬斯達爾／雪都 大教堂） |
| 真的欠的怪圖 | **1 張**：`mon_dragon_front.webp`（王座徘徊者・空中戰第三型態，白底 raw 也不在庫裡） |

## 二、⚠ 欠的（兩筆，都不是「畫了就好」）

### 1. `Varn_Church` —— 拉芬斯達爾（雪都）大教堂
- **卡在 Ray，不是卡在美術**：`script/town.js:4784` 與 `_ravnsdal_spec.md` §三 都寫著
  「宗教建築的**形制是世界觀的事，Ray 還沒給方向**」。
- 現況：那一格的 `bg` **暫時指中心區**（`varn_midtown`）—— 刻意的，因為候選鏈全載不到時
  `bgFor` 會「照樣放行」，畫面會**停在前一格**，從不同方向走進來會看到不同的背景。
- `tools/script_lint.py` 自己會報這一條（不必人記）。
- ⇒ **要動之前先問 Ray 要什麼形制。**

### 2. `resources/enemy/mon_dragon_front.webp`
- `script/enemies.js` 的 `bl_dragon_front`（空中戰打到 50% 換的那一張卡）指著它，
  **檔案不存在** ⇒ 那一格現在是**空的立繪**（不會壞，但看得出來）。
- 註解說美術 -1418 交的是白底 raw `_originals/enemy/mon_dragon_v1_flight_raw.png`
  —— ⚠ **那個檔現在也不在**（`_originals/enemy/` 裡只有 throne×3、v1/v2/v3 各三張）。
- ⇒ **要重出一張**，而且照 §5 的飛行怪規格（-1440/-1442）：正面迎面、透視正確、
  四邊各留 12% 空白、真 alpha。

## 三、✔ 不欠的（寫出理由，免得下一個人重報）

| 項 | 狀態 | 為什麼看起來像缺 |
|---|---|---|
| **卡耶爾山谷 5 格**（`canyon_*`） | ✔ 不欠 | **刻意的三差分**（day/dusk/night，沒有 dawn）。ver -1542 我拿「室外＝四差分」當預設誤報過一次，Ray 當場擋下 |
| **夏爾森林 9 格**（`forest_*`） | ✔ 不欠 | 同上，刻意三差分 |
| **各城的店舖單張**（槍店／公會／雜貨／咖啡…） | ✔ 不欠 | 營業時間 `[8,17]`，照 §5（ver -1378）**只要 day 一張是規格**，不是少交 |
| `_shinier_worklist.md` 說「缺 21 張」 | ✔ 不欠 | **那份工單是過期的**（憲法 §0.1 明載：「說缺 13 張 Dawn，實際 0 張缺」）。磁碟實測夏爾村全部有檔 |
| **拉芬斯達爾 16 格 / 東方泊地 16 格** | ✔ 不欠 | 兩座城的節點 bg 全部找得到（前綴分別是 `varn_` 與 `east_`，不是資料夾名） |
| `resources/background/tomb_gate_day.webp`（lint 報缺） | ✔ 不欠 | **誤報**：檔案在 `background/tomb/` 子資料夾裡，而且那一行只是註解在引用它當構造參考 |
| `holysee/` 3 張、`deck/` 2 張 沒有城鎮節點在用 | ✔ 不欠 | 聖王廳是飛行地圖的城（走 `flight/city/`）、甲板是劇情場景（`mainScript.js` 在用），本來就不是城鎮節點 |

## 四、🟡 未定（不是缺，是 Ray 還沒說要不要做）

- `_eastport_spec.md` §九 的「**拉芬 7 格 × 4 ＝ 28 張**」——
  `_capital_gaps_worklist.md` 已註明「**Ray 還沒明講要不要補，別自己開工**」。
  ⚠ 那 7 格多半就是上面那條「營業時間 [8,17] 只要 day」的店舖，照 -1378 **本來就不必補**。

## 五、可回收（多交的，照 §5 ver -1378）

營業到 17 點以前、卻交了 3~5 張時段差分的 **7 格**（留著會讓下一個人以為那一格是四差分）：

```
capital_cityhall   [8,17]  dawn+day+dusk+night+midnight
captal_guild       [8,17]  dawn+day+dusk
capital_grocerie   [8,17]  dawn+day+dusk
shinier_grocery    [8,17]  dawn+day+dusk+night
east_firearm       [8,17]  dawn+day+dusk+night
east_guild         [8,17]  dawn+day+dusk+night
east_grocerie      [8,17]  dawn+day+dusk+night
```

⚠ **我沒有回收** —— 回收是刪除動作（§5 的回收區），而「這幾格的 `hours` 是不是就是
這一組」是資料端的事（鐵律 11）。**要回收請 Ray 說一聲**，我再走 `tools/recycle.sh`。
