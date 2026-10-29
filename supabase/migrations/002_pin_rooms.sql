-- Run once if you already ran the original schema.sql (switches rooms to 4-digit PINs, no passwords).
-- Safe while the rooms table is empty; it deletes any existing rooms (and their players/dares/proofs rows).
delete from rooms;
alter table rooms drop column if exists password_hash;
alter table rooms drop column if exists host_pin_hash;
alter table rooms add column if not exists host_key text not null;
alter table rooms alter column code drop not null;
alter table rooms add constraint rooms_code_pin check (code ~ '^[0-9]{4}$');
