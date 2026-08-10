/* ============================================================================
 *  audio.js — SFX 音效引擎（Web Audio 全合成，無音檔）
 *  ---------------------------------------------------------------------------
 *  職責：純輸出。被各模組呼叫播音，不依賴任何其他模組（見 CLAUDE.md 第 2 節）。
 *  來源：reference/index.html 的 SFX IIFE。
 *  介面（後續步驟實作）：
 *    init / unlock / gunshot / sniperShot / wrong / hit / clear /
 *    ultCharge / confirm / menuClick
 *
 *  ⚠ 本輪為骨架：僅匯出同名的 no-op 佔位，讓其他模組可安全 import，
 *    實際合成邏輯留待對應步驟自 reference 搬遷、逐一比對音色。
 * ========================================================================== */

export const SFX = {
  unlock(){},
  gunshot(/* heavy */){},
  sniperShot(){},
  wrong(){},
  hit(){},
  clear(){},
  ultCharge(){},
  confirm(){},
  menuClick(){},
};
