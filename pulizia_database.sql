-- 5AHub — pulizia sezioni non più utilizzate (2026-10-20)
-- ESEGUIRE UNA SOLA VOLTA in Supabase > SQL Editor del progetto 5AHub.
-- ATTENZIONE: elimina definitivamente i contenuti viaggio/cena e l'agenda manuale.
begin;

delete from public.hub_posts where kind in ('trip','dinner');

-- Limita i nuovi post alle sole sezioni ancora presenti nel portale.
alter table public.hub_posts drop constraint if exists hub_posts_kind_check;
alter table public.hub_posts add constraint hub_posts_kind_check
  check (kind in ('announcement','opportunity','assembly'));

-- Non serve più: gli impegni sono esclusivamente su Google Calendar.
drop table if exists public.hub_weekly;

commit;
