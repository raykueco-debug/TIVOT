/* ============================================================================
 *  i18n.js — 多語言核心（語言選擇／深層回退／套用到 config 與 DOM）
 *  ---------------------------------------------------------------------------
 *  語言包：i18n/zh.js（母本）＋ i18n/ja.js（en.js 翻譯就位後在 PACKS 加一行 import）。
 *  選擇存 localStorage('tivot.lang')，首頁「中/A/あ」鈕切換後整頁重載生效
 *  （切換只在首頁，無戰局可失）。缺包或缺鍵一律深層回退母本 zh。
 *
 *  套用路徑（main.js 開機最先呼叫，先於任何讀取字串的程式）：
 *    applyToConfig(GAME_CONFIG) — 覆寫 config 內容字串（武器/搭檔/敵名/監察官/
 *      過場/載入 Hint/教學台詞）；結構不動、數值不碰。
 *    applyToDom() — 置換 index.html 靜態文字（首頁/選單/面板/提示）。
 *  模組內的動態字串（浮動字/cut-in 副標/結算列）直接 import { L } 取用。
 * ========================================================================== */

import { STRINGS as ZH } from './i18n/zh.js';
import { STRINGS as EN } from './i18n/en.js';
import { STRINGS as JA } from './i18n/ja.js';

const PACKS = { zh: ZH, en: EN, ja: JA };

/* ---- 語言選擇 ----
 *  優先序：使用者手動選過（localStorage）→ 地區偵測 → 預設中文。
 *  地區偵測：僅日本特判（瀏覽器語系 ja* 或時區 Asia/Tokyo → 日文），其餘一律預設中文。
 *  偵測結果不寫入 localStorage——只有按語言鈕的手動選擇才落地，之後恆以手選為準。 */
export const LANG = (()=>{
  let v=null; try{ v=localStorage.getItem('tivot.lang'); }catch(e){}
  if(v==='zh'||v==='en'||v==='ja') return v;
  try{
    const langs=(navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language||''];
    const tz=(Intl.DateTimeFormat().resolvedOptions().timeZone)||'';
    if(langs.some(l=>String(l).toLowerCase().indexOf('ja')===0) || tz==='Asia/Tokyo') return 'ja';
  }catch(e){}
  return 'zh';
})();

/* ---- 深層合併：以 zh 為底、疊上目標語言——缺鍵自動回退母本 ---- */
function deepMerge(base, over){
  if(over==null) return base;
  if(Array.isArray(base) || typeof base!=='object') return over;
  const out={};
  for(const k of Object.keys(base)){
    out[k] = (k in over) ? deepMerge(base[k], over[k]) : base[k];
  }
  for(const k of Object.keys(over)) if(!(k in base)) out[k]=over[k];
  return out;
}
export const L = deepMerge(ZH, PACKS[LANG] || ZH);

/* ---- 佔位符代入：fmt('{n} 次', {n:3}) → '3 次' ---- */
export function fmt(tpl, vars){
  let s = tpl==null ? '' : String(tpl);
  if(vars) for(const k of Object.keys(vars)) s = s.split('{'+k+'}').join(vars[k]);
  return s;
}

/* ============================================================================
 *  套用到 GAME_CONFIG（就地覆寫內容字串；main.js 開機最先呼叫）
 * ========================================================================== */
export function applyToConfig(GC){
  // 武器
  for(const key of Object.keys(L.weapons)){
    const w=GC.weapons && GC.weapons[key], t=L.weapons[key];
    if(!w || typeof t!=='object') continue;
    w.name=t.name; w.shortName=t.shortName; w.desc=t.desc;
  }
  // 搭檔
  for(const key of Object.keys(L.partners)){
    const p=GC.partners && GC.partners[key], t=L.partners[key];
    if(!p || typeof t!=='object') continue;
    p.name=t.name; p.perk=t.perk;
    if(p.passive){ p.passive.name=t.passiveName; p.passive.desc=t.passiveDesc; }
    if(p.active){  p.active.name=t.activeName;   p.active.desc=t.activeDesc; }
  }
  // 敵人名（保留底線後綴的作者標記語義：直接整名覆寫，displayEnemyName 取底線前半）
  const EN_MAP={ faceless:'faceless', facelessgiant:'facelessgiant', intruderEnemy:'intruder', witch:'witch', trainee:'trainee' };
  for(const key of Object.keys(EN_MAP)){
    if(GC.enemies && GC.enemies[key] && L.enemies[EN_MAP[key]]) GC.enemies[key].name=L.enemies[EN_MAP[key]];
  }
  // 載入 Hint
  if(Array.isArray(L.loading.hints) && L.loading.hints.length) GC.loadingHints=L.loading.hints.slice();
  // 監察官（dialogues 結構：{rank:{0:[句]}}）
  const insp=GC.inspectors && GC.inspectors[GC.defaultInspector];
  if(insp){
    insp.name=L.inspector.name;
    insp.executionLine=L.inspector.executionLine;
    insp.interceptLine=L.inspector.interceptLine;
    const wrap=src=>{ const o={}; for(const r of Object.keys(src)) o[r]={0:[src[r]]}; return o; };
    insp.dialogues=wrap(L.inspector.dialogues);
    insp.bossDialogues=wrap(L.inspector.bossDialogues);
  }
  // 過場
  if(GC.transitions){
    GC.transitions.hint=L.transitions.tapHint;
    if(GC.transitions.start)  GC.transitions.start.cn=L.transitions.startCn;
    if(GC.transitions.finish) GC.transitions.finish.cn=L.transitions.finishCn;
    if(GC.transitions.fail)   GC.transitions.fail.cn=L.transitions.failCn;
  }
  // 教學（台詞/腳本/罵人/箭頭標示/專屬結算＋立繪名牌）
  const tut=GC.tutorial;
  if(tut){
    const STEP_MAP={ 'battleStart':'battleStart', 'board:1':'board1', 'threat':'threat', 'defended':'defended', 'strike':'strike' };
    (tut.steps||[]).forEach(s=>{
      const t=L.tutorial.steps[STEP_MAP[s.trigger]];
      if(t) s.lines=t.map(l=>({...l}));
    });
    for(const key of Object.keys(L.tutorial.script)){
      const dst=tut.script && tut.script[key], src=L.tutorial.script[key];
      if(!dst || !src) continue;
      if(Array.isArray(dst)) tut.script[key]=src.map(l=>({...l}));
      else dst.lines=src.map(l=>({...l}));            // {center, lines} 格式：保留 center 旗標
    }
    tut.scold=JSON.parse(JSON.stringify(L.tutorial.scold));
    tut.guideLabels={...L.tutorial.guideLabels};
    tut.result={...L.tutorial.result};
    /* 劇情版教學（諾薇兒）整份原樣掛上去 —— 結構與上面那份相同，
       由 tutorial.js 依 isStoryRun() 決定讀哪一份。 */
    tut.story = L.tutorial.story ? JSON.parse(JSON.stringify(L.tutorial.story)) : null;
    if(tut.cast){                                     // 教學立繪名牌：監察官/搭檔（蕾妮）
      if(tut.cast.inspector) tut.cast.inspector.name=L.inspector.name;
      if(tut.cast.partner)   tut.cast.partner.name=L.partners.renee.name;
    }
  }
  // 銭湯獎勵鈕
  if(GC.intruder && GC.intruder.reward) GC.intruder.reward.btnLabel=L.sentou.saintInstallBtn;
}

/* ============================================================================
 *  套用到 DOM（index.html 靜態文字；main.js 開機呼叫）
 * ========================================================================== */
export function applyToDom(){
  // <html lang>：跟隨語言（字體堆疊/斷行規則依此適配，見 style.css html[lang="ja"]）
  document.documentElement.lang = LANG==='ja' ? 'ja' : (LANG==='en' ? 'en' : 'zh-Hant');
  const $=id=>document.getElementById(id);
  const set=(el,txt)=>{ if(el && txt!=null) el.textContent=txt; };
  const q=sel=>document.querySelector(sel);
  // 首頁
  set(q('#home .title'), L.home.title);
  set($('storyStartBtn'),L.home.storyStart);   // 開始故事（ver -554）
  set($('startBtn'),     L.home.start);
  set($('tutorialBtn'),  L.home.tutorialBtn);
  set($('continueBtn'),  L.home.continueBtn);   // 繼續（ver -430）
  set($('creditBtn'),    L.home.creditBtn);
  set($('originalBtn'),  L.home.originalBtn);
  set($('statsBtn'),     L.home.statsBtn);
  // 出擊整備頁
  set($('prepTitle'),        L.home.prepTitle);
  set($('prepGo'),           L.home.prepGo);
  set($('prepPartnerLabel'), L.home.partnerLabel);
  set($('prepWeaponLabel'),  L.home.weaponLabel);
  // 戰鬥 UI
  set($('tutSkipBtn'),   L.battle.skipBtn);
  set($('testClearBtn'), L.battle.testClear);
  set($('transText'),    L.battle.reloading);
  // 選單標題／說明
  set(q('#partnerSheet .ps-title'), L.partners.sheetTitle);
  set(q('#weaponSheet .ps-title'),  L.weapons.sheetTitle);
  const tags=document.querySelectorAll('#partnerSheet .ps-tag');
  if(tags[0]) tags[0].textContent=L.partners.tagActive;
  if(tags[1]) tags[1].textContent=L.partners.tagPassive;
  const howto=document.querySelectorAll('#partnerSheet .ps-howto div');
  if(howto[0]) howto[0].textContent=L.partners.howtoActive;
  if(howto[1]) howto[1].innerHTML=fmt(L.partners.howtoSaint).replace(/\n/g,'<br>');
  // Credit 面板（曲目用途標籤依清單順序）
  set(q('#creditSheet .credit-tip'), L.sheets.creditTip);
  set($('creditClose'), L.sheets.creditClose);
  const uses=document.querySelectorAll('#creditSheet .cl-use');
  /* ⚠ 依 **HTML 清單的順序** 對位，不是依曲名 —— 新增曲目時兩邊要一起改。 */
  const useOrder=[L.sheets.creditUse.mainMenu, L.sheets.creditUse.missionFail,
                  L.sheets.creditUse.result, L.sheets.creditUse.battle,
                  L.sheets.creditUse.flight, L.sheets.creditUse.boss];
  uses.forEach((el,i)=>{ if(useOrder[i]!=null) el.textContent=useOrder[i]; });
  // 原作面板
  set(q('#originalSheet .os-note'), L.sheets.originalNote);
  const baha=q('#originalSheet .os-link'); if(baha) baha.textContent=L.sheets.originalBaha;
  set($('originalClose'), L.sheets.originalClose);
  // 銭湯獎勵
  set(q('#sentouReward .sentou-hint'), L.sentou.tapReturn);
}

/* ── 台詞關鍵字裝飾：「聖徒化」（en: Saint Install / Saint Installation）→ 金色粗字 ──
 *  輸入為純文字（先做 HTML 轉義再包標籤，台詞不含標記故安全）；輸出 HTML 字串。
 *  打字機逐字重繪時每步以此轉換（部分打到一半的關鍵字，補完最後一字才上色）。 */
export function decorateLine(s){
  const esc = String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return esc.replace(/(聖徒化|Saint Installation|Saint Install)/g,
    '<b class="kw-saint">$1</b>');
}
