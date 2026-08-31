-- Phase 2 harden for an existing JobHawk database.
-- Paste once in the Supabase SQL Editor (Project → SQL → New query → Run).
-- Idempotent. Does not drop tables or user data.

-- Encrypted API keys: service-role only (app already uses the admin client).
alter table public.user_api_keys enable row level security;
drop policy if exists "Users manage own keys" on public.user_api_keys;

-- Trigger function: pin search_path so SECURITY DEFINER cannot be hijacked.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
