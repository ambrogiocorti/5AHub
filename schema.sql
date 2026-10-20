-- 5AHub | Configurazione condivisa senza login visibile (Supabase Auth anonimo)
-- SQL idempotente: utilizzabile su un nuovo progetto oppure per aggiornare lo schema precedente.
-- Gli utenti non inseriscono email/password; ciascuno riceve una sessione anonima automatica.
-- Attivare "Anonymous Sign-Ins" in Authentication > Providers del progetto.
-- AVVERTENZA: qualunque visitatore del sito pubblico puo' pubblicare, non solo i compagni.

create schema if not exists private;

create table if not exists public.hub_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  subject text not null check (char_length(trim(subject)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  file_path text,
  file_name text,
  file_size bigint check (file_size is null or file_size between 0 and 15728640),
  external_url text check (external_url is null or external_url ~* '^https?://'),
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hub_material_location check (file_path is not null or external_url is not null)
);
create table if not exists public.hub_posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('announcement','opportunity','trip','dinner','assembly')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  body text not null default '' check (char_length(body) <= 3000),
  event_date date,
  external_url text check (external_url is null or external_url ~* '^https?://'),
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.hub_weekly (
  id integer primary key default 1 check (id=1),
  content text not null default '' check (char_length(content) <= 5000),
  updated_at timestamptz not null default now()
);
insert into public.hub_weekly(id,content) values (1,'') on conflict (id) do nothing;

-- Per chi aveva gia' eseguito lo schema riservato, aggiunge l'ownership senza cancellare i contenuti.
alter table public.hub_materials add column if not exists author_id uuid references auth.users(id) on delete set null default auth.uid();
alter table public.hub_posts add column if not exists author_id uuid references auth.users(id) on delete set null default auth.uid();

-- Limita il volume di pubblicazioni di ogni sessione (non sostituisce CAPTCHA/rate limiting).
create or replace function private.hub_before_insert() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare daily_count integer;
begin
  if auth.uid() is null then
    raise exception 'Per pubblicare e'' necessaria una sessione anonima attiva';
  end if;
  new.author_id := auth.uid();
  new.created_at := now();
  new.updated_at := now();
  if TG_TABLE_NAME='hub_materials' then
    select count(*) into daily_count from public.hub_materials
     where author_id=auth.uid() and created_at>now()-interval '24 hours';
    if daily_count>=20 then raise exception 'Limite di 20 materiali ogni 24 ore raggiunto'; end if;
  elsif TG_TABLE_NAME='hub_posts' then
    select count(*) into daily_count from public.hub_posts
     where author_id=auth.uid() and created_at>now()-interval '24 hours';
    if daily_count>=30 then raise exception 'Limite di 30 pubblicazioni ogni 24 ore raggiunto'; end if;
  end if;
  return new;
end; $$;

create or replace function private.hub_before_update() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.author_id:=old.author_id;
  new.created_at:=old.created_at;
  new.updated_at:=now();
  return new;
end; $$;

drop trigger if exists hub_materials_updated_at on public.hub_materials;
drop trigger if exists hub_posts_updated_at on public.hub_posts;
drop trigger if exists hub_weekly_updated_at on public.hub_weekly;
drop trigger if exists hub_materials_before_insert on public.hub_materials;
drop trigger if exists hub_posts_before_insert on public.hub_posts;
create trigger hub_materials_before_insert before insert on public.hub_materials for each row execute function private.hub_before_insert();
create trigger hub_posts_before_insert before insert on public.hub_posts for each row execute function private.hub_before_insert();
create trigger hub_materials_updated_at before update on public.hub_materials for each row execute function private.hub_before_update();
create trigger hub_posts_updated_at before update on public.hub_posts for each row execute function private.hub_before_update();

alter table public.hub_materials enable row level security;
alter table public.hub_posts enable row level security;
alter table public.hub_weekly enable row level security;

-- Rimuove le vecchie policy per l'area rappresentanti e gli eventuali duplicati.
drop policy if exists "anyone_can_read_materials" on public.hub_materials;
drop policy if exists "admins_can_insert_materials" on public.hub_materials;
drop policy if exists "admins_can_update_materials" on public.hub_materials;
drop policy if exists "admins_can_delete_materials" on public.hub_materials;
drop policy if exists "hub_everyone_read_materials" on public.hub_materials;
drop policy if exists "hub_author_insert_materials" on public.hub_materials;
drop policy if exists "hub_author_update_materials" on public.hub_materials;
drop policy if exists "hub_author_delete_materials" on public.hub_materials;
create policy "hub_everyone_read_materials" on public.hub_materials for select to anon, authenticated using (true);
create policy "hub_author_insert_materials" on public.hub_materials for insert to authenticated with check (author_id = (select auth.uid()));
create policy "hub_author_update_materials" on public.hub_materials for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "hub_author_delete_materials" on public.hub_materials for delete to authenticated using (author_id = (select auth.uid()));

drop policy if exists "anyone_can_read_posts" on public.hub_posts;
drop policy if exists "admins_can_insert_posts" on public.hub_posts;
drop policy if exists "admins_can_update_posts" on public.hub_posts;
drop policy if exists "admins_can_delete_posts" on public.hub_posts;
drop policy if exists "hub_everyone_read_posts" on public.hub_posts;
drop policy if exists "hub_author_insert_posts" on public.hub_posts;
drop policy if exists "hub_author_update_posts" on public.hub_posts;
drop policy if exists "hub_author_delete_posts" on public.hub_posts;
create policy "hub_everyone_read_posts" on public.hub_posts for select to anon, authenticated using (true);
create policy "hub_author_insert_posts" on public.hub_posts for insert to authenticated with check (author_id = (select auth.uid()));
create policy "hub_author_update_posts" on public.hub_posts for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "hub_author_delete_posts" on public.hub_posts for delete to authenticated using (author_id = (select auth.uid()));

-- Agenda settimanale: lettura pubblica, modifica riservata nel backend.
-- Tutti possono invece pubblicare promemoria nelle comunicazioni.
drop policy if exists "anyone_can_read_weekly" on public.hub_weekly;
drop policy if exists "admins_can_update_weekly" on public.hub_weekly;
drop policy if exists "hub_everyone_read_weekly" on public.hub_weekly;
create policy "hub_everyone_read_weekly" on public.hub_weekly for select to anon, authenticated using (true);

revoke all on public.hub_materials,public.hub_posts,public.hub_weekly from anon, authenticated;
grant select on public.hub_materials,public.hub_posts,public.hub_weekly to anon, authenticated;
grant insert,update,delete on public.hub_materials, public.hub_posts to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('hub-materials','hub-materials',true,15728640,array[
 'application/pdf','application/msword',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.ms-powerpoint',
 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
 'application/vnd.ms-excel',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'text/plain','image/png','image/jpeg'])
on conflict(id) do update set public=true, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

-- Anche nello Storage ogni sessione puo' cancellare soltanto i file caricati da se stessa.
drop policy if exists "admins_can_upload_hub_files" on storage.objects;
drop policy if exists "admins_can_select_hub_files" on storage.objects;
drop policy if exists "admins_can_read_hub_file_metadata" on storage.objects;
drop policy if exists "admins_can_delete_hub_files" on storage.objects;
drop policy if exists "hub_author_upload_files" on storage.objects;
drop policy if exists "hub_author_select_files" on storage.objects;
drop policy if exists "hub_author_delete_files" on storage.objects;
create policy "hub_author_upload_files" on storage.objects
  for insert to authenticated
  with check(bucket_id='hub-materials' and owner_id=(select auth.uid())::text
  and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "hub_author_select_files" on storage.objects
  for select to authenticated
  using(bucket_id='hub-materials' and owner_id=(select auth.uid())::text);
create policy "hub_author_delete_files" on storage.objects
  for delete to authenticated
  using(bucket_id='hub-materials' and owner_id=(select auth.uid())::text);

-- Realtime idempotente: notifiche delle modifiche condivise.
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='hub_materials') then
   alter publication supabase_realtime add table public.hub_materials;
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='hub_posts') then
   alter publication supabase_realtime add table public.hub_posts;
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='hub_weekly') then
   alter publication supabase_realtime add table public.hub_weekly;
 end if;
end $$;