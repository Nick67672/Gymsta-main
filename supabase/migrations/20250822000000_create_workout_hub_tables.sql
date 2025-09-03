-- Create Workout Hub supporting tables: user_goals, goal_progress, user_prs, user_stats_snapshot
-- Includes RLS and policies per spec

-- Enable required extension
create extension if not exists pgcrypto;

-- user_goals
create table if not exists public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('one_rm','total_volume','workouts_per_week','body_weight','custom')),
  target_exercise_name text null,
  target_value numeric not null,
  unit text not null,
  due_at date null,
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_at timestamptz not null default now()
);

alter table public.user_goals enable row level security;

do $$ begin
  create policy "goals_select_own" on public.user_goals
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "goals_insert_own" on public.user_goals
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "goals_update_own" on public.user_goals
    for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "goals_delete_own" on public.user_goals
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_user_goals_user_id on public.user_goals(user_id);

-- goal_progress
create table if not exists public.goal_progress (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.user_goals(id) on delete cascade,
  session_workout_id uuid references public.workouts(id) on delete cascade,
  value numeric not null,
  created_at timestamptz not null default now()
);

alter table public.goal_progress enable row level security;

do $$ begin
  create policy "goal_progress_select_own" on public.goal_progress
    for select using (
      exists (
        select 1 from public.user_goals g
        where g.id = goal_id and g.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "goal_progress_insert_own" on public.goal_progress
    for insert with check (
      exists (
        select 1 from public.user_goals g
        where g.id = goal_id and g.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

create index if not exists idx_goal_progress_goal_id on public.goal_progress(goal_id);

-- user_prs
create table if not exists public.user_prs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  best_1rm numeric not null,
  best_set_weight numeric not null,
  best_set_reps integer not null,
  occurred_at timestamptz not null default now(),
  constraint uq_user_prs unique (user_id, exercise_name)
);

alter table public.user_prs enable row level security;

do $$ begin
  create policy "user_prs_select_own" on public.user_prs
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "user_prs_upsert_own" on public.user_prs
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "user_prs_update_own" on public.user_prs
    for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_user_prs_user_id on public.user_prs(user_id);

-- user_stats_snapshot
create table if not exists public.user_stats_snapshot (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  total_workouts integer not null,
  total_volume numeric not null,
  streak integer not null,
  constraint uq_user_stats_snapshot unique (user_id, date)
);

alter table public.user_stats_snapshot enable row level security;

do $$ begin
  create policy "user_stats_snapshot_select_own" on public.user_stats_snapshot
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_user_stats_snapshot_user_date on public.user_stats_snapshot(user_id, date desc);


