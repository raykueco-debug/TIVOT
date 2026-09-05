/* ══════════════════════════════════════════════════════════════════════
   gear.js — 本篇的整備畫面（ver -422，Ray 指定；由槍棺上的吊墜叫出來）
   ──────────────────────────────────────────────────────────────────────
   一張全螢幕視窗，三件事：
     ① **副武器**：三個類別各一格（一／二／三順位），**可拖曳改順序** ——
        那個順序就是戰鬥中切換鈕的順序。點一格 → 進道具欄的**那一個分類**換槍。
     ② **切換模式**：下方的開關。左＝固定順位、右＝輪轉（預設輪轉，Ray 指定）。
     ③ **搭檔**：右側立繪 ＋ 能力說明。本篇目前只有諾薇兒。

   ⚠⚠ 這一頁與試玩版的**出擊整備**（`#prepSheet`）是兩頁：那一頁是出陣流程的一站
     （按「執槍」就開打），這一頁是城鎮／劇情裡的裝備管理。共用的是**資料**
     （`script/loadout.js`）不是版面。
   ⚠⚠ 編成存在 `script/loadout.js`（唯一的真相）；戰鬥中那顆切換鈕**讀它**
     （`modules/weapon.js`）—— 不要在這裡直接寫 `state.equippedWeapon`。
   ⚠ 從劇情層叫出來，所以整頁 z-index 要在 `#storyStage`（8300）之上。
   ══════════════════════════════════════════════════════════════════════ */

import { GAME_CONFIG, asset, sfxGain, weaponDescText } from '../config.js';
import * as load from '../script/loadout.js';
import * as inv from '../script/inventory.js';
import * as prog from '../script/progress.js';
import { setPickedPartner, state } from '../state.js';
import { showBag, bagListHtml } from './loot.js';
import * as partner from './partner.js';   // 本篇現在的搭檔是誰（ver -671，唯一那一支判定）
import { SFX } from '../audio.js';

const $ = id => document.getElementById(id);
const W = () => GAME_CONFIG.weapons||{};

/* 本篇能用的搭檔。⚠ **只有諾薇兒**（Ray 指定）—— 試玩版的選人畫面照舊列全部，
   兩邊的清單是兩回事，不要合成一份。
   ⚠ ver -510：第一位＝`config.storyPartner`（唯一真相 —— combat.startGame 進劇情戰
   也切到它，不再依賴玩家先開過這一頁）。 */
/* ⚠ 現在是誰由 `partner.storyPartnerKey()` 決定（ver -671，安雅入隊之後換她）——
   所以這裡不能是**模組載入時**算好的常數：那時旗標還沒立起來。
   ⚠⚠ ver -741（Ray：「選安或諾都可以」）：改列**整個池子**（storyPartnerPool），
   池子裡不只一位時搭檔卡上長頁籤可切（見 render 的 gs-ptabs）。 */
const STORY_PARTNERS = () => partner.storyPartnerPool();

let el=null;
/* 待選搭檔（ver -743，Ray：「伙伴選了以後要有一個確認鈕，點下才生效」）：
   點頁籤只是**預覽**（卡換成那一位），按「確　認」才寫進 loadout＋pickedPartner，
   並播那一位的 `selectVoice`（config：安雅＝被動技語音、諾薇兒＝主動技語音）。
   開頁歸零（預覽不跨開關）。 */
let pendingPartner=null;
/* 現在開著哪一個分頁（ver -457，Ray：「在整備頁面加入道具分頁，道具要分類」）。
   ⚠ 不進存檔：這是「玩家現在在看哪一頁」，關掉重開回到整備即可。 */
let tab='gear';
/* 道具分頁裡現在看哪一個**類別**（ver -497，Ray：「道具按類別分頁，使用類的放第一」）。
   類別的順序＝config 的 `catOrder`（鐵律 1），而那張表本來就把 `item`（使用類）
   排第一 —— 這裡只是照抄，不另訂順序。 */
let itemCat='item';

function ensure(){
  if(el && el.parentNode) return el;
  el=document.createElement('div'); el.id='gearSheet';
  document.body.appendChild(el);
  return el;
}

/* ── 一格副武器（順位 n、類別 cat）── */
function slotHtml(cat, n){
  const key=load.pickOf(cat);
  const w=key ? W()[key] : null;
  const img=w ? (asset(w.image)||'') : '';
  /* 改裝階（ver -714）：**唯讀顯示**，升級在槍店（花錢，見 config.tuning.weaponMod）。
     ⚠ -714 初版曾做成 testmode 的 ± —— Ray 更正「不是管理人限定」，所以那個拿掉了：
       一個動作只留一個入口（鐵律 8）。 */
  const mod=key ? prog.weaponMod(key) : 0, modMax=key ? prog.weaponModMax(key) : 0;
  const devMod = (key && modMax && mod>0)
    ? '<span class="gs-mod">改 '+mod+'/'+modMax+'</span>' : '';
  return '<div class="gs-slot" data-cat="'+cat+'">'
       +   '<i class="gs-no">'+n+'</i>'
       +   (img ? '<img src="'+img+'" alt="">' : '<span class="gs-none">—</span>')
       +   '<div class="gs-txt"><span class="gs-cat">'+cat+'</span>'
       +     '<b>'+(w ? (w.shortName||w.name) : '未持有')+'</b></div>'
       +   devMod
       +   '<span class="gs-arrow">›</span>'
       + '</div>';
}

/* ══⚠⚠ 主武器（ver -699，Ray：「裝備欄加入雙槍…兩支算同一個武器，但是各有一個
   掛件槽，可以掛強化護符」「固定武器不可更換，但可以在槍店強化」）══════════
   ⚠ ver -700：只顯示**強化等級**（Ray：「顯示強化等級就好，不用寫槍店強化」），
     而且**一直顯示**（Lv1 也顯示）—— 玩家要看得出「這個東西可以練，練到 9」。
   ⚠⚠ ver -738：**整張卡可點展開九星現況，卡上有倒三角**（Ray：「主武器卡應該要
     可以點擊展開，看得到九星目前的狀況。要有一個倒三角讓玩家知到可點」）——
     -699 的「整張卡不可點」到此**推翻**：卡可點，但點下去做的是「看改裝狀況」，
     不是「換一把槍」（不可更換照舊）。-712 只有「強化」那一行是鈕、caret 小到
     看不見 —— 玩家不知道可點，正是這一版要修的。
     掛件槽仍是自己的熱區（stopPropagation），點槽不會把卡收合。
     **唯讀**照舊：升級要素材，素材在槍店，升級留在槍店那一頁。
   ⚠ 與槍店改裝頁（`loot.modRows`）**共用的是資料**（`config.gunStars` ＋
     `prog.starCount`），不是版面：那一頁要列素材需求、要能選；這一頁只報現況。 */
/* 九顆星的現況（唯讀）。已點亮＝金色＋✓（可多次的印 ×N）；未點亮＝暗。
   ⚠ 內部數值**不顯示**（Ray 指定）：只印星名、名稱與效果那一句。 */
let starsOpen = false;
function starListHtml(){
  /* ⚠⚠ **管理人模式可以自由點亮／熄滅**（ver -714，Ray 指定）：點一列 +1，
     到上限再點就歸零（`repeat` 的星上限 9，其餘 1）—— 一顆鈕就能來回，
     不必再擺一個「清除」。⚠ 只有 `body.testmode` 掛得上這個熱區。 */
  const dev=document.body.classList.contains('testmode');
  return (GAME_CONFIG.gunStars||[]).map(st=>{
    const n=prog.starCount(st.id);
    return '<div class="gs-star'+(n>0?' on':'')+(dev?' dev':'')+'"'
         +   (dev?' data-star="'+st.id+'"':'')+'>'
         +   '<i class="gs-starname">'+st.star+'</i>'
         +   '<b>'+st.name+(n>0 ? (st.repeat ? '　×'+n : '　✓') : '')+'</b>'
         +   '<span>'+st.desc+'</span>'
         + '</div>';
  }).join('');
}
function mainGunHtml(){
  const MG=GAME_CONFIG.mainGun; if(!MG) return '';
  const defs=(GAME_CONFIG.items||{}).defs||{};
  /* ver -707：顯示**已點亮幾顆星**（九階是非線性的，沒有「等級」可言）。 */
  const stars=(GAME_CONFIG.gunStars||[]);
  const lit=stars.filter(st=>prog.starCount(st.id)>0).length;
  const barrels=(MG.barrels||[]).map(b=>{
    const id=prog.charmOf(b.id), d=id?defs[id]:null;
    return '<div class="gs-barrel" data-barrel="'+b.id+'">'
         +   '<b>'+b.name+'</b>'
         +   '<span class="gs-charm'+(d?' on':'')+'">'
         +     '<i>掛件</i>'+(d ? (d.name||id) : '—')+'</span>'
         +   '<span class="gs-arrow">›</span>'
         + '</div>';
  }).join('');
  return '<div class="gs-sec">主武器</div>'
       + '<div class="gs-main">'
       +   (MG.image ? '<img class="gs-mimg" src="'+(asset(MG.image)||'')+'" alt="">' : '')
       +   '<div class="gs-mname">'+MG.name
       +     (MG.tag ? '<span class="gs-mfix">'+MG.tag+'</span>' : '')+'</div>'
       +   '<div class="gs-mtune">強　化　<b>'+lit+'</b>'
       +     '<span>／'+stars.length+'</span></div>'
       +   (starsOpen ? '<div class="gs-stars">'+starListHtml()+'</div>' : '')
       /* 倒三角＝「這張卡點得開」的記號（ver -738，Ray 指定）：收著 ▼、開著 ▲。
          放在星列之後 —— 開著時它在展開內容的底部，再點一下就收，動線自然。 */
       +   '<div class="gs-mopen">'+(starsOpen?'▲':'▼')+'</div>'
       +   '<div class="gs-barrels">'+barrels+'</div>'
       + '</div>';
}

function render(){
  const cats=load.order();
  const SP=STORY_PARTNERS();
  /* 顯示的是**現任**（旗標＋玩家選擇，ver -741）；有待選就先預覽待選那一位
     （ver -743：確認才生效）。 */
  const cur=partner.storyPartnerKey();
  const pk=(pendingPartner && GAME_CONFIG.partners[pendingPartner]) ? pendingPartner : cur;
  const p=GAME_CONFIG.partners[pk]||{};
  const fit=p.siFit||{};
  const rot = load.mode()==='rotate';
  /* 目前的體力（ver -497，Ray：「在整備頁顯示目前主角的hp」）。
     戰鬥外的 HP 只有一份真相：progress 的持久 HP（沒有鑰匙＝滿血），
     上限＝config 的 `tuning.playerHp` —— 兩個都不要在這裡另存。 */
  const hpMax=GAME_CONFIG.tuning.playerHp;
  const hpG=prog.getHp();
  const hpCur=(hpG!=null) ? Math.min(hpG, hpMax) : hpMax;
  const hpHtml =
      '<div class="gs-hp"><span class="gs-hplab">體　力</span>'
    +   '<i class="gs-hpbar"><i style="width:'+Math.round(hpCur/hpMax*100)+'%"></i></i>'
    +   '<b>'+hpCur+'</b><span class="gs-hpmax">／'+hpMax+'</span></div>';
  /* 道具分頁（ver -457；-497 改成**類別分頁**，Ray：「道具按類別分頁，使用類的
     放第一」）：頁籤照 config 的 `catOrder`（item 本來就排第一），清單走
     `bagListHtml`（與道具欄同一份實作，鐵律 8），`use:true` 讓回復道具長出
     「使　用」（按下去走 `prog.useHealItem`，唯一的實作）。 */
  const IT=GAME_CONFIG.items||{};
  const icats=(IT.catOrder||['item']);
  const itemsBody =
      '<div class="gs-items">'
    +   '<div class="bag-money">'+inv.moneyName()+'　<b>'+inv.getMoney()+'</b></div>'
    +   '<div class="gs-icats">'
    +     icats.map(c=>'<button class="gs-icat'+(itemCat===c?' on':'')+'" data-cat="'+c+'"'
                     + ' type="button">'+((IT.catName||{})[c]||c)+'</button>').join('')
    +   '</div>'
    +   '<div class="gs-itemlist">'+bagListHtml(itemCat, { use:true })+'</div>'
    + '</div>';
  el.innerHTML =
      '<button class="gs-close" type="button" aria-label="關閉">✕</button>'
    + '<div class="gs-tabs">'
    +   '<button class="gs-tab'+(tab==='gear' ?' on':'')+'" data-tab="gear"  type="button">整　備</button>'
    +   '<button class="gs-tab'+(tab==='items'?' on':'')+'" data-tab="items" type="button">道　具</button>'
    + '</div>'
    + hpHtml
    + (tab==='items' ? itemsBody :
      '<div class="gs-body">'
    +   '<div class="gs-left">'
    +     mainGunHtml()
    +     '<div class="gs-sec">副武器・順位</div>'
    +     '<div class="gs-slots">' + cats.map((c,i)=>slotHtml(c,i+1)).join('') + '</div>'
    +     '<div class="gs-hint">長按拖曳可換順位</div>'
    +     '<div class="gs-mode">'
    +       '<span class="'+(rot?'':'on')+'">固定順序</span>'
    +       '<button class="gs-sw'+(rot?' right':'')+'" type="button"><i></i></button>'
    +       '<span class="'+(rot?'on':'')+'">輪轉順序</span>'
    +     '</div>'
    +     '<div class="gs-modedesc">' + (rot
          ? '按一下換下一順位，一直輪下去。'
          : '永遠從一順位開始；連按 N 下切到第 N 順位，發射完（或吃了黃／橘圈）自動歸位。')
    +     '</div>'
    +   '</div>'
    +   '<div class="gs-right">'
    +     '<div class="gs-sec">搭　檔</div>'
    /* ══ 換搭檔（ver -741，Ray 的 stage2 稿：「進入整備畫面可以切換戰鬥搭檔…
       選安或諾都可以」）══ 池子裡不只一位才長頁籤（`storyPartnerPool`）；
       選擇存 loadout（跨輪偏好），套用走 `setPickedPartner`（唯一管道，§3.6）。 */
    +     (SP.length>1
            ? '<div class="gs-ptabs">'+SP.map(k=>{
                const pp=GAME_CONFIG.partners[k]||{};
                return '<button class="gs-ptab'+(k===pk?' on':'')+'" data-pk="'+k+'"'
                     + ' type="button">'+(pp.name||k)+'</button>';
              }).join('')+'</div>'
              /* 確認鈕（ver -743；-747 Ray：「當前伙伴也要顯示確認鈕，寫『已配對』」）
                 —— 現任那一頁換成不可按的「已配對」：鈕一直在，玩家才讀得出
                 「這一格是拿來按的」，只是現在沒有要換（§6.5.5：不要靠藏起鈕擋）。 */
            + (pk!==cur
                ? '<button class="gs-pconfirm" type="button">確　認</button>'
                : '<button class="gs-pconfirm gs-paired" type="button" disabled>已配對</button>')
            : '')
    +     '<div class="gs-pcard">'
    +       (p.image ? '<img class="gs-pimg" src="'+(asset(p.image)||'')+'" alt=""'
                     + ' style="--gp-zoom:'+(fit.zoom||1)+';--gp-top:'+((fit.top||0)*100)+'%">' : '')
    +       '<div class="gs-pname">'+(p.name||'—')+'</div>'
    +     '</div>'
    /* ⚠⚠ 技能說明包成自己的一塊（ver -715，Ray：「伙伴立繪太大了，下方要有足夠
       空間說明主備動技能」）—— 立繪改成**不伸展**（見 CSS 的 `gs-pcard`），
       多出來的高度歸這一塊，塞不下就它自己捲。
       ⚠ **常駐技能還沒實裝**（Ray：「先留空」）：欄位先擺著、內容空 ——
       留一格看得見的空位，比整個不出現好（玩家才知道還有這一欄）。 */
    +     '<div class="gs-perks">'
    +       (p.passive ? '<div class="gs-perk"><b>'+p.passive.name+'（被動）</b>'
                       + '<span>'+p.passive.desc+'</span></div>' : '')
    +       (p.active  ? '<div class="gs-perk"><b>'+p.active.name+'（主動）</b>'
                       + '<span>'+p.active.desc+'</span></div>' : '')
    +       '<div class="gs-perk empty"><b>常駐</b><span>—</span></div>'
    +     '</div>'
    +   '</div>'
    + '</div>');
  bind();
  /* ⚠ 提示要**等這一頁真的顯示了**才擺（`.on` 之前量到的 rect 全是 0，同 §6.5.4 的坑）——
     所以延到下一拍；`open()` 那邊也會在掛上 `.on` 之後再叫一次。 */
  setTimeout(maybeTip, 0);
}

/* ══ 夥伴欄聚光燈（ver -743）══ 壓暗其餘、給搭檔那一欄一圈金光＋一句話。
   ⚠ 遮罩 `pointer-events:none`：**什麼都不擋**（§6.5.5 的教訓：說明不是鎖），
   「指的是這一欄」交給金光。收場：點提示文字／按下確認／關頁。 */
let guideEls=null;
function openGuide(msg){
  if(!el || guideEls) return;
  const tgt=el.querySelector('.gs-ptabs') || el.querySelector('.gs-pcard');
  if(!tgt) return;
  const r=tgt.getBoundingClientRect();
  const dim=document.createElement('div');
  dim.style.cssText='position:fixed;inset:0;z-index:8455;background:rgba(0,0,0,.45);pointer-events:none;';
  const ring=document.createElement('div');
  ring.style.cssText='position:fixed;z-index:8456;pointer-events:none;border:2px solid var(--gold);'
    +'border-radius:12px;box-shadow:0 0 18px rgba(212,169,74,.9),inset 0 0 12px rgba(212,169,74,.5);'
    +'left:'+(r.left-6)+'px;top:'+(r.top-6)+'px;width:'+(r.width+12)+'px;height:'+(r.height+12)+'px;';
  const tip=document.createElement('div');
  tip.style.cssText='position:fixed;z-index:8456;left:50%;top:'+(r.bottom+18)+'px;'
    +'transform:translateX(-50%);max-width:80%;padding:10px 14px;border:1px solid var(--gold-dim);'
    +'border-radius:10px;background:rgba(8,9,14,.92);color:var(--ink);font-size:13px;'
    +'line-height:1.7;letter-spacing:1px;text-align:center;pointer-events:auto;cursor:pointer;';
  tip.textContent=msg || '在這裡切換戰鬥搭檔——選好按「確　認」才會生效。';
  tip.addEventListener('click', e=>{ e.stopPropagation(); closeGuide(); });
  document.body.appendChild(dim); document.body.appendChild(ring); document.body.appendChild(tip);
  guideEls=[dim,ring,tip];
}
function closeGuide(){
  if(!guideEls) return;
  for(const e of guideEls){ try{ e.remove(); }catch(_){} }
  guideEls=null;
}

/* 小提示（ver -497）：使用道具的回饋一句話，浮在體力條旁邊，1.4 秒自己收。
   ⚠ 不用 alert 也不彈窗 —— 這只是回饋，不是要玩家做決定。 */
let noteT=0;
function gsNote(txt){
  if(!el) return;
  let n=el.querySelector('.gs-note');
  if(!n){ n=document.createElement('div'); n.className='gs-note'; el.appendChild(n); }
  n.textContent=txt; n.classList.add('on');
  clearTimeout(noteT);
  noteT=setTimeout(()=>{ if(n) n.classList.remove('on'); }, 1400);
}

/* ── 綁事件 ── */
function bind(){
  el.querySelector('.gs-close').addEventListener('click', e=>{ e.stopPropagation(); close(); });
  el.querySelectorAll('.gs-tab').forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation();
    if(b.dataset.tab===tab) return;
    try{ SFX.menuClick(); }catch(_){}
    tab=b.dataset.tab; render();
  }));
  /* 換搭檔（ver -741；-743 改成**確認制**，Ray：「伙伴選了以後要有一個確認鈕，
     點下才生效」）：頁籤＝預覽（卡先換給你看），「確　認」才寫進 loadout＋
     pickedPartner，並播那一位的 `selectVoice`。 */
  el.querySelectorAll('.gs-ptab').forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation();
    const k=b.dataset.pk;
    if(!GAME_CONFIG.partners[k]) return;
    try{ SFX.menuClick(); }catch(_){}
    pendingPartner = (k===partner.storyPartnerKey()) ? null : k;
    render();
  }));
  { const cf=el.querySelector('.gs-pconfirm');
    if(cf) cf.addEventListener('click', e=>{ e.stopPropagation();
      const k=pendingPartner;
      if(!k || !GAME_CONFIG.partners[k]) return;
      pendingPartner=null;
      load.setPartner(k);
      setPickedPartner(k);
      const v=GAME_CONFIG.partners[k].selectVoice;
      try{ if(v && asset(v)) SFX.playVoice(asset(v), sfxGain(v)); else SFX.menuClick(); }catch(_){}
      closeGuide();          // 教學聚光燈（有開的話）到此收（ver -743）
      render();
    }); }
  /* 道具的類別頁籤（ver -497）。 */
  el.querySelectorAll('.gs-icat').forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation();
    if(b.dataset.cat===itemCat) return;
    try{ SFX.menuClick(); }catch(_){}
    itemCat=b.dataset.cat; render();
  }));
  /* 「使　用」：回復道具（ver -497）。滿血不消耗，浮一句說明；用掉就重畫
     （數量、體力條、錢那一行一起跟上）。 */
  el.querySelectorAll('.bag-use').forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation();
    const res=prog.useHealItem(b.dataset.id);
    if(!res) return;
    if(res.full){ try{ SFX.menuClick(); }catch(_){} gsNote('體力已滿'); return; }
    /* 回復音（ver -499，Ray：「使用道具恢復時跑 se_healing」）—— 真的補到血才響。 */
    try{ SFX.unlock(); SFX.play(asset('se_healing'), sfxGain('se_healing')); }catch(_){}
    render();                          // ⚠ 先重畫再浮字：render 會把整頁（含提示）洗掉
    /* ── 回血特效（ver -498，Ray：「回復體力的 hp 條加入回血特效」）──
       render 是整頁重建，條直接站在新寬度上不會動 —— 所以把填色**倒回舊寬度**、
       隔一幀再放到新寬度，讓 CSS 的 width 過場真的跑一次；同時掛 .heal
       （金光脈動＋亮一階的填色，約 0.9 秒自己退）。 */
    const bar=el.querySelector('.gs-hpbar'), fill=bar && bar.querySelector('i');
    if(fill){
      const p0=Math.round((res.hp-res.healed)/res.max*100);
      const p1=Math.round(res.hp/res.max*100);
      fill.style.transition='none'; fill.style.width=p0+'%';
      void fill.offsetWidth;                       // 隔一幀（同 story.veil 那條的理由）
      fill.style.transition=''; fill.style.width=p1+'%';
      bar.classList.add('heal');
      setTimeout(()=>{ bar.classList.remove('heal'); }, 900);
    }
    gsNote('恢復了 '+res.healed+' 點體力');
  }));
  const sw=el.querySelector('.gs-sw');
  if(sw) sw.addEventListener('click', e=>{ e.stopPropagation();
    try{ SFX.menuClick(); }catch(_){}
    load.setMode(load.mode()==='rotate' ? 'fixed' : 'rotate');
    render();
  });
  el.querySelectorAll('.gs-slot').forEach(s=>bindSlot(s));
  /* 掛件槽（ver -699）：點一下開道具欄的護符類。⚠ 不做拖曳 —— 兩支槍沒有順位。 */
  /* ver -738：**整張主武器卡**都是展開／收合的熱區（Ray 指定，取代 -712 只有
     「強化」那一行）。掛件槽與管理人的星列自己 stopPropagation，不會誤觸。 */
  { const m=el.querySelector('.gs-main');
    if(m) m.addEventListener('click', e=>{
      if(e.target.closest('.gs-barrel') || e.target.closest('.gs-star.dev')) return;
      try{ SFX.menuClick(); }catch(_){}
      starsOpen=!starsOpen; render(); }); }
  /* 管理人：點一顆星 → +1，到上限歸零（ver -714）。 */
  el.querySelectorAll('.gs-star.dev').forEach(d=>d.addEventListener('click', e=>{
    e.stopPropagation();
    const id=d.dataset.star;
    const st=(GAME_CONFIG.gunStars||[]).find(x=>x.id===id); if(!st) return;
    const max=st.repeat ? 9 : 1;
    const cur=prog.starCount(id);
    prog.setStarCount(id, cur>=max ? 0 : cur+1);
    try{ SFX.menuClick(); }catch(_){}
    render();
  }));
  el.querySelectorAll('.gs-barrel').forEach(b=>b.addEventListener('click', e=>{
    e.stopPropagation(); openCharm(b.dataset.barrel);
  }));
}

/* 點一個掛件槽 → 道具欄的護符類（走 `showBag` 的 equip 模式，與副武器同一支）。
   ⚠ 目前 `items.defs` 裡一張護符都沒有（Ray 的卡還沒到）—— 清單會是空的，
     那是**對的**：不要為了讓它看起來有東西就自己發明護符（同「改裝服務準備中」）。 */
function openCharm(barrel){
  const MG=GAME_CONFIG.mainGun||{};
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  closeTip();
  showBag({ cat: MG.charmCat||'charm', equip:true, current:prog.charmOf(barrel), top:8460,
            onEquip(id){ prog.setCharm(barrel, id); },
            onClose(){ render(); } });
}

/* 一格：**點一下**開那個分類的道具欄換槍；**拖曳**改順位。
   ⚠ 用 pointer 事件自己做拖曳，不用 HTML5 的 drag —— 那一套在觸控上根本不會動。
   ⚠ 「點」與「拖」靠位移門檻分流（6px）：手指本來就會抖，門檻太小會變成點不動。 */
function bindSlot(s){
  let sy=0, moved=false, list=null, h=0, idx=0;
  s.addEventListener('pointerdown', e=>{
    sy=e.clientY; moved=false;
    list=[...el.querySelectorAll('.gs-slot')];
    idx=list.indexOf(s); h=s.getBoundingClientRect().height + 8;
    s.setPointerCapture(e.pointerId);
  });
  s.addEventListener('pointermove', e=>{
    if(!list) return;
    const dy=e.clientY-sy;
    if(!moved && Math.abs(dy)<6) return;
    if(!moved){ moved=true; s.classList.add('drag'); }
    e.preventDefault();
    s.style.transform='translateY('+dy+'px)';
    /* 其餘的格子讓位：跨過半格就位移一格。 */
    const to=Math.max(0, Math.min(list.length-1, idx + Math.round(dy/h)));
    list.forEach((o,i)=>{
      if(o===s) return;
      let sh=0;
      if(i>idx && i<=to) sh=-h;
      else if(i<idx && i>=to) sh=h;
      o.style.transform='translateY('+sh+'px)';
    });
  });
  const end=e=>{
    if(!list) return;
    const dy=e.clientY-sy;
    const to=Math.max(0, Math.min(list.length-1, idx + Math.round(dy/h)));
    list.forEach(o=>{ o.style.transform=''; });
    s.classList.remove('drag');
    const wasMoved=moved; list=null; moved=false;
    if(wasMoved){
      if(to!==idx){
        const cats=load.order();
        const [c]=cats.splice(idx,1); cats.splice(to,0,c);
        load.setOrder(cats);
        try{ SFX.menuClick(); }catch(_){}
      }
      render();
    }else{
      openCat(s.dataset.cat);          // 沒有拖 → 當成點一下
    }
  };
  s.addEventListener('pointerup', end);
  s.addEventListener('pointercancel', ()=>{ if(list){ list.forEach(o=>o.style.transform='');
    s.classList.remove('drag'); list=null; moved=false; } });
}

/* 點一格 → 道具欄的那一個分類（Ray：「進入道具欄的對應分類」）。 */
function openCat(cat){
  try{ SFX.unlock(); SFX.menuClick(); }catch(_){}
  closeTip();
  showBag({ cat, equip:true, current:load.pickOf(cat), top:8460,
            onEquip(id){ load.setPick(cat, id); },
            onClose(){ render(); } });
}

/* ── 一次性教學：拿到「龍息」之後指著霰彈槍那一格（Ray 指定）──
   ⚠ 一次性：旗標記在 progress，看過就不再擋路（同旅店那三個說明）。
   ⚠ 條件是「**持有**那把槍」而不是「打完那一場」—— 買來的、日後別的管道拿到的
     都該看到這個提示（鐵律 8：條件寫在「事實」上，不寫在某一條路徑上）。 */
const TIP_FLAG='gear_tip_dragon';
const TIP_WEAPON='Shotgun_Dragon';
function maybeTip(){
  if(!el || !el.classList.contains('on')) return;
  if(el.querySelector('.gs-tip')) return;
  if(prog.hasFlag(TIP_FLAG)) return;
  if(!inv.hasWeapon(TIP_WEAPON)) return;
  const w=W()[TIP_WEAPON]; if(!w) return;
  if(load.pickOf(w.cat)===TIP_WEAPON) return;      // 已經裝上了就不用教
  const slot=el.querySelector('.gs-slot[data-cat="'+w.cat+'"]'); if(!slot) return;
  const r=slot.getBoundingClientRect(); if(!r.width) return;
  const t=document.createElement('div'); t.className='gs-tip';
  t.innerHTML='<i class="gt-arrow">▼</i><div class="gt-txt">拿到了「'+(w.shortName||w.name)
            + '」。點這一格換上去。</div>';
  el.appendChild(t);
  /* ⚠ 箭擺在那一格的**正上方**（同旅店那一套）：擺右邊的話在窄螢幕上會被切掉
     （實測 390 寬時箭心落在 377）。文字再往上一行，不壓到格子本身。 */
  const a=t.querySelector('.gt-arrow');
  a.style.left=(r.left+r.width/2)+'px'; a.style.top=(r.top-6)+'px';
  const tx=t.querySelector('.gt-txt');
  tx.style.top=(Math.max(6, r.top-56))+'px';
  slot.classList.add('spot');
  t.addEventListener('click', e=>{ e.stopPropagation(); closeTip(); });
}
function closeTip(){
  const t=el && el.querySelector('.gs-tip'); if(!t) return;
  prog.addFlags([TIP_FLAG]);
  el.querySelectorAll('.spot').forEach(x=>x.classList.remove('spot'));
  t.remove();
}

export function open(opts){
  ensure();
  pendingPartner=null;   // 預覽不跨開關（ver -743）
  /* 蓋在飛行畫面上 → 底下整個暫停（ver -481，Ray 指定）。收場（close）放開。
     掛鉤走 window（main.js 掛的）：這一支是葉模組，構不到 iframe。 */
  if(document.body.classList.contains('flight-on') && window.__flightHoldToggle) window.__flightHoldToggle(true);
  tab='gear';        // 每次開都回到整備 —— 吊墜的語意是「整備」，道具是它的第二頁
  /* 本篇現任搭檔＝旗標＋玩家選擇（`storyPartnerKey`，ver -741）。
     ⚠ 走 `setPickedPartner`（唯一管道，§3.6）。 */
  /* 劇情強配（ver -838，夏爾村戰前的強制整備）：`opts.forcePartner` 先寫進
     loadout（唯一真相）——storyPartnerKey 之後自然回她，頁面顯示的就是她。 */
  if(opts && opts.forcePartner && GAME_CONFIG.partners[opts.forcePartner]) load.setPartner(opts.forcePartner);
  const pk=partner.storyPartnerKey();
  if(GAME_CONFIG.partners[pk] && state.pickedPartner!==pk) setPickedPartner(pk);
  render();
  el.classList.add('on');
  requestAnimationFrame(()=>{ el.classList.add('vis'); maybeTip();
    /* 夥伴欄聚光燈（ver -743，Ray：「同槍店教整備一樣，高光整備欄，再高光
       夥伴欄」）—— 飛行頁那一段高光了吊墜（整備欄），開進來接著高光**夥伴欄**。
       走 `opts.guidePartner`（橋上的一次性閂）。⚠ 等 `.on` 之後才量 rect（老坑）。 */
    if(opts && opts.guidePartner) setTimeout(()=>openGuide(opts.guideMsg), 120); });
  /* ⚠ **一般的 click 音就好**（ver -433，Ray 指定）。原本用 `sfx_saint`（聖徒化那一支）——
     那是「發動」的聲音，開一頁裝備管理配不上那個份量，而且它比其他 UI 音都響。
     ⚠ 走 `SFX.menuClick()`（＝ `se_general_click`，所有按鈕的統一出口）——
       這一頁裡其他三處本來就是它，這一行是唯一的例外。 */
  try{ SFX.menuClick(); }catch(_){}
}
export function close(){
  closeGuide();          // 教學聚光燈跟著頁一起收（ver -743）
  pendingPartner=null;
  if(!el) return;
  closeTip();
  if(document.body.classList.contains('flight-on') && window.__flightHoldToggle) window.__flightHoldToggle(false);
  el.classList.remove('vis');
  setTimeout(()=>{ if(el) el.classList.remove('on'); }, 300);
  /* ⚠ 通知**在這裡發**（唯一的收場，鐵律 8），不等 300ms 的動畫 ——
     等待者要接的是「玩家換完裝備了」這件事，不是滑出動畫的最後一格。 */
  const cbs=closedCbs; closedCbs=[];
  for(const cb of cbs){ try{ cb(); }catch(e){ console.warn('[gear] onceClosed', e); } }
}
/* ══ 「這一頁收掉了通知我」（ver -430）══════════════════════════════════
   城鎮的整備教學要等玩家**真的換完裝備**才把商店的單子擺出來（Ray 指定），
   而「換完」＝這一頁被收掉。
   ⚠ **沒開著就立刻放行**：玩家可能直接把提示點掉、根本沒按吊墜 ——
     不能把他鎖在教學裡（同 `story.openHint` 的原則）。
   ⚠ 一次性：叫過就從清單上拿掉，不會下次開整備頁又觸發一次。 */
let closedCbs=[];
export function isOpen(){ return !!(el && el.classList.contains('on')); }
export function onceClosed(cb){
  if(typeof cb!=='function') return;
  if(!isOpen()){ cb(); return; }
  closedCbs.push(cb);
}
