/* ══ 背景的程式層（ver -2621）══ 交件單：resources/background/anim/TO_CODE_bg_anim.md（11-13／11-14 那幾段）
   鑰匙＝**靜態背景的檔名**（小寫、不含副檔名），與 `script/bg_anim.js` 同一套 —— 畫面上換成哪一張靜態圖，就跑那一張的程式層。
   畫法在 `modules/bgfx.js`（鐵律 1：這裡只有資料；數值照交件單，單位註明以幾寬計）。
   欄位：
     base      底圖換成這一張（沒有影片時；光束／煙／水柱那幾格是「拿掉那個東西的底圖」）
     hideStatic 程式層第一格畫上去之前先藏起靜態圖（靜態圖構圖不一樣時用，不然會先閃一張別的構圖）
     water     平靜水面：{mask, amp, wave, speed, persp}（1536 寬計；預設 2.2／26／1.0／1.6）
     flow      落水亮條：{mask, speed}（768 寬計 px/s，預設 220）；每秒 12 格跳格
     mist      落點水霧：true＝從落水遮罩每一欄的最下緣取點
     spout     獅口水柱：{img, path, flow}
     beam      光束：{col:[r,g,b], amp}（amp＝最亮處加量 0~255，白天 106）
     smoke     硝坑的煙：true
     sky       天空層：{img, mask, clouds:[中景, 近景]}（影片的天空挖掉，透出靜態天空＋程式雲）
   ⚠ 檔案都在不會被同名覆蓋的 anim/ 底下；交新的就重跑 `py tools/bg_anim_index.py --check`（會驗這裡的路徑都在）。 */
const A = 'resources/background/anim/';
const CUMULUS = ['resources/background/sky_parallax/sky_cumulus_day_l1_mid.webp', 'resources/background/sky_parallax/sky_cumulus_day_l2_near.webp'];
const PURPLE = ['resources/background/_sky_layers/purple_l1_mid.webp', 'resources/background/_sky_layers/purple_l2_near.webp'];
const W = (mask, o) => Object.assign({ mask: A + mask }, o || {});
const F = (mask, o) => Object.assign({ mask: A + mask }, o || {});
const beam = (t, col, amp) => ({ base: A + 'ruins/ruins_shinier_corridora_' + t + '_nobeam.webp', beam: { col, amp } });

export const BG_FX = {
  /* ── 獅口水道（11-14 Ray 定案：整格靜態＋程式水柱）── */
  belisar_lionspout: {
    base: A + 'belisar/belisar_dragonrace_base_nospout.webp', hideStatic: true,
    water: W('belisar/belisar_dragonrace_base_watermask.png'),
    spout: { img: A + 'belisar/belisar_dragonrace_base_spout.png', path: A + 'belisar/belisar_dragonrace_base_spout_path.json', flow: A + 'belisar/belisar_dragonrace_base_flowmask.png' },
  },
  /* ── 落水（＋天空層）── */
  belisar_draincliff_day: { flow: F('belisar/belisar_draincliff_day_flowmask.png'),
    sky: { img: A + 'belisar/belisar_draincliff_day_sky.png', mask: A + 'belisar/belisar_draincliff_day_skymask.png', clouds: CUMULUS } },
  lake_cave_day: { flow: F('lake/lake_cave_day_flowmask.png', { speed: 420 }), mist: true },
  lake_fallbase_day: { water: W('lake/lake_fallbase_day_watermask.png'), flow: F('lake/lake_fallbase_day_flowmask.png'),
    sky: { img: A + 'lake/lake_fallbase_day_sky.png', mask: A + 'lake/lake_fallbase_day_skymask.png', clouds: CUMULUS } },
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
  /* ── 伊甸古墓　硝坑：坑底的煙（底圖是火把熄掉的那一張）── */
  tomb_nitrepit: { base: A + 'tomb/tomb_nitrepit_base_nofire.webp', smoke: true },
};
