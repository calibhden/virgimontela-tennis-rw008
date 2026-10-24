-- 012_maintenance_photo.sql — photo per maintenance asset (e.g. photo of the AC unit).
-- Photos live in the repo under assets/maintenance/ (same pattern as assets/gate/),
-- so the site's CSP (img-src 'self') already allows them. photo_url stores the
-- site-relative path, e.g. '/assets/maintenance/AC-CLB-01.jpg'.

alter table public.maintenance_assets
  add column if not exists photo_url text;

comment on column public.maintenance_assets.photo_url
  is 'Foto unit aset, path relatif situs (mis. /assets/maintenance/AC-CLB-01.jpg).';
