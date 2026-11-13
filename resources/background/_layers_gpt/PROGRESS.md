# GPT 預處理（11-11 凌晨）
## 作法
- 戰地（北泊室外 6／西泊 81）：天空、雲、煙挖成純洋紅 #FF00FF，火焰拿掉、被遮處補畫（檔名 __cut）
- 室外地圖：天空與雲（含雲海）挖成洋紅（__sky）
- 夏爾森林：只留樹葉，其他填洋紅（__leaf）
- 原圖在 _src/，成品在 out/<地圖>/；北泊室內 7 張（教堂、市政廳、雜貨、公會、槍店、旅店、酒館）沒有天空，跳過
- 驅動腳本 gpt_setup.js（貼進 ChatGPT 頁面用）
## 11-11 23:00～11-12 00:10 補完（Claude 背景線）
- 天空（29）＋羅賽爾廢城（48）全部做完，放在 out/<地圖>/<key>__sky.png。
- 提示詞改成「只把天空和雲變洋紅，不要補畫、不要新增」（Ray：不准 inpaint）。
- 洋紅 0～3% 的幾張是本來就幾乎沒有天空的場景（鏡湖水蝕洞、羅賽爾 cistgrave／ossuary／souterrain／treasury 等），當室內處理。
- 戰地 __cut 是舊指令（拿掉火、補畫）做的，裡面有 GPT 補畫；只能拿它的洋紅範圍用，不能用它的畫面。
## 還沒做
- 無

## 11-13 換機交接（背景線）
- 已交件：見 `resources/background/anim/TO_CODE_bg_anim.md`（程式端照表接；美術不碰程式）。交件紀錄 `tools/anim/bg_layer/state/delivered.json`。
- 工具：`tools/anim/bg_layer/`（sep_run.py 主流程、deliver_sep.py、make_review.py…）；新機器放回 `ComfyUI-master/tivot_wan/bg_layer/`，
  `state/` 底下的 notes、delivered.json、review.json、set_*.json 放回同層。雲九宮格在 `tools/anim/bg_layer/clouds/`（sep_run 的 DL 指那裡，換機要改路徑）。
- GPT 預處理（摳天空／去火／去煙）都在本資料夾 `out/<圖>/`；原圖在 `_src/`。
- 沒帶過去的：ComfyUI 的 Wan 輸出（bgl/*）與 bg_layer/out/*（成品中間檔），新機器要重跑才有。
- 還沒完成（審閱頁剩 19 格，意見在 state/review.json）：
  · 等 Ray 圈遮罩（set_mask1113）：湖岸人影＋水紋不回放、門庭火、西壕火把、王座廳影子、前廳門；階梯廳／後廳／沙龍／古墓燈／馬車房只動圈的。
  · 已重跑待看：沼澤獻祭處（不回放）、獻祭處／林間空地（剪掉移鏡）、瀑布底（K=60）、星象室（天體球轉一圈）。
  · 跑中：硝坑、corridora 不提火重跑（fix8b.sh）。
  · 未做：排水崖「遠山拿掉」（要 GPT）、羅賽爾石塚「不要有火只拆天地」。
  · 戰地遠中近雲九宮格（cloudgrid_far/mid/near）已遺失，戰地重開前要 GPT 重出。
