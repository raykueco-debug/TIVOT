/* ============================================================================
 *  script/shopcards.js — 商店卡（唯一資料來源，ver -1831）
 *  ---------------------------------------------------------------------------
 *  ⚠⚠ **這一檔由 `tools/shops_xlsx.py import` 產生 —— 不要手改**（改了下次匯入會被蓋掉）。
 *     要改：`python3 tools/shops_xlsx.py export` → 改 shops.xlsx → Ray 說匯入才 `import`。
 *  ⚠ 各店的說明寫在卡上的 `note`（Excel 的「備註」欄），不寫成註解（整檔重產會洗掉註解）。
 *  ⚠ 欄位的意義見 config.js 的 `shop` 那一段；節點用 `shop:'<key>'` 指到這裡的鍵。
 *  ⚠ 貨單分開記帳：`script/shopstock.js` 的鑰匙就是這裡的 key（兩家店＝兩本帳）。
 *  ⚠ 純資料檔，不 import 任何東西（不會與 config 成環）。
 * ========================================================================== */
export const SHOP_CARDS = {
  grocery: {
    city: "帝都",
    title: "雜貨舖",
    art: "resources/si/npc/npc_grocerie_si.webp",
    tabs: ["buy", "sell"],
    note: "帝都雜貨舖。",
    stock: [
      {"id": "milk", "n": 8},
      {"id": "cheese", "n": 5},
      {"id": "lime_rum", "n": 3},
    ],
  },
  gunstore: {
    city: "帝都",
    title: "武器店",
    art: "resources/si/npc/npc_capital_gunstore_si.webp",
    tabs: ["buy", "sell", "mod"],
    tabName: {"buy": "買武器", "sell": "賣武器", "mod": "武器改裝"},
    only: "weapon",
    compare: true,
    challenge: "range_trainee",
    challengeLabel: "射擊挑戰",
    note: "帝都武器店。賣的是武器鑰匙（weapons 的鍵），價格規格在武器卡上。每把只有 1 支（ver -405，Ray）：成品槍，賣掉就沒了，玩家賣回來才會再有。射擊挑戰＝range_trainee。",
    stock: [
      {"id": "Shotgun_Dragon", "n": 1},
      {"id": "MG_Squall_Kai", "n": 1},
      {"id": "Rifle_Shahin", "n": 1},
    ],
  },
  np_grocery: {
    city: "北方泊地",
    title: "雜貨舖",
    art: "resources/si/npc/npc_grocery_si_northport.webp",
    tabs: ["buy", "sell"],
    note: "北方泊地（ver -655，Ray：「與帝都功能相同」）。貨照抄帝都；season_goatbutter 是 ver -979 加的（送行那一份用掉後買得回來）。店主台詞「物資被徵調」是氣氛，要砍貨單等 Ray 指定。",
    stock: [
      {"id": "milk", "n": 8},
      {"id": "cheese", "n": 5},
      {"id": "lime_rum", "n": 3},
      {"id": "season_goatbutter", "n": 4},
    ],
  },
  np_gunstore: {
    city: "北方泊地",
    title: "武器店",
    art: "resources/si/npc/npc_gunsmith_si_northport.webp",
    tabs: ["buy", "sell", "mod"],
    tabName: {"buy": "買武器", "sell": "賣武器", "mod": "武器改裝"},
    only: "weapon",
    compare: true,
    challenge: "np_range",
    challengeLabel: "射擊挑戰",
    note: "北方泊地武器店。射擊挑戰＝np_range（25 秒、200G，最佳紀錄與帝都分開）。",
    stock: [
      {"id": "Shotgun_Dragon", "n": 1},
      {"id": "MG_Squall_Kai", "n": 1},
      {"id": "Rifle_Shahin", "n": 1},
    ],
  },
  sv_grocery: {
    city: "夏爾村",
    title: "雜貨街",
    art: "resources/si/npc/npc_shinier_grocery_si.webp",
    tabs: ["buy", "sell"],
    sale: {"need": "safehouse_shinier", "mul": 0.9},
    note: "夏爾村雜貨街（ver -858）：小村規模貨少。退休行商；一起經歷魔獸圍城（safehouse_shinier）之後打 9 折（只乘買價）。",
    stock: [
      {"id": "milk", "n": 4},
      {"id": "cheese", "n": 3},
    ],
  },
  sv_workshop: {
    city: "夏爾村",
    title: "杰羅的工坊",
    art: "resources/si/npc/npc_shinier_gunsmith_si.webp",
    tabs: ["jero"],
    tabName: {"jero": "改槍"},
    note: "杰羅的工坊（ver -866）：不賣不買，只有改槍分頁（規則在 tuning.jeroMod）。貨單空的，只為資料契約。",
    stock: [
    ],
  },
  ep_grocery: {
    city: "東方泊地",
    title: "雜貨舖",
    art: "resources/si/npc/npc_grocer_si_v1.webp",
    tabs: ["buy", "sell"],
    note: "東方泊地（ver -1340）：貨先照北泊。通商大港照設定該更豐富，但內容等 Ray 指定。",
    stock: [
      {"id": "milk", "n": 8},
      {"id": "cheese", "n": 5},
      {"id": "lime_rum", "n": 3},
    ],
  },
  ep_gunstore: {
    city: "東方泊地",
    title: "武器店",
    art: "resources/si/npc/npc_gunsmith_si_v1.webp?v=0a1369e8",
    tabs: ["buy", "sell", "mod"],
    tabName: {"buy": "買武器", "sell": "賣武器", "mod": "武器改裝"},
    only: "weapon",
    compare: true,
    challenge: "ep_range",
    challengeLabel: "射擊挑戰",
    note: "東方泊地武器店。射擊挑戰＝ep_range（ver -1350）。",
    stock: [
      {"id": "Shotgun_Dragon", "n": 1},
      {"id": "MG_Squall_Kai", "n": 1},
      {"id": "Rifle_Shahin", "n": 1},
    ],
  },
  ss_grocery: {
    city: "聖索菲亞",
    title: "雜貨舖",
    art: "resources/si/npc/npc_grocerie_si.webp",
    tabs: ["buy", "sell"],
    note: "通用帝都版本（ver -1831，Ray：還沒接店主圖也要先有商店功能）。店主立繪暫用帝都雜貨舖。",
    stock: [
      {"id": "milk", "n": 8},
      {"id": "cheese", "n": 5},
      {"id": "lime_rum", "n": 3},
    ],
  },
  ss_gunstore: {
    city: "聖索菲亞",
    title: "武器店",
    art: "resources/si/npc/npc_capital_gunstore_si.webp",
    tabs: ["buy", "sell", "mod"],
    tabName: {"buy": "買武器", "sell": "賣武器", "mod": "武器改裝"},
    only: "weapon",
    compare: true,
    note: "通用帝都版本（ver -1831）。店主立繪暫用帝都武器店；沒有射擊挑戰（那是各城自己的場次）。",
    stock: [
      {"id": "Shotgun_Dragon", "n": 1},
      {"id": "MG_Squall_Kai", "n": 1},
      {"id": "Rifle_Shahin", "n": 1},
    ],
  },
  rv_grocery: {
    city: "雪都瓦恩霍姆",
    title: "雜貨舖",
    art: "resources/si/npc/npc_grocerie_si.webp",
    tabs: ["buy", "sell"],
    note: "通用帝都版本（ver -1831，Ray：還沒接店主圖也要先有商店功能）。店主立繪暫用帝都雜貨舖。",
    stock: [
      {"id": "milk", "n": 8},
      {"id": "cheese", "n": 5},
      {"id": "lime_rum", "n": 3},
    ],
  },
  rv_gunstore: {
    city: "雪都瓦恩霍姆",
    title: "武器店",
    art: "resources/si/npc/npc_capital_gunstore_si.webp",
    tabs: ["buy", "sell", "mod"],
    tabName: {"buy": "買武器", "sell": "賣武器", "mod": "武器改裝"},
    only: "weapon",
    compare: true,
    note: "通用帝都版本（ver -1831）。店主立繪暫用帝都武器店；沒有射擊挑戰（那是各城自己的場次）。",
    stock: [
      {"id": "Shotgun_Dragon", "n": 1},
      {"id": "MG_Squall_Kai", "n": 1},
      {"id": "Rifle_Shahin", "n": 1},
    ],
  },
  vf_grocery: {
    city: "薇拉馮德",
    title: "雜貨舖",
    art: "resources/si/npc/npc_grocerie_si.webp",
    tabs: ["buy", "sell"],
    note: "通用帝都版本（ver -1831，Ray：還沒接店主圖也要先有商店功能）。店主立繪暫用帝都雜貨舖。",
    stock: [
      {"id": "milk", "n": 8},
      {"id": "cheese", "n": 5},
      {"id": "lime_rum", "n": 3},
    ],
  },
  vf_gunstore: {
    city: "薇拉馮德",
    title: "武器店",
    art: "resources/si/npc/npc_capital_gunstore_si.webp",
    tabs: ["buy", "sell", "mod"],
    tabName: {"buy": "買武器", "sell": "賣武器", "mod": "武器改裝"},
    only: "weapon",
    compare: true,
    note: "通用帝都版本（ver -1831）。店主立繪暫用帝都武器店；沒有射擊挑戰（那是各城自己的場次）。",
    stock: [
      {"id": "Shotgun_Dragon", "n": 1},
      {"id": "MG_Squall_Kai", "n": 1},
      {"id": "Rifle_Shahin", "n": 1},
    ],
  },
};
