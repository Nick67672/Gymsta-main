-- Optimized RPC: public.get_hub_summary(p_user_id uuid)
-- Returns jsonb: { templates: [], recentSessions: [], stats: {}, prs: [] }

create or replace function public.get_hub_summary(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_templates jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_prs jsonb := '[]'::jsonb;
  v_total_workouts integer := 0;
  v_volume_30d numeric := 0;
  v_streak integer := 0;
  v_stats jsonb := '{}'::jsonb;
  v_today date := current_date;
  v_start_30 date := (current_date - interval '29 days')::date;
begin
  -- Safety: restrict to caller's own id
  if p_user_id is distinct from auth.uid() then
    raise exception 'permission denied';
  end if;

  -- recent templates
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'exercises', t.exercises,
    'tags', t.tags,
    'created_at', t.created_at
  ) order by t.created_at desc), '[]'::jsonb)
  into v_templates
  from (
    select * from public.workout_templates
    where user_id = p_user_id
    order by created_at desc
    limit 6
  ) t;

  -- recent sessions
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', w.id,
    'name', w.name,
    'date', w.date,
    'exercises', w.exercises
  ) order by w.date desc), '[]'::jsonb)
  into v_recent
  from (
    select id, name, date, exercises
    from public.workouts
    where user_id = p_user_id and is_completed = true
    order by date desc
    limit 3
  ) w;

  -- total completed workouts
  select count(*) into v_total_workouts
  from public.workouts
  where user_id = p_user_id and is_completed = true;

  -- 30d volume
  select coalesce(sum(total_volume), 0) into v_volume_30d
  from public.workouts
  where user_id = p_user_id and is_completed = true and date >= v_start_30;

  -- streak: consecutive days up to today
  with days as (
    select date from public.workouts
    where user_id = p_user_id and is_completed = true
    group by date
  )
  select count(*) into v_streak
  from (
    select generate_series(0, 60) as offset
  ) s
  where exists (
    select 1 from days d where d.date = (v_today - (s.offset || ' days')::interval)::date
  )
  and not exists (
    select 1 from days d2 where d2.date = (v_today - ((s.offset + 1) || ' days')::interval)::date
  );

  v_stats := jsonb_build_object(
    'totalWorkouts', v_total_workouts,
    'volume30d', v_volume_30d,
    'streak', v_streak
  );

  -- PRs
  select coalesce(jsonb_agg(jsonb_build_object(
    'exercise_name', p.exercise_name,
    'best_1rm', p.best_1rm,
    'best_set_weight', p.best_set_weight,
    'best_set_reps', p.best_set_reps,
    'occurred_at', p.occurred_at
  ) order by p.occurred_at desc), '[]'::jsonb)
  into v_prs
  from (
    select * from public.user_prs
    where user_id = p_user_id
    order by occurred_at desc
    limit 5
  ) p;

  return jsonb_build_object(
    'templates', v_templates,
    'recentSessions', v_recent,
    'stats', v_stats,
    'prs', v_prs
  );
end;
$$;

grant execute on function public.get_hub_summary(uuid) to authenticated;




