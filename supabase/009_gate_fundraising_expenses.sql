create table if not exists public.gate_fundraising_expenses (
  id bigint generated always as identity primary key,
  tanggal date not null,
  uraian text not null check (length(trim(uraian)) > 0),
  penerima text,
  jumlah numeric(15, 2) not null check (jumlah > 0),
  keterangan text,
  bukti_url text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gate_fundraising_expenses
  is 'Pengeluaran dana pembangunan Gate Virgimontela yang dipublikasikan untuk transparansi warga.';

create index if not exists gate_fundraising_expenses_tanggal_idx
  on public.gate_fundraising_expenses (tanggal, id);

drop trigger if exists gate_fundraising_expenses_touch_updated_at
  on public.gate_fundraising_expenses;
create trigger gate_fundraising_expenses_touch_updated_at
before update on public.gate_fundraising_expenses
for each row execute function public.touch_updated_at();

alter table public.gate_fundraising_expenses enable row level security;

drop policy if exists gate_fundraising_expenses_anon_read
  on public.gate_fundraising_expenses;
create policy gate_fundraising_expenses_anon_read
on public.gate_fundraising_expenses
for select to anon
using (true);

drop policy if exists gate_fundraising_expenses_authenticated_read
  on public.gate_fundraising_expenses;
create policy gate_fundraising_expenses_authenticated_read
on public.gate_fundraising_expenses
for select to authenticated
using (true);

drop policy if exists gate_fundraising_expenses_global_insert
  on public.gate_fundraising_expenses;
create policy gate_fundraising_expenses_global_insert
on public.gate_fundraising_expenses
for insert to authenticated
with check (public.is_global_admin());

drop policy if exists gate_fundraising_expenses_global_update
  on public.gate_fundraising_expenses;
create policy gate_fundraising_expenses_global_update
on public.gate_fundraising_expenses
for update to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists gate_fundraising_expenses_global_delete
  on public.gate_fundraising_expenses;
create policy gate_fundraising_expenses_global_delete
on public.gate_fundraising_expenses
for delete to authenticated
using (public.is_global_admin());

grant select on public.gate_fundraising_expenses to anon, authenticated;
grant insert, update, delete on public.gate_fundraising_expenses to authenticated;
grant usage, select on sequence public.gate_fundraising_expenses_id_seq to authenticated;
