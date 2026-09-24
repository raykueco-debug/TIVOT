/* ============================================================================
 *  script/branches.js — 劇情分支點的掃描（ver -1708，Ray：「在首頁做一個分歧檢查，
 *  把所有劇情分支點列表，選擇分支點就從該分支存在的『幕』進場」）
 *  ---------------------------------------------------------------------------
 *  ⚠⚠ ver -1711 收窄（Ray：「分歧選擇以有編號的為準 如 M H 路線 AB 路線或 BA 路線
 *    不用分好感 好感在遊戲內可調」「約會事件只要放旅店就好 我測試可以自己走」）：
 *    · **只列路線分歧** —— 條件裡用到 `ROUTE` 那幾支旗的才算分支點。
 *      好感段位、選項、其他旗一律不列（好感在遊戲內調、選項進場後自己選）。
 *    · **約會事件一座城收成一筆**：人放到旅店，約誰、走去哪由測試的人自己來。
 *      那一筆若有路線分歧（雪都約安雅的 M1／M2）照樣可以先選路線。
 *
 *  「幕」＝城鎮節點上的一段 `acts`（主線 `mainScript.js` 沒有任何分支）。
 *  「分支點」＝一幕裡**同一條路線**影響到的那幾拍（併成一點，不論出現幾次）：
 *    · route  —— 拍上的 `onlyIf`／`skipIf` 用到路線旗
 *    · variant—— **同一格、共用同一支 `flag` 的幾個 act**，而且版本之間差在路線旗
 *                （整幕就是分支，進場那一刻就分）
 *  ⚠ 純資料掃描：只讀 `TOWNS`，不碰 DOM、不寫任何狀態（首頁的面板與 `tools/branch_tree.mjs`
 *    都讀這一支 —— 同一份清單只算一次，鐵律 7）。
 * ========================================================================== */
import { TOWNS } from './town.js';

const asArr = v => v==null ? [] : (Array.isArray(v) ? v : [v]);
const WHO_ZH = { RENNA:'蕾娜', NOUVELLE:'諾薇兒', SORANA:'索菈娜', ANYA:'安雅' };

/* ══ 路線表（ver -1713，Ray：「分岐目前有 ABM1,H、BAM1,H、BAM2,H 這些是帶編號跟順序的路線」
   「應該沒有 ABM2」）══════════════════════════════════════════════════════════════
   ⚠⚠⚠ **路線是列舉出來的，不是兩個軸相乘。** -1711 把「先後順序」（A＝伊甸古墓那一條、
   B＝貝利薩爾→東泊）與「那一夜」（M1＝敲了蕾娜的門、M2＝獨自跟上）當成兩個獨立的分支點，
   於是面板長出了 AB・M2 —— 那條路不存在：M2 只在東泊那一夜選得到，而古城沒做完出不了東泊
   （`sail.hold until ep_belisar_done`），所以「選了 M2、卻先走出古墓」到不了。
   合法的只有三條：**AB・M1／BA・M1／BA・M2**（順序照 Ray 列的）。
   H（古墓 T3 那一條的收場插的 `tomb_h_route`）是古墓**之後**的派生，三條路線都可以帶 ⇒ 另立一軸。
   ⚠ 一幕只動**那一幕真的讀到的**那一軸的旗（軸內整組一起擺，兩邊互斥是資料保證的：
     M2 的 `until` 就是 M1 的 `need`；`belisar_seen`／`ep_belisar_done` 是同一件事的兩支）。 */
const AXIS = {                                  // 旗 → 哪一軸、哪一邊
  ep_m1_route:     { axis:'M',   side:'M1' },
  ep_m2_route:     { axis:'M',   side:'M2' },
  belisar_seen:    { axis:'ORD', side:'BA' },
  ep_belisar_done: { axis:'ORD', side:'BA' },
  tomb_done:       { axis:'ORD', side:'AB' },
  tomb_h_route:    { axis:'H',   side:'H'  },
};
const AXIS_SIDES = { M:['M1','M2'], ORD:['AB','BA'], H:['H','非 H'] };
/* 同伴旗：選一邊時一起擺的那幾支（兩邊互斥是資料保證的 —— M2 的 `until` 就是 M1 的 `need`；
   `belisar_seen`／`ep_belisar_done` 是同一件事的兩支）。
   ⚠⚠ **只動那一幕真的讀到的旗（＋同伴）**，不要把一軸整組都擺：`tomb_done` 與
   `belisar_seen` 同屬 ORD 軸，但墓門那一幕選 AB 時人正要**走進**古墓 —— 把 `tomb_done`
   一起插上就是「還沒進去就走完了」。 */
const PAIR = { ep_m1_route:['ep_m2_route'], ep_m2_route:['ep_m1_route'],
               belisar_seen:['ep_belisar_done'], ep_belisar_done:['belisar_seen'] };
const withPair = flags => { const all=new Set(); for(const f of flags){ all.add(f); for(const g of (PAIR[f]||[])) all.add(g); } return [...all]; };
/* 三條有編號的路線。⚠ 加一條路線只加這裡（鐵律 1）。 */
/* ⚠ ver -1720：AB **沒有 M**（Ray：「當初把 A 路線共用 M1 把我自己搞混了，分一下」）——
   先跑古墓的人到墓門時兩支 M 旗都還沒有；`M:null` ＝選這一條時把兩支 M 旗都拔掉。 */
const ROUTES = [
  { id:'AB',    ORD:'AB', M:null },
  { id:'BA・M1', ORD:'BA', M:'M1' },
  { id:'BA・M2', ORD:'BA', M:'M2' },
];
/* 分支點的「code」：M 與 ORD 兩軸併成一個點 `RT`（選的是路線，不是軸）；H 自己一個點。 */
const codeOfAxis = axis => axis==='H' ? 'H' : 'RT';
const CODE = { RT:{ label:'路線（AB／BA・M1／BA・M2）' }, H:{ label:'H 路線' } };
const isRoute = f => !!AXIS[f];
const other = (axis, side) => AXIS_SIDES[axis].find(s=>s!==side);

/* 指定每一軸要哪一邊（`sides`＝{axis:side}）→ `flags`（已含同伴）各要插或拔。 */
function flagOps(flags, sides){
  const add=[], remove=[];
  for(const f of flags){ const a=AXIS[f]; if(!(a.axis in sides)) continue;
    (sides[a.axis]!==null && a.side===sides[a.axis] ? add : remove).push(f); }   // null ＝這一軸整組拔掉（AB 的 M）
  return { add, remove };
}
/* 一組路線旗 → 這個分支點各邊各插什麼、拔什麼。
   RT：三條路線各一邊；H：H／非 H。都只動 `flags`（＋同伴）。 */
function sidesOf(code, flags){
  const all=withPair(flags);
  if(code==='H') return AXIS_SIDES.H.map(side=>Object.assign({ label:side }, flagOps(all, { H:side })));
  return ROUTES.map(r=>Object.assign({ label:r.id }, flagOps(all, r)));
}

function lineText(ln){
  if(!ln) return '';
  if(ln.text) return ln.text;
  if(ln.textByTier){ const k=Object.keys(ln.textByTier)[0]; return ln.textByTier[k]||''; }
  if(ln.battle) return '〔戰鬥 '+ln.battle+'〕';
  if(ln.choice) return '〔選項〕';
  return '';
}
function actTitle(act){
  const t = (act.lines||[]).map(lineText).find(s=>s && s.trim());
  return (t||'').slice(0,18);
}

/* 一串拍裡的路線分支點（同一個 code 併成一點）。 */
function pointsOf(lines){
  const pts=new Map();
  (lines||[]).forEach((ln, li)=>{
    if(!ln || typeof ln!=='object') return;
    for(const f of asArr(ln.onlyIf).concat(asArr(ln.onlyIfAll), asArr(ln.skipIf))){   // onlyIfAll：ver -1716 的「且」
      if(!isRoute(f)) continue;
      const code=codeOfAxis(AXIS[f].axis);
      let p=pts.get(code);
      if(!p){ p={ kind:'route', code, label:CODE[code].label, flags:new Set(), lines:[] }; pts.set(code,p); }
      p.flags.add(f); p.lines.push(li);
    }
  });
  return [...pts.values()].map(p=>{ p.variants=sidesOf(p.code,[...p.flags]); p.flags=[...p.flags]; return p; });
}

/* 一個版本（act／onLeave 的一項）落在各軸的哪一邊：`need` 裡的路線旗 ＝ 那一邊，
   `until` 裡的 ＝ 另一邊。回 { axis:side }。 */
function routeOfVersion(a){
  const r={};
  for(const f of asArr(a.need)) if(isRoute(f)) r[AXIS[f].axis]=AXIS[f].side;
  for(const f of asArr(a.until)) if(isRoute(f)) r[AXIS[f].axis]=other(AXIS[f].axis, AXIS[f].side);
  return r;
}
/* 幾個版本併看：只要有一個版本帶了某一軸，沒帶的版本就是另一邊（例：M2 的版本
   `need:'ep_m2_route'`、M1 的版本什麼都沒寫 ⇒ 它是 M1）。
   回每個版本的 { sides:{axis:side}, add, remove, axes, routes:[匹配到的路線 id…] }。 */
function versionRoutes(versions){
  const rs=versions.map(routeOfVersion);
  const axes=new Set(); rs.forEach(r=>Object.keys(r).forEach(c=>axes.add(c)));
  const flags=withPair(versions.flatMap(a=>asArr(a.need).concat(asArr(a.until)).filter(isRoute)));   // 這幾個版本真的讀到的旗
  return rs.map(r=>{
    const sides={};
    for(const ax of axes){
      const side = r[ax] || (() => {           // 沒寫的那一邊 ＝ 其他版本的反面
        const seen=new Set(rs.map(x=>x[ax]).filter(Boolean));
        return seen.size===1 ? other(ax,[...seen][0]) : null;
      })();
      if(side) sides[ax]=side;
    }
    /* ⚠ ver -1721：**AB 沒有 M**（`ROUTES`）—— 上面那條「沒寫的那一邊＝其他版本的反面」會把
       A 版（只寫 `until:'ep_belisar_done'`）推成 M1，於是對不上路線表。ORD 是 AB 而 M 不是
       這個版本自己寫的 ⇒ `M:null`（＝兩支 M 旗都拔，同 ROUTES 的 AB）。 */
    if(sides.ORD==='AB' && !r.M && axes.has('M')) sides.M=null;
    const { add, remove } = flagOps(flags, sides);
    const rtAxes=Object.keys(sides).filter(ax=>ax!=='H');
    const routes = rtAxes.length ? ROUTES.filter(x=>rtAxes.every(ax=>x[ax]===sides[ax])).map(x=>x.id) : [];
    return { sides, add, remove, axes:[...axes], routes, rtAxes };
  });
}
/* 版本的名字：匹配到的路線（一條或幾條）＋ H。
   ⚠⚠ **資料上有、路線表上沒有的組合**（例：`vn_after_tomb` 那個 AB・M2 的 act）不藏起來，
   標成 ⚠ —— 那是腳本裡的死版本，該由 Ray 決定拿不拿掉；面板靜靜跳過它，下一個人就看不到了。 */
function routeLabel(v){
  const parts=[];
  if(v.rtAxes.length){
    if(v.routes.length) parts.push(v.routes.join('／'));
    else parts.push('⚠ 資料有這個版本、路線表沒有（'+v.rtAxes.map(ax=>v.sides[ax]).join('・')+'）');
  }
  if(v.sides.H) parts.push(v.sides.H);
  return parts.join('・');
}

/* 約會事件：要某人同行才演（`withWho`）、或條件掛在約會旗上（`ep_date_*`）的段落。 */
const isDateFlag = f => /^ep_date_/.test(f);
const isDateAct = a => !!(a && (a.withWho || asArr(a.need).some(isDateFlag)));

/* 回 [{ id, kind, town, townName, node, nodeName, act?, actFlag, title, atStart, enterable, note, points:[…] }]
   `kind`：'act'（節點的段落，進場時直接演它）／'arrive'（進場對白，拔旗後走進去）／
   'gate'（時鐘閘門）／'leave'（離開那一格時演）／'talk'（店主／挑戰那一類對話）／
   'date'（約會事件：一座城一筆，放到旅店）——
   'act'／'arrive' 以外的**沒辦法直接演**，進場＝把條件擺好、人放到那一格，觸發交給玩家（`note`）。 */
export function scanBranches(){
  const out=[];
  const push=(o)=>{ if(o.points.length) out.push(o); };
  for(const [tid, T] of Object.entries(TOWNS||{})){
    const nodes=T.nodes||{};
    const base=(nid, extra)=>Object.assign({ town:tid, townName:T.name||tid, node:nid,
      nodeName:((nodes[nid]||{}).name||nid) }, extra);
    const innId=Object.keys(nodes).find(k=>nodes[k] && nodes[k].inn) || null;
    const date={ who:new Set(), points:new Map() };   // 這座城的約會事件，最後併成一筆
    const dateAdd=(pts, who)=>{
      if(who) date.who.add(who);
      for(const p of pts){ const q=date.points.get(p.code);
        if(!q) date.points.set(p.code, p);
        else { q.flags=[...new Set(q.flags.concat(p.flags))]; q.variants=sidesOf(q.code,q.flags); } }
    };
    for(const [nid, n] of Object.entries(nodes)){
      const acts = n.acts||[];
      const byFlag={};
      acts.forEach((a,i)=>{ if(a && a.flag) (byFlag[a.flag]=byFlag[a.flag]||[]).push(i); });
      const vr={};                              // 同 flag 的版本 → 各自的路線
      for(const [f, idx] of Object.entries(byFlag)) if(idx.length>1){
        const v=versionRoutes(idx.map(i=>acts[i]));
        idx.forEach((i,k)=>{ vr[i]=v[k]; });
      }
      acts.forEach((a, ai)=>{
        if(!a || !a.lines) return;
        const sib=byFlag[a.flag]||[];
        if(isDateAct(a) || sib.some(i=>isDateAct(acts[i]))){ dateAdd(pointsOf(a.lines), a.withWho); return; }
        const points=pointsOf(a.lines);
        const v=vr[ai];
        if(v && v.axes.length)
          points.unshift({ kind:'variant', lines:[0],
            label:'整幕分支（'+a.flag+' 共 '+sib.length+' 個版本）',
            variants:[ { label:(routeLabel(v)||'這個版本')+' 版', add:v.add, remove:v.remove } ] });
        push(base(nid, { id:tid+'.'+nid+'.act'+ai, kind:'act', act:a, actIndex:ai, actFlag:a.flag||null,
          title:actTitle(a), enterable:true, points,
          atStart: !!(v && v.axes.length) || points.some(p=>p.lines[0]===0) }));
      });
      if(n.lines) push(base(nid, { id:tid+'.'+nid+'.arrive', kind:'arrive', actFlag:null,
        title:'進場對白　'+actTitle({lines:n.lines}), enterable:true, points:pointsOf(n.lines),
        atStart:false }));
      for(const k of ['keeper','challengeLines']) if(Array.isArray(n[k]))
        push(base(nid, { id:tid+'.'+nid+'.'+k, kind:'talk', actFlag:null,
          title:(k==='keeper'?'店主對話':'挑戰對話')+'　'+actTitle({lines:n[k]}), enterable:false,
          note:'放到這一格，自己去跟店主／挑戰那一邊對話', points:pointsOf(n[k]), atStart:false }));
      /* 離開這一格時演的那一段（東泊走出旅店：古墓完成前／後 ＝ BA／AB）。 */
      const leaves=asArr(n.onLeave).filter(Boolean);
      if(leaves.length){
        const points=[];
        leaves.forEach(l=>{ for(const p of pointsOf(l.lines)) if(!points.some(q=>q.code===p.code)) points.push(p); });
        const v=versionRoutes(leaves);
        if(v[0] && v[0].axes.length)
          points.unshift({ kind:'variant', lines:[0], label:'離開時的版本（'+leaves.length+' 個）',
            variants:v.map((x,i)=>({ label:(routeLabel(x)||'版本'+(i+1))+' 版', add:x.add, remove:x.remove })) });
        push(base(nid, { id:tid+'.'+nid+'.leave', kind:'leave', actFlag:null,
          title:'離開時　'+actTitle(leaves[0]), enterable:false,
          note:'放到這一格，自己走出去', points, atStart:false }));
      }
      const knock=(n.innStage1||{}).knock||{};
      for(const [who, kn] of Object.entries(knock)) if(kn && Array.isArray(kn.date))
        dateAdd(pointsOf(kn.date), who);
    }
    (T.gates||[]).forEach((g, gi)=>{
      if(!g || !g.lines) return;
      if(asArr(g.need).some(isDateFlag)){ dateAdd(pointsOf(g.lines)); return; }
      const nid = (g.goto && String(g.goto).indexOf('@')<0) ? g.goto : (T.entry||Object.keys(nodes)[0]);
      const points=pointsOf(g.lines);
      push(base(nid, { id:tid+'.gate'+gi, kind:'gate', actFlag:g.flag||null,
        title:'閘門 '+(g.flag||gi)+'　'+actTitle(g), enterable:false,
        note:'時鐘閘門：放到這座城，條件到了自己觸發（'+[g.need&&('need '+asArr(g.need).join('＋')),
          g.hourOfDay!=null&&('時段 '+JSON.stringify(g.hourOfDay)), g.hour!=null&&('hour '+g.hour)].filter(Boolean).join('、')+'）',
        gate:g, points, atStart:points.some(p=>p.lines[0]===0) }));
    });
    if(date.who.size && innId)
      out.push(base(innId, { id:tid+'.date', kind:'date', actFlag:null,
        title:'約會事件　'+[...date.who].map(w=>WHO_ZH[w]||w).join('・'), enterable:false,
        note:'放到旅店，約誰、走去哪自己來', points:[...date.points.values()], atStart:false }));
  }
  return out;
}
