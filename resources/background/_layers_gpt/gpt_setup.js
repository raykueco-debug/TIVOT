window.__WAR = "100%保留這張原圖的構圖、視角、畫風、所有建築、地面與光線。把天空、雲、所有的煙（煙柱、煙霧）變成純洋紅色 #FF00FF 平塗。畫面中的火焰本體全部拿掉，被火焰遮住的建築與地面照原樣補畫完整（保留燒焦痕跡）。不要新增任何東西。輸出與原圖同尺寸。anime style, cel shading, clean lineart，絕不要顆粒感、不要棋盤格。";
window.__gen = () => [...document.querySelectorAll('img')].filter(x=>x.naturalWidth>=1000 && /產生的圖片/.test(x.alt));
window.__btn = () => document.querySelector('#composer-submit-button')||[...document.querySelectorAll('button')].find(x=>/^傳送/.test(x.getAttribute('aria-label')||''));
window.__dl = async (im,name)=>{ const b=await (await fetch(im.src)).blob(); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); a.remove(); return b.size; };
window.__send = async (P) => {
  window.__cnt = window.__gen().length;
  const box = document.querySelector('.ProseMirror'); box.focus();
  const s=getSelection(), r=document.createRange(); r.selectNodeContents(box); s.removeAllRanges(); s.addRange(r);
  document.execCommand('insertText', false, P); box.dispatchEvent(new InputEvent('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,3500));
  for(let i=0;i<8;i++){ const L=(document.querySelector('.ProseMirror')||{}).innerText.length; if(L<=2) break; const b=window.__btn(); if(b&&!b.disabled) b.click(); await new Promise(x=>setTimeout(x,2500)); }
  return [window.__cnt,(document.querySelector('.ProseMirror')||{}).innerText.length, location.href.slice(-12)];
};
window.__grab = async (name) => {
  const t=document.body.innerText.trim(); const done=/回覆完畢$/.test(t) && !document.querySelector('[data-testid="stop-button"]');
  const g=window.__gen(); if(!done || g.length<=window.__cnt) return 'wait';
  const sz=await window.__dl(g[g.length-1],name); window.__cnt=g.length; return 'ok '+sz;
};
'setup ok';
