# 網頁版「離線下載」為什麼沒變快、怎麼改成真正的離線版（2026-11-27，行銷副專調查）

> Ray：「網頁版當初我弄了個下載鈕，但是載下來覺得沒有變快，而且載下來以後應該要自動變成離線版」（在 iPhone 上測）。
> 本文件只查原因、寫改法；程式改動交 PM 派工（`sw.js`／`offline.js` 歸劇情副理）。

## 一、原因（實測證明）

### 1. ⚠⚠⚠ 主因：Service Worker 是「網路優先」，下載的東西只有斷網才會用到
`sw.js` 的 fetch 處理是：**每個請求先打網路**，網路失敗才回快取（`try{ fetch(req) }catch{ fromCache }`）。
⇒ 有網路時，下載過的 1.5 GB **一個位元組都不會被讀**，速度跟沒下載一模一樣；而且每次抓完還會再存一次快取（多寫一遍）。

實測（`tivot-demo.pages.dev`，11-27）：先把 `tivot_emblem.webp` 放進 `tivot-offline-v1` 快取，再由頁面請求同一支 ——
頁面受 SW 控制、快取裡確實有，**回應卻帶著 `cf-ray: …-TPE`**（＝從 Cloudflare 台北機房抓的，不是本機快取）。

### 2. 下載完不會「變成離線版」：SW 不知道下載完了
完成旗標寫在 `localStorage`（`tivot_offline_done_v1`），**Service Worker 讀不到 localStorage**，所以策略永遠不會切換。

### 3. 更新時，改過內容的素材不會重抓（之後會變成「舊圖」）
快取鑰匙把 `?v=` 拿掉了，而更新只重抓「程式類」小檔（js/html/css/json），素材「已經在快取就跳過」。
素材常是**同名覆蓋**（`bust.py` 用 `?v=<內容雜湊>` 區分）—— 一旦改成快取優先，玩家會一直看到舊版素材。

### 4. Cloudflare Pages 對不存在的檔回「200 ＋首頁 HTML」，缺檔被當成成功
實測 `https://tivot-demo.pages.dev/resources/no_such_file.webp` → `200 text/html`（首頁）。
離線下載把那份 HTML 存成素材、遊戲拿 HTML 當圖解碼失敗 —— **都沒有錯誤訊息**。
✔ 已修（打包端，行銷副專）：`build_demo.mjs` 會在輸出放一支 `404.html`，下次部署起缺檔回真的 404。

### 5. manifest 的圖示路徑大小寫錯（Android「安裝」沒有圖示）
`manifest.webmanifest` 寫 `resources/background/TIVOT_Emblem.png`，實際檔名是 `tivot_emblem.png`（ver -1554 全面小寫化）。
Windows 不分大小寫所以本機看不出來；Cloudflare 分 ⇒ 圖示 404。iPhone 走 `apple-touch-icon`（`index.html` 那行是對的），不受影響。

## 二、iPhone（iOS Safari）的限制

| 項目 | 結論 | 出處 |
|---|---|---|
| **Safari 分頁 vs「加到主畫面」** | **兩邊的儲存空間分開**。在 Safari 分頁按下載，主畫面那個圖示打開時**沒有**那份快取，反之亦然。⇒ **要在「加到主畫面」打開的那個 App 裡按下載** | WebKit Bug 181849、`offline.js` 檔頭註解 |
| 容量上限 | iOS 17 起每個網站約可用**裝置總容量的 60%**，主畫面 App 與 Safari 同一套上限；試玩包 0.6 GB／整包 1.5 GB 都在範圍內 | WebKit〈Updates to Storage Policy〉、MDN |
| 會不會被清掉 | **Safari 分頁**：7 天沒用會清（ITP）。**主畫面 App**：不吃 Safari 的 7 天規則，有自己的使用天數計算；但**手機空間不足時**仍可能被系統整批清掉。`navigator.storage.persist()` 在 iOS 是依情況給（主畫面 App 比較容易拿到），**不保證** | WebKit 同上；Apple 開發者論壇 710157；WebKit Bug 232302（有人回報主畫面 App 7 天後被清） |
| 大量寫入中途失敗 | 18,600 個檔一個個 `cache.put`：**鎖螢幕／切到別的 App 會凍住頁面**，下載就停；重按可續傳（已有的跳過）。顯示「完成」的前提是 0 個失敗，邏輯本身是對的 | `offline.js` |
| 顯示完成但其實沒了 | **會發生**：完成旗標在 localStorage、檔案在 Cache Storage，兩者可以被分開清掉 ⇒ 鈕顯示「✓ 已可離線」但快取已空 | 程式判讀 |

### ⇒ iPhone「加到主畫面」能不能真正離線？
**能，但要先把第一節的 1～3 改掉，而且有兩個前提：**
1. 玩家要在**主畫面 App 裡**按下載（不是在 Safari 分頁）—— 入口頁與按鈕文案要講清楚。
2. 手機空間吃緊或很久沒開時，iOS 仍可能清掉；所以**每次開啟要自我檢查**，缺了就提示重新下載，不能只信旗標。
試玩用 0.6 GB 的試玩包，比 1.5 GB 整包穩很多（下載時間短、被清的機率低）。

## 三、改法（交接 → 劇情副理：`sw.js`／`offline.js`）

1. **離線模式旗標放 SW 讀得到的地方**：下載完成時，在 `tivot-offline-v1` 快取裡寫一筆 `__offline_ready__`（內容＝版本號），或用 IndexedDB／`postMessage` 通知 SW。localStorage 那個旗標只留給按鈕文字用。
2. **SW 依旗標切策略**：
   - **未下載**：維持現在的網路優先（不變）。
   - **已下載（離線版）**：**快取優先**——快取有就直接回本機、**不打網路**；快取沒有才打網路（並存起來）。影音的 Range 請求照現有那段切片回 206。
   - 首頁與程式也走快取優先（版本一致：程式與素材同一個版本才不會對不上）。
3. **更新檢查**：離線版開啟時，背景抓一次 `offline_list.json`（網路有就抓、沒有就算了），版本號比 `__offline_ready__` 新 ⇒ 在首頁顯示「有新版本，更新？」；按下去才重下載，**只下載變了的檔**。
4. **清單要帶每支檔的版本**：`offline_list.json` 每一項加內容雜湊（或 `?v=` 那段），更新時「雜湊不同就重抓」，不要只靠「程式類一律重抓、素材有就跳過」（第一節第 3 點）。`tools/offline_list.py` 一起改（該支歸誰請 PM 定）。
5. **開啟時自我檢查**：離線版每次開啟抽查幾支關鍵檔（index.html、main.js、首頁那幾張）＋快取筆數；不對就把旗標清掉、退回網路優先，按鈕回到「離線下載」。
6. **存之前檢查內容型別**：`run()` 裡 `res.ok` 之外再看 `Content-Type`，HTML 不准存成 `.webp/.m4a/...`（雙重保險，第一節第 4 點）。
7. **按鈕文案**（iPhone）：在 Safari 分頁（非 standalone）時提示「請先『加到主畫面』，從主畫面打開再下載」；standalone 才給下載。判斷用 `navigator.standalone` ／ `matchMedia('(display-mode: standalone)')`。
8. **manifest 圖示路徑改成小寫** `resources/background/tivot_emblem.png`（第一節第 5 點）。
9. 試玩版的下載清單用**試玩包**（`dist/demo` 那份，約 0.6 GB），不是整包。⚠ 目前 `offline_list.json` 是整包；試玩建置時要換成試玩清單（打包端可以在 `build_demo.mjs` 產出時改寫 `dist/demo/offline_list.json`，由行銷副專做）。

## 來源（2026-11-27 查）
- [WebKit：Updates to Storage Policy](https://webkit.org/?p=14403)
- [MDN：Storage quotas and eviction criteria](https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [WebKit Bug 181849：主畫面 App 與 Safari 不共用儲存](https://bugs.webkit.org/show_bug.cgi?id=181849)
- [WebKit Bug 232302：主畫面 App 的 SW 與儲存 7 天後被刪](https://bugs.webkit.org/show_bug.cgi?id=232302)
- [Apple 開發者論壇：PWA 資料保留超過 7 天](https://developer.apple.com/forums/thread/710157)
- [firt.dev：iOS PWA 相容性](https://firt.dev/notes/pwa-ios/)
