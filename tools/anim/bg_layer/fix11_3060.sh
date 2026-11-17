#!/bin/bash
# Ray 11-14：沼澤獻祭處 GPT 天空層放錯場景（棧道圖）→ 重出天空層後從頭重跑（新提示詞＝新 Wan 前綴，不沿用舊輸出）。不倒放。
cd "$(dirname "$0")"; export PYTHONIOENCODING=utf-8 SEP_F=1 SEP_REV=1 SEP_NOREV=1 SEP_SEED=505
T='鏡頭固定。動漫風格，賽璐珞上色。'
SEP_SUFFIX=_F3 SEP_FPROMPT="動漫風格的背景。沼澤水面泛起細微的波紋，蘆葦隨風搖曳，中間的石碑與祭壇完全不動。$T" python sep_run.py dunmor__bogoffer__base --recomp
echo FIX11_DONE
