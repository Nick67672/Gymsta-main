-- Create private user weight entries table
-- Stores daily (or ad-hoc) weight entries in kg; not exposed on public profiles

create table if not exists public.user_weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recorded_on date not null,
  weight_kg numeric not null check (weight_kg >= 0 and weight_kg <= 500),
  source text, -- 'manual', 'onboarding', 'import', etc.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_user_weight_per_day unique (user_id, recorded_on)
);

-- RLS
alter table public.user_weight_entries enable row level security;

-- Policies: users can manage their own entries
create policy if not exists "users can view own weight entries"
  on public.user_weight_entries for select
  to authenticated
  using (auth.uid() = user_id);

create policy if not exists "users can insert own weight entries"
  on public.user_weight_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy if not exists "users can update own weight entries"
  on public.user_weight_entries for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "users can delete own weight entries"
  on public.user_weight_entries for delete
  to authenticated
  using (auth.uid() = user_id);

-- Helpful indexes
create index if not exists idx_weight_user_date on public.user_weight_entries(user_id, recorded_on desc);

-- Trigger to keep updated_at current
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_weight_entries_updated_at on public.user_weight_entries;
create trigger trg_user_weight_entries_updated_at
before update on public.user_weight_entries
for each row execute procedure public.set_updated_at();


