alter table public.bookings
  add column if not exists owner_player_id bigint references public.players(id) on delete set null;

create index if not exists bookings_owner_player_id_idx
  on public.bookings (owner_player_id);

comment on column public.bookings.owner_player_id
  is 'Pemain yang bertanggung jawab atas booking dan menjadi acuan status prioritas rendah.';

create table if not exists public.player_no_show_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  player_id bigint not null references public.players(id) on delete cascade,
  occurred_on date not null,
  court_id text references public.courts(id),
  start_at timestamptz,
  end_at timestamptz,
  policy_phase text not null check (policy_phase in ('transition', 'enforced')),
  enforcement_strike smallint check (enforcement_strike is null or enforcement_strike >= 1),
  sanction_until date,
  expires_on date generated always as (occurred_on + 60) stored,
  internal_notes text,
  created_by uuid references auth.users(id) on delete set null,
  voided_at timestamptz,
  voided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint player_no_show_event_time_check check (
    (start_at is null and end_at is null)
    or (start_at is not null and end_at is not null and end_at > start_at)
  )
);

create index if not exists player_no_show_events_player_date_idx
  on public.player_no_show_events (player_id, occurred_on desc);

create index if not exists player_no_show_events_booking_idx
  on public.player_no_show_events (booking_id);

create unique index if not exists player_no_show_events_active_booking_player_unique
  on public.player_no_show_events (booking_id, player_id)
  where booking_id is not null and voided_at is null;

comment on table public.player_no_show_events
  is 'Riwayat kejadian no-show. Catatan publik aktif selama 60 hari; fase transisi tidak menghitung larangan booking.';

alter table public.player_no_show_events enable row level security;

drop policy if exists booking_players_anon_read on public.booking_players;
create policy booking_players_anon_read on public.booking_players
for select to anon
using (
  exists (
    select 1
    from public.bookings
    where bookings.id = booking_players.booking_id
      and bookings.status = 'confirmed'
  )
);

drop policy if exists player_no_show_events_anon_read on public.player_no_show_events;
drop policy if exists player_no_show_events_admin_read on public.player_no_show_events;
drop policy if exists player_no_show_events_admin_insert on public.player_no_show_events;
drop policy if exists player_no_show_events_admin_update on public.player_no_show_events;

create policy player_no_show_events_anon_read on public.player_no_show_events
for select to anon
using (voided_at is null and expires_on >= (now() at time zone 'Asia/Jakarta')::date);

create policy player_no_show_events_admin_read on public.player_no_show_events
for select to authenticated
using (public.can_schedule());

create policy player_no_show_events_admin_insert on public.player_no_show_events
for insert to authenticated
with check (public.can_schedule());

create policy player_no_show_events_admin_update on public.player_no_show_events
for update to authenticated
using (public.can_schedule())
with check (public.can_schedule());

revoke all on public.player_no_show_events from anon, authenticated;
grant select (id, booking_id, player_id, occurred_on, court_id, start_at, end_at, policy_phase, enforcement_strike, sanction_until, expires_on)
  on public.player_no_show_events to anon;
grant select, insert, update on public.player_no_show_events to authenticated;
grant select on public.booking_players to anon;

create or replace function public.record_booking_no_show(
  target_booking_id uuid,
  target_player_ids bigint[],
  event_notes text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_booking public.bookings%rowtype;
  selected_player_id bigint;
  inserted_count integer := 0;
  event_phase text;
  event_strike smallint;
  event_sanction_until date;
  booking_date date;
begin
  if not public.can_schedule() then
    raise exception 'Only scheduling administrators can record no-show events';
  end if;

  select * into selected_booking
  from public.bookings
  where id = target_booking_id;

  if selected_booking.id is null then
    raise exception 'Booking not found';
  end if;

  if coalesce(array_length(target_player_ids, 1), 0) = 0 then
    raise exception 'Select at least one responsible player';
  end if;

  booking_date := (selected_booking.start_at at time zone 'Asia/Jakarta')::date;
  event_phase := case
    when booking_date < date '2026-11-08'
      then 'transition'
    else 'enforced'
  end;

  foreach selected_player_id in array target_player_ids loop
    if not exists (
      select 1 from public.players
      where id = selected_player_id and is_active = true
    ) then
      raise exception 'Player % is unavailable', selected_player_id;
    end if;

    if not exists (
      select 1 from public.player_no_show_events
      where booking_id = target_booking_id
        and player_id = selected_player_id
        and voided_at is null
    ) then
      event_strike := null;
      event_sanction_until := null;
      if event_phase = 'enforced' then
        select (count(*) + 1)::smallint into event_strike
        from public.player_no_show_events
        where player_id = selected_player_id
          and policy_phase = 'enforced'
          and voided_at is null
          and expires_on >= booking_date
          and occurred_on <= booking_date;

        event_sanction_until := case
          when event_strike >= 3 then booking_date + 60
          when event_strike = 2 then booking_date + 14
          else null
        end;
      end if;

      insert into public.player_no_show_events (
        booking_id,
        player_id,
        occurred_on,
        court_id,
        start_at,
        end_at,
        policy_phase,
        enforcement_strike,
        sanction_until,
        internal_notes,
        created_by
      ) values (
        selected_booking.id,
        selected_player_id,
        booking_date,
        selected_booking.court_id,
        selected_booking.start_at,
        selected_booking.end_at,
        event_phase,
        event_strike,
        event_sanction_until,
        nullif(trim(coalesce(event_notes, '')), ''),
        (select auth.uid())
      );
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  insert into public.audit_events (actor_id, entity_type, entity_id, action, detail)
  values (
    (select auth.uid()),
    'booking',
    target_booking_id::text,
    'record_no_show',
    jsonb_build_object('player_ids', target_player_ids, 'policy_phase', event_phase, 'inserted_count', inserted_count)
  );

  return inserted_count;
end;
$$;

create or replace function public.void_no_show_event(target_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer;
  changed_player_id bigint;
  recalculated_strike smallint := 0;
  remaining_event record;
begin
  if not public.can_schedule() then
    raise exception 'Only scheduling administrators can void no-show events';
  end if;

  select player_id into changed_player_id
  from public.player_no_show_events
  where id = target_event_id and voided_at is null;

  update public.player_no_show_events
  set voided_at = now(), voided_by = (select auth.uid())
  where id = target_event_id and voided_at is null;

  get diagnostics changed_count = row_count;

  if changed_count > 0 then
    for remaining_event in
      select id, occurred_on
      from public.player_no_show_events
      where player_id = changed_player_id
        and policy_phase = 'enforced'
        and voided_at is null
        and expires_on >= (now() at time zone 'Asia/Jakarta')::date
      order by occurred_on, created_at, id
    loop
      recalculated_strike := recalculated_strike + 1;
      update public.player_no_show_events
      set enforcement_strike = recalculated_strike,
          sanction_until = case
            when recalculated_strike >= 3 then remaining_event.occurred_on + 60
            when recalculated_strike = 2 then remaining_event.occurred_on + 14
            else null
          end
      where id = remaining_event.id;
    end loop;

    insert into public.audit_events (actor_id, entity_type, entity_id, action)
    values ((select auth.uid()), 'player_no_show_event', target_event_id::text, 'void');
  end if;

  return changed_count > 0;
end;
$$;

revoke all on function public.record_booking_no_show(uuid, bigint[], text) from public, anon;
revoke all on function public.void_no_show_event(uuid) from public, anon;
grant execute on function public.record_booking_no_show(uuid, bigint[], text) to authenticated;
grant execute on function public.void_no_show_event(uuid) to authenticated;
