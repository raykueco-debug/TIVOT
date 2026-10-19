/* TIVOT 剪輯器 —— 前端（時間軸／預覽／屬性面板）。
 *
 * 資料只有一份：`project`（存檔、輸出、預覽都讀它）。改它一律走 commit()：先存一份復原用的快照，再重畫。
 * 轉場與淡化的計算 resolveTrack() 與 render.py 的 resolve_track() 是同一套定義 —— 改一邊要改另一邊。
 */
'use strict';
const $ = id => document.getElementById(id);
const W = 1080, H = 1920, FPS = 60;
const HEAD_H = { video: 56, audio: 40 };
const SNAP_PX = 8;

let project = newProject('pv');
let sel = null;            // {type:'clip', id} | {type:'junc', id}（id＝轉場「轉進來」的那一段）
const selIds = new Set();  // 時間軸多選（Ctrl／Shift＋點、Ctrl+A）；只有一個時與 sel 同步
const libSel = new Set();  // 素材庫多選（素材路徑）
let libOrder = [], libAnchor = null;
let lastArea = 'tl';       // Ctrl+A 選哪一區：最後點的是素材庫還是時間軸
let clipboard = null;      // Ctrl+C／X 的內容：{ items:[{trackId, type, clip}], minStart }
let playhead = 0, playing = false, playT0 = 0, playP0 = 0;
let pps = 90;              // 每秒幾像素
let beatTimes = [];        // 時間軸上的拍點（秒），由 project.beat 算
let lib = [];
const undo = [], redo = [];
const probeCache = {};

function newProject(name){
  return { name, w:W, h:H, fps:FPS, loudnorm:true, beat:null,
    tracks:[ {id:uid(), type:'video', name:'V1', clips:[]}, {id:uid(), type:'video', name:'V2', clips:[]},
             {id:uid(), type:'audio', name:'A1', clips:[]}, {id:uid(), type:'audio', name:'A2', clips:[]} ] };
}
function uid(){ return Math.random().toString(36).slice(2, 10); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = t => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return String(m).padStart(2, '0') + ':' + s.toFixed(2).padStart(5, '0'); };
const frame = t => Math.round(t * FPS) / FPS;
function status(s){ $('status').textContent = s || ''; }

/* ═════════════ 資料 ═════════════ */
function allClips(){ const o = []; project.tracks.forEach(t => t.clips.forEach(c => o.push([t, c]))); return o; }
function findClip(id){ for(const t of project.tracks){ const c = t.clips.find(c => c.id === id); if(c) return [t, c]; } return [null, null]; }
function totalDur(){ let m = 0; allClips().forEach(([, c]) => m = Math.max(m, c.start + c.dur)); return m; }
function snapshot(){ return JSON.stringify(project); }
function commit(before){
  undo.push(before); if(undo.length > 200) undo.shift(); redo.length = 0;
  save_local(); renderAll();
}
function save_local(){ try{ localStorage.setItem('tivot_editor_last', snapshot()); }catch(_){} }
function doUndo(){ if(!undo.length) return; redo.push(snapshot()); project = JSON.parse(undo.pop()); sel = null; selIds.clear(); afterLoad(); }
function doRedo(){ if(!redo.length) return; undo.push(snapshot()); project = JSON.parse(redo.pop()); sel = null; selIds.clear(); afterLoad(); }
function afterLoad(){ $('projName').value = project.name || 'pv'; save_local(); loadBeats(); renderAll(); }

async function probe(p){
  if(probeCache[p]) return probeCache[p];
  const r = await fetch('/api/probe?p=' + encodeURIComponent(p)).then(r => r.json());
  return probeCache[p] = r;
}
function kindOf(p){
  const e = p.split('.').pop().toLowerCase();
  return ['mp4','webm','mov','m4v'].includes(e) ? 'video' : ['webp','png','jpg','jpeg'].includes(e) ? 'image' : ['m4a','mp3','wav','ogg','aac'].includes(e) ? 'audio' : null;
}
const baseName = p => p.split('/').pop();

/* 轉場／淡化：與 render.py 的 resolve_track 同一套 */
function resolveTrack(track){
  const cs = track.clips.slice().sort((a, b) => a.start - b.start).map(c => ({ c, S:c.start, E:c.start + c.dur, fx:[] }));
  cs.forEach(r => { if(r.c.fadeIn) r.fx.push(['ain', 0, r.c.fadeIn]); });
  for(let i = 1; i < cs.length; i++){
    const a = cs[i - 1], b = cs[i], tr = b.c.trans;
    if(!tr || !tr.dur) continue;
    if(Math.abs((a.c.start + a.c.dur) - b.c.start) > 1.5 / FPS) continue;
    const d = tr.dur, cut = b.c.start;
    if(tr.type === 'cross'){ a.E = cut + d / 2; b.S = cut - d / 2; b.fx.push(['ain', 0, d]); }
    else { const col = tr.type === 'white' ? '#fff' : '#000'; a.fx.push(['cout_abs', cut - d / 2, d / 2, col]); b.fx.push(['cin', 0, d / 2, col]); }
  }
  cs.forEach(r => { if(r.c.fadeOut) r.fx.push(['aout', (r.E - r.S) - r.c.fadeOut, r.c.fadeOut]); });
  return cs;
}
function adjacentPrev(track, c){
  let best = null;
  for(const o of track.clips) if(o !== c && Math.abs(o.start + o.dur - c.start) <= 1.5 / FPS) best = o;
  return best;
}

/* ═════════════ 素材庫 ═════════════ */
async function loadLib(){
  lib = await fetch('/api/library').then(r => r.json());
  renderLib();
}
function renderLib(){
  const q = $('libSearch').value.trim().toLowerCase();
  const host = $('libList'); host.innerHTML = ''; libOrder = [];
  const closed = JSON.parse(localStorage.getItem('tivot_editor_closed') || '{}');
  for(const cat of lib){
    const items = cat.items.filter(i => !q || i.name.toLowerCase().includes(q) || i.p.toLowerCase().includes(q));
    if(!items.length) continue;
    const box = document.createElement('div'); box.className = 'cat' + (closed[cat.cat] && !q ? ' closed' : '');
    const h = document.createElement('h4'); h.innerHTML = cat.cat + '<span class="n">' + items.length + '</span>';
    h.onclick = () => { box.classList.toggle('closed'); closed[cat.cat] = box.classList.contains('closed'); localStorage.setItem('tivot_editor_closed', JSON.stringify(closed)); };
    const grid = document.createElement('div'); grid.className = 'items' + (items[0].kind === 'audio' ? ' audio' : '');
    const shown = items.slice(0, q ? 400 : 240);
    for(const it of shown){
      libOrder.push(it);
      const d = document.createElement('div'); d.className = 'it' + (libSel.has(it.p) ? ' sel' : ''); d.draggable = true; d.title = it.p; d.dataset.p = it.p;
      const th = document.createElement('div'); th.className = 'th';
      if(it.kind === 'image') th.style.backgroundImage = 'url("/m/' + encodeURI(it.p) + '")';
      else if(it.kind === 'video') th.style.backgroundImage = 'url("/api/thumb?p=' + encodeURIComponent(it.p) + '&t=1.5")';
      d.innerHTML = '<span class="k">' + ({video:'影片', image:'圖', audio:'♪'}[it.kind]) + '</span>';
      d.prepend(th);
      const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = it.name; d.appendChild(nm);
      if(it.kind === 'audio'){
        const pv = document.createElement('button'); pv.className = 'pv'; pv.textContent = '▶'; pv.title = '試聽';
        pv.onclick = e => { e.stopPropagation(); audition(it.p, pv); };
        d.appendChild(pv);
      }
      d.addEventListener('click', e => libClick(e, it));
      d.addEventListener('dragstart', e => {
        // 拖的是已選取的其中一個 → 整批（照素材庫的順序）一起拖
        const batch = libSel.has(it.p) && libSel.size > 1 ? libOrder.filter(x => libSel.has(x.p)) : [it];
        e.dataTransfer.setData('text/tivot', JSON.stringify(batch)); e.dataTransfer.effectAllowed = 'copy';
      });
      d.addEventListener('dblclick', () => addAtPlayhead(it));
      if(it.kind === 'video') lazyThumb(th);
      grid.appendChild(d);
    }
    box.append(h, grid); host.appendChild(box);
  }
}
function libClick(e, it){
  lastArea = 'lib';
  if(e.ctrlKey || e.metaKey){ libSel.has(it.p) ? libSel.delete(it.p) : libSel.add(it.p); }
  else if(e.shiftKey && libAnchor){
    const a = libOrder.findIndex(x => x.p === libAnchor), b = libOrder.findIndex(x => x.p === it.p);
    if(a >= 0 && b >= 0){ libSel.clear(); for(let i = Math.min(a, b); i <= Math.max(a, b); i++) libSel.add(libOrder[i].p); }
  } else { libSel.clear(); libSel.add(it.p); }
  if(!e.shiftKey) libAnchor = it.p;
  paintLibSel();
}
function paintLibSel(){
  document.querySelectorAll('#libList .it').forEach(el => el.classList.toggle('sel', libSel.has(el.dataset.p)));
  if(libSel.size > 1) status('素材庫已選 ' + libSel.size + ' 個（拖其中一個＝整批依序放進時間軸）');
}
function lazyThumb(el){
  // 影片縮圖要伺服器現場抽格：只在捲到時才載
  const bg = el.style.backgroundImage; el.style.backgroundImage = '';
  const io = new IntersectionObserver(es => { if(es[0].isIntersecting){ el.style.backgroundImage = bg; io.disconnect(); } }, { root: $('libList') });
  io.observe(el);
}
let audEl = null;
function audition(p, btn){
  if(audEl){ audEl.pause(); const same = audEl.dataset.p === p; audEl = null; document.querySelectorAll('.pv').forEach(b => b.textContent = '▶'); if(same) return; }
  audEl = new Audio('/m/' + p); audEl.dataset.p = p; audEl.play(); btn.textContent = '■';
  audEl.onended = () => { btn.textContent = '▶'; audEl = null; };
}
async function uploadFiles(files){
  const out = [];
  for(const f of files){
    status('上傳 ' + f.name + '…');
    const r = await fetch('/api/upload', { method:'POST', headers:{ 'X-Name': encodeURIComponent(f.name) }, body:f }).then(r => r.json());
    if(r.p) out.push(r);
  }
  status(out.length ? '已上傳 ' + out.length + ' 個檔案' : '');
  await loadLib();
  return out;
}

/* ═════════════ 新增片段 ═════════════ */
async function makeClips(it, start, track){
  const info = await probe(it.p);
  const out = [];
  if(it.kind === 'audio'){
    out.push([track, { id:uid(), src:it.p, start, dur: info.dur || 1, in:0, speed:1, vol:1, fadeIn:0, fadeOut:0 }]);
    return out;
  }
  const c = { id:uid(), kind:it.kind, src:it.p, start, dur: it.kind === 'image' ? 2 : (info.dur || 2), in:0, speed:1, fit:'cover',
              motion:{type:'none', amt:0.2}, fadeIn:0, fadeOut:0, trans:null };
  out.push([track, c]);
  if(it.kind === 'video' && info.audio){
    // 影片的聲音分到音軌（連結：一起移動、一起變速；可在屬性面板解除連結）
    const at = freeAudioTrack(start, start + c.dur);
    const a = { id:uid(), src:it.p, start, dur:c.dur, in:0, speed:1, vol:1, fadeIn:0, fadeOut:0, link:c.id };
    c.link = a.id;
    out.push([at, a]);
  }
  return out;
}
function freeAudioTrack(a, b){
  for(const t of project.tracks) if(t.type === 'audio' && !t.clips.some(c => c.start < b && c.start + c.dur > a)) return t;
  const t = { id:uid(), type:'audio', name:'A' + (project.tracks.filter(t => t.type === 'audio').length + 1), clips:[] };
  project.tracks.push(t); return t;
}
async function addAtPlayhead(it){
  const type = it.kind === 'audio' ? 'audio' : 'video';
  const track = project.tracks.find(t => t.type === type);
  const before = snapshot();
  (await makeClips(it, frame(playhead), track)).forEach(([t, c]) => t.clips.push(c));
  commit(before);
}

/* ═════════════ 時間軸 ═════════════ */
function laneTop(i){ let y = 0; for(let k = 0; k < i; k++) y += HEAD_H[orderedTracks()[k].type]; return y; }
function orderedTracks(){
  // 畫面上：影像軌由上往下是 V(高)…V1，再接音軌 A1…
  const v = project.tracks.filter(t => t.type === 'video').slice().reverse();
  const a = project.tracks.filter(t => t.type === 'audio');
  return v.concat(a);
}
function renderAll(){ renderHeads(); renderLanes(); renderMarks(); drawRuler(); drawGrid(); renderInspector(); updatePlayhead(); drawStage(); }

function renderHeads(){
  const host = $('heads'); host.innerHTML = '';
  for(const t of orderedTracks()){
    const d = document.createElement('div'); d.className = 'head'; d.style.height = HEAD_H[t.type] + 'px';
    d.innerHTML = '<b>' + t.name + '</b>';
    const b1 = document.createElement('button');
    if(t.type === 'video'){ b1.textContent = '隱'; b1.title = '隱藏這一軌'; b1.classList.toggle('on', !!t.hidden); b1.onclick = () => { const s = snapshot(); t.hidden = !t.hidden; commit(s); }; }
    else { b1.textContent = '靜'; b1.title = '靜音這一軌'; b1.classList.toggle('on', !!t.mute); b1.onclick = () => { const s = snapshot(); t.mute = !t.mute; commit(s); }; }
    const b2 = document.createElement('button'); b2.textContent = '✕'; b2.title = '刪除這一軌（連同片段）';
    b2.onclick = () => { if(t.clips.length && !confirm('刪除 ' + t.name + '（含 ' + t.clips.length + ' 個片段）？')) return; const s = snapshot(); project.tracks = project.tracks.filter(x => x !== t); commit(s); };
    d.append(b1, b2); host.appendChild(d);
  }
}

function renderLanes(){
  const host = $('lanes'); host.innerHTML = '';
  const bEnd = boardCuts().reduce((m, c) => Math.max(m, c.end), 0);
  const width = Math.max(($('tlScroll').clientWidth || 800), (Math.max(totalDur(), bEnd) + 20) * pps);
  $('tlInner').style.width = width + 'px';
  for(const t of orderedTracks()){
    const lane = document.createElement('div'); lane.className = 'lane ' + (t.type === 'video' ? 'v' : 'a');
    lane.style.height = HEAD_H[t.type] + 'px'; lane.dataset.track = t.id;
    lane.addEventListener('dragover', e => { e.preventDefault(); lane.classList.add('drop'); });
    lane.addEventListener('dragleave', () => lane.classList.remove('drop'));
    lane.addEventListener('drop', e => onLaneDrop(e, t, lane));
    lane.addEventListener('pointerdown', e => { if(e.target === lane && e.button === 0) startMarquee(e); });
    for(const c of t.clips) lane.appendChild(clipEl(t, c));
    if(t.type === 'video'){
      for(const c of t.clips){
        const prev = adjacentPrev(t, c); if(!prev) continue;
        const j = document.createElement('div'); j.className = 'junc' + (c.trans ? ' has' : '') + (sel && sel.type === 'junc' && sel.id === c.id ? ' sel' : '');
        j.style.left = (c.start * pps) + 'px';
        j.title = c.trans ? '轉場：' + transName(c.trans.type) + ' ' + c.trans.dur + ' 秒（點選編輯）' : '點一下加入淡入淡出';
        j.addEventListener('pointerdown', e => {
          e.stopPropagation();
          if(!c.trans){ const s = snapshot(); c.trans = { type:'cross', dur:0.25 }; sel = { type:'junc', id:c.id }; commit(s); }
          else { sel = { type:'junc', id:c.id }; renderAll(); }
        });
        lane.appendChild(j);
      }
    }
    host.appendChild(lane);
  }
}
function transName(t){ return { cross:'交叉淡化', black:'經黑', white:'經白' }[t] || t; }

/* ═════════════ 分鏡格（ver -2223） ═════════════
   project.board ＝{ path, cuts:[{no,start,end,video,se,vo,cam,note}] }，由「分鏡」鈕從 xlsx 匯入（server 解析）。
   只是參考格：不輸出、不佔軌；拖曳會吸附它的頭尾，素材單張丟進某一格的時間範圍就自動對齊那一格（dropFit）。 */
const boardCuts = () => (project.board && project.board.cuts) || [];
function cutAt(t){ return boardCuts().find(c => t >= c.start - 1e-6 && t < c.end - 1e-6) || null; }
function renderMarks(){
  const host = $('marks'); host.innerHTML = '';
  const cuts = boardCuts();
  if(!cuts.length){ const e = document.createElement('span'); e.className = 'empty'; e.textContent = '（沒有分鏡 —— 按上面的「分鏡」匯入 xlsx）'; host.appendChild(e); return; }
  const vt = project.tracks.filter(t => t.type === 'video' && t.name !== '字');   // 「有畫面」不算文字
  cuts.forEach((c, i) => {
    const d = document.createElement('div');
    const filled = vt.some(t => t.clips.some(x => x.start < c.end - 1e-6 && x.start + x.dur > c.start + 1e-6));
    d.className = 'mk' + (sel && sel.type === 'mark' && sel.i === i ? ' on' : '') + (filled ? ' fill' : '');
    d.style.left = (c.start * pps) + 'px'; d.style.width = Math.max(4, (c.end - c.start) * pps - 1) + 'px';
    d.innerHTML = '<b>' + (c.no || i + 1) + '</b>'; d.appendChild(document.createTextNode(c.video || c.note || ''));
    d.title = '#' + (c.no || i + 1) + '  ' + fmt(c.start) + '–' + fmt(c.end) + '\n' + [c.video, c.se && '音效：' + c.se, c.vo && '語音：' + c.vo, c.cam && '運鏡：' + c.cam, c.note && '備註：' + c.note].filter(Boolean).join('\n');
    d.addEventListener('pointerdown', e => { e.stopPropagation(); sel = { type:'mark', i }; selIds.clear(); setPlayhead(c.start); renderAll(); });
    host.appendChild(d);
  });
}
async function importBoard(){
  const files = await fetch('/api/storyboards').then(r => r.json());
  showModal('<h3>匯入分鏡表</h3>' + (files.length ? '<p class="dim">選一份（tools/promo 底下的 .xlsx）。重新匯入＝整份換掉，時間軸上的片段不動。</p><ul>' +
    files.map(f => '<li data-p="' + f.replace(/"/g, '&quot;') + '">' + f + '</li>').join('') + '</ul>' : '<p class="dim">tools/promo 底下沒有 .xlsx</p>') +
    (project.board ? '<div class="btns"><button id="bdClear">移除目前的分鏡</button></div>' : ''));
  $('modalBody').querySelectorAll('li').forEach(li => li.onclick = async () => {
    const r = await fetch('/api/storyboard?p=' + encodeURIComponent(li.dataset.p)).then(r => r.json());
    if(r.error || !r.cuts){ status('分鏡讀取失敗：' + (r.error || '')); return; }
    r.cuts.forEach(c => { c.start = frame(c.start); c.end = frame(c.end); });
    edit(() => project.board = { path:r.path, cuts:r.cuts });
    hideModal(); status('已匯入分鏡：' + r.cuts.length + ' 格（' + r.path + '）');
  });
  const cl = $('bdClear'); if(cl) cl.onclick = () => { edit(() => project.board = null); hideModal(); };
}

/* ═════════════ 文字片段（ver -2223） ═════════════
   畫成一張 W×H 的透明圖：預覽拿它 drawSrc（運鏡／淡化照舊），輸出時把同一張轉 PNG 交給 render（所見即所得）。 */
const TEXT_FONTS = [
  ['"Noto Serif TC","Songti TC","PMingLiU",serif', '明體（思源宋體）'],
  ['DFKai-SB,"BiauKai","Kaiti TC",serif', '楷書（標楷體）'],
  ['"Noto Sans TC","Microsoft JhengHei",sans-serif', '黑體'],
  ['Georgia,"Times New Roman",serif', '英文襯線'],
  ['Impact,"Arial Black",sans-serif', 'Impact'],
];
const TEXT_DEF = { text:'標題', font:TEXT_FONTS[1][0], size:110, weight:'bold', color:'#ffffff', x:0.5, y:0.5,
                   stroke:0, strokeColor:'#000000', glow:0, spacing:0, lineH:1.25 };
const textCache = new Map();
function textKey(c){ return JSON.stringify(TEXT_KEYS.map(k => c[k])); }
const TEXT_KEYS = Object.keys(TEXT_DEF);
function textCanvas(c){
  const key = textKey(c); let cv = textCache.get(c.id);
  if(cv && cv._key === key) return cv;
  cv = cv || document.createElement('canvas'); cv.width = W; cv.height = H; cv._key = key;
  const x = cv.getContext('2d'); x.clearRect(0, 0, W, H);
  const o = Object.assign({}, TEXT_DEF, c);
  x.font = o.weight + ' ' + o.size + 'px ' + o.font; x.textAlign = 'center'; x.textBaseline = 'middle';
  try{ x.letterSpacing = o.spacing + 'px'; }catch(_){}
  const lines = String(o.text || '').split('\n'), lh = o.size * o.lineH;
  const y0 = o.y * H - (lines.length - 1) * lh / 2;
  lines.forEach((ln, i) => {
    const px = o.x * W, py = y0 + i * lh;
    if(o.glow > 0){ x.save(); x.shadowColor = o.color; x.shadowBlur = o.glow; x.fillStyle = o.color; x.fillText(ln, px, py); x.fillText(ln, px, py); x.restore(); }
    if(o.stroke > 0){ x.lineJoin = 'round'; x.lineWidth = o.stroke * 2; x.strokeStyle = o.strokeColor; x.strokeText(ln, px, py); }
    x.fillStyle = o.color; x.fillText(ln, px, py);
  });
  textCache.set(c.id, cv);
  return cv;
}
// 字型要等載完才畫得對：載完把快取作廢重畫
document.fonts && document.fonts.ready.then(() => { textCache.forEach(cv => cv._key = null); drawStage(); }).catch(() => {});
function textTrack(){
  // 文字放在名叫「字」的影像軌（最上層）；沒有就建一條
  let t = project.tracks.find(x => x.type === 'video' && x.name === '字');
  if(!t){ t = { id:uid(), type:'video', name:'字', clips:[] }; const idx = project.tracks.findIndex(x => x.type === 'audio'); project.tracks.splice(idx < 0 ? project.tracks.length : idx, 0, t); }
  return t;
}
function addText(){
  const s = snapshot(), t = textTrack();
  const cut = cutAt(playhead);
  let st = cut ? cut.start : frame(playhead), dur = cut ? frame(cut.end - cut.start) : 2;
  const free = placeFree(t.clips, dur, st);
  if(free === null) { status('「字」軌在這裡沒空位'); return; }
  const c = Object.assign({ id:uid(), kind:'text', src:'', start:frame(free), dur, fit:'cover', motion:{type:'none', amt:0.1}, fadeIn:0.15, fadeOut:0.15, trans:null }, TEXT_DEF);
  t.clips.push(c); sel = { type:'clip', id:c.id }; selIds.clear(); selIds.add(c.id);
  commit(s); status('已加入文字（在屬性面板改字）');
}

/* ═════════════ 快剪（ver -2223） ═════════════
   素材庫多選的圖／影片 → 從播放頭起，每張固定秒數（或每 N 拍）排成一串。分鏡格裡就預設填滿那一格。 */
function montage(){
  const items = libOrder.filter(x => libSel.has(x.p) && (x.kind === 'image' || x.kind === 'video'));
  if(items.length < 2){ status('先在素材庫選兩張以上的圖或影片（Ctrl／Shift＋點）'); return; }
  const cut = cutAt(playhead), st0 = cut ? cut.start : frame(playhead);
  const span0 = cut ? cut.end - cut.start : items.length * 0.2;
  showModal('<h3>快剪：' + items.length + ' 個素材</h3>' +
    (cut ? '<p class="dim">播放頭在分鏡 #' + (cut.no || '') + '（' + fmt(cut.start) + '–' + fmt(cut.end) + '）：預設填滿這一格。</p>' : '') +
    '<div class="mt-row"><label>開始（秒）</label><input id="mtStart" type="number" step="0.01" value="' + st0.toFixed(2) + '"></div>' +
    '<div class="mt-row"><label>總長（秒）</label><input id="mtSpan" type="number" step="0.1" value="' + span0.toFixed(2) + '"><span class="dim">素材不夠就循環</span></div>' +
    '<div class="mt-row"><label>切法</label><select id="mtMode"><option value="sec">每張固定秒數</option>' + (beatTimes.length ? '<option value="beat">依拍點</option>' : '') + '</select></div>' +
    '<div class="mt-row"><label>每張秒數</label><input id="mtSec" type="number" step="0.05" value="0.2"></div>' +
    '<div class="mt-row"><label>每幾拍換一張</label><input id="mtBeat" type="number" step="1" min="1" value="1"><span class="dim">' + (beatTimes.length ? '' : '（沒有拍點：先在音訊片段按「以這一段做拍點」）') + '</span></div>' +
    '<div class="mt-row"><label>順序</label><select id="mtOrder"><option value="shuffle">隨機</option><option value="lib">照素材庫順序</option></select></div>' +
    '<div class="mt-row"><label>影片取哪一段</label><select id="mtFrom"><option value="mid">中段</option><option value="start">開頭</option><option value="rand">隨機</option></select></div>' +
    '<div class="btns"><button id="mtGo" class="primary">排進時間軸</button></div>');
  $('mtGo').onclick = async () => {
    const start = frame(+$('mtStart').value || 0), end = frame(start + Math.max(1 / FPS, +$('mtSpan').value || 0));
    let cutsT = [];
    if($('mtMode').value === 'beat' && beatTimes.length){
      const n = Math.max(1, Math.round(+$('mtBeat').value || 1));
      const bs = beatTimes.filter(b => b > start + 1e-6 && b < end - 1e-6).filter((_, i) => (i + 1) % n === 0);
      cutsT = [start, ...bs.map(frame), end];
    } else {
      const sec = Math.max(2 / FPS, +$('mtSec').value || 0.2);
      for(let t = start; t < end - 1e-6; t = frame(t + sec)) cutsT.push(t);
      cutsT.push(end);
    }
    let order = items.slice();
    const shuffle = a => { for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    if($('mtOrder').value === 'shuffle') shuffle(order);
    const from = $('mtFrom').value;
    // 放哪一軌：這段時間完全空著的影像軌（「字」軌除外，由下往上）；都沒有就新開一條
    const s = snapshot();
    let tr = project.tracks.find(t => t.type === 'video' && t.name !== '字' && !overlapsAny(t.clips, start, end - start));
    if(!tr){ tr = { id:uid(), type:'video', name:'V' + (project.tracks.filter(t => t.type === 'video').length + 1), clips:[] };
             const idx = project.tracks.findIndex(t => t.type === 'audio' || t.name === '字'); project.tracks.splice(idx < 0 ? project.tracks.length : idx, 0, tr); }
    status('排快剪…');
    let k = 0;
    for(let i = 0; i + 1 < cutsT.length; i++){
      const a = cutsT[i], d = frame(cutsT[i + 1] - a); if(d < 1 / FPS) continue;
      if(k > 0 && k % order.length === 0 && $('mtOrder').value === 'shuffle'){ const last = order[order.length - 1]; shuffle(order); if(order[0] === last && order.length > 1) order.push(order.shift()); }
      const it = order[k % order.length]; k++;
      const c = { id:uid(), kind:it.kind, src:it.p, start:a, dur:d, in:0, speed:1, fit:'cover', motion:{type:'none', amt:0.2}, fadeIn:0, fadeOut:0, trans:null };
      if(it.kind === 'video'){
        const len = (await probe(it.p)).dur || 0, room = Math.max(0, len - d);
        c.in = frame(from === 'start' ? 0 : from === 'rand' ? Math.random() * room : room / 2);
      }
      tr.clips.push(c);
    }
    sel = null; selIds.clear(); commit(s); hideModal();
    status('快剪：' + k + ' 段，放在 ' + tr.name + '（' + fmt(start) + '–' + fmt(end) + '）');
  };
}

function clipEl(t, c){
  const d = document.createElement('div');
  const isA = t.type === 'audio';
  d.className = 'clip ' + (isA ? 'aud' : c.kind === 'image' ? 'img' : c.kind === 'color' ? 'col' : c.kind === 'text' ? 'txt' : 'vid') + ((sel && sel.type === 'clip' && sel.id === c.id) || selIds.has(c.id) ? ' sel' : '');
  d.dataset.id = c.id;
  d.style.left = (c.start * pps) + 'px'; d.style.width = Math.max(4, c.dur * pps) + 'px';
  if(!isA && c.kind === 'video') d.style.backgroundImage = 'url("/api/thumb?p=' + encodeURIComponent(c.src) + '&t=' + ((c.in || 0) + 0.3).toFixed(2) + '")';
  if(!isA && c.kind === 'image') d.style.backgroundImage = 'url("/m/' + encodeURI(c.src) + '")';
  const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = c.kind === 'text' ? '字　' + String(c.text || '').replace(/\n/g, ' ') : (c.link ? '🔗 ' : '') + baseName(c.src || '色塊');
  const meta = document.createElement('div'); meta.className = 'meta';
  const bits = [c.dur.toFixed(2) + 's'];
  if((c.speed || 1) !== 1) bits.push('×' + (+c.speed).toFixed(2));
  if(c.motion && c.motion.type !== 'none') bits.push({up:'↑', down:'↓', lr:'→', rl:'←', zin:'推近', zout:'拉遠'}[c.motion.type]);
  if(isA && c.vol !== 1) bits.push('音量 ' + Math.round(c.vol * 100) + '%');
  meta.textContent = bits.join('  ');
  d.append(lab, meta);
  if(c.fadeIn){ const f = document.createElement('div'); f.className = 'fi'; f.style.width = (c.fadeIn * pps) + 'px'; d.appendChild(f); }
  if(c.fadeOut){ const f = document.createElement('div'); f.className = 'fo'; f.style.width = (c.fadeOut * pps) + 'px'; d.appendChild(f); }
  const hl = document.createElement('div'); hl.className = 'h l'; const hr = document.createElement('div'); hr.className = 'h r';
  d.append(hl, hr);
  if(isA) envEl(d, c);
  // 右上角的小圓點：拉它＝改速度（邊緣是裁切）
  let sp = null;
  if(c.kind === 'video' || isA){ sp = document.createElement('div'); sp.className = 'spd'; sp.title = '拖曳改速度：往右＝變慢、往左＝變快'; d.appendChild(sp); }
  d.addEventListener('pointerdown', e => startDrag(e, t, c, e.target === hl ? 'l' : e.target === hr ? 'r' : (sp && e.target === sp) ? 'spd' : 'move'));
  return d;
}

/* ═════════════ 響度調節線（ver -2224，Ray：「加入音源響度調節線，拉中段調整段響度，尾段可拉淡出角度」）═════════════
   音訊片段上一條線：中段的高度＝音量（正中央 100%、頂 200%、底 0%），頭尾兩條斜線＝淡入／淡出。
   · 上下拖中段 → c.vol　· 左右拖尾端的點 → c.fadeOut（斜線的角度）　· 頭端的點 → c.fadeIn
   ⚠ 只是同一組欄位（vol／fadeIn／fadeOut）的另一個入口 —— 輸出（render.py 的 volume／afade）與預覽照舊讀它們。 */
const ENV_MAX = 2;
function envEl(d, c){
  const w = Math.max(4, c.dur * pps), fi = (c.fadeIn || 0) * pps, fo = (c.fadeOut || 0) * pps;
  const yp = 100 * (1 - clamp(c.vol ?? 1, 0, ENV_MAX) / ENV_MAX);
  const NS = 'http://www.w3.org/2000/svg', sv = document.createElementNS(NS, 'svg');
  sv.setAttribute('class', 'env'); sv.setAttribute('viewBox', '0 0 ' + w + ' 100'); sv.setAttribute('preserveAspectRatio', 'none');
  const pts = '0,100 ' + fi + ',' + yp + ' ' + (w - fo) + ',' + yp + ' ' + w + ',100';
  const pl = document.createElementNS(NS, 'polyline'); pl.setAttribute('points', pts); pl.setAttribute('class', 'env-line'); sv.appendChild(pl);
  d.appendChild(sv);
  const mid = document.createElement('div'); mid.className = 'env-mid'; mid.title = '上下拖：調這一段的音量';
  mid.style.left = fi + 'px'; mid.style.right = fo + 'px'; mid.style.top = 'calc(' + yp + '% - 5px)';
  const kin = document.createElement('div'); kin.className = 'env-k'; kin.title = '左右拖：淡入長度'; kin.style.left = (fi - 5) + 'px'; kin.style.top = 'calc(' + yp + '% - 5px)';
  const kout = document.createElement('div'); kout.className = 'env-k'; kout.title = '左右拖：淡出長度（斜線角度）'; kout.style.left = (w - fo - 5) + 'px'; kout.style.top = 'calc(' + yp + '% - 5px)';
  d.append(mid, kin, kout);
  const lab = document.createElement('div'); lab.className = 'env-lab';
  const go = (e, kind) => {
    e.stopPropagation(); e.preventDefault(); lastArea = 'tl';
    sel = { type:'clip', id:c.id }; selIds.clear(); selIds.add(c.id);
    const before = snapshot(), r = d.getBoundingClientRect(), x0 = e.clientX, o = { vol:c.vol ?? 1, fi:c.fadeIn || 0, fo:c.fadeOut || 0 };
    let moved = false;
    const onMove = ev => {
      moved = true;
      if(kind === 'mid') c.vol = Math.round(clamp(ENV_MAX * (1 - (ev.clientY - r.top) / r.height), 0, ENV_MAX) * 100) / 100;
      else if(kind === 'out') c.fadeOut = frame(clamp(o.fo - (ev.clientX - x0) / pps, 0, c.dur - (c.fadeIn || 0)));
      else c.fadeIn = frame(clamp(o.fi + (ev.clientX - x0) / pps, 0, c.dur - (c.fadeOut || 0)));
      renderLanes(); renderInspector();
    };
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); if(moved) commit(before); else renderAll(); };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  };
  mid.addEventListener('pointerdown', e => go(e, 'mid'));
  kin.addEventListener('pointerdown', e => go(e, 'in'));
  kout.addEventListener('pointerdown', e => go(e, 'out'));
}

function xToT(e){ const r = $('tlInner').getBoundingClientRect(); return Math.max(0, (e.clientX - r.left) / pps); }
function trackAtY(clientY){
  const r = $('lanes').getBoundingClientRect(); let y = clientY - r.top, acc = 0;
  for(const t of orderedTracks()){ acc += HEAD_H[t.type]; if(y < acc) return t; }
  return null;
}

/* 吸附：拍點、其他片段的邊、播放頭、0 */
function snapPoints(exclude){
  const pts = [0, playhead];
  for(const [, c] of allClips()) if(!exclude.has(c.id)){ pts.push(c.start, c.start + c.dur); }
  for(const c of boardCuts()) pts.push(c.start, c.end);   // 分鏡格的頭尾
  return pts.concat(beatTimes);
}
function snap(t, pts){
  if(!$('snap').checked) return frame(t);
  let best = t, bd = SNAP_PX / pps;
  for(const p of pts){ const d = Math.abs(p - t); if(d < bd){ bd = d; best = p; } }
  return frame(best);
}

/* 同軌不交疊：拖到別的片段上時，貼到它的頭或尾（無縫接上），取離想去的位置最近、而且放得下的那一個。
   放不下（夾在兩段之間太窄、或會壓到別段）回 null，呼叫端就停在上一個合法位置。 */
const OVL_EPS = 0.5 / FPS;
function overlapsAny(clips, s, dur){ return clips.some(o => s < o.start + o.dur - OVL_EPS && s + dur > o.start + OVL_EPS); }
function placeFree(clips, dur, want){
  const ok = s => s >= -OVL_EPS && !overlapsAny(clips, s, dur);
  if(ok(want)) return Math.max(0, want);
  let best = null;
  for(const o of clips) for(const s of [o.start + o.dur, o.start - dur])
    if(ok(s) && (best === null || Math.abs(s - want) < Math.abs(best - want))) best = Math.max(0, s);
  return best;
}
/* 群組一起移：試「拖的位移」本身，以及讓群組內任一段貼齊任一個外部片段頭尾的位移，取最近而且全部放得下的那一個 */
function groupFreeDelta(group, orig, want, minD){
  const outside = new Map();   // trackId → 不在群組內的片段
  const items = [...group.values()].map(x => { const [t] = findClip(x.id); return { x, t, s0:orig.get(x.id) }; });
  for(const it of items) if(!outside.has(it.t.id)) outside.set(it.t.id, it.t.clips.filter(o => !group.has(o.id)));
  const ok = d => d >= minD - OVL_EPS && items.every(it => !overlapsAny(outside.get(it.t.id), it.s0 + d, it.x.dur));
  if(ok(want)) return want;
  let best = null;
  for(const it of items) for(const o of outside.get(it.t.id)) for(const d of [o.start + o.dur - it.s0, o.start - it.x.dur - it.s0])
    if(ok(d) && (best === null || Math.abs(d - want) < Math.abs(best - want))) best = d;
  return best;
}
/* 裁切的邊界：這一段原本的位置，左邊最近一段的尾、右邊最近一段的頭 */
function trimBounds(track, ex, s, e){
  let lo = 0, hi = Infinity;
  for(const o of track.clips){ if(ex.has(o.id)) continue;
    if(o.start + o.dur <= s + OVL_EPS) lo = Math.max(lo, o.start + o.dur);
    else if(o.start >= e - OVL_EPS) hi = Math.min(hi, o.start); }
  return { lo, hi };
}

function startDrag(e, track, c, mode){
  if(e.button === 1) return startRipple(e, c);
  if(e.button !== 0) return;
  e.stopPropagation(); e.preventDefault();
  lastArea = 'tl';
  // Ctrl／Shift＋點＝加入或移出多選，不拖
  if(mode === 'move' && (e.ctrlKey || e.metaKey || e.shiftKey)){
    if(sel && sel.type === 'clip') selIds.add(sel.id);
    selIds.has(c.id) ? selIds.delete(c.id) : selIds.add(c.id);
    sel = selIds.size === 1 ? { type:'clip', id:[...selIds][0] } : null;
    renderAll(); return;
  }
  if(mode === 'move' && selIds.size > 1 && selIds.has(c.id)) return startGroupMove(e, c);
  sel = { type:'clip', id:c.id }; selIds.clear(); selIds.add(c.id);
  const before = snapshot();
  const linked = c.link ? findClip(c.link)[1] : null;
  const ex = new Set([c.id]); if(linked) ex.add(linked.id);
  const pts = snapPoints(ex);
  const x0 = e.clientX;
  const o = { start:c.start, dur:c.dur, in:c.in || 0, speed:c.speed || 1 };
  const lo = linked && { start:linked.start, dur:linked.dur, in:linked.in || 0, speed:linked.speed || 1 };
  const isMedia = c.kind === 'video' || track.type === 'audio';
  const srcLen = (c.src && probeCache[c.src] && probeCache[c.src].dur) || 0;   // 素材全長（0＝還不知道，不夾）
  if(c.src && !probeCache[c.src]) probe(c.src);
  // 裁切的邊界（同軌不交疊）：連結的聲音同步裁切，它那一軌的鄰居也要算進來
  const tb = trimBounds(track, ex, o.start, o.start + o.dur);
  if(linked){ const [lt] = findClip(linked.id); const b = trimBounds(lt, ex, o.start, o.start + o.dur); tb.lo = Math.max(tb.lo, b.lo); tb.hi = Math.min(tb.hi, b.hi); }
  let moved = false;
  const onMove = ev => {
    const dt = (ev.clientX - x0) / pps;
    if(Math.abs(ev.clientX - x0) > 2) moved = true;
    if(mode === 'move'){
      // 起點與終點都試著吸附，取比較近的那一個
      let ns = o.start + dt;
      const s1 = snap(ns, pts), s2 = snap(ns + o.dur, pts) - o.dur;
      ns = Math.abs(s1 - ns) <= Math.abs(s2 - ns) ? s1 : s2;
      ns = Math.max(0, frame(ns));
      const hov = trackAtY(ev.clientY);
      const tt = (hov && hov.type === track.type) ? hov : track;
      // 同軌碰到別段 → 貼齊它的頭或尾；連結的聲音在它那一軌也不能壓到別段，放不下就停在原地
      const off = linked ? lo.start - o.start : 0;
      const lt = linked ? findClip(linked.id)[0] : null;
      const cands = [placeFree(tt.clips.filter(x => x !== c), o.dur, ns)];
      if(linked){ const la = placeFree(lt.clips.filter(x => x !== linked), linked.dur, ns + off); if(la !== null) cands.push(la - off); }
      const fit = cands.filter(s => s !== null && s >= 0 && !overlapsAny(tt.clips.filter(x => x !== c), s, o.dur) &&
                                  (!linked || !overlapsAny(lt.clips.filter(x => x !== linked), s + off, linked.dur)))
                       .sort((a, b) => Math.abs(a - ns) - Math.abs(b - ns))[0];
      if(fit === undefined) return;
      c.start = frame(fit);
      if(tt !== track){ track.clips = track.clips.filter(x => x !== c); tt.clips.push(c); track = tt; }
      if(linked) linked.start = Math.max(0, frame(c.start + off));
    } else {
      if(mode === 'spd'){
        // 改速度：用掉的素材不變，終點移動 → 拉長變慢、縮短變快
        const srcSpan = o.dur * o.speed;
        let end = snap(o.start + o.dur + dt, pts); end = Math.max(o.start + 2 / FPS, Math.min(end, tb.hi));
        c.speed = clamp(srcSpan / (end - o.start), 0.1, 8); c.dur = Math.min(srcSpan / c.speed, tb.hi - o.start);
      } else if(mode === 'r'){
        // 裁切右邊：速度不變，不超過素材結尾
        let end = snap(o.start + o.dur + dt, pts); end = Math.max(o.start + 2 / FPS, end);
        if(isMedia && srcLen) end = Math.min(end, Math.max(o.start + o.dur, o.start + (srcLen - o.in) / o.speed));   // 本來就比素材長（停最後一格）的不吃短
        end = Math.min(end, tb.hi);   // 不壓到右邊那一段：碰到就停在它的頭（無縫）
        c.dur = end - o.start;
      } else {
        // 裁切左邊：終點不動，素材起點跟著移，不早於素材開頭
        let st = snap(o.start + dt, pts);
        const minSt = Math.max(tb.lo, isMedia ? Math.max(0, o.start - o.in / o.speed) : 0);   // 不壓到左邊那一段
        st = clamp(st, minSt, o.start + o.dur - 2 / FPS);
        if(isMedia) c.in = Math.max(0, o.in + (st - o.start) * o.speed);
        c.start = st; c.dur = o.start + o.dur - st;
      }
      c.dur = frame(c.dur); c.start = frame(c.start);
      if(linked){ linked.start = c.start; linked.dur = c.dur; linked.speed = c.speed; linked.in = c.in; }
    }
    renderLanes(); renderInspector(); drawStage();
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
    if(moved) commit(before); else renderAll();
  };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
}

/* 多選一起移動：以拖的那一段吸附，其餘照同一個位移（連結的聲音也跟著） */
function startGroupMove(e, c){
  const before = snapshot();
  const group = new Map();
  for(const id of selIds){ const [, x] = findClip(id); if(!x) continue; group.set(x.id, x); if(x.link){ const [, l] = findClip(x.link); if(l) group.set(l.id, l); } }
  const orig = new Map([...group].map(([id, x]) => [id, x.start]));
  const minStart = Math.min(...orig.values());
  const pts = snapPoints(new Set(group.keys()));
  const x0 = e.clientX, o = c.start; let moved = false;
  const onMove = ev => {
    if(Math.abs(ev.clientX - x0) > 2) moved = true;
    let ns = o + (ev.clientX - x0) / pps;
    const s1 = snap(ns, pts), s2 = snap(ns + c.dur, pts) - c.dur;
    ns = Math.abs(s1 - ns) <= Math.abs(s2 - ns) ? s1 : s2;
    // 同軌不交疊：碰到群組外的片段就整組貼齊它；放不下就停在上一個合法位置
    const d = groupFreeDelta(group, orig, Math.max(frame(ns - o), -minStart), -minStart);
    if(d === null) return;
    group.forEach((x, id) => x.start = frame(orig.get(id) + d));
    renderLanes(); drawStage();
  };
  const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); if(moved) commit(before); else renderAll(); };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
}
/* ═════════════ 中鍵：連後面一起推（ver -2223，Ray：「平移影格把後面的往後推，按中間鈕」）═════════════
   中鍵按住拖一段 ＝ 這一段＋所有「開始時間在它之後」的片段（每一軌都算，音效語音才不會跟畫面脫節）一起平移。
   往左拉最多拉到「前面那一段的尾巴」（同軌不交疊）；BGM 這種從更早就開始的長片段不動。分鏡格不動（它是參考）。 */
function startRipple(e, c){
  e.preventDefault(); e.stopPropagation(); lastArea = 'tl';
  const before = snapshot();
  const pivot = c.start - 0.5 / FPS;
  const moving = new Map();
  for(const [t, x] of allClips()) if(x.start >= pivot) moving.set(x.id, [t, x]);
  const orig = new Map([...moving].map(([id, [, x]]) => [id, x.start]));
  // 往左的極限：每一軌「被推的第一段」不能撞到同軌「沒被推、在它前面」的那一段的尾巴
  let minD = -Infinity;
  for(const t of project.tracks){
    const mv = t.clips.filter(x => moving.has(x.id)); if(!mv.length) continue;
    const first = Math.min(...mv.map(x => x.start));
    const prevEnd = Math.max(0, ...t.clips.filter(x => !moving.has(x.id) && x.start < first).map(x => x.start + x.dur));
    minD = Math.max(minD, prevEnd - first);
  }
  sel = { type:'clip', id:c.id }; selIds.clear(); moving.forEach((_, id) => selIds.add(id));
  const pts = snapPoints(new Set(moving.keys()));
  const x0 = e.clientX, o = c.start; let moved = false;
  status('中鍵拖曳：連後面 ' + moving.size + ' 段一起移');
  const onMove = ev => {
    if(Math.abs(ev.clientX - x0) > 2) moved = true;
    let ns = snap(o + (ev.clientX - x0) / pps, pts);
    const d = Math.max(frame(ns - o), minD);
    moving.forEach(([, x], id) => x.start = frame(orig.get(id) + d));
    renderLanes(); renderMarks(); drawStage();
    status('連後面 ' + moving.size + ' 段一起移 ' + (d >= 0 ? '+' : '') + d.toFixed(2) + ' 秒');
  };
  const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); if(moved) commit(before); else renderAll(); };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
}
/* ═════════════ 框選（ver -2223）═════════════
   時間軸空白處按住拖 ＝ 拉一個框，框到的片段全選（跨軌）；加 Ctrl／Shift ＝ 加進原本的選取。只點一下不拖 ＝ 移播放頭（舊行為）。 */
function startMarquee(e){
  lastArea = 'tl';
  const host = $('lanes'), hr = host.getBoundingClientRect();
  const x0 = e.clientX, y0 = e.clientY, add = e.ctrlKey || e.metaKey || e.shiftKey;
  const keep = add ? new Set(selIds) : new Set();
  if(add && sel && sel.type === 'clip') keep.add(sel.id);
  let box = null;
  const onMove = ev => {
    if(!box){ if(Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) < 5) return; box = document.createElement('div'); box.id = 'marquee'; host.appendChild(box); }
    const l = Math.min(x0, ev.clientX), r = Math.max(x0, ev.clientX), t = Math.min(y0, ev.clientY), b = Math.max(y0, ev.clientY);
    Object.assign(box.style, { left:(l - hr.left) + 'px', top:(t - hr.top) + 'px', width:(r - l) + 'px', height:(b - t) + 'px' });
    selIds.clear(); keep.forEach(id => selIds.add(id));
    host.querySelectorAll('.clip').forEach(el => {
      const q = el.getBoundingClientRect();
      if(q.right > l && q.left < r && q.bottom > t && q.top < b) selIds.add(el.dataset.id);
      el.classList.toggle('sel', selIds.has(el.dataset.id));
    });
  };
  const onUp = ev => {
    window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
    if(!box){ sel = null; selIds.clear(); setPlayhead(xToT(ev)); renderAll(); return; }
    box.remove();
    sel = selIds.size === 1 ? { type:'clip', id:[...selIds][0] } : null;
    status(selIds.size ? '框選 ' + selIds.size + ' 個片段（拖其中一段＝整批移動）' : '');
    renderAll();
  };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
}
function selectAll(){
  if(lastArea === 'lib'){ libSel.clear(); libOrder.forEach(x => libSel.add(x.p)); paintLibSel(); return; }
  selIds.clear(); allClips().forEach(([, c]) => selIds.add(c.id)); sel = null;
  status('時間軸已選 ' + selIds.size + ' 個片段'); renderAll();
}
/* Shift+↓／↑：以播放頭為界選後段／前段（看片段的開始時間：跨在播放頭上的那段算前段） */
function selectSide(side){
  const eps = 0.5 / FPS;
  selIds.clear();
  allClips().forEach(([, c]) => { if(side === 'after' ? c.start >= playhead - eps : c.start < playhead - eps) selIds.add(c.id); });
  sel = selIds.size === 1 ? { type:'clip', id:[...selIds][0] } : null; lastArea = 'tl';
  status((side === 'after' ? '後段' : '前段') + '已選 ' + selIds.size + ' 個片段（播放頭 ' + fmt(playhead) + '）');
  renderAll();
}
/* 目前選到的片段（含連結的聲音） */
function selectedClips(){
  const ids = new Set(selIds); if(sel && sel.type === 'clip') ids.add(sel.id);
  const out = new Map();
  for(const id of ids){
    const [t, c] = findClip(id); if(!c) continue; out.set(c.id, [t, c]);
    if(c.link){ const [lt, l] = findClip(c.link); if(l) out.set(l.id, [lt, l]); }
  }
  return [...out.values()];
}
function copySel(){
  const items = selectedClips(); if(!items.length) return false;
  clipboard = { items: items.map(([t, c]) => ({ trackId:t.id, type:t.type, clip:JSON.parse(JSON.stringify(c)) })),
                minStart: Math.min(...items.map(([, c]) => c.start)) };
  status('已複製 ' + items.length + ' 個片段'); return true;
}
function cutSel(){ if(copySel()) delSel(); }
function pasteClip(){
  if(!clipboard) return;
  const s = snapshot(), idMap = {}, made = [];
  clipboard.items.forEach(it => idMap[it.clip.id] = uid());
  for(const it of clipboard.items){
    const t = project.tracks.find(x => x.id === it.trackId) || project.tracks.find(x => x.type === it.type);
    if(!t) continue;
    const c = JSON.parse(JSON.stringify(it.clip));
    c.id = idMap[c.id]; c.link = c.link ? (idMap[c.link] || null) : null;
    c.start = frame(playhead + (it.clip.start - clipboard.minStart));
    t.clips.push(c); made.push(c);
  }
  selIds.clear(); made.forEach(c => selIds.add(c.id)); sel = made.length === 1 ? { type:'clip', id:made[0].id } : null;
  commit(s); status('已貼上 ' + made.length + ' 個片段');
}

async function onLaneDrop(e, track, lane){
  e.preventDefault(); lane.classList.remove('drop');
  const t = snap(xToT(e), snapPoints(new Set()));
  let items = [];
  const raw = e.dataTransfer.getData('text/tivot');
  if(raw){ const v = JSON.parse(raw); items = Array.isArray(v) ? v : [v]; }
  else if(e.dataTransfer.files && e.dataTransfer.files.length) items = await uploadFiles([...e.dataTransfer.files]);
  const before = snapshot(); let at = t;
  // 單張圖／影片丟進分鏡格的時間範圍 → 對齊那一格（ver -2223）
  const cut = (items.length === 1 && items[0].kind !== 'audio' && track.type === 'video' && $('snap').checked) ? cutAt(xToT(e)) : null;
  if(cut) at = cut.start;
  for(const it of items){
    const want = it.kind === 'audio' ? 'audio' : 'video';
    const tr = track.type === want ? track : project.tracks.find(x => x.type === want);
    const made = await makeClips(it, at, tr);
    if(cut){ const len = frame(cut.end - cut.start); made.forEach(([, c]) => { c.start = cut.start; c.dur = it.kind === 'image' ? len : Math.min(c.dur, len); });
             const v = made[0][1]; made.slice(1).forEach(([, c]) => c.dur = v.dur); status('已對齊分鏡 #' + (cut.no || '')); }
    made.forEach(([tt, c]) => tt.clips.push(c));
    at += made[0][1].dur;
  }
  if(items.length){ sel = null; selIds.clear(); commit(before); }
}

/* 尺規與格線（拍點） */
function drawRuler(){
  const cv = $('ruler'), sc = $('tlScroll');
  const w = sc.clientWidth; cv.width = w; cv.style.width = w + 'px';
  const g = cv.getContext('2d'); g.clearRect(0, 0, w, 26);
  const t0 = sc.scrollLeft / pps, t1 = (sc.scrollLeft + w) / pps;
  const step = pps > 200 ? 0.5 : pps > 60 ? 1 : pps > 25 ? 2 : 5;
  g.fillStyle = '#8b8a93'; g.strokeStyle = '#3a3a46'; g.font = '10px Consolas';
  for(let s = Math.floor(t0 / step) * step; s <= t1; s += step){
    const x = (s - t0) * pps;
    g.beginPath(); g.moveTo(x + .5, 14); g.lineTo(x + .5, 26); g.stroke();
    g.fillText(fmt(s).replace(/\.\d+$/, ''), x + 3, 11);
  }
  g.fillStyle = '#d8b46a';
  beatTimes.forEach((b, i) => { if(b < t0 || b > t1) return; const x = (b - t0) * pps; g.fillRect(x, i % 4 === 0 ? 17 : 21, 1, i % 4 === 0 ? 9 : 5); });
}
function drawGrid(){
  const cv = $('grid'), sc = $('tlScroll');
  const w = sc.clientWidth, h = $('lanes').offsetHeight;
  cv.width = w; cv.height = h; cv.style.left = sc.scrollLeft + 'px';
  const g = cv.getContext('2d'); g.clearRect(0, 0, w, h);
  if(!beatTimes.length) return;
  const t0 = sc.scrollLeft / pps, t1 = (sc.scrollLeft + w) / pps;
  beatTimes.forEach((b, i) => {
    if(b < t0 || b > t1) return; const x = Math.round((b - t0) * pps) + .5;
    g.strokeStyle = i % 16 === 0 ? '#d8b46a55' : i % 4 === 0 ? '#d8b46a30' : '#ffffff10';
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
  });
}
function updatePlayhead(){
  $('playhead').style.left = (playhead * pps) + 'px';
  $('tc').textContent = fmt(playhead); $('tcTotal').textContent = fmt(totalDur());
}
function setPlayhead(t){ playhead = Math.max(0, t); if(playing){ playT0 = playhead; playP0 = performance.now(); } updatePlayhead(); syncMedia(true); drawStage(); }

/* 拍點：project.beat ＝{clip:<音訊片段 id>}，拍點跟著那一段在時間軸上的位置與速度走 */
let beatRaw = null, beatFor = null;
async function loadBeats(){
  beatTimes = [];
  const b = project.beat; if(!b) { drawRuler(); drawGrid(); return; }
  const [, c] = findClip(b.clip); if(!c){ project.beat = null; return; }
  if(beatFor !== c.src){ status('分析拍點…'); beatRaw = await fetch('/api/beats?p=' + encodeURIComponent(c.src)).then(r => r.json()); beatFor = c.src; status('拍點：' + beatRaw.bpm.toFixed(1) + ' BPM'); }
  computeBeats();
}
function computeBeats(){
  beatTimes = [];
  const b = project.beat; if(!b || !beatRaw) return;
  const [, c] = findClip(b.clip); if(!c) return;
  const sp = c.speed || 1;
  for(const s of beatRaw.beats){ const t = c.start + (s - (c.in || 0)) / sp; if(t >= c.start - 1e-6 && t <= c.start + c.dur + 1e-6) beatTimes.push(t); }
  drawRuler(); drawGrid();
}

/* ═════════════ 屬性面板 ═════════════ */
function renderInspector(){
  const host = $('insp'); host.innerHTML = '';
  if(selIds.size > 1){
    host.innerHTML = '<h3>已選 ' + selIds.size + ' 個片段</h3>';
    const bs = document.createElement('div'); bs.className = 'btns';
    bs.append(btn('全部刪除', delSel), btn('取消選取', () => { sel = null; selIds.clear(); renderAll(); }));
    host.append(bs, note('拖其中一段＝整批一起移動。<br><kbd>Ctrl</kbd>／<kbd>Shift</kbd>＋點＝加入或移出選取。<br><kbd>Ctrl+C</kbd>／<kbd>X</kbd>／<kbd>V</kbd> 複製／剪下／貼上（貼在播放頭）。<br><kbd>Esc</kbd> 取消選取。'));
    return;
  }
  if(sel && sel.type === 'mark'){
    const m = boardCuts()[sel.i]; if(!m){ sel = null; return renderInspector(); }
    host.innerHTML = '<h3>分鏡 #' + (m.no || sel.i + 1) + '</h3>';
    const b = document.createElement('div'); b.className = 'board';
    const dl = document.createElement('dl');
    [['時間', fmt(m.start) + ' – ' + fmt(m.end) + '（' + (m.end - m.start).toFixed(2) + ' 秒）'], ['影像', m.video], ['音效', m.se], ['語音', m.vo], ['運鏡', m.cam], ['備註', m.note]]
      .forEach(([k, v]) => { if(!v) return; const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; dl.append(dt, dd); });
    b.appendChild(dl); host.appendChild(b);
    const bs = document.createElement('div'); bs.className = 'btns';
    bs.append(btn('在這一格加文字', addText), btn('快剪填滿這一格', montage));
    host.append(bs, note('素材庫的圖／影片<b>單張</b>拖進這一格的時間範圍，會自動對齊這一格（開始＝格頭、長度＝格長；影片比格短就用影片長）。<br>格子下緣有綠線＝這一格已經有畫面。'));
    return;
  }
  if(sel && sel.type === 'junc'){
    const [, c] = findClip(sel.id); if(!c || !c.trans){ sel = null; selIds.clear(); return renderInspector(); }
    host.innerHTML = '<h3>轉場（淡入淡出）</h3>';
    host.append(rowSelect('種類', c.trans.type, [['cross','交叉淡化'],['black','經黑'],['white','經白']], v => edit(() => c.trans.type = v)));
    host.append(rowNum('長度（秒）', c.trans.dur, 0.02, v => edit(() => c.trans.dur = clamp(v, 1 / FPS, 5))));
    const bs = document.createElement('div'); bs.className = 'btns';
    bs.append(btn('移除轉場', () => edit(() => { c.trans = null; sel = null; selIds.clear(); })));
    host.append(bs, note('交叉淡化：前一段延長、這一段從切點前半段時間就淡進來。<br>經黑／經白：前一段淡到黑（白），這一段再從黑（白）淡回來。'));
    return;
  }
  if(sel && sel.type === 'clip'){
    const [t, c] = findClip(sel.id); if(!c){ sel = null; selIds.clear(); return renderInspector(); }
    const isA = t.type === 'audio';
    host.innerHTML = '<h3>' + (isA ? '聲音片段' : c.kind === 'image' ? '圖片片段' : c.kind === 'color' ? '色塊' : c.kind === 'text' ? '文字' : '影片片段') + '</h3>';
    if(c.kind === 'text') textRows(host, c);
    if(c.src){ const s = document.createElement('div'); s.className = 'src'; s.textContent = c.src; host.append(s); }
    host.append(rowNum('開始', c.start, 1 / FPS, v => edit(() => moveClip(c, Math.max(0, frame(v))))));
    host.append(rowNum('長度', c.dur, 1 / FPS, v => edit(() => setDur(c, Math.max(2 / FPS, frame(v)), t))));
    if(c.kind === 'video' || isA){
      host.append(rowNum('素材起點', c.in || 0, 0.04, v => edit(() => { c.in = Math.max(0, v); syncLink(c); })));
      host.append(rowNum('速度', c.speed || 1, 0.05, v => edit(() => setSpeed(c, clamp(v, 0.1, 8)))));
    }
    if(!isA){
      if(c.kind !== 'text') host.append(rowSelect('適配', c.fit || 'cover', [['cover','填滿（裁切）'],['contain','完整（留黑）']], v => edit(() => c.fit = v)));
      if(c.kind === 'color') host.append(rowColor('顏色', c.color || '#000000', v => edit(() => c.color = v)));
      host.append(rowSelect('運鏡', (c.motion || {}).type || 'none',
        [['none','無'],['up','由下往上平移'],['down','由上往下平移'],['lr','由左往右平移'],['rl','由右往左平移'],['zin','慢推（放大）'],['zout','慢拉（縮小）']],
        v => edit(() => { c.motion = c.motion || {amt:0.2}; c.motion.type = v; })));
      if(c.kind === 'video' || c.kind === 'image'){
        // 裁切（素材的 %）：素材自己有黑邊時用（ver -2224）
        const cr = c.crop || {}, setCr = (k, v) => edit(() => { c.crop = Object.assign({}, c.crop || {}, { [k]: clamp(v, 0, 45) / 100 }); });
        host.append(rowNum('裁上 %', +((cr.t || 0) * 100).toFixed(2), 0.5, v => setCr('t', v)), rowNum('裁下 %', +((cr.b || 0) * 100).toFixed(2), 0.5, v => setCr('b', v)),
                    rowNum('裁左 %', +((cr.l || 0) * 100).toFixed(2), 0.5, v => setCr('l', v)), rowNum('裁右 %', +((cr.r || 0) * 100).toFixed(2), 0.5, v => setCr('r', v)));
      }
      host.append(rowSelect('閃爍', c.flicker ? 'on' : 'off', [['off','無'],['on','閃爍（整段）']], v => edit(() => { if(v === 'on') c.flicker = true; else delete c.flicker; })));
      if(['zin','zout'].includes((c.motion || {}).type)){
        const m = c.motion;
        host.append(rowNum('焦點 X %', Math.round((m.fx ?? 0.5) * 100), 1, v => edit(() => { m.fx = clamp(v, 0, 100) / 100; })),
                    rowNum('焦點 Y %', Math.round((m.fy ?? 0.5) * 100), 1, v => edit(() => { m.fy = clamp(v, 0, 100) / 100; })));
      }
      host.append(rowNum('運鏡幅度', (c.motion || {}).amt ?? 0.2, 0.05, v => edit(() => { c.motion = c.motion || {type:'none'}; c.motion.amt = clamp(v, 0, 2); })));
    } else {
      host.append(rowNum('音量 %', Math.round((c.vol ?? 1) * 100), 5, v => edit(() => c.vol = clamp(v, 0, 400) / 100)));
    }
    host.append(rowNum('淡入（秒）', c.fadeIn || 0, 0.05, v => edit(() => c.fadeIn = clamp(v, 0, c.dur))));
    host.append(rowNum('淡出（秒）', c.fadeOut || 0, 0.05, v => edit(() => c.fadeOut = clamp(v, 0, c.dur))));
    const bs = document.createElement('div'); bs.className = 'btns';
    if(c.link) bs.append(btn('解除連結', () => edit(() => { const [, o] = findClip(c.link); if(o) o.link = null; c.link = null; })));
    if(isA) bs.append(btn(project.beat && project.beat.clip === c.id ? '取消拍點' : '以這一段做拍點', () => {
      const s = snapshot(); project.beat = (project.beat && project.beat.clip === c.id) ? null : { clip:c.id }; commit(s); loadBeats();
    }));
    bs.append(btn('分割（S）', splitSel), btn('刪除', delSel));
    host.append(bs);
    host.append(note(c.kind === 'video' || isA ? '拉邊緣＝<b>裁切</b>。<br>拉右上角的<b>小圓點</b>＝改速度（往右變慢、往左變快）。' : '拉邊緣＝改長度。'));
    return;
  }
  host.innerHTML = '<h3>專案</h3>';
  host.append(rowCheck('輸出時響度拉到 −14 LUFS', project.loudnorm !== false, v => edit(() => project.loudnorm = v)));
  const bs = document.createElement('div'); bs.className = 'btns';
  bs.append(btn('＋黑色色塊', () => addColor('#000000')), btn('＋白色色塊', () => addColor('#ffffff')), btn('＋文字', addText), btn('匯入分鏡', importBoard));
  host.append(bs);
  host.append(note(
    '素材從左邊拖進時間軸；桌面的檔案也可以直接拖進來。<br>' +
    '拉邊緣＝裁切；拉右上角小圓點＝改速度。<br>' +
    '同一軌兩段相鄰時，交界的菱形點一下＝加淡入淡出。<br>' +
    '<b>中鍵</b>拖片段＝連它後面的所有片段（每一軌）一起推。<br>' +
    '時間軸空白處按住拖＝<b>框選</b>（加 Ctrl／Shift＝加選）；點一下＝移播放頭。<br>' +
    '點音訊片段→「以這一段做拍點」＝時間軸出現拍點、拖曳會吸附。<br><br>' +
    '<kbd>空白</kbd> 播放／暫停　<kbd>S</kbd> 分割　<kbd>Delete</kbd> 刪除<br>' +
    '<kbd>←</kbd><kbd>→</kbd> 一格（加 <kbd>Shift</kbd> 一秒）　<kbd>Ctrl</kbd>+滾輪 縮放<br>' +
    '<kbd>Ctrl+A</kbd> 全選（看最後點的是素材庫還是時間軸）<br>' +
    '<kbd>Shift+↓</kbd>／<kbd>Shift+↑</kbd> 選播放頭之後／之前的所有片段<br>' +
    '<kbd>Ctrl+C</kbd>／<kbd>X</kbd>／<kbd>V</kbd> 複製／剪下／貼上（貼在播放頭）<br>' +
    '<kbd>Ctrl+Z</kbd> 復原　<kbd>Ctrl+Y</kbd> 重做　<kbd>Ctrl+S</kbd> 儲存'));
}
function edit(fn){ const s = snapshot(); fn(); computeBeats(); commit(s); }
function moveClip(c, st){ const d = st - c.start; c.start = st; if(c.link){ const [, o] = findClip(c.link); if(o) o.start += d; } }
function setDur(c, d, t){ if(c.kind === 'video' || t.type === 'audio') c.dur = d; else c.dur = d; syncLink(c); }
function setSpeed(c, sp){ const span = c.dur * (c.speed || 1); c.speed = sp; c.dur = frame(span / sp); syncLink(c); }
function syncLink(c){ if(!c.link) return; const [, o] = findClip(c.link); if(o){ o.start = c.start; o.dur = c.dur; o.speed = c.speed; o.in = c.in; } }
function addColor(col){
  const s = snapshot(); const t = project.tracks.find(t => t.type === 'video');
  t.clips.push({ id:uid(), kind:'color', color:col, src:'', start:frame(playhead), dur:1, fit:'cover', motion:{type:'none',amt:0}, fadeIn:0, fadeOut:0, trans:null });
  commit(s);
}
function row(label, el){ const d = document.createElement('div'); d.className = 'row'; const l = document.createElement('label'); l.textContent = label; d.append(l, el); return d; }
function rowNum(label, v, step, on){ const i = document.createElement('input'); i.type = 'number'; i.step = step; i.value = (+v).toFixed(3).replace(/\.?0+$/, '') || '0'; i.onchange = () => on(+i.value); return row(label, i); }
function rowSelect(label, v, opts, on){ const s = document.createElement('select'); opts.forEach(([k, n]) => { const o = document.createElement('option'); o.value = k; o.textContent = n; s.appendChild(o); }); s.value = v; s.onchange = () => on(s.value); return row(label, s); }
function rowColor(label, v, on){ const i = document.createElement('input'); i.type = 'color'; i.value = v; i.onchange = () => on(i.value); return row(label, i); }
function rowText(label, v, on){ const i = document.createElement('textarea'); i.value = v; i.onchange = () => on(i.value); return row(label, i); }
function textRows(host, c){
  const o = Object.assign({}, TEXT_DEF, c);
  host.append(rowText('文字', o.text, v => edit(() => c.text = v)));
  host.append(rowSelect('字型', o.font, TEXT_FONTS, v => edit(() => c.font = v)));
  host.append(rowNum('字級', o.size, 2, v => edit(() => c.size = clamp(v, 8, 600))));
  host.append(rowSelect('粗細', o.weight, [['normal','一般'],['bold','粗']], v => edit(() => c.weight = v)));
  host.append(rowColor('顏色', o.color, v => edit(() => c.color = v)));
  host.append(rowNum('水平位置 %', Math.round(o.x * 100), 1, v => edit(() => c.x = clamp(v, -50, 150) / 100)));
  host.append(rowNum('垂直位置 %', Math.round(o.y * 100), 1, v => edit(() => c.y = clamp(v, -50, 150) / 100)));
  host.append(rowNum('字距', o.spacing, 1, v => edit(() => c.spacing = clamp(v, -50, 200))));
  host.append(rowNum('行高', o.lineH, 0.05, v => edit(() => c.lineH = clamp(v, 0.6, 3))));
  host.append(rowNum('描邊', o.stroke, 1, v => edit(() => c.stroke = clamp(v, 0, 40))));
  host.append(rowColor('描邊顏色', o.strokeColor, v => edit(() => c.strokeColor = v)));
  host.append(rowNum('發光', o.glow, 2, v => edit(() => c.glow = clamp(v, 0, 120))));
}
function rowCheck(label, v, on){ const i = document.createElement('input'); i.type = 'checkbox'; i.checked = v; i.onchange = () => on(i.checked); return row(label, i); }
function btn(t, fn){ const b = document.createElement('button'); b.textContent = t; b.onclick = fn; return b; }
function note(h){ const d = document.createElement('div'); d.className = 'note'; d.innerHTML = h; return d; }

function delSel(){
  if(selIds.size > 1){
    const s = snapshot();
    for(const id of [...selIds]){
      const [t, c] = findClip(id); if(!c) continue;
      t.clips = t.clips.filter(x => x !== c);
      if(c.link){ const [lt, l] = findClip(c.link); if(l) lt.clips = lt.clips.filter(x => x !== l); }
      if(project.beat && project.beat.clip === c.id) project.beat = null;
    }
    sel = null; selIds.clear(); commit(s); loadBeats(); return;
  }
  if(!sel) return;
  const s = snapshot();
  if(sel.type === 'junc'){ const [, c] = findClip(sel.id); if(c) c.trans = null; }
  else {
    const [t, c] = findClip(sel.id); if(!c) return;
    t.clips = t.clips.filter(x => x !== c);
    if(c.link){ const [lt, l] = findClip(c.link); if(l) lt.clips = lt.clips.filter(x => x !== l); }
    if(project.beat && project.beat.clip === c.id) project.beat = null;
  }
  sel = null; selIds.clear(); commit(s); loadBeats();
}
function splitSel(){
  if(!sel || sel.type !== 'clip') return;
  const [t, c] = findClip(sel.id); if(!c) return;
  const at = frame(playhead); if(at <= c.start + 1 / FPS || at >= c.start + c.dur - 1 / FPS) return;
  const s = snapshot();
  const cut = (t, c) => {
    const left = at - c.start;
    const b = JSON.parse(JSON.stringify(c)); b.id = uid(); b.start = at; b.dur = frame(c.dur - left); b.trans = null; b.fadeIn = 0;
    if(c.kind === 'video' || t.type === 'audio') b.in = (c.in || 0) + left * (c.speed || 1);
    c.dur = frame(left); c.fadeOut = 0;
    t.clips.push(b); return b;
  };
  const b = cut(t, c);
  if(c.link){ const [lt, l] = findClip(c.link); if(l){ const lb = cut(lt, l); b.link = lb.id; lb.link = b.id; } else b.link = null; }
  commit(s);
}

/* ═════════════ 預覽 ═════════════ */
const stage = $('stage'), g = stage.getContext('2d');
const vids = new Map(), imgs = new Map(), auds = new Map();
function vidFor(c){
  let v = vids.get(c.id);
  if(!v || v.dataset.src !== c.src){
    if(v){ v.pause(); v.removeAttribute('src'); v.load(); }
    v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
    v.dataset.src = c.src; v.src = '/m/' + c.src; v.addEventListener('seeked', () => { if(!playing) drawStage(); });
    v.addEventListener('loadeddata', () => { if(!playing) drawStage(); });
    vids.set(c.id, v);
  }
  return v;
}
function imgFor(src){
  let i = imgs.get(src);
  if(!i){ i = new Image(); i.src = '/m/' + src; i.onload = () => { if(!playing) drawStage(); }; imgs.set(src, i); }
  return i;
}
function audFor(c){
  let a = auds.get(c.id);
  if(!a || a.dataset.src !== c.src){
    if(a){ a.pause(); }
    a = new Audio(); a.preload = 'auto'; a.dataset.src = c.src; a.src = '/m/' + c.src; a.preservesPitch = true;
    auds.set(c.id, a);
  }
  return a;
}
function srcTimeOf(r, t){
  const c = r.c, sp = c.speed || 1;
  return Math.max(0, (c.in || 0) + (t - c.start) * sp);
}
function activeVideo(t){
  const out = [];
  for(const tr of project.tracks.filter(x => x.type === 'video')){   // index 0＝最底層
    if(tr.hidden) continue;
    for(const r of resolveTrack(tr)) if(t >= r.S && t < r.E) out.push(r);
  }
  return out;
}
function fxAt(r, t){
  const local = t - r.S; let a = 1, col = null, ca = 0;
  for(const [k, st, du, cc] of r.fx){
    const d = Math.max(1 / FPS, du);
    if(k === 'ain') a *= clamp((local - st) / d, 0, 1);
    else if(k === 'aout') a *= 1 - clamp((local - st) / d, 0, 1);
    else if(k === 'cin'){ const v = 1 - clamp((local - st) / d, 0, 1); if(v > ca){ ca = v; col = cc; } }
    else if(k === 'cout_abs'){ const v = clamp((t - st) / d, 0, 1); if(v > ca){ ca = v; col = cc; } }
  }
  return { a, col, ca };
}
const FLICKER_HZ = 16, FLICKER_AMT = 1.0;   // 閃爍（ver -2224）⚠ = render.py 的 FLICKER_HZ／FLICKER_AMT，改一邊要改另一邊
function drawSrc(src, sw, sh, c, local, D){
  const m = c.motion || {}, typ = m.type || 'none', amt = +(m.amt ?? 0.2);
  // 裁切（ver -2224，Ray：「尼莫下方沒貼底」—— 素材自己底下有一條黑邊）：c.crop＝{t,b,l,r}（素材的比例），
  // 先把素材當成裁過的那一塊，後面的適配／運鏡照舊。⚠ render.py 在 motion_filters 前面加 crop，同一套。
  const cr = c.crop || {}, L0 = (cr.l || 0) * sw, T0 = (cr.t || 0) * sh;
  sw = sw * (1 - (cr.l || 0) - (cr.r || 0)); sh = sh * (1 - (cr.t || 0) - (cr.b || 0));
  if(c.fit === 'contain'){
    const s = Math.min(W / sw, H / sh), w = sw * s, h = sh * s;
    g.drawImage(src, L0, T0, sw, sh, (W - w) / 2, (H - h) / 2, w, h); return;
  }
  const p = clamp(local / Math.max(1e-3, D), 0, 1);
  if(['up','down','lr','rl'].includes(typ)){
    const k = 1 + amt, s = Math.max(W * k / sw, H * k / sh), iw = sw * s, ih = sh * s;
    // 行程＝幅度 × 畫面高（上下左右同一個速度，ver -2223，Ray：「橫移要跟上下的速度一樣，不用把整張看完」），
    // 以圖的中央為中心；圖不夠寬／高就用掉能用的全部。⚠ render.py 的 motion_filters 是同一套，改一邊要改另一邊。
    const cx = (iw - W) / 2, cy = (ih - H) / 2, Tv = Math.min(ih - H, amt * H), Th = Math.min(iw - W, amt * H);
    let x = cx, y = cy;
    if(typ === 'up') y = cy + Tv / 2 - Tv * p; if(typ === 'down') y = cy - Tv / 2 + Tv * p;
    if(typ === 'lr') x = cx - Th / 2 + Th * p; if(typ === 'rl') x = cx + Th / 2 - Th * p;
    g.drawImage(src, L0 + x / s, T0 + y / s, W / s, H / s, 0, 0, W, H); return;
  }
  let z = 1; if(typ === 'zin') z = 1 + amt * p; if(typ === 'zout') z = 1 + amt * (1 - p);
  // 焦點（ver -2224）：m.fx／fy＝畫面上不動的那一點（0~1，預設正中）⚠ render.py 的 motion_filters 是同一套
  const fx = clamp(m.fx ?? 0.5, 0, 1), fy = clamp(m.fy ?? 0.5, 0, 1);
  const s0 = Math.max(W / sw, H / sh), w0 = W / s0, h0 = H / s0, x0 = (sw - w0) / 2, y0 = (sh - h0) / 2;
  const w = w0 / z, h = h0 / z;
  g.drawImage(src, L0 + x0 + (w0 - w) * fx, T0 + y0 + (h0 - h) * fy, w, h, 0, 0, W, H);
}
function drawStage(){
  const t = playhead;
  g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  for(const r of activeVideo(t)){
    const c = r.c, { a, col, ca } = fxAt(r, t); if(a <= 0) continue;
    g.save(); g.globalAlpha = a;
    const local = t - r.S, D = r.E - r.S;
    if(c.kind === 'color'){ g.fillStyle = c.color || '#000'; g.fillRect(0, 0, W, H); }
    else if(c.kind === 'text'){ drawSrc(textCanvas(c), W, H, c, local, D); }
    else if(c.kind === 'image'){ const im = imgFor(c.src); if(im.complete && im.naturalWidth) drawSrc(im, im.naturalWidth, im.naturalHeight, c, local, D); }
    else { const v = vidFor(c); if(v.readyState >= 2 && v.videoWidth) drawSrc(v, v.videoWidth, v.videoHeight, c, local, D); }
    if(c.flicker && Math.floor(local * FLICKER_HZ) % 2){ g.globalAlpha = a * FLICKER_AMT; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }   // 閃黑（Ray：「閃爍是閃黑不是閃白」）
    if(col && ca > 0){ g.globalAlpha = a * ca; g.fillStyle = col; g.fillRect(0, 0, W, H); }
    g.restore();
  }
}
/* 讓影片／聲音元素對齊播放頭。force＝暫停中被拖動，一律精確跳轉 */
function syncMedia(force){
  const t = playhead;
  const live = new Set();
  for(const tr of project.tracks.filter(x => x.type === 'video')){
    if(tr.hidden) continue;
    for(const r of resolveTrack(tr)){
      if(r.c.kind !== 'video') continue;
      const near = t >= r.S - 1.0 && t < r.E;
      if(!near) continue;
      const v = vidFor(r.c); live.add(v);
      const want = srcTimeOf(r, Math.max(t, r.S));
      const act = t >= r.S && t < r.E;
      if(playing && act){
        v.playbackRate = clamp(r.c.speed || 1, 0.0625, 16);
        if(Math.abs(v.currentTime - want) > 0.15) v.currentTime = want;
        if(v.paused) v.play().catch(() => {});
      } else {
        if(!v.paused) v.pause();
        if(force || Math.abs(v.currentTime - want) > 0.5 / FPS) { try{ v.currentTime = want; }catch(_){} }
      }
    }
  }
  vids.forEach(v => { if(!live.has(v) && !v.paused) v.pause(); });
  // 聲音
  const liveA = new Set();
  for(const tr of project.tracks.filter(x => x.type === 'audio')){
    for(const c of tr.clips){
      const act = playing && !tr.mute && t >= c.start && t < c.start + c.dur;
      const a = auds.get(c.id);
      if(!act){ if(a && !a.paused) a.pause(); continue; }
      const el = audFor(c); liveA.add(el);
      const sp = c.speed || 1, want = (c.in || 0) + (t - c.start) * sp;
      let vol = c.vol ?? 1;
      if(c.fadeIn) vol *= clamp((t - c.start) / c.fadeIn, 0, 1);
      if(c.fadeOut) vol *= clamp((c.start + c.dur - t) / c.fadeOut, 0, 1);
      el.volume = clamp(vol, 0, 1);
      el.playbackRate = clamp(sp, 0.0625, 16);
      if(Math.abs(el.currentTime - want) > 0.2) el.currentTime = want;
      if(el.paused) el.play().catch(() => {});
    }
  }
  auds.forEach(a => { if(!liveA.has(a) && !a.paused) a.pause(); });
}
function play(){
  if(playing){ playing = false; $('btnPlay').textContent = '▶︎'; syncMedia(true); return; }
  if(playhead >= totalDur() - 1 / FPS) playhead = 0;
  playing = true; playT0 = playhead; playP0 = performance.now(); $('btnPlay').textContent = '❚❚';
  syncMedia(true); requestAnimationFrame(tick);
}
let lastSync = 0;
function tick(now){
  if(!playing) return;
  playhead = playT0 + (now - playP0) / 1000;
  if(playhead >= totalDur()){ playhead = totalDur(); play(); updatePlayhead(); drawStage(); return; }
  if(now - lastSync > 120){ syncMedia(false); lastSync = now; }
  updatePlayhead(); drawStage(); followPlayhead();
  requestAnimationFrame(tick);
}
function followPlayhead(){
  const sc = $('tlScroll'), x = playhead * pps;
  if(x > sc.scrollLeft + sc.clientWidth - 60) sc.scrollLeft = x - 120;
}

/* ═════════════ 存檔／輸出 ═════════════ */
async function saveProject(){
  project.name = $('projName').value.trim() || 'pv';
  await fetch('/api/project?name=' + encodeURIComponent(project.name), { method:'POST', body:snapshot() });
  status('已儲存：' + project.name);
}
async function openProject(){
  const names = await fetch('/api/projects').then(r => r.json());
  showModal('<h3>開啟專案</h3>' + (names.length ? '<ul>' + names.map(n => '<li data-n="' + n + '">' + n + '</li>').join('') + '</ul>' : '<p class="dim">還沒有存過的專案</p>'));
  $('modalBody').querySelectorAll('li').forEach(li => li.onclick = async () => {
    const p = await fetch('/api/project?name=' + encodeURIComponent(li.dataset.n)).then(r => r.json());
    if(p.tracks){ undo.push(snapshot()); project = p; sel = null; selIds.clear(); afterLoad(); hideModal(); status('已開啟：' + p.name); }
  });
}
const OUTDIR_KEY = 'tivot_editor_outdir';
async function exportMp4(){
  if(!totalDur()) return status('時間軸是空的');
  project.name = $('projName').value.trim() || 'pv';
  const dir = localStorage.getItem(OUTDIR_KEY) || '';
  const stamp = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
  showModal('<h3>輸出 MP4</h3>' +
    '<div class="row2"><label>資料夾</label><input id="exDir" placeholder="（預設：剪輯器的 out 資料夾）"><button id="exPick">選擇…</button></div>' +
    '<div class="row2"><label>檔名</label><input id="exName"><span class="dim">.mp4</span></div>' +
    '<div class="row2"><label>長度</label><label class="tog"><input type="checkbox" id="exTrim" checked> 只輸出到最後一個畫面（後面只剩音樂的部分不要）</label></div>' +
    '<div class="acts2"><button id="exGo" class="primary">開始輸出</button></div>' +
    '<div id="exMsg" class="dim"></div><div class="bar"><i id="exBar"></i></div><div id="exOut"></div>');
  $('exDir').value = dir; $('exName').value = project.name + '_' + stamp;
  $('exPick').onclick = () => dirBrowser($('exDir').value.trim(), p => $('exDir').value = p);
  $('exGo').onclick = () => runExport($('exDir').value.trim(), $('exName').value.trim(), $('exTrim').checked);
}
/* 網頁裡的資料夾瀏覽（不靠系統視窗：那個常常開在瀏覽器後面） */
async function dirBrowser(start, onPick){
  let box = $('dirPick');
  if(!box){ box = document.createElement('div'); box.id = 'dirPick'; $('modalBody').appendChild(box); }
  const go = async path => {
    const r = await fetch('/api/ls?path=' + encodeURIComponent(path || '')).then(r => r.json());
    box.innerHTML = '';
    const head = document.createElement('div'); head.className = 'dp-head';
    const up = btn('↑ 上一層', () => go(r.parent || '')); up.disabled = r.path === '';
    const home = btn('常用位置', () => go(''));
    const cur = document.createElement('span'); cur.className = 'dp-cur'; cur.textContent = r.path || '常用位置／磁碟機';
    head.append(up, home, cur); box.appendChild(head);
    const list = document.createElement('div'); list.className = 'dp-list';
    (r.places || []).forEach(x => { const d = document.createElement('div'); d.className = 'dp-it place'; d.textContent = '★ ' + x.name + '　' + x.path; d.onclick = () => go(x.path); list.appendChild(d); });
    r.dirs.forEach(x => { const d = document.createElement('div'); d.className = 'dp-it'; d.textContent = '📁 ' + x.name; d.onclick = () => go(x.path); list.appendChild(d); });
    if(r.error){ const d = document.createElement('div'); d.className = 'dim'; d.textContent = '讀不到：' + r.error; list.appendChild(d); }
    if(!r.dirs.length && !(r.places || []).length && !r.error){ const d = document.createElement('div'); d.className = 'dim'; d.textContent = '（沒有子資料夾）'; list.appendChild(d); }
    box.appendChild(list);
    const acts = document.createElement('div'); acts.className = 'btns';
    const ok = btn('選這個資料夾', () => { onPick(r.path); box.remove(); }); ok.className = 'primary'; ok.disabled = !r.path;
    const mk = btn('＋新增資料夾', async () => {
      const n = prompt('新資料夾名稱'); if(!n) return;
      const m = await fetch('/api/mkdir?path=' + encodeURIComponent(r.path) + '&name=' + encodeURIComponent(n), { method:'POST' }).then(r => r.json());
      if(m.path) go(m.path);
    }); mk.disabled = !r.path;
    acts.append(ok, mk, btn('取消', () => box.remove()));
    box.appendChild(acts);
  };
  go(start || '');
}
async function runExport(dir, name, trim){
  try{ localStorage.setItem(OUTDIR_KEY, dir); }catch(_){}
  $('exGo').disabled = true; $('btnExport').disabled = true;
  // 文字片段：把預覽畫的那一張轉成 PNG 一起送過去（輸出＝預覽，ver -2223）
  try{ await document.fonts.ready; }catch(_){}
  const pj = JSON.parse(snapshot());
  pj.tracks.forEach(t => t.clips.forEach(c => { if(c.kind === 'text') c._png = textCanvas(c).toDataURL('image/png'); }));
  const body = JSON.stringify(Object.assign(pj, { _outDir: dir, _outName: name, _trimVideo: !!trim }));
  const job = await fetch('/api/export', { method:'POST', body }).then(r => r.json());
  if(job.error){ $('exMsg').textContent = '失敗：' + job.error; $('exGo').disabled = false; $('btnExport').disabled = false; return; }
  const poll = async () => {
    const j = await fetch('/api/job?id=' + job.id).then(r => r.json());
    if(!$('exMsg')) { $('btnExport').disabled = false; return; }
    $('exMsg').textContent = j.msg || ''; $('exBar').style.width = Math.round((j.progress || 0) * 100) + '%';
    if(j.state === 'running') return setTimeout(poll, 700);
    $('btnExport').disabled = false; $('exGo').disabled = false;
    if(j.state === 'done'){
      $('exOut').innerHTML = '<p>完成：<span class="src"></span></p><div class="btns"><button id="exReveal">開啟資料夾</button></div><video src="/api/out?id=' + j.id + '" controls></video>';
      $('exOut').querySelector('.src').textContent = j.path;
      $('exReveal').onclick = () => fetch('/api/reveal?id=' + j.id);
    } else $('exMsg').textContent = '失敗：' + (j.msg || '');
  };
  poll();
}
function showModal(html){ $('modalBody').innerHTML = html; $('modal').hidden = false; }
function hideModal(){ $('modal').hidden = true; $('modalBody').innerHTML = ''; }

/* ═════════════ 繫結 ═════════════ */
function bind(){
  $('btnPlay').onclick = play;
  $('btnStart').onclick = () => setPlayhead(0);
  $('btnPrev').onclick = () => setPlayhead(frame(playhead - 1 / FPS));
  $('btnNext').onclick = () => setPlayhead(frame(playhead + 1 / FPS));
  $('btnUndo').onclick = doUndo; $('btnRedo').onclick = doRedo;
  $('btnSave').onclick = saveProject; $('btnOpen').onclick = openProject; $('btnExport').onclick = exportMp4;
  $('btnSplit').onclick = splitSel; $('btnDel').onclick = delSel;
  $('btnBoard').onclick = importBoard; $('btnText').onclick = addText; $('btnMontage').onclick = montage;
  $('btnAddV').onclick = () => { const s = snapshot(); const n = project.tracks.filter(t => t.type === 'video').length + 1;
    const t = { id:uid(), type:'video', name:'V' + n, clips:[] };
    const idx = project.tracks.findIndex(t => t.type === 'audio'); project.tracks.splice(idx < 0 ? project.tracks.length : idx, 0, t); commit(s); revealTrack(t); };
  $('btnAddA').onclick = () => { const s = snapshot(); const t = { id:uid(), type:'audio', name:'A' + (project.tracks.filter(t => t.type === 'audio').length + 1), clips:[] };
    project.tracks.push(t); commit(s); revealTrack(t); };
  bindTlResize();
  $('modalClose').onclick = hideModal;
  $('libSearch').oninput = renderLib;
  $('lib').addEventListener('pointerdown', () => lastArea = 'lib');
  $('tl').addEventListener('pointerdown', () => lastArea = 'tl');
  $('libUpload').onchange = e => uploadFiles([...e.target.files]);
  const libEl = $('lib');
  libEl.addEventListener('dragover', e => { if(e.dataTransfer.types.includes('Files')){ e.preventDefault(); libEl.classList.add('dropping'); } });
  libEl.addEventListener('dragleave', () => libEl.classList.remove('dropping'));
  libEl.addEventListener('drop', e => { e.preventDefault(); libEl.classList.remove('dropping'); if(e.dataTransfer.files.length) uploadFiles([...e.dataTransfer.files]); });
  $('zoom').oninput = e => setZoom(+e.target.value);
  const sc = $('tlScroll');
  sc.addEventListener('mousedown', e => { if(e.button === 1) e.preventDefault(); });   // 中鍵＝連後面一起推，不要瀏覽器的自動捲動
  sc.addEventListener('scroll', () => { drawRuler(); drawGrid(); $('tlHeads').scrollTop = sc.scrollTop; $('heads').style.marginTop = -sc.scrollTop + 'px'; });
  sc.addEventListener('wheel', e => {
    if(!e.ctrlKey) return; e.preventDefault();
    const r = sc.getBoundingClientRect(), tAt = (e.clientX - r.left + sc.scrollLeft) / pps;
    setZoom(clamp(pps * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 10, 600));
    sc.scrollLeft = tAt * pps - (e.clientX - r.left);
  }, { passive:false });
  const rulerDrag = e => setPlayhead(frame((e.clientX - $('tlInner').getBoundingClientRect().left) / pps));
  $('ruler').addEventListener('pointerdown', e => { rulerDrag(e); const mv = ev => rulerDrag(ev); const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); }; window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); });
  window.addEventListener('resize', () => { drawRuler(); drawGrid(); renderLanes(); });
  window.addEventListener('keydown', e => {
    if(e.target.matches('input,select,textarea')) return;
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if(e.code === 'Space'){ e.preventDefault(); play(); }
    else if(mod && k === 'a'){ e.preventDefault(); selectAll(); }
    else if(e.shiftKey && !mod && (e.key === 'ArrowUp' || e.key === 'ArrowDown')){ e.preventDefault(); selectSide(e.key === 'ArrowDown' ? 'after' : 'before'); }
    else if(mod && k === 'c'){ e.preventDefault(); copySel(); }
    else if(mod && k === 'x'){ e.preventDefault(); cutSel(); }
    else if(mod && k === 'v'){ e.preventDefault(); pasteClip(); }
    else if(e.key === 'Escape'){ sel = null; selIds.clear(); libSel.clear(); paintLibSel(); renderAll(); }
    else if(e.key === 'Delete' || e.key === 'Backspace'){ e.preventDefault(); delSel(); }
    else if(e.key === 's' && !e.ctrlKey){ splitSel(); }
    else if(e.key === 'ArrowLeft'){ e.preventDefault(); setPlayhead(frame(playhead - (e.shiftKey ? 1 : 1 / FPS))); }
    else if(e.key === 'ArrowRight'){ e.preventDefault(); setPlayhead(frame(playhead + (e.shiftKey ? 1 : 1 / FPS))); }
    else if(e.key === 'Home'){ setPlayhead(0); }
    else if(e.ctrlKey && e.key.toLowerCase() === 'z'){ e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); }
    else if(e.ctrlKey && e.key.toLowerCase() === 'y'){ e.preventDefault(); doRedo(); }
    else if(e.ctrlKey && e.key.toLowerCase() === 's'){ e.preventDefault(); saveProject(); }
  });
}
/* 新增的軌捲到看得見的地方、閃一下（ver -2223：時間軸只有 40vh，新軌常常落在下面，看起來像沒加） */
function revealTrack(t){
  const i = orderedTracks().indexOf(t); if(i < 0) return;
  const sc = $('tlScroll'), top = laneTop(i) + 50;   // 50＝尺規＋分鏡列
  if(top < sc.scrollTop + 50 || top + HEAD_H[t.type] > sc.scrollTop + sc.clientHeight) sc.scrollTop = Math.max(0, top - sc.clientHeight / 2);
  const lane = document.querySelector('.lane[data-track="' + t.id + '"]'), head = $('heads').children[i];
  [lane, head].forEach(el => { if(!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); });
  status('已新增' + (t.type === 'audio' ? '音軌 ' : '影像軌 ') + t.name + '（素材拖進來就能用）');
}
/* 時間軸面板可以拉高（拖面板的上緣），高度記在這個瀏覽器 */
const TLH_KEY = 'tivot_editor_tlh';
function applyTlH(h){
  h = clamp(h, 160, window.innerHeight - 200);
  document.body.style.gridTemplateRows = '42px minmax(0,1fr) ' + Math.round(h) + 'px';
  drawRuler(); drawGrid();
}
function bindTlResize(){
  try{ const h = +localStorage.getItem(TLH_KEY); if(h) applyTlH(h); }catch(_){}
  $('tlResize').addEventListener('pointerdown', e => {
    e.preventDefault();
    const y0 = e.clientY, h0 = $('tl').getBoundingClientRect().height;
    const mv = ev => applyTlH(h0 + (y0 - ev.clientY));
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      try{ localStorage.setItem(TLH_KEY, String(Math.round($('tl').getBoundingClientRect().height))); }catch(_){} };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });
}
function setZoom(v){ pps = v; $('zoom').value = Math.round(v); renderLanes(); renderMarks(); drawRuler(); drawGrid(); updatePlayhead(); }

(async function init(){
  bind();
  const qs = new URLSearchParams(location.search);
  let loaded = false;
  if(qs.get('project')){
    const p = await fetch('/api/project?name=' + encodeURIComponent(qs.get('project'))).then(r => r.json());
    if(p.tracks){ project = p; loaded = true; }
  }
  if(!loaded){ try{ const s = localStorage.getItem('tivot_editor_last'); if(s){ project = JSON.parse(s); loaded = true; } }catch(_){} }
  $('projName').value = project.name || 'pv';
  await loadLib();
  await loadBeats();
  renderAll();
})();
