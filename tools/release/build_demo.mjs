// 網頁版打包：把要上線的檔「硬連結」到 dist/<名>/，給 wrangler pages deploy 用（不複製，不佔第二份空間）。
//   node tools/release/build_demo.mjs            → dist/demo/  試玩範圍（tools/release/demo_size.json 的清單＋程式層）
//   node tools/release/build_demo.mjs --full     → dist/full/  整個離線包（offline_list.json；Pages 免費上限 2 萬檔以內）
// ⚠ 試玩清單是靜態估算（demo_size.mjs 的字串閉包），可能漏掉程式拼字串組出來的路徑 —— 試玩切版前要實跑一輪校正。
//   所以給 Ray 先試的 pages.dev 預覽用 --full（不會缺圖），正式公開才用試玩清單。
// 跑之前先 `node tools/release/demo_size.mjs` 讓清單跟上目前版本。
import fs from 'fs'; import path from 'path'; import crypto from 'crypto'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FULL = process.argv.includes('--full');
const OUT = path.join(ROOT, 'dist', FULL ? 'full' : 'demo');
const MAX_FILES = 20000, MAX_BYTES = 25 * 1024 * 1024;   // Cloudflare Pages 免費方案（2026-11-25 查）

const off = JSON.parse(fs.readFileSync(path.join(ROOT, 'offline_list.json'), 'utf8'));
let files;
if (FULL) files = [...off.files];
else {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'release', 'demo_size.json'), 'utf8'));
  if (d.version !== off.version) console.warn(`⚠ demo_size.json 是 ${d.version}，離線包是 ${off.version} —— 先跑 node tools/release/demo_size.mjs`);
  const listed = Array.isArray(d.list) ? d.list.map(x => typeof x === 'string' ? x : x.file || x[0]) : Object.keys(d.list);
  const CODE = /\.(js|mjs|html|css|json|webmanifest|woff2?|ttf|otf)$/i;   // 程式層一律整包（小，而且漏一支就整頁壞）
  /* 試玩包內容規則（11-27，Ray 逐題定，題目在 dist/demo_contents.md 的 C 段）。
     原則（Ray）：「體驗版就是體驗版 不要用完整版上鎖」—— 範圍外的東西在包裡**不存在**。
     靜態清單收不到「對照表裡寫完整路徑」的三類（插圖動畫、CI 影片、背景動畫），在這裡照範圍點名補；範圍外的在這裡排除。 */
  const cfgTxt = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');
  const refsIn = (txt, re) => [...txt.matchAll(re)].map(m => m[1]);
  // C1 插圖動畫：試玩範圍 7 支，只放 config 現用的那一版
  const CG_IN = ['001_nouvelle_fell', '002_saintassult', '003_lunaria_armed', '004_renna_intro', '005_cecilieintro', '008_rennaholdanya', '009_soranadebute'];
  const addIllus = refsIn(cfgTxt, /'([^']+)':\s*\{\s*video:'resources\/illustration\/video\/[^']+'/g).filter(k => CG_IN.includes(k))
    .map(k => cfgTxt.match(new RegExp(`'${k}':\\s*\\{\\s*video:'(resources/illustration/video/[^']+)'`))[1]);
  // C2 CI 影片：試玩三位搭檔（賽西莉、諾薇兒、安雅；cutin_nireload＝安雅惡夢再裝填），config 現用版本
  const addCi = [...new Set(refsIn(cfgTxt, /'(resources\/ci\/video\/[^']+)'/g))].filter(f => /cecilie|nouvelle|anya|nireload/.test(f));
  // C3 背景動畫：帝都／帝都城外／北泊／卡耶爾 整個資料夾（雲層、遮罩、影片都是 bg_fx／bg_anim 組名字讀的）
  const BG_ANIM_IN = ['capital', 'capital_outer', 'northport', 'canyon'].map(d => `resources/background/anim/${d}/`);
  // C4 空賊受擊動畫：全部版本都放（Ray 選放）
  const SKYPIRATE_HIT = /^resources\/enemy\/anim\/man_skypirate_\d+_hit_/;
  const ADD = new Set([...addIllus, ...addCi]);
  const keepExtra = f => ADD.has(f) || BG_ANIM_IN.some(p => f.startsWith(p)) || SKYPIRATE_HIT.test(f);
  // 排除：C5 範圍外插圖／C6 索菈娜 CI 與語音／C7 零星背景／C15 非試玩飛行怪／C16＋17 只留試玩會播的語音
  const VO_KEEP = /^resources\/audio\/vo\/vo_(nouvelle|nouvellemiss|anya|cecilie)/;
  const FLIGHT_ENEMY_KEEP = /^flight\/enemy\/(flh_pirate|flm_centipi|flm_serpent|sky3d_tune\.json|_)/;
  const drop = f =>
    /^resources\/illustration\/(043_eliointro|044_cecilietorsten)/i.test(f) ||
    /^resources\/ci\/[^/]*sorana/i.test(f) ||
    /^resources\/background\/(tomb|ravnsdal|forest|holysee)\//.test(f) ||
    (f.startsWith('flight/enemy/') && !FLIGHT_ENEMY_KEEP.test(f)) ||
    (f.startsWith('resources/audio/vo/') && !VO_KEEP.test(f));
  files = [...new Set([...listed, ...off.files.filter(f => (CODE.test(f) && !f.startsWith('resources/')) || keepExtra(f))])].filter(f => !drop(f));
  console.log(`補入：插圖動畫 ${addIllus.length}、CI 影片 ${addCi.length}、背景動畫 ${BG_ANIM_IN.length} 夾、空賊受擊全版本`);
}
files.push('offline_list.json');

fs.rmSync(OUT, { recursive: true, force: true });
let bytes = 0, big = [], linked = 0, copied = 0;
for (const f of files) {
  const src = path.join(ROOT, f), dst = path.join(OUT, f);
  if (!fs.existsSync(src)) { console.warn('缺檔', f); continue; }
  const s = fs.statSync(src).size; bytes += s; if (s > MAX_BYTES) big.push(f);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  try { fs.linkSync(src, dst); linked++; } catch { fs.copyFileSync(src, dst); copied++; }
}
/* 試玩建置（ver -3073）：dist/demo 一律是試玩版（--full 加 --demo 也是）—— build.js 換成 demo:true 的**獨立複本**
   （其餘是硬連結，直接改會連開發機那一份一起改）。遊戲端判定在 script/progress.js 的 isDemo()。 */
const DEMO = !FULL || process.argv.includes('--demo');
{ const b = path.join(OUT, 'build.js'); try { fs.unlinkSync(b); } catch {}
  const src = fs.readFileSync(path.join(ROOT, 'build.js'), 'utf8').replace(/demo\s*:\s*false/, 'demo:' + DEMO);
  fs.writeFileSync(b, src); console.log('build.js → demo:' + DEMO); }
/* 先行體驗版（ver -3092，Ray：「標題加入先行體驗版」）：試玩包的 manifest 名稱帶「先行體驗版」（加到主畫面顯示的名字）。
   同 build.js：先拆掉硬連結再寫獨立複本，開發機那一份不動。首頁標題字、<title>、apple-mobile-web-app-title 由 main.js 依 isDemo() 執行期改。 */
const REWRITTEN = new Set(['build.js']);
if (DEMO) { const m = path.join(OUT, 'manifest.webmanifest');
  if (fs.existsSync(m)) { const j = JSON.parse(fs.readFileSync(m, 'utf8')); try { fs.unlinkSync(m); } catch {}
    j.name = '聖約第四騎士團 先行體驗版'; j.short_name = '聖約第四騎士團 先行體驗版';
    fs.writeFileSync(m, JSON.stringify(j, null, 2) + '\n'); REWRITTEN.add('manifest.webmanifest'); console.log('manifest → ' + j.name); } }
/* 404.html（11-27）：Cloudflare Pages 沒有 404.html 時，**任何不存在的路徑都回 200 ＋ 首頁 index.html**（單頁應用模式）——
   缺檔會被當成成功：離線下載把 HTML 存成素材、遊戲拿到 HTML 當圖解碼失敗，而且都沒有錯誤訊息。放一支 404.html，缺檔就回真的 404。 */
fs.writeFileSync(path.join(OUT, '404.html'), '<!doctype html><meta charset="utf-8"><title>404</title><p>找不到這個檔案。</p>');
/* 離線下載清單（11-27）：首頁「離線下載」讀的 offline_list.json 要等於**這一包真的有的檔**——
   原本是硬連結到整包那份（1.5 GB／1.8 萬檔），試玩包上按下載會去抓不存在的檔。改寫成獨立的一份。 */
{ const o = path.join(OUT, 'offline_list.json'); try { fs.unlinkSync(o); } catch {}
  const have = files.filter(f => f !== 'offline_list.json' && fs.existsSync(path.join(OUT, f)));
  const sum = have.reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0);
  /* 內容雜湊一起帶（ver -3078）：offline.js 靠它判斷「更新時哪些檔要重抓」；整包清單的 hash 與 files 同順序。 */
  const H = Array.isArray(off.hash) ? new Map(off.files.map((f, i) => [f, off.hash[i]])) : null;
  /* build.js 在 dist 裡是改寫過的獨立複本（demo:true），雜湊要照 dist 那份重算（同 git hash-object：sha1("blob <長度>\0"+內容)）。 */
  const gitHash = f => { const b = fs.readFileSync(path.join(OUT, f)); return crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex'); };
  const out = { version: off.version, bytes: sum, files: have }; if (H) out.hash = have.map(f => REWRITTEN.has(f) ? gitHash(f) : (H.get(f) || ''));   // 改寫過的獨立複本（build.js／manifest）照 dist 那份重算
  fs.writeFileSync(o, JSON.stringify(out, null, 0).replace(/","/g, '",\n"'));
  console.log(`offline_list.json → ${have.length} 檔、${(sum / 1048576).toFixed(0)} MiB`); }
console.log(`${FULL ? 'full' : 'demo'}：${files.length} 檔、${(bytes / 1048576).toFixed(0)} MiB → ${path.relative(ROOT, OUT)}（硬連結 ${linked}、複製 ${copied}）`);
if (files.length > MAX_FILES) console.error(`✘ 超過 Pages 免費方案 ${MAX_FILES} 檔`);
if (big.length) console.error('✘ 單檔超過 25 MiB：', big);
