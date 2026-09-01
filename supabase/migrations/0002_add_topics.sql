alter table public.conversations
  add column topic text not null default 'general'
    check (topic in ('general', 'medical_history', 'symptoms', 'medications', 'family_history')),
  add column structured_data jsonb;
