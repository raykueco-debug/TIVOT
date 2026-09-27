# 索拉娜 alpha 夾第二批（2026-09-27，Windows 美術 session）—— 24 張換臉

Ray 把 24 張白底 PNG（SD／GPT 臉）丟進 `resources/si/alpha/`，一句「給辦了」。
原 PNG 已移進 `resources/_originals/si/sorana_si_<鍵>_src.png`，被覆蓋的舊檔走 `tools/recycle.sh`。

## 作法：24 張全部是「只換臉」，alpha 一個位元都沒動

逐像素量過（README 的第一步）：**每一張的改動像素落在 `α<200` 的都是 0**
（`scare` 2 px、`worry` 8 px，羽化權重在那裡是 0，等於沒用到）。
⇒ **沒有跑 matting**。輸出的 alpha 與底圖**逐像素相同（max 差 0，24 張都驗過）**。

- 新 RGB 只用在「改動區外擴 16px、σ=6 羽化」之內，再乘 `w=clip((α−200)/55)`；
  其餘沿用底圖像素 ⇒ 身體不會因為重取樣變糊。
- ⚠ **`laughbig`／`blush`／`sad`／`whisper` 四張是 1536 高、底圖 1535**：
  不是位移，是**被垂直拉長 1px**（裁上／裁下都對不上，縮回 1535 之後改動只剩臉、`α<200` 為 0）。
  已縮回底圖尺寸再合成。
- ⚠ `furious` 是 1528 高：底下 7 列沿用底圖。
- 編碼 q92／alpha_quality 100／method 6（第二代，同 §七 battlecry 那一批）。

## 驗收（`_sorana_check.py` 的前三項；第四項「與 A 差」的基準圖這台沒有）

23 張全過。**`relief` 色相 231.1 ⚠** —— 那是**底圖本來的**（09-20 版、今天剛依 Ray 指示回滾的那張，本身 238.5），換臉後反而更接近。不修，照實報。
臉部 100% 深色棋盤並排看過：無接縫、髮緣與耳環不變。

## ⚠⚠ 程式端要接（`script/speakers.js` 的 sorana 那一段）

**取景值一律沿用現行**（alpha 沒動 ＝ 身體沒動，憲法 -649「同一個姿勢直接沿用」）——
`measure_si.py` 自動量的 `fx` 在幾張上差很多（`wave` 0.374、`watch` 0.577），那是臉部偵測不準，**不要照抄**。

### 同名覆蓋：只跳版號（20 條）

| 鍵 | 現行 | 改成 |
|---|---|---|
| blush／idea／lauaghbig／lookaway／nod／point／sad／salute／scare／serious／sorry／surprise／talk／watch／wave／worry | `?v=2` | `?v=3` |
| side／whisper／relief | `?v=3` | `?v=4` |

⚠ `flight/index.html` 也有 sorana 的登記：`side`（`sorana` 本尊那一行＋5459 行）、`surprise`（5467）、`sorry`（5491）、`watch`（5524）、`nod`（5537）—— **同樣要跳**。

### 換了身體的（2 條）

- **`stare`** —— Ray 這一張是畫在 **`serious` 的身體**上 ⇒ 路徑跳 `?v=3`，**取景改抄 `serious`**：`top:6 bot:1524 fx:0.576`
- **`furiouscute` → `furious`** —— 工作樹裡 `sorana_si_furiouscute.webp` 已被改名成 `sorana_si_furious.webp`（位元組相同，**不是美術改的**），這次的新臉蓋在 `furious` 上。
  ⇒ `furiouscute` 那一行的 `src` 改指 `resources/si/sorana_si_furious.webp`（新路徑，不必 `?v=`），取景照舊 `top:9 bot:1527 fx:0.474`。
  鍵名要不要跟著改成 `furious` 等 Ray（腳本裡用 `furiouscute` 的地方要一起換）。

### 新鍵（3 條）

    ideasmile:     { src:'resources/si/sorana_si_ideasmile.webp',     top:3, bot:1525, fx:0.523 },   // 照 idea
    lookawayupset: { src:'resources/si/sorana_si_lookawayupset.webp', top:4, bot:1522, fx:0.610 },   // 照 lookaway
    taunt:         { src:'resources/si/sorana_si_taunt.webp',         top:7, bot:1528, fx:0.514 },   // 照舊的 stare（身體就是它）

## ⚠ 名字：`laughbig` 蓋在 `lauaghbig` 上

Ray 的檔叫 `laughbig.png`，身體就是 `lauaghbig`（縮圖差 0.1）⇒ 當成同一張的新臉，**交件名維持 `lauaghbig`**
（`speakers.js` 註明「拼法照稿，不要修正」）。要改成另開一個新鍵的話跟我說。
