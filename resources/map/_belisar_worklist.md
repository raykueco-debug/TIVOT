# 貝利薩爾拓樸施工單（ver -1378）— 給程式 session

> 來源：`resources/map/_belisar_patch.json`（美術提案）＋ Ray 定案。
> **這份是從 patch 過的資料印出來的，不是手抄。** 改完請跑 `py tools/script_lint.py`。

## 一、刪掉一個節點

**`courtyard`（貝利薩爾遺址　下沉中庭）整格移除**（Ray：「把下沉中庭拿掉」）。連帶：
- 指向它的兩個出口 `lamphall.up`、`rooffall.left` **一起刪掉**（第二節已列成改完的樣子）
- 它自己的 `acts`／旗標／`bg` 一併清；`Belisar_SunkenCourt` 那組圖會沒人用
  （美術**先不回收**，等確定不會放回來）
- ⚠ 先 `grep -n "courtyard" script/` 確認沒有腳本或旗標指著它

## 二、逐格的 `exits`（只列改過的，照抄）

```js
antecham:   exits:{ up:'throne', down:'dragstair' },               // 謁見前廳
bellroom:   exits:{ up:'dragonrace', right:'stairwell' },          // 鐘室
cages:      exits:{ right:'oldtomb', up:'mirrorpool' },            // 獸欄
crown:      exits:{ right:'throne' },                              // 寶冠室
draincliff: exits:{ left:'dragonrace', down:'stairwell' },         // 排水崖口
drywell:    exits:{ right:'forge', down:'rooffall' },              // 枯井底
forge:      exits:{ down:'muralwalk', left:'drywell', right:'trihall', up:'starroom' }, // 兵器工坊
incense:    exits:{ up:'muralwalk', down:'trihall' },              // 聖油室
lamphall:   exits:{ left:'greathall', right:'ossuary' },           // 枝燈長廊
mirrorpool: exits:{ up:'guardhall', down:'cages' },                // 靜水池
muralwalk:  exits:{ left:'rooffall', up:'forge', down:'incense' }, // 壁畫長廊
offering:   exits:{ left:'throne' },                               // 聖物室
ossuary:    exits:{ left:'lamphall', down:'wardtomb' },            // 納骨堂
rooffall:   exits:{ right:'muralwalk', up:'drywell' },             // 崩頂坡
stairwell:  exits:{ up:'draincliff', left:'bellroom' },            // 旋梯井
starroom:   exits:{ right:'guardhall', down:'forge' },             // 星象室
throne:     exits:{ down:'antecham', left:'crown', right:'offering' }, // 王座廳
wardtomb:   exits:{ down:'bonerack', up:'ossuary' },               // 近衛墓室
```

## 三、驗收（改完要成立）

- **死胡同只有 4 個**：`altar` 古代祭壇／`crown` 寶冠室／`entrance` 古城中庭／`offering` 聖物室
- **`altar` 只能從 `floodway` 進去**（Ray：走到祭壇前一定要經過積水處）
- **37 格 44 邊 環 8**、全圖連通、同一條邊兩端方向相反
- 出口不可指向不存在的節點（這一版已驗：0 筆）

## 四、⚠ 追逐邏輯：入口不能當逃生口

`entrance` 是死胡同但有跨圖出口通古道 —— 敵人被逼到那裡會**逃出地圖**。
Ray 定案：**不改拓樸，用怪的行為擋**（「這個讓 code 用怪的行為去堵就好」）。

## 五、小地圖（美術隨後交）

`map:{ img:'resources/map/map_belisar.webp', spots:{…} }`；`spots` 等美術量完再給
（`resources/map/_spots_belisar.json`）。⚠ **先改資料再接圖**，順序反了小地圖會與箭頭矛盾。

## 六、順帶要跳的 `ASSET_VER`（已交件、同名覆蓋）

`belisar_oldaltar`／`belisar_rooffall_dawn`・`_day`・`_dusk`・`_night`／`belisar_ossuary`