-- 5AHub - invio immediato delle notifiche e polling calendario ogni minuto.
-- PREREQUISITI:
--   1. Esegui prima database/notification_setup.sql (già presente nel repository).
--   2. Pubblica la Edge Function hub-notifications (verify_jwt = false).
--   3. Crea i segreti Vault "hub_notify_endpoint" e "hub_notify_token" (vedi guida).
--   4. Configura HUB_WEBHOOK_SECRET e le chiavi VAPID come Edge Function Secrets.
-- La configurazione non elimina dati o sottoscrizioni esistenti.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Verifica che le due configurazioni private esistano, senza mostrarne i valori.
do $$
begin
 if not exists (select 1 from vault.decrypted_secrets where name='hub_notify_endpoint') then
    raise exception 'Crea prima il segreto Vault hub_notify_endpoint';
 end if;
 if not exists (select 1 from vault.decrypted_secrets where name='hub_notify_token') then
    raise exception 'Crea prima il segreto Vault hub_notify_token';
 end if;
end $$;

-- Rende sicura la presa in carico concorrente di più eventi evitando invii duplicati.
alter table public.hub_push_events
  add column if not exists processing_until timestamptz,
  add column if not exists attempts integer not null default 0,
  add column if not exists last_error text;

create or replace function public.hub_claim_push_events(batch_size integer default 12)
returns setof public.hub_push_events
language sql
security invoker
set search_path = ''
as $$
  update public.hub_push_events h
  set processing_until=now()+interval '3 minutes', attempts=h.attempts+1
  where h.id in (
    select q.id from public.hub_push_events q
    where q.processed_at is null
      and (q.processing_until is null or q.processing_until<now())
      and q.attempts<7
    order by q.id asc
    for update skip locked
    limit least(greatest(batch_size,1),30)
  )
  returning h.*;
$$;
revoke all on function public.hub_claim_push_events(integer) from public,anon,authenticated;
grant execute on function public.hub_claim_push_events(integer) to service_role;

-- Queue created by the existing content triggers: request the Edge Function right after commit.
create or replace function private.hub_dispatch_push_on_insert()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare endpoint text; token text;
begin
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='hub_notify_endpoint' limit 1;
 select decrypted_secret into token from vault.decrypted_secrets where name='hub_notify_token' limit 1;
 if endpoint is null or token is null then
   raise warning '5AHub push: credenziali Vault non presenti';
   return new;
 end if;
 perform net.http_post(
   url := endpoint,
   headers := jsonb_build_object('Content-Type','application/json','x-5ahub-secret',token),
   body := jsonb_build_object('action','dispatch','event_id',new.id),
   timeout_milliseconds := 8000
 );
 return new;
end;
$$;
revoke all on function private.hub_dispatch_push_on_insert() from public,anon,authenticated;
drop trigger if exists hub_push_instant_delivery on public.hub_push_events;
create trigger hub_push_instant_delivery
  after insert on public.hub_push_events
  for each row execute function private.hub_dispatch_push_on_insert();

-- Backup + Google Calendar refresh every minute (pg_cron, not GitHub Actions).
-- Keep sensitive HTTP auth token in Vault, never embedded in cron.job SQL.
select cron.schedule(
 '5ahub-calendar-one-minute',
 '* * * * *',
 $job$
 select net.http_post(
   url := (select decrypted_secret from vault.decrypted_secrets where name='hub_notify_endpoint' limit 1),
   headers := jsonb_build_object('Content-Type','application/json',
       'x-5ahub-secret',(select decrypted_secret from vault.decrypted_secrets where name='hub_notify_token' limit 1)),
   body := jsonb_build_object('action','calendar'),
   timeout_milliseconds := 10000
 );
 $job$
);

-- Verifiche:
-- select jobname,schedule,active from cron.job where jobname='5ahub-calendar-one-minute';
-- select count(*) from public.hub_push_subscriptions;
-- select count(*) from public.hub_push_events where processed_at is null;