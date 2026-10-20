-- 5AHub push notifications: run in the same Supabase project as site/config.js.
create table if not exists public.hub_push_subscriptions (
 endpoint text primary key check (length(endpoint) between 12 and 2048 and endpoint like 'https://%'),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 p256dh text not null, auth_secret text not null,
 notify_content boolean not null default true,
 notify_calendar boolean not null default true,
 created_at timestamptz default now(),
 updated_at timestamptz default now()
);
create index if not exists hub_push_subscription_user_idx on public.hub_push_subscriptions(user_id);
alter table public.hub_push_subscriptions enable row level security;
revoke all on public.hub_push_subscriptions from anon,authenticated;
grant select,insert,update,delete on public.hub_push_subscriptions to authenticated;
drop policy if exists hub_push_read_own on public.hub_push_subscriptions;
drop policy if exists hub_push_add_own on public.hub_push_subscriptions;
drop policy if exists hub_push_change_own on public.hub_push_subscriptions;
drop policy if exists hub_push_delete_own on public.hub_push_subscriptions;
create policy hub_push_read_own on public.hub_push_subscriptions for select to authenticated using ((select auth.uid())=user_id);
create policy hub_push_add_own on public.hub_push_subscriptions for insert to authenticated with check ((select auth.uid())=user_id);
create policy hub_push_change_own on public.hub_push_subscriptions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy hub_push_delete_own on public.hub_push_subscriptions for delete to authenticated using ((select auth.uid())=user_id);

create table if not exists public.hub_push_events (
 id bigint generated always as identity primary key,
 category text not null check(category in ('material','announcement','opportunity','assembly','calendar')),
 title text not null, body text not null default '', route text not null default '#/home',
 author_id uuid, created_at timestamptz not null default now(), processed_at timestamptz
);
create index if not exists hub_push_pending_idx on public.hub_push_events(id) where processed_at is null;
create table if not exists public.hub_push_deliveries (
 event_id bigint references public.hub_push_events(id) on delete cascade,
 endpoint text not null, delivered_at timestamptz not null default now(),
 primary key (event_id,endpoint)
);
create table if not exists public.hub_calendar_known (
 calendar_uid text primary key, title text not null, start_label text,
 first_seen_at timestamptz default now()
);
create table if not exists public.hub_push_state (
 name text primary key, value jsonb not null, updated_at timestamptz default now()
);
alter table public.hub_push_events enable row level security;
alter table public.hub_push_deliveries enable row level security;
alter table public.hub_calendar_known enable row level security;
alter table public.hub_push_state enable row level security;
revoke all on public.hub_push_events, public.hub_push_deliveries, public.hub_calendar_known, public.hub_push_state from anon,authenticated;
grant all on public.hub_push_events, public.hub_push_deliveries, public.hub_calendar_known, public.hub_push_state to service_role;
grant usage, select on all sequences in schema public to service_role;

create schema if not exists private;
create or replace function private.hub_queue_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cat text; msg text; dest text;
begin
 if TG_TABLE_NAME='hub_materials' then
   cat:='material';msg:=left(coalesce(NEW.subject,''),180);dest:='#/maturita';
 else
   if NEW.kind not in ('announcement','opportunity','assembly') then return NEW; end if;
   cat:=NEW.kind;msg:=left(coalesce(NEW.body,''),180);
   dest:=case NEW.kind when 'opportunity' then '#/orientamento' when 'assembly' then '#/assemblee' else '#/home' end;
 end if;
 insert into public.hub_push_events(category,title,body,route,author_id)
 values(cat,left(NEW.title,145),msg,dest,NEW.author_id);
 return NEW;
end $$;
revoke all on function private.hub_queue_push() from public,anon,authenticated;
drop trigger if exists hub_notify_post_insert on public.hub_posts;
drop trigger if exists hub_notify_material_insert on public.hub_materials;
create trigger hub_notify_post_insert after insert on public.hub_posts for each row execute function private.hub_queue_push();
create trigger hub_notify_material_insert after insert on public.hub_materials for each row execute function private.hub_queue_push();

-- Existing content is deliberately NOT queued; the first calendar sync seeds silently.
