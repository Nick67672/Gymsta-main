-- Workout Tracker tables and functions
-- enables workout planning, live session tracking, and analytics

-- 1. Workouts table ---------------------------------------------
create extension if not exists "uuid-ossp";

create table if not exists public.workouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  is_completed boolean not null default false,
  name text,
  notes text,
  created_at timestamp with time zone default now()
);

create index if not exists workouts_user_id_idx on public.workouts(user_id);
create index if not exists workouts_date_idx on public.workouts(date);

alter table public.workouts enable row level security;

-- Allow owners full access
create policy if not exists "Workouts owner access" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. workout_exercises table -------------------------------------
create table if not exists public.workout_exercises (
  id uuid primary key default uuid_generate_v4(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  name text not null,
  sets integer not null default 0,
  reps integer not null default 0,
  weight numeric not null default 0,
  volume numeric not null default 0,
  notes text,
  order_index integer not null default 0,
  created_at timestamp with time zone default now()
);

create index if not exists workout_exercises_workout_id_idx on public.workout_exercises(workout_id);

alter table public.workout_exercises enable row level security;

create policy if not exists "Workout exercises owner access" on public.workout_exercises
  for all using (
    auth.uid() = (
      select user_id from public.workouts w where w.id = workout_id
    )
  ) with check (auth.uid() = (
      select user_id from public.workouts w where w.id = workout_id
    ));

-- 3. exercise_history helper table --------------------------------
-- Keeps track of how often a user logs an exercise for suggestion purposes
create table if not exists public.exercise_history (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  use_count integer not null default 0,
  updated_at timestamp with time zone default now(),
  unique(user_id, exercise_name)
);

alter table public.exercise_history enable row level security;
create policy if not exists "Exercise history owner access" on public.exercise_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trigger to update exercise_history whenever a workout exercise is inserted
create or replace function public.log_exercise_history()
returns trigger language plpgsql as $$
begin
  insert into public.exercise_history(user_id, exercise_name, use_count)
  values ((select user_id from public.workouts w where w.id = new.workout_id), new.name, 1)
  on conflict(user_id, exercise_name) do update set use_count = exercise_history.use_count + 1, updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_log_exercise_history on public.workout_exercises;
create trigger trg_log_exercise_history after insert on public.workout_exercises
  for each row execute procedure public.log_exercise_history();

-- 4. Analytics RPC ------------------------------------------------
create or replace function public.get_workout_volume_data(
  p_user_id uuid,
  p_exercise_name text,
  p_days_back integer default 30
)
returns table (
  workout_date date,
  exercise_name text,
  total_volume numeric,
  total_sets integer,
  total_reps integer,
  max_weight numeric
) language sql stable as $$
  select
    w.date as workout_date,
    we.name as exercise_name,
    sum(we.volume) as total_volume,
    sum(we.sets) as total_sets,
    sum(we.reps * we.sets) as total_reps,
    max(we.weight) as max_weight
  from public.workouts w
  join public.workout_exercises we on we.workout_id = w.id
  where w.user_id = p_user_id
    and w.date >= (current_date - p_days_back)
    and we.name ilike p_exercise_name
    and w.is_completed = true
  group by w.date, we.name
  order by w.date;
$$;

-- Grant execute on function to anon & authenticated (optional)
grant execute on function public.get_workout_volume_data to authenticated;

-- 5. Supabase storage buckets (optional) ---------------------------
-- For progress images or workout photos; create via dashboard if needed
-- storage.create_bucket('progress-images', true, 'authenticated');

-- 6. DONE --------------------------------------------------------- 