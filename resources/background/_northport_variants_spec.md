# 北方泊地 — 兩組差分規格（ver -588，Ray 交辦）

13 個場景 × 2 組 = **26 張**。戰損版 `_BF` 保留（劇情前期用），新的兩組照**帝都命名規則**
（`城名_地點_時段`，見 `Capital_Square_Day` / `Capital_Dock_night`）：

| 節點 | 戰損版（現有） | 日景・恢復中 | 夜景・恢復中 |
|---|---|---|---|
| 中央大道 | `Northport_Square_BF` | `Northport_Square_Day` | `Northport_Square_Night` |
| 西側 | `Northport_west_BF` | `Northport_West_Day` | `Northport_West_Night` |
| 北側 | `Northport_north_BF` | `Northport_North_Day` | `Northport_North_Night` |
| 東側 | `Northport_east_BF` | `Northport_East_Day` | `Northport_East_Night` |
| 墓地 | `Northport_cemetery_BF` | `Northport_Cemetery_Day` | `Northport_Cemetery_Night` |
| 碼頭 | `Northport_port_BF` | `Northport_Port_Day` | `Northport_Port_Night` |
| 教堂 | `Northport_church_BF` | `Northport_Church_Day` | `Northport_Church_Night` |
| 市鎮中心 | `Northport_cityhall_BF` | `Northport_Cityhall_Day` | `Northport_Cityhall_Night` |
| 公會 | `Northport_guild_BF` | `Northport_Guild_Day` | `Northport_Guild_Night` |
| 武器店 | `Northport_gunstore_BF` | `Northport_Gunstore_Day` | `Northport_Gunstore_Night` |
| 雜貨街 | `Northport_grocery_BF` | `Northport_Grocery_Day` | `Northport_Grocery_Night` |
| 餐飲街 | `Northport_tavern_BF` | `Northport_Tavern_Day` | `Northport_Tavern_Night` |
| 旅店 | `Northport_hotel_BF` | `Northport_Hotel_Day` | `Northport_Hotel_Night` |

## 共用規格（每張都要）

- **同一個地點、同構圖同視角**：拿對應的 `_BF` 當參考圖上傳，建築位置／街道走向／
  遠景地標都要對得上 —— 這是同一座城的不同時間，不是另一張新圖。
- 橫式 3:2、平視圖（玩家站在那一格看出去 / 從門口往店內看）。
- 日式動漫 clean lineart、**嚴格 cel style：平塗色塊、二三階硬邊陰影、
  絕不要顆粒雜訊噪點油畫質感**、不要浮水印。
- **中央留空給立繪**（人物擺兩側）。

## A 組：日景・恢復中・**有人**

- 瓦礫清到路邊堆成整齊小堆、主街掃出來了；破損建築搭**木質鷹架與防塵布**、
  部分牆面補上新磚。
- **要有人**：1908 年歐洲裝束的市民與工人 —— 推手推車搬磚、鷹架上作業、
  路邊小攤、有人交談。內景則是店主與客人、修繕中的細節。
- 明亮的白天，陽光穿過雲隙，不再是陰鬱煙霧（可有一點施工揚塵）。

## B 組：夜景・恢復中・**無人**

- 同樣的恢復進度（鷹架、防塵布、新磚、整齊的瓦礫堆），但**畫面上一個人都沒有**。
- 夜間照明：街燈、窗內透出的暖光、工地的臨時燈；藍紫色的夜空。
- ⚠⚠ **月亮的鐵則**（Ray 指定）：
  - 一般場景**若畫到月亮，必為銀色滿月**（不要弦月、不要其他顏色）。
  - **碼頭（Port）例外**：除了銀色滿月之外，**極遠處的天邊要隱約有一顆紫色的月亮**
    —— 低調、朦朧、幾乎融進地平線的霧氣裡，是「有什麼不對勁」的暗示，不是主角。
- 內景的夜：燈火通明但空無一人（椅子上桌、燈留著、爐火將熄）。

## 產出後

WebP q85 → `resources/background/`；原 PNG → `resources/_originals/background/`。
⚠ 這兩組是**時段差分**，所以節點的 `bg` 只要寫基底名（例 `Northport_Square`），
`modules/story.js` 的 `bandNames()` 會自動挑 `_Day` / `_Night`（見 §6.5.4）。

## 進度

- [ ] 全部 26 張未完成 —— ver -588 開跑時 GPT 圖片生成碰到額度上限（送出後只「思考」不出圖）。
