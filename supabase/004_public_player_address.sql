alter table public.players
  add column if not exists block text,
  add column if not exists house_number text;

update public.players p
set
  block = case
    when pp.residence like '%/%'
      then nullif(trim(split_part(pp.residence, '/', 1)), '')
    when trim(pp.residence) ~ '^[[:alpha:]]+[[:digit:]]'
      then nullif(substring(trim(pp.residence) from '^([[:alpha:]]+)'), '')
    else nullif(trim(pp.residence), '')
  end,
  house_number = case
    when pp.residence like '%/%'
      then nullif(trim(substring(pp.residence from position('/' in pp.residence) + 1)), '')
    when trim(pp.residence) ~ '^[[:alpha:]]+[[:digit:]]'
      then nullif(regexp_replace(trim(pp.residence), '^[[:alpha:]]+', ''), '')
    else null
  end
from public.player_private pp
where pp.player_id = p.id
  and nullif(trim(pp.residence), '') is not null
  and (p.block is null or p.house_number is null);

comment on column public.players.block
  is 'Blok tempat tinggal yang ditampilkan pada daftar pemain publik.';
comment on column public.players.house_number
  is 'Nomor rumah yang ditampilkan pada daftar pemain publik.';
