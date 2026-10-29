-- Run once in Supabase → SQL Editor. Switches dare proof from photos to a witness:
-- a player claims a dare and names someone who saw it; that witness confirms or calls it out.
-- Safe on existing data: old photo submissions stay as they are.
alter table submissions alter column photo_path drop not null;
alter table submissions add column if not exists witness_id uuid references players (id) on delete set null;

alter table submissions drop constraint if exists submissions_status_check;
alter table submissions add constraint submissions_status_check check (status in ('pending', 'approved', 'rejected'));

create index if not exists submissions_witness_idx on submissions (witness_id) where status = 'pending';
