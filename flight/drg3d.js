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
};
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
    const pos=P.a; let hs=0; for(let i=0;i<pos.length;i+=3) hs=Math.max(hs,Math.abs(pos[i]));
    R.span=hs; R.bbMin=P.A.min; R.bbMax=P.A.max;
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
  const spanW=(SP.frontSpanW||SP.spanW||980)*D.spanK;
  const span=R.span, sWorld=spanW/2/span;               // 模型單位 → 世界單位（翼展對齊 2D 那張圖）
  const fx=o.W/2, fy=0.62*o.VIEWH;
  const rW=span*sWorld*1.35;                            // 外接半徑（世界；尾巴長的怪多留一點）
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
  const tt=((o.now*K.wingHz)/(2*Math.PI))%1;
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

const HOLD=/[?&]drg3dhold/.test(location.search);
const HOLDKIND=((location.search.match(/[?&]drg3dkind=(\w+)/)||[])[1])||'bldragon';
window.DRG3D={ mode:MODE, hold:HOLD, holdKind:HOLDKIND, cad:CAD, bench, off, dbg:DBG, def:DEF, models:M, stat, draw,
  has:k=>!!DEF[k],
  ready:k=>{ k=k||'bldragon'; if(!off.on || !DEF[k]) return false; if(!M[k]) load(k); return M[k].state===2; } };
if(HOLD) load(HOLDKIND);
})();
