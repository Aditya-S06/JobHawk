-- JobHawk: identity, resume, and job pipeline schema.
-- Run this once in the Supabase SQL Editor (Project → SQL → New query → paste → Run).

-- Enable pgvector for semantic search capabilities
create extension if not exists vector;

-- 1. Profiles Table (Tied directly to Supabase Auth metadata)
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    name text,
    email text unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Resumes Table
create table if not exists public.resumes (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    raw_text text not null,
    structured_json jsonb,
    embedding vector(1536),
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Jobs Pipeline Table
create table if not exists public.jobs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    job_id_external text not null,
    title text not null,
    company text not null,
    location text,
    description text,
    url text,
    status text default 'saved' check (status in ('saved', 'tailoring', 'applied', 'interviewing', 'rejected')),
    tailored_resume_text text,
    notion_page_id text,
    applied_at date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, job_id_external)
);

-- Backfill columns on pre-existing tables (idempotent).
alter table public.jobs add column if not exists notion_page_id text;
alter table public.jobs add column if not exists applied_at date;

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.resumes  enable row level security;
alter table public.jobs     enable row level security;

-- RLS Isolation Policies (idempotent re-create)
drop policy if exists "Users can view own profile"   on public.profiles;
drop policy if exists "Users can modify own profile" on public.profiles;
drop policy if exists "Users can manage own resumes" on public.resumes;
drop policy if exists "Users can manage own jobs"    on public.jobs;

create policy "Users can view own profile"
    on public.profiles for select using (auth.uid() = id);

create policy "Users can modify own profile"
    on public.profiles for all using (auth.uid() = id);

create policy "Users can manage own resumes"
    on public.resumes for all using (auth.uid() = user_id);

create policy "Users can manage own jobs"
    on public.jobs for all using (auth.uid() = user_id);

-- 4. Per-user encrypted API keys (BYO-keys for SerpApi / Gemini / Notion)
create table if not exists public.user_api_keys (
    user_id uuid references public.profiles(id) on delete cascade not null,
    provider text not null check (provider in ('serpapi','gemini','notion','notion_data_source')),
    encrypted_value text not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (user_id, provider)
);

alter table public.user_api_keys enable row level security;

-- Ciphertext is read/written only via the service-role server client after
-- getUser(). No policies for anon/authenticated — fail closed. Service role
-- bypasses RLS. Drop any leftover "Users manage own keys" policy on existing DBs.
drop policy if exists "Users manage own keys" on public.user_api_keys;

-- Auto-create profiles row when a new auth user signs up. Without this, an
-- account exists in auth.users but every public.* foreign key against
-- profiles(id) would fail until we manually inserted a row.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
