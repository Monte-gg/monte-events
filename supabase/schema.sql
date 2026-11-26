-- MONTE EVENTS — Complete Supabase Database, Auth Trigger, Storage & Realtime Schema
-- Safe to run multiple times in Supabase Dashboard -> SQL Editor

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Monte Member',
  username text unique not null,
  bio text default 'Roadtrip captain & weekend event planner.',
  email text default '',
  phone text default '',
  location text default 'Nairobi, KE',
  birthday text default '1997-08-18',
  member_since text default to_char(now(), 'FMMonth YYYY'),
  mpesa_number text default '',
  avatar_url text default 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80',
  initials text default 'ME',
  preferred_types text[] default array['Roadtrip', 'Birthday', 'Beach Trip'],
  updated_at timestamptz default now()
);

-- Auto-create profile row when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  base_name text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Monte Member');
  base_username text := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')) || '_' || substr(new.id::text, 1, 4);
begin
  insert into public.profiles (id, name, username, email, phone, initials)
  values (
    new.id,
    base_name,
    base_username,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    upper(substr(base_name, 1, 2))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Events Table
create table if not exists public.events (
  id text primary key,
  name text not null,
  type text not null,
  custom_type text,
  date text not null,
  location text not null,
  description text default '',
  cover_image text default '',
  cover_gradient text default 'from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF]',
  total_budget numeric not null default 0,
  max_guests integer not null default 10,
  cost_per_person numeric not null default 0,
  invite_code text unique not null,
  budget_breakdown jsonb not null default '{"Transport":0,"Food":0,"Venue":0,"DJ":0,"Misc":0}'::jsonb,
  created_by text not null,
  created_at timestamptz default now()
);

-- 3. Event Guests Table
create table if not exists public.event_guests (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  friend_id text,
  name text not null,
  phone text default '',
  email text default '',
  initials text not null default 'G',
  avatar_color text not null default '#1A6BFF',
  amount numeric not null default 0,
  paid boolean not null default false,
  online boolean not null default false,
  paid_at text,
  created_at timestamptz default now()
);

-- 4. Event Messages Table
create table if not exists public.event_messages (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  sender_id text not null,
  sender_name text not null,
  sender_initials text not null default 'ME',
  sender_color text not null default '#1A6BFF',
  text text not null,
  timestamp_label text not null,
  media jsonb,
  reactions jsonb not null default '[]'::jsonb,
  reply_to jsonb,
  pinned boolean not null default false,
  created_at timestamptz default now()
);

-- 5. Event Media Vault Table
create table if not exists public.event_media (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  event_name text not null,
  type text not null check (type in ('photo', 'video')),
  url text not null,
  thumbnail text not null,
  title text not null,
  uploaded_by text not null,
  uploaded_at text not null default 'Just now',
  duration text,
  created_at timestamptz default now()
);

-- Enable Row Level Security (idempotent policies)
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_guests enable row level security;
alter table public.event_messages enable row level security;
alter table public.event_media enable row level security;

drop policy if exists "Public read/write profiles" on public.profiles;
create policy "Public read/write profiles" on public.profiles for all using (true) with check (true);

drop policy if exists "Public read/write events" on public.events;
create policy "Public read/write events" on public.events for all using (true) with check (true);

drop policy if exists "Public read/write guests" on public.event_guests;
create policy "Public read/write guests" on public.event_guests for all using (true) with check (true);

drop policy if exists "Public read/write messages" on public.event_messages;
create policy "Public read/write messages" on public.event_messages for all using (true) with check (true);

drop policy if exists "Public read/write media" on public.event_media;
create policy "Public read/write media" on public.event_media for all using (true) with check (true);

-- Storage bucket for event photos, videos, and avatars
insert into storage.buckets (id, name, public)
values ('event-media', 'event-media', true)
on conflict (id) do nothing;

drop policy if exists "Public read event-media" on storage.objects;
create policy "Public read event-media" on storage.objects
  for select using (bucket_id = 'event-media');

drop policy if exists "Public upload event-media" on storage.objects;
create policy "Public upload event-media" on storage.objects
  for insert with check (bucket_id = 'event-media');

drop policy if exists "Public update event-media" on storage.objects;
create policy "Public update event-media" on storage.objects
  for update using (bucket_id = 'event-media');

-- Enable Realtime on events, guests, messages, and media safely
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'event_guests'
  ) then
    alter publication supabase_realtime add table public.event_guests;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'event_messages'
  ) then
    alter publication supabase_realtime add table public.event_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'event_media'
  ) then
    alter publication supabase_realtime add table public.event_media;
  end if;
end $$;
