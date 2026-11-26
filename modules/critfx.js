/* ══ 爆擊命中特效（PERFECT CRITICAL 用，動畫副理 11-26 交件；Ray：「直接用不用跑 Wan」）══
   四張 512×512 真 alpha、中心對齊（256,256）：1 閃光 → 2 炸開放射光刃＋衝擊環 → 3 衝擊環擴大碎片飛散 → 4 殘光消散。
   影格、各格毫秒、大小都在 `config.tuning.critFx`（鐵律 1）；這一支只負責在命中點播一次。
   ⚠ 一般 alpha 疊（交件說明：效果偏亮，不用 screen）；第 4 張邊播邊淡出。
   ⚠ 葉模組：只讀 config。E（完美爆擊）的觸發還在等 Ray 定案 —— 定了之後在「當盤最後一發普攻命中」那一刻呼叫 `play(x, y)`。 */
import { GAME_CONFIG } from '../config.js';

const CFG = () => (GAME_CONFIG.tuning || {}).critFx || {};
let imgs = null;

/* 先把四張抓進來（用到它的畫面自己載，鐵律 13：戰鬥開場叫一次就好）。 */
export function warm(){
  if(imgs) return imgs;
  imgs = (CFG().frames || []).map(src => { const im = new Image(); im.decoding = 'async'; im.src = src; return im; });
  return imgs;
}

/* 在螢幕座標 (x, y) 播一次。`size`＝特效框的邊長（px），不傳就用 config 的 `sizeVw`（畫面寬的比例）。 */
export function play(x, y, size){
  const C = CFG(), frames = C.frames || [], ms = C.ms || [];
  if(!frames.length) return;
  warm();
  const S = size || Math.round(window.innerWidth * (C.sizeVw || 0.6));
  const el = document.createElement('img');
  el.alt = '';
  el.style.cssText = 'position:fixed;pointer-events:none;z-index:9500;width:'+S+'px;height:'+S+'px;'
    + 'left:'+Math.round(x - S/2)+'px;top:'+Math.round(y - S/2)+'px;opacity:1;';
  document.body.appendChild(el);
  let i = 0;
  const next = () => {
    if(i >= frames.length){ el.remove(); return; }
    el.src = (imgs[i] && imgs[i].src) || frames[i];
    const d = ms[i] || 80;
    if(i === frames.length - 1){ el.style.transition = 'opacity '+d+'ms linear'; requestAnimationFrame(()=>{ el.style.opacity = '0'; }); }
    i++;
    setTimeout(next, d);
  };
  next();
}
