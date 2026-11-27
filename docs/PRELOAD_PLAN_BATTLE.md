# 戰鬥預載計畫（ver -3063 草案 → **ver -3083 第一版實作已推上**）

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

## 六、實作交接（ver -3083，2026-11-27，換機器前收尾）

**已做、已推（Ray：「照預載計畫做」）**

| 件 | 在哪 |
|---|---|
| 收集「這一場要什麼」只剩一支 | `enemy.preloadBattleCard(en)`：立繪／群戰逐人／待機動檔＝要等的；攻擊／延時／點錯／出場／倒地／閃避／NI 換圖／分離怪＝背景抓。`combat.warmBattleImage` 改成只是呼叫它（隨機名單先 `peekBattleEnemy` 抽好），並回傳 Promise |
| 預載與開打共用快取 | `loadClip` 改回傳 Promise；`startIdleLoop` 改走 `loadClip`（預載過就直接命中）。閉棺 `releaseBattleMemory` 一併放掉（`warmImgs`） |
| 劇情／城鎮插入戰過戰鬥那道門 | `setBattleHandler` 開頭補 `enterBattleAssets(battleId)` |
| 起點：劇情 | `story.lookAheadBattle()`：每一拍往後掃到這一段的下一個 `{battle}`（掃不到看下一幕、遇 `load` 停）；拍上 `preload:'<id>'` 可更早起跑 |
| 起點：城鎮 | `town.preloadNodeBattle(to)`：按住方向往那一格走時起跑（那一格的段落戰鬥／bgComp 群戰／固定怪）；野怪**先抽好下一隻**（`wildNext`），抵達中了就用牠 |
| 起點：飛行 | `spawnEnemy` 一生出怪就叫父頁 `__tivotFlight.preloadBattle` |
| 終點：開棺等 | 劇情／城鎮：`{battle}` 那一拍開棺前等 `battleReady`（main），上限 `BATTLE_GATE_MAX_MS` 8 秒、逾時放行記 console；等候中點擊無效、超過半秒亮小讀取圈（`body.battle-loading`，style.css）。飛行交棒：門停在頂上等同一支 |

**驗過的**：五支模組與飛行頁內嵌 script 的 `node --check`（.mjs 模式）、`script_lint.py`（39 個錯誤都是既有的大寫檔名，與本次無關）、
一般速度實開一場：兩句對白＋`{battle:'np_claws'}` 的臨時段落 —— 對白期間黑爪的 57 個檔已經抓進來，開棺後待機在動，沒有任何錯誤。

**還沒做（下一位接）**

1. ⚠⚠ **九場慢網前後對照數字還沒量完**。目前只有：`np_claws` **改前**（限速 200 KB/s、RTT 300 ms）立繪 3.6 秒、全部素材 33.5 秒、6.5 MB。
   - 量法踩到的坑：① **同一頁重跑量不到冷啟動**（`releaseBattleMemory` 之後 Blink 的圖片記憶體快取還在）—— 要「一頁跑九場的前、重載一頁跑九場的後」；
     ② `performance` 的 resource buffer 預設 250 筆，要先 `setResourceTimingBufferSize`；③ 8127 埠會被別的 devserver 搶（量到沒限速的數字），代理換到 8193；
     ④ javascript_tool 45 秒逾時，跑測試要丟背景、結果存在 `window` 再輪詢。
   - 限速代理是 scratchpad 的 `slowproxy.py`（素材限速＋no-store、程式檔不限速、並發 6），換機器要重寫一份（四十行）。
   - 各場可藏讀取的時間（戰前對白估計）：man_sorana 約 24 秒、np_claws 約 23 秒、np_nightmare 約 24 秒、np_cemetery 約 17 秒、cap_dream 約 8 秒；
     np_harm／np_boss（城鎮戰格）與野怪只有「按住方向 0.5 秒＋切景」—— 這幾場主要靠開棺等待。
2. 群戰／連戰下一隻（同一張卡換怪）沒有起點。
3. 城鎮戰格（np_harm 那幾格）起點太短：可考慮抵達一格時預載「相鄰各格中最可能的那一場」，但要先量記憶體（鐵律 12）。
4. 腳本端 `preload:` 目前**沒有任何一拍用到**（自動起點已涵蓋試玩的劇情戰）。劇情副理那邊不必動；要更早起跑時再插。
