/* ============================================================================
 *  tools/branch_tree.mjs —— 劇情分歧樹（ver -1708，Ray：「做一個 ppt 把分支做成樹狀圖
 *  放在根目錄」）
 *
 *      node tools/branch_tree.mjs            # → 根目錄的 劇情分歧樹.pptx
 *
 *  ⚠ 清單**不在這裡算**：讀 `script/branches.js` 的 `scanBranches()`（首頁「分歧」面板
 *    也是它，鐵律 7）—— 腳本改了重跑這一支就好，樹不會與遊戲走鐘。
 *  ⚠ 需要 `pptxgenjs`（npm）。沒裝就 `npm i pptxgenjs`（或把 NODE_PATH 指到有它的地方）。
 *  樹的長相：一座城一張（太長自動續頁）——
 *      城 ─┬─ 幕（格名＋那一段的旗＋第一句台詞）   ★＝幕一開頭就分支
 *          │    └─ 分支點（路線 M／H／AB‧BA、整幕版本；ver -1711 起不列好感與選項） → 各邊的晶片
 * ========================================================================== */
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
const require = createRequire(import.meta.url);
const pptxgen = require('pptxgenjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { scanBranches } = await import(pathToFileURL(path.join(ROOT, 'script', 'branches.js')).href);

const list = scanBranches();
const C = { bg:'15111D', panel:'261D37', panel2:'1E1729', gold:'C9A45C', text:'EDE6D6',
            muted:'9A8FB0', star:'C2475A', line:'5A4C74', chip:'332848' };
const F = 'Microsoft JhengHei';
const KIND = { act:'', arrive:'進場對白', gate:'閘門', leave:'離開時', talk:'對話', date:'約會' };

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';                       // 13.33 × 7.5 in
pres.title = '劇情分歧樹';

/* ── 封面 ── */
{
  const s = pres.addSlide(); s.background = { color:C.bg };
  s.addText('劇情分歧樹', { x:0.8, y:2.1, w:11.7, h:1.1, fontFace:F, fontSize:48, bold:true, color:C.gold, isTextBox:true, margin:0 });
  s.addText('聖約第四騎士團　Saint Install', { x:0.8, y:3.2, w:11.7, h:0.5, fontFace:F, fontSize:20, color:C.muted, isTextBox:true, margin:0 });
  const nAct = list.length, nPt = list.reduce((a,b)=>a+b.points.length,0), nStar = list.filter(b=>b.atStart).length;
  const stats = [[nAct,'個有分支的幕'],[nPt,'個分支點'],[nStar,'個幕開頭就分支 ★']];
  stats.forEach(([n,l],i)=>{
    const x=0.8+i*3.9;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y:4.3, w:3.5, h:1.5, fill:{ color:C.panel }, line:{ color:C.panel }, rectRadius:0.12 });
    s.addText(String(n), { x:x+0.3, y:4.4, w:3, h:0.8, fontFace:F, fontSize:40, bold:true, color:i===2?C.star:C.gold, isTextBox:true, margin:0 });
    s.addText(l, { x:x+0.3, y:5.2, w:3, h:0.45, fontFace:F, fontSize:14, color:C.text, isTextBox:true, margin:0 });
  });
  s.addText('由 script/branches.js 自動產生（tools/branch_tree.mjs）。首頁「分歧」面板與這份樹讀的是同一份清單。',
    { x:0.8, y:6.6, w:11.7, h:0.4, fontFace:F, fontSize:11, color:C.muted, isTextBox:true, margin:0 });
}

/* ── 每一座城一棵樹 ── */
const towns = [];
for(const b of list){ let t=towns.find(x=>x.id===b.town); if(!t){ t={ id:b.town, name:b.townName, items:[] }; towns.push(t); } t.items.push(b); }

const TOP = 1.35, ROW = 0.34, MAXY = 7.05;
function rowsOf(b){ return 1 + b.points.length; }

for(const t of towns){
  /* 分頁：一張放得下多少幕 */
  const pages=[]; let cur=[], used=0;
  const cap = Math.floor((MAXY-TOP)/ROW);
  for(const b of t.items){ const r=rowsOf(b); if(used+r>cap && cur.length){ pages.push(cur); cur=[]; used=0; } cur.push(b); used+=r; }
  if(cur.length) pages.push(cur);
  pages.forEach((items, pi)=>{
    const s = pres.addSlide(); s.background = { color:C.bg };
    s.addText(t.name + (pages.length>1 ? '　（'+(pi+1)+'/'+pages.length+'）' : ''),
      { x:0.5, y:0.35, w:9, h:0.6, fontFace:F, fontSize:30, bold:true, color:C.gold, isTextBox:true, margin:0 });
    s.addText('★＝幕一開頭就分支　｜　晶片＝分支的每一邊', { x:8.3, y:0.5, w:4.5, h:0.35, fontFace:F, fontSize:11, color:C.muted, align:'right', isTextBox:true, margin:0 });
    /* 城根 */
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:0.5, y:TOP, w:0.34, h:0.34, fill:{ color:C.gold }, line:{ color:C.gold }, rectRadius:0.08 });
    let y = TOP; const trunkX = 0.67; let lastActY = TOP;
    for(const b of items){
      const actY = y;
      /* 幕 */
      s.addShape(pres.shapes.LINE, { x:trunkX, y:actY+ROW/2, w:0.33, h:0, line:{ color:C.line, width:1.25 } });
      const head = (b.atStart?'★ ':'') + b.nodeName.replace(t.name,'').trim()
        + (KIND[b.kind] ? '〔'+KIND[b.kind]+'〕' : '') + (b.actFlag ? '　'+b.actFlag : '');
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:1.0, y:actY+0.02, w:11.85, h:ROW-0.04, fill:{ color:b.atStart?'3A2233':C.panel }, line:{ color:b.atStart?C.star:C.panel, width:1 }, rectRadius:0.06 });
      s.addText([
        { text:head, options:{ bold:true, color:b.atStart?'F2B8C2':C.text } },
        { text:'　「'+(b.title||'')+'」', options:{ color:C.muted } },
        ...(b.note ? [{ text:'　※'+b.note, options:{ color:C.muted, italic:true } }] : []),
      ], { x:1.12, y:actY+0.02, w:11.6, h:ROW-0.04, fontFace:F, fontSize:11, valign:'middle', isTextBox:true, margin:0, fit:'shrink' });
      lastActY = actY; y += ROW;
      /* 分支點 */
      b.points.forEach((p, i)=>{
        const py=y;
        s.addShape(pres.shapes.LINE, { x:1.25, y:actY+ROW-0.02, w:0, h:(py+ROW/2)-(actY+ROW-0.02), line:{ color:C.line, width:1 } });
        s.addShape(pres.shapes.LINE, { x:1.25, y:py+ROW/2, w:0.3, h:0, line:{ color:C.line, width:1 } });
        s.addText(p.label + (p.lines ? '　@第'+(p.lines[0]+1)+'拍'+(p.lines.length>1?'起 ×'+p.lines.length:'') : ''),
          { x:1.6, y:py, w:4.6, h:ROW, fontFace:F, fontSize:10.5, color:C.gold, valign:'middle', isTextBox:true, margin:0, fit:'shrink' });
        let cx = 6.3;
        for(const v of (p.variants||[])){
          const w = Math.min(3.2, 0.35 + v.label.length*0.13);
          if(cx + w > 12.85) break;
          s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:cx, y:py+0.05, w, h:ROW-0.1, fill:{ color:C.chip }, line:{ color:C.line, width:0.75 }, rectRadius:0.1 });
          s.addText(v.label, { x:cx+0.08, y:py+0.05, w:w-0.16, h:ROW-0.1, fontFace:F, fontSize:9.5, color:C.text, valign:'middle', align:'center', isTextBox:true, margin:0, fit:'shrink' });
          cx += w + 0.12;
        }
        y += ROW;
      });
    }
    /* 主幹 */
    s.addShape(pres.shapes.LINE, { x:trunkX, y:TOP+0.34, w:0, h:Math.max(0.01,(lastActY+ROW/2)-(TOP+0.34)), line:{ color:C.line, width:1.5 } });
  });
}

/* ── 幕開頭就分支的清單（Ray：「如果有分支直接就是幕開頭的，先告訴我」）── */
{
  const stars = list.filter(b=>b.atStart);
  const per = 15;
  for(let i=0;i<stars.length;i+=per){
    const s = pres.addSlide(); s.background = { color:C.bg };
    s.addText('★ 幕一開頭就分支'+(stars.length>per?'　（'+(i/per+1)+'/'+Math.ceil(stars.length/per)+'）':''),
      { x:0.5, y:0.35, w:12, h:0.6, fontFace:F, fontSize:30, bold:true, color:C.star, isTextBox:true, margin:0 });
    stars.slice(i,i+per).forEach((b,k)=>{
      const y=1.3+k*0.38;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:0.5, y, w:12.3, h:0.32, fill:{ color:C.panel2 }, line:{ color:C.panel2 }, rectRadius:0.06 });
      const why = b.points.filter(p=>p.kind==='variant' || (p.lines&&p.lines[0]===0)).map(p=>p.label).join('、');
      s.addText([
        { text:b.townName+'　'+b.nodeName.replace(b.townName,'').trim()+(b.actFlag?'　'+b.actFlag:''), options:{ bold:true, color:C.text } },
        { text:'　←　'+why, options:{ color:C.gold } },
      ], { x:0.65, y, w:12.0, h:0.32, fontFace:F, fontSize:11, valign:'middle', isTextBox:true, margin:0, fit:'shrink' });
    });
  }
}

const out = path.join(ROOT, '劇情分歧樹.pptx');
await pres.writeFile({ fileName: out });
console.log('→', out, '（'+towns.length+' 座城、'+list.length+' 幕）');
