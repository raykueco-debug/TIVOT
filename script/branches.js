/* ============================================================================
 *  script/branches.js — 劇情分支點的掃描（ver -1708，Ray：「在首頁做一個分歧檢查，
 *  把所有劇情分支點列表，選擇分支點就從該分支存在的『幕』進場」）
 *  ---------------------------------------------------------------------------
 *  「幕」＝城鎮節點上的一段 `acts`（主線 `mainScript.js` 目前沒有任何分支）。
 *  「分支點」＝一幕裡**同一個條件**影響到的那幾拍（同一支旗的 onlyIf/skipIf 算一個點，
 *  不論它在這一幕裡出現幾次）。條件有四種：
 *    · flag   —— 拍上的 `onlyIf`／`skipIf`（陣列＝任一支，逐支拆開各算一個點）
 *    · tier   —— 拍上的 `tierMin`／`tierMax`（＋`tierWho`，沒寫＝說話的人）與 `textByTier`
 *    · choice —— 選項拍（`choice:[…]`）
 *    · variant—— **同一格、共用同一支 `flag` 的幾個 act**（＝整幕就是分支，進場那一刻就分）
 *  ⚠ 純資料掃描：只讀 `TOWNS`，不碰 DOM、不寫任何狀態（首頁的面板與 `tools/branch_tree.mjs`
 *    都讀這一支 —— 同一份清單只算一次，鐵律 7）。
 * ========================================================================== */
import { TOWNS } from './town.js';

const asArr = v => v==null ? [] : (Array.isArray(v) ? v : [v]);
const WHO = { RENNA:'renna', OFFICER:'renna', NOUVELLE:'nouvelle', SORANA:'sorana', ANYA:'anya' };
const WHO_ZH = { renna:'蕾娜', nouvelle:'諾薇兒', sorana:'索菈娜', anya:'安雅' };

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

/* 一串拍裡的分支點（同一個條件併成一點）。 */
function pointsOf(lines){
  const pts=new Map();
  const add=(key, mk, idx)=>{ let p=pts.get(key); if(!p){ p=mk(); p.lines=[]; pts.set(key,p); } p.lines.push(idx); return p; };
  const tierPt=(who,li)=>add('tier:'+who, ()=>({ kind:'tier', who, cuts:new Set(), label:(WHO_ZH[who]||who)+' 好感段位' }), li);
  (lines||[]).forEach((ln, li)=>{
    if(!ln || typeof ln!=='object') return;
    for(const f of asArr(ln.onlyIf).concat(asArr(ln.skipIf)))
      add('flag:'+f, ()=>({ kind:'flag', flag:f, label:'旗 '+f,
        variants:[ { label:'有 '+f, add:[f] }, { label:'無 '+f, remove:[f] } ] }), li);
    if(ln.tierMin!=null || ln.tierMax!=null){
      const p=tierPt(WHO[ln.tierWho || ln.speaker] || String(ln.tierWho||ln.speaker||'').toLowerCase(), li);
      if(ln.tierMin!=null) p.cuts.add(+ln.tierMin);
      if(ln.tierMax!=null) p.cuts.add(+ln.tierMax+1);
    }
    if(ln.textByTier){
      const p=tierPt(WHO[ln.speaker] || String(ln.speaker||'').toLowerCase(), li);
      for(const k of Object.keys(ln.textByTier)) if(+k>1) p.cuts.add(+k);
    }
    if(ln.choice)
      add('choice:'+li, ()=>({ kind:'choice', label:'選項：'+ln.choice.map(c=>c.text).join('／'),
        variants:[ { label:'從這一幕進場（選項進去之後自己選）' } ] }), li);
  });
  return [...pts.values()].map(p=>{
    if(p.kind==='tier'){
      const cuts=[...p.cuts].filter(c=>c>1&&c<=5).sort((x,y)=>x-y);
      const bands=[]; let lo=1;
      for(const c of cuts){ bands.push([lo,c-1]); lo=c; }
      bands.push([lo,5]);
      p.variants=bands.map(([a,b])=>({ label:'T'+a+(b>a?'~T'+b:''), tier:{ who:p.who, t:a } }));
      delete p.cuts;
    }
    return p;
  });
}

/* 回 [{ id, kind, town, townName, node, nodeName, act?, actFlag, title, atStart, enterable, note, points:[…] }]
   `kind`：'act'（節點的段落，進場時直接演它）／'arrive'（進場對白，拔旗後走進去）／
   'gate'（時鐘閘門）／'knock'（旅店敲門的邀約）／'talk'（店主／挑戰那一類對話）——
   後三種**沒辦法直接演**，進場＝把條件擺好、人放到那一格，觸發交給玩家（`note` 寫怎麼觸發）。 */
export function scanBranches(){
  const out=[];
  const push=(o)=>{ if(o.points.length) out.push(o); };
  for(const [tid, T] of Object.entries(TOWNS||{})){
    const nodes=T.nodes||{};
    const base=(nid, extra)=>Object.assign({ town:tid, townName:T.name||tid, node:nid,
      nodeName:((nodes[nid]||{}).name||nid) }, extra);
    for(const [nid, n] of Object.entries(nodes)){
      const acts = n.acts||[];
      const byFlag={};
      acts.forEach((a,i)=>{ if(a && a.flag) (byFlag[a.flag]=byFlag[a.flag]||[]).push(i); });
      acts.forEach((a, ai)=>{
        if(!a || !a.lines) return;
        const points=pointsOf(a.lines);
        const sib=byFlag[a.flag]||[];
        if(sib.length>1)
          points.unshift({ kind:'variant', lines:[0],
            label:'整幕分支（'+a.flag+' 共 '+sib.length+' 個版本）',
            variants:[ { label:'這個版本（'+[
              a.need && ('need '+asArr(a.need).join('＋')),
              a.until && ('until '+a.until),
              a.needTier && ('段位 '+Object.entries(a.needTier).map(([w,t])=>(WHO_ZH[w]||w)+'T'+t).join('＋')),
              a.fromStage!=null && ('S'+a.fromStage+'起'),
              a.untilStage!=null && ('S'+a.untilStage+'止'),
              a.hourOfDay!=null && ('時段 '+JSON.stringify(a.hourOfDay)),
            ].filter(Boolean).join('／')+'）' } ] });
        push(base(nid, { id:tid+'.'+nid+'.act'+ai, kind:'act', act:a, actIndex:ai, actFlag:a.flag||null,
          title:actTitle(a), enterable:true, points,
          atStart: sib.length>1 || points.some(p=>p.lines[0]===0) }));
      });
      if(n.lines) push(base(nid, { id:tid+'.'+nid+'.arrive', kind:'arrive', actFlag:null,
        title:'進場對白　'+actTitle({lines:n.lines}), enterable:true, points:pointsOf(n.lines),
        atStart:false }));
      for(const k of ['keeper','challengeLines']) if(Array.isArray(n[k]))
        push(base(nid, { id:tid+'.'+nid+'.'+k, kind:'talk', actFlag:null,
          title:(k==='keeper'?'店主對話':'挑戰對話')+'　'+actTitle({lines:n[k]}), enterable:false,
          note:'放到這一格，自己去跟店主／挑戰那一邊對話', points:pointsOf(n[k]), atStart:false }));
      const knock=(n.innStage1||{}).knock||{};
      for(const [who, kn] of Object.entries(knock)) if(kn && Array.isArray(kn.date))
        push(base(nid, { id:tid+'.'+nid+'.knock.'+who, kind:'knock', actFlag:null,
          title:'敲門邀約　'+(WHO_ZH[WHO[who]]||who), enterable:false,
          note:'放到旅店，自己去敲 '+(WHO_ZH[WHO[who]]||who)+' 的門', points:pointsOf(kn.date), atStart:false }));
    }
    (T.gates||[]).forEach((g, gi)=>{
      if(!g || !g.lines) return;
      const nid = (g.goto && String(g.goto).indexOf('@')<0) ? g.goto : (T.entry||Object.keys(nodes)[0]);
      push(base(nid, { id:tid+'.gate'+gi, kind:'gate', actFlag:g.flag||null,
        title:'閘門 '+(g.flag||gi)+'　'+actTitle(g), enterable:false,
        note:'時鐘閘門：放到這座城，條件到了自己觸發（'+[g.need&&('need '+asArr(g.need).join('＋')),
          g.hourOfDay!=null&&('時段 '+JSON.stringify(g.hourOfDay)), g.hour!=null&&('hour '+g.hour)].filter(Boolean).join('、')+'）',
        gate:g, points:pointsOf(g.lines), atStart:pointsOf(g.lines).some(p=>p.lines[0]===0) }));
    });
  }
  return out;
}
