/* 路線模擬器（資料層）：照 modules/town.js 的 actDue／stageGate／onLeave 規則走一趟，印出逐拍文字。
   不是引擎：時鐘、追兵、飛行都是手動注入的步驟。 */
import { TOWNS } from '../script/town.js';
import { CHAPTERS } from '../script/progress.js';
import { SPEAKERS } from '../script/speakers.js';
const arr=v=>v==null?[]:(Array.isArray(v)?v:[v]);
const ROUTE=(typeof arguments!=='undefined'&&arguments[0])||'BAM1';
const AFF=+((typeof arguments!=='undefined'&&arguments[1])||40);
let F=new Set(), aff={renna:AFF,nouvelle:AFF,sorana:AFF,anya:AFF}, stage=0, hour=10, day=1, town=null, node=null, dating=null;
const out=[]; const P=(...a)=>out.push(a.join(''));
const has=f=>F.has(f); const add=fs=>{ for(const f of arr(fs)) if(f&&!F.has(f)){ F.add(f); P('      ＋旗 '+f); } };
const tierOf=v=>Math.min(5,Math.max(1,Math.floor((+v||0)/20)+1));
const nm=sp=>{ const s=SPEAKERS[sp]; return s? (s.name||sp) : (sp||'旁白'); };
const hhmm=()=>('D'+day+' '+String(Math.floor(hour)).padStart(2,'0')+':'+String(Math.round((hour%1)*60)).padStart(2,'0'));
function needOk(n){ return arr(n).every(has); }
function lineOk(l, spOf){
  if(l.onlyIf && !arr(l.onlyIf).some(has)) return false;
  if(l.onlyIfAll && !arr(l.onlyIfAll).every(has)) return false;
  if(l.skipIf && arr(l.skipIf).some(has)) return false;
  const who=(l.tierWho||l.speaker||'').toLowerCase();
  if(l.tierMin!=null && tierOf(aff[who]||0) < l.tierMin) return false;
  if(l.tierMax!=null && tierOf(aff[who]||0) > l.tierMax) return false;
  return true;
}
function setHourNext(h){ if(h<=hour) day++; hour=h; }
function playLines(lines, label){
  let i=0, guard=0;
  while(i<lines.length && guard++<500){
    const l=lines[i]; i++;
    if(!l || typeof l!=='object') continue;
    if(l.label!=null && l.text==null && !l.speaker) continue;
    if(!lineOk(l)) continue;
    if(l.text) P('    '+nm(l.speaker)+(l.portrait&&l.portrait.expr?'('+l.portrait.expr+')':'')+'：'+l.text);
    else if(l.speaker && l.blank) P('    '+nm(l.speaker)+'：（空白）');
    if(l.flags) add(l.flags);
    if(l.aff) for(const k in l.aff){ aff[k]=(aff[k]||0)+l.aff[k]; P('      好感 '+k+' '+(l.aff[k]>0?'+':'')+l.aff[k]+' → '+aff[k]); }
    if(l.affToFloor){ const k=String(l.affToFloor).toLowerCase(); const fl=(tierOf(aff[k])-1)*20; if(aff[k]>fl){ aff[k]=fl; P('      好感 '+k+' 打到地板 '+fl); } }
    if(l.stage!=null && l.stage>stage){ stage=l.stage; P('      章 → '+stage); }
    if(l.battle) P('    〔戰鬥 '+l.battle+'：免戰跳過〕');
    if(l.settle) P('    〔結算〕');
    if(l.dayBreak) P('    〔翌日卡〕');
    if(l.clockToNext!=null){ setHourNext(l.clockToNext); P('      時鐘 → '+hhmm()); }
    if(l.clockToday!=null && l.clockToday>hour){ hour=l.clockToday; P('      時鐘 → '+hhmm()); }
    if(l.choice){ const opts=l.choice; P('    〔選項〕'+opts.map(o=>o.text).join(' / ')+'　→ 選第一個'); const g=opts[0].goto; if(g){ const at=lines.findIndex(x=>x&&x.label===g); if(at>=0) i=at; } continue; }
    if(l.goto){ const at=lines.findIndex(x=>x&&x.label===l.goto); if(at>=0){ i=at; continue; } }
    if(l.end) break;
  }
}
function actHasBattle(a){ return (a.lines||[]).some(l=>l&&l.battle); }
function actDue(T,n,tid){
  for(const a of (n&&n.acts)||[]){
    if(a.sleepFirst) continue;
    if(a.fromStage!=null && stage<a.fromStage) continue;
    if(a.untilStage!=null && stage>=a.untilStage) continue;
    if(a.chaseOnly && !a.__force) continue;
    if(a.flag && has(a.flag)) continue;
    if(!needOk(a.need)) continue;
    if(a.hourOfDay!=null){ const h=hour; if(Array.isArray(a.hourOfDay)){ if(h<a.hourOfDay[0]||h>=a.hourOfDay[1]) continue; } else if(h<a.hourOfDay) continue; }
    if(a.until && has(a.until)) continue;
    if(a.day && day<a.day) continue;
    if(a.needTier){ let ok=true; for(const w in a.needTier) if(tierOf(aff[w]||0)<a.needTier[w]) ok=false; if(!ok) continue; }
    if(a.withWho && dating!==a.withWho) continue;
    if(a.noDate && dating) continue;
    if(actHasBattle(a) && !a.storyBattle && has('safehouse_'+tid)) continue;
    return a;
  }
  return null;
}
function gateDue(T){
  for(const g of arr(T.gates||T.stage1)){
    if(!g) continue;
    if(g.flag && has(g.flag)) continue;
    if(g.skipIf && has(g.skipIf)) continue;
    if(!needOk(g.need)) continue;
    if(g.fromStage!=null && stage<g.fromStage) continue;
    if(g.afterMoves!=null) continue;                 // 步數閘門：這裡不模擬走路
    if(g.hourOfDay!=null){ const h=hour; if(Array.isArray(g.hourOfDay)){ if(h<g.hourOfDay[0]||h>=g.hourOfDay[1]) continue; } else if(h<g.hourOfDay) continue; }
    return g;
  }
  return null;
}
let depth=0;
function arrive(tid, nid, why){
  const T=TOWNS[tid]; const n=T&&T.nodes&&T.nodes[nid];
  if(!n){ P('  ✘ 沒有這一格 '+tid+'/'+nid); return; }
  town=tid; node=nid; hour+=1/6;
  P('  ▶ '+tid+'/'+nid+'（'+(n.name||nid)+'）'+hhmm()+(why?'　←'+why:''));
  if(n.lines && n.lines.length && !has('town_'+tid+'_'+nid) && !(n.expire&&has(n.expire))){ P('   〔進場對白〕'); playLines(n.lines); add('town_'+tid+'_'+nid); }
  let guard=0;
  while(guard++<8){
    const a=actDue(T,n,tid);
    if(a){
      P('   ■ act '+(a.flag||'（無旗）')+(a.chaseOnly?'（追兵帶起）':''));
      playLines(a.lines);
      if(a.flag) add(a.flag);
      if(a.endStoryExplore) add('free_explore_'+tid);
      if(a.storyExplore) F.delete('free_explore_'+tid);
      if(a.safehouse) add('safehouse_'+tid);
      if(a.stage!=null && a.stage>stage){ stage=a.stage; P('      章 → '+stage); }
      if(a.clockToday!=null && a.clockToday>hour){ hour=a.clockToday; P('      時鐘 → '+hhmm()); }
      if(a.goto){ const g=String(a.goto); if(g[0]==='@'){ const [t,nn]=g.slice(1).split(':'); if(depth++<20) arrive(t,nn,'goto'); depth--; return; } else if(g!==nid){ if(depth++<20) arrive(tid,g,'goto'); depth--; return; } }
      if(!a.flag) break;   // 常駐句：演一次就好
      continue;
    }
    const g=gateDue(T);
    if(g){
      P('   ■ 閘門 '+(g.flag||'?'));
      if(g.stage!=null && g.stage>stage){ stage=g.stage; P('      章 → '+stage); }
      if(g.lines) playLines(g.lines);
      if(g.flag) add(g.flag);
      if(g.endStoryExplore) add('free_explore_'+tid);
      if(g.storyExplore) F.delete('free_explore_'+tid);
      if(g.clockTo!=null){ setHourNext(g.clockTo); P('      時鐘 → '+hhmm()); }
      if(g.goto){ const gg=String(g.goto); if(gg[0]==='@'){ const [t,nn]=gg.slice(1).split(':'); if(depth++<20) arrive(t,nn,'閘門 goto'); depth--; return; } if(gg!==nid || g.enterAgain){ if(depth++<20) arrive(tid,gg,'閘門 goto'); depth--; return; } }
      continue;
    }
    break;
  }
}
function sweep(tid){                       // 把這座城所有到期的段落掃一遍（不模擬走路）
  const T=TOWNS[tid]; let did=true, pass=0;
  while(did && pass++<6){ did=false;
    for(const nid of Object.keys(T.nodes)){ const n=T.nodes[nid];
      if(actDue(T,n,tid) || (n.lines&&n.lines.length&&!has('town_'+tid+'_'+nid)&&!(n.expire&&has(n.expire)))){ arrive(tid,nid,'掃'); did=true; }
    }
    if(gateDue(T)){ arrive(tid,node||T.entry||Object.keys(T.nodes)[0],'閘門'); did=true; }
  }
}
function leave(tid,nid){
  const n=TOWNS[tid].nodes[nid]; const lv=arr(n.onLeave).find(a=>a && needOk(a.need) && !(a.until&&has(a.until)) && !(a.flag&&has(a.flag)));
  P('  ◀ 離開 '+tid+'/'+nid+(lv?'　onLeave '+lv.flag:'　（沒有 onLeave）'));
  if(lv){ playLines(lv.lines); if(lv.flag) add(lv.flag); }
}
function knock(tid, who){
  const inn=Object.values(TOWNS[tid].nodes).find(n=>n.inn); const st=inn.innStage1||{}; const K=(st.knock||{})[who];
  P('  ☞ 敲門 '+who+' @'+tid+' '+hhmm());
  if(who==='RENNA' && st.rennaAlt && needOk(st.rennaAlt.need) && !(st.rennaAlt.until&&has(st.rennaAlt.until))){ P('   rennaAlt'); playLines(st.rennaAlt.lines); return; }
  if(!K){ P('   （沒有這個人的敲門表）'); return; }
  if(K.need && !has(K.need)){ P('   needSay：'+(K.needSay||K.low)); return; }
  if((aff[who.toLowerCase()]||0) < 20){ P('   low：'+K.low); return; }
  playLines(K.date); dating=who;
}
function sleep(){ setHourNext(7); dating=null; P('  ☾ 睡覺 → '+hhmm()); }
function force(tid,nid,flag){ const a=TOWNS[tid].nodes[nid].acts.find(x=>x.flag===flag); if(!a){ P('  ✘ 找不到 '+flag); return; } a.__force=true; arrive(tid,nid,'追兵帶起 '+flag); a.__force=false; }
function ch(id){ return CHAPTERS.find(c=>c.id===id); }
/* ── 起始狀態 ── */
if(ROUTE==='AB'){
  const base=ch('stage11a'); for(const f of base.flags) if(!/^(tomb_gate|vn_|lk_|lakestele_found|tomb_opened|free_explore_ravnsdal)$/.test(f) && !/^(vn_|lk_)/.test(f)) F.add(f);   // -1725：底改成 11-A（A 路線的旗），再退回「還沒到墓門」
  stage=9; hour=10; day=1;
}else{ const base=ch('stage12b'); for(const f of base.flags) F.add(f); stage=12; hour=23; day=1; }
P('═══ 路線 '+ROUTE+'　好感 '+AFF+'（T'+tierOf(AFF)+'）　起始旗 '+F.size+' 支');
const H=()=>{ /* 古墓 → 雪都 → 鏡湖 → 古墓內部 → 出墓 */
  arrive('tomb','gate','飛到古墓');
  sweep('ravnsdal'); hour=18; sweep('ravnsdal'); sleep(); sweep('ravnsdal');
  arrive('lake', TOWNS.lake.entry||'shore','飛到鏡湖'); sweep('lake');
  arrive('tomb','gate','飛回古墓'); sweep('tomb');
  force('tomb','hall2','tomb_gk1_done'); sweep('tomb');
  sweep('tomb'); sweep('ravnsdal'); knock('ravnsdal','RENNA');
};
if(ROUTE==='BAM1' || ROUTE==='BAM2'){
  arrive('eastport','inn','空中戰後回旅店'); hour=0.5; arrive('eastport','inn','坐坐跨過午夜');
  if(ROUTE==='BAM1'){ knock('eastport','RENNA'); }
  arrive('eastport','uptown','跟上去'); sweep('eastport');
  leave('eastport','inn'); H();
}else{
  H();
  /* B 路線 */
  add('belisar_noland_talk'); P('  ✈ 飛行：貝利薩爾降不下去 → 蕾娜指東泊');
  arrive('eastport', TOWNS.eastport.entry||'square','飛到東泊'); sweep('eastport'); hour=17; sweep('eastport'); hour=20; sweep('eastport'); sleep(); sweep('eastport');
  arrive('belisar','entrance','飛到古城'); sweep('belisar'); sweep('eastport');
  hour=21; sweep('eastport'); add(['ep_hairpin_hunt','belisar_land_ok','bl_dragon_seen']); P('  ✈ 注入：那一夜追髮飾（飛行旗）');
  arrive('belisar','entrance','夜襲'); sweep('belisar'); add(['bl_sky_hunt','bl_night_sky']); P('  ✈ 注入：空中戰打完'); sweep('belisar'); sweep('eastport');
  hour=0.5; sweep('eastport'); sleep(); sweep('eastport'); leave('eastport','inn');
}
P('═══ 終了　旗 '+F.size+'　好感 '+JSON.stringify(aff)+'　章 '+stage+'　'+hhmm());
print(out.join('\n'));
