-- Say You Dare: run this once in Supabase → SQL Editor → New query → Run.
--
-- Security model: the browser never talks to Supabase directly. Every read and
-- write goes through Next.js server code using the secret key, which bypasses RLS.
-- RLS is enabled with no policies, so the public/publishable key can read nothing.

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique check (code ~ '^[0-9]{4}$'),  -- 4-digit join PIN; set to null when released for reuse
  name text not null,
  host_key text not null,                         -- lets the host log in on another device
  status text not null default 'lobby' check (status in ('lobby', 'active', 'ended')),
  created_at timestamptz not null default now()
);

create table if not exists dares (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  text text not null,
  points int not null default 1 check (points between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  name text not null,
  is_host boolean not null default false,
  current_dare_id uuid references dares (id) on delete set null,
  created_at timestamptz not null default now()
);

-- One name per room (case-insensitive), so the leaderboard is unambiguous.
create unique index if not exists players_room_name_idx on players (room_id, lower(name));

-- A player can be signed in on several devices (e.g. the host on a phone and a laptop).
create table if not exists sessions (
  token_hash text primary key,
  player_id uuid not null references players (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  dare_id uuid references dares (id) on delete set null,
  dare_text text not null,  -- snapshot, so history survives the host deleting the dare
  points int not null,
  photo_path text not null,
  status text not null default 'approved' check (status in ('approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists dares_room_idx on dares (room_id);
create index if not exists players_room_idx on players (room_id);
create index if not exists submissions_room_idx on submissions (room_id);
create index if not exists submissions_player_idx on submissions (player_id);

alter table rooms enable row level security;
alter table dares enable row level security;
alter table players enable row level security;
alter table sessions enable row level security;
alter table submissions enable row level security;

-- Private bucket for proof photos. The host sees them through short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
