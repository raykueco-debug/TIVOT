/* 獄門天鎖 × 高密度攻擊（ver -2905）—— 在遊戲頁（內建瀏覽器前景分頁、先點掉開機讀取頁）的 console 貼上整段執行。
   作法：開一場有伙伴的劇情戰 → 換成諾薇兒 → 關鎖血、血設 5 → 同一幀連打 8 發致死傷害，cut-in 演出期間再每 100ms 打一發、共 30 發
   → 斷言：HP 一直 ≥1、沒有戰敗、免傷窗有開。回傳 { pass, ... }。
   ⚠ 版本號照頁面上載的那一版改（下面兩個 import 的 ?v=）。 */
(async (V)=>{
  const C = await import('/modules/combat.js?v='+V);
  const S = await import('/state.js?v='+V);
  const P = await import('/modules/partner.js?v='+V);
  const st = S.state;
  C.startScriptBattle('cap_guard_inn', { story:true });
  await new Promise(r=>setTimeout(r, 4500));            // 開門／開場
  S.setPickedPartner('nouvelle');
  st.hpLock = false; st.deathGuardUsed = false; st.defeated = false; st.over = false;
  st.playerHp = 5;
  const log = [];
  for(let i=0;i<8;i++){ C.devEnemyAttack(50, 'assault'); log.push(st.playerHp); }   // 同一幀 8 發
  const immuneAtOnce = P.immuneActive();
  for(let i=0;i<30;i++){ await new Promise(r=>setTimeout(r,100)); if(st.over) break; C.devEnemyAttack(50,'assault'); log.push(st.playerHp); }
  const pass = !st.defeated && st.playerHp >= 1 && immuneAtOnce && log.every(h=>h>=1);
  st.hpLock = true; st.playerHp = st.playerMax;          // 測完鎖血＋補滿（§驗收第 7 條）
  return { pass, guardUsed: st.deathGuardUsed, immuneAtOnce, minHp: Math.min(...log), hits: log.length };
})('2905');
