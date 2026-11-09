# 敵人 ADMIRE 盤點（敵人動畫 session，2026-11-08）

> A＝攻擊　D＝延時　M＝點錯　I＝待機　R＝每段收回中立　E＝倒地
> 狀態只有三種：`✔ 不欠（理由）`／`⚠ 欠<什麼>`／`？ Ray 未定`（規格還沒人說要不要，不是欠，也不是不欠）。
> 出處：`config.js` 的 `ENEMY_IDLE／ATK／DELAY／MISS／ENTER`、`script/enemies.js` 183 張卡（node 實際載入比對）、`TO_CODE_attack.md`、`TO_CODE_skypirate.md`、`_neutral_refs/_progress.md`。
> ⚠ Ray 的 `敵人一覽_非空戰_動畫編排.xlsx`（E 編號、每隻表上寫的動作）**不在這台 3060 上**，下面用卡的鑰匙，編號只寫得出 TO_CODE 有記的那幾隻。
> ⚠ M：程式規則是「沒登記 `ENEMY_MISS` 就播 D」。Ray 明說共用的才標 ✔，其餘標 `？`。
> ⚠ E：單隻怪目前**沒有** E 的登記表也沒有規格（只有群戰的 `group.fall`），所以單隻的 E 一律 `？ Ray 未定`。

## 一、已有動作段的

| 卡 | 敵人 | I | A | D | M | R | E |
|---|---|---|---|---|---|---|---|
| `trainee` | 訓練用聖徒（新架勢） | ✔ `saint_tr_neutral2_idle_v1` | ✔ `saint_tr_neutral2_atk_v1` | ✔ 共用 A（DMA 共用，Ray 定） | ✔ 共用 A | ✔ 撤步（A 內含跳開＋落地） | ？ |
| `nightmare_natalia`／`dm_lost_guardian` E007／E008 | 禍魘娜塔莉 | ✔ `idle_v3` | ✔ `atk_v8`（含收回） | ✔ `delay_v1`（爪，含歸位） | ✔ 共用 D（Ray -2476「DM 都用爪擊」） | ✔ A、D 都含 BA 收回（R 類別沒指定，現況是 Wan BA） | ？ |
| `np_coralman` E017 | 魘魔 | ✔ `idle_v2`（⚠ 舊立繪生成，非中立重出） | ⚠ 欠 R：`atk_v1` 只有撲出段，停在撲擊姿勢 | ✔ `delay_v1`（尾格與首格差 8.8，算有回） | ？ | ⚠ 欠 A 的 R | ？ |
| `np_boss` E019 | 背負祭壇者 | ✔ `idle_v1` | ✔ `atk_v1`（tiger rule AB＋BA） | ✔ `delay_v2`（11-08 natali 重做：咆哮 AB＋收勢 BF＋FA，中立起手回中立） | ？ | ✔ A、D 都有收回 | ？ |
| `np_claws` | 紫黑之爪（安雅光翼） | ✔ `idle_v1` | ✔ `atk_v1` | ✔ `burst_v1` | ✔ `flap_v1`（唯一有獨立 M 的） | ✔ 三支都含回展翼 | ？（埋在瓦礫下，可能不需要） |
| `centipi` | 巨型蜈蚣（空戰） | — 飛行敵，不在本 session（Ray 11-08：「這裡不處理飛行敵」） | | | | | |
| `sf_lynx` E065 | 森林山貓 | ✔ `lynx_neutral_idle_v1` | ✔ `atk_v1`（撲擊 AB＋BA） | ✔ `delay_v1`（橫掃 AB＋BA） | ？ | ✔ tiger rule BA | ？ |
| `sf_snake` E066 | 淺灘水蛇 | ⚠ 欠 I：中立立繪的待機沒登記（`_progress` 說在 animechk 等 Ray 剪，檔案在另一台） | ✔ `atk_v1` | ✔ 共用 A（表上兩欄同為咬擊） | ？ | ✔ tiger rule BA | ？ |
| `sf_hog` E067 | 巨山豬 | ⚠ 欠 I：同上 | ✔ `atk_v1` | ✔ 共用 A（表上同為撞擊） | ？ | ✔ BA | ？ |
| `sf_tiger` E068 | 獨角虎王 | ✔ `tiger_neutral_idle_v1` | ✔ `atk_v4` | ✔ `delay_v3` | ？ | ✔ tiger rule BA | ？ |
| `sky_pirate_1`～`8` | 空賊 8 組 28 人 | ✔ `idle_v1`（Ray 11-08：可交件） | ⚠ 欠 A v2：`atk_v1` 自帶開槍火光不能用（Ray 11-08「現在的攻擊動畫都不能用」）→ 沿用 B、改提示詞重跑中（`out/pirate_atk_v4`） | ✔ 共用 A（Ray 定） | ✔ 共用 A | ✔ 倒放（Ray 定，不另交檔） | ✔ `hit_v1`（Ray 11-08：可交件，碰邊照用） |

## 二、做到一半（素材在、還沒交）—— 依 `_progress.md`（11-05）

| 卡 | 敵人 | 現況 |
|---|---|---|
| `sv_beast_shackle` E024 | 枷獸 | B 圖 `mon_beast_shackle_B_blur.png` 有；`blurAB`（7–14、22–25 格碰邊）＋`blurBA` 開給 Ray 看過，等他說動作 OK 就縮主體重跑 AB |
| `np_candletower` E015 | 禍魘祭司 | B `mon_relic_candletower_B_slash.png` 有；攻擊 `candletower_atk`（爪風是黑色漩渦）Ray 未回；表上延時＝同攻擊 |
| `np_candlepenitent` E016 | 罪之魔像 | B `mon_relic_candlepenitent_B_pounce.png` 有；延時 Ray 定了 `out/export/mon_relic_candlepenitent_delay_cut` 但**沒轉交件**；飄浮版待機／攻擊另一個 session 做過，在 animechk 等 Ray |
| `sv_wolf_pack` E021 | 狼骸群 | B `mon_wolf_pack_B_slash.png` 有，但當時 Ray 說跳過（GPT 不給出） |

⚠ 上表提到的 `out/enemy_atk/`、`out/export/*lynx*／*candlepenitent*` 以及工具 `atk_one.sh`／`edge_check.py`／`tiger_cut.py` **這台都沒有**（應該在 4070S 那台）。

## 三、只有待機的單隻怪（82 張卡）—— A／D／R ⚠ 欠，M ？，E ？

I 欄全部 ✔（已登記 ENEMY_IDLE）。⚠ 照 natali rule §1，原圖太動態的要先請 GPT 重出中立站姿，那時 I 也要用新 A 重做。

| 卡 | 敵人 | 立繪 | kind／atype |
|---|---|---|---|
| `misha` | 米夏 | `man_misha` | human／S |
| `np_reassembled` | 心魘 | `mon_relic_reassembled` | harm／P |
| `sv_beast_organ` | 裂肉獸 | `mon_beast_organ` | harm／P |
| `sv_stag` | 鹿骸 | `mon_stag_nightmare` | harm／P |
| `sv_bear` | 熊骸 | `mon_bear_nightmare` | harm／P |
| `sv_reliquary` | 聖骨獸 | `mon_beast_reliquary` | harm／D |
| `canyon_colossus` | 崩岩巨像 | `mon_canyon_colossus_dark` | harm／D |
| `sf_crows` | 食腐鴉群 | `mon_shinierforest_crows` | beast／S |
| `sf_deer_nightmare` | 變異樹靈鹿主 | `mon_shinierforest_deernightmare` | harm／P |
| `gk_seal` | 守墓者 | `mon_gravekeeper_seal` | multi／S |
| `gk_offset` | 守墓者 | `mon_gravekeeper_offset` | multi／D |
| `gk_many` | 守墓者 | `mon_gravekeeper_many` | multi／P |
| `gk_crypt` | 守墓者 | `mon_gravekeeper_crypt` | multi／P |
| `sf_bear_husk` | 熊骸 | `mon_bear_husk` | harm／P |
| `sf_bear_nightmare` | 夢魘熊骸 | `mon_bear_nightmare` | harm／P |
| `sf_stag_rot` | 腐鹿骸 | `mon_stag_rot` | harm／P |
| `sf_stag_nightmare` | 夢魘鹿骸 | `mon_stag_nightmare` | harm／P |
| `ruins_bonemaw` | 覆骨者 | `mon_beast_bonemaw` | harm／S |
| `ruins_bellreacher` | 鳴鐘者 | `mon_relic_bellreacher` | harm／D |
| `ruins_halo_ring` | 王的容器 | `mon_halo_ring` | harm／P |
| `ruins_heartripper` | 撕心者 | `mon_relic_heartripper` | harm／S |
| `ruins_bellwalker` | 喪鐘 | `mon_relic_bellwalker` | harm／D |
| `ruins_saint_prison` | 鎖鍊聖徒 | `mon_saint_prison` | slay／P |
| `ruins_saint_inspector` | 監查者 | `mon_saint_inspector` | slay／S |
| `ruins_saint_thug` | 巨型聖徒 | `mon_saint_thug` | slay／D |
| `ruins_saint_temperance` | 節制者 | `mon_saint_temperance` | slay／P |
| `bl_dragon_chase` | 王座徘徊者 | `mon_dragon_v1_shackled` | multi／D |
| `bl_dragon_throne` | 王座徘徊者 | `mon_dragon_v1_unsealed` | multi／P |
| `bl_dragon_throne2` | 王座徘徊者 | `mon_dragon_v1_unsealed` | multi／P |
| `bl_dragon_front` | 王座徘徊者 | `mon_dragon_v1_flight_side` | multi／S |
| `relic_mirrorchoir` | 鏡唱者 | `mon_relic_mirrorchoir` | harm／P |
| `relic_bellows` | 風箱懺者 | `mon_relic_bellows` | harm／P |
| `relic_confessional` | 告解者 | `mon_relic_confessional` | harm／P |
| `relic_hourglass` | 沙漏苦修者 | `mon_relic_hourglass` | harm／P |
| `relic_keyward` | 鑰匙守 | `mon_relic_keyward` | harm／P |
| `relic_lectern` | 讀經台 | `mon_relic_lectern` | harm／P |
| `relic_censerlung` | 香爐肺 | `mon_relic_censerlung` | harm／P |
| `relic_veilhands` | 帷幕手 | `mon_relic_veilhands` | harm／P |
| `relic_wheelpsalm` | 詩輪 | `mon_relic_wheelpsalm` | harm／P |
| `relic_chalice` | 聖爵溺者 | `mon_relic_chalice` | harm／P |
| `bug_mantis` | （待命名） | `mon_bug_mantis` | beast／S |
| `relic_bellascetic` | （待命名） | `mon_relic_bellascetic` | beast／S |
| `rictus_hooked` | （待命名） | `mon_rictus_hooked` | beast／D |
| `arch_warden` | 拱廊守衛 | `mon_arch_warden` | multi／D |
| `sarcoph_crawler` | 石棺爬行者 | `mon_sarcoph_crawler` | multi／D |
| `slab_creeper` | 石板匍匐者 | `mon_slab_creeper` | multi／D |
| `kneeling_penitent` | 跪拜的懺悔者 | `mon_kneeling_penitent` | multi／D |
| `chain_hanged` | 鎖鏈吊屍 | `mon_chain_hanged` | multi／S |
| `iron_maiden` | 鐵處女 | `mon_iron_maiden` | multi／P |
| `ossuary_rats` | 納骨鼠群 | `mon_ossuary_rats` | multi／S |
| `ossuary_wheel` | 納骨輪 | `mon_ossuary_wheel` | multi／S |
| `choir_organ` | 唱詩管風琴 | `mon_choir_organ` | multi／D |
| `choir_pale` | 蒼白唱詩者 | `mon_choir_pale` | multi／P |
| `bellfounder` | 鑄鐘者 | `mon_bellfounder` | multi／P |
| `grave_censer` | 墓香爐 | `mon_grave_censer` | multi／P |
| `candelabra_fiend` | 燭台魔 | `mon_candelabra_fiend` | multi／P |
| `reliquary_hand` | 聖匣之手 | `mon_reliquary_hand` | multi／P |
| `spiral_veil` | 螺旋帷幕 | `mon_spiral_veil` | multi／S |
| `shroud_widow` | 裹屍寡婦 | `mon_shroud_widow` | multi／P |
| `crypt_centipede` | 地穴蜈蚣 | `mon_crypt_centipede` | multi／D |
| `crypt_hound` | 地穴獵犬 | `mon_crypt_hound` | multi／S |
| `twin_skull_hound` | 雙頭骷髏犬 | `mon_twin_skull_hound` | multi／S |
| `vault_bat` | 穹頂蝙蝠 | `mon_vault_bat` | multi／S |
| `skull_cairn` | 顱石堆 | `mon_skull_cairn` | multi／P |
| `pall_bearers` | 抬棺列 | `mon_pall_bearers` | multi／D |
| `tomb_bear` | 墓熊 | `mon_tomb_bear` | multi／P |
| `pallid_stag` | 蒼白牡鹿 | `mon_pallid_stag` | multi／P |
| `gorge_toad` | 深喉蟾 | `mon_gorge_toad` | multi／P |
| `stone_adder` | 石蝰 | `mon_stone_adder` | multi／P |
| `dragon_throne_awakened` | 王座徘徊者 | `mon_dragon_throne_awakened` | multi／P |
| `dragon_throne_roar` | 王座徘徊者 | `mon_dragon_throne_roar` | multi／P |
| `saint_acolyte` | （待命名） | `mon_saint_acolyte` | slay／ |
| `saint_blade` | （待命名） | `mon_saint_blade` | slay／ |
| `saint_crawler` | （待命名） | `mon_saint_crawler` | slay／ |
| `saint_fist` | （待命名） | `mon_saint_fist` | slay／ |
| `saint_giant` | （待命名） | `mon_saint_giant` | slay／ |
| `saint_haloed` | （待命名） | `mon_saint_haloed` | slay／ |
| `saint_maw` | （待命名） | `mon_saint_maw` | slay／ |
| `saint_palmeye` | （待命名） | `mon_saint_palmeye` | slay／ |
| `saint_pillory` | （待命名） | `mon_saint_pillory` | slay／ |
| `saint_prayerhead` | （待命名） | `mon_saint_prayerhead` | slay／ |
| `ws_misha` | 米夏 | `man_misha` | human／S |

## 四、連待機都沒有的單隻（27 張卡）—— I／A／D／R ⚠ 欠（是否要做 ？ Ray 未定）

多半是人類立繪、劇情 CI 圖或 ph_ 系列。

| 卡 | 敵人 | 立繪 | kind／atype |
|---|---|---|---|
| `faceless` | 地下聖徒_A | `saint_ug_ci` | slay／D |
| `facelessgiant` | 巨型聖徒 | `saint_gt_ci` | slay／P |
| `man_sorana` | 森住民 | `man_sorana` | human／S |
| `intruderEnemy` | 亂入者 · ??? | `saint_ug_ci` | ／ |
| `witch` | 槍之魔女 | `gunwitch_boss_ci` | human／S |
| `nemo` | ？？？ | `man_nemo` | human／S |
| `vf_nemo` | 尼莫 | `man_nemo` | human／S |
| `cap_mage` | 愛里歐 | `mage_si_threat` | human／P |
| `guild_hunter` | 賞金獵人 | `npc_guildhunter_si_attack` | human／ |
| `bounty_ep` | 賞金獵人 | `man_bounty_ep` | human／ |
| `thug_pistol` | 里朋一家 | `man_thug_pistol` | human／ |
| `thug_rifle` | 里朋一家 | `man_thug_rifle` | human／ |
| `thug_dual` | 里朋一家 | `man_thug_dual` | human／ |
| `thug_shotgun` | 里朋一家 | `man_thug_shotgun` | human／ |
| `thug_lookout` | 里朋一家 | `man_thug_lookout` | human／ |
| `thug_boss` | 里朋一家 | `man_thug_boss` | human／ |
| `manu` | 馬努 | `man_thug_dual` | human／ |
| `sky_pirate_crew` | 空賊 | `man_bounty_ep` | human／ |
| `ph_sword_angel` | 執劍天使 | `ph_sword_angel` | harm／P |
| `ph_mercy_remnant` | 慈愛殘像 | `ph_mercy_remnant` | harm／P |
| `ph_gifted` | 才能祝福之人 | `ph_gifted` | harm／P |
| `ph_slaughter_witch` | 殺戮魔女 | `ph_slaughter_witch` | harm／P |
| `ph_hairbound` | 纏髮之人 | `ph_hairbound` | harm／P |
| `ph_coffin_bearer` | 負棺者 | `ph_coffin_bearer` | harm／P |
| `ph_greed` | 貪欲者 | `ph_greed` | harm／P |
| `ph_silent_waiter` | 靜默等待者 | `ph_silent_waiter` | harm／P |
| `ws_misha_ni` | 米夏 | `man_misha_ni` | human／S（⚠ 磁碟上有 `man_misha_ni_idle_v1`／`_s60`，但 ENEMY_IDLE 沒登記） |

## 五、群戰（分層）—— 空賊以外 I／A ？ Ray 未定

| 卡 | 敵人 | E |
|---|---|---|
| `misha_guards` | 親衛隊 | ✔ 已有 `group.fall` |
| `cap_guard_inn` | 教廷衛士 | ✔ 已有 `group.fall` |
| `cap_guard_uptown` | 教廷衛士 | ✔ 已有 `group.fall` |
| `cap_guard_square` | 教廷衛士・指揮官 | ✔ 已有 `group.fall` |
| `cap_guard_oldtown` | 教廷衛士 | ✔ 已有 `group.fall` |
| `canyon_mix2` | 禍魘大軍 | ⚠ 無倒地（禍魘大軍，是否要 ？） |
| `canyon_mix3` | 禍魘大軍 | ⚠ 無倒地（禍魘大軍，是否要 ？） |
| `canyon_mix4` | 禍魘大軍 | ⚠ 無倒地（禍魘大軍，是否要 ？） |
| `canyon_mix5` | 禍魘大軍 | ⚠ 無倒地（禍魘大軍，是否要 ？） |
| `canyon_mix6` | 禍魘大軍 | ⚠ 無倒地（禍魘大軍，是否要 ？） |
| `canyon_mix7` | 禍魘大軍 | ⚠ 無倒地（禍魘大軍，是否要 ？） |
| `canyon_mix8` | 禍魘大軍 | ⚠ 無倒地（禍魘大軍，是否要 ？） |
| `canyon_mix9` | 禍魘大軍 | ⚠ 無倒地（禍魘大軍，是否要 ？） |
| `canyon_mix10` | 禍魘大軍 | ⚠ 無倒地（禍魘大軍，是否要 ？） |
| `canyon_mix11` | 禍魘大軍 | ⚠ 無倒地（禍魘大軍，是否要 ？） |
| `canyon_mix12` | 禍魘大軍 | ⚠ 無倒地（禍魘大軍，是否要 ？） |
| `purple_squad_1` | 紫月軍 | ✔ 已有 `group.fall` |
| `purple_squad_2` | 紫月軍 | ✔ 已有 `group.fall` |
| `purple_squad_3` | 紫月軍 | ✔ 已有 `group.fall` |
| `purple_squad_4` | 紫月軍 | ✔ 已有 `group.fall` |
| `purple_squad_5` | 紫月軍 | ✔ 已有 `group.fall` |
| `purple_squad_6` | 紫月軍 | ✔ 已有 `group.fall` |
| `purple_squad_7` | 紫月軍 | ✔ 已有 `group.fall` |
| `thug_squad` | 里朋一家 | ✔ 已有 `group.fall` |
| `thug_squad_gate` | 里朋一家 | ✔ 已有 `group.fall` |
| `thug_squad_avenue` | 里朋一家 | ✔ 已有 `group.fall` |
| `thug_squad_forecourt` | 里朋一家 | ✔ 已有 `group.fall` |
| `thug_squad_carriage` | 里朋一家 | ✔ 已有 `group.fall` |
| `ws_guards` | 親衛隊 | ✔ 已有 `group.fall` |

## 六、不在本表

- 空戰／船（20 張，Ray 的編排表是「非空戰」）：`serpent`(I✔)、`sky_twinwyvern`、`sky_boneray`、`sky_ribwhale`(I✔)、`tree_dragon`(I✔)、`sky_mawbat`(I✔)、`sky_eyemoth`(I✔)、`sky_eelswarm`、`sky_gasjelly`、`sky_armorcrab`、`sky2_spine`(I✔)、`sky2_maskbanner`(I✔)、`sky2_ringchain`(I✔)、`sky2_mouthpillar`、`sky2_facecrown`、`sky2_eyeveil`、`sky2_rift`、`sky2_maw`、`pirate_ship`(I✔)、`bl_dragon_sky`(I✔) —— 飛行敵不在本 session 處理（Ray 11-08：「這裡不處理飛行敵」）。
- 靶子 `dart_target`／`sv_dart`：✔ 不欠（靶子不演動作）。

## 11-08 夜間進度（敵人動畫 session；Ray 睡前「晚上不要停，排程跑完」）

**只做到「出 KF 待審」，沒有一張進 Wan**（natali §9）。Ray 11-08 夜：「怪先做man以外的　獸型走tiger rule 其他先走natali」。⚠ Ray 的動畫編排 xlsx 不在這台，下面全部照 natali §6 預設：撲咬＝攻擊 A、爪＝延時 D；四足獸爪擊一律橫掃（§11）。表上若另有寫法要改。

| 敵人 | KF（`_neutral_refs/…`） | 待 Ray 看的點 |
|---|---|---|
| ~~北泊 魘魔／禍魘祭司／罪之魔像 A、D~~ | `np_kf/_review_北泊natali重做.jpg`（留存不動） | ⛔ **Ray 已喊停**（11-08：「北泊不做了　4070有已經做好的　這台交負祭者就好」）—— 不列待審、不交 |
| 裂肉獸 `mon_beast_organ` | `s3_kf/_review_第三節_1.jpg` | 撲咬嘴沒張開；橫掃那隻前腳畫成帶爪的掌（原圖是蹄） |
| 鹿骸 `mon_stag_nightmare` | 同上 | 鹿用蹄橫掃是否合理 |
| 熊骸 `mon_bear_nightmare` | 同上 | — |
| 聖骨獸 `mon_beast_reliquary` | `s3_kf/_review_第三節_2.jpg` | 橫掃那張金色光帶不見了（提示詞 no glow 造成，原圖光帶是設計） |
| 熊骸 `mon_bear_husk` | 同上 | 第一次被 GPT 以暴力擋，問過後重出 |
| 變異樹靈鹿主 `mon_shinierforest_deernightmare` | 同上 | 用前腳橫掃 |
| 覆骨者 `mon_beast_bonemaw` | 同上（**原圖太動態 → 新 A 中立**） | 撲咬那張頭部骨面變了樣；新 A 若過，I 也要用新 A 重做 |
| 腐鹿骸 `mon_stag_rot` | 同上（**原圖太動態 → 新 A 中立**） | 新 A 若過，I 也要用新 A 重做 |

沒做：崩岩巨像（無嘴，攻擊型態要問）、守墓者四張（像飛行骸骨，要先確認是否算空戰）、其餘聖物／聖徒／王座系（攻擊方式非咬非爪，要看表）。

**第二批（11-08 22:00 後，Ray：獸型走 tiger、其他走 natali）** —— `s3_kf/_review_第三節_3.jpg`、`_4.jpg`。無嘴或嘴不明顯的，「撲咬」改畫成**撲向鏡頭的撲抓／重拳**（natali 的撲咬沒辦法照字面做），請 Ray 定。

| 敵人 | 走法 | 待 Ray 看的點 |
|---|---|---|
| 崩岩巨像 `mon_canyon_colossus_dark` | natali（原圖揮拳 → 新 A 中立） | 攻擊＝重拳撲向鏡頭（無嘴） |
| 守墓者 `mon_gravekeeper_seal` | tiger（原圖俯衝 → 新 A 中立，落地） | offset／many／crypt 三張還沒做，看這張的方向再套 |
| 撕心者 `mon_relic_heartripper` | natali | — |
| 鳴鐘者 `mon_relic_bellreacher` | natali | 攻擊＝撲抓 |
| 王的容器 `mon_halo_ring` | natali | 撲抓那張光環變亮（原圖光環是設計） |
| 喪鐘 `mon_relic_bellwalker` | natali | 攻擊＝撲抓 |
| 鎖鍊聖徒 `mon_saint_prison` | natali（原圖太動態 → 新 A 中立） | — |
| 監查者 `mon_saint_inspector` | natali（鐮刃） | 突刺那張只剩一把鐮刀 |
| 巨型聖徒 `mon_saint_thug` | natali（原圖揮拳 → 新 A 中立） | 攻擊＝重拳撲向鏡頭 |

**第三批（11-08 21:45～22:15，natali，聖物系）** —— `s3_kf/_review_第三節_5.jpg`、`_6.jpg`。

| 敵人 | 待 Ray 看的點 |
|---|---|
| 告解者 `mon_relic_confessional`、沙漏苦修者 `hourglass`、鑰匙守 `keyward` | 撲抓／斜劈各一 |
| 讀經台 `lectern`、香爐肺 `censerlung`、帷幕手 `veilhands` | ⚠ 第一次送出時被 ChatGPT 草稿蓋成「鑰匙守」提示詞，已在同串更正重出；香爐肺斜劈第一張假透明，重出那張姿勢變成撲抓（`_6.jpg` 第一列），等於斜劈還缺 |
| 詩輪 `wheelpsalm` | 斜劈兩張（殘影畫成一整條長斜線）；**撲抓沒出成**（ChatGPT 空間滿） |
| 聖爵溺者 `chalice` | 撲抓兩張選一＋斜劈 |
| 鏡唱者 `mirrorchoir` | 撲抓＋斜劈 |
| 風箱懺者 `bellows` | 只有斜劈，**撲抓沒出成** |

⛔ **22:15 ChatGPT 顯示「Your file storage is full」—— 不能再上傳參考圖，GPT 出 KF 到此停。** 要清 ChatGPT 的檔案空間（Ray 的帳號，這邊不動）才能續做。
還沒做（照盤點順序）：節制者、蟲螳螂、鐘苦修者、鉤笑屍、拱廊守衛、石棺爬行者、石板匍匐者、跪拜的懺悔者、鎖鏈吊屍、鐵處女、納骨鼠群、納骨輪、唱詩管風琴、蒼白唱詩者、鑄鐘者、墓香爐、燭台魔、聖匣之手、螺旋帷幕、裹屍寡婦、地穴蜈蚣、地穴獵犬、雙頭骷髏犬、穹頂蝙蝠、顱石堆、抬棺列、墓熊、蒼白牡鹿、深喉蟾、石蝰、王座徘徊者×5、守墓者 offset／many／crypt、聖徒系 10 張（mon_saint_acolyte…prayerhead）。
