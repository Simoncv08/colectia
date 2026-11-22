-- Colectia: Almacenamiento de imágenes de eventos (Supabase Storage)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Crea el "bucket" (carpeta de archivos) "eventos", donde se guardan las
-- imágenes que el personal sube desde su computador o celular al crear o
-- editar un evento. Cada imagen queda en una subcarpeta con el id de su
-- institución: eventos/<institucion_id>/<archivo>.
--
-- - El bucket es público solo para LEER: cualquiera con el enlace de una
--   imagen puede verla (así los acudientes ven la imagen del evento), pero
--   nadie puede listar ni ver qué otras imágenes hay.
-- - Solo admin_institucion y recaudador pueden subir, reemplazar o borrar
--   imágenes, y únicamente dentro de la carpeta de su propia institución.
-- - Máximo 5 MB por imagen, y solo JPG, PNG, WEBP o GIF.
--
-- Se puede volver a correr sin problema (no duplica nada).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'eventos',
  'eventos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ¿La persona actual es admin_institucion o recaudador de la institución
-- cuya carpeta es la primera parte de la ruta del archivo? Se compara como
-- texto (sin convertir a uuid) para que una ruta con un nombre de carpeta
-- cualquiera simplemente devuelva "no", en vez de producir un error.
create or replace function public.puede_gestionar_imagen_evento(p_nombre text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from jsonb_array_elements(public.jwt_membresias()) m
    where m ->> 'institucion_id' = (storage.foldername(p_nombre))[1]
      and m ->> 'rol' in ('admin_institucion', 'recaudador')
  );
$$;

drop policy if exists "staff ve imagenes de eventos de su institucion" on storage.objects;
create policy "staff ve imagenes de eventos de su institucion"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'eventos' and public.puede_gestionar_imagen_evento(name));

drop policy if exists "staff sube imagenes de eventos de su institucion" on storage.objects;
create policy "staff sube imagenes de eventos de su institucion"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'eventos' and public.puede_gestionar_imagen_evento(name));

drop policy if exists "staff reemplaza imagenes de eventos de su institucion" on storage.objects;
create policy "staff reemplaza imagenes de eventos de su institucion"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'eventos' and public.puede_gestionar_imagen_evento(name))
  with check (bucket_id = 'eventos' and public.puede_gestionar_imagen_evento(name));

drop policy if exists "staff borra imagenes de eventos de su institucion" on storage.objects;
create policy "staff borra imagenes de eventos de su institucion"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'eventos' and public.puede_gestionar_imagen_evento(name));
