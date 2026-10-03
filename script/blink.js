/* ══ 立繪眨眼補丁表 —— **機器產生，不要手改**（tools/blink_build.py）══
   鑰匙＝立繪檔名（去副檔名、去 ?v=、轉小寫）；值＝兩格補丁在**原圖像素**的框 [x,y,w,h]。
   補丁檔：resources/si/blink/<鑰匙>_half.webp／_closed.webp。
   引擎（modules/story.js 的 blinkBind）只認這一張表：表上有的立繪就會眨眼，沒有的不動。 */
export const BLINK = {
  "renna_si_front": {"half":[482,101,96,45],"closed":[479,101,100,51]}
};
