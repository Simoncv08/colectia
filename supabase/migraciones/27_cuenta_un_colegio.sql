-- Colectia: una cuenta, un colegio (Fase A, paquete A2)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema. Requiere 26_subdominios.sql.
--
-- 1. Cada cuenta (acudiente o personal) queda atada a un solo colegio: personas.institucion_id.
--    Se llena una vez, la primera vez que la persona entra por la dirección de un colegio
--    (unirse_a_colegio). El super administrador nunca tiene colegio.
-- 2. Las invitaciones de personal y los estudiantes vinculados solo pueden ser del colegio de
--    la cuenta. Las filas 'retirado' (historial) no cuentan.
-- 3. liberar_cuenta(): la cuenta queda sin colegio si ya no tiene estudiantes vinculados ni es
--    personal activo (o lo hace el super administrador).


-- 1. Columna y protección ---------------------------------------------------------------

alter table public.personas
  add column if not exists institucion_id uuid references public.instituciones (id) on delete cascade;

create index if not exists personas_institucion_id_idx on public.personas (institucion_id);

-- La persona puede editar su nombre y teléfono, pero no su colegio: solo las funciones de abajo
-- (marcadas con colectia.cambio_colegio) o el SQL Editor.
create or replace function public.personas_proteger_colegio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.institucion_id is distinct from old.institucion_id
     and auth.uid() is not null
     and coalesce(current_setting('colectia.cambio_colegio', true), '') <> 'si' then
    raise exception 'El colegio de una cuenta no se puede cambiar directamente.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.personas_proteger_colegio() from public, anon, authenticated;

drop trigger if exists personas_proteger_colegio on public.personas;
create trigger personas_proteger_colegio before update of institucion_id on public.personas
  for each row execute function public.personas_proteger_colegio();


-- 2. Unirse y liberar ---------------------------------------------------------------------

-- La llama el servidor en la primera visita con sesión a la dirección de un colegio.
-- 'ok': la cuenta es (o quedó) de ese colegio. 'otro_colegio': ya es de otro.
-- 'super_admin': el super administrador no se une a colegios. 'no_disponible': el colegio no
-- tiene dirección aprobada o está cancelado.
create or replace function public.unirse_a_colegio(p_institucion_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_persona uuid := auth.uid();
  v_actual uuid;
begin
  if v_persona is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if exists (select 1 from public.membresias where persona_id = v_persona and rol = 'super_admin') then
    return 'super_admin';
  end if;

  select institucion_id into v_actual from public.personas where id = v_persona for update;
  if v_actual = p_institucion_id then
    return 'ok';
  end if;
  if v_actual is not null then
    return 'otro_colegio';
  end if;

  if not exists (
    select 1 from public.instituciones
    where id = p_institucion_id and subdominio_estado = 'aprobado' and estado <> 'cancelada'
  ) then
    return 'no_disponible';
  end if;

  perform set_config('colectia.cambio_colegio', 'si', true);
  update public.personas set institucion_id = p_institucion_id where id = v_persona;
  perform set_config('colectia.cambio_colegio', '', true);
  return 'ok';
end;
$$;

revoke execute on function public.unirse_a_colegio(uuid) from public, anon;
grant execute on function public.unirse_a_colegio(uuid) to authenticated;

-- Sin argumento: la propia cuenta. Con p_persona_id: solo el super administrador.
-- Las invitaciones pendientes se borran; las filas 'retirado' quedan como historial.
create or replace function public.liberar_cuenta(p_persona_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_persona uuid := coalesce(p_persona_id, auth.uid());
begin
  if v_persona is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if v_persona <> auth.uid() and not public.es_super_admin() then
    raise exception 'Solo el super administrador puede liberar la cuenta de otra persona.'
      using errcode = '42501';
  end if;

  if exists (select 1 from public.acudiente_estudiante where persona_id = v_persona) then
    raise exception 'Primero desvincula a tus estudiantes; después puedes liberar la cuenta.';
  end if;
  if exists (
    select 1 from public.membresias
    where persona_id = v_persona and rol in ('admin_institucion', 'recaudador')
  ) then
    raise exception 'La cuenta es parte del personal del colegio. Pide al administrador que te retire primero.';
  end if;

  delete from public.membresias
  where persona_id = v_persona and rol in ('invitado_admin', 'invitado_recaudador');

  perform set_config('colectia.cambio_colegio', 'si', true);
  update public.personas set institucion_id = null where id = v_persona;
  perform set_config('colectia.cambio_colegio', '', true);
end;
$$;

revoke execute on function public.liberar_cuenta(uuid) from public, anon;
grant execute on function public.liberar_cuenta(uuid) to authenticated;


-- 3. Personal: solo del colegio de la cuenta ----------------------------------------------
--
-- Reemplaza la regla de la migración 25 (personal de una sola institución): ahora se compara
-- con el colegio de la cuenta. Una cuenta sin colegio se puede invitar; al aceptar queda unida.

create or replace function public.membresias_una_institucion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colegio uuid;
begin
  if new.rol = 'super_admin' then
    if new.institucion_id is not null
       or exists (select 1 from public.personas where id = new.persona_id and institucion_id is not null) then
      raise exception 'El super administrador no puede pertenecer a un colegio.';
    end if;
    return new;
  end if;

  if new.institucion_id is null
     or new.rol not in ('admin_institucion', 'recaudador', 'invitado_admin', 'invitado_recaudador') then
    return new;
  end if;

  -- Dos invitaciones a la vez para la misma persona se revisan una después de la otra.
  perform pg_advisory_xact_lock(hashtextextended('membresia_personal:' || new.persona_id::text, 0));

  if exists (select 1 from public.membresias where persona_id = new.persona_id and rol = 'super_admin') then
    raise exception 'Esa cuenta es de administración de Colectia; pídele otro correo.';
  end if;

  select institucion_id into v_colegio from public.personas where id = new.persona_id;
  if (v_colegio is not null and v_colegio <> new.institucion_id)
     or exists (
       select 1 from public.membresias m
       where m.persona_id = new.persona_id
         and m.institucion_id <> new.institucion_id
         and m.rol in ('admin_institucion', 'recaudador', 'invitado_admin', 'invitado_recaudador')
     ) then
    raise exception 'Esa persona ya tiene una cuenta en otro colegio de Colectia; pídele otro correo.';
  end if;

  -- Ya es personal (no solo invitada): la cuenta queda unida al colegio.
  if new.rol in ('admin_institucion', 'recaudador') and v_colegio is null then
    perform set_config('colectia.cambio_colegio', 'si', true);
    update public.personas set institucion_id = new.institucion_id where id = new.persona_id;
    perform set_config('colectia.cambio_colegio', '', true);
  end if;
  return new;
end;
$$;

revoke execute on function public.membresias_una_institucion() from public, anon, authenticated;

drop trigger if exists membresias_una_institucion on public.membresias;
create trigger membresias_una_institucion before insert or update of rol, institucion_id on public.membresias
  for each row execute function public.membresias_una_institucion();


-- 4. Estudiantes vinculados: solo del colegio de la cuenta --------------------------------

create or replace function public.acudiente_mismo_colegio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.personas p
    join public.estudiantes e on e.institucion_id = p.institucion_id
    where p.id = new.persona_id and e.id = new.estudiante_id
  ) then
    raise exception 'Solo puedes vincular estudiantes del colegio de tu cuenta.';
  end if;
  return new;
end;
$$;

revoke execute on function public.acudiente_mismo_colegio() from public, anon, authenticated;

drop trigger if exists acudiente_mismo_colegio on public.acudiente_estudiante;
create trigger acudiente_mismo_colegio before insert or update on public.acudiente_estudiante
  for each row execute function public.acudiente_mismo_colegio();


-- 5. Vincular estudiante: el colegio debe ser el de la cuenta -----------------------------
--
-- Igual que en la migración 24, con una revisión nueva al inicio: 'otro_colegio' si la cuenta
-- es de otro colegio. Si la cuenta todavía no tiene colegio, queda unida a este.

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
  v_objetivo text;
  v_insertados integer;
  v_quedan integer;
  v_union text;
begin
  if v_persona is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  v_union := public.unirse_a_colegio(p_institucion_id);
  if v_union = 'otro_colegio' then
    return 'otro_colegio';
  end if;
  if v_union <> 'ok' then
    return 'institucion_no_disponible';
  end if;

  -- Un intento a la vez por cuenta: así los conteos de abajo siempre ven los anteriores.
  perform pg_advisory_xact_lock(hashtextextended('vincular_estudiante:' || v_persona::text, 0));

  -- Un solo dato por intento (código o documento), no los dos.
  if v_codigo is not null then
    v_documento := null;
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

  -- Límite por estudiante, sumando todas las cuentas: 15 fallos en 24 horas.
  v_objetivo := md5(p_institucion_id::text || ':'
                    || case when v_codigo is not null then 'c:' || lower(v_codigo) else 'd:' || v_documento end);
  perform pg_advisory_xact_lock(hashtextextended('vincular_objetivo:' || v_objetivo, 0));
  if (
    select count(*) from public.vinculo_intentos
    where objetivo = v_objetivo and creado_en > now() - interval '1 day'
  ) >= 15 then
    return 'estudiante_bloqueado';
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
    insert into public.vinculo_intentos (persona_id, objetivo) values (v_persona, v_objetivo);
    select 8 - count(*) into v_quedan from public.vinculo_intentos
    where persona_id = v_persona and creado_en > now() - interval '1 hour';
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


-- 6. Qué colegios ve cada cuenta ----------------------------------------------------------
--
-- Antes cualquier cuenta veía la lista de colegios activos para elegir dónde vincular; ahora el
-- colegio sale de la dirección, así que la lista ya no se muestra a nadie. Cada cuenta ve el
-- colegio al que pertenece (para llevarla a su dirección).

drop policy if exists "cualquier persona autenticada ve instituciones activas para vincularse"
  on public.instituciones;

drop policy if exists "cada cuenta ve su colegio" on public.instituciones;
create policy "cada cuenta ve su colegio"
  on public.instituciones for select
  to authenticated
  using (id = (select p.institucion_id from public.personas p where p.id = auth.uid()));
