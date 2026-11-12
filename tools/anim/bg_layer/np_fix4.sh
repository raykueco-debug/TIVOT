#!/bin/bash
# Ray 11-12 第四輪：廣場左邊人遮掉；北區改用去煙＋去火底圖重跑；槍店只動窗外天空；底層祭壇框住＋程式藍光
cd "$(dirname "$0")"
while ! grep -q DONE np_fix3.log 2>/dev/null; do sleep 30; done
export SEP_NOWAIT=1 PYTHONIOENCODING=utf-8 SEP_TRIM=0.4 SEP_STAB=1
WAR_SUFFIX=_v3 WAR_SEED=202 WAR_PROTECT="0.10,0.60,0.20,0.82" python war_run.py northport_square_bf --recomp
WAR_SUFFIX=_v4 WAR_SEED=303 python war_run.py northport_north_bf
WAR_SUFFIX=_v4 WAR_STATIC=1 python war_run.py northport_gunstore_bf
SEP_REV=1 SEP_F=1 SEP_SUFFIX=_F SEP_NOSKY=1 SEP_SEED=202 SEP_PROTECT_BOX="0.37,0.36,0.65,0.62" SEP_GLOW="0.51,0.50,0.12,0.07" python sep_run.py tomb__lowaltar__base --recomp
echo DONE
