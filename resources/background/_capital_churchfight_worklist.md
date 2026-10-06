# 帝都：教廷衛士戰的戰鬥背景（10-05 晚開單，Ray 交辦）

> Ray：「旅店 上街區 攝政王廣場 舊街區 碼頭都會與教廷衛士發生戰鬥 一次都是一群」
> 「戰鬥時間是深夜 路上沒人 只是我覺得體量跟角度都不適合 旅店太小 上街區太窄 廣場太大 舊街區還行 碼頭根本沒地站」
> → 旅店＝**大廳（室內）**；舊街區**照另外四張的取景重畫**。

## 規格（五張共通）
- 深夜、無人、**單張**（不做時段差分 ⇒ 程式端 `noTime:true`）。
- 中景、接近平視；畫面中段留 10~25 m 深的空地，站得下 3~5 人的群體敵人。
- 建築以該地點現有背景為參考（地點認得出來），構圖重做。
- 銀藍月光；朝向不明 ⇒ 不畫月亮本體（§5）。
- 產法：GPT 一張 → 有顆粒才過 Gemini（§5 場景分工）。
- 1536×1024 WebP，交件 `resources/background/capital/capital_<地點>_battle.webp`。

## 盤點
| 地點 | 參考 | 取景 | 狀態 |
|---|---|---|---|
| 攝政王廣場 | `capital_square_midnight` | 廣場一角：雕像基座＋路燈當前景，對面建築拉近 | ✔ 已出（待 Ray 驗收） |
| 旅店大廳 | `capital_hotel_night` | 家具推開、大廳中央空出 | ✔ 已出（待 Ray 驗收） |
| 上街區 | `capital_uptown_midnight` | 最寬的一段／十字路口 | ✔ 已出（待 Ray 驗收） |
| 舊街區 | `capital_downtown_midnight` | 同上規格重畫 | ✔ 已出（待 Ray 驗收） |
| 碼頭 | `capital_dock_night` | 倉庫前的寬石砌碼頭，水面只在後方 | ✔ 已出（待 Ray 驗收） |

交件（10-05 晚）：`resources/background/capital/capital_{hotel,uptown,square,downtown,dock}_battle.webp`，原 PNG 在 `resources/_originals/background/capital/_battle_wip/`。
天空 100% 看過無顆粒 ⇒ 沒過 Gemini。⚠ 新檔名、不是同名覆蓋 ⇒ 不必動 `ASSET_VER`；單張 ⇒ 節點／戰鬥卡要 `noTime:true`。

## 群體敵人（10-05 晚開工，一張一張給 Ray 檢查）
- 人數：**旅店最少（3）**；上街區／廣場／舊街區居中；**碼頭改成 Boss 戰，群體圖暫時不管**（Ray）。
- 規格（Ray 退稿歸納）：三人以上**全部著地**（不要跳起懸空）、**視線統一直視觀看者**、
  **平視透視正確**（後排明顯變小、腳位較高、頭頂約在同一水平線）、不貼邊、真 alpha。
- 旅店：A（前）＋B、D（後）拔刀衝鋒 —— 修透視中。

### ⚠⚠ 10-05 晚 Ray 改定：**背景與人一起生成整張戰鬥插圖**（取代上面「群體圖疊背景」）
> Ray：「就算透視對了拼貼感還是很重」「雜兵先去識別化，加上頭盔之類的把頭髮大部遮住，要有軍隊的一體感」
> 「走我的原案，把背景跟人一起給 gpt 生，這樣至少透視跟張力是正確的，只是要注意所有人視線都要看 viewer」
> 「一張一張來，碼頭留空給我」
- 衛兵＝**去識別化的雜兵**：統一黑色頭盔遮住大部分頭髮、制服裝備一致（a~f 那六張個人立繪不用在這裡）。
- 每張：該地點的戰鬥背景當場景參考 ＋ `church_guard_si_a` 當制服參考；**全員直視觀看者**；主要人物放畫面正中央（遊戲上半近正方形 cover 置中，左右會被裁）。
- 送圖前自檢：模擬 390×422 cover 置中的取景看過再給 Ray。
- 狀態：旅店 ⚠ 生成中（10-05 20:55 撞到 GPT Go 圖像上限，22:55 重置）；上街區／廣場／舊街區 ⚠ 欠；碼頭 ⛔ 留空（Ray 自己處理，改 Boss 戰）。
- ⚠ 程式端：整張插圖＝**一個敵人**。現行對人類敵人的效果只有「命中整張閃白縮一下／連戰換人整張掠過／接地陰影」，**沒有倒下、也沒有個別淡出**（Ray 確認本來就沒這設計）。
  插圖放敵人層（命中會連背景一起閃）或背景層（命中無反應）由程式端決定；接地陰影對整張插圖應關掉。

### 10-06 美術：廣場、舊街區出圖（待 Ray 驗收）
- 廣場 `_battle_wip/capital_square_fight_v2.png`：4 衛兵＋指揮官（中央，金鍊與胸章區分）。ChatGPT 串 `https://chatgpt.com/c/6ac4f10e-d240-83ee-a2dc-56a783ba3b5b`
- 舊街區 `_battle_wip/capital_downtown_fight_v2.png`：4 衛兵。串 `https://chatgpt.com/c/6ac4f142-00a4-83e8-8033-8d3d3d813c52`
- 參考：該地點 `capital_*_battle.png`（場景）＋ `capital_uptown_fight_v3.png`（制服畫風）。
- v1 兩側射手在遊戲裁切下被切掉 → v2 要求「全員收進中央 55% 寬」，裁切自檢 `_sq_dt_v2_review.jpg`。
- ✅ 10-06 Ray：「可以，統一大小，交件」→ 旅店、上街區照廣場的人物大小重出（前排頭盔頂到腳底約佔畫面高 60~65%，全員在中央 55% 寬內）：
  · 旅店 `capital_hotel_fight_v5.png`（串 `https://chatgpt.com/c/6ac4f3b2-6ed4-83ee-803f-fe9a50289e76`；舊串 `6ac4f2e5…` 生圖錯誤兩次棄用）
  · 上街區 `capital_uptown_fight_v5.png`（串 `https://chatgpt.com/c/6ac4f2e8-ff70-83ee-aef6-49b2c69496a8`；v4 縮過頭 → v5 放大）。右射手貼邊的問題一併解決。
- **交件**：`resources/background/capital/capital_{hotel,uptown,square,downtown}_fight.webp`（1536×1024，新檔名不是同名覆蓋）。四張並排自檢 `_battle_wip/_four_review2.jpg`。

### ⚠ 程式端要接（鐵律 11，美術不碰）
- 四場戰鬥的上半改用 `capital_<地點>_fight.webp`（整張插圖＝一個敵人）；放敵人層或背景層由程式定，整張插圖要關接地陰影。單張 ⇒ `noTime:true`。
- 碼頭仍留空（Ray 改 Boss 戰）。

### ⚠ 美術還欠
- 分繪：去人背景 plate（旅店的舊 plate 是 v3 構圖，**已不對應 v5，要重出**）＋ 人物單獨去背疊層，四場都欠 —— 要不要做等 Ray（給個別中彈動畫用）。

## （舊）群體敵人構想
教廷衛兵 a~f（`resources/_originals/SI/NPC/_vela_v2/church_guard_si_*.png`）組成 3~5 人群體圖（拔刀／射擊／遠處奔來），最後一場最多人。

## 程式端要接的（交件後，鐵律 11：美術不碰）
戰鬥卡／敵人卡（`kind:'human'`）、五格的 `acts`、戰鬥背景指向上表檔名。
