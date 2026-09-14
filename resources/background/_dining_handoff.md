# 餐飲街差分 — 交給 coding session 的規格（ver -578）

> **✅ 已接完（ver -579，coding session）**
> · 四家店接在 `script/town.js` 的 `capital.dining.scenes`（完整基底名，逐張 `noTime`）；
>   店別的中文名在同檔的 `DINE.scenes`。判定在 `modules/town.js` 的 `dineKey()`。
> · 路人語三組已入 `dining.scenes[].chatter`；**酒吧沿用節點自己那一組市井線**。
> · 女主角出門／宵禁／約會那一整套在 ver -575～-576 就做完了（`OUTING`），
>   `rennaOut` 已刪。規格見 CLAUDE.md §6.5.4.2。
> · 實測：三張新圖各只發一次請求（0 個 404）、酒吧仍吃 `Capital_Bistro_Day/Dusk/night`。
> · **還缺**：北方泊地的四張（交件後照帝都那樣補一組 `scenes` 即可，程式端不必動）。

素材已備妥在 `resources/background/`，以下整段可直接貼給另一個 session。

---

## 給 coding session 的 prompt

> 帝都餐飲街要拆成四家店的差分，素材已經在 `resources/background/`：
>
> | 店 | 背景檔（基底名） | 誰可能出現 |
> |---|---|---|
> | 咖啡廳 | `Capital_Cafe` | 蕾娜 |
> | 餐廳 | `Capital_Restaurant` | 諾薇兒 |
> | 甜品店 | `Capital_Sweets` | 安雅 |
> | 酒吧 | `Capital_Bistro`（沿用既有餐酒館，不另畫） | 索拉娜 |
>
> ⚠⚠ **這四張不做時段差分**（Ray 定案：營業時間不跨黃昏，天色一律偏亮），
> 所以檔名**不帶 `_Day` 後綴**。節點資料的 `bg` 要寫**完整檔名**，
> 或給 `noTime:true` —— 否則 `modules/story.js` 的 `bandNames()` 會先去試
> `Capital_Cafe_Day.webp` / `_Dusk` / `_night` 等一輪 404（§6.5.4 的候選鏈）。
>
> 路人語（`chatter`）的稿在 `resources/background/_dining_chatter.md`，
> 三家各 6 句，照 §6.5.4 的規矩接：沒有立繪、名字欄用 `SPEAKERS.VOICE.name`
> （「路人」）、點一下出一句再點一下收、NPC 台詞不用「」包起來。
>
> 女主角出門的規則（Ray 交辦，這一段是 coding 的部分）：
> - 早上 08:00 ~ 下午 18:00 之間可能出門，**一天最多兩次**。
> - **出門時旅店的頭像不顯示**（門燈那一欄）。
> - 出現區域＝所有「連接用場景」（非末端節點）＋各角色自己的清單：
>   - 蕾娜：行政廳、教堂、雜貨店、餐飲街（**咖啡廳**）
>   - 諾薇兒：行政廳、教堂、雜貨店、餐飲街（**餐廳**）
>   - 安雅：雜貨店、餐飲街（**甜品店**）
>   - 索拉娜：雜貨店、武器店、賞金獵人公會、餐飲街（**酒吧**）
>
> ⚠ 既有的 `capital.rennaOut`（ver -461）已經有「進城擲一次、選一格、
>   `until` 之後回房」那一套 —— 新規則是它的擴充（四個角色、一天兩次、
>   店別對應），**不要另寫一份**（鐵律 8）。

---

## 素材規格（給美術端記錄）

- 1536×1024（橫式 3:2），WebP q85；原 PNG 在 `resources/_originals/background/`。
- 1908 年歐洲風、日式動漫 cel style（平塗、二三階硬邊陰影、無顆粒雜訊）。
- 平視圖（玩家從門口往店內看），兩側坐著客人，**畫面正中央留空給立繪**。
