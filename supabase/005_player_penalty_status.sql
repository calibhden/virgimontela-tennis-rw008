alter table public.player_private
  add column if not exists penalty_status text not null default 'clear',
  add column if not exists penalty_until date,
  add column if not exists penalty_notes text;

alter table public.player_private
  drop constraint if exists player_private_penalty_status_check;

alter table public.player_private
  add constraint player_private_penalty_status_check
  check (penalty_status in (
    'clear',
    'no_show_warning',
    'no_show_2_weeks',
    'no_show_2_months',
    'violation_6_months',
    'blacklisted'
  ));

comment on column public.player_private.penalty_status
  is 'Status penalti privat sesuai buku panduan; hanya dapat diakses admin.';
comment on column public.player_private.penalty_until
  is 'Tanggal berakhir penalti jika berlaku.';
comment on column public.player_private.penalty_notes
  is 'Catatan internal admin terkait no-show atau pelanggaran.';
