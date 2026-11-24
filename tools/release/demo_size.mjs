// 試玩版容量估算（靜態收集，只量不改）。
//   node tools/release/demo_size.mjs            → 印報表、寫 tools/release/demo_size.json（不入版控也可）
// 母集合＝offline_list.json（離線包，已排除工作素材）。從試玩範圍的「資料」出發做字串閉包：
//   劇情 7 幕＋城鎮（帝都／北泊／卡耶爾夢境）＋飛行戰（蜈蚣／空賊／羽蛇／瓦爾士空賊）
//   ＋首頁（HOME_IMG／HOME_SFX）＋教學（tutorial）＋挑戰（lineup／intruder／挑戰搭檔）
//   → 戰鬥卡 → 敵人卡 → 群戰編組 → 動畫表（ENEMY_*）→ ASSETS 鍵 → 檔案（含時段差分、眨眼差分）。
//   程式層（js/html/css/json/字型）與飛行頁資料夾整包算；runtime 程式碼直接寫死檔名的素材也算；音效／語音整包算。
import fs from 'fs'; import path from 'path'; import { pathToFileURL, fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const imp = m => import(pathToFileURL(path.join(ROOT, m)).href);
const C = await imp('config.js'); const G = C.GAME_CONFIG;
const { MAIN_SCRIPT } = await imp('script/mainScript.js');
const { TOWNS, DINE, OUTING } = await imp('script/town.js');
const { ENEMIES } = await imp('script/enemies.js');
const { GROUP_COMPS } = await imp('script/group_comps.js');
const { ART, SPEAKERS } = await imp('script/speakers.js');
let GM = {}; try { GM = await imp('script/group_members.js'); } catch (_) {}

const DEMO_TOWNS = ['capital', 'northport', 'canyon'];
const FLIGHT_BATTLES = ['flight_centipede', 'flight_pirate', 'flight_serpent', 'valse_pirate'];
const BANDS = ['dawn', 'day', 'dusk', 'night', 'midnight'];

const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'offline_list.json'), 'utf8')).files;
const size = {}; for (const f of list) size[f] = fs.statSync(path.join(ROOT, f)).size;
const stemOf = f => path.basename(f).replace(/\.[^.]+$/, '').toLowerCase();
const byStem = {}; for (const f of list) (byStem[stemOf(f)] ||= []).push(f);
const lower = list.map(f => [f.toLowerCase(), f]);
const CODE_EXT = /\.(js|mjs|html|css|json|webmanifest|woff2?|ttf|otf)$/i;

const picked = new Map();   // file -> 來源
let newStems = [];
const add = (f, why) => { if (!picked.has(f)) { picked.set(f, why); newStems.push(stemOf(f)); } };
function resolveStr(s, why) {
  if (typeof s !== 'string' || s.length < 3 || s.length > 200 || /[　-鿿]/.test(s)) return;
  if (C.ASSETS[s]) resolveStr(C.ASSETS[s], why);
  let t = s.split('?')[0].replace(/^(\.\.\/)+/, '').replace(/^\.\//, '').toLowerCase();
  if (t.includes('/')) {
    if (t.endsWith('/')) { for (const [l, f] of lower) if (l.startsWith(t) || l.includes('/' + t)) add(f, why); }
    else for (const [l, f] of lower) if (l === t || l.endsWith('/' + t)) add(f, why);
    return;
  }
  t = t.replace(/\.[a-z0-9]+$/, '');
  // 同名檔超過 3 個的（frame_00、anim 這種通用名）不靠檔名配對 —— 那是動畫資料夾裡的格，由資料夾路徑收
  for (const k of [t, 'bgm_' + t, ...BANDS.map(b => t + '_' + b)]) { const hit = byStem[k] || []; if (hit.length <= 3) for (const f of hit) add(f, why); }
}
const TABLES = { ENEMIES, battles: G.battles, GROUP_COMPS, partners: G.partners, weapons: G.weapons, shops: (G.shop && G.shop.shops) || {},
  HITFX: C.HITFX, ...Object.fromEntries(['ENEMY_IDLE', 'ENEMY_ATK', 'ENEMY_DELAY', 'ENEMY_DODGE', 'ENEMY_DOWN', 'ENEMY_ENTER', 'ENEMY_FLY', 'ENEMY_HURT', 'ENEMY_MISS'].map(k => [k, C[k] || {}])) };
for (const k of Object.keys(GM)) if (GM[k] && typeof GM[k] === 'object') TABLES['GM_' + k] = GM[k];
const seenTok = new Set(), seenObj = new Set(), queue = [];
function portrait(id, expr, why) {
  const key = (SPEAKERS[id] && SPEAKERS[id].art) || String(id).toLowerCase(); const a = ART[key]; if (!a) return;
  if (a.base) queue.push([a.base, why]);
  if (expr && a.expr && a.expr[expr]) queue.push([a.expr[expr].src, why]);
}
function walk(o, why) {
  if (o == null) return;
  if (typeof o === 'string') { queue.push([o, why]); return; }
  if (typeof o !== 'object' || seenObj.has(o)) return; seenObj.add(o);
  if (o.portrait && typeof o.portrait === 'object' && o.portrait.char) portrait(o.portrait.char, o.portrait.expr, why);
  if (typeof o.speaker === 'string') portrait(o.speaker, null, why);
  for (const k of Object.keys(o)) { if (k === 'text' || k === 'textByTier') continue; walk(o[k], why); queue.push([k, why]); }
}
function drain() {
  while (queue.length) {
    const [s, why] = queue.shift();
    if (typeof s !== 'string' || seenTok.has(s)) continue; seenTok.add(s);
    newStems = []; resolveStr(s, why);
    for (const tab of Object.values(TABLES)) if (Object.prototype.hasOwnProperty.call(tab, s)) walk(tab[s], why);
    if (SPEAKERS[s]) portrait(s, null, why);
    for (const st of newStems) { queue.push([st, why]); for (const sfx of ['_closed', '_half']) for (const f of byStem[st + sfx] || []) add(f, why); }
  }
}
// ── 範圍 ──
const scope = [
  ['劇情', MAIN_SCRIPT], ['城鎮', DEMO_TOWNS.map(t => TOWNS[t])], ['城鎮', [DINE, OUTING]],
  ['飛行戰', FLIGHT_BATTLES], ['教學', G.tutorial],
  ['挑戰', [G.lineup, G.intruder, G.currentEnemy, G.challengePartners, G.inspectors, G.defaultInspector]],
  ['戰鬥共用', [G.weapons, G.mainGun, G.storyPartner, G.storyPartnerBy, G.battleBgm, G.evaluation, G.loadingHints, G.loadingHost, C.HITFX, C.SE_PLAY]],
];
for (const [why, o] of scope) { walk(o, why); drain(); }
const homeKeys = Object.keys(C.ASSETS).filter(k => C.HOME_IMG.prefixes.some(p => k.startsWith(p)) || C.HOME_IMG.keys.includes(k));
for (const k of [...homeKeys, ...((C.HOME_SFX && C.HOME_SFX.keys) || []), 'bgm_home']) queue.push([k, '首頁']); drain();
for (const k of Object.keys(C.ASSETS)) if (/^(weapon_|switch_|sfx_|se_|vo_|ui_|ef_|kerb|fx_)/.test(k)) queue.push([k, '戰鬥共用']); drain();
for (const f of list) if (CODE_EXT.test(f) && !f.startsWith('resources/')) add(f, '程式'); else if (f.startsWith('flight/')) add(f, '飛行頁');   // resources 底下的 json（anim.json）跟著自己的資料夾走
const codeTxt = list.filter(f => /\.(js|html|css)$/.test(f) && !f.startsWith('script/') && f !== 'config.js')
  .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n').toLowerCase();
for (const f of list) if (!picked.has(f) && !f.startsWith('resources/enemy/anim/') && (byStem[stemOf(f)] || []).length <= 3 && codeTxt.includes(path.basename(f).toLowerCase())) add(f, '程式寫死');
for (const f of list) if (/^resources\/audio\/(se|vo)\//.test(f)) add(f, '音效整包');

// ── 報表 ──
const files = [...picked.keys()]; const tot = a => a.reduce((s, f) => s + size[f], 0);
const MB = b => (b / 1048576).toFixed(1);
const code = files.filter(f => CODE_EXT.test(f)), asset = files.filter(f => !CODE_EXT.test(f));
const big = list.filter(f => size[f] > 25 * 1048576);
const bucket = f => { const p = f.split('/'); return p[0] === 'resources' ? p.slice(0, Math.min(3, p.length - 1)).join('/') : p[0] === 'flight' ? 'flight/' + (p.length > 2 ? p[1] : '(根)') : '(程式根)'; };
const agg = {}; for (const f of files) { const b = bucket(f); (agg[b] ||= [0, 0]); agg[b][0]++; agg[b][1] += size[f]; }
const byWhy = {}; for (const [f, w] of picked) { (byWhy[w] ||= [0, 0]); byWhy[w][0]++; byWhy[w][1] += size[f]; }
const out = { version: C.VERSION, all: { files: list.length, bytes: tot(list) }, demo: { files: files.length, bytes: tot(files) },
  code: { files: code.length, bytes: tot(code) }, asset: { files: asset.length, bytes: tot(asset) },
  over25: big.map(f => [f, size[f]]), top: Object.entries(agg).sort((a, b) => b[1][1] - a[1][1]).slice(0, 20), byWhy,
  list: files.sort() };
fs.writeFileSync(path.join(ROOT, 'tools/release/demo_size.json'), JSON.stringify(out, null, 1));
console.log('版本', out.version, '｜離線包全體', list.length, '檔', MB(out.all.bytes), 'MiB');
console.log('試玩', files.length, '檔', MB(out.demo.bytes), 'MiB ｜程式', code.length, MB(out.code.bytes), '｜素材', asset.length, MB(out.asset.bytes));
console.log('>25MiB（全體）', big.length, big.join(' '));
for (const [b, [n, s]] of out.top) console.log(MB(s).padStart(8), String(n).padStart(6), b);
for (const [w, [n, s]] of Object.entries(byWhy)) console.log('來源', w, n, MB(s));
