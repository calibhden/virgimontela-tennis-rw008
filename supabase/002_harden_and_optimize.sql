revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.audit_booking_change() from public, anon, authenticated;

create index if not exists audit_events_actor_id_idx on public.audit_events (actor_id);
create index if not exists booking_players_player_id_idx on public.booking_players (player_id);
create index if not exists bookings_created_by_idx on public.bookings (created_by);
create index if not exists bookings_updated_by_idx on public.bookings (updated_by);

drop policy if exists courts_public_read on public.courts;
drop policy if exists courts_global_write on public.courts;
create policy courts_anon_read on public.courts
for select to anon using (true);
create policy courts_authenticated_read on public.courts
for select to authenticated using (true);
create policy courts_global_insert on public.courts
for insert to authenticated with check (public.is_global_admin());
create policy courts_global_update on public.courts
for update to authenticated using (public.is_global_admin()) with check (public.is_global_admin());
create policy courts_global_delete on public.courts
for delete to authenticated using (public.is_global_admin());

drop policy if exists players_public_read on public.players;
drop policy if exists players_admin_read_all on public.players;
drop policy if exists players_global_write on public.players;
create policy players_anon_read on public.players
for select to anon using (is_active = true);
create policy players_authenticated_read on public.players
for select to authenticated using (is_active = true or public.can_schedule());
create policy players_global_insert on public.players
for insert to authenticated with check (public.is_global_admin());
create policy players_global_update on public.players
for update to authenticated using (public.is_global_admin()) with check (public.is_global_admin());
create policy players_global_delete on public.players
for delete to authenticated using (public.is_global_admin());

drop policy if exists player_private_admin_read on public.player_private;
drop policy if exists player_private_global_write on public.player_private;
create policy player_private_admin_read on public.player_private
for select to authenticated using (public.can_schedule());
create policy player_private_global_insert on public.player_private
for insert to authenticated with check (public.is_global_admin());
create policy player_private_global_update on public.player_private
for update to authenticated using (public.is_global_admin()) with check (public.is_global_admin());
create policy player_private_global_delete on public.player_private
for delete to authenticated using (public.is_global_admin());

drop policy if exists bookings_public_read on public.bookings;
drop policy if exists bookings_admin_read_all on public.bookings;
create policy bookings_anon_read on public.bookings
for select to anon using (status = 'confirmed');
create policy bookings_authenticated_read on public.bookings
for select to authenticated using (status = 'confirmed' or public.can_schedule());

drop policy if exists booking_players_admin_read on public.booking_players;
drop policy if exists booking_players_admin_write on public.booking_players;
create policy booking_players_admin_read on public.booking_players
for select to authenticated using (public.can_schedule());
create policy booking_players_admin_insert on public.booking_players
for insert to authenticated with check (public.can_schedule());
create policy booking_players_admin_update on public.booking_players
for update to authenticated using (public.can_schedule()) with check (public.can_schedule());
create policy booking_players_admin_delete on public.booking_players
for delete to authenticated using (public.can_schedule());
