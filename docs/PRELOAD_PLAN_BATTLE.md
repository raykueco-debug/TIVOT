# 戰鬥預載計畫（草案，ver -3063，2026-11-26）—— 給 Ray 審，**未實作**

> 起因：行銷副專實測「打完了才出怪」。Ray：「做出一個預載計畫出來，每一次場景切換都有跑預載，
> 戰鬥開始前的對話的時候就該跑完。應該在戰鬥前的劇情先插好預載的起點終點。」
> 狀態：**盤點做了一半、實測只量了一場**（額度用盡中斷）。下面標 ⏳ 的是還沒做的。

## 一、現況盤點（讀程式碼得出）

| 進戰路徑 | 什麼時候開始載這場的怪 | 載什麼 | 問題 |
|---|---|---|---|
| **劇情／城鎮插入戰**（腳本 `{battle}`，`story.setBattleHandler`） | **門開到縫那一刻**才 `startScriptBattle → setEnemy` | 立繪、待機動檔、攻擊動檔全部從這一刻才抓 | ⚠⚠ **完全沒經過 `enterBattleAssets`**（那道門只有飛行交棒與 `launchBattle` 在叫）——**這就是「打完才出怪」的主因** |
| 城鎮地圖（遭遇戰／城鎮戰） | 讀取頁收掉後 `town.warmEnemies` 背景暖 | **只暖敵人卡的靜態立繪**（`enemyImgsOf`） | 待機／攻擊動檔、群戰成員、戰鬥音訊都沒暖 |
| 飛行交棒（`flightBridge`） | 交棒那一刻 `enterBattleAssets` | 音訊＋立繪＋群戰成員動檔（`warmBattleImage`） | 單隻怪的待機／攻擊動檔沒暖；起點太晚（撞上才開始） |
| `launchBattle`（教學／挑戰） | 按下去那一刻 `enterBattleAssets` | 同上 | 同上；櫻花過場約 1 秒是唯一緩衝 |
| RUSH | 讀取頁 `loadScene` | 音訊＋第一場背景 | 怪的圖與動檔沒進讀取頁 |
| 群戰／連戰下一隻 | `setEnemy` 那一刻 | — | ⏳ 未盤 |

**收集「這場要什麼」目前散在四處**：`main.battleAudioSet`（音訊）、`combat.warmBattleImage`（立繪＋群戰）、
`enemy.preloadActionClips`／`preloadDodge`／`preloadGroupCard`（動檔，只在 `setEnemy` 之後才叫）、`town.enemyImgsOf`（靜態立繪）。

## 二、實測（慢網模擬：素材限速 200 KB/s、RTT 300 ms、並發 6；程式檔不限速）

量法：`tools` 外的臨時限速代理（scratchpad）＋內建瀏覽器前景分頁，從 `startScriptBattle` 起算（＝現行劇情戰「門開到縫」那一刻）。

| 場次 | 立繪出現 | 這場的素材全部到齊 | 抓了 | 其中動檔 |
|---|---:|---:|---:|---:|
| `np_claws`（黑爪） | **3.6 s** | **33.5 s** | 115 檔／6.5 MB | 4.8 MB |

⇒ 慢網下光是黑爪就要 **30 秒以上**才把待機／攻擊動檔抓完；門開完只有一兩秒。動畫在開打之後很久才接上，
連戰／群戰會更嚴重。⏳ 其餘八場（含群戰、飛行交棒）還沒量。

## 三、設計

1. **收集只准一支**（鐵律 7／8）：新增 `enemy.battleManifest(battleId, look) → {imgs, clips, audio, bg}`，
   把上面四處合併（音訊那一段搬過來或由它呼叫 `battleAudioSet`）。`enterBattleAssets`、`town.warmEnemies`、RUSH 讀取頁一律改問它。
2. **預載起點**（資料驅動，鐵律 1）：
   - 腳本拍上 `preload:'<battleId>'`：演到那一拍就在背景開始抓（`story` 只傳 id，由 main 注入的 hook 呼叫 manifest）。
   - 沒有前置對話的路徑：城鎮＝進地圖時（`loadSpec.warm` 改成暖 manifest，遭遇池全部或依機率前幾名）；
     飛行＝**敵人進入追擊／可視距離時**（不是撞上時）；教學／挑戰＝首頁按下去時（現狀）。
3. **預載終點**＝`{battle}` 那一拍：manifest 還沒到齊就**在推棺／開棺那一刻等**（門停在撞頂、顯示轉圈），
   到齊才開門；設上限（例如 8 秒）後放行並記一筆 console，**不准開打後才出怪**。
   動檔「到齊」的判準＝待機那一支必到，攻擊／延時可在第一次用到前補（`playActionClip` 沒載到時已會退回）。
4. **與鐵律 13 不衝突**：戰鬥屬於當前場景，預載的是「即將進入的那一場」；換地圖過門時 `passGate` 一併釋放
   （manifest 抓的東西登記在同一張表，`releaseAudio`＋動檔快取清掉）。
   記憶體（鐵律 12）：一次只預載**一場**（新的起點覆蓋舊的），城鎮遭遇池只暖待機不暖攻擊，避免把整池動檔解碼進記憶體。

## 四、腳本要插起點的位置（⏳ 待劇情副理逐場標拍號）

試玩主戰候選：`guild_hunter`、`cap_dream`（faceless，推棺）、`np_claws`、`np_cemetery`、`np_nightmare`、
`np_harm`／`np_boss`（城鎮戰，走進地圖起點）、`man_sorana`（lake_deck）、開場訓練戰；
飛行：`flight_centipede`／`flight_pirate`／`flight_serpent`／`valse_pirate`（走可視距離起點）。
原則：插在 `{battle}` **前面至少 15～30 秒的閱讀量**（慢網 200 KB/s 約可抓 3～6 MB）。

## 五、分工（Ray 點頭後）

- 效能副理：`battleManifest`、`enterBattleAssets` 收斂、開棺等待閘、飛行可視距離起點、實測其餘八場。
- 劇情副理：在各場前插 `preload:` 拍、`script_lint.py` 加「`{battle}` 之前沒有 preload 起點」提醒。
