/opt/homebrew/Library/Homebrew/cmd/shellenv.sh: line 18: /bin/ps: Operation not permitted
create or replace function public.set_booking_players(
  target_booking_id uuid,
  target_player_ids bigint[] default '{}'::bigint[]
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_count integer;
begin
  if not public.can_schedule() then
    raise exception 'Only scheduling administrators can manage booking players';
  end if;

  if not exists (
    select 1 from public.bookings where id = target_booking_id
  ) then
    raise exception 'Booking not found';
  end if;

  if exists (
    select 1
    from unnest(coalesce(target_player_ids, '{}'::bigint[])) as selected(player_id)
    left join public.players on players.id = selected.player_id
    where players.id is null or not players.is_active
  ) then
    raise exception 'One or more selected players are unavailable';
  end if;

  delete from public.booking_players
  where booking_id = target_booking_id;

  insert into public.booking_players (booking_id, player_id, is_resident)
  select target_booking_id, selected.player_id, true
  from (
    select distinct unnest(coalesce(target_player_ids, '{}'::bigint[])) as player_id
  ) as selected;

  get diagnostics saved_count = row_count;
  return saved_count;
end;
$$;

revoke all on function public.set_booking_players(uuid, bigint[]) from public, anon;
grant execute on function public.set_booking_players(uuid, bigint[]) to authenticated;
