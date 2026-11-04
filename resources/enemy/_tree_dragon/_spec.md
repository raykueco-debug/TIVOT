# 樹寄生石龍（暫名）— 美術交件紀錄

## 定稿（2026-11-04 Ray）
- **側面飛行立繪**：`tree_dragon_side_flight_v1.png`（白底）／`tree_dragon_side_flight_v1_alpha.png`（GPT 重製的 alpha）
- **Wan 輸入**：`tree_dragon_flight_src.webp`（上面那張 alpha，只把 α≤12 的雜點歸零）
- **飛行 loop**：Ray「這版可以」＝ **16fps 版**
  - 格圖：`C:\Users\Ray Ku\Desktop\ComfyUI-master\tivot_wan\out\monsters\tree_dragon_flight_src_fly1_16fps\`（48 格，960×480，去背 webp）
  - 預覽：`tree_dragon_fly1_16fps_preview.gif`
  - 參數：GEN 960x480／FIT 0.86／OY 0.5／motionfix／seed 4401／length 49／fps 16

## 兩支用途不同的動畫（2026-11-04 Ray：「這是兩個不同用途的動畫」）
格圖都在 `C:\Users\Ray Ku\Desktop\ComfyUI-master\tivot_wan\out\monsters\`，960×480 去背 webp、16fps、全格未裁；
參數一律 GEN 960x480／FIT 0.86／OY 0.5／motionfix／length 49。

### ① 遭遇用（飛行地圖：原本橫向游的龍轉過來往船襲來）—— 橫飛 → 轉正 → 飛
⚠ **不放大**：拉近是程式的事（Ray）。預覽 `tree_dragon_encounter_preview.mp4`
| 段 | 資料夾 | 格 | seed |
|---|---|---|---|
| 橫飛 loop | `tree_dragon_flight_src_fly1_16fps` | 48 | 4401 |
| 橫飛 → 轉正 | `tree_dragon_flight_src_ab_turn` | 49 | 5101 |
| 轉正 → 正面飛 | `tree_dragon_turn_src_ab_fswim` | 49 | 5201 |
| 正面飛 loop | `tree_dragon_front_swim_src_fswim_loop` | 48 | 5202 |

### ② 戰鬥用 —— 仰看全身、小幅扭動 loop（2026-11-04 Ray 改定）
> Ray：「戰鬥動畫改成下方看著龍游動的全身動畫，擺幅較小」「只要讓 WAN 讓牠小幅扭動，再讓程式把他拉近，快速由左下往右上平移就好」
- 資料夾 `tree_dragon_lowangle_src_low_loop`（48 格，seed 6101）；關鍵圖 `tree_dragon_lowangle_v1.png`（Ray：「這張就可以了」）。
- 預覽 `tree_dragon_battle_idle_preview.mp4`（loop 播三次）。
- ⚠ **攻擊演出全由程式做**（美術不另出圖）：龍在前景掃過消失 → 用同一支 loop 拉到極近、由左下快速平移到右上、幾乎遮滿畫面 → 近景樹復歸。

- ✅ **已交件（2026-11-04 Ray：「可以 水平翻轉交件」）—— 頭朝右**
  - 立繪（動畫的畫布基準）：`resources/enemy/mon_tree_dragon_low.webp`（2172×724，水平翻轉後）
  - 格圖：`resources/enemy/anim/mon_tree_dragon_low_idle/`（48 格 640×180 webp、`anim.json`：fps 16、loop、box `[-15,70,2122,597]`）
  - 交法：原圖與 48 格先 `ImageOps.mirror`，再 `TIVOT_FIT=0.86 TIVOT_OY=0.5 deliver_idle_lite.py <原圖> <格> <目的地> 16 0.75`。
  - ⚠ box 的 x 是 −15：扭動時頭／尾會超出畫布左緣 15px（畫布座標），程式要不要夾自己決定。
  - ⚠ **程式端要接的**（美術不碰 code，鐵律 11）：敵人卡、`config` 的鍵、背景 `_undercity_skybattle` 的視差、掃過消失 → 拉近左下往右上平移 → 近景樹復歸的演出，全部還沒接。

### ⛔ 作廢（Ray 改方向，留著不刪）
正面游 → 撲到近全畫面：`tree_dragon_front_swim_src_ab_fswim_attack`（seed 5301）＋終點 `tree_dragon_front_big_src.png`、預覽 `tree_dragon_attack_preview.mp4`。
竄出用的關鍵圖沒有收（Ray 改成程式平移）。

### 關鍵圖（皆 GPT 產、真 alpha）
`tree_dragon_flight_src.webp`（側）／`tree_dragon_turn_src.webp`（轉身，GPT 翻轉成頭朝左）／
`tree_dragon_front_swim_src.webp`（正面飛）／`tree_dragon_front_src.webp`（正面撲擊）

### 備用（沒用到）
`tree_dragon_turn_src_ab_attack`（轉身直接撲、沒放大）／`tree_dragon_turn_src_ab_attack_big`（轉身直接撲、放大）

## 設定（Ray 一路改定）
蛇身、會飛但沒有翅膀、石質鱗片、樹根纏身當筋、四隻枝條鉤爪（前爪貼頸下）、雙角龍頭（要小）。
⛔ 不要東方龍語彙（鹿角、龍鬚、捲鬃、雲紋、龍珠）。⛔ 不要身上的裝飾枯枝（會跟爪搶）。

## 已知
- 循環接縫比一般格間大約兩倍（橫飛 12.7 vs 6.2、正面飛 9.5 vs 4.8），橫飛那支 Ray 看過接受。
- 每支關鍵圖各自縮放到畫布高，所以正面飛看起來比橫飛小（遭遇用由程式拉近，不影響）。
- 背景另見 `resources/background/_undercity_skybattle/`（地底古城空戰視差：底圖＋遠景／中景／近景單根樹幹）。
- Wan 後苔綠變淡、細節比原圖軟。
- 三視圖 v1~v10 是設計過程（v10 爪對、頭太大），Ray 說三視先不管。

## ⚠ 程式端要接的（美術不碰 code，鐵律 11）
- 還沒決定用在哪裡（飛行地圖怪／戰鬥立繪）、鍵名與數值卡都還沒有。
- 要進遊戲就由程式 session 決定交件路徑（`deliver_idle_lite.py` 那一套或飛行頁的 sprite），本資料夾是底線開頭，遊戲不會載入。
