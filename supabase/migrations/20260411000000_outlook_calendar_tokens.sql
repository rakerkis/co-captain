create table if not exists public.outlook_calendar_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.outlook_calendar_tokens enable row level security;

create policy "Users can manage their own outlook tokens"
  on public.outlook_calendar_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
