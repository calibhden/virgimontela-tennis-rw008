alter table public.gate_fundraising_donations
  add column if not exists rekening_penampungan text;

update public.gate_fundraising_donations
set rekening_penampungan = 'Rek RT 02'
where rekening_penampungan is null;

alter table public.gate_fundraising_donations
  alter column rekening_penampungan set default 'Rek RT 02',
  alter column rekening_penampungan set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gate_fundraising_donations_rekening_penampungan_check'
  ) then
    alter table public.gate_fundraising_donations
      add constraint gate_fundraising_donations_rekening_penampungan_check
      check (rekening_penampungan in ('Rek RT 01', 'Rek RT 02'));
  end if;
end $$;

comment on column public.gate_fundraising_donations.rekening_penampungan
  is 'Rekening penampungan donasi: Rek RT 01 atau Rek RT 02.';
