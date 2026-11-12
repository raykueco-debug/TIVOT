#!/bin/bash
# Ray 11-12 第三輪：移鏡 ⇒ 逐格對齊（SEP_STAB）＋截短；去煙版天空改用自己摳的；北區火框住；旅館／雜貨店 a world without humans＋換種子；底層祭壇框住
cd "$(dirname "$0")"
export SEP_NOWAIT=1 PYTHONIOENCODING=utf-8 SEP_TRIM=0.4 SEP_STAB=1
WAR_SUFFIX=_v3 python war_run.py northport_west_bf
WAR_SUFFIX=_v3 python war_run.py northport_east_bf
WAR_SUFFIX=_v3 WAR_SEED=202 WAR_PROTECT="0.0,0.58,0.24,0.88" python war_run.py northport_north_bf
WAR_SUFFIX=_v3 WAR_SEED=202 python war_run.py northport_square_bf
WAR_SUFFIX=_v3 python war_run.py northport_gunstore_bf
WAR_SUFFIX=_v3 WAR_SEED=303 WAR_PROMPT="有風吹拂。a world without humans" python war_run.py northport_hotel_bf
WAR_SUFFIX=_v3 WAR_SEED=303 WAR_PROMPT="有風吹拂。a world without humans" python war_run.py northport_grocery_bf
SEP_REV=1 SEP_F=1 SEP_SUFFIX=_F SEP_NOSKY=1 SEP_SEED=202 SEP_PROTECT_BOX="0.37,0.36,0.65,0.62" python sep_run.py tomb__lowaltar__base --recomp
echo DONE
