-- Colectia: Fase 2 de seguridad
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema.
--
-- 1. Quitar a alguien del personal le quita el acceso de inmediato. Antes, las
--    políticas leían los roles del token (que dura hasta una hora); ahora leen la
--    tabla membresias en cada consulta. Son "security definer" para poder leer
--    membresias sin chocar con sus propias políticas.
-- 2. El número de documento del estudiante solo lo puede leer el administrador
--    de su institución, con las dos funciones de abajo. Ni recaudadores ni
--    acudientes pueden leer esa columna. Ojo: si se agrega una columna nueva a
--    "estudiantes", hay que darle permiso de lectura en el "grant select" de abajo.


-- 1. Roles leídos de la tabla, no del token

create or replace function public.es_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.membresias m
    where m.persona_id = auth.uid() and m.rol = 'super_admin'
  );
$$;

create or replace function public.tiene_rol_en_institucion(p_institucion_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.membresias m
    where m.persona_id = auth.uid()
      and m.institucion_id = p_institucion_id
      and m.rol = any(p_roles)
  );
$$;

-- La carpeta de la imagen es el id de la institución; se compara como texto.
create or replace function public.puede_gestionar_imagen_evento(p_nombre text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.membresias m
    where m.persona_id = auth.uid()
      and m.institucion_id::text = (storage.foldername(p_nombre))[1]
      and m.rol in ('admin_institucion', 'recaudador')
  );
$$;


-- 2. Número de documento solo para el administrador

revoke select on public.estudiantes from authenticated, anon;
grant select (
  id, institucion_id, codigo_institucional, nombres, apellidos, curso_grado,
  fecha_nacimiento, created_at
) on public.estudiantes to authenticated;

create or replace function public.documento_estudiante(p_estudiante_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select e.numero_documento
  from public.estudiantes e
  where e.id = p_estudiante_id
    and public.es_personal_de(e.institucion_id, array['admin_institucion']);
$$;

create or replace function public.documentos_de_institucion(p_institucion_id uuid)
returns table (id uuid, numero_documento text)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.numero_documento
  from public.estudiantes e
  where e.institucion_id = p_institucion_id
    and public.es_personal_de(p_institucion_id, array['admin_institucion']);
$$;


-- Permisos de ejecución: solo usuarios con sesión.
revoke execute on function public.es_super_admin() from public, anon;
revoke execute on function public.tiene_rol_en_institucion(uuid, text[]) from public, anon;
revoke execute on function public.puede_gestionar_imagen_evento(text) from public, anon;
revoke execute on function public.documento_estudiante(uuid) from public, anon;
revoke execute on function public.documentos_de_institucion(uuid) from public, anon;
grant execute on function public.es_super_admin() to authenticated;
grant execute on function public.tiene_rol_en_institucion(uuid, text[]) to authenticated;
grant execute on function public.puede_gestionar_imagen_evento(text) to authenticated;
grant execute on function public.documento_estudiante(uuid) to authenticated;
grant execute on function public.documentos_de_institucion(uuid) to authenticated;
