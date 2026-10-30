-- Run once in Supabase → SQL Editor. Adds "Who's most likely to…" polls.
-- The host keeps a list of polls per room and asks the room one at a time; guests vote for a player.
create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  question text not null,  -- the part after "Who's most likely to…", e.g. "scream at their own reflection?"
  status text not null default 'draft' check (status in ('draft', 'live', 'revealed')),
  asked_at timestamptz,
  revealed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists poll_votes (
  poll_id uuid not null references polls (id) on delete cascade,
  voter_id uuid not null references players (id) on delete cascade,
  target_id uuid not null references players (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, voter_id)  -- one vote per player per poll
);

create index if not exists polls_room_idx on polls (room_id);
-- Only one poll can be live in a room at a time.
create unique index if not exists polls_one_live_idx on polls (room_id) where status = 'live';

alter table polls enable row level security;
alter table poll_votes enable row level security;
