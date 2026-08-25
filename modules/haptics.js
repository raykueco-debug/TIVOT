/* ══════════════════════════════════════════════════════════════════════
   haptics.js — 震動（ver -398，Ray 指定）
   ──────────────────────────────────────────────────────────────────────
   什麼時候震（Ray 交代的清單）：
     · 反擊（Counter）—— **機槍要連續震動同持續時間**（搭搭搭搭搭那一串）
     · 受到敵人主動攻擊
     · 破防（雙槍窗口）**每一發**
     · 槍棺撞頂
     · 劇情畫面震動（`shake`）／腳本上備註「震動」（`vibrate`）

   ⚠⚠ **iOS Safari 不支援 `navigator.vibrate`**（到目前為止都沒有）。這一整支在
     iPhone 上是 no-op —— 不是壞了，是平台沒有這個 API。Android Chrome 有。
     不要為了 iPhone 去接 Taptic：網頁拿不到那個，只有原生殼才有。
   ⚠ 震動需要**使用者互動過**才會生效（同音訊的自動播放政策），開機第一拍不震很正常。
   ⚠ 開關是**玩家的偏好**（`settings.haptics()`），`progress.newRun()` 不清它。
   ⚠ 這裡是唯一的呼叫點（鐵律 8）：所有要震的地方都叫這支的具名函式，
     不要在各處自己 `navigator.vibrate`（那樣開關會漏掉某幾處）。
   ══════════════════════════════════════════════════════════════════════ */

import { haptics as enabled } from './settings.js';

const can = ()=> !!(navigator && typeof navigator.vibrate === 'function');

/* 底層：`ms` 可以是數字或 `[震,停,震,…]` 陣列。 */
function buzz(ms){
  if(!enabled() || !can()) return;
  try{ navigator.vibrate(ms); }catch(e){}
}

/* ── 具名的震動（強度＝時間長度；手機只有「震多久」這一個維度）────────────
   ⚠ 數字是**排出來的層次**，不是隨手填的：受擊 > 撞頂 > 畫面震 > 單發。
     動之前先想「它比隔壁那一種該重還是輕」。 */
export const hit      = ()=> buzz(45);    // 受到敵人主動攻擊（大絕／延時／按錯）
export const shot     = ()=> buzz(18);    // 單發（破防窗口每一發、反擊的每一發）
export const shake    = ()=> buzz(60);    // 劇情畫面震動／腳本備註「震動」
export const kerbThud = ()=> buzz(90);    // 槍棺撞頂：最重的一下

/* 連續震動 `ms` 毫秒（機槍反擊那一串）。
   ⚠ Ray 指定「**連續震動同持續時間**」—— 不是每發各震一下（那在手機上會被合併成
     一串黏在一起的抖動，讀起來反而比一條長震還糊）。 */
export const burst = ms => buzz(Math.max(30, Math.round(ms)));

/* 停掉正在進行的震動（收場／中止演出時用）。 */
export function stop(){ if(can()) try{ navigator.vibrate(0); }catch(e){} }
