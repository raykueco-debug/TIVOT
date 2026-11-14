# 卡耶爾山谷 KF（2026-11-14，照 Ray 的編排頁提交 `resources/enemy/anim/_review/submit_canyon_20261114_211703.json`）

> 規則：沒寫的格＝給 Wan 自由發揮（不出 KF）；D／M 可共用。KF 每張都要 Ray 點頭才跑 Wan（natali §9）。
> 對照圖：`_review_canyon_kf.jpg`（每列＝原圖｜KF，深底合成）。
> 檔案一律用下表那一張；同資料夾裡沒列的是中間檔（GPT 的白底／畫上去的棋盤格版本）。

| 敵人 | 格 | Ray 寫的 | KF 檔 | 備註 |
|---|---|---|---|---|
| 崩岩巨像 | M | 咆哮（程式回血 15%） | `kf_canyon_colossus_M_roar_alpha.png` | 人比原圖小一圈（原圖拳頭貼滿畫面） |
| 石棺甲蟲 | A | 朝玩家撲擊 | `kf_canyon_coffinbeetle_A_pounce.png` | 左右揮動模糊離邊 9px |
| 骸殼蟹 | D | 雙鉗向兩邊張開（程式噴泡泡） | `kf_canyon_bonecrab_D_spread_alpha2.png` | 鉗的模糊貼左右邊 |
| 朝聖者團塊 | M | 張手（程式震波、數字淡出） | `kf_canyon_pilgrimmass_M_spread.png` | |
| 喪鐘蠕蟲 | A | 朝 viewer 攻擊 | `kf_canyon_bellwyrm_A_strike_alpha.png` | 鐘口模糊貼右邊 |
| 鐵衣苦修者 | I（新 A） | 重畫 idle 圖 | `kf_canyon_ironpenitent_I_neutral.png` | 過了待機要用它重做 |
| 鐵衣苦修者 | D | 法杖朝 viewer 砸擊 | `kf_canyon_ironpenitent_D_smash_alpha.png` | 錘頭離下緣 15px |
| 肋籠獸 | A | 尾部朝 viewer 噴火、橫向移動 | `kf_canyon_ribcage_A_tailfire_alpha.png` | ⚠ 噴火的是長頸末端的嘴（原圖那一端）；火是平塗大色塊；頸部模糊邊有淡灰白殘邊 |
| 高蹺細影 | I（新 A） | 重畫 idle 圖 | `kf_canyon_stilt_I_neutral_alpha.png` | 頂上尖刺離上緣 11px |
| 高蹺細影 | M | 爪擊 natali | `kf_canyon_stilt_M_claw_alpha2.png` | ⚠ 揮爪模糊邊有白色殘邊 |

不出 KF 的（照規則）：聖面鷲、骨鴉的 A（閃現消失／黑影劃過／閃現復歸 —— 程式演出，不需 KF）；其餘寫「交給 wan 自由發揮」的格；崩岩巨像 D（Ray：已有動畫）。

alpha：GPT 直接出圖只有甲蟲、朝聖者團塊、鐵衣中立是真 alpha；其餘先出白底或畫上去的棋盤格，另開新串請 GPT 轉真透明（它用程式去背），收件逐張量過：主體不透明 ≥95%、四角 alpha 0。
