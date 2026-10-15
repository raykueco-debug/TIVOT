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

SCENES = {
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
  # 城鎮對話：Stage 1 演劇情（帝都旅店 07:00 → 船塢）
  'towntalk': {
    'setup': r"""
      await P.chapter('stage1', '演');
      P.cfg = { start:150, every:140 };
    """,
    'settle': 1500, 'bot': STORY_BOT, 'secs': 50,
  },
}
