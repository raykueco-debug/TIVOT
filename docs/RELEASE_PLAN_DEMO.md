# 試玩版釋出方案（給 Ray 拍板）

> 行銷副專，2026-11-25。範圍：**試玩版**的網頁版、Android、iOS 三條線，外加 Ray 當天補充的
> 「**Steam 是前期主力，但這是手遊；Steam 版送手機版**」對整體架構的影響。
> 平台條件都在 2026-11-25 查過，來源附在文末。容量數字是當天重跑 `node tools/release/demo_size.mjs`
> 量的（版本 ver -3022）。
> ⚠ 本文件只定方向，**沒有改任何遊戲程式**；要改程式的地方都寫在第七節的交接裡。

---

## 〇、已拍板（2026-11-25）

- ✔ **試玩三種玩法（11-26，Ray：「照這樣做」）**：網頁版（Cloudflare Pages，已上 `tivot-demo.pages.dev`）／Android APK 側載（入口頁＋下載放 **itch.io**）／iOS 先用網頁版「加到主畫面」，TestFlight 待 Ray 決定 Apple 帳號。網頁版要**固定直式比例**（寬螢幕左右留黑邊），已交 PM 派工。
  · ⚠ APK 不能放 Cloudflare Pages（單檔 25 MiB 上限，試玩 APK 約 0.5 GB）；R2 開了之後也可放 R2，但 itch.io 免費、有現成的下載頁。
  · ⚠ Google 安卓開發者驗證：2026-09-30 在巴西／印尼／新加坡／泰國生效（未驗證的 App 側載要走 24 小時的進階流程），2027 全球 —— 正式版前要辦。
- ✔ **網頁版用 Cloudflare**（Ray：「用 Cloudflare」）：程式放 **Pages**、素材放 **R2**。

### ⚠ 修正第四節：素材要走 R2 自訂網域，**不要**用 Pages Functions 代理
- 第四節原本說「Pages 路由把 `/resources/*` 代理到 R2 最省事」—— **查證後推翻**：Pages Functions 每次呼叫都算進 Workers 免費額度
  **每天 10 萬次**（UTC 午夜重置），試玩一個玩家一輪約 6,000 個請求 ⇒ **一天約 16 個人就爆**；靜態檔才不計次。
- 正解：R2 bucket 掛**自訂網域**（例 `assets.<網域>`，有自訂網域才吃得到 Cloudflare 快取），設 CORS 只允許遊戲網域 GET；
  遊戲程式的素材網址加一個**素材根網址**（開發機＝空字串＝相對路徑照舊，上線＝`https://assets.<網域>/`）。
  ⇒ 這是程式改動，交 PM 派劇情副理（主頁 `index.html`／`modules/*`）＋地圖副理（`flight/index.html` 的 `fav()`／自組路徑）；
  單一真相（鐵律 7）：素材根網址只准在 `config.js` 一處，飛行頁照 §6.10 跨頁慣例讀同一份。

### Ray 要做的（照順序）
1. 申請 Cloudflare 帳號（免費）。
2. 買遊戲網域（Cloudflare Registrar 可直接買，約 US$10/年；名字由 Ray 定）。
3. 開 R2（要綁付款方式，免費額度內不扣款）。
4. 做完跟行銷副專說 —— 之後建 Pages 專案、R2 bucket、自訂網域、CORS 由我照步驟帶（帳號密碼與付款 Ray 自己輸入）。

來源：[Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing)、[R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)、[R2 CORS](https://developers.cloudflare.com/r2/buckets/cors)、[R2 cache](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/)（2026-11-25 查）。

## 一、一句話結論（建議方案）

| 線 | 放哪 | 費用 | 誰要動手 |
|---|---|---|---|
| **網頁試玩** | 程式放 **Cloudflare Pages**，素材放 **Cloudflare R2**，掛同一個網域 | **0 元**（素材 10 GB 以內） | Ray 申請 Cloudflare 帳號 |
| **Android 試玩** | **itch.io** 當入口頁（APK 下載＋網頁版連結）；之後再加 **Google Play** | itch 0 元；Play 一次 **US$25** | Ray 開 itch 帳號；Play 要不要付等決定 |
| **iOS 試玩** | **TestFlight 公開連結**（最多 1 萬人、每個版本 90 天到期） | **US$99／年** | Ray 有沒有 Apple 開發者帳號；在 M2 MacBook 打包 |
| **Steam（正式版主力）** | Electron 包殼 | Steam Direct 每款 US$100（另案） | 另案，不在試玩範圍 |

**整體架構：一份遊戲程式、三個外殼**（瀏覽器／Capacitor 手機殼／Electron 桌機殼），
素材分成「**試玩層**」和「**正式層**」兩包。試玩版只帶試玩層。
這個切法同時是「Steam 送手機版」的前提（第六節）。

---

## 二、要 Ray 決定的事（只有他能做的標 ★）

| # | 要決定什麼 | 建議 | 為什麼要先定 |
|---|---|---|---|
| 1 | **上架名義**：個人或 AL Works | 試玩先用**個人**；正式上架前再決定要不要轉公司 | Apple 用公司名義要 **D-U-N-S 編號**（免費但要等約 5 個工作天），Google 用公司帳號可免 12 人封閉測試。名義一旦用了，之後換主體很麻煩 |
| 2 | ★ **Cloudflare 帳號** | Ray 申請（免費方案即可） | 網頁版放這裡；R2 開通要綁付款方式（用量在免費額度內不會扣款） |
| 3 | ★ **網域** | 買一個遊戲網域（約 US$10/年），網頁版、素材、itch 頁都掛它 | R2 素材要用自己的網域才能吃 Cloudflare 快取；也是之後 Steam 帳號連動的登入頁 |
| 4 | ★ **itch.io 帳號** | Ray 申請（免費） | Android APK 的下載入口 |
| 5 | ★ **Google Play 要不要付 US$25** | 先不急；itch 先放 APK | **個人帳號**要先跑「12 人連續 14 天封閉測試」才能開公開／正式上架，至少多兩週；試玩期可以只用 itch |
| 6 | ★ **Apple 開發者帳號有沒有** | 沒有就要申請（US$99/年） | iOS 沒有其他合法的公開發佈管道 |
| 7 | **試玩版是獨立一支 App，還是正式版 App 裡的「免費試玩＋解鎖」** | **同一支 App**（試玩免費，買斷解鎖正式層） | 見第六節：Steam 送手機版要靠「同一支 App 認帳號解鎖」；兩支 App 的話正式版上架時試玩那支的評論、下載數全部歸零 |
| 8 | ★ **賽西莉失誤語音重做** | 用 ElevenLabs **付費**帳號重生 `vo_cecilie_miss1～5` | 現在是免費帳號草稿，**沒有商用授權**，上架前一定要換 |

---

## 三、試玩版有多大（2026-11-25 實量）

| | 檔數 | 容量 |
|---|---:|---:|
| 整個遊戲（離線包，已排除工作素材） | 18,597 | 1,521 MiB |
| **試玩範圍（到索菈娜戰打贏＝`demo_cleared`，靜態閉包上限）** | **6,591** | **595 MiB** |
| 　└ 程式與小檔 | 308 | 10.8 MiB |
| 　└ 素材 | 6,283 | 584 MiB |
| 玩家玩完一輪實際下載（照鐵律 13 逐畫面載入的累計） | — | 約 450～500 MiB |
| **開機那一批**（首頁＋挑戰入口） | — | **約 1.6 MiB** |
| 單檔超過 25 MiB | **0** | 最大一支是 BGM 4.4 MiB |

最重的幾塊：敵人動畫格 188 MiB（4,088 檔）、立繪 80 MiB、BGM 73 MiB、`flight/city` 60 MiB。

**可以再瘦的地方**（不影響畫面，交給打包時處理）：
- `flight/city` 裡 **62.7 MiB** 是製作來源（`*_iso.png`、`*_topdown*.png`），程式沒有引用 —— 試玩包直接排除。
- 試玩用不到的天空怪精靈圖約 25 MiB。
- 城鎮資料不分章節，試玩之後才用到的立繪表情被算進來（偏多，精算後還會再少）。
⇒ 精簡後**試玩包估 480～520 MiB、約 6,000 檔**。

⚠ 這是靜態估算。真正切試玩版時，要把精簡後的資料**實跑一輪**錄下實際請求（`tools/challenge_build` 那套作法）才算數。

**對各平台上限：**

| 平台限制 | 試玩版 | 結論 |
|---|---|---|
| Cloudflare Pages 免費：每站 2 萬檔、單檔 25 MiB | 程式只放 ~120 檔 | ✔ 寬裕 |
| Cloudflare R2 免費：10 GB 儲存 | ~0.5 GB | ✔ 用 5% |
| GitHub Pages：站台 1 GB、流量軟上限 100 GB/月 | 一位玩家約 0.5 GB ⇒ **約 200 人就到月流量上限** | ✘ 不能當正式網頁版 |
| itch.io HTML5：1,000 檔、zip 500 MB | 6,000 檔 | ✘ 網頁版不放 itch |
| itch.io 下載檔：網頁上傳約 1～2 GB／檔，butler 工具更大 | APK ~0.5 GB | ✔ |
| Google Play：基本模組 200 MB；asset pack 單包 1.5 GB、合計 4 GB | 程式 + 開機包放基本模組，素材放 install-time asset pack | ✔ 要用 AAB + asset pack，不能整包塞基本模組 |
| TestFlight：外部測試員 1 萬人、每版 90 天到期 | — | ✔ 但要每 90 天上傳新版 |

⚠ **整個遊戲的檔數已經 18,597，碰 Pages 免費方案 2 萬檔的 93%**。所以「程式放 Pages、素材放 R2」不是選項而是必要：
素材留在 Pages 的話，正式版一定會撞牆（付費方案 10 萬檔）。

---

## 四、網頁版：建議與替代

### 建議：Cloudflare Pages（程式）＋ R2（素材），同一個網域

```
play.<網域>/          ← Pages：index.html、*.js、css、config、少量開機圖（約 120 檔、10 MB）
assets.<網域>/demo/   ← R2：試玩層素材（約 6,000 檔、0.5 GB）
assets.<網域>/full/   ← R2：正式層素材（之後）
```

- **費用**：Pages 靜態請求免費不限量；R2 儲存 10 GB 內免費、讀取每月 1,000 萬次免費、**下載流量完全不收錢**。
  試玩期估算：一位玩家一輪約 6,000 次讀取 ⇒ 每月約 **1,600 位完整玩家**才會碰到 1,000 萬次免費額度，
  超過也只是每百萬次 US$0.36。實際上大部分人不會玩完，而且 Cloudflare 快取命中的請求不算 R2 讀取。
- **為什麼素材要掛自己的網域**：R2 的 `r2.dev` 測試網址有速率限制、不吃快取，只適合開發；正式要掛自訂網域。
- **CORS**：素材網域和程式網域不同，R2 要設 CORS（Web Audio 的 `fetch` 會被擋）。或者用 Pages 的路由把 `/resources/*` 代理到 R2，讓瀏覽器看起來是同源 —— 這是比較省事的作法，程式幾乎不用改。

### 替代 A：全部放 GitHub Pages（現況）
- 0 元，但**站台 1 GB、月流量軟上限 100 GB**，試玩約 200 人就會收到 GitHub 的信。只適合內部測試。

### 替代 B：全部放 Cloudflare Pages（不拆 R2）
- 試玩版 6,000 檔放得下，最省事；但**正式版放不下**（1.8 萬檔且還在長），等於之後要再搬一次。
  如果 Ray 想要**最快上線**，可以先用這條，正式版前再拆 —— 程式完全不用改。

---

## 五、手機版：Capacitor 包殼

### 打包方式（兩平台共用）

1. 建一個**打包資料夾**（不放進遊戲 repo 的根目錄，避免和現有 `sw.js`／`offline.js` 打架）：
   `npm create @capacitor/app` → `webDir` 指向打包腳本產出的試玩目錄。
2. **打包腳本**（新寫一支 `tools/release/build_demo.mjs`）：
   照試玩清單（`demo_size.json`，實跑校正後）把程式＋試玩層素材複製到 `dist/demo/`，
   排除製作來源、`_originals`、`_recycle`、工作素材。網頁版和手機版**用同一份 `dist/demo/`**。
3. **App 裡素材全部內建**（試玩約 0.5 GB）：符合鐵律 12「離線可跑、不依賴外部資源」。
   - Android：基本模組放程式＋開機包，其餘素材放 **install-time asset pack**（Play）；
     itch 的 APK 直接整包（側載沒有 200 MB 限制）。
   - iOS：直接整包進 App（App Store 單 App 上限遠大於此；超過 200 MB 只會在行動網路下載時多一個確認）。
4. ⚠ **手機殼裡沒有網址列**：所有「依賴網址列、開新視窗、把狀態存在 URL」的地方都要確認（鐵律 12 早就禁止，打包前再掃一次）。
5. ⚠ **iPhone 飛行畫面無聲**還沒查出根因（HANDOFF A 段），iOS 試玩前一定要先解決。

### Android：itch 先、Play 後

| | itch.io APK | Google Play |
|---|---|---|
| 費用 | 0 | US$25 一次 |
| 上線速度 | 當天 | 個人帳號：**先 12 人連續 14 天封閉測試**才能申請公開／正式（中途掉一人就重算）；公司帳號據第三方說法免除（Google 官方頁沒寫，要再確認） |
| 玩家門檻 | 要開「允許安裝未知來源」，有人會卻步 | 一鍵安裝、自動更新 |
| 檔案格式 | APK | AAB（＋asset pack） |
| 簽章 | 自己的 keystore（**要備份，弄丟就不能更新同一支 App**） | Play App Signing |

建議：**試玩期 itch APK 先上**；如果 Ray 決定付 Play 的 US$25，**現在就開始找 12 位測試員跑 14 天**，正式版要用到時就已經解鎖。

### iOS：TestFlight 公開連結
- 要 Apple 開發者帳號（US$99/年）；在 M2 MacBook 上用 Xcode 打包上傳。
- 第一個版本要過 **Beta App Review**（要填測試說明和回饋信箱）。
- **每個版本 90 天到期**，試玩期要記得每 90 天上傳一次新版。
- 公開連結誰都能轉傳，上限 1 萬人。

---

## 六、Steam 送手機版：怎麼做才不會被商店擋（Ray 11-25 新需求）

Ray：「**Steam 會是前期主力，但這是手遊，我打算讓 Steam 版送手機版**」。

### 可行的形狀：一支免費 App ＋ 帳號解鎖

1. **手機 App 本身免費**，內含試玩層（＝試玩版就是這支 App，不另外做一支）。
2. 正式層用**帳號解鎖**：玩家在遊戲官網（我們的網域）用 **Steam 登入**（Steam OpenID，免費），
   伺服器用 Steam Web API 的 `CheckAppOwnership` 確認他買過 Steam 版 ⇒ 把他的遊戲帳號標成「已擁有」。
   手機 App 登入同一個遊戲帳號 ⇒ 下載／開啟正式層。
   - 實例：*Melvor Idle* 就是這樣做的（Steam 帳號綁雲端帳號，免費手機版登入即解鎖完整版）。
   - 帳號後端可以沿用已經在用的 **Supabase**（遙測那一個）的 Auth，不必另找。
3. ⚠⚠ **商店規則**（這一段決定能不能上架，要 Ray 知道）：
   - **Apple（3.1.3(b) 跨平台服務）**：可以讓玩家使用在別的平台買的內容，**但同樣的內容在 iOS App 裡也必須能用 Apple 內購買到**。
     ⇒ iOS 版一定要**同時**提供內購買斷（價格自訂）。只能「Steam 送」、App 裡不能買 ⇒ 很可能被退件。
     App 裡**不能**放「去 Steam 買」的連結或引導。
   - **Google Play**：允許「只消費」型（登入後使用在別處買的內容），但 App 裡賣的東西要走 Google Play 結帳，App 裡也不能引導去外面付款。
     ⇒ 一樣：Android 也提供 Play 內購，同時接受 Steam 帳號解鎖。
   - **Steam 方面**：送手機版不違反 Steamworks（是我們自己的帳號系統）；要注意的是 Steam 的**價格一致**要求是針對「在別處賣 Steam 金鑰」，手機內購價格自己定即可。這條建議正式上 Steam 前再對一次 Steamworks 文件。
4. **好處**：試玩→正式是同一支 App，評論與下載數一直累積；正式層之後要加新章節也走同一個機制。

⇒ 這就是為什麼第二節第 7 題建議「**同一支 App**」。

### 要多做的事（正式版前，不擋試玩）
- 遊戲帳號（Supabase Auth）＋ Steam OpenID 登入頁 ＋ 一支伺服端函式查 `CheckAppOwnership`（要 Steam 發行商 Web API 金鑰，Ray 有 Steamworks 帳號之後才拿得到）。
- 手機 App 的「正式層」下載與驗證（從 R2 下載、驗擁有權）。
- iOS／Android 內購（Capacitor 有現成外掛）。
- **存檔同步**要不要做（Steam 玩到一半換手機接著玩）是另一個決定，**試玩不需要**。

---

## 七、工作拆解（交給 PM 派工）

### 試玩版（現在）
| # | 工作 | 誰 | 擋在哪 |
|---|---|---|---|
| 1 | 劇情先做到 `demo_cleared` 並切試玩：打贏收尾、首頁只留「開始故事」、之後內容拿掉 | 劇情副理 | HANDOFF：主線完成後才切 |
| 2 | 試玩降落鎖（只能進北泊） | 地圖副理 | HANDOFF 已列，還沒派 |
| 3 | `tools/release/build_demo.mjs`：照試玩清單產 `dist/demo/`（排除製作來源與工作素材） | 行銷副專（工具，不碰遊戲程式） | 要 1 的切法定案 |
| 4 | 試玩清單實跑校正（錄下實際請求，補漏算的字串組路徑） | 效能副理 | 要 1 |
| 5 | 素材網址前綴：素材改從 `assets.<網域>` 讀，或在 Pages 設 `/resources/*` 代理到 R2（**建議代理，程式不用改**） | 行銷副專設定；若要改程式交劇情副理 | 要 Ray 的 Cloudflare 帳號與網域 |
| 6 | `sw.js`／`offline.js`：App 殼裡停用離線下載鈕（素材已內建），網頁版保留 | 劇情副理 | — |
| 7 | Capacitor 專案（Android＋iOS）、圖示、啟動畫面、直式鎖定、safe-area | 行銷副專 | iOS 需 Mac |
| 8 | iPhone 飛行畫面無聲修掉 | 劇情副理 | iOS 試玩前必修 |
| 9 | 賽西莉失誤語音用付費帳號重生、重量 `fileGain` 五列 | Ray 生成 → 劇情副理接 | 上架前必做 |
| 10 | itch 頁面文案、截圖、宣傳片 | 行銷副專＋動畫副理 | — |

### 正式版（之後）
帳號系統＋Steam 連動＋內購＋正式層下載（第六節）、Steam Electron 包殼、存檔同步（待定）。

---

## 八、來源（2026-11-25 查詢）

- Cloudflare Pages 限制（2 萬檔／25 MiB；2026-01 付費方案提高到 10 萬檔）：
  [Pages limits](https://developers.cloudflare.com/pages/platform/limits)、[2026-01-23 changelog](https://developers.cloudflare.com/changelog/2026-01-23-pages-file-limit-increase/)
  （靜態請求免費不限量：第三方整理，官方 limits 頁沒寫流量上限）
- Cloudflare R2 價格（10 GB／Class A 100 萬／Class B 1,000 萬免費，無流量費）：
  [R2 pricing](https://developers.cloudflare.com/r2/pricing)
- GitHub Pages 限制（1 GB、100 GB/月軟上限）：[GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- itch.io HTML5 1,000 檔／zip 500 MB；下載檔上傳上限（論壇整理，官方文件應再確認）：
  [itch 論壇：file limit](https://itch.io/t/1257250/need-more-files-for-html5-upload)、[itch 論壇：500 file limit](https://itch.io/t/587093/500-file-limit)、[HTML5 docs](https://itch.io/docs/creators/html5#zip-file-requirements)
- Google Play 12 人／14 天封閉測試：[Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465)
- Google Play 大小限制（基本模組 200 MB、asset pack 1.5 GB、合計 4 GB）：
  [App size limits](https://support.google.com/googleplay/android-developer/answer/9859372)、[App Bundle FAQ](https://developer.android.com/guide/app-bundle/faq)
- Google Play 付款政策（只消費型 App 可用別處買的內容）：[Payments policy](https://support.google.com/googleplay/android-developer/answer/10281818)
- TestFlight（1 萬人、90 天、Beta App Review）：[Invite external testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers)、[TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/overview-of-testflight/)
- Apple 開發者計畫 US$99/年、公司需 D-U-N-S：[Enroll](https://developer.apple.com/programs/enroll/)、[D-U-N-S](https://developer.apple.com/support/D-U-N-S/)
- Apple 3.1.3(b) 跨平台服務：[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)、[開發者論壇討論](https://developer.apple.com/forums/thread/825551)
- Steam 帳號解鎖手機版的實例（Melvor Idle）：Steam 社群公告（第三方實作，非 Steamworks 官方指引）
- Google Play 開發者帳號 US$25、Steam Direct US$100：沿用 PM 既有資料，本次未重查。
