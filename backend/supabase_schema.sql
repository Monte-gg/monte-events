-- MONTE EVENTS — Backend Supabase Schema Migration
-- Paste and run in Supabase Dashboard -> SQL Editor
-- Safe to run multiple times (idempotent)

create extension if not exists pgcrypto;

-- 1. Rooms Table
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'Roadtrip',
  custom_type text,
  date text not null,
  location text not null default 'Nairobi, KE',
  description text default '',
  cover_image text default '',
  cover_gradient text default 'from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF]',
  total_budget numeric not null default 0,
  max_guests integer not null default 10,
  cost_per_person numeric not null default 0,
  invite_code text unique not null,
  budget_breakdown jsonb not null default '{"Transport":0,"Food":0,"Venue":0,"DJ":0,"Misc":0}'::jsonb,
  created_by text not null default 'Monte Host',
  created_at timestamptz not null default now()
);

-- 2. Guests Table
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  phone text default '',
  email text default '',
  initials text not null default 'G',
  avatar_color text not null default '#1A6BFF',
  amount numeric not null default 0,
  paid boolean not null default false,
  online boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_guests_room_id on public.guests(room_id);

-- 3. Messages Table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id text not null default 'me',
  sender_name text not null,
  sender_initials text not null default 'ME',
  sender_color text not null default '#1A6BFF',
  text text not null,
  timestamp_label text not null default 'Now',
  media jsonb,
  reactions jsonb not null default '[]'::jsonb,
  reply_to jsonb,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_room_id on public.messages(room_id);

-- 4. Media Table
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete set null,
  event_name text not null default 'Monte Event',
  type text not null check (type in ('photo', 'video')),
  url text not null,
  thumbnail text not null,
  title text not null,
  uploaded_by text not null default 'Monte Member',
  uploaded_at text not null default 'Just now',
  duration text,
  created_at timestamptz not null default now()
);

create index if not exists idx_media_room_id on public.media(room_id);

-- Enable Row Level Security (RLS)
-- Note: The Render backend uses SUPABASE_SERVICE_ROLE_KEY which safely bypasses RLS.
-- Public/anon reads are allowed; writes should go through the Express API or authenticated sessions.
alter table public.rooms enable row level security;
alter table public.guests enable row level security;
alter table public.messages enable row level security;
alter table public.media enable row level security;

drop policy if exists "Allow read rooms" on public.rooms;
create policy "Allow read rooms" on public.rooms
  for select using (true);

drop policy if exists "Allow authenticated write rooms" on public.rooms;
create policy "Allow authenticated write rooms" on public.rooms
  for all to authenticated using (true) with check (true);

drop policy if exists "Allow read guests" on public.guests;
create policy "Allow read guests" on public.guests
  for select using (true);

drop policy if exists "Allow authenticated write guests" on public.guests;
create policy "Allow authenticated write guests" on public.guests
  for all to authenticated using (true) with check (true);

drop policy if exists "Allow read messages" on public.messages;
create policy "Allow read messages" on public.messages
  for select using (true);

drop policy if exists "Allow authenticated write messages" on public.messages;
create policy "Allow authenticated write messages" on public.messages
  for all to authenticated using (true) with check (true);

drop policy if exists "Allow read media" on public.media;
create policy "Allow read media" on public.media
  for select using (true);

drop policy if exists "Allow authenticated write media" on public.media;
create policy "Allow authenticated write media" on public.media
  for all to authenticated using (true) with check (true);
