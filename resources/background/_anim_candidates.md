# 背景動畫候選清單（2026-11-06，美術 session）

> Ray：「看所有的背景，判斷每個背景有否做成動畫背景的可能，能做的就用最小 LOOP 做成動畫」
> 「城鎮人群不用做，城鎮有人的地方都做靜態，只要有人就不做」
> 判斷：以地點為單位（去掉 _dawn/_day/_dusk/_night 時段尾綴，每地點看一張代表圖，優先 day）。
> 一共 715 個「地點」（含非背景素材，見最下面）。逐張判斷由 4 個子代理看縮圖總表完成，**還沒經人工複查**。

## 總數

| | 數量 |
|---|---|
| 可做 | 486 |
| 不做（有人） | 215（其中 95 張是 capital 的守衛受擊格、16 張守衛分層，本來就不是背景） |
| 不做（沒有可動的東西） | 14 |

## 依系列（只列「可做」）

| 系列 | 可做／總數 | 主要能動的東西 | 不做的（理由） |
|---|---|---|---|
| belisar（貝利薩爾地宮） | 43／43 | 燭火、吊燈、水面、光束、旗幟、綠光脈動 | — |
| tomb（古墓） | 61／63 | 火把、燭火、少數水面 | rubble、vestibule（無可動） |
| ruins（遺跡＋shinier 地宮） | 54／54 | 光束、火把、發光符文、水面、發光苔 | — |
| dunmor（敦莫爾） | 59／60 | 雲、霧、水面、火光、符光 | fogou（無可動） |
| winsmoor_siege（守城戰 82 格） | 81／81 | 火光、煙、雲 | — ⚠ 子代理整批判同一類，要抽查 |
| ravnsdal（拉芬斯達爾 ravn／varn） | 31／33 | 室內燈火、雲、街燈、海面、落雪 | ravn_station、varn_station（拱門內小人影） |
| sofia＋sofiaout（聖索菲亞＋郊外） | 22／27 | 吊燈、旗幟、棕櫚、噴泉、海面 | cityhall、dock、midtown、slum、square（有人） |
| eastport（東方泊地） | 15／18 | 燈火、雲、海面、噴泉、曬衣 | dining、southgate、university（有人） |
| capital（帝都） | 15／131 | 戰鬥版／午夜版的雲、街燈；hotel 吊燈；四張 fight plate | 城鎮日常版全部有人；守衛受擊格與分層不是背景 |
| lake（鏡湖） | 11／11 | 湖面、瀑布、霧、符光 | — |
| plains（平原） | 10／10 | 雲、草浪、溪流 | — |
| northport（北方泊地） | 10／28 | 戰後版（_bf）的煙、火、旗；教堂廢墟光束；旅館房間窗簾 | 平時版全部有人；church_bf、grocery_bf、guild_bf、gunstore_bf（無可動） |
| winsmoor（溫斯摩爾城外） | 10／40 | 煙、蒸氣、海浪、窯火、麥田 | 其他 30 張有人 |
| verafond（薇拉馮德） | 10／25 | 室內吊燈、窗外雲、窗簾 | 室外街景 15 張有人 |
| forest（森林） | 9／9 | 樹葉、溪流、瀑布 | — |
| sky_parallax（空戰天空分層） | 9／10 | 雲（⚠ 程式已經在捲動，要不要再加動畫待定） | sky_towers_moon（無可動） |
| loneisle（孤舟島） | 7／13 | 雲海、爐火、壁爐 | canteen、east、north、plaza、slipway、west（有人） |
| fallen（廢城） | 6／6 | 雲、草、水面、符光 | — |
| canyon（卡耶爾山谷） | 5／5 | 紅布旗幟、雲霧 | — |
| shinier（夏爾村） | 4／13 | altar、chiefhouse、soranahouse、wilds | 其他 9 張有人 |
| winsmoor_town（西泊城鎮版） | 3／15 | grocery、gunstore、inn | 其他 12 張有人 |
| deck（甲板） | 3／3 | 雲、帆 | — |
| sky_cirrus／cumulus／towers（根目錄） | 3／3 | 雲飄移 | — |
| capital_outer（帝都外郊） | 2／4 | village、windmill | gate、river（有人） |
| holysee（聖座） | 2／3 | 地宮燭火 | lunariaoffice（無可動） |
| undercity_skybattle | 1／4 | 遠景植被、霧 | 其餘 3 張是圖層零件 |

根目錄另外：kerberos、tivot_emblem（無可動）、sentouinstall（有人）。

## 待 Ray 決定

1. **時段**：可做的地點大多有四個時段，全做約 486×最多 4 支。建議先挑類別做樣本，再決定時段怎麼跟。
2. **先做哪幾類**（建議每類先做 1 支樣本）：
   - 室內燭火／火把閃爍（belisar、tomb、ruins 最多）
   - 戶外雲飄移（平原、敦莫爾、廢城）
   - 水面／瀑布（鏡湖、森林、ruins_spring）
   - 樹葉草浪（森林、平原）
   - 光束、符光脈動（遺跡、地宮祭壇）
   - 煙與火（守城戰、北泊戰後版）
3. **loop 格式**：只裁會動的局部當疊加層，還是整張做 8 格或 16 格（樣本出來並排比較）。
4. **非背景素材**：capital 的 fight_* 守衛受擊格、守衛分層、sky_parallax 與 undercity 的圖層零件，這次都不算背景，不做。
