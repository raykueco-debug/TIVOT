#!/bin/bash
# Ray 11-13（3060）：沙龍只動門扇、馬車房只動戶外的樹（inpaint：notes 換成只圈那一塊）
cd "$(dirname "$0")"; export PYTHONIOENCODING=utf-8 SEP_F=1 SEP_SUFFIX=_F2 SEP_REV=1 SEP_NOREV=1 SEP_NOSKY=1 SEP_SEED=505
until grep -q "EXIT=" glade_f2.log 2>/dev/null; do sleep 20; done
SEP_FPROMPT='動漫風格的室內背景。敞開的落地門扇隨風輕輕前後擺動。鏡頭固定。動漫風格，賽璐珞上色。' python sep_run.py sofiaout__salon__base --recomp
SEP_FPROMPT='動漫風格的背景。拱門外的棕櫚樹與花草隨風搖曳。鏡頭固定。動漫風格，賽璐珞上色。' python sep_run.py sofiaout__carriage__base --recomp
echo FIX9_DONE
