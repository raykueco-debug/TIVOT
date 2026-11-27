-- ============================================================================
--  TIVOT 統計：只有 Ray 看得到（ver -3091）
--  在 Supabase → SQL Editor 貼上整段，把下面「改成你的密碼」換掉，按 Run 跑一次。
--  之後要換密碼：只重跑「② 設密碼」那一段（換掉字串再 Run）。
--
--  做了什麼：
--   ① 資料表 events 關掉匿名讀取（遊戲照樣寫得進來，但任何人都讀不到原始資料）
--   ② 密碼只存雜湊（bcrypt），放在一張匿名讀不到的表
--   ③ 彙總函式 stats_summary(密碼, 天數)：密碼對了才回傳數字；統計頁 stats.html 呼叫它
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ① 原始資料不准匿名讀（寫入照舊）
drop policy if exists "anon_select" on public.events;
alter table public.events add column if not exists grade    text;
alter table public.events add column if not exists platform text;   -- web｜pwa｜apk
create index if not exists events_ts_idx   on public.events (ts);
create index if not exists events_type_idx on public.events (type);

-- ② 設密碼（⚠ 把「改成你的密碼」換掉；這一段可以單獨重跑來換密碼）
create table if not exists public.stats_secret (id int primary key default 1, hash text not null);
alter table public.stats_secret enable row level security;   -- 沒有任何 policy ＝ 匿名完全讀不到
insert into public.stats_secret (id, hash)
values (1, extensions.crypt('改成你的密碼', extensions.gen_salt('bf')))
on conflict (id) do update set hash = excluded.hash;

-- ③ 彙總函式（時區：台北）
create or replace function public.stats_summary(pass text, days int default 14)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  h text;
  since timestamptz := now() - make_interval(days => greatest(1, least(days, 365)));
  out jsonb;
begin
  select s.hash into h from public.stats_secret s where s.id = 1;
  if h is null or pass is null or crypt(pass, h) <> h then
    perform pg_sleep(1);                                  -- 猜密碼要付時間
    raise exception 'denied' using errcode = '28000';
  end if;

  with e as (select * from public.events)
  select jsonb_build_object(
    'now', now(),
    'total', (select jsonb_build_object(
        'visits',        count(*) filter (where type='visit'),
        'visitors',      count(distinct client_id) filter (where type='visit'),
        'play_new',      count(*) filter (where type='play_start' and result='new'),
        'play_continue', count(*) filter (where type='play_start' and result='continue'),
        'players',       count(distinct client_id) filter (where type='play_start'),
        'play_ms',       coalesce(sum(time_ms) filter (where type='play_time'), 0),
        'clears',        count(distinct client_id) filter (where type='demo_clear'),
        'clear_avg_ms',  round(avg(time_ms) filter (where type='demo_clear')),
        'clear_med_ms',  percentile_cont(0.5) within group (order by time_ms) filter (where type='demo_clear'),
        'clear_min_ms',  min(time_ms) filter (where type='demo_clear'),
        'dl_start',      count(*) filter (where type='offline' and result='start'),
        'dl_done',       count(*) filter (where type='offline' and result='done'),
        'dl_fail',       count(*) filter (where type='offline' and result='fail'),
        'dl_devices',    count(distinct client_id) filter (where type='offline' and result='done'),
        'challenge_runs',count(*) filter (where type='run_start'),
        'original_clicks',count(*) filter (where type='original_click')
      ) from e),
    'platform', (select coalesce(jsonb_agg(p order by p->>'platform'), '[]'::jsonb) from (
        select jsonb_build_object(
          'platform', coalesce(platform, '—'),
          'visitors', count(distinct client_id) filter (where type='visit'),
          'players',  count(distinct client_id) filter (where type='play_start'),
          'play_ms',  coalesce(sum(time_ms) filter (where type='play_time'), 0),
          'clears',   count(distinct client_id) filter (where type='demo_clear')) p
        from e group by coalesce(platform, '—')) x),
    'daily', (select coalesce(jsonb_agg(d order by d->>'day' desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'day',      to_char((ts at time zone 'Asia/Taipei')::date, 'MM-DD'),
          'visitors', count(distinct client_id) filter (where type='visit'),
          'players',  count(distinct client_id) filter (where type='play_start'),
          'play_ms',  coalesce(sum(time_ms) filter (where type='play_time'), 0),
          'dl_done',  count(*) filter (where type='offline' and result='done'),
          'clears',   count(distinct client_id) filter (where type='demo_clear')) d
        from e where ts >= since
        group by (ts at time zone 'Asia/Taipei')::date) y),
    'versions', (select coalesce(jsonb_agg(v order by v->>'ver' desc), '[]'::jsonb) from (
        select jsonb_build_object('ver', ver, 'players', count(distinct client_id)) v
        from e where type='play_start' and ts >= since group by ver) z),
    'recent_clears', (select coalesce(jsonb_agg(c order by c->>'ts' desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'ts', to_char(ts at time zone 'Asia/Taipei', 'MM-DD HH24:MI'),
          'time_ms', time_ms, 'platform', platform) c
        from e where type='demo_clear' order by ts desc limit 20) w)
  ) into out;
  return out;
end $$;

revoke all on function public.stats_summary(text, int) from public;
grant execute on function public.stats_summary(text, int) to anon;
