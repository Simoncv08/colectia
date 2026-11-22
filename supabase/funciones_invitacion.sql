-- Colectia: Función auxiliar para invitar personal (paso 5/6 del plan)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Para invitar a alguien como admin_institucion o recaudador, primero hay
-- que encontrar su "persona_id" a partir de su correo. Pero las políticas
-- de RLS de "personas" (a propósito) no dejan que cualquier admin lea
-- libremente los datos de cualquier persona de Colectia, sería exponer
-- más información de la necesaria.
--
-- Esta función resuelve eso de forma mínima: solo confirma si existe una
-- cuenta con ese correo y, si existe, devuelve *únicamente* su id (nada
-- de nombre, teléfono, etc.). Con ese id sí se puede crear la fila en
-- "membresias" (que es lo único que realmente hace falta para invitar a
-- alguien).

create or replace function public.buscar_persona_id_por_correo(p_correo text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.personas where correo = p_correo limit 1;
$$;

revoke execute on function public.buscar_persona_id_por_correo(text) from public;
grant execute on function public.buscar_persona_id_por_correo(text) to authenticated;
