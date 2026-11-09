#!/bin/bash
# 卡耶爾山谷 5 格：照 Ray 註記（11-09）送 Wan → 用 refined 遮罩合成
cd "$(dirname "$0")"
TAIL="鏡頭完全固定不動，岩石、山壁、地面、石柱、建築、骨頭與雕像都完全不動。動漫風格，賽璐珞上色。"
declare -A P
P[altar]="動漫風格的峽谷谷底祭場。掛在柱子與十字架上的暗紅色布條隨微風輕輕飄動；天上灑下的光線明暗緩緩變化；天空的雲緩緩翻湧流動。"
P[bones]="動漫風格的峽谷白骨之地。掛在木樁與骨架上的暗紅色布條隨微風輕輕飄動；天空的雲緩緩翻湧流動。"
P[bridge]="動漫風格的峽谷斷橋。掛著的暗紅色布條與旗幟隨微風輕輕飄動；吊掛的燈籠隨風輕輕晃動；天空的雲與橋下的雲海緩緩翻湧流動。"
P[corridor]="動漫風格的峽谷風蝕迴廊。掛在木樁上的暗紅色布條隨微風輕輕飄動；天空的雲緩緩翻湧流動。"
P[entry]="動漫風格的峽谷入口。掛在神龕與十字架上的暗紅色布條隨微風輕輕飄動；天空的雲緩緩翻湧流動。"
for n in altar bones bridge corridor entry; do
  python -c "from PIL import Image;Image.open(r'C:/Users/Ray Ku/Desktop/TIVOT/resources/background/canyon/canyon_${n}_day.webp').convert('RGB').resize((768,512),Image.LANCZOS).save(r'../../input/bg_canyon_${n}_day.png')"
  PYTHONIOENCODING=utf-8 python bg_wan.py bg_canyon_${n}_day.png bgl/canyon_${n}_day_s101 81 "${P[$n]}${TAIL}" 101
  PYTHONIOENCODING=utf-8 python bg_comp.py "C:/Users/Ray Ku/Desktop/TIVOT/resources/background/canyon/canyon_${n}_day.webp" bgl/canyon_${n}_day_s101 canyon_${n}_day_s101 --maskdir notes/canyon__${n}__day/refined
done
echo ALLDONE
