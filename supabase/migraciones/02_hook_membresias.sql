-- Colectia: Custom Access Token Hook (Fase 0, paso 4 del plan de acción)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Qué hace: cada vez que alguien inicia sesión (o Supabase le renueva la
-- sesión), Supabase le pregunta a esta función qué información extra debe
-- llevar el token (JWT) de esa persona. Aquí le agregamos un campo
-- "membresias" con la lista de instituciones y roles que tiene esa
-- persona (super_admin / admin_institucion / recaudador), para que las
-- políticas de RLS del siguiente paso puedan leer esa lista directamente
-- del token, sin tener que consultar la tabla "membresias" en cada fila.
--
-- El acudiente NO aparece en esta lista (no tiene fila en "membresias",
-- ver sección 3 del documento de arquitectura), su acceso se resuelve
-- aparte, con una subconsulta a "acudiente_estudiante" dentro de sus
-- propias políticas de RLS, en el próximo paso.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  membresias_json jsonb;
begin
  -- Buscamos todas las membresías (institución + rol) de esta persona.
  -- Para super_admin, institucion_id queda en null en el resultado.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'institucion_id', m.institucion_id,
        'rol', m.rol
      )
    ),
    '[]'::jsonb
  )
  into membresias_json
  from public.membresias m
  where m.persona_id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';
  claims := jsonb_set(claims, '{membresias}', membresias_json);
  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;

-- Permisos (siguiendo el patrón oficial de Supabase para este mecanismo):
-- el "motor" interno de autenticación (supabase_auth_admin) necesita poder
-- ejecutar esta función; nadie más debe poder llamarla directamente.
grant usage on schema public to supabase_auth_admin;

grant execute
  on function public.custom_access_token_hook
  to supabase_auth_admin;

revoke execute
  on function public.custom_access_token_hook
  from authenticated, anon, public;

-- La función necesita poder leer "membresias" para armar la lista de
-- arriba. Como RLS ya está activado en esa tabla (sin políticas todavía),
-- sin este permiso explícito para supabase_auth_admin el hook no vería
-- ninguna fila. Esta política es solo para el mecanismo interno del hook,
-- no abre el acceso a la tabla desde la app (eso se define en el próximo
-- paso, con las políticas de RLS para cada rol).
grant select on public.membresias to supabase_auth_admin;

create policy "Solo el hook de auth puede leer membresias para el token"
  on public.membresias
  as permissive
  for select
  to supabase_auth_admin
  using (true);
