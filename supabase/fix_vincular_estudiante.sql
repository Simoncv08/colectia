-- Colectia: Arreglo: vincular un estudiante desde la cuenta del acudiente
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema.
--
-- Problema: al vincular salía "new row violates row-level security
-- policy for table acudiente_estudiante". La política de "insert"
-- comprobaba que el estudiante existiera leyendo la tabla "estudiantes",
-- pero el acudiente todavía no puede leer a ese estudiante (justamente
-- porque aún no está vinculado), así que la comprobación siempre fallaba.
-- Además solo aceptaba instituciones "activa", aunque el menú también
-- muestra las que están "en_prueba".
--
-- Solución: una sola función segura que verifica los datos (código o
-- documento + fecha de nacimiento) y crea el vínculo en el mismo paso.
-- Así la verificación ya no se puede saltar: se quita el permiso de
-- crear vínculos directamente en la tabla, y la única forma de crearlos
-- es pasando por esta función. Solo devuelve un resultado corto (ok / no
-- encontrado / ya vinculado / institución no disponible), nunca datos
-- del estudiante.

create or replace function public.vincular_estudiante(
  p_institucion_id uuid,
  p_codigo text,
  p_numero_documento text,
  p_fecha_nacimiento date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_persona uuid := auth.uid();
  v_estado text;
  v_estudiante uuid;
  v_codigo text := nullif(trim(coalesce(p_codigo, '')), '');
  v_documento text := nullif(trim(coalesce(p_numero_documento, '')), '');
  v_insertados integer;
begin
  if v_persona is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if p_fecha_nacimiento is null or (v_codigo is null and v_documento is null) then
    return 'no_encontrado';
  end if;

  select i.estado into v_estado
  from public.instituciones i
  where i.id = p_institucion_id;

  if v_estado is null or v_estado not in ('activa', 'en_prueba') then
    return 'institucion_no_disponible';
  end if;

  select e.id into v_estudiante
  from public.estudiantes e
  where e.institucion_id = p_institucion_id
    and e.fecha_nacimiento = p_fecha_nacimiento
    and (
      (v_codigo is not null and e.codigo_institucional = v_codigo)
      or (v_documento is not null and e.numero_documento = v_documento)
    )
  limit 1;

  if v_estudiante is null then
    return 'no_encontrado';
  end if;

  insert into public.acudiente_estudiante (persona_id, estudiante_id)
  values (v_persona, v_estudiante)
  on conflict (persona_id, estudiante_id) do nothing;

  get diagnostics v_insertados = row_count;
  if v_insertados = 0 then
    return 'ya_vinculado';
  end if;

  return 'ok';
end;
$$;

revoke execute on function public.vincular_estudiante(uuid, text, text, date) from public;
grant execute on function public.vincular_estudiante(uuid, text, text, date) to authenticated;

-- Ya no se crean vínculos directamente en la tabla (solo con la función
-- de arriba, que sí verifica los datos).
drop policy if exists "acudiente vincula estudiantes a su propia cuenta"
  on public.acudiente_estudiante;
