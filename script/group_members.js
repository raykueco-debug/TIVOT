/* ══ 群戰分層 → 原立繪的對位表（ver -2623）══ 自動產生，不要手改：`py tools/group_member_map.py`
   每一層是哪一隻怪（stem＝動畫表的鑰匙）、立繪畫布 → 分層畫布的 map:[k, ox, oy, flip]（flip＝分層左右翻過）。
   用在 `modules/enemy.js` 的群戰逐人動畫（待機／攻擊／延時／點錯照 stem 查 config 的 ENEMY_* 表）。 */
export const GROUP_MEMBERS = {
  "resources/enemy/canyon_swarm/fly2/": {
    1: {"stem": "mon_canyon_coffinbeetle_dark", "map": [0.5352, 489.2, 51.3, 0], "canvas": [1536, 1024], "err": 0.024},
    2: {"stem": "mon_canyon_bellmite_dark", "map": [0.3565, 231.1, 415.2, 0], "canvas": [1536, 1024], "err": 0.015},
    3: {"stem": "mon_canyon_bellmite_dark", "map": [0.3565, 938.8, 415.2, 1], "canvas": [1536, 1024], "err": 0.015},
    4: {"stem": "mon_canyon_bonecrow_dark", "map": [0.334, 596.6, 226.0, 0], "canvas": [1536, 1024], "err": 0.02},
  },
  "resources/enemy/canyon_swarm/fly3/": {
    1: {"stem": "mon_canyon_bonecrab_dark", "map": [0.5324, 494.9, 50.8, 0], "canvas": [1536, 1024], "err": 0.01},
    2: {"stem": "mon_canyon_chainhound_dark", "map": [0.4872, 203.0, 324.1, 0], "canvas": [1536, 1024], "err": 0.016},
    3: {"stem": "mon_canyon_lanternimp_dark", "map": [0.2851, 929.7, 535.3, 1], "canvas": [1536, 1024], "err": 0.035},
  },
  "resources/enemy/canyon_swarm/fly4/": {
    1: {"stem": "mon_canyon_pilgrimmass_dark", "map": [0.5216, 500.5, 61.0, 0], "canvas": [1536, 1024], "err": 0.025},
    2: {"stem": "mon_canyon_crawler_dark", "map": [0.3772, 185.4, 366.3, 0], "canvas": [1536, 1024], "err": 0.044},
    3: {"stem": "mon_canyon_lanternimp_dark", "map": [0.2621, 1018.8, 499.4, 1], "canvas": [1536, 1024], "err": 0.018},
    4: {"stem": "mon_canyon_lanternimp_dark", "map": [0.2962, 445.7, 559.2, 0], "canvas": [1536, 1024], "err": 0.013},
    5: {"stem": "mon_canyon_bonecrow_dark", "map": [0.334, 765.3, 226.0, 1], "canvas": [1536, 1024], "err": 0.02},
  },
  "resources/enemy/canyon_swarm/fly5/": {
    1: {"stem": "mon_canyon_bellwyrm_dark", "map": [0.5212, 500.4, 62.0, 0], "canvas": [1536, 1024], "err": 0.014},
    2: {"stem": "mon_canyon_chainhound_dark", "map": [0.4567, 172.6, 312.6, 0], "canvas": [1536, 1024], "err": 0.043},
    3: {"stem": "mon_canyon_chainhound_dark", "map": [0.4567, 894.7, 312.6, 1], "canvas": [1536, 1024], "err": 0.024},
    4: {"stem": "mon_canyon_bonecrow_dark", "map": [0.334, 596.6, 226.0, 0], "canvas": [1536, 1024], "err": 0.02},
  },
  "resources/enemy/canyon_swarm/fly6/": {
    1: {"stem": "mon_canyon_saintvulture_dark", "map": [0.5192, 502.2, 63.0, 0], "canvas": [1536, 1024], "err": 0.027},
    2: {"stem": "mon_canyon_bonecrow_dark", "map": [0.302, 259.6, 180.1, 0], "canvas": [1536, 1024], "err": 0.025},
    3: {"stem": "mon_canyon_bonecrow_dark", "map": [0.302, 966.2, 180.1, 1], "canvas": [1536, 1024], "err": 0.025},
    4: {"stem": "mon_canyon_crawler_dark", "map": [0.4262, 543.6, 409.0, 0], "canvas": [1536, 1024], "err": 0.01},
  },
  "resources/enemy/canyon_swarm/fly7/": {
    1: {"stem": "mon_canyon_ironpenitent_neutral", "map": [0.5762, 462.3, 21.1, 0], "canvas": [1536, 1024], "err": 0.015},
    2: {"stem": "mon_canyon_chainhound_dark", "map": [0.4472, 147.7, 305.2, 0], "canvas": [1536, 1024], "err": 0.041},
    3: {"stem": "mon_canyon_crawler_dark", "map": [0.3772, 964.3, 366.3, 1], "canvas": [1536, 1024], "err": 0.042},
    4: {"stem": "mon_canyon_lanternimp_dark", "map": [0.2962, 445.7, 559.2, 0], "canvas": [1536, 1024], "err": 0.013},
    5: {"stem": "mon_canyon_bellmite_dark", "map": [0.3941, 735.1, 454.0, 1], "canvas": [1536, 1024], "err": 0.02},
  },
  "resources/enemy/canyon_swarm/fly8/": {
    1: {"stem": "mon_canyon_ribcage_dark", "map": [0.5278, 494.9, 59.8, 0], "canvas": [1536, 1024], "err": 0.03},
    2: {"stem": "mon_canyon_bellmite_dark", "map": [0.38, 265.1, 433.9, 0], "canvas": [1536, 1024], "err": 0.022},
    3: {"stem": "mon_canyon_chainhound_dark", "map": [0.4872, 833.1, 324.1, 1], "canvas": [1536, 1024], "err": 0.016},
  },
  "resources/enemy/canyon_swarm/fly9/": {
    1: {"stem": "mon_canyon_stilt_neutral", "map": [0.5349, 489.4, 45.4, 0], "canvas": [1536, 1024], "err": 0.027},
    2: {"stem": "mon_canyon_lanternimp_dark", "map": [0.268, 275.7, 510.4, 0], "canvas": [1536, 1024], "err": 0.018},
    3: {"stem": "mon_canyon_crawler_dark", "map": [0.386, 928.9, 374.8, 1], "canvas": [1536, 1024], "err": 0.019},
    4: {"stem": "mon_canyon_bonecrow_dark", "map": [0.334, 596.6, 226.0, 0], "canvas": [1536, 1024], "err": 0.02},
  },
  "resources/enemy/canyon_swarm/fly10/": {
    1: {"stem": "mon_canyon_censer_dark", "map": [0.5264, 498.2, 55.7, 0], "canvas": [1536, 1024], "err": 0.01},
    2: {"stem": "mon_canyon_bellmite_dark", "map": [0.3495, 204.7, 406.1, 0], "canvas": [1536, 1024], "err": 0.035},
    3: {"stem": "mon_canyon_chainhound_dark", "map": [0.4472, 930.4, 305.2, 1], "canvas": [1536, 1024], "err": 0.041},
    4: {"stem": "mon_canyon_chainhound_dark", "map": [0.5052, 332.0, 340.0, 0], "canvas": [1536, 1024], "err": 0.015},
    5: {"stem": "mon_canyon_lanternimp_dark", "map": [0.2962, 786.0, 559.2, 1], "canvas": [1536, 1024], "err": 0.013},
  },
  "resources/enemy/canyon_swarm/fly11/": {
    1: {"stem": "mon_canyon_hanged_dark", "map": [0.5257, 498.3, 62.0, 0], "canvas": [1536, 1024], "err": 0.014},
    2: {"stem": "mon_canyon_crawler_dark", "map": [0.4101, 244.6, 390.7, 0], "canvas": [1536, 1024], "err": 0.028},
    3: {"stem": "mon_canyon_bonecrow_dark", "map": [0.3208, 910.6, 204.0, 1], "canvas": [1536, 1024], "err": 0.036},
  },
  "resources/enemy/canyon_swarm/fly12/": {
    1: {"stem": "mon_canyon_houndbeast", "map": [0.5341, 492.2, 50.2, 0], "canvas": [1536, 1024], "err": 0.024},
    2: {"stem": "mon_canyon_chainhound_dark", "map": [0.4567, 172.6, 312.6, 0], "canvas": [1536, 1024], "err": 0.043},
    3: {"stem": "mon_canyon_lanternimp_dark", "map": [0.268, 984.8, 510.4, 1], "canvas": [1536, 1024], "err": 0.018},
    4: {"stem": "mon_canyon_bonecrow_dark", "map": [0.334, 596.6, 226.0, 0], "canvas": [1536, 1024], "err": 0.02},
  },
};
