/* ============================================================================
 *  i18n/scriptTr.js — 劇本＋介面譯文（ver -1908；-1909 加介面表／i18nT／trDom）
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
const has = AVAILABLE.indexOf(LANG) >= 0;
const load = (dir) => import('./' + dir + '/' + LANG + '.js').then(m => m.default).catch(e => {
  console.error('[i18n] 讀不到譯文 i18n/' + dir + '/' + LANG + '.js', e); return null; });
const [S_TAB, U_TAB] = has ? await Promise.all([load('script'), load('ui')]) : [null, null];
/* 劇本表（tools/script_i18n.py）＋ 介面表（tools/ui_i18n.py）合成一張查 —— 兩邊鑰匙不重疊
   （介面表盤點時已排除劇本表有的句子）。 */
export const SCRIPT_TABLE = (S_TAB || U_TAB) ? Object.assign({}, S_TAB || {}, U_TAB || {}) : null;

const SKIP = new Set(['time', 'art', 'expr', 'img', 'bg', 'cg', 'se', 'bgm', 'flag', 'flags', 'need', 'until', 'cat', 'except']);   // ⚠ 與 tools/ui_i18n.py 的 ID_KEYS 同一張，改一邊要改另一邊

/* 程式裡的中文字面值一律包成 i18nT('…')（tools/ui_i18n.py wrap 包的）；中文時原樣回傳。 */
export function i18nT(s){
  return (SCRIPT_TABLE && typeof s === 'string' && SCRIPT_TABLE[s] != null) ? SCRIPT_TABLE[s] : s;
}
/* 掃一棵 DOM：文字節點與 placeholder／title／aria-label／alt 整句對得上就換（index.html／飛行頁的靜態標記）。 */
export function trDom(root){
  if(!SCRIPT_TABLE || !root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for(let n = w.nextNode(); n; n = w.nextNode()){
    const raw = n.nodeValue, t = raw.trim();
    if(t && SCRIPT_TABLE[t] != null) n.nodeValue = raw.replace(t, SCRIPT_TABLE[t]);
  }
  root.querySelectorAll && root.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(el => {
    for(const a of ['placeholder', 'title', 'aria-label', 'alt']){
      const v = el.getAttribute(a); if(v && SCRIPT_TABLE[v.trim()] != null) el.setAttribute(a, SCRIPT_TABLE[v.trim()]);
    }
  });
}

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
