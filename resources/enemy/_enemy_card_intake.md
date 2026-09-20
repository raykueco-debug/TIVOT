# 怪卡待建清單 — 依出沒地分（美術盤點，ver -1556）

> Ray：「把怪卡收一收補進敵人的 excel 表裡，數值全部先用王座徘徊者追擊型態」「依當初設計的出沒地分」
>
> ⚠⚠ **`enemies.xlsx` 我沒有動**（鐵律 11：美術不接資料；xlsx 是二進位，
> 與平行的程式 session 衝突時連 diff 都看不出來）。這一份是**盤點結果**，
> 程式端照著填 xlsx／`script/enemies.js` 即可。

## 一、盤點結果（`resources/enemy/mon_*.webp`，共 **80** 張）

| | 張數 |
|---|---|
| 已接進遊戲（`config.js` 或 `script/town.js` 有引用） | **52** |
| **還沒接、只躺在資料夾裡 → 這一份要處理的** | **28** |

## 二、⭐ 還沒接的 28 隻，依出沒地分

### 伊甸古墓（26 隻）
配 `resources/background/Tomb_*`（西方陵寢、三層、不見天光）。規格：`_tomb_mon_spec.md`。

**第一層・前廳與石棺廳**
```
arch_warden        拱廊守衛
sarcoph_crawler    石棺爬行者
slab_creeper       石板匍匐者
kneeling_penitent  跪拜的懺悔者
chain_hanged       鎖鏈吊屍
iron_maiden        鐵處女
```
**第二層・納骨堂與唱詩席**
```
ossuary_rats       納骨鼠群        ossuary_wheel   納骨輪
choir_organ        唱詩管風琴      choir_pale      蒼白唱詩者
bellfounder        鑄鐘者          grave_censer    墓香爐
candelabra_fiend   燭台魔          reliquary_hand  聖匣之手
spiral_veil        螺旋帷幕        shroud_widow    裹屍寡婦
```
**第三層・深墓**
```
crypt_centipede    地穴蜈蚣        crypt_hound     地穴獵犬
twin_skull_hound   雙頭骷髏犬      vault_bat       穹頂蝙蝠
skull_cairn        顱石堆          pall_bearers    抬棺列
tomb_bear          墓熊            pallid_stag     蒼白牡鹿
gorge_toad         深喉蟾          stone_adder     石蝰
```
⚠ 上面的**分層是我依名字與 spec 的三層結構推的**，不是 Ray 交代過的 —— 要照原設計請他確認。
⚠ 中文名同樣是我暫譯，**以 Ray 的命名為準**。

### 貝利薩爾古堡・王座間（2 隻）
```
dragon_throne_awakened   王座徘徊者・甦醒
dragon_throne_roar       王座徘徊者・咆哮
```
⚠ `config.js:4123` 已註明「那三張仍在庫裡沒有人用」—— 現在線上的
`enemy_bl_dragon_throne` 指的是 `mon_dragon_v1_unsealed`，不是這三張。
**要不要換、怎麼分型態，是設計決定，我不動。**

## 三、數值：全部先抄**王座徘徊者・追擊型態**

Ray 指定的暫代值。那張卡在 `script/enemies.js`（戰鬥卡在 `config.js` 的 `battles.bl_throne`，
`enemy:'bl_dragon_throne'`）—— 程式端整列複製過來即可，逐隻的數值等 Ray 後續給。

## 四、⚠ 接線要兩邊一起（漏一邊都是沉默的失敗）

同 `config.js` 聖遺物系那一段的但書：

1. **`ASSETS` 登記圖的路徑**（`enemy_<key>: "resources/enemy/mon_<key>.webp"`）
2. **戰鬥卡／刷怪池真的用到它**（`enemy:[…]` 或 `wildSpawn`）

只做①＝多載一批圖但遇不到（26 張約 **10 MB**，會進開機第二段預載，手機冷啟動白背）；
只做②＝`asset()` 回空字串、怪沒有立繪，**而畫面上不會有任何錯誤訊息**（-929 那隻教堂 Boss 踩過）。

⚠⚠ 所以**沒有要馬上讓玩家遇到的話，`ASSETS` 那一段先註解著**（照聖遺物系的作法），
卡可以先建在 xlsx／`enemies.js` 裡。
