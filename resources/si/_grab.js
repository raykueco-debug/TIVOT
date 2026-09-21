/* ChatGPT 產圖：送出／收圖／判死 —— 定版（ver -1557，Ray 指定照四條改寫）
   整段貼進那個分頁的 console（或用 javascript_tool 跑一次）就好。

   ⚠⚠⚠ 這一支存在的理由：舊版把「DOM 上有沒有那張圖」當成「模型有沒有出圖」，
   而兩者之間隔著**虛擬清單**與**圖片解碼** —— 中間任何一段沒到位就會拿到一個
   看起來很確定的否定答案，於是把「早就出圖了」判成「那一串死了」→ 重送 → 燒額度。
   （2026-09-21：`scare` 因此白跑三次。）                                        */

(() => {
  const RENDER_WAIT = 1500;                  // ① 捲完要等 render（虛擬清單）
  const MIN_BYTES   = 600000;                // 小於這個一律是上傳的參考圖

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const imgs  = () => [...document.querySelectorAll('img')];
  const keyOf = i => i.src.split('?')[0];
  /* ⚠⚠ assistant 訊息**沒有** data-message-author-role（只有 user 有，實測 2026-09-21）。
     真正可靠的兩個：回合數，以及「這一回合有圖」的那顆讚鈕 —— 後者是**直接訊號**，
     圖片的 <img> 還沒解碼它就在了。 */
  const turnsN = () => document.querySelectorAll('[data-testid^="conversation-turn"]').length;
  const imgTurns = () => document.querySelectorAll('[data-testid="good-image-turn-action-button"]').length;
  const genOn = () => !!document.querySelector(
      'button[data-testid="stop-button"], button[aria-label*="停止"], button[aria-label*="Stop"]');

  /* 捲到底 ＋ 等 render。任何要讀 DOM 的動作都先過這一支。 */
  async function settle() {
    for (const e of document.querySelectorAll('*')) {
      try { if (e.scrollHeight > e.clientHeight + 50) e.scrollTop = e.scrollHeight; } catch (_) {}
    }
    await sleep(RENDER_WAIT);
  }

  /* ④ 送出那一刻 snapshot：之後只認「不在這份集合裡」的圖，不用單一個 lastSrc
       （同一張圖在 DOM 裡會出現兩次：縮圖＋放大層）。 */
  window.__mark = async () => {
    await settle();
    window.__before = new Set(imgs().map(keyOf));
    window.__turn0  = turnsN();
    window.__imgt0  = imgTurns();
    return { imgs: window.__before.size, turns: window.__turn0, imageTurns: window.__imgt0 };
  };

  /* ② 進度看「對話」不看「圖」：圖是最後才到的東西，拿它當進度指標一定早判。 */
  window.__state = async () => {
    await settle();
    return { generating: genOn(),
             newTurns:     turnsN()   - (window.__turn0 ?? 0),
             newImageTurns: imgTurns() - (window.__imgt0 ?? 0),   // ← 「出圖了沒」看這個
             imgs: imgs().filter(i => i.naturalWidth >= 512).length };
  };

  window.__grab = async (name) => {
    await settle();
    const fresh = imgs().filter(i => i.naturalWidth >= 512 && !(window.__before?.has(keyOf(i))));
    for (let k = fresh.length - 1; k >= 0; k--) {
      const i = fresh[k];
      const b = await (await fetch(i.src)).blob();
      if (b.size < MIN_BYTES) continue;                 // 上傳的參考圖
      window.__before?.add(keyOf(i));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      return { ok: name, bytes: b.size };
    }
    return { waiting: true, ...(await window.__state()) };   // ⚠ 不叫 none，它不是結論
  };

  /* ③ 「死了」要比「還在跑」更難成立 —— 成本不對稱：
        誤判還在跑＝多等幾分鐘；誤判死了＝燒一次額度。
        所以四步都過才准宣告，而且第四步要人用眼睛看截圖。 */
  window.__dead = async () => {
    await settle();                                   // 1 捲
    await sleep(RENDER_WAIT);                         // 2 再等一次
    const g = await window.__grab('__probe.png');     // 3 重查（真的有圖就順手收下）
    if (g.ok) return { dead: false, why: '其實已經出圖了，剛剛收下來了', got: g };
    const st = await window.__state();
    if (st.generating)        return { dead: false, why: '停止鈕還在＝還在跑' };
    if (st.newImageTurns > 0) return { dead: false, why: '那一回合的讚鈕已經在了＝圖出來了，只是還沒解碼／還沒 render' };
    if (st.newTurns > 0)      return { dead: false, why: '已經多一個回合，圖可能還在路上' };
    return { dead: 'maybe', why: '四步走完仍然沒有 → 截圖用眼睛確認過再重送', ...st };
  };

  window.__esc = () => { for (const t of ['keydown','keyup'])
      document.dispatchEvent(new KeyboardEvent(t,{key:'Escape',code:'Escape',keyCode:27,which:27,
        bubbles:true,cancelable:true})); return 'esc'; };

  window.__send = async (txt) => {
    const box = document.querySelector('#prompt-textarea');
    box.focus();
    const s = getSelection(), r = document.createRange();
    r.selectNodeContents(box); s.removeAllRanges(); s.addRange(r);
    document.execCommand('insertText', false, txt);
    box.dispatchEvent(new InputEvent('input', { bubbles: true }));
    s.collapseToEnd();
    await sleep(800);
    const btn = [...document.querySelectorAll('button')].find(
      b => /傳送|Send prompt|送出/.test(b.getAttribute('aria-label') || '') && !b.disabled);
    if (!btn) return 'NO-SEND';
    await window.__mark();            // ⚠ snapshot 要在按下去之前
    btn.click();
    await sleep(25000);               // 等真 id（`WEB:` 開頭是暫時 id，回不去）
    return { users: document.querySelectorAll('[data-message-author-role="user"]').length,
             path: location.pathname };
  };

  return 'ready';
})();
