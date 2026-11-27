/* ══ 這台是不是低階機（ver -3127 效能副理，Ray 11-28：「照這個分級走」——最低規格＝Realme RMX1851：穩定能玩、可以降畫質）══
   判準只有這一支（鐵律 7）：所有「低階機才降」的地方一律問它，不要各自去讀 deviceMemory。
   · 手動指定優先：localStorage `tivot_lowspec_v1` ＝ '1'（當低階機）／'0'（當一般機）—— 給 Ray 在手機上對照用。
   · 自動：`navigator.deviceMemory <= 4`（Android Chrome／WebView 才有；iOS 沒有這個欄位 ⇒ 一律當一般機）。
   ⚠ 只在第一次問的時候算，之後讀快取（同一趟遊戲不會中途換手機）。葉節點：不 import 任何遊戲模組。 */
const KEY = 'tivot_lowspec_v1';
let cached = null;
export function lowSpec(){
  if(cached !== null) return cached;
  let v = null;
  try{ const o = localStorage.getItem(KEY); if(o === '1') v = true; else if(o === '0') v = false; }catch(_){}
  if(v === null){ const m = (typeof navigator !== 'undefined' && navigator.deviceMemory) || 0; v = m > 0 && m <= 4; }
  return (cached = v);
}
