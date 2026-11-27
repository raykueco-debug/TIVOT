/* ══ 建置設定（ver -3073，Ray：「切試玩版出來，分 APK 跟網頁版」）══
   這一支**只有開發機這一份是 false**：`tools/release/build_demo.mjs` 產 dist/demo 時，
   把它換成 `demo:true` 的複本（dist 其餘的檔是硬連結，只有這支是獨立的檔）。
   ⚠ 遊戲端一律問 `progress.isDemo()`（唯一的判定，鐵律 7／8），不要直接讀這裡；
     飛行頁（非 module）讀父頁的 `window.__tivotDemo`（main.js 開機時寫）。 */
export const BUILD = { demo:false };
