/* ══ 背景的程式層（ver -2621）══ 交件單：resources/background/anim/TO_CODE_bg_anim.md（11-13／11-14 那幾段）
   鑰匙＝**靜態背景的檔名**（小寫、不含副檔名），與 `script/bg_anim.js` 同一套 —— 畫面上換成哪一張靜態圖，就跑那一張的程式層。
   畫法在 `modules/bgfx.js`（鐵律 1：這裡只有資料；數值照交件單，單位註明以幾寬計）。
   欄位：
     base      底圖換成這一張（沒有影片時；光束／煙／水柱那幾格是「拿掉那個東西的底圖」）
     hideStatic 程式層第一格畫上去之前先藏起靜態圖（靜態圖構圖不一樣時用，不然會先閃一張別的構圖）
     water     平靜水面：{mask, amp, wave, speed, persp}（1536 寬計；預設 2.2／26／1.0／1.6）
     flow      落水亮條：{mask, speed, sway, extra}（768 寬計 px/s，預設 220）；每秒 12 格跳格；sway＝瀑布本體逐列擺動、extra＝第二層連續水條的透明度
     splash    落點水花：true 或 {n, h, foam}（白沫＋往上噴的水珠，取落水遮罩每欄最下緣）
     water.rings 湖面漣漪：true（圓心＝落水最下緣）或 {x, y, n, R, period}
     mist      落點水霧：true＝從落水遮罩每一欄的最下緣取點
     spout     獅口水柱：{img, path, flow}
     beam      光束：{col:[r,g,b], amp}（amp＝最亮處加量 0~255，白天 106）
     smoke     硝坑的煙：true
     haze      街上的煙／霧：{y0, y1, col, a, n, wind, size}（畫面比例；modules/bgfx.js 的 drawHaze）
     sky       天空層：{img, mask, clouds:[中景, 近景]}（影片的天空挖掉，透出靜態天空＋程式雲）
               或 {img, mask, layers:[{img, speed, arc, yc, wob, def, seed}…], focus, bottom, sun}（城鎮天空／守城戰：雲分遠中近三層；sun＝畫在雲之上的太陽）
     plumes    煙柱（守城戰，11-22）：{atlas, cells, wind, src:[[x,y,寬]…]}（比例座標；畫在天空層、地面之下 ⇒ 一律在建築後面）
   ⚠ 檔案都在不會被同名覆蓋的 anim/ 底下；交新的就重跑 `py tools/bg_anim_index.py --check`（會驗這裡的路徑都在）。 */
const A = 'resources/background/anim/';
const CUMULUS = ['resources/background/sky_parallax/sky_cumulus_day_l1_mid.webp?v=138d532a', 'resources/background/sky_parallax/sky_cumulus_day_l2_near.webp?v=4ee9b4ce'];
const PURPLE = ['resources/background/_sky_layers/purple_l1_mid.webp', 'resources/background/_sky_layers/purple_l2_near.webp'];
const W = (mask, o) => Object.assign({ mask: A + mask }, o || {});
const F = (mask, o) => Object.assign({ mask: A + mask }, o || {});
/* 守城戰一格：天空底＋遮罩＋雲三層（遠慢近快、沿焦點弧線走）＋太陽，可選河面／煙柱。o.bottom＝天空下緣（畫面高的比例） */
const LIVE = dir => (n, o) => {
  const p = A + dir + n + '_', sp = {
    hideStatic: false,
    sky: { img: p + 'sky.webp', mask: p + 'skymask.png', sun: o.sun === false ? null : p + 'sun.webp', focus: [0.5, 0.4], bottom: o.bottom || 0.4,
      layers: [{ img: p + 'cloud_far.webp', speed: 3, arc: 0.10, yc: 0.85 },
               { img: p + 'cloud_mid.webp', speed: 6, arc: 0.18, yc: 0.55, wob: 1.5, seed: 1 },
               { img: p + 'cloud_near.webp', speed: 11, arc: 0.28, yc: 0.25, wob: 3, def: 0.05, seed: 2 }] } };
  /* 雲海（11-23 Ray：「橋的下方要一直有雲」「不移動的雲就讓他稍微改變形狀」）：原圖地平線以下那片雲，不捲動，只讓形狀慢慢起伏；疊在最上面，捲過來的雲不會在那裡露出空隙 */
  if (o.sea) sp.sky.layers.push({ img: p + 'cloud_sea.webp', speed: 0, arc: 0, yc: 1.5, def: 0.025, wob: 1.2, seed: 3 });
  if (o.fire || o.fireFree) {   // 程式火＋火堆冒的煙（11-24）：fire＝原圖畫著火的地方（firemask 讓前景擋住）；fireFree＝戰地放火（審閱頁手動放，tools/anim/bg_layer/fire_place.json，不裁）
    sp.fire = { mask: o.fire ? p + 'firemask.png' : null, src: o.fire || [], free: o.fireFree || [] };
    const all = sp.fire.src.concat(sp.fire.free);
    if (o.plumes) sp.fireSmoke = { wind: o.plumes.wind, cells: o.plumes.cells, alpha: 0.55, src: all.filter(f => f[2] > 0.02).map(([fx, fy, fw]) => [fx, fy - 0.03, fw * 0.8]) };
  }
  if (o.base) sp.base = p + 'base.webp?v=791b78e3';   // 地面換一張（墓地：遠景海面上那幾柱畫死的煙抹掉，改由程式冒）
  if (o.water) sp.water = Object.assign({ mask: p + 'water.png' }, o.water);
  /* 街上的煙／霧（11-24 Ray）：煙帶從地平線稍下開始；haze:true＝預設灰煙，或給 {col, a, …} 覆寫 */
  if (o.haze) sp.haze = Object.assign({ y0: (o.bottom || 0.4) + 0.04, y1: 0.96, a: 0.4, col: [200, 192, 190] }, o.haze === true ? {} : o.haze);
  if (o.plumes) sp.plumes = Object.assign({ atlas: p + 'smoke.webp' }, o.plumes);
  return sp;
};
const WS = LIVE('winsmoor_siege/');
/* 北方泊地戰損城區（11-23 Ray「雲水煙一律程式跑」「做北泊 6 格」）：同守城戰那一套 —— 地面＝靜態圖，天空＋程式雲＋程式煙柱即時畫；原本的 Wan 影片退役（西區那支其實是廣場的畫面，GPT 去煙底圖放錯張） */
const NP = LIVE('northport/');
const beam = (t, col, amp) => ({ base: A + 'ruins/ruins_shinier_corridora_' + t + '_nobeam.webp', beam: { col, amp } });

export const BG_FX = {
  /* ── 獅口水道（11-14 Ray 定案：整格靜態＋程式水柱）── */
  belisar_lionspout: {
    base: A + 'belisar/belisar_dragonrace_base_nospout.webp', hideStatic: true,
    water: W('belisar/belisar_dragonrace_base_watermask.png'),
    spout: { img: A + 'belisar/belisar_dragonrace_base_spout.png', path: A + 'belisar/belisar_dragonrace_base_spout_path.json', flow: A + 'belisar/belisar_dragonrace_base_flowmask.png' },
  },
  /* ── 落水（天空 11-25 改 GPT 重摳的程式雲，在 ⟨cloud-live⟩ 段）── */
  belisar_draincliff_day: { flow: F('belisar/belisar_draincliff_day_flowmask.png') },
  lake_cave_day: { flow: F('lake/lake_cave_day_flowmask.png', { speed: 420 }), mist: true },
  /* 11-24 Ray：「瀑布加一層程式水上去 還有水花跟湖面效果」：瀑布逐列擺動＋第二層連續水條、落點水花＋水霧、湖面漣漪＋反光加強 */
  lake_fallbase_day: { water: W('lake/lake_fallbase_day_watermask.png', { amp: 2.8, glint: 0.5, rings: true }),
    flow: F('lake/lake_fallbase_day_flowmask.png', { sway: true, extra: 0.4 }), mist: true, splash: true,
    /* 11-24 Ray：「底圖給 GPT 重出 天空沒挖好 瀑布要補好」：底圖換成 GPT 補好瀑布的那一張，天空由 GPT 洋紅重摳 → 程式雲三層（同守城戰） */
    sky: LIVE('lake/live/')('lake_fallbase_day', { bottom: 0.142, sun: false }).sky },
  /* ── 只拆天地 ── */
  dunmor_cairn: { sky: { img: A + 'dunmor/dunmor_cairn_sky.png', mask: A + 'dunmor/dunmor_cairn_skymask.png', clouds: PURPLE } },
  /* ── 平靜水面（＋沖流）── */
  belisar_stillpool: { water: W('belisar/belisar_mirrorpool_base_watermask.png') },
  belisar_waterjail: { water: W('belisar/belisar_waterjail_base_watermask.png') },
  outer_river_dusk: { water: W('capital_outer/capital_outer_river_base_watermask.png'), flow: F('capital_outer/capital_outer_river_base_flowmask.png') },
  dunmor_boarstone: { water: W('dunmor/dunmor_boarstone_base_watermask.png') },
  dunmor_boglane: { water: W('dunmor/dunmor_boglane_base_watermask.png') },
  dunmor_ditche: { water: W('dunmor/dunmor_ditchE_base_watermask.png') },
  dunmor_ditchw: { water: W('dunmor/dunmor_ditchW_watermask.png') },          // 整格靜態（不跑 Wan）
  dunmor_innerditch: { water: W('dunmor/dunmor_innerditch_base_watermask.png') },
  dunmor_bogoffer: { water: W('dunmor/dunmor_bogoffer_watermask.png') },       // 蘆葦影片未交：先在靜態圖上跑水
  dunmor_lakeshore: { water: W('dunmor/dunmor_lakeshore_base_watermask.png') }, // 影片未交：同上
  fallen_basin_day: { water: W('fallen/fallen_basin_day_watermask.png') },
  lake_causeway_day: { water: W('lake/lake_causeway_day_watermask.png', { amp: 0.5, persp: 5 }) },   // Ray：「看起來沒有距離感」
  lake_deadfall_day: { water: W('lake/lake_deadfall_day_watermask.png') },
  lake_eastshore_day: { water: W('lake/lake_eastshore_day_watermask.png') },
  lake_inlet_day: { water: W('lake/lake_inlet_day_watermask.png') },
  lake_northshore_day: { water: W('lake/lake_northshore_day_watermask.png') },
  forest_shoal_day: { water: W('shinier_forest/shinier_forest_shoal_day_watermask.png'), flow: F('shinier_forest/shinier_forest_shoal_day_flowmask.png') },
  forest_valley_day: { water: W('shinier_forest/shinier_forest_valley_day_watermask.png'), flow: F('shinier_forest/shinier_forest_valley_day_flowmask.png') },
  ruins_shinier_deepspring: { water: W('ruins/shinier_ruins_deepspring_base_watermask.png'), flow: F('ruins/shinier_ruins_deepspring_base_flowmask.png') },
  sofiaout_forecourt: { water: W('sofiaout/sofiaout_forecourt_base_watermask.png'), flow: F('sofiaout/sofiaout_forecourt_base_flowmask.png') },
  tomb_cistern: { water: W('tomb/tomb_cistern_base_watermask.png') },
  tomb_mudpit: { water: W('tomb/tomb_mudpit_base_watermask.png') },
  tomb_sump: { water: W('tomb/tomb_sump_base_watermask.png'), flow: F('tomb/tomb_sump_base_flowmask.png') },
  tomb_sunkhall: { water: W('tomb/tomb_sunkhall_base_watermask.png'), flow: F('tomb/tomb_sunkhall_base_flowmask.png') },
  tomb_waterstair: { water: W('tomb/tomb_waterstair_base_watermask.png'), flow: F('tomb/tomb_waterstair_base_flowmask.png') },
  tomb_shaft: { water: W('tomb/tomb_shaft_base_watermask.png'), flow: F('tomb/tomb_shaft_base_flowmask.png') },
  /* ── 木雅克神殿　長廊：光束（色調依時段，量自四張原圖）── */
  ruins_shinier_corridora_dawn: beam('dawn', [229, 215, 255], 109),
  ruins_shinier_corridora_day: beam('day', [255, 221, 186], 106),
  ruins_shinier_corridora_dusk: beam('dusk', [255, 169, 124], 119),
  ruins_shinier_corridora_night: beam('night', [230, 227, 255], 79),
  /* ── 戰鬥背景：索菈娜（湖上甲板，11-20 背景副理交件）── 水由程式畫＋天空拆層、雲由程式動；戰鬥上半由 enemy.setBattleBgVideo 播（同一個 drawFx） */
  sorana_battle_bg_v3: { video: A + 'enemy/sorana_battle_bg_v3_sail_v1.mp4',   // 帆微動（11-20 背景副理 b2b824bb）：影片當底圖，天空／雲／水照舊疊；欄位 video 只有戰鬥上半在讀（enemy.startBattleBgFx）
    water: W('enemy/sorana_battle_bg_v3_watermask.png'),
    sky: { img: A + 'enemy/sorana_battle_bg_v3_sky.png', mask: A + 'enemy/sorana_battle_bg_v3_skymask.png', clouds: CUMULUS } },
  /* ── 戰鬥背景：賞金獵人公會（11-21 背景副理交件，Ray 在 animechk 剪過）── 只有觀眾在動（Wan，16fps 11 格循環）；室內，不疊其他程式層 */
  guild_hunter_battle_bg: { video: A + 'enemy/guild_hunter_battle_bg_crowd_v1.mp4' },
  /* ── 伊甸古墓　硝坑：坑底的煙（底圖是火把熄掉的那一張）── */
  tomb_nitrepit: { base: A + 'tomb/tomb_nitrepit_base_nofire.webp', smoke: true },
  /* ── 溫斯摩爾港守城戰（11-22 Ray：「改遊戲內即時跑」）：地面＝靜態圖不動；天空／雲／太陽／煙柱／河面全由程式即時跑，沒有影片、沒有循環縫。
     素材由 tivot_wan/bg_layer/war_run.py 的 WAR_EXPORT 產生（<名>_live.json 是同一份數字的來源）。 */
  /* ⟨np-live⟩ 北方泊地戰損城區 —— 由 tools/anim/bg_layer/np_live_emit.py 自動產生，不要手改（改各格 _live.json／np_live_cells.json 再重跑）*/
  northport_square_bf: NP('northport_square_bf', { bottom: 0.368, sun: false, fireFree: [[0.3, 0.75, 0.0588], [0.88, 0.78, 0.0636]] }),
  northport_west_bf: NP('northport_west_bf', { bottom: 0.404, sun: false, fireFree: [[0.88, 0.8, 0.0649], [0.12, 0.72, 0.0514]], haze: {col: [215, 218, 222], a: 0.32}, plumes: { wind: -0.01023, src: [[0.5605,  0.499,  0.035],  [0.6645,  0.3633,  0.035],  [0.7217,  0.3799,  0.051],  [0.4683,  0.5918,  0.0464]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  northport_north_bf: NP('northport_north_bf', { bottom: 0.31, sun: false, fireFree: [[0.06, 0.88, 0.0822], [0.7, 0.66, 0.0492]], haze: {col: [225, 228, 232], a: 0.3}, plumes: { wind: 0.00947, src: [[0.4095,  0.5303,  0.1146],  [0.5795,  0.5645,  0.1146],  [0.5261,  0.5684,  0.08]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  northport_east_bf: NP('northport_east_bf', { bottom: 0.351, sun: false, base: true, fire: [[0.5655, 0.6849, 0.0226], [0.7804, 0.8542, 0.105]], fireFree: [[0.25, 0.75, 0.0598]], plumes: { wind: -0.00539, src: [[0.5425,  0.4902,  0.0862]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  northport_port_bf: NP('northport_port_bf', { bottom: 0.381, sun: false, fireFree: [[0.08, 0.65, 0.0425], [0.9, 0.62, 0.0381]], plumes: { wind: 0.00826, src: [[0.4,  0.47,  0.05],  [0.565,  0.5,  0.04],  [0.86,  0.47,  0.06]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  northport_cemetery_bf: NP('northport_cemetery_bf', { bottom: 0.294, sun: false, base: true, fireFree: [[0.62, 0.38, 0.0178]], plumes: { wind: -0.00922, src: [[0.2364,  0.354,  0.022],  [0.7103,  0.354,  0.022],  [0.5089,  0.354,  0.022],  [0.3968,  0.354,  0.022],  [0.2874,  0.354,  0.022]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  /* ⟨/np-live⟩ */
  /* ⟨ws-live⟩ 以下由 tivot_wan/bg_layer/war_live_batch.py --emit 自動產生，不要手改（改 war_live_cells.json 再重跑）*/
  ws_0_0_dusk: WS('ws_0_0_dusk', { bottom: 0.391, sun: false, sea: true, fireFree: [[0.74, 0.55, 0.0277], [0.2, 0.68, 0.0462]], plumes: { wind: -0.01881, src: [[0.7891,  0.3662,  0.1185],  [0.9505,  0.3916,  0.0833],  [0.8581,  0.3281,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_0_1_dusk: WS('ws_0_1_dusk', { bottom: 0.336, sun: false, sea: true, fireFree: [[0.83, 0.34, 0.0121], [0.1, 0.55, 0.0327]], plumes: { wind: -0.00568, src: [[0.4427,  0.2988,  0.0781],  [0.7318,  0.1953,  0.0651]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_0_2_dusk: WS('ws_0_2_dusk', { bottom: 0.321, sun: false, fireFree: [[0.88, 0.56, 0.0352], [0.12, 0.8, 0.0692]], plumes: { wind: 0.01169, src: [[0.7917,  0.3027,  0.0547]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_0_3_dusk: WS('ws_0_3_dusk', { bottom: 0.341, sun: false, fireFree: [[0.85, 0.42, 0.0177], [0.12, 0.6, 0.0387]], plumes: { wind: 0.00776, src: [[0.6484,  0.3184,  0.0768],  [0.569,  0.3428,  0.0716],  [0.6979,  0.2773,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_0_4_dusk: WS('ws_0_4_dusk', { bottom: 0.343, fireFree: [[0.3, 0.62, 0.0413], [0.18, 0.45, 0.0205]], plumes: { wind: 0.01206, src: [[0.2552,  0.3379,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_0_5_dusk: WS('ws_0_5_dusk', { bottom: 0.171, sun: false, fireFree: [[0.92, 0.55, 0.0445], [0.08, 0.6, 0.0502]] }),
  ws_0_6_dusk: WS('ws_0_6_dusk', { bottom: 0.245, fireFree: [[0.7, 0.58, 0.0433], [0.85, 0.45, 0.0285]], plumes: { wind: -0.01132, src: [[0.625,  0.1855,  0.0651]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_0_7_dusk: WS('ws_0_7_dusk', { bottom: 0.32, sun: false, fireFree: [[0.88, 0.6, 0.0404], [0.55, 0.45, 0.0225]], plumes: { wind: 0.00807, src: [[0.6068,  0.2559,  0.0599],  [0.5365,  0.3135,  0.0391],  [0.6589,  0.2832,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_0_8_dusk: WS('ws_0_8_dusk', { bottom: 0.296, sun: false, fireFree: [[0.72, 0.53, 0.0335], [0.15, 0.68, 0.0529]], plumes: { wind: 0.01223, src: [[0.4714,  0.3125,  0.138]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_0_9_dusk: WS('ws_0_9_dusk', { bottom: 0.338, sun: false, fireFree: [[0.9, 0.57, 0.035], [0.6, 0.47, 0.0231]], plumes: { wind: -0.00939, src: [[0.362,  0.4092,  0.0638],  [0.6628,  0.2598,  0.0599],  [0.7344,  0.2373,  0.0417]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_0_10_dusk: WS('ws_0_10_dusk', { bottom: 0.329, sun: false, fireFree: [[0.08, 0.6, 0.0397], [0.6, 0.52, 0.0296]], plumes: { wind: -0.01817, src: [[0.8438,  0.2803,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_1_0_dusk: WS('ws_1_0_dusk', { bottom: 0.251, sun: false, fireFree: [[0.82, 0.56, 0.0405], [0.3, 0.5, 0.0335]], haze: true, plumes: { wind: -0.01136, src: [[0.3411,  0.3701,  0.0859],  [0.5208,  0.2559,  0.0391],  [0.3906,  0.3184,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_1_2_dusk: WS('ws_1_2_dusk', { bottom: 0.142, sun: false, fireFree: [[0.85, 0.6, 0.0518], [0.45, 0.5, 0.0409]], haze: true, plumes: { wind: 0.01552, src: [[0.5547,  0.3301,  0.0573],  [0.4635,  0.2881,  0.0391],  [0.5951,  0.3115,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_1_4_dusk: WS('ws_1_4_dusk', { bottom: 0.24, sun: false, fireFree: [[0.75, 0.65, 0.0523], [0.25, 0.55, 0.0401]], haze: true, plumes: { wind: 0.01381, src: [[0.4049,  0.2734,  0.0781],  [0.7031,  0.2861,  0.0677],  [0.4987,  0.2754,  0.0534]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_1_6_dusk: WS('ws_1_6_dusk', { bottom: 0.193, sun: false, fireFree: [[0.88, 0.63, 0.0525], [0.2, 0.53, 0.0409]], haze: true }),
  ws_1_8_dusk: WS('ws_1_8_dusk', { bottom: 0.243, sun: false, fireFree: [[0.88, 0.62, 0.0484], [0.55, 0.5, 0.0341]], haze: true, plumes: { wind: -0.01878, src: [[0.7161,  0.3682,  0.1354]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_1_10_dusk: WS('ws_1_10_dusk', { bottom: 0.245, sun: false, fireFree: [[0.8, 0.58, 0.0433], [0.15, 0.45, 0.0285]], haze: true, plumes: { wind: 0.01055, src: [[0.3464,  0.2686,  0.0846],  [0.1615,  0.2754,  0.0417]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_2_1_dusk: WS('ws_2_1_dusk', { bottom: 0.227, sun: false, fireFree: [[0.08, 0.55, 0.0409], [0.9, 0.6, 0.0469]], haze: true, plumes: { wind: 0.00776, src: [[0.138,  0.2422,  0.1263],  [0.3255,  0.2627,  0.0391],  [0.0573,  0.2471,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_2_2_dusk: WS('ws_2_2_dusk', { bottom: 0.224, sun: false, fireFree: [[0.2, 0.57, 0.0435], [0.75, 0.57, 0.0435]], haze: true }),
  ws_2_4_dusk: WS('ws_2_4_dusk', { bottom: 0.171, sun: false, fireFree: [[0.55, 0.5, 0.0391], [0.15, 0.62, 0.0526]], haze: true }),
  ws_2_5_dusk: WS('ws_2_5_dusk', { bottom: 0.214, sun: false, fireFree: [[0.1, 0.6, 0.0477], [0.88, 0.58, 0.0453]], haze: true, plumes: { wind: 0.00807, src: [[0.6641,  0.3779,  0.0794],  [0.7188,  0.2598,  0.0391],  [0.5469,  0.3906,  0.0391],  [0.5143,  0.3799,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_2_6_dusk: WS('ws_2_6_dusk', { bottom: 0.092, sun: false, fireFree: [[0.2, 0.62, 0.0565], [0.45, 0.62, 0.0565]], haze: true }),
  ws_2_7_dusk: WS('ws_2_7_dusk', { bottom: 0.163, sun: false, fireFree: [[0.1, 0.55, 0.045], [0.85, 0.6, 0.0507]], haze: true, plumes: { wind: -0.00939, src: [[0.5612,  0.2598,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_2_8_dusk: WS('ws_2_8_dusk', { bottom: 0.072, sun: false, fireFree: [[0.85, 0.6, 0.0552], [0.12, 0.65, 0.0606]], haze: true }),
  ws_2_9_dusk: WS('ws_2_9_dusk', { bottom: 0.218, sun: false, fireFree: [[0.12, 0.52, 0.0381], [0.85, 0.55, 0.0415]], haze: true, plumes: { wind: 0.00627, src: [[0.6719,  0.3564,  0.0417],  [0.6146,  0.2246,  0.0391],  [0.8477,  0.2412,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_3_0_dusk: WS('ws_3_0_dusk', { bottom: 0.218, sun: false, fireFree: [[0.55, 0.55, 0.0415], [0.25, 0.45, 0.0305]], haze: true, plumes: { wind: 0.01552, src: [[0.0573,  0.4609,  0.0625],  [0.2344,  0.4004,  0.0781]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_3_2_dusk: WS('ws_3_2_dusk', { bottom: 0.236, sun: false, fireFree: [[0.55, 0.62, 0.0488], [0.3, 0.6, 0.0463]], haze: true, plumes: { wind: 0.01381, src: [[0.0964,  0.4434,  0.099],  [0.3464,  0.3379,  0.0951],  [0.4219,  0.2471,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_3_4_dusk: WS('ws_3_4_dusk', { bottom: 0.225, sun: false, fireFree: [[0.75, 0.55, 0.0411], [0.45, 0.5, 0.0354]], haze: true, plumes: { wind: 0.01614, src: [[0.1719,  0.3096,  0.125]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_3_6_dusk: WS('ws_3_6_dusk', { bottom: 0.215, sun: false, fireFree: [[0.6, 0.65, 0.0538], [0.4, 0.53, 0.0395]], haze: true, plumes: { wind: -0.01878, src: [[0.3073,  0.4014,  0.1042],  [0.5339,  0.2979,  0.1042]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_3_8_dusk: WS('ws_3_8_dusk', { bottom: 0.289, sun: false, fireFree: [[0.78, 0.6, 0.0427], [0.25, 0.5, 0.0306]], haze: true, plumes: { wind: 0.01254, src: [[0.2917,  0.2998,  0.1146],  [0.5339,  0.4238,  0.1016],  [0.1719,  0.2324,  0.0404]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_3_10_dusk: WS('ws_3_10_dusk', { bottom: 0.236, sun: false, fireFree: [[0.1, 0.55, 0.0403], [0.85, 0.55, 0.0403]], haze: true, plumes: { wind: -0.00992, src: [[0.2214,  0.2607,  0.0391],  [0.2552,  0.2822,  0.0391],  [0.1172,  0.3545,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_4_0_dusk: WS('ws_4_0_dusk', { bottom: 0.399, sun: false, fireFree: [[0.12, 0.65, 0.0409], [0.75, 0.58, 0.0309]], haze: true, water: { amp: 3, persp: 2, glint: 0.25 }, plumes: { wind: 0.01206, src: [[0.1849,  0.3906,  0.1432],  [0.6224,  0.4111,  0.0755],  [0.362,  0.3975,  0.0612]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_4_1_dusk: WS('ws_4_1_dusk', { bottom: 0.338, sun: false, fireFree: [[0.2, 0.55, 0.0325], [0.88, 0.6, 0.039]], haze: true, plumes: { wind: 0.00691, src: [[0.4766,  0.4023,  0.1432],  [0.7344,  0.4346,  0.0391],  [0.3594,  0.2998,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_4_2_dusk: WS('ws_4_2_dusk', { bottom: 0.255, sun: false, fireFree: [[0.12, 0.6, 0.0451], [0.85, 0.55, 0.039]], haze: true, plumes: { wind: -0.00566, src: [[0.6888,  0.3818,  0.0469],  [0.8255,  0.3027,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_4_3_dusk: WS('ws_4_3_dusk', { bottom: 0.231, sun: false, fireFree: [[0.15, 0.6, 0.0466], [0.88, 0.55, 0.0407]], haze: true, plumes: { wind: 0.00807, src: [[0.8203,  0.2637,  0.0807],  [0.6159,  0.3018,  0.0391],  [0.6432,  0.3301,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_4_4_dusk: WS('ws_4_4_dusk', { bottom: 0.349, sun: false, fireFree: [[0.15, 0.65, 0.045], [0.6, 0.6, 0.0381]], haze: true, plumes: { wind: 0.01223, src: [[0.4193,  0.2949,  0.0794],  [0.5378,  0.3721,  0.0625]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_4_5_dusk: WS('ws_4_5_dusk', { bottom: 0.24, sun: false, fireFree: [[0.1, 0.55, 0.0401], [0.9, 0.6, 0.0461]], haze: true, plumes: { wind: -0.00939, src: [[0.5885,  0.3223,  0.0599],  [0.3854,  0.248,  0.0469],  [0.4466,  0.2988,  0.0443]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_4_6_dusk: WS('ws_4_6_dusk', { bottom: 0.143, sun: false, fireFree: [[0.35, 0.62, 0.054], [0.85, 0.6, 0.0517]], haze: true }),
  ws_4_7_dusk: WS('ws_4_7_dusk', { bottom: 0.246, fireFree: [[0.1, 0.58, 0.0432], [0.88, 0.55, 0.0396]], haze: true, plumes: { wind: 0.00627, src: [[0.8438,  0.2334,  0.0391],  [0.7995,  0.2549,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_4_9_dusk: WS('ws_4_9_dusk', { bottom: 0.289, sun: false, fireFree: [[0.12, 0.55, 0.0365], [0.88, 0.55, 0.0365]], haze: true, plumes: { wind: -0.01017, src: [[0.6172,  0.3076,  0.0885],  [0.3333,  0.3008,  0.0391],  [0.6667,  0.3037,  0.0391],  [0.4922,  0.3047,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_4_10_dusk: WS('ws_4_10_dusk', { bottom: 0.127, sun: false, fireFree: [[0.4, 0.55, 0.0471], [0.1, 0.75, 0.07]], haze: true, plumes: { wind: 0.0157, src: [[0.901,  0.3682,  0.0391],  [0.931,  0.3848,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_5_0_dusk: WS('ws_5_0_dusk', { bottom: 0.222, sun: false, fireFree: [[0.4, 0.48, 0.0334], [0.85, 0.6, 0.0472]], haze: true, plumes: { wind: 0.01381, src: [[0.349,  0.2617,  0.1107],  [0.6042,  0.3594,  0.0703],  [0.6536,  0.3291,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_5_2_dusk: WS('ws_5_2_dusk', { bottom: 0.28, sun: false, fireFree: [[0.08, 0.65, 0.0499], [0.9, 0.55, 0.0371]], haze: true, plumes: { wind: 0.00807, src: [[0.7266,  0.4092,  0.0391],  [0.7969,  0.3252,  0.0391],  [0.7695,  0.3594,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_5_4_dusk: WS('ws_5_4_dusk', { bottom: 0.313, sun: false, fireFree: [[0.75, 0.62, 0.0436], [0.35, 0.55, 0.0346]], haze: true, plumes: { wind: -0.01878, src: [[0.4714,  0.3887,  0.0391],  [0.6771,  0.3809,  0.0651]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_5_6_dusk: WS('ws_5_6_dusk', { bottom: 0.363, sun: false, fireFree: [[0.75, 0.6, 0.0369], [0.25, 0.55, 0.0303]], haze: true, plumes: { wind: 0.01254, src: [[0.4036,  0.4629,  0.0859],  [0.1562,  0.3711,  0.0781]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_5_8_dusk: WS('ws_5_8_dusk', { bottom: 0.221, fireFree: [[0.85, 0.55, 0.0413], [0.35, 0.53, 0.0391]], haze: true, plumes: { wind: -0.02034, src: [[0.5807,  0.3174,  0.1224]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_5_10_dusk: WS('ws_5_10_dusk', { bottom: 0.311, sun: false, fireFree: [[0.85, 0.6, 0.0411], [0.25, 0.52, 0.0311]], haze: true, plumes: { wind: 0.01675, src: [[0.2799,  0.416,  0.0534]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_6_0_dusk: WS('ws_6_0_dusk', { bottom: 0.274, fireFree: [[0.12, 0.58, 0.0413], [0.55, 0.45, 0.0263]], haze: true, water: { amp: 3, persp: 2, glint: 0.25 }, plumes: { wind: -0.01132, src: [[0.5182,  0.2676,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_6_1_dusk: WS('ws_6_1_dusk', { bottom: 0.239, sun: false, fireFree: [[0.1, 0.62, 0.0486], [0.75, 0.58, 0.0437]], haze: true, plumes: { wind: 0.00807, src: [[0.6003,  0.4541,  0.0195]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_6_2_dusk: WS('ws_6_2_dusk', { bottom: 0.027, sun: false, fireFree: [[0.15, 0.55, 0.0522], [0.85, 0.55, 0.0522]], haze: true }),
  ws_6_3_dusk: WS('ws_6_3_dusk', { bottom: 0.316, sun: false, fireFree: [[0.08, 0.6, 0.0407], [0.65, 0.55, 0.0343]], haze: true, plumes: { wind: -0.00939, src: [[0.9115,  0.3232,  0.0417],  [0.7839,  0.3789,  0.0391],  [0.875,  0.3887,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_6_4_dusk: WS('ws_6_4_dusk', { bottom: 0.105, sun: false, fireFree: [[0.12, 0.58, 0.0515], [0.8, 0.58, 0.0515]], haze: true }),
  ws_6_5_dusk: WS('ws_6_5_dusk', { bottom: 0.129, sun: false, fireFree: [[0.1, 0.6, 0.0525], [0.88, 0.58, 0.0503]], haze: true, plumes: { wind: 0.00627, src: [[0.2904,  0.375,  0.1003],  [0.2227,  0.2939,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_6_6_dusk: WS('ws_6_6_dusk', { bottom: 0.108, sun: false, fireFree: [[0.12, 0.58, 0.0513], [0.8, 0.6, 0.0535]], haze: true }),
  ws_6_7_dusk: WS('ws_6_7_dusk', { bottom: 0.244, sun: false, fireFree: [[0.12, 0.6, 0.0458], [0.9, 0.6, 0.0458]], haze: true, plumes: { wind: -0.01017, src: [[0.5495,  0.2812,  0.0547],  [0.75,  0.3496,  0.0391],  [0.7786,  0.2617,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_6_8_dusk: WS('ws_6_8_dusk', { bottom: 0.068, sun: false, fireFree: [[0.1, 0.6, 0.0554], [0.6, 0.55, 0.0502]], haze: true, plumes: { wind: -0.01841, src: [[0.9635,  0.2393,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_6_9_dusk: WS('ws_6_9_dusk', { bottom: 0.221, sun: false, fireFree: [[0.15, 0.55, 0.0413], [0.85, 0.55, 0.0413]], haze: true, plumes: { wind: 0.01001, src: [[0.7214,  0.3086,  0.0846],  [0.4531,  0.251,  0.0417]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_7_0_dusk: WS('ws_7_0_dusk', { bottom: 0.285, sun: false, fireFree: [[0.75, 0.55, 0.0368], [0.12, 0.5, 0.0309]], haze: true, water: { amp: 3, persp: 2, glint: 0.25 }, plumes: { wind: 0.01614, src: [[0.1328,  0.3613,  0.0768],  [0.2005,  0.3623,  0.0638],  [0.3555,  0.3203,  0.0404],  [0.3151,  0.3613,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_7_2_dusk: WS('ws_7_2_dusk', { bottom: 0.364, sun: false, fireFree: [[0.85, 0.6, 0.0368], [0.3, 0.55, 0.0302]], haze: true, plumes: { wind: -0.01878, src: [[0.4427,  0.3867,  0.1042],  [0.362,  0.4658,  0.0677]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_7_4_dusk: WS('ws_7_4_dusk', { bottom: 0.205, sun: false, fireFree: [[0.75, 0.57, 0.0447], [0.15, 0.55, 0.0424]], haze: true, plumes: { wind: 0.01254, src: [[0.6042,  0.3857,  0.1068],  [0.6888,  0.4238,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_7_6_dusk: WS('ws_7_6_dusk', { bottom: 0.256, sun: false, fireFree: [[0.7, 0.6, 0.045], [0.2, 0.58, 0.0425]], haze: true, plumes: { wind: -0.02034, src: [[0.474,  0.3965,  0.1393],  [0.3216,  0.3818,  0.0846],  [0.2526,  0.2891,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_7_8_dusk: WS('ws_7_8_dusk', { bottom: 0.264, sun: false, fireFree: [[0.7, 0.6, 0.0445], [0.4, 0.53, 0.036]], haze: true, plumes: { wind: 0.02002, src: [[0.5065,  0.4258,  0.1003],  [0.0143,  0.252,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_8_0_dusk: WS('ws_8_0_dusk', { bottom: 0.389, sun: false, fireFree: [[0.6, 0.55, 0.0279], [0.1, 0.6, 0.0346]], haze: true, water: { amp: 3, persp: 2, glint: 0.25 }, plumes: { wind: 0.01223, src: [[0.888,  0.3887,  0.0859],  [0.9583,  0.3965,  0.0521],  [0.7917,  0.3184,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_8_1_dusk: WS('ws_8_1_dusk', { bottom: 0.208, sun: false, fireFree: [[0.12, 0.55, 0.0422], [0.9, 0.6, 0.0481]], haze: true, plumes: { wind: -0.00939, src: [[0.6068,  0.374,  0.1146],  [0.7656,  0.2783,  0.0417],  [0.7318,  0.2764,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_8_2_dusk: WS('ws_8_2_dusk', { bottom: 0.111, sun: false, fireFree: [[0.4, 0.55, 0.048], [0.8, 0.55, 0.048]], haze: true }),
  ws_8_3_dusk: WS('ws_8_3_dusk', { bottom: 0.232, sun: false, fireFree: [[0.12, 0.58, 0.0442], [0.88, 0.6, 0.0466]], haze: true, plumes: { wind: 0.00627, src: [[0.4635,  0.3623,  0.0794],  [0.3971,  0.2852,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_8_5_dusk: WS('ws_8_5_dusk', { bottom: 0.238, sun: false, fireFree: [[0.1, 0.62, 0.0487], [0.85, 0.6, 0.0462]], haze: true, plumes: { wind: -0.01017, src: [[0.6172,  0.2783,  0.0794],  [0.5182,  0.3867,  0.0534],  [0.8906,  0.2441,  0.0521],  [0.6693,  0.3262,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_8_6_dusk: WS('ws_8_6_dusk', { bottom: 0.114, sun: false, fireFree: [[0.6, 0.55, 0.0478], [0.15, 0.62, 0.0554]], haze: true }),
  ws_8_7_dusk: WS('ws_8_7_dusk', { bottom: 0.252, sun: false, fireFree: [[0.15, 0.6, 0.0453], [0.85, 0.58, 0.0428]], haze: true, plumes: { wind: 0.01001, src: [[0.2812,  0.2803,  0.1081],  [0.5911,  0.4346,  0.0573],  [0.2135,  0.2373,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_9_0_dusk: WS('ws_9_0_dusk', { bottom: 0.341, fireFree: [[0.82, 0.6, 0.0387], [0.15, 0.5, 0.0262]], haze: true, water: { amp: 3, persp: 2, glint: 0.25 }, plumes: { wind: -0.01878, src: [[0.1953,  0.3828,  0.0781],  [0.0234,  0.3867,  0.0456],  [0.5052,  0.3398,  0.0716]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_9_2_dusk: WS('ws_9_2_dusk', { bottom: 0.315, sun: false, fireFree: [[0.2, 0.55, 0.0344], [0.75, 0.55, 0.0344]], haze: true, plumes: { wind: 0.01254, src: [[0.4401,  0.332,  0.1432],  [0.2956,  0.4238,  0.1185],  [0.1771,  0.3896,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_9_4_dusk: WS('ws_9_4_dusk', { bottom: 0.262, sun: false, fireFree: [[0.85, 0.52, 0.035], [0.35, 0.5, 0.0327]], haze: true, plumes: { wind: -0.02034, src: [[0.2552,  0.2676,  0.1224],  [0.6393,  0.3408,  0.0938],  [0.5417,  0.3877,  0.0599],  [0.3359,  0.3262,  0.0573]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_9_6_dusk: WS('ws_9_6_dusk', { bottom: 0.312, sun: false, fireFree: [[0.85, 0.62, 0.0437], [0.5, 0.53, 0.0322]], haze: true, plumes: { wind: 0.02002, src: [[0.5794,  0.3242,  0.1406],  [0.401,  0.3711,  0.0807],  [0.7917,  0.2852,  0.069]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_10_0_dusk: WS('ws_10_0_dusk', { bottom: 0.372, sun: false, fireFree: [[0.85, 0.58, 0.0334], [0.15, 0.55, 0.0295]], haze: true, plumes: { wind: -0.00908, src: [[0.6745,  0.2686,  0.0703],  [0.0677,  0.3965,  0.0573],  [0.4779,  0.4053,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_10_1_dusk: WS('ws_10_1_dusk', { bottom: 0.24, sun: false, fireFree: [[0.88, 0.57, 0.0424], [0.3, 0.55, 0.0401]], haze: true, plumes: { wind: 0.00527, src: [[0.6341,  0.335,  0.0781],  [0.7109,  0.2637,  0.0625]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_10_3_dusk: WS('ws_10_3_dusk', { bottom: 0.238, sun: false, fireFree: [[0.15, 0.52, 0.0367], [0.88, 0.55, 0.0402]], haze: true, plumes: { wind: -0.00992, src: [[0.5339,  0.3096,  0.0625],  [0.5977,  0.335,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_10_4_dusk: WS('ws_10_4_dusk', { bottom: 0.23, sun: false, fireFree: [[0.12, 0.6, 0.0467], [0.9, 0.55, 0.0407]], haze: true, plumes: { wind: 0.00785, src: [[0.3359,  0.2373,  0.0885],  [0.4193,  0.3555,  0.0456],  [0.7031,  0.2656,  0.0391],  [0.668,  0.2959,  0.0391],  [0.2643,  0.2305,  0.0391]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  ws_10_5_dusk: WS('ws_10_5_dusk', { bottom: 0.137, fireFree: [[0.25, 0.55, 0.0465], [0.8, 0.55, 0.0465]], haze: true, plumes: { wind: 0.00837, src: [[0.4479,  0.4014,  0.0547]],
      cells: [[256,  119],  [256,  89],  [256,  112],  [256,  74],  [256,  120],  [256,  83],  [256,  105],  [256,  80]] } }),
  /* ⟨/ws-live⟩ */
};

/* 野外／遺蹟的雲改程式跑（11-24 Ray：「其他還在跑影片的雲也改成程式跑」）：地面照舊播原本的影片（樹葉／布／水的動態留著），
   天空那一塊換成程式天空＋遠中近三層程式雲（同守城戰 LIVE 那一套）。原本這格有別的程式層（水面、落水）照留，只換掉 sky。 */
const CLOUD_LIVE = {
  /* ⟨cloud-live⟩ 以下由 tools/anim/bg_layer/cloud_live_batch.py --emit 自動產生，不要手改 */
  belisar_draincliff_day: LIVE('belisar/live/')('belisar_draincliff_day', { bottom: 0.256, sun: false }).sky,
  belisar_exterior_day: LIVE('belisar/live/')('belisar_exterior_day', { bottom: 0.347, sun: false }).sky,
  belisar_greatcourt_day: LIVE('belisar/live/')('belisar_greatcourt_day', { bottom: 0.226, sun: false }).sky,
  canyon_altar_day: LIVE('canyon/live/')('canyon_altar_day', { bottom: 0.07, sun: false }).sky,
  canyon_bones_day: LIVE('canyon/live/')('canyon_bones_day', { bottom: 0.107, sun: false }).sky,
  canyon_bridge_day: LIVE('canyon/live/')('canyon_bridge_day', { bottom: 0.061, sun: false }).sky,
  canyon_corridor_day: LIVE('canyon/live/')('canyon_corridor_day', { bottom: 0.278, sun: false }).sky,
  canyon_entry_day: LIVE('canyon/live/')('canyon_entry_day', { bottom: 0.289, sun: false }).sky,
  capital_church_dawn: LIVE('capital/live/')('capital_church_dawn', { bottom: 0.394, sun: false }).sky,
  capital_church_day: LIVE('capital/live/')('capital_church_day', { bottom: 0.396, sun: false }).sky,
  capital_church_dusk: LIVE('capital/live/')('capital_church_dusk', { bottom: 0.395, sun: false }).sky,
  capital_church_midnight: LIVE('capital/live/')('capital_church_midnight', { bottom: 0.396, sun: false }).sky,
  capital_church_night: LIVE('capital/live/')('capital_church_night', { bottom: 0.395, sun: false }).sky,
  capital_cityhall_dawn: LIVE('capital/live/')('capital_cityhall_dawn', { bottom: 0.388 }).sky,
  capital_cityhall_day: LIVE('capital/live/')('capital_cityhall_day', { bottom: 0.388, sun: false }).sky,
  capital_cityhall_dusk: LIVE('capital/live/')('capital_cityhall_dusk', { bottom: 0.388 }).sky,
  capital_cityhall_midnight: LIVE('capital/live/')('capital_cityhall_midnight', { bottom: 0.387, sun: false }).sky,
  capital_cityhall_night: LIVE('capital/live/')('capital_cityhall_night', { bottom: 0.385, sun: false }).sky,
  capital_dock_battle: LIVE('capital/live/')('capital_dock_battle', { bottom: 0.339, sun: false }).sky,
  capital_dock_dawn: LIVE('capital/live/')('capital_dock_dawn', { bottom: 0.402, sun: false }).sky,
  capital_dock_day: LIVE('capital/live/')('capital_dock_day', { bottom: 0.399, sun: false }).sky,
  capital_dock_dusk: LIVE('capital/live/')('capital_dock_dusk', { bottom: 0.382 }).sky,
  capital_dock_night: LIVE('capital/live/')('capital_dock_night', { bottom: 0.401, sun: false }).sky,
  capital_downtown_battle: LIVE('capital/live/')('capital_downtown_battle', { bottom: 0.266, sun: false }).sky,
  capital_downtown_dawn: LIVE('capital/live/')('capital_downtown_dawn', { bottom: 0.347, sun: false }).sky,
  capital_downtown_day: LIVE('capital/live/')('capital_downtown_day', { bottom: 0.346, sun: false }).sky,
  capital_downtown_dusk: LIVE('capital/live/')('capital_downtown_dusk', { bottom: 0.367 }).sky,
  capital_downtown_fight: LIVE('capital/live/')('capital_downtown_fight', { bottom: 0.189, sun: false }).sky,
  capital_downtown_midnight: LIVE('capital/live/')('capital_downtown_midnight', { bottom: 0.335, sun: false }).sky,
  capital_downtown_night: LIVE('capital/live/')('capital_downtown_night', { bottom: 0.354, sun: false }).sky,
  capital_midtown_dawn: LIVE('capital/live/')('capital_midtown_dawn', { bottom: 0.308, sun: false }).sky,
  capital_midtown_day: LIVE('capital/live/')('capital_midtown_day', { bottom: 0.308, sun: false }).sky,
  capital_midtown_dusk: LIVE('capital/live/')('capital_midtown_dusk', { bottom: 0.306 }).sky,
  capital_midtown_midnight: LIVE('capital/live/')('capital_midtown_midnight', { bottom: 0.307 }).sky,
  capital_midtown_night: LIVE('capital/live/')('capital_midtown_night', { bottom: 0.306 }).sky,
  capital_outskirts_dusk: LIVE('capital/live/')('capital_outskirts_dusk', { bottom: 0.456 }).sky,
  capital_square_battle: LIVE('capital/live/')('capital_square_battle', { bottom: 0.223, sun: false }).sky,
  capital_square_dawn: LIVE('capital/live/')('capital_square_dawn', { bottom: 0.327, sun: false }).sky,
  capital_square_day: LIVE('capital/live/')('capital_square_day', { bottom: 0.326, sun: false }).sky,
  capital_square_dusk: LIVE('capital/live/')('capital_square_dusk', { bottom: 0.328 }).sky,
  capital_square_fight: LIVE('capital/live/')('capital_square_fight', { bottom: 0.221, sun: false }).sky,
  capital_square_midnight: LIVE('capital/live/')('capital_square_midnight', { bottom: 0.326 }).sky,
  capital_square_night: LIVE('capital/live/')('capital_square_night', { bottom: 0.327, sun: false }).sky,
  capital_uptown_battle: LIVE('capital/live/')('capital_uptown_battle', { bottom: 0.211, sun: false }).sky,
  capital_uptown_dawn: LIVE('capital/live/')('capital_uptown_dawn', { bottom: 0.156, sun: false }).sky,
  capital_uptown_day: LIVE('capital/live/')('capital_uptown_day', { bottom: 0.154, sun: false }).sky,
  capital_uptown_dusk: LIVE('capital/live/')('capital_uptown_dusk', { bottom: 0.154, sun: false }).sky,
  capital_uptown_fight: LIVE('capital/live/')('capital_uptown_fight', { bottom: 0.107, sun: false }).sky,
  capital_uptown_midnight: LIVE('capital/live/')('capital_uptown_midnight', { bottom: 0.154, sun: false }).sky,
  capital_uptown_night: LIVE('capital/live/')('capital_uptown_night', { bottom: 0.155, sun: false }).sky,
  dunmor_boglane: LIVE('dunmor/live/')('dunmor_boglane', { bottom: 0.271, sun: false }).sky,
  dunmor_hallcourt: LIVE('dunmor/live/')('dunmor_hallcourt', { bottom: 0.163, sun: false }).sky,
  dunmor_henge: LIVE('dunmor/live/')('dunmor_henge', { bottom: 0.196, sun: false }).sky,
  dunmor_kilnyard: LIVE('dunmor/live/')('dunmor_kilnyard', { bottom: 0.275, sun: false }).sky,
  fallen_altar_day: LIVE('fallen/live/')('fallen_altar_day', { bottom: 0.217, sun: false }).sky,
  fallen_basin_day: LIVE('fallen/live/')('fallen_basin_day', { bottom: 0.17, sun: false }).sky,
  fallen_causeway_day: LIVE('fallen/live/')('fallen_causeway_day', { bottom: 0.352, sun: false }).sky,
  fallen_entry_day: LIVE('fallen/live/')('fallen_entry_day', { bottom: 0.21, sun: false }).sky,
  fallen_fork_day: LIVE('fallen/live/')('fallen_fork_day', { bottom: 0.225, sun: false }).sky,
  lake_causeway_day: LIVE('lake/live/')('lake_causeway_day', { bottom: 0.084, sun: false }).sky,
  lake_deadfall_day: LIVE('lake/live/')('lake_deadfall_day', { bottom: 0.114, sun: false }).sky,
  lake_eastshore_day: LIVE('lake/live/')('lake_eastshore_day', { bottom: 0.085, sun: false }).sky,
  lake_grove_day: LIVE('lake/live/')('lake_grove_day', { bottom: 0.138, sun: false }).sky,
  lake_inlet_day: LIVE('lake/live/')('lake_inlet_day', { bottom: 0.163, sun: false }).sky,
  lake_northshore_day: LIVE('lake/live/')('lake_northshore_day', { bottom: 0.079, sun: false }).sky,
  plains_beacon_day: LIVE('plains/live/')('plains_beacon_day', { bottom: 0.366, sun: false }).sky,
  plains_cairn_day: LIVE('plains/live/')('plains_cairn_day', { bottom: 0.3, sun: false }).sky,
  plains_deadwood_day: LIVE('plains/live/')('plains_deadwood_day', { bottom: 0.344, sun: false }).sky,
  plains_entry_day: LIVE('plains/live/')('plains_entry_day', { bottom: 0.223, sun: false }).sky,
  plains_scree_day: LIVE('plains/live/')('plains_scree_day', { bottom: 0.131, sun: false }).sky,
  plains_sea_day: LIVE('plains/live/')('plains_sea_day', { bottom: 0.215, sun: false }).sky,
  plains_stone_day: LIVE('plains/live/')('plains_stone_day', { bottom: 0.221, sun: false }).sky,
  plains_well_day: LIVE('plains/live/')('plains_well_day', { bottom: 0.209, sun: false }).sky,
  plains_windrock_day: LIVE('plains/live/')('plains_windrock_day', { bottom: 0.359, sun: false }).sky,
  sofiaout_terrace: LIVE('sofia/live/')('sofiaout_terrace', { bottom: 0.293, sun: false }).sky,
  /* ⟨/cloud-live⟩ */
};
for (const k in CLOUD_LIVE) BG_FX[k] = Object.assign({}, BG_FX[k], { sky: CLOUD_LIVE[k] });

/* 劇情熄火（11-25 Ray：「北泊在戰完紫黑之翼後，背景的火都拿掉」）：那支旗立了，這些格的程式火＋火堆冒的煙一律不畫。
   紫黑之翼＝北泊教堂那一場的紫黑之爪（battle np_claws），旗＝那一段整段演完才記的 np_claws_done。
   ⚠ 鐵律 8：任何要拿背景程式層的地方一律問 bgFxOf，不要直接讀 BG_FX[stem]（審閱頁例外：它要看到所有層）。
   ⚠ 只管程式層：底圖本身畫死的火拿不掉。城區的煙柱（plumes）不是火，照留。 */
export const FIRE_OUT = [{ prefix: 'northport_', flag: 'np_claws_done' }];
const _noFire = {};
export function bgFxOf(stem, hasFlag) {
  const s = BG_FX[stem];
  if (!s || !(s.fire || s.fireSmoke)) return s || null;
  if (!FIRE_OUT.some(r => stem.startsWith(r.prefix) && hasFlag(r.flag))) return s;
  return _noFire[stem] || (_noFire[stem] = Object.assign({}, s, { fire: undefined, fireSmoke: undefined }));   // 快取：同一格每次回同一個物件（story 用物件比對判斷要不要重建）
}
