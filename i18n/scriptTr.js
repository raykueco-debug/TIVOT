/* ============================================================================
 *  i18n/scriptTr.js — 劇本譯文（ver -1908）
 *  ---------------------------------------------------------------------------
 *  譯文表 i18n/script/<lang>.js（由 `tools/script_i18n.py js <lang>` 從
 *  i18n/script/<lang>.json 產生）＝ { 中文原句: 譯句 }。**只有選了那個語言才載**
 *  （鐵律 13：中文玩家不揹這 250 KB）。
 *
 *  用法：各劇本資料模組在檔尾 `trTree(<匯出的資料>)` —— 在**自己求值的那一刻**
 *  就地換掉字串，所以任何讀它的模組拿到的一定是譯文（不必改任何顯示端）。
 *  ⚠ 只換「值剛好等於某句原文」的字串；鍵名不動。
 *  ⚠ `SKIP` 裡的欄位是**拿中文當識別字**的（talks 的 `time:'夜半'` 拿來比對時段），
 *    整棵子樹都不碰 —— 新增這種欄位要加進來，不然切到西語就比對不到。
 * ========================================================================== */
import { LANG } from '../i18n.js';

const AVAILABLE = ['es'];
export const SCRIPT_TABLE = AVAILABLE.indexOf(LANG) >= 0
  ? await import('./script/' + LANG + '.js').then(m => m.default).catch(e => {
      console.error('[i18n] 讀不到劇本譯文 i18n/script/' + LANG + '.js', e); return null; })
  : null;

const SKIP = new Set(['time', 'art', 'expr', 'img', 'bg', 'cg', 'se', 'bgm', 'flag', 'flags', 'need', 'until']);

export function tr(s){
  return (SCRIPT_TABLE && typeof s === 'string' && SCRIPT_TABLE[s] != null) ? SCRIPT_TABLE[s] : s;
}

export function trTree(root){
  if(!SCRIPT_TABLE || !root || typeof root !== 'object') return root;
  const seen = new WeakSet();
  (function walk(o){
    if(seen.has(o)) return; seen.add(o);
    for(const k of Object.keys(o)){
      if(SKIP.has(k)) continue;
      const v = o[k];
      if(typeof v === 'string'){
        const t = SCRIPT_TABLE[v];
        if(t != null){ try{ o[k] = t; }catch(e){} }
      } else if(v && typeof v === 'object') walk(v);
    }
  })(root);
  return root;
}
