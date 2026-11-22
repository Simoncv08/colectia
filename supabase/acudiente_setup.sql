-- Colectia: Soporte para el flujo del acudiente (paso 7 del plan)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Para vincular un estudiante, el acudiente necesita poder "buscarlo" por
-- código o por documento+fecha de nacimiento, pero las políticas de RLS
-- de "estudiantes" (a propósito) no dejan que alguien sin vínculo todavía
-- lea esa tabla libremente. Estas dos funciones resuelven eso de forma
-- mínima: solo confirman si existe una coincidencia y devuelven
-- *únicamente* el id del estudiante (nada de nombre, documento, etc.).
-- Con ese id sí se puede crear el vínculo en "acudiente_estudiante".

-- Pide también la fecha de nacimiento (no solo el código) para reducir
-- el riesgo de que un código mal escrito coincida por accidente con OTRO
-- estudiante real de la misma institución (los códigos suelen ser
-- cortos y consecutivos, así que un solo dígito de diferencia ya podría
-- ser el código de alguien más).
create or replace function public.buscar_estudiante_por_codigo(
  p_institucion_id uuid,
  p_codigo text,
  p_fecha_nacimiento date
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.estudiantes
  where institucion_id = p_institucion_id
    and codigo_institucional = p_codigo
    and fecha_nacimiento = p_fecha_nacimiento
  limit 1;
$$;

create or replace function public.buscar_estudiante_por_documento(
  p_institucion_id uuid,
  p_numero_documento text,
  p_fecha_nacimiento date
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.estudiantes
  where institucion_id = p_institucion_id
    and numero_documento = p_numero_documento
    and fecha_nacimiento = p_fecha_nacimiento
  limit 1;
$$;

revoke execute on function public.buscar_estudiante_por_codigo(uuid, text, date) from public;
revoke execute on function public.buscar_estudiante_por_documento(uuid, text, date) from public;

grant execute on function public.buscar_estudiante_por_codigo(uuid, text, date) to authenticated;
grant execute on function public.buscar_estudiante_por_documento(uuid, text, date) to authenticated;

-- Si ya habías corrido una versión anterior de este script (con la firma
-- vieja buscar_estudiante_por_codigo(uuid, text), sin fecha), esa versión
-- vieja de la función se queda huérfana en la base de datos. Esta línea
-- la elimina para no dejar dos versiones de la misma función:
drop function if exists public.buscar_estudiante_por_codigo(uuid, text);

-- Para poder elegir la institución de un estudiante al momento de
-- vincularlo (antes de tener ningún vínculo todavía), cualquier persona
-- que haya iniciado sesión puede ver el nombre y estado de las
-- instituciones activas o en prueba, no expone nada sensible, solo lo
-- necesario para un menú desplegable.
--
-- El "drop policy if exists" de abajo es solo para que este script se
-- pueda volver a correr sin error si ya lo habías corrido antes (por
-- ejemplo, al agregar la verificación de fecha de nacimiento al método
-- por código), Postgres no tiene "create policy or replace".
drop policy if exists "cualquier persona autenticada ve instituciones activas para vincularse"
  on public.instituciones;

create policy "cualquier persona autenticada ve instituciones activas para vincularse"
  on public.instituciones for select
  to authenticated
  using (estado in ('activa', 'en_prueba'));
