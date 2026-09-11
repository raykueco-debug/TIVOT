# 交接：飛空艇甲板背景（兩層）接進 `drawPanel`

> 美術 session → 程式 session。Ray：「我想把**雲海跟甲板分開**，雲海在船動的時候
> 會**向後跑**」「做好第一板以後，**交接給 code 跑看看**」

⚠ 這一份只描述**接點**。美術規格在 `flight/_deck_spec.md`（面板幾何、舵輪遮蔽的
三級可見度、透視怎麼放、時段差分）。

---

## 一、素材（放 helm 素材同層，`flight/`）

| 檔 | 尺寸 | 格式 | 內容 |
|---|---|---|---|
| `Deck_day.webp` | 1536×1024 | **RGBA** | 甲板＋兩舷圍欄＋繩梯＋船頭。**天空全透明**（舷外、地平線以上、欄杆柱之間、繩梯網眼、支索之間都是真 alpha，實測 28.5% 透明） |
| `Sky_day.webp` | **3072×1024** | RGB | 雲海全景，**橫向無縫循環**（美術端已用鏡像接好，左右接得起來） |

⚠ 兩張的**縱向尺度必須一致**（同一個 `s`），地平線才對得上 —— 甲板層的地平線
（圍欄上緣那條）是照天空層 18% 的地平線畫的。

## 二、載入（照 `helmArt` 的寫法）

```js
const deckArt={ deck:null, sky:null };
(function loadDeck(){
  const one=(k,src)=>{ const im=new Image(); im.onload=()=>{deckArt[k]=im;}; im.src=src; };
  one('deck','Deck_day.webp'); one('sky','Sky_day.webp');
})();
```

## 三、畫在哪（`drawPanel` 裡，漸層填完之後、`Base` 之前）

```js
  /* 甲板背景：天空層（捲動）→ 甲板層（不動）。兩層都在基座與舵輪之後。 */
  if(deckArt.deck){
    ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
    const D=deckArt.deck;
    const s=Math.max(W/D.width, ph/D.height);          // cover-fit 進面板
    const dw=D.width*s, dh=D.height*s;
    const dx=(W-dw)/2, dy=y0+(ph-dh)/2;
    if(deckArt.sky){
      const S2=deckArt.sky, sw=S2.width*s, sh=S2.height*s;
      const pan = cam.angle*SKY_PAN + skyDrift;        // ← 見下一節
      const ox=((-pan%sw)+sw)%sw;
      for(let k=-1;k<=Math.ceil(W/sw)+1;k++) ctx.drawImage(S2, dx-ox+k*sw, dy, sw, sh);
    }
    ctx.drawImage(D, dx, dy, dw, dh);
  }
```

⚠⚠ **一定要在 `imageSmoothingEnabled=true` 的區段裡畫**。`resize()` 為了地形的
像素感把整個 ctx 的平滑關掉，天空層縮放時用最近鄰會出現週期性的階梯邊
（同 `drawPanel` 裡舵輪那段註解講的同一個坑）。函式尾巴本來就會關回去。

⚠ 原本那個 `#12101a → #08070d` 的漸層**留著**：cover-fit 在極端比例下左右會露一點邊，
那層漸層就是底。

## 四、怎麼動（Ray 要的「船動時雲海向後跑」）

```js
const SKY_PAN   = 0.6;    // ×W：每弧度捲動幾個畫面寬（航向 → 橫掃）
const SKY_DRIFT = 0.010;  // px/ms per 速度單位（前進 → 持續漂移）
let skyDrift=0;           // loop 裡：skyDrift += spd*SKY_DRIFT*dt;
```
`pan = cam.angle*(SKY_PAN*W) + skyDrift`

- **轉向**綁 `cam.angle`：轉舵，天空橫掃 —— 這是**物理正確**的那一半，
  而且與上半 3D 視窗的航向自動一致（兩邊讀同一個 `cam.angle`，鐵律 7）。
  起始值 `0.6*W` ≈ 轉 90° 掃過約一個畫面寬。
- **前進**綁速度累加：Ray 要的「船動就往後跑」。
  ⚠⚠ **但這一半物理上是假的**：從正前方的視角看，直線前進不會讓雲橫向移動
  （遠方的雲是朝你放大、往兩側掠過）。所以 `SKY_DRIFT` 要**調得很慢**，
  當成「風把雲吹過去」的氛圍，不是速度表。看起來怪就設 0。
- ⚠ `skyDrift` 是**純視覺狀態**，不要進存檔、不要跨場，回到飛行畫面歸零就好。

## 五、成本

面板每幀多 2~3 次 blit。`drawPanel` **現在就已經**每幀貼基座（比畫面還寬）與
舵輪（直徑 606），新增的都比那兩張小；畫面本來就整張重畫，重繪策略不用改。
以 390×844 ＋ DPR 2 估，每幀多約 130 萬裝置像素的純點陣複製 ——
在地形那支逐像素 ray march 旁邊是零頭。

⚠ 唯一要量的是**低階機**：`Q().dpr` 降到 1 時這幾張也跟著小，理論上更省；
但還是照慣例在 q3 上看一次 fps 有沒有掉。

## 六、之後

- **時段差分**（`_dawn`／`_dusk`／`_night`）Ray 說「先是白天光」，還沒做。
  接的時候請把檔名做成可換的（`Deck_<band>.webp`／`Sky_<band>.webp`），
  時段鑰匙用飛行頁現有的那一支，不要另外再算一份（鐵律 7）。
- 兩層分開之後，日後要加**第二層近雲做視差**只是再多一次 blit。
