# HANDOFF — 回收區／戰鬥分級／主武器九星／難度下修 ver -696〜-731（2026-09-01，全數已 push）

> 前一份（-539〜-564：破防計量、換槍鈕、紅點觸碰）已被本檔取代；
> 檔尾的「教訓／快速測法／背景待辦」是**沿用**的，不隨版次汰換。

## 這一批做了什麼

### 1. 回收區（-696）
`_recycle/` ＋ `tools/recycle.sh` —— **本專案唯一的刪除出口**。
任何 session 要拿掉或**覆蓋掉**檔案一律走它，不准 `rm`、不准就地蓋掉。
保留原相對路徑、同名加時間戳、每筆記進 `RECYCLE_LOG.tsv`（**那份紀錄入版控**）。
⚠ 它與 git 不重疊：git 只保護 commit 過的，回收區保護**還沒 commit 的那一段**
（起因是 Ray 一張沒進過版控的諾薇兒 OBE 不見了，git 完全幫不上忙）。

### 2. 戰鬥分級與回檔（-697／-698）
Ray 定案：「遭遇戰、非劇情戰都用原則；劇情戰都用手動回檔點」。
- **回檔＝讀一份完整快照**（`save.loadLatest`）——所以「回去之後是初見還是二見」
  由快照裡的旗標回答，不必判斷。ver -430 的「再戰＝跳回那一幕第 0 句」已推翻。
- 落點：遭遇戰**引擎自動**（進城／有戰鬥的段落演完）；劇情戰**腳本明寫** `checkpoint:true`，
  而且那一點必須落在「主角仍可自由行動」處。
- 防卡死：遭遇戰**連敗三次抬回旅店**（`main.carriedToInn`，先回檔再放人）；
  劇情戰靠落點規約。特殊戰（`battles[].special`）**一次就送旅店、不回檔**。
- 非劇情戰死亡**回這張地圖的入口**（進度照留，只有位置回入口）。
- 詳見憲法 §6.5.2 的新表。

### 3. 主武器：迦尼米德雙槍（-699〜-701、-707、-712、-714）
- `config.mainGun`：一張卡、兩個 barrel（**固有武裝**，不可更換），各一個**掛件槽**。
- **九階強化＝水瓶座九顆星**（`config.gunStars`），非線性、玩家自選。
  累計加成只有 `progress.starBonus()` 一個查詢點；九個效果各接在既有的唯一計算點上。
- 兩條路：**素材收集**（槍店改裝頁）／**特殊事件**（腳本 `gunStar:'<星id>'`）。
- **副武器改裝**（`tuning.weaponMod`）：每階 +20%、最高五階、**只收錢**，
  費用＝槍價 ×[0.5,1,1.5,2,3]；⚠ **第 5 階不加數值，換成特殊能力**（`weaponPerks` 先空著）。
- 改裝頁分**主武器／副武器**兩個子分頁；整備頁可點開看九星現況（唯讀）。

### 4. 三級防禦改寫：難度下修（-706、-709）
卡上一張 `bands` 表講完三帶（`counter`/`dmgPerHit`/`dmgScale`/`dmgRoll`/`hit`/`take`），
`config.weaponBand` 是唯一的解讀點。舊欄位 `defenseDamageScale`／`perfectDmgPerHit`／
`noPerfectBand` **全部退役**。

| | 黃圈 | 橘圈 | 紅圈 |
|---|---|---|---|
| 霰彈 | 反擊・每發 0/1 各半・免傷 | 反擊・半額・免傷 | 反擊・全額・免傷 |
| 機槍 | 反擊・命中 30%・免傷 | 反擊・命中 70%・免傷 | 反擊・命中 100%・免傷 |
| 狙擊 | 不反擊・挨 1/2 | 不反擊・挨 1/4 | 反擊・全額・免傷 |

⚠⚠ **這一次改動連環害了四次**，全部同一個形狀：舊邏輯掛在「反擊」上，
而反擊從一帶變成三帶。憲法已立「完美反擊只有紅圈」一節，**新增任何「反擊時 X」
之前先回答：這是完美反擊才給，還是開火就給？**

### 5. 語音一批（-711）
12 支 `.wav` → m4a，逐支嵌到對應場合（托爾斯滕破防1/2交互・MB・處決／
諾薇兒聖徒化・OBE・即死防禦・生命歸還／安雅惡夢化・夢境粉碎・熔斷・明晰之夢）。
⚠⚠ **語音的 `fileGain` 要過完 `voiceChain` 才量** —— `tools/audio_scan.html`
量的是原始波形，對語音系統性低估約 5 dB。這一批是以已校準的
`vo_torsten_dualcrush`（2.482）當錨換算的。

### 6. 好感度（-723／-724）
上限 **100**、每 **20** 一個 tier、所有給好感的地方 **×2**。
等第→好感的表在 `config.rating.affection`：搭檔 S+2/A+1、索拉娜 D+2/C+1、蕾娜 S+0.5/A+0.25。
⚠ tier 寬度在**三個地方**各有一份（`progress.TIER_W`／`flight/index.html` 的 `progTier`／
`flight/talks.js` 的 `AFFECTION_BANDS`），三邊註解已互指。
⚠ 順手修好「地板預設 1 但好感預設 0」——那會把第一次的 +0.5 拉成 1，A 與 S 分不出來。

### 7. 惡夢化收尾（-719、-730、-731）
- NI 清盤要播 **MB 的 cut-in**（-675 只做了傷害與旗標，演出漏了）。
- 夢境粉碎的閘門**真的會等玩家上滑**：`niBurstPending()` 要連**開著的**那個閘門一起算，
  不然熔斷會在同一次抽血裡搶先發生（症狀長得像「沒有暫停」）。
- **熔斷就是 OBE**（Ray 定案）：SI 推滿 ↔ NI 抽乾是同一個結局的兩個方向。
  畫面字 **DREAM AWAKE**；CI：SI 本篇＝`CI_Nouvelle_OBE`、NI＝`CI_Anya_OBE`。

### 8. 其他
- 失誤／紅點解決之後**指一下正確的格子**（`tuning.hintNextCell`，兩個呼叫點同一支）。
- 打靶加**棄權鈕**（只在計時挑戰出現，走 `storyBattleEnd(true)` 的既有出口）。
  ⚠ class 要掛在 `startGame` 的 `stopAll()` **之後**。
- **EXP 先不顯示**（`rating.showExp:false`，機制照算）。
- 首頁拿掉「商店」與「story」兩顆鈕。
- 教學：地宮聖徒戰的反擊教學改成「先叫他點掉、點完才講傷害」，
  拿掉「太早了」與武器切換那兩段；**黃圈也算過關**。
- 帝都賞金獵人 `noEval:true`（那時蕾娜還沒開始評價）。
- 安雅立繪 `cm:152 + standCm:162`（她那張畫的頭身比較大）。
- ⚠ **璐娜莉亞的 `standCm` 曾被寫兩次**（176 與夾帶進來的 110），JS 取後者 ——
  她從 -653 起每一張立繪都沉了約 290px。**重複鍵不會有任何錯誤訊息**，
  改立繪資料時記得 grep 一下。

## 這一批留下的缺口（要 Ray 的東西）

- **強化護符**：管線全通（`cat:'charm'`、掛件槽、`combat.mainGunDmgMul`），
  但 `items.defs` 一張都沒有 —— 等卡。格式：
  `charm_xxx:{ name, cat:'charm', price, charm:{ dmgMul:1.05 }, desc }`
- **九星的素材配方**（`config.gunUpgrade.recipes`）目前是我擬的草案，等 Ray 的卡。
  「部分關鍵素材由劇情控制產出」那幾樣也還沒填。
- **副武器第 5 階的特殊能力**（`tuning.weaponPerks`）：Ray「先留槽，我還沒想好，
  應該是類似雙槍的掛飾但是固定不可換」。
- **北方泊地的入口那一格有戰鬥**（`entrance.acts[0]`），違反「入口不會有戰鬥」；
  目前靠「連敗三次抬回旅店」兜底，`script_lint.py` 會出一條 warn。
- **戰敗結算的「Counter 反擊」列**印的是 `counterFired`（三帶）＋總傷，
  標題卻用紅圈的名字。要改成只算紅圈、或改標題，都會動到三個語系的字串。
- `vo_nouvelle_obe` 是 **10.6 秒**，其餘 11 支都在 1.1〜2.0 秒 —— 想確認不是放錯檔。

## 教訓（沿用，逐字遵守）

1. **「不准再自己發揮，嚴格用我給的形狀跟位置，1 pixel 都不准差。」** 他給圖就是規格。
2. **「做之前先跟我確認。」** 對圖有任何一處看不懂，先問再動手。
3. **改完必須在瀏覽器實測再交**。
4. python 替換程式碼時**錨點必須唯一**。
5. ⚠⚠ **改了一個機制之後，去問「誰掛在它上面」**（-696〜-731 的最大教訓）。
   -706 把三帶都改成會反擊，接著連環出了四個 bug（黃圈還是受擊／明晰之夢亂發動／
   完美反擊灌水／黃圈教學不放行）—— 每一個都是舊邏輯掛在「反擊」上，
   而那個詞的意思被改掉了。**改語意的那一版，就要把所有讀它的地方掃一遍。**
6. ⚠ **重複鍵不會有錯誤訊息**：物件字面同一個鍵寫兩次，JS 靜靜取後面那個
   （璐娜莉亞的 `standCm` 沉了 75 個版本才被發現）。改資料前 grep 一下。
7. ⚠ **jsc 的語法檢查會把 `import` 剝掉**，所以查不出重複 import 之類的錯 ——
   **以瀏覽器實測為準**（`progress.js` 重複 import `inv` 就是瀏覽器抓到的）。
8. ⚠ python splice 用「起點索引到終點索引」時，**先確認中間沒有別的東西** ——
   `loot.js` 那次連 `cfg`／`TABS`／`pick`／`cart` 一起刪掉了。

## 快速測法（瀏覽器 console）

```js
Promise.all([import('/state.js'), import('/modules/combat.js')]).then(([st,combat])=>{
  window.__st=st; window.__combat=combat;
  document.getElementById('home').classList.remove('on');
  combat.startScriptBattle('flight_pirate',{story:false});
});
// 等 1.5 秒後：
__combat.pauseForDialog(); __st.state.energy=85; __st.state.combo=13;
window.dispatchEvent(new Event('resize'));   // 觸發 layoutClasp + updateEnergyClasp
```

## 背景待辦（沿用中）

- ⚠⚠ **多語種整批留到最後做**（ver -726，Ray：「多語種等全部完成再做」）——
  在那之前**只維護繁中**，英日的落差先記著、不要逐版追。已知的落差：
  - **`tutorial.story`（地宮聖徒戰・諾薇兒全程那一份）只有 `i18n/zh.js` 有**，
    `config.js` 沒有 fallback → 切到 en／ja 時 `tut.story` 是 `null`
    （`i18n.js` 的那一行 `L.tutorial.story ? … : null`）。
    正解是把 zh 那一份搬進 `config.tutorial.story` 當預設，i18n 只做覆寫。
  - 逐版改的台詞（-710 的「太早反擊」那三處、-726 的反擊教學）en/ja 有些跟不上。

- **交叉雙槍兩張圖**（`resources/vfx/42452231-….png` 彩色、`resources/background/42452231-….png`
  黑剪影）：Ray 說「另有用途」，**用途還沒講** —— 下次問清楚再接，先不入版控。
- stage2 羽蛇「戰鬥結束」戲（Sturm／Deck_Chaos／著水）等 Ray 的 stage2 稿與素材。
- ~~Northport_Entrance_BF~~ **已接**（ver -565）：北方泊地最小城鎮骨架 ——
  降落鈕（flight SETTLEMENTS `town:'northport'`）→ 入口一格（背景已轉 webp）→
  出航回大地圖（`TOWNS[].sailFrom` 出港位，main.js sailOut 寫回程鑰匙；
  出港位 (1480,190) **暫定**）。其餘節點/店家/對白等 Ray 的稿。
- 羽蛇卡的「戰鬥結束」戲（Sturm／Deck_Chaos／著水）：Sturm.m4a 已在，
  **缺 Deck_Chaos 背景圖與 stage2 觸發稿**。
- `vo_lunaMG.m4a` 還躺在 `resources/audio/se/`（該搬 `vo/`，等 Ray 點頭）。
- 蜈蚣／空賊的稀有度暫定 E（卡還沒給）。
