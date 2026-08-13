alter table public.players
  add column if not exists public_notes text;

comment on column public.players.public_notes
  is 'Catatan publik pemain yang ditampilkan bersama alamat pada detail booking.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname = 'players_public_notes_length_check'
  ) then
    alter table public.players
      add constraint players_public_notes_length_check
      check (public_notes is null or char_length(public_notes) <= 500);
  end if;
end
$$;
