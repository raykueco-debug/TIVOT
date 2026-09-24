# 美術 session 交接 — 2026-09-25 凌晨（Windows 那台收工，換機器）

> 開工第一件事讀這一份（憲法 §0.1）。上一份 `_HANDOFF_ART_20260924.md` §七～§八 與工單 `si/_misha_program_worklist.md` 附三～附三之五是這一輪的細節。

## 一、⚠⚠⚠ Ray 這一輪定的產線規則（下一個 session 照做，寫進憲法 §5）

1. **只改表情的差分，直接用 GPT 的整張輸出，不做本機拼接**（Ray：「效率太低了 而且你的 token 比較貴 只是改表情的話給 gpt 做更划算」）。
   9/24 那條「GPT 表情差分會整張重畫、不要整張採用」**被這條覆蓋**：瀏海微變的代價，Ray 接受；美術 session 的 token 比較貴。
   本機只做 **GPT 做不到的幾何修正**（例：刀身拉直、只換刀柄拼回）。
2. **同一個 ChatGPT session 失敗兩次就換**，不在原串盧第三次。
3. **局部修改不要拿有問題的原圖回去餵**，用 `front` 當底整張重畫（原圖的錯結構會被一路繼承）。
4. 刀長要用「長刀」＋「強透視」構圖才畫得出來（平貼畫面的橫刀 GPT 永遠畫短）。
5. 護弓：海軍軍刀往外鼓的 D（畜生道設定圖），**在刀刃側**，老舊黃銅扁條，每一則都附 `weapon/chikushoudou.webp` ＋ 護手局部裁圖。
6. 本機修圖：Ray 說「刀身彎了」＝刀身自己彎，先轉水平看；「稍微」＝個位數像素。

## 二、交件現況（`git log` 可複驗，全部已 push）

| 檔 | 狀態 | 程式端要接 |
|---|---|---|
| `si/misha_si_draw.webp` | ✔ Ray 自己出的拔刀圖（護手定案）＋ 本機刀身拉直 1.8 px | `speakers.js:1486` `?v=2→3`，**取景值 top:6 bot:1534 fx:0.434** |
| `si/misha_si_drawopen.webp` | ✔ 新 draw ＋ GPT 攻擊性張嘴（咬牙露齒瞪視），眉眼嘴拼回 | `speakers.js:1498` **加 `?v=2`**，取景值同 draw |
| `_originals/si/misha_si_drawclose_src.png` | 未入庫：新 draw ＋ 攻擊性閉嘴 | 用途等 Ray（換掉 draw 的臉／另開鍵） |

其餘米夏檔沒動。`_originals/si/` 這台有：`misha_si_draw_ray_src.png`（Ray 原圖）、`_bladefix_src.png`（拉直母版）、
`drawopen/drawclose` 的 GPT 整張與拼接母版、`draw_guardfix_*`（v1～v8 的過程）、`draw_newsession_v1~3`。**`_originals/` 不入版控，換機器帶不走。**

## 三、⚠ 等 Ray 決定的

1. 閉嘴攻擊版的用途。
2. `front` 與 09-23 那五張（`stare`／`order`／`side`／`guard`／`salute`）的護手仍是亮金圓管大圓弧，只有 `draw` 是畜生道規格 —— 要不要全套換。
3. `draw` 刀長 ≈ 身高 0.63（規格 0.66～0.74，略短）。
4. 刀長不合格 7 張（`_misha_sword_lock.md` §四）要不要重畫。
5. 09-24 交接 §三那批 untracked 檔（`anya_si_nod.png`、`renna_si_hug*.png`）—— 這台沒有，在 Mac。

## 四、下一個要做的（米夏）

- `close` 自然站姿（重心單腳、手搭刀柄）→ 以它為底重做 `closeopen`。**這台與 Mac 都沒有** `_originals/si/misha_si_close_natural_src.png`，要重新向 GPT 要。
  照規則 1：表情差分整張採用；照規則 5：附畜生道圖鎖護手；收件量刀長（`_misha_sword_lock.md` §三）。

## 五、ChatGPT 串（對話在伺服器端）

| 串 | 內容 |
|---|---|
| `https://chatgpt.com/c/6ab54b89-2c30-83e8-b09c-3bf1668b34f3` | 新 draw 白底在第一則；出了嚴肅張嘴／閉嘴、攻擊性張嘴／閉嘴各一 |
| `https://chatgpt.com/c/6ab54481-5000-83e8-9250-66d8cbcd9357` | 用 front 重畫拔刀的三張（都不合格，Ray 之後自己出） |
| `https://chatgpt.com/c/6ab538d4-7dc4-83e8-a53d-8b8f0f3f3450` | 舊 draw 修護手 v1～v8（作廢，留紀錄） |

## 六、這台（Windows）的產線備註

- Claude in Chrome 連 **Browser 1（Windows）**，`file_upload` 可用；ChatGPT 帳號 Ku Ray（Go）。GPT 圖用 `fetch→blob→a.download` 落 `~/Downloads`。
- ⚠ **附圖與文字要同一則送**：`file_upload` 後立刻 `btn.click()` 會把圖單獨送出（文字留在框裡）；等送出鈕可用、框裡有字再點。
- ⚠ 抓圖：DOM 裡附件縮圖排在最後，1024×1536 計數不會因新圖增加 —— **用 blob 大小排除已下載過的版本**，生成完（stop 鈕消失）還要再等 20～40 秒佔位框才載入。
- `javascript_tool` 單次 45 秒上限，輪詢分段。
- python 3.11、cv2 4.9／skimage／scipy 都在；主控台要 `PYTHONIOENCODING=utf-8`。`.venv-matting/` 在（ToonOut 備案）。
- 交件編碼：PNG 母版 q85、既有 webp 二代 q92，`alpha_quality=100, method=6`（Pillow，這台沒 cwebp）。
