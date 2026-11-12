#!/bin/bash
# Ray 11-12 審閱頁意見（review.json）：重新合成為主，少數重跑 Wan
cd "$(dirname "$0")"
export SEP_NOWAIT=1 PYTHONIOENCODING=utf-8 SEP_REV=1 SEP_F=1 SEP_SUFFIX=_F
R="--recomp"
# 室內：框住
SEP_NOSKY=1 SEP_PROTECT_BOX="0.73,0.15,0.92,0.78" python sep_run.py belisar__cages__base $R
SEP_NOSKY=1 SEP_PROTECT_BOX="0.02,0.20,0.14,0.66;0.82,0.20,0.97,0.66;0.50,0.00,0.62,0.56;0.44,0.00,0.64,0.25" python sep_run.py belisar__antecham__base $R
# 瀑布：單向真循環（找最像的兩格接）
python sep_run.py lake__fallbase__day $R
python sep_run.py lake__cave__day $R
# 羅賽爾：框人影／火、遠山不動
SEP_PROTECT_BOX="0.08,0.27,0.24,0.45;0.31,0.35,0.39,0.49" python sep_run.py dunmor__lakeshore__base $R
SEP_PROTECT_BOX="0.27,0.48,0.39,0.70" python sep_run.py dunmor__gatecourt__base $R
SEP_PROTECT_BOX="0.72,0.20,0.92,0.58;0.30,0.33,0.43,0.53" python sep_run.py dunmor__ditchW__base $R
SEP_PROTECT_BOX="0.15,0.22,0.85,0.85" python sep_run.py belisar__draincliff__day $R
# 只拆天地（地面靜止、天空程式）
SEP_STATIC=1 SEP_MOON="0.405,0.26,0.035" python sep_run.py dunmor__druidhouse__base $R
for k in rampartE potters chariotshed brochtop boarstone altar; do SEP_STATIC=1 python sep_run.py dunmor__${k}__base $R; done
WAR_STATIC=1 python war_run.py ws_0_0_dusk --recomp
WAR_STATIC=1 python war_run.py ws_0_1_dusk --recomp
echo RECOMP_DONE
# 重跑 Wan：去火版底圖、換種子＋對齊
python sep_run.py dunmor__cairn__base $R
python sep_run.py dunmor__bogoffer__base $R
SEP_SEED=202 SEP_STAB=1 SEP_TRIM=0.4 python sep_run.py plainsroad__cairn__day $R
echo DONE
