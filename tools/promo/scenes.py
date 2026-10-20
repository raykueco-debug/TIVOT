# 宣傳片的各個錄影場景。
#   setup：即時（非虛擬時間）跑一次的開場 JS（可 await）
#   bot  ：每一格跑一次的 JS 函式 (i)=>[{x,y}|{stop:1}]，回傳要點擊的位置（CSS 像素）
#   secs ：預設錄幾秒；settle：setup 之後先等幾毫秒（即時）再開始錄

PRELUDE = r"""
const P = window.__promo;
P.S = (await import('./state.js')).state;
P.state = await import('./state.js');
P.combat = await import('./modules/combat.js');
P.saint = await import('./modules/saint.js');
P.weapon = await import('./modules/weapon.js');
P.partner = await import('./modules/partner.js');
P.D = await import('./modules/defense.js');
P.enemy = await import('./modules/enemy.js');
// 等第一盤真的擺好（跳過開場的 RELOADING 黑盤面）再開錄
P.boardReady = async () => { for(let k=0;k<200;k++){ if(document.querySelectorAll('#grid .cell').length && !P.S.transitioning && !P.S.cutinPlaying) return; await P.sleep(50); } };
// 群體敵人：把血設到「再打一兩發就倒一隻」
P.nearKnock = each => { P.S.enemyHp = Math.floor((P.S.enemyHp - 1) / each) * each + 4; };
// 一次丟 n 個圈（照卡上的出招流程 spawnWave，只是臨時改數量／間隔）
P.rings = (n, gapMs) => { const s=P.S.ASSAULT_SHOTS, g=P.S.ASSAULT_GAP_MS; P.S.ASSAULT_SHOTS=n; P.S.ASSAULT_GAP_MS=gapMs||0; P.D.startCharge(); P.S.ASSAULT_SHOTS=s; P.S.ASSAULT_GAP_MS=g; };
P.cfgMod = await import('./config.js');
// 搭檔：寫在這一場的戰鬥卡上（startGame 挑搭檔的第一優先；只改這個瀏覽器裡的記憶體）
P.withPartner = (battle, who) => { P.cfgMod.GAME_CONFIG.battles[battle].partner = who; };
P.sleep = ms => new Promise(r=>setTimeout(r, ms));
P.chapter = async (id, sub) => {            // 借管理人的「章節」跳關：id＝CHAPTERS 的 id；第二層 sub：'無'＝無劇情、'演'＝演劇情
  const CH = (await import('./script/progress.js')).CHAPTERS;
  document.getElementById('chapterBtn').click(); await P.sleep(450);
  document.querySelectorAll('#chapterSheet .ch-row')[CH.findIndex(c=>c.id===id)].click(); await P.sleep(500);
  if(sub){ const b=[...document.querySelectorAll('#chapterSheet .ch-row')].find(e=>e.textContent.replace(/\s/g,'').includes(sub)); b.click(); await P.sleep(500); }
};
P.visible = sel => { const e=document.querySelector(sel); return e && e.offsetParent!==null && getComputedStyle(e).visibility!=='hidden' ? e : null; };
P.center = el => { const r = el.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; };
"""

# 戰鬥自動打：照順序點盤面、紅圈一律點在完美反擊帶、條件到了就發動聖徒化與雙槍
BATTLE_BOT = r"""
(i)=>{
  const P = window.__promo, S = P.S, out = [];
  if(S.over){ if(P.overAt==null) P.overAt = i; if(i - P.overAt > (P.tail||300)) out.push({stop:1}); return out; }
  // 戰鬥中的對白：每 1 秒點一下推進（引導閘門不點）
  const tt = P.visible('#tutTouch');
  if(tt && !P.visible('#tutGuide')){ if(i >= (P.talkTap||0)){ P.talkTap = i + 60; out.push(P.center(tt)); } return out; }
  for(const th of (P.cfg && P.cfg.noCounter) ? [] : S.threats){
    if(th.__hit) continue;
    const ratio = (S.CHARGE_SECONDS - (Date.now()-th.t0)/1000) / S.CHARGE_SECONDS;
    if(ratio < 0.085 && ratio > 0){ th.__hit = 1; out.push(P.center(th.el)); }
  }
  if(out.length) return out;
  if(S.cutinPlaying || S.transitioning) return out;
  const cfg = P.cfg || {};
  P.k = (P.k||0) + 1;
  if(cfg.hpAt != null && !P.hpDone && i >= cfg.hpAt){ P.hpDone = 1; S.playerHp = Math.min(S.playerHp, cfg.hpTo||5); }
  // 獄門天鎖：與遊戲受到致命傷時呼叫的是同一支（partner.tryDeathGuard）
  if(cfg.guardAt != null && !P.guardDone && i >= cfg.guardAt && !S.cutinPlaying){ P.guardDone = 1; S.playerHp = 1; P.partner.tryDeathGuard(); return out; }
  // 搭檔主動技：一般盤面（activeAt＝第幾格起）／聖徒化中（activeInSaint＝進聖徒化後第幾格）
  if(cfg.activeAt != null && !P.activeDone && !S.saintMode && !S.niMode && P.k >= cfg.activeAt){ P.activeDone = 1; P.partner.tryActive('board'); return out; }
  if(S.saintMode || S.niMode){ P.inSaint = (P.inSaint||0) + 1; } else P.inSaint = 0;
  if(cfg.activeInSaint != null && !P.activeDone && S.saintMode && P.inSaint >= cfg.activeInSaint){ P.activeDone = 1; P.partner.tryActive('saint'); return out; }
  if(cfg.burstAfter != null && !P.burstDone && S.niMode && P.inSaint >= cfg.burstAfter){ P.burstDone = 1; P.saint.nightmareActive(); return out; }
  if(cfg.saintAt != null && !S.saintUsedThisBattle && !S.saintMode && !S.niMode && !S.dualWield
     && S.enemyHp < S.enemyMax*cfg.saintAt && !S.threats.length && P.k >= (cfg.saintFrom||0)){ P.saint.activateSaint('right'); return out; }
  if(cfg.dual && S.energy >= 100 && !S.saintMode && !S.dualWield && !S.threats.length){ P.weapon.activateDual(); return out; }
  if(i < (P.nextTap||0)) return out;
  const cell = [...document.querySelectorAll('#grid .cell')].find(e => e.textContent.trim() === String(S.expect));
  if(cell){
    const c = P.center(cell);
    out.push({x:c.x + (Math.random()-.5)*24, y:c.y + (Math.random()-.5)*24});
    const gap = S.saintMode ? (cfg.saintGap||7) : (cfg.gap||9);
    P.nextTap = i + gap + Math.floor(Math.random()*4);
  }
  return out;
}
"""

# 城鎮漫步：每隔一段按住方向鍵走一步（照 route 走，沒寫就隨機、不走回頭路）
TOWN_BOT = r"""
(i)=>{
  const P = window.__promo, cfg = P.cfg || {}, out = [];
  const card = P.visible('#storyCardCatch');
  if(card && i > (P.cardAt||0)){ P.cardAt = i + 40; out.push({x:216, y:300}); return out; }
  if(P.hold){ if(i >= P.hold.until){ out.push({key:P.hold.k, type:'keyUp'}); P.hold = null; P.wait = i + (cfg.dwell||80); } return out; }
  if(i < (P.wait || cfg.start || 50)) return out;
  if((P.steps||0) >= (cfg.maxSteps||99)) return out;
  const btns = [...document.querySelectorAll('#townNav .town-dest.on')].filter(e=>e.offsetParent);
  const dirs = btns.map(b=>['up','down','left','right'].find(d=>b.classList.contains(d))).filter(Boolean);
  if(!dirs.length) return out;
  let d = cfg.route && cfg.route[P.steps||0];
  if(!d || dirs.indexOf(d)<0){ const nb = dirs.filter(x=>x!==P.back); const pool = nb.length ? nb : dirs; d = pool[Math.floor(Math.random()*pool.length)]; }
  const k = {up:'w',down:'s',left:'a',right:'d'}[d];
  P.back = {up:'down',down:'up',left:'right',right:'left'}[d]; P.steps = (P.steps||0)+1;
  P.hold = {k, until: i + 40}; out.push({key:k, type:'keyDown'});
  return out;
}
"""

# 劇情：每隔一段點一下畫面推進（打完字再停一拍）
STORY_BOT = r"""
(i)=>{
  const P = window.__promo, cfg = P.cfg || {}, out = [];
  if(i < (P.next || cfg.start || 90)) return out;
  out.push({x:216, y:240}); P.next = i + (cfg.every || 130);
  return out;
}
"""

# 飛行：讀取頁點掉 → 按住 W 一路往前，每隔一段按 A／D 轉個彎
FLIGHT_BOT = r"""
(i)=>{
  const P = window.__promo, cfg = P.cfg || {}, out = [];
  const f = document.getElementById('flightFrame'), w = f && f.contentWindow, d = w && w.document;
  if(!d || !d.body) return out;
  const boot = d.getElementById('boot');
  const booting = boot && getComputedStyle(boot).display!=='none' && +getComputedStyle(boot).opacity > 0.3;
  if(booting){ if(i % 45 === 0) out.push({x:216, y:560}); return out; }
  if(P.flyAt == null){ P.flyAt = i + (cfg.idle||60); }
  if(i < P.flyAt) return out;
  if(!P.go){ P.go = 1; try{ f.focus(); w.focus(); }catch(_){} out.push({key:'w', type:'keyDown'}); return out; }
  const turns = cfg.turns || [];
  for(const t of turns){
    const a = P.flyAt + t[0];
    if(i === a) out.push({key:t[1], type:'keyDown'});
    if(i === a + t[2]) out.push({key:t[1], type:'keyUp'});
  }
  return out;
}
"""

# 依格數觸發事件（ver -2224）：P.ev＝[{f:第幾格, when:()=>條件（可省）, fn}]，到格數且條件成立就跑一次，其餘照 BATTLE_BOT 打
EVENT_BOT = "(i)=>{ const P=window.__promo; for(const e of (P.ev||[])){ if(!e.done && i>=e.f && (!e.when||e.when())){ e.done=1; try{ e.fn(); }catch(err){ return [{err:String(err)}]; } } } return (" + BATTLE_BOT + ")(i); }"

# 飛行：讀取頁點掉 → 升空過場照播 → 升空完：按住 W 往前 lead 格 → 再加按 D（邊前進邊往右轉）turn 格 → 放開、停錄（不加速）
FLY_RIGHT_BOT = r"""
(i)=>{
  const P = window.__promo, cfg = P.cfg || {}, out = [];
  const f = document.getElementById('flightFrame'), w = f && f.contentWindow, d = w && w.document;
  if(!d || !d.body) return out;
  const boot = d.getElementById('boot');
  const booting = boot && getComputedStyle(boot).display!=='none' && +getComputedStyle(boot).opacity > 0.3;
  if(booting){ if(i % 45 === 0) out.push({x:216, y:560}); return out; }
  let tk = true; try{ tk = w.eval('takeoffPlaying'); }catch(_){}
  if(cfg.debug && !P.wrapped){ try{ const u=w.update; if(typeof u==='function'){ w.__uN=0; w.__uDt=0; w.update=function(dt,now){ w.__uN++; w.__uDt+=dt; return u.apply(this,arguments); }; P.wrapped=1; } }catch(e){ console.error('[dbg] wrap '+e); } }
  if(cfg.debug && i % 30 === 0){ try{ console.error('[dbg2] i='+i+' updN='+w.__uN+' dtSum='+(w.__uDt||0).toFixed(0)); w.__uN=0; w.__uDt=0; }catch(e){} }
  if(cfg.debug && i % 30 === 0){ try{ console.error('[dbg] i='+i+' top='+performance.now().toFixed(0)+' fl='+w.performance.now().toFixed(0)+' spd='+w.eval('cam.speed').toFixed(2)+' boost='+w.eval('SPD_BOOST')+' x='+w.eval('cam.x').toFixed(1)+' y='+w.eval('cam.y').toFixed(1)); }catch(e){ console.error('[dbg] '+e); } }
  // Ray 10-18：升空後不等、馬上前進 —— 升空過場一開始就踩住 w，過場一結束船就走
  if(tk && !P.wDown){ P.sawTk = 1; P.wDown = 1; try{ f.focus(); w.focus(); }catch(_){} out.push({key:'w', type:'keyDown'}); return out; }
  if(P.t0 == null){ if(tk) return out; if(!P.sawTk && i < 600) return out; P.t0 = i; if(!P.wDown){ P.wDown = 1; out.push({key:'w', type:'keyDown'}); } return out; }
  const k = i - P.t0;
  // 方向盤持續微往右（比例舵量，不是 d 鍵的滿舵＝坦克式原地轉）—— 直接寫飛行頁的拖曳舵量 rgt
  if(k >= (cfg.lead||0) && k < cfg.run){ try{ w.eval('rgt=' + (cfg.steer||0.2)); }catch(_){} }
  if(k === cfg.run){ try{ w.eval('rgt=0'); }catch(_){} out.push({key:'w', type:'keyUp'}); }
  if(k >= cfg.run + 2) out.push({stop:1});
  return out;
}
"""

# 對白：前段（旅店）快點過去；看到 cfg.from 那一句起照字數給閱讀時間再點（Ray 10-18：第一章出航前的港口對話）
PACED_TALK_BOT = r"""
(i)=>{
  const P = window.__promo, cfg = P.cfg || {}, out = [];
  if(i < (cfg.start || 90)) return out;
  const b = document.getElementById('storyBubble');
  const txt = b ? (b.innerText || '').trim() : '';
  if(!P.on && txt.includes(cfg.from)) { P.on = 1; P.onAt = i; console.error('[promo] from-frame '+i); }
  if(!P.on){ if(i % 24 === 0) out.push({x:216, y:240}); return out; }
  if(txt !== P.last){ P.last = txt; P.lineAt = i; P.tapTxt = null; }
  // 點下去若只是把字補完（同一句還在）→ 隔幾格再點一次才換句
  if(P.tapTxt != null && txt === P.tapTxt && i - P.tapAt >= 4){ out.push({x:216, y:240}); P.tapAt = i; return out; }
  const need = (cfg.base || 70) + txt.length * (cfg.perChar || 0);
  if(P.tapTxt == null && i - P.lineAt >= need){ out.push({x:216, y:240}); P.tapAt = i; P.tapTxt = txt; }
  return out;
}
"""

# 挑戰試玩版追蹤（ver -2225）：BATTLE_BOT ＋ 教學閘門（→／↑ 方向鍵、點計量表）＋ 結算頁的按鈕（迎擊／繼續）
# ⚠ 對話層 #tutTouch／引導 #tutGuide 是 position:fixed —— offsetParent 一律是 null，P.visible 判不到，改看 'on' class
TRACE_BOT = "(i)=>{ const P=window.__promo, S=P.S; " + \
  "const on=id=>{ const e=document.getElementById(id); return e && e.classList.contains('on') ? e : null; }; " + \
  "const g=on('tutGuide'); if(g && i>(P.gateAt||0)){ P.gateAt=i+90; " + \
  "  if(g.className.indexOf('g-right')>=0) return [{key:'ArrowRight',type:'keyDown'},{key:'ArrowRight',type:'keyUp'}]; " + \
  "  if(g.className.indexOf('g-up')>=0) return [{key:'ArrowUp',type:'keyDown'},{key:'ArrowUp',type:'keyUp'}]; " + \
  "  const c=document.getElementById('energyClasp'); if(c) return [P.center(c)]; } " + \
  "if(!g && on('tutTouch')){ if(i>=(P.talkTap||0)){ P.talkTap=i+50; return [{x:216,y:520}]; } return []; } " + \
  "if(S.over){ const b=P.visible('#rematchBtn'); if(b && i>(P.btnAt||0) && (S.resultMode==='intercept'||S.resultMode==='tutorial-home'||S.resultMode==='sentou-offer')){ P.btnAt=i+240; P.overAt=null; return [P.center(b)]; } } " + \
  "return (" + BATTLE_BOT + ")(i); }"

SCENES = {
  # 從帝都起飛：升空過場 → 往前 0.5 秒 → 往右前轉彎航行 3 秒（遊戲原速、不加速、免戰）
  'flycap': {
    'storage': "localStorage.setItem('tivot_flight_peace_v1','1');" + ("localStorage.setItem('promo_debug','1');" if __import__('os').environ.get('PROMO_DEBUG') else ''),
    'setup': r"""
      document.getElementById('flightBtn').click();
      P.cfg = { lead:0, steer:0.2, run:300, debug: !!localStorage.getItem('promo_debug') };   // Ray 10-18：升空馬上前進，方向盤持續微往右
    """,
    'settle': 800, 'bot': FLY_RIGHT_BOT, 'secs': 40,
  },
  # ── 10-18 PV 追加（Ray）──────────────────────────────────────────────
  # 鹿主 10 秒：開頭鹿主攻擊 → 射擊、反擊 → 第 6 秒共鬥（索菈娜「獵手的共鬥」）→ 鹿主丟 6 個圈被共鬥射掉 → 持續攻擊
  'deer10': {
    'setup': r"""
      P.withPartner('sf_deer_nightmare', 'sorana');
      P.cfg = { gap:9 }; P.tail = 600;
      P.combat.startScriptBattle('sf_deer_nightmare', {story:true});
      await P.boardReady(); P.D.resetEnemyTimers(); P.S.energy = 100;
      P.ev = [
        { f:2,   fn:()=>P.rings(2, 350) },                                            // 開頭：鹿主攻擊
        { f:360, fn:()=>P.saint.activateSaint('right') },                             // 第 6 秒：共鬥
        { f:370, when:()=>P.S.coopMode && !P.S.cutinPlaying, fn:()=>P.rings(6, 70) }, // 共鬥開了、CI 播完 → 丟 6 個圈
      ];
    """,
    'settle': 0, 'bot': EVENT_BOT, 'secs': 10,
  },
  # 米夏 10 秒（背景廢都祭壇，諾薇兒）：開頭發動獄門天鎖 → 射擊、反擊 → 第 6 秒聖徒化、持續攻擊 → 第 8 秒魂之歸所
  'misha10': {
    'setup': r"""
      P.withPartner('test_misha', 'nouvelle');
      P.cfg = { gap:9, saintGap:6 }; P.tail = 600;
      P.S.battleBg = 'dunmor_altar_lit';   // Ray 10-18：羅賽爾廢城主祭壇（紫紅天空；米夏戰在祭壇點亮之後）
      P.combat.startScriptBattle('test_misha', {story:true});
      await P.boardReady();
      /* Ray 10-18「為什麼 DG 變成靜態圖」：CI 影片是低優先預熱的，開場第 2 格就發動時還沒暖好 → 退回靜態圖。
         等諾薇兒那幾支動檔都 ready 再開始（最多 12 秒），再重排敵人的出招。 */
      for(let t=0; t<120; t++){ const k=P.saint.ciWarmState().keys, ks=Object.keys(k).filter(x=>/nouvelle/.test(x));
        if(ks.length && ks.every(x=>/ready/.test(k[x]))) break; await P.sleep(100); }
      console.error('[promo] ci '+JSON.stringify(P.saint.ciWarmState().keys));
      P.D.resetEnemyTimers();
      P.ev = [
        { f:2,   fn:()=>{ P.S.playerHp = 1; P.partner.tryDeathGuard(); } },                                  // 開頭：獄門天鎖
        { f:90,  when:()=>!P.S.cutinPlaying && !P.S.transitioning, fn:()=>P.rings(2, 500) },                // CI 播完：米夏出招（給玩家反擊）
        { f:300, when:()=>!P.S.cutinPlaying && !P.S.transitioning && !P.S.threats.length, fn:()=>P.rings(2, 500) },   // 中段再出招一次（Ray：不要聖徒化）
        { f:480, when:()=>!P.S.cutinPlaying && !P.S.transitioning, fn:()=>P.partner.tryActive('board') },  // 結尾：魂之歸所（一般盤面那一半）—— Ray：CI 要播完，超時一點沒關係
      ];
    """,
    'settle': 0, 'bot': EVENT_BOT, 'secs': 12,
  },
  # 帝都衛士 2 秒：其間擊倒一隻 → 第 2 秒發動「獵手的智慧」（索菈娜主動技）—— CI 播完多錄一點
  'guard2': {
    'setup': r"""
      P.withPartner('cap_guard_square', 'sorana');   // Ray 10-18：背景選廣場
      P.cfg = { gap:7 }; P.tail = 600;
      P.combat.startScriptBattle('cap_guard_square', {story:true});
      await P.boardReady(); P.D.resetEnemyTimers();
      P.ev = [
        { f:30,  fn:()=>P.nearKnock(100) },                // 衛士一人 100 血：再打兩發就倒一個
        { f:120, when:()=>!P.S.transitioning && !P.S.cutinPlaying && !P.S.threats.length, fn:()=>P.partner.tryActive('board') },    // 第 2 秒（盤面換彈中就等它擺好）：獵手的智慧
      ];
    """,
    'settle': 0, 'bot': EVENT_BOT, 'secs': 4.5,
  },
  # 夢境卡耶爾 禍魘大軍 2 秒（後排大型＝石棺甲蟲）：其間擊倒一隻 → 第 2 秒賽西莉聖徒化 —— CI 播完多錄一點
  'dream2': {
    'setup': r"""
      P.cfg = { gap:7 }; P.tail = 600;
      P.S.battleBg = 'canyon_corridor_day';   // Ray 10-18：背景選卡耶爾山谷（風蝕迴廊）
      P.combat.startScriptBattle('frag02_w_mix2', {story:true});
      await P.boardReady(); P.D.resetEnemyTimers();
      P.ev = [
        { f:30,  fn:()=>P.nearKnock(55) },                 // 220 血 4 隻：一隻 55
        { f:120, when:()=>!P.S.transitioning && !P.S.cutinPlaying, fn:()=>P.saint.activateSaint('right') },  // 第 2 秒：賽西莉 SI
      ];
    """,
    'settle': 0, 'bot': EVENT_BOT, 'secs': 5,
  },

  # 米夏戰（賽西莉搭檔）：一般盤面 → 完美反擊 → 聖徒化 → 擊殺
  'misha': {
    'setup': r"""
      P.withPartner('test_misha', 'cecilie');
      P.cfg = { saintAt:0.72, dual:true, gap:9, saintGap:6 };
      P.tail = 360;
      P.S.battleBg = 'holyseedungeonwhole';
      P.combat.startScriptBattle('test_misha');
    """,
    'settle': 300,
    'bot': BATTLE_BOT,
    'secs': 90,
  },
  # 夏爾村：索菈娜的家（旅店大廳）出門逛村子
  'town': {
    'setup': r"""
      await P.chapter('stage8', '無');
      P.cfg = { start:90, dwell:75, maxSteps:30 };
    """,
    'settle': 2500, 'bot': TOWN_BOT, 'secs': 40,
  },
  # 主線開頭：地宮 → 對白、插圖
  'story': {
    'setup': r"""
      await P.chapter('stage0');
      P.cfg = { start:120, every:150 };
    """,
    'settle': 500, 'bot': STORY_BOT, 'secs': 70,
  },
  # 飛行：試飛章節（12:00）
  'flight': {
    'setup': r"""
      document.getElementById('flightBtn').click();
      P.cfg = { idle:90, turns:[[600,'a',90],[1300,'d',140],[2000,'a',70]] };
    """,
    'settle': 800, 'bot': FLIGHT_BOT, 'secs': 50,
  },
  # 崩岩巨像（禍魘 Boss，打得贏）：拍聖徒化收尾的 EXECUTE／淨化
  'colossus': {
    'setup': r"""
      P.withPartner('frag02_b', 'cecilie');
      P.cfg = { saintAt:0.42, dual:true, gap:9, saintGap:6 };
      P.tail = 420;
      P.S.battleBg = 'canyon_altar_day';
      P.combat.startScriptBattle('frag02_b');
    """,
    'settle': 300, 'bot': BATTLE_BOT, 'secs': 90,
  },
  # 米夏的 NI：開打後把血壓低，幾次反擊就掉到 1 → 發動 NIGHTMARE INSTALL → 劇情殺
  'misha_ni': {
    'setup': r"""
      P.withPartner('test_misha', 'cecilie');
      P.cfg = { dual:true, gap:9, saintGap:6 };
      P.tail = 300;
      P.S.battleBg = 'holyseedungeonwhole';
      P.combat.startScriptBattle('test_misha');
      await P.sleep(2500);
      P.S.enemyHp = Math.min(P.S.enemyHp, 70);
    """,
    'settle': 0, 'bot': BATTLE_BOT, 'secs': 45,
  },
  # 各搭檔的 CI 與語音（宣傳片的戰鬥快剪用）
  'nou': {
    'setup': r"""
      P.withPartner('test_misha', 'nouvelle');
      P.cfg = { saintAt:9, saintFrom:150, activeInSaint:200, dual:false, gap:9, saintGap:6 };
      P.tail = 120; P.S.battleBg = 'holyseedungeonwhole';
      P.combat.startScriptBattle('test_misha');
    """,
    'settle': 300, 'bot': BATTLE_BOT, 'secs': 30,
  },
  'anya': {
    'setup': r"""
      P.withPartner('test_misha', 'anya');
      P.cfg = { saintAt:9, saintFrom:150, burstAfter:300, dual:false, gap:9, saintGap:6 };
      P.tail = 120; P.S.battleBg = 'canyon_bones_dusk';
      P.combat.startScriptBattle('test_misha');
    """,
    'settle': 300, 'bot': BATTLE_BOT, 'secs': 30,
  },
  'sorana': {
    'setup': r"""
      P.withPartner('test_misha', 'sorana');
      P.cfg = { activeAt:120, saintAt:9, saintFrom:500, dual:false, gap:9, saintGap:6 };
      P.tail = 120; P.S.battleBg = 'canyon_altar_night';
      P.combat.startScriptBattle('test_misha');
    """,
    'settle': 300, 'bot': BATTLE_BOT, 'secs': 30,
  },
  # 單錄一張 CI（Ray 10-20：「edt 中的 nireload 跟 nouvelle saint v1 換成遊戲中的畫面 要有技能字樣」）
  #   開打、壓住敵人出手，第 60 格（1 秒）走遊戲本身的觸發：諾薇兒＝聖徒化降臨、安雅＝首次反擊的明晰之夢。
  'ci_nou': {
    'setup': r"""
      P.withPartner('test_misha', 'nouvelle');
      P.S.battleBg = 'holyseedungeonwhole';
      P.combat.startScriptBattle('test_misha');
      await P.boardReady();
    """,
    'settle': 300,
    'bot': "(i)=>{ const P=window.__promo; P.S.enemyAtkSuppressUntil=Date.now()+60000; if(i===58) P.S.playerHp=Math.ceil(P.S.playerMax*0.3); if(i===60) P.saint.activateSaint('right'); return []; }",   # 血壓低：滿血發動倒數槽一推就滿＝立刻 OBE
    'secs': 4.5,
  },
  'ci_anya': {
    'setup': r"""
      P.withPartner('test_misha', 'anya');
      P.S.battleBg = 'canyon_bones_dusk';
      P.combat.startScriptBattle('test_misha');
      await P.boardReady();
    """,
    'settle': 300,
    'bot': "(i)=>{ const P=window.__promo; P.S.enemyAtkSuppressUntil=Date.now()+60000; if(i===60) P.partner.onCounter(); return []; }",
    'secs': 4.5,
  },
  # 只渲染 CI 的技能字樣（透明底），疊回 CI 動畫原檔用（Ray 10-20：「只要技能動畫跟技能名有出就好」）
  #   字串從環境變數 PROMO_LABEL 帶（遊戲 playCutin 的 label 同格式：主字<span class="cutin-en">副標</span>）
  'ci_label': {
    'setup': r"""
      const st=document.createElement('style');
      st.textContent='*{visibility:hidden!important;animation:none!important;transition:none!important}'
        +'html{background:'+(__BG__)+'!important;visibility:visible!important}body,#app{background:transparent!important}'
        +'#cutin,#cutin *{visibility:visible!important}'
        +'#cutin{display:block!important;background:transparent!important;opacity:1!important}'
        +'#cutin::before,#cutin::after{display:none!important}'
        +'#cutinImg,#cutin .ci-vid,#cutin canvas,#cutin video,#cutinStreak{display:none!important}'
        +'#cutinText{opacity:1!important}';
      document.head.appendChild(st);
      document.getElementById('cutinText').innerHTML = __LABEL__;
    """.replace('__LABEL__', __import__('json').dumps(__import__('os').environ.get('PROMO_LABEL', ''))).replace('__BG__', __import__('json').dumps(__import__('os').environ.get('PROMO_BG', '#000'))),   # 黑白各渲一次再反推 alpha（截圖拿不到真透明）
    'settle': 500, 'secs': 0.1, 'alpha': True,
  },
  # 鹿主戰（櫻花狂亂）
  'deer': {
    'setup': r"""
      P.withPartner('sf_deer_nightmare', 'nouvelle');
      P.cfg = { saintAt:0.45, dual:true, gap:9, saintGap:6 };
      P.tail = 120;
      P.combat.startScriptBattle('sf_deer_nightmare');
    """,
    'settle': 300, 'bot': BATTLE_BOT, 'secs': 40,
  },
  # 愛里歐戰（碼頭、六角護罩）
  'mage': {
    'setup': r"""
      P.withPartner('cap_mage', 'nouvelle');
      P.cfg = { dual:true, gap:9, saintGap:6 };
      P.tail = 120;
      P.combat.startScriptBattle('cap_mage');
    """,
    'settle': 300, 'bot': BATTLE_BOT, 'secs': 30,
  },
  # 獄門天鎖：諾薇兒搭檔、故意不擋，致命那一下由即死防禦接住
  'guard': {
    'setup': r"""
      P.withPartner('test_misha', 'nouvelle');
      P.cfg = { gap:9, guardAt:150 };
      P.tail = 60; P.S.battleBg = 'holyseedungeonwhole';
      P.combat.startScriptBattle('test_misha');
    """,
    'settle': 0, 'bot': BATTLE_BOT, 'secs': 20,
  },
  # 推棺＋開棺（Ray 10-19：PV 1:52 用）—— 黑底，音效全入。走劇情那一支完整的推棺（撞頂→鉚釘→圓盤轉→開門），
  # 底下不開戰（battleHandler 換成空的），舞台與遊戲畫面全部壓成黑。
  'kerbopen': {
    'setup': r"""
      P.story = await import('./modules/story.js');
      P.story.setBattleHandler(()=>{});
      const st = document.createElement('style');
      // 透明底（Ray 10-19：「不要黑底，門要 alpha 通道」）—— 只留槍棺那一層，其他全部藏掉
      st.textContent = 'html,body{background:transparent !important}' +
        '#home,#app{visibility:hidden !important}' +
        '#storyBg,#storyCg,#storyCg2,#storyCast,#storyBubble,#townInfo,#townNav{visibility:hidden !important}' +
        '#storyStage{background:transparent !important}';
      document.head.appendChild(st);
      // 預熱：門的圖第一次用時才載，正式錄之前先完整跑一次（即時），再收掉舞台
      await new Promise(r=>P.story.playAdhoc([{ speaker:'NARRATION', text:'', battle:'test_misha' }], ()=>{}) || setTimeout(r, 6500));
      await P.sleep(6500);
      try{ P.story.close(); }catch(_){}
      await P.sleep(800);
    """,
    'settle': 500,
    # 先讓舞台與槍棺（控制盤高度）站好一拍，再推棺 —— 舞台開啟跟推棺同一瞬的話，上推的 CSS 過場會被吃掉（直接跳到頂）
    'bot': "(i)=>{ const P=window.__promo; if(i===20){ P.story.playAdhoc([{ speaker:'NARRATION', text:'', auto:700 }, { speaker:'NARRATION', text:'', battle:'test_misha' }], ()=>{}); } return []; }",
    'secs': 7, 'alpha': True,
  },
  # 閉棺（Ray 10-19：PV 結尾）：遊戲打完仗收棺那一段（兩扇合上→紋章轉回→箭與鉚釘扣回），透明底；黑透遮罩拿掉
  'kerbclose': {
    'setup': r"""
      P.story = await import('./modules/story.js');
      P.story.setBattleHandler(()=>{});
      const st = document.createElement('style');
      // 透明底（Ray 10-19：「不要黑底，門要 alpha 通道」）—— 只留槍棺那一層，其他全部藏掉
      st.textContent = 'html,body{background:transparent !important}' +
        '#home,#app{visibility:hidden !important}' +
        '#storyBg,#storyCg,#storyCg2,#storyCast,#storyBubble,#townInfo,#townNav{visibility:hidden !important}' +
        '#storyStage{background:transparent !important}' + '#storyStage.kerb-veil::after{display:none !important}';
      document.head.appendChild(st);
      // 預熱：門的圖第一次用時才載，正式錄之前先完整跑一次（即時），再收掉舞台
      await new Promise(r=>P.story.playAdhoc([{ speaker:'NARRATION', text:'', battle:'test_misha' }], ()=>{}) || setTimeout(r, 6500));
      await P.sleep(6500);
      try{ P.story.close(); }catch(_){}
      await P.sleep(800);
    """,
    'settle': 500,
    # 先讓舞台與槍棺（控制盤高度）站好一拍，再推棺 —— 舞台開啟跟推棺同一瞬的話，上推的 CSS 過場會被吃掉（直接跳到頂）
    'bot': "(i)=>{ const P=window.__promo; if(i===20){ P.story.playKerberosClose(()=>{}); } return []; }",
    'secs': 4.5, 'alpha': True,
  },
  # 同 kerbopen，但把紋章藏起來：拍門板本身（紋章底下的圓形凹槽）給合成開門用
  'kerbdoor': {
    'setup': r"""
      P.story = await import('./modules/story.js');
      P.story.setBattleHandler(()=>{});
      const st = document.createElement('style');
      // 透明底（Ray 10-19：「不要黑底，門要 alpha 通道」）—— 只留槍棺那一層，其他全部藏掉
      st.textContent = 'html,body{background:transparent !important}' +
        '#home,#app{visibility:hidden !important}' +
        '#storyBg,#storyCg,#storyCg2,#storyCast,#storyBubble,#townInfo,#townNav{visibility:hidden !important}' +
        '#storyStage{background:transparent !important}' + '#kerbPlate,#kerbGlow{visibility:hidden !important}';
      document.head.appendChild(st);
      // 預熱：門的圖第一次用時才載，正式錄之前先完整跑一次（即時），再收掉舞台
      await new Promise(r=>P.story.playAdhoc([{ speaker:'NARRATION', text:'', battle:'test_misha' }], ()=>{}) || setTimeout(r, 6500));
      await P.sleep(6500);
      try{ P.story.close(); }catch(_){}
      await P.sleep(800);
    """,
    'settle': 500,
    # 先讓舞台與槍棺（控制盤高度）站好一拍，再推棺 —— 舞台開啟跟推棺同一瞬的話，上推的 CSS 過場會被吃掉（直接跳到頂）
    'bot': "(i)=>{ const P=window.__promo; if(i===20){ P.story.playAdhoc([{ speaker:'NARRATION', text:'', auto:700 }, { speaker:'NARRATION', text:'', battle:'test_misha' }], ()=>{}); } return []; }",
    'secs': 2.6, 'alpha': True,
  },
  # 挑戰試玩版追蹤（ver -2225）：trace.html 上實際跑教學／挑戰（含亂入），PROMO_DUMP 取回讀到的 config／素材
  'trace_tut': {
    'storage': "localStorage.removeItem('tivot.tutorialSeen.v1');",
    'setup': r"""
      for(const id of ['creditBtn','creditClose','originalBtn','originalClose']){ const b=document.getElementById(id); if(b) b.click(); await P.sleep(300); }
      document.getElementById('startBtn').click();
      P.cfg = { gap:7 }; P.tail = 400;
    """,
    'settle': 1500, 'bot': TRACE_BOT, 'secs': 240,
  },
  'trace_chal': {
    'storage': "localStorage.setItem('tivot.tutorialSeen.v1','1');",
    'setup': r"""
      P.cfgMod.GAME_CONFIG.intruder.condition = { maxTime: 99999, noDamage: false };   // 一定觸發亂入（只為了追蹤讀到哪些素材）
      document.getElementById('startBtn').click();
      P.cfg = { gap:7, saintAt:0.6, dual:true, activeAt:200 }; P.tail = 400;
    """,
    'settle': 1500, 'bot': TRACE_BOT, 'secs': 300,
  },
  # 第一章出航前的港口對話（Ray 10-18）：Stage 1 跳關 → 旅店那段快點過去 → 船塢「28號碼頭…」起照閱讀速度演到出航
  'harbor': {
    'setup': r"""
      await P.chapter('stage1', '演');
      // Ray 10-18：大字體、一秒一句（只在錄影注入的樣式，遊戲本身不動）
      const st = document.createElement('style');
      st.textContent = '#storyBubble{width:94% !important;padding:14px 18px 18px !important}' +
        '#storyBubble .story-name{font-size:17px !important}' +
        '#storyBubble .story-text{font-size:24px !important;line-height:1.45 !important}';
      document.head.appendChild(st);
      P.cfg = { start:120, from:'28號碼頭', base:60, perChar:0 };
    """,
    'settle': 1500, 'bot': PACED_TALK_BOT, 'secs': 30,
  },
  # 城鎮對話：Stage 1 演劇情（帝都旅店 07:00 → 船塢）
  'towntalk': {
    'setup': r"""
      await P.chapter('stage1', '演');
      P.cfg = { start:150, every:140 };
    """,
    'settle': 1500, 'bot': STORY_BOT, 'secs': 50,
  },
}
