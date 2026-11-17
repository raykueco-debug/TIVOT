#!/bin/bash
# Ray 11-13（3060）第二批：inpaint（只動圈的）／遮掉一塊／水紋不回放／天體儀不移鏡。全部不倒放。
cd "$(dirname "$0")"; export PYTHONIOENCODING=utf-8 SEP_F=1 SEP_REV=1 SEP_NOREV=1 SEP_SEED=505
until grep -q FIX9_DONE fix9_3060.log 2>/dev/null; do sleep 20; done
T='鏡頭固定。動漫風格，賽璐珞上色。'
SEP_SUFFIX=_F3 SEP_FPROMPT="動漫風格的森林背景。強風吹拂，樹冠的枝葉大幅搖擺，前景的蕨葉擺動。$T" python sep_run.py shinier_forest__glade__day --recomp
SEP_SUFFIX=_F2 SEP_NOSKY=1 SEP_FPROMPT="動漫風格的室內背景。壁燈與燈籠的燈火輕輕閃動。$T" python sep_run.py sofiaout__backhall__base --recomp
SEP_SUFFIX=_F2 SEP_FPROMPT="動漫風格的背景。燭火搖曳閃動，垂掛的旗幟與破布隨風輕輕飄動。$T" python sep_run.py belisar__stephall__day --recomp
SEP_SUFFIX=_F2 SEP_NOSKY=1 SEP_FPROMPT="動漫風格的室內背景。中間吊燈的燈火搖曳閃動。$T" python sep_run.py belisar__oldtomb__base --recomp
SEP_SUFFIX=_F2 SEP_FPROMPT="動漫風格的背景。天體儀的球體與圓環緩緩旋轉。$T" python sep_run.py belisar__starroom__day --recomp
SEP_SUFFIX=_F2 SEP_PROTECT_BOX='0.42,0,0.66,0.16' SEP_FPROMPT="動漫風格的背景。燭火搖曳閃動，垂掛的旗幟隨風輕輕飄動。$T" python sep_run.py belisar__throne__day --recomp
SEP_SUFFIX=_F2 SEP_NOSKY=1 SEP_PROTECT_BOX='0.40,0.25,0.62,0.64;0.05,0.24,0.18,0.63;0.83,0.24,0.94,0.63' SEP_FPROMPT="動漫風格的室內背景。吊燈緩緩左右擺動，燭火閃動。$T" python sep_run.py belisar__antecham__base --recomp
SEP_SUFFIX=_F2 SEP_PROTECT_BOX='0.05,0.38,0.30,0.62' SEP_FPROMPT="動漫風格的背景。湖面泛起細微的波紋，草叢隨風搖曳。$T" python sep_run.py dunmor__lakeshore__base --recomp
SEP_SUFFIX=_F2 SEP_FPROMPT="動漫風格的背景。沼澤水面泛起細微的波紋，蘆葦隨風搖曳。$T" python sep_run.py dunmor__bogoffer__base --recomp
SEP_SUFFIX=_F2 SEP_FPROMPT="動漫風格的背景。地上水窪的水面泛起細微的波紋。$T" python sep_run.py dunmor__ditchW__base --recomp
echo FIX10_DONE
