# HANDOFF — 截至 `ver 2026.09.22-1958`（10-04，Windows 3070，程式 session）

> **-1958**：阿瑞尼斯神父 11 句台詞原本全是 `arh(null,…)` → 一直顯示 -582 的舊底圖；改成逐句指定 -1509 那六張新差分（表情是我配的，Ray 可再改）。

> **-1957**：雪都教堂背景在手機上不出現 → `bg:'Varn_Church'` 改成小寫 `varn_church`（靜態空間分大小寫）。已掃全庫，只有這一處大小寫不符。

> ⚠⚠ **交接規則（Ray 10-04 定）**：
> 1. 開工讀交接 → **逐項清點上一份的「完成／未完成」**，給 Ray 確認。
> 2. 確認後**生成新交接、刪掉舊交接**（舊的走 `tools/recycle.sh`）—— 這個檔**只留一份現況**，不往下疊。
> 3. 已完成、已定案、Ray 說移除的，**不要再抄進新的一份**。
> 舊交接全文：git `1a059078`，以及 `_recycle/HANDOFF.md`。

## 現況
- 分支 `claude/standing-art-blink-animation-ub7vw7` ＝ origin/main ＝ ver -1956（本機的 `main` 分支比較舊，不要從它開工）。
- 本機 server：`py -X utf8 tools/devserver.py`（8200 埠；不加 `-X utf8` 的話，中文 Windows 主控台會因為編碼錯誤直接退出）。
- 眨眼（GPT 合成版）已收工：表上 331 張。流程寫在 `tools/blink_gpt.py`／`tools/blink_build.py`，驗收開首頁「眨眼」鈕（管理人限定）。
  省額度：成敗只看「產生的圖片」張數，不看頁面文字；有圖就收，0 張才在原串補一句重送。
- 這台還沒 commit、也**不要 commit** 的：`resources/_HANDOFF_ART_20260925.md`（美術的）；`tools/_blink_base/`（已在 gitignore，重建眨眼表要用到它）。

## 未完成

**眨眼**
- ⚠ `sorana_si_carrynouvelleshock` 欠：雙人圖，要先在 `tools/blink_eyes.txt` 手動給眼框（Ray 沒點名）。
- 之後要做：飛行頁 canvas 眨眼、手機實機量發熱（鐵律 12）、路線 B 髮梢擺動。
- ⏸ 呼吸與微晃（路線 A，-1934）：commit 在 3060 本機、沒推上來，等 Ray 看效果。

**背景雷同修正（美術進行中，Mac 美術 10-04 交給 3070 美術）**
- 414 組背景審過，9 組要改（西恩納式條紋大教堂、柏林勝利紀念柱、柏林大教堂綠圓頂、〈沉思者〉銅像、可讀盧恩、羽飾聖物、真實商號招牌、亂碼德文）；其餘 405 組 ✔ 不欠（理由在審查表）。
- 工單與逐組提示詞：`resources/background/_similarity_audit_20261003.md` 下半部。帝都 cityhall／church 改完先給 Ray 看再衍生時段。
- ⚠⚠ **程式端要接**：9 組是同名覆蓋，美術交件後由程式 session 跑 `py -3.11 tools/bust.py --bump`（改了哪幾張看工單每一列的 ✔）。

**程式端要接的**
- 峽谷 `canyon` 的小地圖 `map:{img,spots}` 還沒接（湖區已接）。整段可以照抄的內容在 `resources/map/_minimap_worklist.md` 末段。

**等 Ray**
- 被刪掉的 33 張圖（git 刪除、沒有替代檔）：**10-04 已從 git 取回、放進 `_recycle/` 留底，沒有還原進遊戲**。拼好的縮圖是 `_recycle/` 那一批；之後要不要還原哪幾張，由 Ray 決定。
- 廢城 `hallcourt` 這張圖：正門照設定應該被堵死，但圖裡碎石只擋了一半，看得到門後的通道。要不要重出圖由 Ray 決定（重出是美術的活）。
- 廢城祭壇 `_lit` 點亮版：**程式已經接好**（`script/town.js` 的 `DM_LIT`，每一格祭壇那一段演完就插旗、換背景）—— 待命，不必再做。
- `resources/illustration/023_anyacottoncandy`／`024_nouvellesmile` 沒有腳本引用；`032_rennablush` 插圖還沒交。

## 已結案（不要再列）
惡棍六人敵卡、冒險者裝與安雅重畫（第 28～35 項）、賽西莉 `fluster`、按鈕避開動態島、聖徒系列敵卡、米夏隨從（`cm:176`）、`_TO_CODE_20260922.md`（已回收）。
