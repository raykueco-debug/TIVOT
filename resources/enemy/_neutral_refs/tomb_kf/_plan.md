# 伊甸古墓 24 隻 補 B（2026-11-22，Ray 出門前：「這批做完做古墓敵人」）

> 原圖都已是站姿（A 沿用原圖）、都有待機 `_idle_v2`；只缺攻擊 B。每隻一張攻擊 B（D／M 先共用，Ray 要分再補）。
> 動作全是我擬的（Excel 沒寫），對照圖 `_review_tomb_1.jpg`／`_2.jpg`（每格左＝原圖 A、右＝B）。**Ray 點頭才跑 Wan**。
> **11-22 Ray 審過：其餘 15 隻「先跑 WAN」（`tools/anim/tomb_kf_run.sh`，`out/tomb_kf`）；上面標「改動作重出」的 7 隻＋牡鹿另審。**
> **11-22 晚 Ray：音波特效都拿掉（後期程式加，見 TO_CODE），重出那 8 張可以跑 Wan** —— 詩班兩張已換無音波版，8 隻全部排進 `tomb_kf_run.sh`。
> **11-22 晚交件 9 隻**（拱門守衛、燭台魔、墓穴蜈蚣、裹屍寡婦、碑背爬行者、墓熊、雙頭骨犬、骷髏塚、螺旋紗特規，見 TO_CODE）；**廢棄 5 隻待重做**：墓犬（沒對 viewer 前撲咬下）、吊鍊屍（尺寸縮小）、聖匣之手、墓香爐（沒攻擊性）、抬棺列（往後跳）。
> 檔名 `tb_<名>_B.png`（GPT 原檔，未對色對齊）。

| 怪 | B 擬的動作 | 備註 |
|---|---|---|
| arch_warden 拱門守衛 | 雙石拳砸向鏡頭 | |
| sarcoph_crawler 石棺爬行者 | 石棺打開、裡面的屍骸撲出來抓 | 11-22 Ray 改動作重出 |
| slab_creeper 碑背爬行者 | 骷髏顎撲咬 | |
| kneeling_penitent 跪罪者 | 抬頭（眼睛被縫起）雙爪前撲 | 11-22 Ray 改動作重出 |
| chain_hanged 吊鍊屍 | 盪過來爪耙 | |
| iron_maiden 鐵處女 | 閉棺濺血 | 11-22 Ray 改動作重出（GPT 擋兩次「暴力」，第三次換串換措辭才過） |
| ~~ossuary_rats 骨堂鼠群~~ | **刪**（Ray 11-22「老鼠刪掉」；B 與 src 已回收） | |
| ossuary_wheel 骨輪 | 轉向 viewer 滾來衝撞 | 11-22 Ray 改動作重出 |
| choir_organ 唱詩管風琴 | 詠唱（張口高歌；音波由程式加） | 11-22 Ray 改動作重出 |
| choir_pale 蒼白詩班 | 三修女詠唱（張口；音波由程式加） | 11-22 Ray 改動作重出 |
| bellfounder 鑄鐘者 | 正面衝撞 | 11-22 Ray 改動作重出 |
| grave_censer 墓香爐 | 雙香爐甩來 | |
| candelabra_fiend 燭台魔 | 斜劈爪擊 | |
| reliquary_hand 聖匣之手 | 五指抓下 | 手指張開但朝前感偏弱 |
| spiral_veil 螺旋紗 | 布條鞭打 | |
| shroud_widow 裹屍寡婦 | 屍衣展開、雙爪前抓 | |
| crypt_centipede 墓穴蜈蚣 | 抬身大顎下擊 | |
| crypt_hound 墓犬 | 撲咬 | |
| twin_skull_hound 雙頭骨犬 | 雙頭撲咬 | ⚠ 腿數要看 |
| vault_bat 窖蝠 | 俯衝爪擊 | |
| skull_cairn 骷髏塚 | 傾倒、骨手抓 | |
| pall_bearers 抬棺列 | 棺材衝撞、蓋子掀開 | |
| tomb_bear 墓熊 | 撲擊 | |
| pallid_stag 蒼白牡鹿 | 低頭角衝 | 11-22 重轉透明：霧去掉了但鹿角揮動模糊也沒了（叫它補模糊，霧又回來，不收） |
