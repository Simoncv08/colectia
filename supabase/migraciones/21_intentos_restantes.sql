-- Colectia: avisar al acudiente cuántos intentos le quedan al vincular
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema.
--
-- Cuando los datos no coinciden y quedan 3 intentos o menos en la hora,
-- vincular_estudiante devuelve 'no_encontrado:N' (N = intentos restantes)
-- para que la app lo muestre. Lo demás funciona igual que en 19_seguridad_fase1.sql.

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
  v_quedan integer;
begin
  if v_persona is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  delete from public.vinculo_intentos where creado_en < now() - interval '1 day';

  if (
    select count(*) from public.vinculo_intentos
    where persona_id = v_persona and creado_en > now() - interval '1 hour'
  ) >= 8 then
    return 'demasiados_intentos';
  end if;

  if (select count(*) from public.acudiente_estudiante where persona_id = v_persona) >= 10 then
    return 'limite_vinculos';
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
    insert into public.vinculo_intentos (persona_id) values (v_persona);
    select 8 - count(*) into v_quedan from public.vinculo_intentos
    where persona_id = v_persona and creado_en > now() - interval '1 hour';
    -- Los intentos restantes solo se cuentan cuando quedan 3 o menos.
    if v_quedan <= 3 then
      return 'no_encontrado:' || greatest(v_quedan, 0);
    end if;
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

revoke execute on function public.vincular_estudiante(uuid, text, text, date) from public, anon;
grant execute on function public.vincular_estudiante(uuid, text, text, date) to authenticated;
