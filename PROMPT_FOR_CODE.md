美術 session（ver -1556）交三件給你，細節都在檔案裡，不用問我。

---

## 一、索拉娜 12 張立繪已經同名覆蓋上線 → `script/speakers.js` 要接

**完整工單：`resources/si/_sorana_program_worklist.md`**

1. **這 12 個檔的路徑要掛 `?v=2`**（目前都沒有 `?v=`，同 `renna_si_scream` 的寫法）。
   不掛就是玩家永遠拿舊圖，**而且畫面上不會有任何錯誤訊息**（§5 的 -650）。

   ```
   sorana_si_cry  determine  eat  lookaway  nod  point
   sorana_si_sad  salute  serious  stare  wave  worry
   ```

2. **`top`/`bot` 改成下表**（美術量的 alpha 上下緣）：

   | expr | top | bot |  | expr | top | bot |
   |---|---|---|---|---|---|---|
   | cry | 5 | 1515 | | salute | 12 | 1525 |
   | determine | 11 | 1523 | | serious | 7 | 1523 |
   | eat | 2（不變） | 1528 | | stare | 7 | 1527 |
   | lookaway | 5（不變） | 1521 | | wave | 9 | 1526 |
   | nod | 7 | 1527 | | worry | 5 | 1519 |
   | point | 10 | 1522 | | sad | 4 | 1527 |

3. ⚠⚠ **`fx` 一律不要動。** 新圖是照舊圖的姿勢重畫的（同姿勢沿用，§5 的 -649），
   而且 `salute` 與 `wave` 的 `fx` 本來就是**目視手調**過的（註解寫著「量到 0.596 / 0.342」）
   —— 那兩張手臂抬高，自動量到的框含手臂，照量到的改一定歪。
   真的覺得臉沒對準，動**角色層的 `fxShift`** 不是 `fx`（§5 的 -645）。

## 二、`crybig` 是新的 expr 鍵

`resources/si/sorana_si_crybig.png` 是 Ray 自己產的（真 alpha、髮色 198.8°）。
`sorana.expr` 目前**沒有這個鍵**，要新增一個 —— **`cry`（一般哭）與 `crybig`（大哭）並存，不是取代**。
⚠ 那個檔還是 `.png`，要先轉 webp（`cwebp -q 85 -alpha_q 100`，小寫檔名）。

## 三、怪卡：28 隻要建，依出沒地分

**完整清單：`resources/enemy/_enemy_card_intake.md`**

- 怪圖 80 張裡，52 張已接進 `config.js`／`script/town.js`，**28 張只躺在資料夾**。
- **伊甸古墓 26 隻**（配 `Tomb_*` 背景）＋ **王座間 2 隻**（`dragon_throne_awakened`／`_roar`）。
- **數值：全部先抄「王座徘徊者・追擊型態」**（Ray 指定的暫代值）。
  那張卡在 `script/enemies.js`；戰鬥卡是 `config.js` 的 `battles.bl_throne`（`enemy:'bl_dragon_throne'`）。
- ⚠ 清單裡的**三層分區與中文名是美術推的**，不是 Ray 交代過的 —— 動手前跟他確認一句。

⚠⚠ **接線要兩邊一起，漏一邊都是沉默的失敗**（同 `config.js` 聖遺物系那一段的但書）：
① `ASSETS` 登記圖路徑 ② 戰鬥卡／刷怪池真的用到它。
只做①＝多載約 10 MB 卻遇不到（會進開機第二段預載，手機冷啟動白背）；
只做②＝`asset()` 回空字串、怪沒有立繪，**畫面上不會有任何錯誤訊息**（-929 那隻教堂 Boss 踩過）。
⇒ **沒有要馬上讓玩家遇到的話，`ASSETS` 那一段先註解著**（照聖遺物系十隻的作法）。

---

## 收工前

- `python3 tools/bust.py --bump`（**不要用 `sed` 打舊版號** —— 號碼猜錯時 `sed` 會靜靜地什麼都沒做，ver -1461 因此卡了三版）
- `py tools/script_lint.py`
- `git commit -m "…" -- <路徑>`（**帶 pathspec** —— 美術 session 可能有 staged 的東西，不帶會被一起吞進去）
