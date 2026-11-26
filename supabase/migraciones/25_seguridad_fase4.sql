-- Colectia: seguridad fase 4
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema.
--
-- 1. El super administrador solo tiene permisos con la verificación en dos pasos hecha (aal2).
-- 2. Una persona solo puede estar (o estar invitada) en el personal de una institución a la vez.
-- 3. Imágenes de eventos: solo archivos subidos por Colectia (WebP procesado en el servidor),
--    nunca enlaces externos.


-- 1. Super administrador con verificación en dos pasos -----------------------------------

create or replace function public.es_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
     and exists (
       select 1 from public.membresias m
       where m.persona_id = auth.uid() and m.rol = 'super_admin'
     );
$$;


-- 2. Personal de una sola institución ----------------------------------------------------

create or replace function public.membresias_una_institucion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.institucion_id is null
     or new.rol not in ('admin_institucion', 'recaudador', 'invitado_admin', 'invitado_recaudador') then
    return new;
  end if;
  -- Dos invitaciones a la vez para la misma persona se revisan una después de la otra.
  perform pg_advisory_xact_lock(hashtextextended('membresia_personal:' || new.persona_id::text, 0));
  if exists (
       select 1 from public.membresias m
       where m.persona_id = new.persona_id
         and m.institucion_id <> new.institucion_id
         and m.rol in ('admin_institucion', 'recaudador', 'invitado_admin', 'invitado_recaudador')
     ) then
    raise exception 'Esa persona ya hace parte del personal de otra institución en Colectia (o tiene una invitación pendiente allá), así que no se puede invitar aquí.';
  end if;
  return new;
end;
$$;

revoke execute on function public.membresias_una_institucion() from public, anon, authenticated;

drop trigger if exists membresias_una_institucion on public.membresias;
create trigger membresias_una_institucion before insert or update of rol, institucion_id on public.membresias
  for each row execute function public.membresias_una_institucion();


-- 3. Imágenes de eventos -----------------------------------------------------------------

-- Las imágenes nuevas llegan siempre como <institución>/<uuid>.webp, ya revisadas y
-- recodificadas por el servidor de Colectia.
update storage.buckets
set allowed_mime_types = array['image/webp'], file_size_limit = 4194304
where id = 'eventos';

drop policy if exists "staff sube imagenes de eventos de su institucion" on storage.objects;
create policy "staff sube imagenes de eventos de su institucion"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'eventos'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
    and public.puede_gestionar_imagen_evento(name)
  );

drop policy if exists "staff reemplaza imagenes de eventos de su institucion" on storage.objects;
create policy "staff reemplaza imagenes de eventos de su institucion"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'eventos' and public.puede_gestionar_imagen_evento(name))
  with check (
    bucket_id = 'eventos'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
    and public.puede_gestionar_imagen_evento(name)
  );

-- Los eventos solo pueden mostrar imágenes del almacenamiento de Colectia (la dirección es la del
-- proyecto de Supabase de producción). Los enlaces externos que hubiera se quitan.
update public.eventos
set imagen_url = null
where imagen_url is not null
  and imagen_url not like 'https://kbxswlylztqtustteyhf.supabase.co/storage/v1/object/public/eventos/%';

alter table public.eventos drop constraint if exists eventos_imagen_https;
alter table public.eventos drop constraint if exists eventos_imagen_propia;
alter table public.eventos add constraint eventos_imagen_propia check (
  imagen_url is null
  or imagen_url like 'https://kbxswlylztqtustteyhf.supabase.co/storage/v1/object/public/eventos/%'
);
