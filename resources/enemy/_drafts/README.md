# 怪物立繪草稿（ver -581）

38 張＋雜魚 2 張。**這個資料夾不入遊戲載入**（底線開頭，同 `_originals`／`_unused`）——
選定要用的再搬進 `resources/enemy/` 並補敵人卡（`config.enemies`）。

## 命名

`mon_<類別>_<特徵>.webp` ／ 雜魚 `mobs/mob_<特徵>.webp`

| 類別 | 張數 | 內容 |
|---|---|---|
| relic | 12 | 宗教聖物系（燭台、鐘、香爐、經文石板、多首祈禱） |
| beast | 5 | 獸型（刃翼、骨甲、六腿、祭壇獸、貝殼教堂獸） |
| sea | 4 | 深海（鮟鱇人、蟹、珊瑚人、溺亡騎士） |
| plant | 4 | 植物（藤蔓獸、菌傘人、花口、荊棘領主） |
| chain | 4 | 白肌枷鎖系（肌肉輪環、多臂塔） |
| demon | 2 | 惡魔（四臂刃魔、黑金死神） |
| brute | 2 | 壯碩型（石柱巨臂、講道壇） |
| 其他 | 5 | spirit 靈狼／ghost 喪面／flesh 器官囊／bug 螳螂／armor 重裝核心 |

## alpha 規格（ver -581 全面整備）

40 張全部通過：**角落全透明、無綠幕溢色、無 <30px 去背殘渣**。

- 綠溢色補救走 `tools/despill.py`（Gemini 綠幕來源的 13 張都修過）。
  ⚠ 溢色會延伸到 **alpha=255 的輪廓內側**，`chroma_cut.py` 的半透明帶去溢色不夠。
- 殘渣清理走 `tools/despeck.py`（只清 <30px 的連通塊）。
  ⚠⚠ **飛散碎片、能量粒子、飄浮小物件是設計的一部分**（bladewing 的冰晶 12112px、
    pulpit 的火星 9834px、glasskeys 的鑰匙 8103px）—— 不可以把「非主體的連通塊」
    整批當雜訊清掉。

## 來源

- ChatGPT：直接產真 alpha PNG。
- Gemini：生不出真 alpha → 畫在純綠底（#00B140）→ `tools/chroma_cut.py` 去背 →
  `tools/despill.py` 去溢色。綠幕原檔在 `resources/_originals/monster_green/`。
- 原 PNG 一律在 `resources/_originals/monster_drafts/`（不入版控）。
