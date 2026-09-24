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

/* ══ 路線表 ══ 旗 → 它代表哪一條路線的哪一邊。
   `code` 一樣的旗併成同一個分支點；選一邊＝插上「那一邊」的旗、拔掉「另一邊」的旗。
   ⚠ M：兩支旗互斥（M2 的 `until` 就是 M1 的 `need`，town.js 的註解）⇒ 兩支一起擺。
   ⚠ AB／BA：A ＝伊甸古墓那一條、B ＝貝利薩爾→東泊那一條（progress.js 的 14-BA 註解）。
     `belisar_seen`／`ep_belisar_done` ＝ B 已經走過 ⇒ 在 A 的場景裡就是 BA；
     `tomb_done` ＝ A 已經走完 ⇒ 在 B 的場景裡就是 AB。
     一幕裡只動**那一幕真的讀到的**那幾支（加上 `PAIR` 的同伴），不去碰另一條的旗。 */
const ROUTE = {
  ep_m1_route:     { code:'M',   side:'M1' },
  ep_m2_route:     { code:'M',   side:'M2' },
  tomb_h_route:    { code:'H',   side:'H'  },
  belisar_seen:    { code:'ORD', side:'BA' },
  ep_belisar_done: { code:'ORD', side:'BA' },
  tomb_done:       { code:'ORD', side:'AB' },
};
const CODE = {
  M:   { label:'M 路線',     sides:['M1','M2'] },
  H:   { label:'H 路線',     sides:['H','非 H'] },
  ORD: { label:'AB／BA 路線', sides:['AB','BA'] },
};
const PAIR = { ep_m1_route:['ep_m2_route'], ep_m2_route:['ep_m1_route'],
               belisar_seen:['ep_belisar_done'], ep_belisar_done:['belisar_seen'] };
const isRoute = f => !!ROUTE[f];
const other = (code, side) => CODE[code].sides.find(s=>s!==side);

/* 一組路線旗 → 那一條路線兩邊各插什麼、拔什麼。 */
function sidesOf(code, flags){
  const all=new Set();
  for(const f of flags){ all.add(f); for(const g of (PAIR[f]||[])) all.add(g); }
  return CODE[code].sides.map(side=>{
    const add=[], remove=[];
    for(const f of all) (ROUTE[f].side===side ? add : remove).push(f);
    return { label:side, add, remove };
  });
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

/* 一串拍裡的路線分支點（同一條路線併成一點）。 */
function pointsOf(lines){
  const pts=new Map();
  (lines||[]).forEach((ln, li)=>{
    if(!ln || typeof ln!=='object') return;
    for(const f of asArr(ln.onlyIf).concat(asArr(ln.skipIf))){
      if(!isRoute(f)) continue;
      const code=ROUTE[f].code;
      let p=pts.get(code);
      if(!p){ p={ kind:'route', code, label:CODE[code].label, flags:new Set(), lines:[] }; pts.set(code,p); }
      p.flags.add(f); p.lines.push(li);
    }
  });
  return [...pts.values()].map(p=>{ p.variants=sidesOf(p.code,[...p.flags]); p.flags=[...p.flags]; return p; });
}

/* 一個版本（act／onLeave 的一項）落在哪條路線的哪一邊：`need` 裡的路線旗 ＝ 那一邊，
   `until` 裡的 ＝ 另一邊。回 { code:side }。 */
function routeOfVersion(a){
  const r={};
  for(const f of asArr(a.need)) if(isRoute(f)) r[ROUTE[f].code]=ROUTE[f].side;
  for(const f of asArr(a.until)) if(isRoute(f)) r[ROUTE[f].code]=other(ROUTE[f].code, ROUTE[f].side);
  return r;
}
/* 幾個版本併看：只要有一個版本帶了某條路線，沒帶的版本就是另一邊（例：M2 的版本
   `need:'ep_m2_route'`、M1 的版本什麼都沒寫 ⇒ 它是 M1）。 */
function versionRoutes(versions){
  const rs=versions.map(routeOfVersion);
  const codes=new Set(); rs.forEach(r=>Object.keys(r).forEach(c=>codes.add(c)));
  const flagsOf={}; for(const c of codes) flagsOf[c]=new Set();
  versions.forEach(a=>asArr(a.need).concat(asArr(a.until)).forEach(f=>{ if(isRoute(f)) flagsOf[ROUTE[f].code].add(f); }));
  return rs.map(r=>{
    const out={}; const add=[], remove=[];
    for(const c of codes){
      const side = r[c] || (() => {           // 沒寫的那一邊 ＝ 其他版本的反面
        const seen=new Set(rs.map(x=>x[c]).filter(Boolean));
        return seen.size===1 ? other(c,[...seen][0]) : null;
      })();
      if(!side) continue;
      out[c]=side;
      const s=sidesOf(c,[...flagsOf[c]]).find(x=>x.label===side);
      add.push(...s.add); remove.push(...s.remove);
    }
    return { routes:out, add, remove, codes:[...codes] };
  });
}
const routeLabel = routes => Object.keys(routes).map(c=>routes[c]).join('・');

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
        if(v && v.codes.length)
          points.unshift({ kind:'variant', lines:[0],
            label:'整幕分支（'+a.flag+' 共 '+sib.length+' 個版本）',
            variants:[ { label:(routeLabel(v.routes)||'這個版本')+' 版', add:v.add, remove:v.remove } ] });
        push(base(nid, { id:tid+'.'+nid+'.act'+ai, kind:'act', act:a, actIndex:ai, actFlag:a.flag||null,
          title:actTitle(a), enterable:true, points,
          atStart: !!(v && v.codes.length) || points.some(p=>p.lines[0]===0) }));
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
        if(v[0] && v[0].codes.length)
          points.unshift({ kind:'variant', lines:[0], label:'離開時的版本（'+leaves.length+' 個）',
            variants:v.map((x,i)=>({ label:(routeLabel(x.routes)||'版本'+(i+1))+' 版', add:x.add, remove:x.remove })) });
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
