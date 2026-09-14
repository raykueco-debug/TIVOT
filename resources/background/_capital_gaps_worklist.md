# 帝都 Capital — 時段差分缺口（ver -1307 巡查）

> 巡法：照 `modules/story.js` 的 `bandNames()` ＋ `BAND_FALL` 把
> **11 個區域 × 每個節點 × 五個時段**逐格解一次，看解到的是「專屬那一張」還是退路。
> 全專案 455 格：專屬 231、退路 219、完全沒圖 0。
> 退路裡**絕大多數是設計上就少**（見下方「不是缺口的那些」），真的該補的集中在**帝都**。

## 要補的（6 張）

| 節點 | 缺 | 現在會看到 | 為什麼該補 |
|---|---|---|---|
| `Capital_Square` 攝政王廣場 | **night** | `_midnight`（深夜圖） | **優先**。全天可到、是進城第一格；同城其他戶外格（中心區／大教堂／行政廳／舊街區／上街區／船塢）五段都齊，只有廣場缺這一張 |
| `Captal_Guild` 賞金獵人公會 | night | `_Dusk` | 營業 8–20（上界不含），而夜的界線是 19:00 ⇒ **19:00–19:59 進得去**，那一小時看到的是黃昏 |
| `Capital_Firearm` 武器店 | night | `_Dusk` | 同上（8–20） |
| `Capital_Grocerie` 雜貨舖 | night | `_Dusk` | 同上（8–20） |
| `Capital_Bistro` 餐酒館 | midnight | `_night` | 低。全天可到，0–5 點用夜景頂著 |
| `Capital_Hotel` 旅店 | midnight | `_night` | 低。同上；旅店是睡覺的地方，深夜停留的機會其實不少 |

產法照 `_shinier_worklist.md`：**GPT 畫日景 → Gemini 從日景衍生**（構圖／視角／景物位置
／比例完全不變，只換光與色溫）。**各時段的光線描述直接抄那一份的表**，不要在這裡再寫一份。

⚠ 這六張都是**新檔名**（`Capital_Square_night.webp` …），不是同名覆蓋 ⇒
  **不必**在 `config.js` 的 `ASSET_VER` 加列。

## 不是缺口的那些（巡到但**不要**開工單）

- **`midnight` 全專案系統性沒有**（東泊／拉芬／山谷／幽墓／夏爾／森林／遺蹟…）。
  `BAND_FALL.midnight` 第一順位就是 `night`，退得乾淨，HANDOFF 也記過。**維持現狀。**
- **森林 `Forest_*` 沒有 Dawn** —— `_forest_spec.md` 寫明「Day / Dusk / Night 三時段」，
  是設計就這樣，黎明退白天。山谷 `Canyon_*` 同理（`_canyon_spec.md`：三個時段）。
- **`Shinier_Workshop_night`** 已列在 `_shinier_worklist.md`，但那一格營業 8–19 ⇒
  夜的界線一到就打烊、**玩家進不去**。可以從那份清單劃掉。
- **`Shinier_Lakeside_night`** 也在那份清單上，全天可到 ⇒ 那一張**要**。
- 29 個地點只有一張無時段的圖（室內、洞窟、`noTime:true` 那些）—— 刻意的。

## 順手做掉的（ver -1307）

`resources/background` 剩下的 5 張 PNG 已轉 webp、原檔走 `tools/recycle.sh` 退役：
`Capital_Square_{Dusk,midnight}`、`Capital_Midtown_{Dusk,midnight,night}`
（12.6 MB → 1.41 MB），另 `Northport_Hotel_room_Night.png`（webp 早就在）一併退役。
現在整個 `background/` 除了 `TIVOT_Emblem.png`（apple-touch-icon，要 PNG）
與 `Kerberos.png`（沒有人引用的舊原圖）之外全是 webp。
