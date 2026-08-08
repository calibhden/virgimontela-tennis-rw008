alter table public.player_private
  add column if not exists email text,
  add column if not exists player_status text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.player_private'::regclass
      and conname = 'player_private_status_check'
  ) then
    alter table public.player_private
      add constraint player_private_status_check
      check (
        player_status is null
        or player_status in ('pemilik', 'penyewa', 'pelatih')
      );
  end if;
end
$$;

comment on column public.player_private.email
  is 'Alamat email pemain; hanya dapat dibaca oleh admin.';
comment on column public.player_private.player_status
  is 'Status pemain: pemilik, penyewa, atau pelatih; hanya dapat dibaca oleh admin.';

drop policy if exists players_global_insert on public.players;
drop policy if exists players_global_update on public.players;
drop policy if exists player_private_global_insert on public.player_private;
drop policy if exists player_private_global_update on public.player_private;

create policy players_admin_insert on public.players
for insert to authenticated
with check (public.can_schedule());

create policy players_admin_update on public.players
for update to authenticated
using (public.can_schedule())
with check (public.can_schedule());

create policy player_private_admin_insert on public.player_private
for insert to authenticated
with check (public.can_schedule());

create policy player_private_admin_update on public.player_private
for update to authenticated
using (public.can_schedule())
with check (public.can_schedule());
