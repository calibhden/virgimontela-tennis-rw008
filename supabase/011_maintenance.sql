-- 011_maintenance.sql — Maintenance section: asset registry + service/reparation log.
-- Starts with air conditioning (category 'ac'); other categories can be added later
-- by extending the category check below.

create table if not exists public.maintenance_assets (
  id uuid primary key default gen_random_uuid(),
  asset_code text not null,
  category text not null default 'ac'
    check (category in ('ac')),
  name text not null check (length(trim(name)) > 0),
  location text not null check (length(trim(location)) > 0),
  brand text,
  model text,
  unit_type text
    check (unit_type in ('split_wall', 'split_standing', 'cassette', 'window', 'portable', 'central')),
  capacity_pk numeric(4, 1),
  capacity_btu integer,
  refrigerant text
    check (refrigerant in ('R22', 'R32', 'R410A', 'R290')),
  indoor_serial text,
  outdoor_serial text,
  installed_on date,
  warranty_until date,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'retired')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists maintenance_assets_asset_code_unique
  on public.maintenance_assets (lower(trim(asset_code)));

create index if not exists maintenance_assets_category_status_idx
  on public.maintenance_assets (category, status);

comment on table public.maintenance_assets
  is 'Daftar aset yang dirawat pengurus (mulai dari AC). Ditampilkan di halaman /maintenance.';

create table if not exists public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.maintenance_assets(id) on delete cascade,
  service_date date not null,
  service_type text not null
    check (service_type in (
      'pembersihan_rutin', 'service_berkala', 'perbaikan',
      'penggantian_sparepart', 'inspeksi', 'instalasi', 'lainnya'
    )),
  description text,
  technician text,
  cost numeric(15, 2) check (cost is null or cost >= 0),
  next_service_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maintenance_logs_asset_date_idx
  on public.maintenance_logs (asset_id, service_date desc, id desc);

create index if not exists maintenance_logs_service_date_idx
  on public.maintenance_logs (service_date desc);

comment on table public.maintenance_logs
  is 'Riwayat servis dan perbaikan per aset maintenance (pembersihan rutin, service berkala, perbaikan, dst).';

drop trigger if exists maintenance_assets_touch_updated_at
  on public.maintenance_assets;
create trigger maintenance_assets_touch_updated_at
before update on public.maintenance_assets
for each row execute function public.touch_updated_at();

drop trigger if exists maintenance_logs_touch_updated_at
  on public.maintenance_logs;
create trigger maintenance_logs_touch_updated_at
before update on public.maintenance_logs
for each row execute function public.touch_updated_at();

alter table public.maintenance_assets enable row level security;
alter table public.maintenance_logs enable row level security;

drop policy if exists maintenance_assets_anon_read
  on public.maintenance_assets;
create policy maintenance_assets_anon_read
on public.maintenance_assets
for select to anon
using (true);

drop policy if exists maintenance_assets_authenticated_read
  on public.maintenance_assets;
create policy maintenance_assets_authenticated_read
on public.maintenance_assets
for select to authenticated
using (true);

drop policy if exists maintenance_assets_global_insert
  on public.maintenance_assets;
create policy maintenance_assets_global_insert
on public.maintenance_assets
for insert to authenticated
with check (public.is_global_admin());

drop policy if exists maintenance_assets_global_update
  on public.maintenance_assets;
create policy maintenance_assets_global_update
on public.maintenance_assets
for update to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists maintenance_assets_global_delete
  on public.maintenance_assets;
create policy maintenance_assets_global_delete
on public.maintenance_assets
for delete to authenticated
using (public.is_global_admin());

drop policy if exists maintenance_logs_anon_read
  on public.maintenance_logs;
create policy maintenance_logs_anon_read
on public.maintenance_logs
for select to anon
using (true);

drop policy if exists maintenance_logs_authenticated_read
  on public.maintenance_logs;
create policy maintenance_logs_authenticated_read
on public.maintenance_logs
for select to authenticated
using (true);

drop policy if exists maintenance_logs_global_insert
  on public.maintenance_logs;
create policy maintenance_logs_global_insert
on public.maintenance_logs
for insert to authenticated
with check (public.is_global_admin());

drop policy if exists maintenance_logs_global_update
  on public.maintenance_logs;
create policy maintenance_logs_global_update
on public.maintenance_logs
for update to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists maintenance_logs_global_delete
  on public.maintenance_logs;
create policy maintenance_logs_global_delete
on public.maintenance_logs
for delete to authenticated
using (public.is_global_admin());
