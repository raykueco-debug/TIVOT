/* 試玩判定的本體（ver -3113）：`progress.isDemo()` 與 `i18n.js` 的語言判定都問這一支 ——
   i18n.js 不能 import progress（progress → scriptTr → i18n 會循環），所以本體放在這個葉檔。
   ⚠ 遊戲端仍一律問 `progress.isDemo()`；這一支只給 i18n 這種 import 不到 progress 的地方。
   ⚠ 刻意不寫進 build.js：那一支在 dist/demo 是打包腳本改寫的獨立複本，只放建置旗標，不放邏輯。
   建置設定仍讀 build.js 的 BUILD.demo（dist/demo 打包時被換成 true）；開發機可用網址 `?demo=1` 臨時切成試玩版。 */
import { BUILD } from '../build.js';
let _v=null;
export function isDemoBuild(){
  if(_v==null){ let q=false; try{ q=/[?&]demo=1(?:&|$)/.test(location.search); }catch(_){} _v=!!(BUILD && BUILD.demo) || q; }
  return _v;
}
