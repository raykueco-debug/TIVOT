/* 空中怪 3D（2026-11-06 起；王座徘徊者試驗 → 11-07 Ray：「3D 方案可行，做下去」「其他空中怪也跟進」）
   網址加 ?drg3d=1 → 3D 取代 2D；?drg3d=side → 2D 照舊、3D 擺在右邊並排。
   &drg3dhold → 觀察模式：自動叫出一隻（&drg3dkind=<鍵>，預設王座徘徊者）停在原地，不追、撞到不開戰。
   · 產線：GPT 簡化四視圖 → Hunyuan3D-2mv → 減面＋四視圖投影貼圖（scratchpad 的 bake.py／atlas.py；紀錄 resources/enemy/_dragon_3d_trial.md）
   · 動態（頂點著色器）：翼／鰭＝三節鉸鏈拍動；尾＝往後傳的波浪
   · 畫在自己的小 WebGL 畫布，再 drawImage 貼進飛行頁的 2D 畫面（地形遮擋沿用 clipByTerrainDepth）
     —— 不畫進主 GL：地形是「有變化才重畫」，怪每禎都動，畫進去等於逼地形每禎重算。 */
(function(){
'use strict';
const MODE=((location.search.match(/[?&]drg3d=(\w+)/)||[])[1])||'';
if(!MODE) return;
const LO=/[?&]drg3dlo/.test(location.search);

/* ══ 有 3D 模型的怪（鍵＝ENEMY_KINDS 的鍵）══
   dir：模型與圖集所在；file：檔名前綴（<file>.glb／<file>_lo.glb／<file>_atlas.webp）
   spanK：模型翼展 ÷ 2D 那張圖的寬（2D 的圖四邊留白，3D 沒有）
   flap：沒寫＝讀 2D 那一份（sprite.wingCut／flapAmp／wingRest／flapLag／flapDown，鐵律 7）；寫了＝3D 自己的（2D 那一份是 0 的怪）
   tail：尾巴的波浪 { from：從模型的哪個 z 比例往後算（-1 尾端 … 1 頭），amp：振幅（半翼展的比例），waves：整條尾巴上有幾個波 } */
const DEF={
  bldragon:    { dir:'enemy/flm_dragonthrone/', file:'drg3d', spanK:1.0 },
  sky_boneray: { dir:'enemy/flm_boneray/',      file:'mon3d', spanK:0.85,
                 flap:{ cut:[0.18,0.45,0.72], amp:[0.16,0.18,0.20], rest:[0.02,0.04,0.05], lag:0.08, down:0.42 },
                 tail:{ from:-0.15, amp:0.10, waves:1.2 } },
  sky_ribwhale:{ dir:'enemy/flm_ribwhale/',     file:'mon3d', spanK:0.85,
                 flap:{ cut:[0.22,0.48,0.74], amp:[0.12,0.14,0.16], rest:[0.02,0.03,0.04], lag:0.08, down:0.45 },
                 tail:{ from:-0.10, amp:0.12, waves:1.0 } },
  // ── 其餘空中怪（ver -2592 起整批）：有翅的拍翅＋尾波；沒翅的只有身體波（flap 全 0）──
  sky_twinwyvern:{ dir:'enemy/flm_twinwyvern/', file:'mon3d', spanK:0.85,
                 flap:{ cut:[0.16,0.45,0.72], amp:[0.18,0.20,0.22], rest:[0.02,0.04,0.05], lag:0.08, down:0.42 },
                 tail:{ from:-0.20, amp:0.10, waves:1.2 } },
  sky_mawbat:  { dir:'enemy/flm_mawbat/', file:'mon3d', spanK:0.85,
                 flap:{ cut:[0.14,0.42,0.70], amp:[0.20,0.22,0.24], rest:[0.02,0.04,0.05], lag:0.08, down:0.40 },
                 tail:{ from:-0.20, amp:0.10, waves:1.2 } },
  sky_eyemoth: { dir:'enemy/flm_eyemoth/', file:'mon3d', spanK:0.85,
                 flap:{ cut:[0.12,0.45,0.75], amp:[0.22,0.20,0.16], rest:[0.03,0.04,0.04], lag:0.05, down:0.50 },
                 tail:{ from:-0.20, amp:0.06, waves:0.8 } },
  sky_armorcrab:{ dir:'enemy/flm_armorcrab/', file:'mon3d', spanK:0.85,
                 flap:{ cut:[0.30,0.55,0.80], amp:[0.22,0.20,0.18], rest:[0.03,0.03,0.03], lag:0.03, down:0.50 },
                 tail:{ from:-0.30, amp:0.05, waves:0.8 } },
  sky2_spine:  { dir:'enemy/flm_sky2_spine/', file:'mon3d', spanK:0.85,
                 flap:{ cut:[0.12,0.42,0.72], amp:[0.16,0.18,0.20], rest:[0.02,0.04,0.05], lag:0.08, down:0.42 },
                 tail:{ from:-0.05, amp:0.14, waves:1.6 } },
  sky2_ringchain:{ dir:'enemy/flm_sky2_ringchain/', file:'mon3d', spanK:0.85,
                 flap:{ cut:[0.30,0.55,0.80], amp:[0.12,0.14,0.16], rest:[0.02,0.03,0.04], lag:0.08, down:0.45 },
                 tail:{ from:-0.30, amp:0.04, waves:0.8 } },
  sky_eelswarm:{ dir:'enemy/flm_eelswarm/', file:'mon3d', spanK:1.6, fit:'rad',
                 flap:{ cut:[0.3,0.6,0.9], amp:[0,0,0], rest:[0,0,0], lag:0, down:0.5 },
                 tail:{ from:0.40, amp:0.10, waves:1.5 } },
  sky_gasjelly:{ dir:'enemy/flm_gasjelly/', file:'mon3d', spanK:0.85,
                 flap:{ cut:[0.3,0.6,0.9], amp:[0,0,0], rest:[0,0,0], lag:0, down:0.5 },
                 tail:{ from:0.30, amp:0.05, waves:0.8 } },
  sky2_maskbanner:{ dir:'enemy/flm_sky2_maskbanner/', file:'mon3d', spanK:0.85,
                 flap:{ cut:[0.3,0.6,0.9], amp:[0,0,0], rest:[0,0,0], lag:0, down:0.5 },
                 tail:{ from:0.20, amp:0.10, waves:1.2 } },
  sky2_mouthpillar:{ dir:'enemy/flm_sky2_mouthpillar/', file:'mon3d', spanK:1.6, fit:'rad',
                 flap:{ cut:[0.3,0.6,0.9], amp:[0,0,0], rest:[0,0,0], lag:0, down:0.5 },
                 tail:{ from:0.40, amp:0.08, waves:1.0 } },
  sky2_facecrown:{ dir:'enemy/flm_sky2_facecrown/', file:'mon3d', spanK:0.85,
                 flap:{ cut:[0.3,0.6,0.9], amp:[0,0,0], rest:[0,0,0], lag:0, down:0.5 },
                 tail:{ from:0.10, amp:0.10, waves:1.2 } },
  sky2_eyeveil:{ dir:'enemy/flm_sky2_eyeveil/', file:'mon3d', spanK:1.6, fit:'rad',
                 flap:{ cut:[0.3,0.6,0.9], amp:[0,0,0], rest:[0,0,0], lag:0, down:0.5 },
                 tail:{ from:0.40, amp:0.08, waves:1.0 } },
  sky2_rift:   { dir:'enemy/flm_sky2_rift/', file:'mon3d', spanK:0.85,
                 flap:{ cut:[0.3,0.6,0.9], amp:[0,0,0], rest:[0,0,0], lag:0, down:0.5 },
                 tail:{ from:-0.10, amp:0.03, waves:0.6 } },
  sky2_maw:    { dir:'enemy/flm_sky2_maw/', file:'mon3d', spanK:1.6, fit:'rad',
                 flap:{ cut:[0.3,0.6,0.9], amp:[0,0,0], rest:[0,0,0], lag:0, down:0.5 },
                 tail:{ from:0.00, amp:0.12, waves:1.2 } },
};
DEF.sky_southlord = DEF.sky2_maw;   // 南天的霸王＝無面巨首換名（index.html 的 ENEMY_KINDS 同樣是 Object.assign 抄過去）
const MAXPX=1024;                       // 畫布上限（裝置像素）：一次配好，每禎只換 viewport
let cv=null, g=null, prog=null, U={}, initErr='';
const M={};                              // 鍵 → { state:0 未載/1 載入中/2 好了/-1 壞了, vao, nIdx, idxT, span, hinge, bbMin, bbMax, tex, texOK, zMin, zMax }
const stat={ frames:0, ms:0, held:0 };

const VS=`#version 300 es
in vec3 p; in vec3 n; in vec4 c;
uniform float uS, uOut;                 // 世界尺度、描邊外擴（模型單位）
uniform vec2 uYaw;                      // 航向在鏡頭座標：(橫向, 進深)
uniform vec3 uO;                        // 中心：橫向、(鏡頭高−牠高)、進深
uniform vec2 uF, uHalf;                 // 焦距 (fx,fy) px、畫布半寬半高 px
uniform float uR;                       // 深度範圍
uniform vec3 uCut, uHy, uAng;           // 三節鉸鏈：切點（半幅比例）、鉸鏈高、各節擺角（rad，往下為正）
uniform float uHs;                      // 半翼展（模型單位）
uniform vec4 uTail;                     // 尾波：起點 z、振幅、波數、相位（rad）
uniform vec2 uZr;                       // 模型 z 範圍（min, max）
out vec3 vC; out vec3 vN; out vec3 vP; out vec3 vN0;
vec2 rot(vec2 q, float a){ float s=sin(a), co=cos(a); return vec2(co*q.x-s*q.y, s*q.x+co*q.y); }
void main(){
  vec3 P=p+n*uOut, N=n;
  /* 尾波：起點以後的頂點上下擺，越往尾端擺越大、相位越落後 */
  if(uTail.y>0.0){
    float L=max(uTail.x-uZr.x,1e-3), u=clamp((uTail.x-p.z)/L,0.0,1.0);
    float w=u*u;
    P.y+=sin(uTail.w-u*uTail.z*6.2832)*uTail.y*uHs*w;
  }
  float sd=sign(P.x), ax=abs(p.x)/uHs;
  for(int k=2;k>=0;k--){
    float w=smoothstep(uCut[k]-0.035, uCut[k]+0.035, ax);
    float a=-sd*uAng[k]*w;              // 往下擺：右翼（x>0）是順時針
    vec2 h=vec2(sd*uCut[k]*uHs, uHy[k]);
    P.xy=rot(P.xy-h,a)+h; N.xy=rot(N.xy,a);
  }
  float l=uYaw.x, f=uYaw.y;
  float lat=-P.x*f+P.z*l, dep=P.x*l+P.z*f;  // 模型 +x＝牠的左、+z＝牠的前
  float nl=-N.x*f+N.z*l, nd=N.x*l+N.z*f;
  float X=uO.x+lat*uS, Y=uO.y-P.y*uS, Z=uO.z+dep*uS;   // dep＝沿鏡頭前方的分量：迎面飛來時頭的 dep<0 ＝更近
  gl_Position=vec4((uF.x*X-uF.x*uO.x/uO.z*Z)/uHalf.x,
                   -(uF.y*Y-uF.y*uO.y/uO.z*Z)/uHalf.y,
                   (Z-uO.z)/uR*Z, Z);
  vP=p; vN0=n;
  vC=c.rgb; vN=vec3(nl,N.y,-nd);       // 鏡頭空間：x 右、y 上、z 朝鏡頭
}`;
const FS=`#version 300 es
precision mediump float;
in vec3 vC; in vec3 vN; in vec3 vP; in vec3 vN0;
uniform vec3 uLit; uniform float uLine; uniform vec3 uLineC;
uniform sampler2D uTex; uniform vec3 uMin, uMax; uniform float uUseTex;
out vec4 o;
/* 四視圖投影：模型外框線性對到圖集的四格（正／背／側／俯），依原始法線混合 */
vec4 cell(vec2 uv, float i){ uv=clamp(uv,0.004,0.996); return texture(uTex, (uv+vec2(mod(i,2.0), floor(i/2.0)))*0.5); }
void main(){
  if(uLine>0.5){ o=vec4(uLineC,1.0); return; }
  vec3 R=uMax-uMin, q=(vP-uMin)/R;
  vec3 col=vC;
  if(uUseTex>0.5){
    vec3 n=normalize(vN0);
    float wf=pow(max(n.z,0.0),8.0), wb=pow(max(-n.z,0.0),8.0), ws=pow(abs(n.x),8.0), wt=pow(abs(n.y),8.0);   // 指數大＝每個面只吃最對得上的那一張，不疊成水彩
    vec4 tf=cell(vec2(q.x,1.0-q.y),0.0), tb=cell(vec2(1.0-q.x,1.0-q.y),1.0),
         ts=cell(vec2(n.x>0.0 ? 1.0-q.z : q.z, 1.0-q.y),2.0), tt=cell(vec2(1.0-q.x,1.0-q.z),3.0);
    float W=wf+wb+ws+wt+1e-4;
    vec3 acc=tf.rgb*tf.a*wf+tb.rgb*tb.a*wb+ts.rgb*ts.a*ws+tt.rgb*tt.a*wt;
    float aw=tf.a*wf+tb.a*wb+ts.a*ws+tt.a*wt;
    col=(acc+vC*(W-aw))/W;
  }
  vec3 N=normalize(vN);
  float d=dot(N,normalize(vec3(-0.45,0.75,0.55)));
  float t=uUseTex>0.5 ? (d>-0.2 ? 1.0 : 0.80) : (d>0.18 ? 1.0 : (d>-0.35 ? 0.72 : 0.56));   // 貼圖本身已有明暗：只再壓一階
  o=vec4(col*t*uLit,1.0);
}`;

function sh(type,src){ const s=g.createShader(type); g.shaderSource(s,src); g.compileShader(s);
  if(!g.getShaderParameter(s,g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s)); return s; }

function init(){
  if(g || initErr) return !!g;
  try{
    cv=document.createElement('canvas'); cv.width=MAXPX; cv.height=MAXPX;
    g=cv.getContext('webgl2',{ antialias:true, premultipliedAlpha:true, alpha:true, depth:true, preserveDrawingBuffer:true });   // 抽格的那一禎要沿用上一張
    if(!g) throw new Error('沒有 WebGL2');
    prog=g.createProgram(); g.attachShader(prog,sh(g.VERTEX_SHADER,VS)); g.attachShader(prog,sh(g.FRAGMENT_SHADER,FS)); g.linkProgram(prog);
    if(!g.getProgramParameter(prog,g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(prog));
    for(const k of ['uS','uOut','uYaw','uO','uF','uHalf','uR','uCut','uHy','uAng','uHs','uTail','uZr','uLit','uLine','uLineC','uTex','uMin','uMax','uUseTex']) U[k]=g.getUniformLocation(prog,k);
  }catch(e){ initErr=String(e); g=null; console.warn('[mon3d] GL 建不起來',e); }
  return !!g;
}

/* 切點比例：DEF 有寫 flap 就用它，沒寫讀 2D 那一份 */
function flapOf(kind){
  const D=DEF[kind], SP=(ENEMY_KINDS[kind]&&ENEMY_KINDS[kind].sprite)||{};
  if(D.flap) return D.flap;
  return { cut:SP.wingCut||[0.15,0.42,0.72], amp:SP.flapAmp||[0.2,0.2,0.22], rest:SP.wingRest||[0.05,0.1,0.12],
           lag:(SP.flapLag!=null)?SP.flapLag:0.07, down:(SP.flapDown!=null)?SP.flapDown:0.38 };
}

function load(kind){
  const D=DEF[kind]; if(!D || M[kind]) return;
  const R=M[kind]={ state:1 };
  if(!init()){ R.state=-1; return; }
  const base=D.dir+D.file;
  fetch(base+(LO?'_lo':'')+'.glb').then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(buf=>{
    const dv=new DataView(buf), jl=dv.getUint32(12,true);
    const J=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,20,jl)));
    const bin=buf.slice(20+jl+8);
    const acc=i=>{ const A=J.accessors[i], V=J.bufferViews[A.bufferView], off=(V.byteOffset||0)+(A.byteOffset||0);
      const T={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array}[A.componentType];
      const n={SCALAR:1,VEC3:3,VEC4:4}[A.type]; return { A, a:new T(bin,off,A.count*n) }; };
    const pr=J.meshes[0].primitives[0];
    const P=acc(pr.attributes.POSITION), N=acc(pr.attributes.NORMAL), C=acc(pr.attributes.COLOR_0), I=acc(pr.indices);
    R.vao=g.createVertexArray(); g.bindVertexArray(R.vao);
    const put=(arr,name,size,type,norm)=>{ const b=g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER,b); g.bufferData(g.ARRAY_BUFFER,arr,g.STATIC_DRAW);
      const l=g.getAttribLocation(prog,name); if(l<0) return; g.enableVertexAttribArray(l); g.vertexAttribPointer(l,size,type,norm,0,0); };
    put(P.a,'p',3,g.FLOAT,false); put(N.a,'n',3,g.FLOAT,false); put(C.a,'c',4,g.UNSIGNED_BYTE,true);
    const ib=g.createBuffer(); g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,ib); g.bufferData(g.ELEMENT_ARRAY_BUFFER,I.a,g.STATIC_DRAW);
    g.bindVertexArray(null);
    R.nIdx=I.A.count; R.idxT=I.A.componentType;
    const pos=P.a; let hs=0, r2=0; for(let i=0;i<pos.length;i+=3){ hs=Math.max(hs,Math.abs(pos[i])); r2=Math.max(r2,pos[i]*pos[i]+pos[i+1]*pos[i+1]+pos[i+2]*pos[i+2]); }
    R.span=hs; R.rad=Math.sqrt(r2); R.bbMin=P.A.min; R.bbMax=P.A.max;   // rad：外接球半徑（身體長的怪遠大於翼展，畫布照它開才不會切掉）
    /* 鉸鏈高：切點那一欄頂點的中位高 */
    const cut=flapOf(kind).cut;
    R.hinge=[0,1,2].map(k=>{ const c=cut[k], ys=[];
      for(let i=0;i<pos.length;i+=3){ if(Math.abs(Math.abs(pos[i])/hs-c)<0.03) ys.push(pos[i+1]); }
      ys.sort((a,b)=>a-b); return [c, ys.length? ys[(ys.length*0.5)|0] : 0]; });
    R.tex=g.createTexture(); const im=new Image(); im.onload=()=>{ g.bindTexture(g.TEXTURE_2D,R.tex); g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
      g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,im); g.generateMipmap(g.TEXTURE_2D);
      g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR); g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR); R.texOK=true; };
    im.src=base+'_atlas.webp';
    R.state=2;
    console.log('[mon3d]', kind, (R.nIdx/3)|0, '面', '鉸鏈', R.hinge.map(h=>h.map(v=>+v.toFixed(3))));
  }).catch(e=>{ R.state=-1; R.err=String(e); console.warn('[mon3d] 載不到', kind, e); });
}

/* 一拍的波形：與 2D 那支 flapWave 同一個形狀（下拍快、上收慢）。
   ⚠ 這是**照抄**不是重算：2D 那一支是 drawEnemy3D 裡的區域函式，拿不到。改一邊要改另一邊。 */
function flapWave(t,DOWN){
  if(t<DOWN){ const u=t/DOWN, e=u*u*(3-2*u); return 1-2*e; }
  const u=(t-DOWN)/(1-DOWN), e=u*u*(3-2*u); return -1+2*e;
}

const off={ on:true }, DBG={ yaw:null, noTex:false };
/* ⚠ 抽格（Ray 11-07：「3D 讓他幀數減少 33%」）：每 3 禎只重算 2 次姿勢，第 3 禎沿用上一張 ——
   位置與大小照常跟著走（貼的地方是這一禎的），只有動作是頓的，像手繪動畫。
   `CAD.pat` 是節拍（1＝重畫、0＝沿用），要改節奏只改這一串。 */
const CAD={ pat:[1,1,0], n:0, dpx:0, kind:'' };

/* 畫一隻：o＝{ kind, ctx, x, y（螢幕 CSS px 的中心）, lat, h, z（中心在鏡頭座標：橫向／鏡頭高−牠高／進深）,
   l, f（航向在鏡頭座標）, W, VIEWH, now, lit:[r,g,b], pxScale, clip:fn } */
function draw(o){
  const kind=o.kind||'bldragon', R=M[kind];
  if(!R || R.state!==2) return false;
  const t0=performance.now();
  const D=DEF[kind], K=ENEMY_KINDS[kind], SP=K.sprite||{};
  const spanW=(SP.frontSpanW||SP.spanW||980)*D.spanK*tuneOf('size',o.kind);   // TUNE：遭遇測試的大小滑桿（只在測試時有值）
  const span=R.span, sWorld=spanW/2/(D.fit==='rad' ? R.rad : span);   // 模型單位 → 世界單位（翼展對齊 2D 那張圖；管狀的怪 fit:'rad' 改用外接球）
  const fx=o.W/2, fy=0.62*o.VIEWH;
  const rW=Math.max(span*1.35, R.rad*1.12)*sWorld;      // 外接半徑（世界）：翼展＋拍翅餘裕，或整隻的外接球，取大
  const zn=Math.max(o.z-rW, o.z*0.35);
  const half=Math.ceil(fx*rW/zn);                       // 畫布半邊（CSS px）
  const dpr=o.pxScale||Math.min(window.devicePixelRatio||1, 2);   // 與 2D 怪同一個解析度（飛行頁的背景緩衝）
  const dpx=Math.min(MAXPX, Math.ceil(half*2*dpr));
  if(dpx<8) return true;
  const hp=dpx/2, sc=hp/half;
  const keep=!o.noHold && CAD.dpx>0 && CAD.kind===kind && !CAD.pat[CAD.n++ % CAD.pat.length];
  const c=o.ctx;
  if(keep){
    c.save(); c.imageSmoothingEnabled=false; if(o.clip) o.clip();
    c.drawImage(cv, 0, MAXPX-CAD.dpx, CAD.dpx, CAD.dpx, o.x-half, o.y-half, half*2, half*2);
    c.restore(); stat.held++; return true;
  }
  CAD.dpx=dpx; CAD.kind=kind;
  g.viewport(0,0,dpx,dpx);
  g.enable(g.SCISSOR_TEST); g.scissor(0,0,dpx,dpx);
  g.clearColor(0,0,0,0); g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
  g.disable(g.SCISSOR_TEST);
  g.useProgram(prog); g.bindVertexArray(R.vao);
  g.enable(g.DEPTH_TEST); g.depthFunc(g.LEQUAL);
  let yl=o.l, yf=o.f; if(DBG.yaw!=null){ yl=Math.sin(DBG.yaw); yf=-Math.cos(DBG.yaw); }   // 除錯：0＝迎面、π/2＝往右
  g.uniform1f(U.uS,sWorld); g.uniform2f(U.uYaw,yl,yf); g.uniform3f(U.uO,o.lat,o.h,o.z);
  g.uniform2f(U.uF,fx*sc,fy*sc); g.uniform2f(U.uHalf,hp,hp); g.uniform1f(U.uR,rW*1.2);
  g.uniform1f(U.uHs,span);
  g.uniform3f(U.uCut,R.hinge[0][0],R.hinge[1][0],R.hinge[2][0]);
  g.uniform3f(U.uHy,R.hinge[0][1],R.hinge[1][1],R.hinge[2][1]);
  /* 擺角：常駐下壓 REST ＋ 波形 × 幅度，往外逐節落後 LAG */
  const F=flapOf(kind);
  const tt=((o.now*tuneOf('anim',kind)*K.wingHz)/(2*Math.PI))%1;   // 動作速度：遭遇測試的滑桿（預設 1）
  const A3=[0,1,2].map(k=>F.rest[k]-F.amp[k]*flapWave(((tt-F.lag*k)%1+1)%1,F.down));
  g.uniform3f(U.uAng,A3[0],A3[1],A3[2]);
  /* 尾波：與拍翅同一個週期，相位跟著拍 */
  const T=D.tail, zr=[R.bbMin[2],R.bbMax[2]];
  g.uniform2f(U.uZr,zr[0],zr[1]);
  if(T) g.uniform4f(U.uTail, zr[0]+(zr[1]-zr[0])*(T.from+1)/2, T.amp, T.waves, tt*6.2832);
  else g.uniform4f(U.uTail,0,0,0,0);
  g.uniform3fv(U.uLit,o.lit);
  g.uniform3f(U.uMin,R.bbMin[0],R.bbMin[1],R.bbMin[2]); g.uniform3f(U.uMax,R.bbMax[0],R.bbMax[1],R.bbMax[2]);
  g.uniform1f(U.uUseTex,(R.texOK&&!DBG.noTex)?1:0); g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D,R.tex); g.uniform1i(U.uTex,0);
  /* ① 描邊：背面外擴、深色 */
  const lineW=Math.max(0.9, 1.3*dpr)/ (fx*sc*sWorld/o.z);   // 約 1.3 裝置像素寬，換回模型單位
  g.enable(g.CULL_FACE); g.cullFace(g.FRONT);   // 描邊只畫背面（外擴後露在本體外的那一圈）
  g.uniform1f(U.uOut,lineW); g.uniform1f(U.uLine,1); g.uniform3f(U.uLineC,0.16*o.lit[0],0.11*o.lit[1],0.10*o.lit[2]);
  g.drawElements(g.TRIANGLES,R.nIdx,R.idxT,0);
  /* ② 本體 */
  g.cullFace(g.BACK);
  g.uniform1f(U.uOut,0); g.uniform1f(U.uLine,0);
  g.drawElements(g.TRIANGLES,R.nIdx,R.idxT,0);
  g.disable(g.CULL_FACE);
  g.bindVertexArray(null);
  stat.px=dpx;
  /* 貼回 2D 畫面 */
  c.save(); c.imageSmoothingEnabled=false;
  if(o.clip) o.clip();
  c.drawImage(cv, 0, MAXPX-dpx, dpx, dpx, o.x-half, o.y-half, half*2, half*2);
  c.restore();
  stat.frames++; stat.ms+=performance.now()-t0;
  return true;
}

/* 基準測試：同步連畫 n 次、最後讀回一次 —— 量「多畫一隻 3D 怪」的增量成本（不受分頁可見與否影響） */
function bench(n, halfPx, kind){
  kind=kind||'bldragon';
  const cv2=document.createElement('canvas'); cv2.width=cv2.height=halfPx*2; const c2=cv2.getContext('2d');
  const px=new Uint8Array(4), o={ kind, noHold:true, ctx:c2, x:halfPx, y:halfPx, lat:0, h:60, z:1200, l:0, f:-1, W:375, VIEWH:430, now:0, lit:[1,1,1], pxScale:1 };
  draw(o); g.readPixels(0,0,1,1,g.RGBA,g.UNSIGNED_BYTE,px);
  const run=k=>{ const t0=performance.now(); for(let i=0;i<k;i++){ o.now=i*16.7; draw(o); } g.readPixels(0,0,1,1,g.RGBA,g.UNSIGNED_BYTE,px); return performance.now()-t0; };
  const a=run(1), b=run(n+1);                                  // 兩次都含一次讀回同步 → 相減就是 n 次繪製
  return { ms:(b-a)/n, px:stat.px, tris:(M[kind].nIdx/3)|0 };
}

/* 遭遇測試的調整值（大小×、開戰距離）：存在這個瀏覽器，重整不會丟；定案後由 Ray 報數字寫進 DEF／ENEMY_CFG */
/* 調整值的唯一真相：`flight/enemy/sky3d_tune.json`（遭遇測試面板的「儲存」寫它；開機讀它）。
   滑桿改的是記憶體裡這一份，按「儲存」才寫回檔案（devserver `/__save/` 白名單）。 */
const TUNE={ size:{}, engage:{}, count:{}, anim:{}, speed:{}, approach:{}, chase:{}, gone:{} };
let tuneDirty=false;
(()=>{ try{ const x=new XMLHttpRequest(); x.open('GET','enemy/sky3d_tune.json?v='+Date.now(),false); x.send();   // 同步：第一幀就要用到
  if(x.status===200){ const t=JSON.parse(x.responseText); for(const k in TUNE) if(t[k] && typeof t[k]==='object') TUNE[k]=t[k]; } }catch(e){} })();
const TUNE_DEF={ engage:null, size:1, count:1, anim:1, speed:1, approach:'', chase:null, gone:3400 };   // null＝沿用 ENEMY_CFG.engage
const tuneOf=(f,k)=>{ const v=TUNE[f][k]; if(v!=null) return v;
  try{ if(f==='engage') return ENEMY_CFG.engage; if(f==='chase') return Math.round(ENEMY_CFG.spawnDist*ENEMY_CFG.chaseAt); }catch(e){ return f==='engage'?300:1680; }
  return TUNE_DEF[f]; };
function tuneSave(){ tuneDirty=true; const b=document.getElementById('drg3dSave'); if(b){ b.textContent='儲存 *'; b.style.background='#c0392b'; } }
async function tuneWrite(){
  const b=document.getElementById('drg3dSave');
  try{ const r=await fetch('/__save/flight/enemy/sky3d_tune.json',{ method:'POST', body:JSON.stringify(TUNE,null,1) });
    if(!r.ok) throw new Error(await r.text());
    tuneDirty=false; if(b){ b.textContent='已儲存 ✓'; b.style.background='#2e7d32'; }
  }catch(e){ if(b){ b.textContent='儲存失敗'; b.style.background='#c0392b'; } console.warn('sky3d_tune 儲存失敗', e); }
}
const HOLD=/[?&]drg3dhold/.test(location.search);
const FIGHT=/[?&]drg3dfight/.test(location.search);   // 遭遇測試：照常追擊，到開戰距離只閃字不進戰鬥，馬上再刷下一隻（調開戰距離用）
const HOLDARG=((location.search.match(/[?&]drg3dkind=(\w+)/)||[])[1])||'bldragon';
/* drg3dkind=all：全部空中怪輪流看 —— 畫面上方的「◀ 名字 ▶」或 [ ] 鍵換下一隻（index.html 的掛鉤看到種類變了就收掉重生） */
const HOLDLIST=HOLDARG==='all' ? Object.keys(DEF).filter(k=>k!=='sky_southlord') : [HOLDARG];
let holdIx=0;
window.DRG3D={ mode:MODE, hold:HOLD, fight:FIGHT, fightTimer:1500, engaged, fightTick, get holdKind(){ return HOLDLIST[holdIx]; }, cad:CAD, bench, off, dbg:DBG, def:DEF, models:M, stat, draw,
  has:k=>!!DEF[k],
  ready:k=>{ k=k||'bldragon'; if(!off.on || !DEF[k]) return false; if(!M[k]) load(k); return M[k].state===2; },
  next:d=>{ holdIx=(holdIx+(d||1)+HOLDLIST.length)%HOLDLIST.length; load(HOLDLIST[holdIx]); holdUi(); if(FIGHT) fightUi(); }, tune:TUNE, tuneOf,
  spanOf:k=>{ let SP={}; try{ SP=ENEMY_KINDS[k].sprite||{}; }catch(e){} return (SP.frontSpanW||SP.spanW||980)*(DEF[k]?DEF[k].spanK:1)*tuneOf('size',k); } };
function holdUi(){
  if(HOLDLIST.length<2) return;
  let bar=document.getElementById('drg3dBar');
  if(!bar){
    bar=document.createElement('div'); bar.id='drg3dBar';
    bar.style.cssText='position:fixed;top:calc(env(safe-area-inset-top) + 48px);left:6px;z-index:99999;display:flex;gap:6px;align-items:center;'+
      'font:600 15px sans-serif;color:#fff;background:rgba(0,0,0,.55);border-radius:20px;padding:4px 6px;user-select:none';
    const mk=(t,d)=>{ const b=document.createElement('button'); b.textContent=t;
      b.style.cssText='font:inherit;color:#fff;background:rgba(255,255,255,.18);border:0;border-radius:16px;width:40px;height:34px';
      b.addEventListener('pointerdown',e=>{ e.stopPropagation(); e.preventDefault(); window.DRG3D.next(d); }); return b; };
    const lab=document.createElement('span'); lab.id='drg3dLab'; lab.style.cssText='min-width:150px;text-align:center';
    bar.append(mk('◀',-1),lab,mk('▶',1)); document.body.appendChild(bar);
    addEventListener('keydown',e=>{ if(e.key===']') window.DRG3D.next(1); else if(e.key==='[') window.DRG3D.next(-1); });
  }
  const k=HOLDLIST[holdIx]; let K=null; try{ K=ENEMY_KINDS[k]; }catch(e){}
  document.getElementById('drg3dLab').textContent=(holdIx+1)+'/'+HOLDLIST.length+'　'+((K&&K.name)||k);
}
/* ── 遭遇測試（?drg3d=1&drg3dfight[&drg3dkind=all]）──
   開戰距離＝ENEMY_CFG.engage（唯一真相，這裡只改它的值）；滑桿調、即時生效。
   index.html 的掛鉤：沒怪就 fightTimer 倒數後 spawnEnemy；到距離就叫 engaged() 而不交棒。 */
let fightLast=null;
const SLIDERS=[ ['engage','開戰距離',100,1500,10,0], ['size','大小 ×',0.3,3,0.05,2], ['count','數量',1,8,1,0],
  ['anim','動作速度 ×',0.2,3,0.05,2], ['speed','接近速度 ×',0.2,4,0.05,2], ['chase','巡航轉追',300,3000,50,0], ['gone','巡航消失',1000,6000,100,0] ];
const APPROACH=[['','側面出、立刻追（原本）'],['direct','出怪後直接飛來'],['cruise','側面巡航，靠近才追']];
function fightUi(){
  let box=document.getElementById('drg3dFight');
  const k=HOLDLIST[holdIx];
  if(!box){
    box=document.createElement('div'); box.id='drg3dFight';
    box.style.cssText='position:fixed;top:calc(env(safe-area-inset-top) + 92px);left:6px;z-index:99999;'+
      'font:600 12px sans-serif;color:#fff;background:rgba(0,0,0,.5);border-radius:12px;padding:5px 9px;user-select:none;width:250px';
    let h='<div id="drg3dHead" style="display:flex;justify-content:space-between"><span>現在距離 <span id="drg3dDist"></span></span><span><button id="drg3dRe" style="font:inherit;color:#fff;background:#555;border:0;border-radius:8px;padding:2px 8px">重刷</button> <button id="drg3dSave" style="font:inherit;color:#fff;background:#2e7d32;border:0;border-radius:8px;padding:2px 10px">已儲存 ✓</button> <span id="drg3dFold" style="padding:0 4px">收合 ▲</span></span></div><div id="drg3dBody">';
    for(const [f,t,mn,mx,st] of SLIDERS) h+='<div style="display:flex;align-items:center;gap:6px"><span style="width:84px">'+t+'</span>'+
      '<input data-f="'+f+'" type="range" min="'+mn+'" max="'+mx+'" step="'+st+'" style="flex:1"><b data-v="'+f+'" style="width:44px;text-align:right"></b></div>';
    h+='<div style="display:flex;align-items:center;gap:6px"><span style="width:84px">出場方式</span><select id="drg3dAp" style="flex:1;font:inherit">'+
      APPROACH.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('')+'</select></div>';
    h+='<div id="drg3dSum" style="font-weight:400;font-size:11px;opacity:.85"></div></div><div id="drg3dHit" style="color:#ffd27a;min-height:15px"></div>';
    box.innerHTML=h; document.body.appendChild(box);
    box.querySelector('#drg3dSave').addEventListener('click',tuneWrite);
    box.querySelector('#drg3dRe').addEventListener('click',()=>{ window.DRG3D.respawn=true; });   // index.html 的掛鉤收掉現在那隻、0.3 秒後重刷
    box.querySelector('#drg3dAp').addEventListener('change',e=>{ const kk=HOLDLIST[holdIx];
      if(e.target.value) TUNE.approach[kk]=e.target.value; else delete TUNE.approach[kk]; tuneSave(); fightUi(); });
    addEventListener('beforeunload',e=>{ if(tuneDirty){ e.preventDefault(); e.returnValue=''; } });
    box.querySelector('#drg3dFold').addEventListener('click',()=>{ const b=box.querySelector('#drg3dBody'), f=b.style.display==='none';
      b.style.display=f?'':'none'; box.querySelector('#drg3dFold').textContent=f?'收合 ▲':'展開 ▼'; });
    ['pointerdown','touchstart','mousedown','click'].forEach(t=>box.addEventListener(t,e=>e.stopPropagation()));
    box.querySelectorAll('input[data-f]').forEach(r=>r.addEventListener('input',()=>{
      const f=r.dataset.f, kk=HOLDLIST[holdIx]; TUNE[f][kk]=+r.value; tuneSave(); fightUi(); }));
  }
  for(const [f,,,,,dg] of SLIDERS){ const v=tuneOf(f,k);
    box.querySelector('input[data-f="'+f+'"]').value=v; box.querySelector('b[data-v="'+f+'"]').textContent=(+v).toFixed(dg); }
  box.querySelector('#drg3dAp').value=TUNE.approach[k]||'';
  const nm=x=>{ try{ return ENEMY_KINDS[x].name; }catch(e){ return x; } };
  const kinds=new Set(); for(const f in TUNE) for(const x in TUNE[f]) kinds.add(x);
  const rows=[...kinds].map(x=>nm(x)+'：'+SLIDERS.filter(([f])=>TUNE[f][x]!=null).map(([f,t,,,,dg])=>t.replace(' ×','')+' '+(+TUNE[f][x]).toFixed(dg)).concat(TUNE.approach[x]?[APPROACH.find(a=>a[0]===TUNE.approach[x])[1]]:[]).join('／'));
  box.querySelector('#drg3dSum').innerHTML=rows.length?('已調：<br>'+rows.join('<br>')):'';
}
function fightTick(dist){ const d=document.getElementById('drg3dDist'); if(d) d.textContent=dist!=null?('現在 '+Math.round(dist)):''; }
function engaged(dist){
  fightLast=Math.round(dist);
  const h=document.getElementById('drg3dHit'); if(h){ h.textContent='接戰！（觸發時距離 '+fightLast+'）'; clearTimeout(h._t); h._t=setTimeout(()=>{ h.textContent=''; },2500); }
  window.DRG3D.fightTimer=1500;
}
if(FIGHT){ load(HOLDLIST[0]); const go=()=>{ holdUi(); fightUi(); }; if(document.body) go(); else addEventListener('DOMContentLoaded',go); addEventListener('load',()=>setTimeout(go,500)); }
if(HOLD){ load(HOLDLIST[0]); if(document.body) holdUi(); else addEventListener('DOMContentLoaded',holdUi); addEventListener('load',()=>setTimeout(holdUi,500)); }   // load 之後再寫一次：ENEMY_KINDS 那時才有中文名
})();
