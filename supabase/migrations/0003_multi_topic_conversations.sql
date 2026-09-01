-- Replace the single `topic` column with a `topics` array: a squad call can
-- now be transferred between specialists mid-call, so a conversation may
-- touch more than one topic.
alter table public.conversations add column topics text[];
update public.conversations set topics = array[topic];
alter table public.conversations alter column topics set not null;
alter table public.conversations alter column topics set default array['general']::text[];
alter table public.conversations add constraint conversations_topics_valid
  check (topics <@ array['general', 'medical_history', 'symptoms', 'medications', 'family_history']::text[]);
alter table public.conversations drop column topic;

-- Topics are now tagged as transfers happen *during* the call (the client
-- learns the destination topic from a transfer-update event), not only known
-- at creation time -- so the client needs a narrow ability to update its own
-- row while the call is still running. This intentionally does not extend to
-- finalized rows: once the webhook (service-role, bypasses RLS) sets
-- status to 'completed'/'failed', this policy's `using` clause no longer
-- matches and the row is locked from the browser again, same as before.
create policy "conversations_update_topics_while_in_progress" on public.conversations
  for update
  using (auth.uid() = user_id and status = 'in_progress')
  with check (auth.uid() = user_id and status = 'in_progress');
