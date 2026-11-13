#!/bin/bash
# Ray 11-13 審閱意見：不需要遮罩、可以直接跑的那幾格
cd "$(dirname "$0")"; export PYTHONIOENCODING=utf-8 SEP_F=1 SEP_SUFFIX=_F
# 水紋不要回放（只重合成）
SEP_NOREV=1 python sep_run.py dunmor__bogoffer__base --recomp
# 微移鏡 → 把移動的部份剪掉（只重合成）
SEP_REV=1 SEP_NOSKY=1 SEP_STAB=1 SEP_TRIM=0.3 python sep_run.py belisar__offering__day --recomp
SEP_REV=1 SEP_STAB=1 SEP_TRIM=0.3 python sep_run.py shinier_forest__glade__day --recomp
# 瀑布 loop 接點太明顯 → 順向段拉長到 60 格再找接點（重跑 Wan）
SEP_NOREV=1 SEP_K=60 python sep_run.py lake__fallbase__day --recomp
# 天體球完整轉一圈（重跑 Wan）
SEP_REV=1 SEP_SEED=303 SEP_FPROMPT='動漫風格的背景。中央的天體儀球體緩慢地旋轉，完整轉一圈。鏡頭完全固定不動，牆壁、地面、石柱與雕像都完全不動。動漫風格，賽璐珞上色。' python sep_run.py belisar__starroom__day --recomp
echo FIX8_DONE
