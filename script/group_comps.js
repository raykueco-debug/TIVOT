/* ══ 群戰編組（ver -2635，Ray：「做一個編輯器 可以點選放山谷的所有怪進去 然後調整大小跟位置 並播放攻擊動畫」）══
   鑰匙＝敵人卡鑰匙（卡上寫 `group:{ comp:'<鑰匙>' }` 就照這裡擺）。每一組：
     canvas  畫布大小（＝舊分層圖的大小 1536×1024；遊戲照卡的取景把它鋪進敵人區）
     members 由後往前：{ stem 立繪檔名（resources/enemy/<stem>.webp，也是動畫表的鑰匙）, k 縮放, x/y 立繪左上角在畫布上的位置,
             flip 1＝左右翻, air 1＝飛在空中（不畫接地影子） }
   ⚠ 由編輯器 tools/group_editor.html 存檔寫回（devserver `/__gcomp`，整段 JSON 重寫）；手改也行，格式照上。 */
export const GROUP_COMPS = /*GCOMP*/{
 "canyon_mix2": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_houndbeast",
    "k": 0.5335,
    "x": 776.3,
    "y": -282.9
   },
   {
    "stem": "mon_canyon_lanternimp_dark",
    "k": 0.3333,
    "x": 895.9,
    "y": 538.4
   },
   {
    "stem": "mon_canyon_hanged_dark",
    "k": 0.3333,
    "x": 295.5,
    "y": 2.6
   }
  ]
 },
 "canyon_mix3": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_bonecrab_dark",
    "k": 0.5324,
    "x": 494.9,
    "y": 50.8
   },
   {
    "stem": "mon_canyon_chainhound_dark",
    "k": 0.4872,
    "x": 203.0,
    "y": 324.1
   }
  ]
 },
 "canyon_mix4": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_pilgrimmass_dark",
    "k": 0.5216,
    "x": 500.5,
    "y": 61.0
   },
   {
    "stem": "mon_canyon_crawler_dark",
    "k": 0.3772,
    "x": 185.4,
    "y": 366.3
   },
   {
    "stem": "mon_canyon_bonecrow_dark",
    "k": 0.334,
    "x": 765.3,
    "y": 226.0,
    "flip": 1,
    "air": 1
   }
  ]
 },
 "canyon_mix5": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_bellwyrm_dark",
    "k": 0.5212,
    "x": 500.4,
    "y": 62.0
   },
   {
    "stem": "mon_canyon_chainhound_dark",
    "k": 0.4567,
    "x": 172.6,
    "y": 312.6
   },
   {
    "stem": "mon_canyon_bonecrow_dark",
    "k": 0.334,
    "x": 596.6,
    "y": 226.0,
    "air": 1
   }
  ]
 },
 "canyon_mix6": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_saintvulture_dark",
    "k": 0.5192,
    "x": 502.2,
    "y": 63.0
   },
   {
    "stem": "mon_canyon_bonecrow_dark",
    "k": 0.302,
    "x": 259.6,
    "y": 180.1,
    "air": 1
   },
   {
    "stem": "mon_canyon_bonecrow_dark",
    "k": 0.302,
    "x": 966.2,
    "y": 180.1,
    "flip": 1,
    "air": 1
   },
   {
    "stem": "mon_canyon_crawler_dark",
    "k": 0.4262,
    "x": 543.6,
    "y": 409.0
   }
  ]
 },
 "canyon_mix7": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_ironpenitent_neutral",
    "k": 0.5762,
    "x": 462.3,
    "y": 21.1
   },
   {
    "stem": "mon_canyon_lanternimp_dark",
    "k": 0.2962,
    "x": 445.7,
    "y": 559.2
   }
  ]
 },
 "canyon_mix8": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_ribcage_dark",
    "k": 0.5278,
    "x": 494.9,
    "y": 59.8
   },
   {
    "stem": "mon_canyon_bellmite_dark",
    "k": 0.38,
    "x": 265.1,
    "y": 433.9
   }
  ]
 },
 "canyon_mix9": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_stilt_neutral",
    "k": 0.5349,
    "x": 489.4,
    "y": 45.4
   },
   {
    "stem": "mon_canyon_lanternimp_dark",
    "k": 0.268,
    "x": 275.7,
    "y": 510.4
   },
   {
    "stem": "mon_canyon_bonecrow_dark",
    "k": 0.334,
    "x": 596.6,
    "y": 226.0,
    "air": 1
   }
  ]
 },
 "canyon_mix10": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_censer_dark",
    "k": 0.5264,
    "x": 498.2,
    "y": 55.7
   }
  ]
 },
 "canyon_mix11": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_hanged_dark",
    "k": 0.5257,
    "x": 498.3,
    "y": 62.0
   },
   {
    "stem": "mon_canyon_crawler_dark",
    "k": 0.4101,
    "x": 244.6,
    "y": 390.7
   },
   {
    "stem": "mon_canyon_bonecrow_dark",
    "k": 0.3208,
    "x": 910.6,
    "y": 204.0,
    "flip": 1,
    "air": 1
   }
  ]
 },
 "canyon_mix12": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_houndbeast",
    "k": 0.5341,
    "x": 492.2,
    "y": 50.2
   },
   {
    "stem": "mon_canyon_bonecrow_dark",
    "k": 0.334,
    "x": 596.6,
    "y": 226.0,
    "air": 1
   }
  ]
 },
 "bg_canyon_corridor": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_coffinbeetle_dark",
    "k": 0.4561,
    "x": 660.5,
    "y": 375.9
   },
   {
    "stem": "mon_canyon_hanged_dark",
    "k": 0.3333,
    "x": 292.0,
    "y": -6.2
   },
   {
    "stem": "mon_canyon_lanternimp_dark",
    "k": 0.3333,
    "x": 323.3,
    "y": 517.5,
    "flip": 1
   }
  ]
 },
 "bg_canyon_entry": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_pilgrimmass_dark",
    "k": 0.4386,
    "x": 529.4,
    "y": 85.3
   },
   {
    "stem": "mon_canyon_bellmite_dark",
    "k": 0.3899,
    "x": 760.0,
    "y": 538.7
   },
   {
    "stem": "mon_canyon_bellmite_dark",
    "k": 0.3333,
    "x": 361.8,
    "y": 479.1,
    "flip": 1
   }
  ]
 },
 "bg_canyon_bones": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_houndbeast",
    "k": 0.4386,
    "x": 613.5,
    "y": 287.8
   },
   {
    "stem": "mon_canyon_censer_dark",
    "k": 0.3333,
    "x": 319.9,
    "y": 494.8
   },
   {
    "stem": "mon_canyon_bonecrab_dark",
    "k": 0.2436,
    "x": 993.8,
    "y": 511.1
   },
   {
    "stem": "mon_canyon_stilt_neutral",
    "k": 0.3333,
    "x": 604.4,
    "y": 578.6
   },
   {
    "stem": "mon_canyon_bonecrow_dark",
    "k": 0.3333,
    "x": 414.2,
    "y": 51.6
   }
  ]
 },
 "bg_canyon_bridge": {
  "canvas": [
   1536,
   1024
  ],
  "members": [
   {
    "stem": "mon_canyon_ironpenitent_neutral",
    "k": 0.577,
    "x": 314.0,
    "y": 6.5
   },
   {
    "stem": "mon_canyon_bellwyrm_dark",
    "k": 0.3333,
    "x": 885.5,
    "y": 508.8,
    "flip": 1
   },
   {
    "stem": "mon_canyon_saintvulture_dark",
    "k": 0.2082,
    "x": 1008.6,
    "y": 1.9,
    "flip": 1
   },
   {
    "stem": "mon_canyon_saintvulture_dark",
    "k": 0.2533,
    "x": 878.9,
    "y": 67.4,
    "flip": 1
   }
  ]
 }
}/*END*/;
