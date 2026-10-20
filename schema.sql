-- 5AHub | Schema per sito pubblico e amministrazione riservata
-- Eseguire in un progetto dedicato nel SQL Editor di Supabase.
-- Chiunque può LEGGERE le informazioni pubblicate; solo amministratori assegnati
-- manualmente possono AGGIUNGERE, MODIFICARE o CANCELLARE contenuti e file.

create schema if not exists private;

create table if not exists public.hub_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Funzione di autorizzazione isolata fuori dallo schema pubblicato dalle API.
create or replace function private.hub_is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.hub_admins a
    where a.user_id = (select auth.uid())
  );
$$;
revoke all on function private.hub_is_admin() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.hub_is_admin() to anon, authenticated;

create table if not exists public.hub_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  subject text not null check (char_length(trim(subject)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  file_path text,
  file_name text,
  file_size bigint check (file_size is null or file_size >= 0),
  external_url text check (external_url is null or external_url ~* '^https?://'),
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hub_weekly (
  id integer primary key default 1 check (id = 1),
  content text not null default '' check (char_length(content) <= 5000),
  updated_at timestamptz not null default now()
);
insert into public.hub_weekly (id, content)
values (1, '')
on conflict (id) do nothing;

create or replace function private.hub_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger hub_materials_updated_at before update on public.hub_materials
  for each row execute function private.hub_set_updated_at();
create trigger hub_posts_updated_at before update on public.hub_posts
  for each row execute function private.hub_set_updated_at();
create trigger hub_weekly_updated_at before update on public.hub_weekly
  for each row execute function private.hub_set_updated_at();

alter table public.hub_admins enable row level security;
alter table public.hub_materials enable row level security;
alter table public.hub_posts enable row level security;
alter table public.hub_weekly enable row level security;

create policy "admins_can_see_their_role" on public.hub_admins
for select to authenticated using (user_id = (select auth.uid()));

create policy "anyone_can_read_materials" on public.hub_materials
for select to anon, authenticated using (true);
create policy "admins_can_insert_materials" on public.hub_materials
for insert to authenticated with check ((select private.hub_is_admin()));
create policy "admins_can_update_materials" on public.hub_materials
for update to authenticated using ((select private.hub_is_admin()))
with check ((select private.hub_is_admin()));
create policy "admins_can_delete_materials" on public.hub_materials
for delete to authenticated using ((select private.hub_is_admin()));

create policy "anyone_can_read_posts" on public.hub_posts
for select to anon, authenticated using (true);
create policy "admins_can_insert_posts" on public.hub_posts
for insert to authenticated with check ((select private.hub_is_admin()));
create policy "admins_can_update_posts" on public.hub_posts
for update to authenticated using ((select private.hub_is_admin()))
with check ((select private.hub_is_admin()));
create policy "admins_can_delete_posts" on public.hub_posts
for delete to authenticated using ((select private.hub_is_admin()));

create policy "anyone_can_read_weekly" on public.hub_weekly
for select to anon, authenticated using (true);
create policy "admins_can_update_weekly" on public.hub_weekly
for update to authenticated using ((select private.hub_is_admin()))
with check ((select private.hub_is_admin()));

-- Permessi sul livello SQL (RLS mantiene il controllo effettivo sui dati)
grant select on public.hub_materials, public.hub_posts, public.hub_weekly to anon;
grant select, insert, update, delete on public.hub_materials, public.hub_posts to authenticated;
grant select, update on public.hub_weekly to authenticated;
grant select on public.hub_admins to authenticated;

-- Repository pubblico dei file didattici. NON caricare documenti personali o riservati.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hub-materials','hub-materials',true,15728640,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'image/png', 'image/jpeg'
  ])
on conflict (id) do nothing;

create policy "admins_can_upload_hub_files" on storage.objects
for insert to authenticated
with check (bucket_id = 'hub-materials' and (select private.hub_is_admin()));
-- Storage remove() consulta i metadati: anche SELECT va consentito agli admin.
-- Il download pubblico dei file resta accessibile grazie al bucket pubblico.
create policy "admins_can_select_hub_files" on storage.objects
for select to authenticated
using (bucket_id = 'hub-materials' and (select private.hub_is_admin()));
create policy "admins_can_read_hub_file_metadata" on storage.objects
for select to authenticated
using (bucket_id = 'hub-materials' and (select private.hub_is_admin()));
create policy "admins_can_delete_hub_files" on storage.objects
for delete to authenticated
using (bucket_id = 'hub-materials' and (select private.hub_is_admin()));

-- Accesso realtime alle modifiche senza ricaricare la pagina.
-- Se queste tabelle sono già state aggiunte alla pubblicazione, omettere le ALTER.
alter publication supabase_realtime add table public.hub_materials;
alter publication supabase_realtime add table public.hub_posts;
alter publication supabase_realtime add table public.hub_weekly;

-- PROCEDURA DOPO AVER CREATO IL PRIMO UTENTE AMMINISTRATORE IN AUTH:
-- Inserire l'UUID effettivo dell'utente; NON usare l'indirizzo email qui.
-- insert into public.hub_admins(user_id) values ('UUID_UTENTE_DA_DASHBOARD');