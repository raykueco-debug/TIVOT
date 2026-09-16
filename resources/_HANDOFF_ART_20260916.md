# 2026-09-16 美術產線交接（接 `_HANDOFF_ART_20260904.md`）—— **四條線同時在跑，全部未完成**

> ⚠⚠ **美術與程式是兩條版本線，不要互相借號**（`HANDOFF.md` 自己就記著這一條）。
> 這一份只講美術；程式那邊的進度看 `HANDOFF.md`，**不要去改它的抬頭**。

> 交件一律只寫各自的目標夾，**原檔一張都沒動**。
> 生成的原始 PNG 在 `resources/_originals/**/*_raw.png`（**帶 `_raw` ＝未處理**）。
> ⚠⚠⚠ **`_originals` 在 `.gitignore` 裡，換機器不會跟著走** —— 要留就自己複製。

## 一、蕾娜髮飾換裝（月桂葉 → 銀製勿忘我）**Ray 指示擱置**

交件夾 `resources/SI/renna_newhair/`

```
57 張 ├ 合格 19  ├ 待修 23  └ 未跑 15
```

**未跑 15**：commandsoft meltdown meltdowncry reach run scarecute scared scarejump
shocked shockedCalm shockedopen sigh sighsweat surprised unbraid

**做法（Ray 定，不准自己改）**
1. **一組＝兩張圖**：該張原圖 ＋ `renna_newhair/_ornament_master2.png`（髮飾母版）。不准有其他做法。
2. 提示詞就一句，**不要加長**：`嚴格保持原畫風，嚴格保持髮飾設計細節，只換髮飾，alpha 背景`
3. **不要提「勿忘我」或任何花名** —— 一提名字模型就自己發揮（前七版全敗在這）。
4. session 不必每張換：**第一張對了就沿用**，出現偏差就換 session 從那張重跑。
5. 驗收：`py tools/renna_finish.py <base>`；全體：`py tools/renna_audit.py`
   門檻 **平均差 ≤6 且人物高 ≤5px**。實測合格全落 2~5.6、壞的全在 6.5 以上，中間是空的。

⚠ **Ray 還沒答的**：門檻要不要放寬到 12（23 張待修裡有 14 張落在 6~14，肉眼看不出問題）。
對照條已給過他看，他沒回。**沒答就維持 6。**

## 二、東泊街道拔鐵軌 —— day 完成，**時段差分未做**

```
✔ East_Midtown_day.webp   軌道整條移除、鋪面補成連續石板，其餘完全不動
✔ East_Square_day.webp    同上
✘ 兩格的 dawn / dusk / night 共 6 張 —— 從修好的 day 用 Gemini 重新衍生
```

⚠ `East_Oldtown`／`East_Uptown` 乾淨，不用動。`East_Dock` 那條是**起重機軌道不是街道電車**，
Ray 未表示要拔，先留著。

## 三、平原古道（新圖）—— 1 / 20

拓樸與工單：`resources/background/_plainsroad_spec.md`、`resources/map/_layout_plainsroad.png`

```
✔ Plains_Entry_day.webp   道口（驗收帶過：地表 V 126、S 25.7%）
✘ 里程碑／烽燧臺／草海／古井驛 的 day（4 張）＋ 全部 15 張時段衍生
```

⚠⚠ **水只出現在頭尾兩格**（Ray：「古道不要有水」→「第一張可以有」→「最後一張的溪谷也可以有」）：
道口與溪谷口可以有水，**中間三格一律不出現海灣／河／池／水窪**。
地形統計那 27% 的水是**整條走廊**的，不代表每格都看得到水。

## 四、NPC 立繪去背重做 —— 3 / 13

`resources/SI/NPC/` 量過 45 張，**13 張完全沒有 alpha**（全透 0.0%，整張不透明）：

```
✔ 已修  NPC_Gunsmith_SI_v1 v2 v3      （全透 0% → 57~74%）
✘ 待修  NPC_Gunsmith_SI_v4 v5
        NPC_Grocer_SI_v2 v3 v4 v5
        NPC_GuildCounter_SI_v1 v3 v4 v5
```

提示詞（§5 的短句，長篇反而容易踩內容判定）：`重繪此角色，100%保留原角色細節，alpha背景`
驗收：`py tools/npc_finish.py <base>`（全透 <15% 會拒絕入庫）

## 五、貝利薩爾古城中庭 —— 2 / 8

```
✔ Belisar_GreatCourt_day.webp        乾涸・日景
✔ Belisar_GreatCourt_flood_day.webp  積水・日景（含龍造成的破壞：高處斷裂的導水渠在灌水）
✘ 兩者的 dawn / dusk / night 共 6 張（Gemini 衍生，不吃 GPT 額度）
```

設計要點在 `_plainsroad_spec.md` §五：**封閉的下凹花園**（地面層無任何缺口／排水溝，
上方對天空敞開、飛船垂直降落），**積水來自龍打斷的上層水道**。
節點名 Ray 定為「**古城中庭**」（城深處那一格維持「下沉中庭」）。

## 六、⚠ 程式端要接的（美術不動，鐵律 11）

1. ⚠⚠⚠ **`ASSET_VER` 一定要動** —— 這一輪有 **5 個同名覆蓋**
   （`East_Midtown_day`／`East_Square_day`／`NPC_Gunsmith_SI_v1~v3`）。
   不動的話玩家端抱著舊圖，**而症狀只是「圖沒換」，查不出原因**。
2. **東泊餐飲街**要改成室外街景（`tavern` 那一格現在掛的是 `East_Bistro`＝酒吧室內，
   但它在拓樸上是四向樞紐）。**Ray 還沒答**：酒吧要不要另開一格（A 四條路／B 酒吧退場）。
   規格寫在 `resources/map/_eastport_spec.md` 末段。
3. `Plains_*` 與 `Belisar_GreatCourt*` 是**新檔**，要接進 `script/town.js` 才用得到。

## 七、⚠⚠⚠ 產線的坑（都會**靜默失敗**，下一台機器照抄）

1. **Chrome 下載同名不覆蓋**，會存成 `xxx (1).png`。腳本要取「最新的那一個」、用完刪。
2. **glob 前綴碰撞**：`gen_chase*.png` 會吃到 `chase2`。要精確比對。
3. **驗收門檻不可與處理門檻相同**：曾用「彩度 ≥0.12」清藍、又用同一門檻驗「還有沒有藍」，
   殘留的淡藍必然量不到。**驗收要用比處理更寬的門檻。**
4. ⚠⚠ **Chrome 會封鎖「多個自動下載」** —— 觸發後 `fetch` 照樣拿得到 blob、
   腳本回報 `ok:true`，但**檔案根本沒寫出來**。這一輪就是這樣停的。
   **每隔幾張要 `ls` 對一次檔案有沒有真的落地**；被擋了要在網址列放行。
5. **內建瀏覽器沒有 `file_upload`**，而 chatgpt.com 的 CSP 擋死從網路進料 ——
   上傳只能走 Claude in Chrome。這不是作業系統差異，換 Mac 一樣。
6. `javascript_tool` 的等待迴圈**不要超過 40 秒**（CDP 45 秒逾時）。
7. ⚠ **排程任務要先按一次「Run now」把工具授權吃掉**，否則它會準時觸發、然後整夜停在
   權限提示上什麼都沒做（這一輪真的發生過，浪費一晚）。

## 八、⚠ 未追蹤的檔案（**不是美術 session 產的**）

`resources/SI/` 底下有一批 Ray 自己放的 PNG（`Anya_SI_*`／`Renna_SI_lookfaropen`／
`reachcry`／`scream`／`Sorana_SI_battlecry`／`Torsten_SI_Q`／`sorana_SI_Q`／
`gen_Renna_SI_blushed`）與 `resources/illustration/018*_rennafantasy.png`。

⚠ Ray 交代過「**PNG 不要再放 SI 資料夾**」—— 這些應該轉 webp、原 PNG 進 `_originals`。
**這一輪為了換機器不掉檔，先原樣 commit 進版控**（掉了就沒了，位置不對還救得回來）。

---

