# 2026-09-04~05 美術產線交接（接 _HANDOFF_734.md）——本輪已收工

> 結果：**場景差分 55 張＋夏爾森林 27 張＋村野外 4 張＝86 張全部生成並入庫**。
> 下載攔截問題已徹底解掉（見 §2 的 blob-hook 方法論，這是本輪最重要的產出之一）。

---

## 1. 已完成入庫（resources/background/）

- **場景差分 55/55**：帝都 Dawn×11＋Guild Dawn/Dusk、北方泊地 14 節點×Dawn/Dusk（含
  Hotel_room 從夜景衍生）、西湖村 Dawn×11＋chiefhouse Dusk、遺跡入口 Dawn/Dusk、
  `Shinier_Plaza_Dusk` 換新（舊 _dd 版已進回收區）。
- **夏爾森林 27/27**：Entry/Glade/Nest/Shoal/Valley/Trail/Cave/Highland/Cliff
  各 ×Day/Dusk/Night —— GPT 出日景原稿（`_originals/background/_forest_gpt/`，
  10 張 png＋jpg 輕量版）→ Gemini 重繪＋衍生。重繪版＝正式 Day。
- **村野外 4/4**：`Shinier_Wilds_Dawn/_Day/_Dusk/_night`。
- `script/town.js` 的 `bgPending` 已全部拔除（純資料註記，無程式讀取）。
- 怪：`mon_beast_shackle` 已入庫。

## 2. ⚠⚠⚠ 下載攔截的真相與解法（blob-hook，全流程驗證 80+ 次）

**「Chrome 擋自動下載」是誤診**：權限清單早就開了。真相是——
Gemini/ChatGPT 的下載都是「fetch 圖檔 → 觸發儲存」兩步，**儲存那一步需要
transient user activation**，程式化點擊沒有 activation 就被 Chrome 靜默丟棄
（fetch 照樣 200，資料進了瀏覽器就是不落地）。偶爾成功＝恰好撞上手勢窗口。

**解法（Gemini）**：hook `window.fetch` 攔 `gg-dl` 響應 tee 出 blob →
自建固定位置的紅色 `<a id=__dla>SAVE</a>`（(4,4) 起、CDP 座標約 (72,40)）→
`__armBlob('檔名.jpg')` 掛上 blob URL 與 download 檔名 → **CDP 真手勢點 SAVE**
→ 同源 blob＋手勢＝必落地，且**檔名自訂**（收檔不必再猜「最新一張」）。
- 頁內函式組：`__dlmr(i)` 點第 i 則的下載鈕（觸發 fetch）、`__armBlob(name)`、
  fetch/XHR 雙 hook。重載後要重注入。
- ⚠ 每則訊息的下載 token **一次性**：點過而沒攔到的則會永久失效（本輪 5 張
  因此重新衍生）。**先裝 hook 再點**。
- ⚠ `__blob` 用畢清 null，不然殘留舊 blob 會被下一張 arm 到（差點存錯圖）。

**解法（ChatGPT）更簡單**：圖的 URL 是同源 `chatgpt.com/backend-api/estuary/content?id=…`
→ 頁內直接 `fetch(img.src)` 拿 blob → 同一套 armBlob＋CDP 點 SAVE。
分享框根本不用開。

**其他坑**：`[role=progressbar]` 有一顆常駐隱形 spinner，不能當「上傳中」判準；
ChatGPT 分享框的「關閉」JS click 無效、殘留框會劫持下一次開框（重載頁面最乾淨）；
lh3 的 rd-gg-dl 簽名 URL 一次性、navigation 二次使用 403。

## 3. 剩餘待辦

- **怪串 7 隻待收**（`gemini.google.com/app/683451137832f8a6`，用 §2 的 blob-hook 流程）：
  石棺獸 sarcophagus／提燈獸 lantern／聖書獸 codex／鐘樓獸 bellfry／
  燭台獸 candelabra／面紗獸 veil／鎖骨聖釘獸 nail
  ⚠ 其中若有先前點過下載的則（handoff_734 提過下載嘗試），token 可能已耗，得重生成。
- 已入庫怪的 GPT 加工線（加氣勢＋去背）、遺跡 20 張 GPT 重繪、凱爾特地宮、
  北泊 `_BF` 差分（Ray 未決）——照 _HANDOFF_734 §4。
- Forest 品質抽查只看了 Entry Night（合格：構圖鎖定、銀色滿月、平塗硬邊）——
  其餘靠 Ray 遊戲內驗收；哪張不行就用 §2 流程重衍生（很便宜）。

## 4. 工具

- `/tmp/ingest.sh <Downloads檔名> <基底名>`：cwebp 1536/q85 入庫＋原檔進 _originals。
  掉了就照 collect.sh 改（差別：吃自訂檔名而非猜最新一張）。
- GPT 原圖轉輕量版餵 Gemini：`sips -s format jpeg -s formatOptions 90`（>1MB 的 png 直傳會很慢）。
