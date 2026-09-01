alter table public.profiles add column is_admin boolean not null default false;

create table public.topic_overrides (
  topic text primary key check (topic in ('general', 'medical_history', 'symptoms', 'medications', 'family_history')),
  system_prompt text,
  first_message text,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.topic_overrides (topic) values
  ('general'), ('medical_history'), ('symptoms'), ('medications'), ('family_history');

alter table public.topic_overrides enable row level security;

-- Every signed-in user's calls should reflect the admin's current config, so
-- reads are open to any authenticated user (this is app-wide config, not
-- per-user data).
create policy "topic_overrides_select_authenticated" on public.topic_overrides
  for select using (auth.uid() is not null);

-- Only admins can change it.
create policy "topic_overrides_update_admin" on public.topic_overrides
  for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
