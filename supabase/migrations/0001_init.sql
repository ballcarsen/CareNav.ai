-- profiles: one row per authenticated user, auto-created on signup
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'patient' check (role in ('patient', 'family_member')),
  display_name text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- conversations: one row per Vapi call
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vapi_call_id text unique,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  transcript jsonb,
  summary text,
  ended_reason text,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "conversations_select_own" on public.conversations
  for select using (auth.uid() = user_id);
create policy "conversations_insert_own" on public.conversations
  for insert with check (auth.uid() = user_id);
-- No update/delete policy for regular users: only the webhook route
-- (using the service-role key, which bypasses RLS) finalizes a row's
-- transcript/summary/status, so a client can never tamper with its own
-- conversation record after creating it.

create index conversations_user_id_started_at_idx
  on public.conversations (user_id, started_at desc);
create index conversations_vapi_call_id_idx
  on public.conversations (vapi_call_id);
