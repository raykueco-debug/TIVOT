#!/bin/bash
# Ray 11-13：「火拿掉」—— 火是 Wan 照提詞畫出來的，改不提火的提詞重跑
cd "$(dirname "$0")"; export PYTHONIOENCODING=utf-8 SEP_F=1 SEP_SUFFIX=_F SEP_REV=1
until grep -q FIX8_DONE fix8.log 2>/dev/null; do sleep 30; done
SEP_NOSKY=1 SEP_SEED=404 SEP_FPROMPT='動漫風格的背景。牆面的水痕與地上的水光輕輕閃動。畫面中沒有任何火焰。鏡頭完全固定不動，牆壁、地面、石柱、木桶與工具都完全不動。動漫風格，賽璐珞上色。' python sep_run.py tomb__nitrepit__base --recomp
SEP_SEED=404 SEP_FPROMPT='動漫風格的背景。光束中的塵埃緩緩飄動，植物的葉片被微風吹得輕輕搖曳。畫面中沒有任何火焰。鏡頭完全固定不動，石牆、地面、石柱與樹根都完全不動。動漫風格，賽璐珞上色。' python sep_run.py shinier_ruins__corridora__day --recomp
echo FIX8B_DONE
