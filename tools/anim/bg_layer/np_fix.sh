#!/bin/bash
# Ray 11-12 北泊修正：教堂換底圖（church_ruin）、港口只分天空不動畫、鏡位動的截短、跑出人／馬車／門開的換種子；古墓底層祭壇換種子
cd "$(dirname "$0")"
export SEP_NOWAIT=1 PYTHONIOENCODING=utf-8 SEP_TRIM=0.4
python war_run.py northport_church_ruin
WAR_STATIC=1 python war_run.py northport_port_bf
for n in west gunstore; do python war_run.py northport_${n}_bf; done
for n in square grocery hotel tavern north; do WAR_SEED=202 python war_run.py northport_${n}_bf; done
SEP_REV=1 SEP_F=1 SEP_SUFFIX=_F SEP_NOSKY=1 SEP_SEED=202 python sep_run.py tomb__lowaltar__base
echo DONE
