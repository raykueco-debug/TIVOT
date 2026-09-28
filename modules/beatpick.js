/* ══ 改這一拍的立繪（ver -1826，Ray：「管理者功能，對話、戰鬥中點立繪可以更改該拍的立繪」）══
   管理人**右鍵點台上的立繪** → 這一支開一張縮圖牆（那個角色能用的每一張）→ 點一張：
   呼叫端當場換上，並 `POST /__beat` 由 `tools/devserver.py` 改寫腳本檔裡**那一拍**的差分字面。
   ⚠ 葉模組：只管畫挑選窗與送請求；「點到的是誰、那一拍是哪一拍、當場怎麼換」由劇情層
     （`story.beatEditAt`）與戰鬥對白（`tutorial.beatEditAt`）各自回答 —— 兩邊的立繪系統不同。
   ⚠ 不用 alert／confirm（內建預覽視窗會吞掉，ver -1824）：結果寫在窗上。 */

/* 送改寫請求。回 {ok, text}。 */
export function postBeat(body){
  const url = new URL('__beat', new URL('../', import.meta.url)).pathname;
  return fetch(url, { method:'POST', body:JSON.stringify(body) })
    .then(r=>r.text().then(t=>({ ok:r.ok, status:r.status, text:t })))
    .catch(e=>({ ok:false, status:0, text:String(e) }));
}

/* 開挑選窗。
   opts: { title, note, items:[{ key, label, src }], cur, onPick(key) → Promise<{ok,text}>|void } */
export function openPicker(opts){
  closePicker();
  const ov=document.createElement('div'); ov.id='beatPick';
  ov.style.cssText='position:fixed;inset:0;z-index:9950;display:flex;align-items:center;justify-content:center;'
    +'background:rgba(4,3,7,.72);font:13px/1.35 serif;color:#ece6d8;';
  const stop=e=>e.stopPropagation();
  ['pointerdown','pointerup','click','touchstart','keydown','contextmenu','wheel'].forEach(ev=>ov.addEventListener(ev, stop));
  ov.addEventListener('click', e=>{ if(e.target===ov) closePicker(); });
  const items=opts.items||[];
  ov.innerHTML='<div style="width:min(92vw,760px);max-height:86vh;display:flex;flex-direction:column;gap:8px;padding:12px;'
    +'border-radius:12px;background:#120f1a;border:1px solid #8a6d2e">'
    +'<div style="display:flex;align-items:center;gap:8px"><b style="flex:1;color:#d4a94a;letter-spacing:2px">'+(opts.title||'')+'</b>'
    +'<button data-x style="font:inherit;color:#ece6d8;background:rgba(40,32,56,.9);border:1px solid #8a6d2e;border-radius:6px;padding:4px 10px">關閉</button></div>'
    +(opts.note ? '<div style="font-size:11px;color:#8a6d2e">'+opts.note+'</div>' : '')
    +'<div data-msg style="font-size:12px;min-height:1.2em"></div>'
    +'<div style="overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px">'
    + items.map((it,i)=>'<button data-i="'+i+'" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px;'
        +'font:inherit;font-size:11px;color:#ece6d8;background:'+(it.key===opts.cur?'rgba(212,169,74,.28)':'rgba(40,32,56,.6)')+';'
        +'border:1px solid '+(it.key===opts.cur?'#d4a94a':'#3a2f4a')+';border-radius:8px;cursor:pointer">'
        +'<img loading="lazy" src="'+it.src+'" style="width:96px;height:120px;object-fit:cover;object-position:50% 0">'
        +'<span style="word-break:break-all">'+it.label+'</span></button>').join('')
    +'</div></div>';
  document.body.appendChild(ov);
  const msg=ov.querySelector('[data-msg]');
  ov.querySelector('[data-x]').onclick=closePicker;
  ov.querySelectorAll('button[data-i]').forEach(b=>b.onclick=()=>{
    const it=items[+b.dataset.i]; if(!it) return;
    msg.style.color='#d4a94a'; msg.textContent='寫入中…';
    Promise.resolve(opts.onPick && opts.onPick(it.key)).then(r=>{
      if(!r){ closePicker(); return; }
      msg.style.color = r.ok ? '#8fd18f' : '#e57373';
      msg.textContent = (r.ok ? '已寫入：' : '寫入失敗：') + r.text;
      if(r.ok) setTimeout(closePicker, 900);
    });
  });
}
export function closePicker(){ const o=document.getElementById('beatPick'); if(o) o.remove(); }

/* ══ 改台詞（ver -1828，Ray：「對話框也插個編輯鈕改台詞」）══
   `ensureEditBtn(對話框, onClick)`：在對話框右上角掛一顆 ✎（管理人限定，由 CSS 以 body.testmode 控制）。
   ⚠ 對話框本身是 `pointer-events:none`（點擊要穿過去推進對白），這顆鈕自己開 `auto`，
     而且吃掉 pointerdown／click —— 按它不會推進。
   `openTextEditor({ title, text, note, onSave(新台詞) → Promise<{ok,text}> })`：編輯框，結果寫在框上。 */
export function ensureEditBtn(box, onClick){
  if(!box || box.querySelector('.beat-edit')) return;
  const b=document.createElement('button'); b.type='button'; b.className='beat-edit'; b.textContent='✎';
  b.title='改這一句台詞（管理人）';
  ['pointerdown','pointerup','touchstart','mousedown'].forEach(ev=>b.addEventListener(ev, e=>e.stopPropagation()));
  b.addEventListener('click', e=>{ e.stopPropagation(); e.preventDefault(); onClick(); });
  box.appendChild(b);
}
export function postText(body){
  const url = new URL('__text', new URL('../', import.meta.url)).pathname;
  return fetch(url, { method:'POST', body:JSON.stringify(body) })
    .then(r=>r.text().then(t=>({ ok:r.ok, status:r.status, text:t })))
    .catch(e=>({ ok:false, status:0, text:String(e) }));
}
export function openTextEditor(opts){
  closePicker();
  const ov=document.createElement('div'); ov.id='beatPick';
  ov.style.cssText='position:fixed;inset:0;z-index:9950;display:flex;align-items:center;justify-content:center;'
    +'background:rgba(4,3,7,.72);font:14px/1.5 serif;color:#ece6d8;';
  const stop=e=>e.stopPropagation();
  ['pointerdown','pointerup','click','touchstart','keydown','keyup','contextmenu','wheel'].forEach(ev=>ov.addEventListener(ev, stop));
  const bs='font:inherit;color:#ece6d8;background:rgba(40,32,56,.9);border:1px solid #8a6d2e;border-radius:6px;padding:6px 14px';
  ov.innerHTML='<div style="width:min(92vw,640px);display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:12px;background:#120f1a;border:1px solid #8a6d2e">'
    +'<b style="color:#d4a94a;letter-spacing:2px">'+(opts.title||'改台詞')+'</b>'
    +(opts.note ? '<div style="font-size:11px;color:#8a6d2e">'+opts.note+'</div>' : '')
    +'<textarea data-t rows="3" style="font:inherit;color:#ece6d8;background:#1a1426;border:1px solid #8a6d2e;border-radius:6px;padding:8px;resize:vertical"></textarea>'
    +'<div data-msg style="font-size:12px;min-height:1.2em"></div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end"><button data-c style="'+bs+'">取消</button><button data-s style="'+bs+';color:#d4a94a">存檔</button></div></div>';
  document.body.appendChild(ov);
  const ta=ov.querySelector('[data-t]'), msg=ov.querySelector('[data-msg]');
  ta.value = opts.text || ''; ta.focus();
  ov.querySelector('[data-c]').onclick=closePicker;
  ov.querySelector('[data-s]').onclick=()=>{
    if(ta.value===(opts.text||'')){ closePicker(); return; }
    msg.style.color='#d4a94a'; msg.textContent='寫入中…';
    Promise.resolve(opts.onSave && opts.onSave(ta.value)).then(r=>{
      if(!r){ closePicker(); return; }
      msg.style.color = r.ok ? '#8fd18f' : '#e57373';
      msg.textContent = (r.ok ? '已寫入：' : '寫入失敗：') + r.text;
      if(r.ok) setTimeout(closePicker, 700);
    });
  };
}
