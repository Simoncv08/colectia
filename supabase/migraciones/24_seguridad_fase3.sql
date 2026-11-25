-- Colectia: seguridad fase 3 (correcciones de la auditoría completa del 24-nov-2026)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema.
--
-- 1. Institución suspendida o cancelada = solo lectura de verdad (también editar y borrar).
-- 2. evento_grupos: al editar no se puede apuntar a un estudiante de otro colegio.
-- 3. grupo_curso_grados: solo cursos de la misma institución.
-- 4. vincular_estudiante: sin carreras entre intentos simultáneos y con límite por estudiante.
-- 5. Personal: invitación que la persona acepta, y quitar = retirar (sin borrar la fila,
--    así ya no choca con los pagos y eventos que registró).
-- 6. Ajustes menores: precio > 0, imágenes solo https, permisos de funciones.


-- 1. Institución inactiva = solo lectura ------------------------------------------------

-- Un trigger cubre todas las formas de escribir (API directa, acciones del servidor y
-- funciones de la base). Solo frena al personal de esa institución: el super admin,
-- el SQL Editor y los acudientes (por ejemplo, al desvincularse) no se ven afectados.
create or replace function public.institucion_de_fila(p_tabla text, p_fila jsonb)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_tabla in ('estudiantes', 'eventos', 'grados', 'grupos_curso', 'membresias')
      then (p_fila ->> 'institucion_id')::uuid
    when p_tabla in ('productos', 'evento_grupos', 'registros_pago')
      then (select ev.institucion_id from public.eventos ev where ev.id = (p_fila ->> 'evento_id')::uuid)
    when p_tabla = 'acudiente_estudiante'
      then (select e.institucion_id from public.estudiantes e where e.id = (p_fila ->> 'estudiante_id')::uuid)
    when p_tabla = 'grupo_curso_grados'
      then (select gc.institucion_id from public.grupos_curso gc where gc.id = (p_fila ->> 'grupo_curso_id')::uuid)
  end;
$$;

create or replace function public.bloquear_si_institucion_inactiva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_institucion uuid;
begin
  if auth.uid() is null or public.es_super_admin() then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    v_institucion := public.institucion_de_fila(tg_table_name, to_jsonb(old));
  else
    v_institucion := public.institucion_de_fila(tg_table_name, to_jsonb(new));
  end if;
  if tg_op = 'UPDATE' and v_institucion is null then
    v_institucion := public.institucion_de_fila(tg_table_name, to_jsonb(old));
  end if;

  if v_institucion is not null
     and not public.institucion_esta_activa(v_institucion)
     and public.tiene_rol_en_institucion(v_institucion, array['admin_institucion', 'recaudador']) then
    raise exception 'La institución no está activa: solo se puede consultar la información.'
      using errcode = '42501';
  end if;

  return coalesce(new, old);
end;
$$;

revoke execute on function public.institucion_de_fila(text, jsonb) from public, anon, authenticated;
revoke execute on function public.bloquear_si_institucion_inactiva() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'estudiantes', 'eventos', 'productos', 'evento_grupos', 'registros_pago',
    'membresias', 'grados', 'grupos_curso', 'grupo_curso_grados', 'acudiente_estudiante'
  ]
  loop
    execute format('drop trigger if exists solo_lectura_%1$s on public.%1$I', t);
    execute format(
      'create trigger solo_lectura_%1$s before insert or update or delete on public.%1$I
         for each row execute function public.bloquear_si_institucion_inactiva()',
      t
    );
  end loop;
end;
$$;

-- Colores y fondo (actualizar_apariencia_institucion escribe en instituciones).
create or replace function public.bloquear_apariencia_si_inactiva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and not public.es_super_admin()
     and (new.paleta is distinct from old.paleta or new.fondo is distinct from old.fondo)
     and not public.institucion_esta_activa(old.id) then
    raise exception 'La institución no está activa: solo se puede consultar la información.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.bloquear_apariencia_si_inactiva() from public, anon, authenticated;

drop trigger if exists solo_lectura_apariencia on public.instituciones;
create trigger solo_lectura_apariencia before update on public.instituciones
  for each row execute function public.bloquear_apariencia_si_inactiva();

-- Imágenes de eventos: subir, reemplazar y borrar solo con la institución activa.
create or replace function public.puede_gestionar_imagen_evento(p_nombre text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.membresias m
    join public.instituciones i on i.id = m.institucion_id
    where m.persona_id = auth.uid()
      and m.institucion_id::text = (storage.foldername(p_nombre))[1]
      and m.rol in ('admin_institucion', 'recaudador')
      and i.estado = 'activa'
  );
$$;

revoke execute on function public.puede_gestionar_imagen_evento(text) from public, anon;
grant execute on function public.puede_gestionar_imagen_evento(text) to authenticated;


-- 2. evento_grupos: editar con las mismas reglas que crear --------------------------------

drop policy if exists "staff actualiza grupos de eventos de su institucion" on public.evento_grupos;
create policy "staff actualiza grupos de eventos de su institucion"
  on public.evento_grupos for update
  to authenticated
  using (
    exists (
      select 1 from public.eventos ev
      where ev.id = evento_grupos.evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
    )
  )
  with check (
    exists (
      select 1 from public.eventos ev
      where ev.id = evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
        and public.institucion_esta_activa(ev.institucion_id)
        and (
          estudiante_id is null
          or exists (
            select 1 from public.estudiantes es
            where es.id = estudiante_id and es.institucion_id = ev.institucion_id
          )
        )
    )
  );

-- Si ya quedó alguna fila cruzada, se borra sin anotarla (para no escribir el nombre de
-- un estudiante ajeno en la actividad del otro colegio).
alter table public.evento_grupos disable trigger actividad_evento_grupos;
delete from public.evento_grupos eg
using public.eventos ev, public.estudiantes e
where ev.id = eg.evento_id and e.id = eg.estudiante_id and e.institucion_id <> ev.institucion_id;
alter table public.evento_grupos enable trigger actividad_evento_grupos;


-- 3. grupo_curso_grados: el curso debe ser de la misma institución -----------------------

drop policy if exists "admin_institucion agrega cursos a un grupo" on public.grupo_curso_grados;
create policy "admin_institucion agrega cursos a un grupo"
  on public.grupo_curso_grados for insert
  to authenticated
  with check (
    exists (
      select 1 from public.grupos_curso gc
      join public.grados g on g.id = grado_id and g.institucion_id = gc.institucion_id
      where gc.id = grupo_curso_id
        and public.tiene_rol_en_institucion(gc.institucion_id, array['admin_institucion'])
        and public.institucion_esta_activa(gc.institucion_id)
    )
  );


-- 4. vincular_estudiante -----------------------------------------------------------------

-- Cada fallo guarda también a qué estudiante se intentó (solo un resumen, no el dato).
alter table public.vinculo_intentos add column if not exists objetivo text;
create index if not exists vinculo_intentos_objetivo_idx on public.vinculo_intentos (objetivo, creado_en);

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
begin
  if v_persona is null then
    raise exception 'Debes iniciar sesión.';
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


-- 5. Personal: invitaciones con aceptación y retiro sin borrar ----------------------------
--
-- Roles nuevos en membresias:
--   invitado_admin / invitado_recaudador: invitación pendiente. No da ningún permiso y el
--     administrador no ve los datos de la persona, solo el correo que escribió.
--   retirado: estuvo en el personal. No da permisos; la fila se conserva porque los
--     eventos y pagos que registró apuntan a ella.
-- Solo la propia persona convierte una invitación en rol (aceptar_invitacion).

alter table public.membresias drop constraint if exists membresias_rol_check;
alter table public.membresias add constraint membresias_rol_check check (rol in (
  'super_admin', 'admin_institucion', 'recaudador', 'retirado', 'invitado_admin', 'invitado_recaudador'
));
alter table public.membresias add column if not exists correo_invitacion text;

-- Una sola fila por persona e institución. Si alguien quedó con dos (por el cambio de rol
-- que no podía borrar la fila anterior), se deja la más antigua con el rol más reciente y
-- los eventos y pagos pasan a apuntar a ella.
do $$
declare
  r record;
  v_conserva uuid;
  v_rol text;
begin
  for r in
    select persona_id, institucion_id
    from public.membresias
    where institucion_id is not null
    group by persona_id, institucion_id
    having count(*) > 1
  loop
    select id into v_conserva from public.membresias
    where persona_id = r.persona_id and institucion_id = r.institucion_id
    order by created_at asc limit 1;
    select rol into v_rol from public.membresias
    where persona_id = r.persona_id and institucion_id = r.institucion_id
    order by created_at desc limit 1;

    update public.eventos set creado_por = v_conserva
    where creado_por in (select id from public.membresias
      where persona_id = r.persona_id and institucion_id = r.institucion_id and id <> v_conserva);
    update public.registros_pago set registrado_por = v_conserva
    where registrado_por in (select id from public.membresias
      where persona_id = r.persona_id and institucion_id = r.institucion_id and id <> v_conserva);
    delete from public.membresias
    where persona_id = r.persona_id and institucion_id = r.institucion_id and id <> v_conserva;
    update public.membresias set rol = v_rol where id = v_conserva;
  end loop;
end;
$$;

create unique index if not exists membresias_una_por_institucion
  on public.membresias (persona_id, institucion_id)
  where institucion_id is not null;

-- Reglas de los cambios de rol.
create or replace function public.membresias_validar_cambio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_personal text[] := array['admin_institucion', 'recaudador'];
  v_invitado text[] := array['invitado_admin', 'invitado_recaudador'];
  v_destino text;
begin
  if auth.uid() is null then
    return new; -- SQL Editor
  end if;

  if new.persona_id is distinct from old.persona_id or new.institucion_id is distinct from old.institucion_id then
    raise exception 'No se puede cambiar la persona ni la institución de una membresía.' using errcode = '42501';
  end if;

  if new.rol = old.rol then
    return new;
  end if;

  -- Invitación → rol: solo la persona invitada, y al rol de la invitación.
  if old.rol = any (v_invitado) and new.rol = any (v_personal) then
    v_destino := case old.rol when 'invitado_admin' then 'admin_institucion' else 'recaudador' end;
    if auth.uid() = old.persona_id and new.rol = v_destino then
      return new;
    end if;
    raise exception 'Solo la persona invitada puede aceptar la invitación.' using errcode = '42501';
  end if;

  -- Personal → personal (cambio de rol) o personal → retirado (quitar).
  if old.rol = any (v_personal) and (new.rol = any (v_personal) or new.rol = 'retirado') then
    return new;
  end if;

  -- Invitación pendiente o retirado → nueva invitación.
  if (old.rol = any (v_invitado) or old.rol = 'retirado') and new.rol = any (v_invitado) then
    return new;
  end if;

  -- Invitación → retirado: solo para alguien que ya estuvo en el personal (tiene eventos o
  -- pagos a su nombre), cuando se cancela o rechaza su nueva invitación.
  if old.rol = any (v_invitado) and new.rol = 'retirado'
     and (exists (select 1 from public.eventos where creado_por = old.id)
          or exists (select 1 from public.registros_pago where registrado_por = old.id)) then
    return new;
  end if;

  raise exception 'Ese cambio de rol no está permitido.' using errcode = '42501';
end;
$$;

revoke execute on function public.membresias_validar_cambio() from public, anon, authenticated;

drop trigger if exists membresias_validar_cambio on public.membresias;
create trigger membresias_validar_cambio before update on public.membresias
  for each row execute function public.membresias_validar_cambio();

-- Políticas de escritura de membresias (las de lectura propias no cambian).
drop policy if exists "super_admin crea membresias de admin_institucion" on public.membresias;
drop policy if exists "super_admin crea invitaciones de admin_institucion" on public.membresias;
create policy "super_admin crea invitaciones de admin_institucion"
  on public.membresias for insert
  to authenticated
  with check (public.es_super_admin() and rol = 'invitado_admin' and institucion_id is not null);

drop policy if exists "admin_institucion crea membresias en su institucion" on public.membresias;
drop policy if exists "admin_institucion invita personal a su institucion" on public.membresias;
create policy "admin_institucion invita personal a su institucion"
  on public.membresias for insert
  to authenticated
  with check (
    rol in ('invitado_admin', 'invitado_recaudador')
    and public.tiene_rol_en_institucion(institucion_id, array['admin_institucion'])
    and public.institucion_esta_activa(institucion_id)
  );

drop policy if exists "admin_institucion actualiza membresias de su institucion" on public.membresias;
create policy "admin_institucion actualiza membresias de su institucion"
  on public.membresias for update
  to authenticated
  using (
    rol in ('admin_institucion', 'recaudador', 'retirado', 'invitado_admin', 'invitado_recaudador')
    and public.tiene_rol_en_institucion(institucion_id, array['admin_institucion'])
  )
  with check (
    rol in ('admin_institucion', 'recaudador', 'retirado', 'invitado_admin', 'invitado_recaudador')
    and public.tiene_rol_en_institucion(institucion_id, array['admin_institucion'])
  );

drop policy if exists "super_admin actualiza membresias de admin_institucion" on public.membresias;
drop policy if exists "super_admin actualiza membresias del personal" on public.membresias;
create policy "super_admin actualiza membresias del personal"
  on public.membresias for update
  to authenticated
  using (public.es_super_admin() and rol in ('admin_institucion', 'recaudador', 'retirado', 'invitado_admin', 'invitado_recaudador'))
  with check (public.es_super_admin() and rol in ('admin_institucion', 'recaudador', 'retirado', 'invitado_admin', 'invitado_recaudador'));

-- Borrar solo invitaciones pendientes (cancelarlas). Al personal se le retira.
drop policy if exists "admin_institucion elimina membresias de su institucion" on public.membresias;
create policy "admin_institucion elimina membresias de su institucion"
  on public.membresias for delete
  to authenticated
  using (
    rol in ('invitado_admin', 'invitado_recaudador')
    and public.tiene_rol_en_institucion(institucion_id, array['admin_institucion'])
  );

drop policy if exists "super_admin elimina membresias del personal" on public.membresias;
create policy "super_admin elimina membresias del personal"
  on public.membresias for delete
  to authenticated
  using (public.es_super_admin() and rol in ('invitado_admin', 'invitado_recaudador'));

drop policy if exists "super_admin ve membresias del personal" on public.membresias;
create policy "super_admin ve membresias del personal"
  on public.membresias for select
  to authenticated
  using (public.es_super_admin() and institucion_id is not null);

-- El personal ve los datos de quien aceptó estar (o estuvo) en su institución, no de los invitados.
drop policy if exists "staff ve personas de su institucion" on public.personas;
create policy "staff ve personas de su institucion"
  on public.personas for select
  to authenticated
  using (
    exists (
      select 1 from public.membresias m
      where m.persona_id = personas.id
        and m.rol in ('admin_institucion', 'recaudador', 'retirado')
        and public.tiene_rol_en_institucion(m.institucion_id, array['admin_institucion','recaudador'])
    )
    or exists (
      select 1
      from public.acudiente_estudiante ae
      join public.estudiantes e on e.id = ae.estudiante_id
      where ae.persona_id = personas.id
        and public.tiene_rol_en_institucion(e.institucion_id, array['admin_institucion','recaudador'])
    )
  );

-- Aceptar o rechazar una invitación (solo la persona invitada).
create or replace function public.aceptar_invitacion(p_membresia_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
begin
  select rol into v_rol from public.membresias
  where id = p_membresia_id and persona_id = auth.uid();

  if v_rol is null or v_rol not in ('invitado_admin', 'invitado_recaudador') then
    raise exception 'Esa invitación ya no está disponible.';
  end if;

  update public.membresias
  set rol = case v_rol when 'invitado_admin' then 'admin_institucion' else 'recaudador' end
  where id = p_membresia_id;

  return case v_rol when 'invitado_admin' then 'admin_institucion' else 'recaudador' end;
end;
$$;

create or replace function public.rechazar_invitacion(p_membresia_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.membresias
    where id = p_membresia_id and persona_id = auth.uid() and rol in ('invitado_admin', 'invitado_recaudador')
  ) then
    raise exception 'Esa invitación ya no está disponible.';
  end if;

  begin
    delete from public.membresias where id = p_membresia_id;
  exception when foreign_key_violation then
    -- Ya estuvo en el personal y tiene eventos o pagos a su nombre: queda como retirado.
    update public.membresias set rol = 'retirado' where id = p_membresia_id;
  end;
end;
$$;

revoke execute on function public.aceptar_invitacion(uuid) from public, anon;
revoke execute on function public.rechazar_invitacion(uuid) from public, anon;
grant execute on function public.aceptar_invitacion(uuid) to authenticated;
grant execute on function public.rechazar_invitacion(uuid) to authenticated;

-- Buscar el id de una cuenta por correo: solo administradores (para invitar).
create or replace function public.buscar_persona_id_por_correo(p_correo text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from auth.users u
  join public.personas p on p.id = u.id
  where lower(u.email) = lower(trim(p_correo))
    and u.email_confirmed_at is not null
    and (
      public.es_super_admin()
      or exists (
        select 1 from public.membresias m
        where m.persona_id = auth.uid() and m.rol = 'admin_institucion'
      )
    )
  order by u.created_at
  limit 1;
$$;

revoke execute on function public.buscar_persona_id_por_correo(text) from public, anon;
grant execute on function public.buscar_persona_id_por_correo(text) to authenticated;

-- Registro de actividad del personal, con los nuevos estados. Mientras la invitación está
-- pendiente solo se anota el correo que escribió el administrador.
create or replace function public.actividad_registrar_membresia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila public.membresias := coalesce(new, old);
  v_nombre text;
  v_correo text := coalesce(nullif(v_fila.correo_invitacion, ''), 'una persona');
  v_accion text := case tg_op when 'INSERT' then 'crear' when 'UPDATE' then 'editar' else 'eliminar' end;
  v_viejo text := case when tg_op <> 'INSERT' then old.rol end;
  v_nuevo text := case when tg_op <> 'DELETE' then new.rol end;
  v_texto text;
begin
  if v_fila.institucion_id is null then
    return null;
  end if;

  if (tg_op = 'UPDATE' and v_viejo = v_nuevo) then
    return null;
  end if;

  v_nombre := coalesce(public.actividad_nombre_persona(v_fila.persona_id), 'una persona');

  v_texto := case
    when tg_op = 'INSERT' and v_nuevo like 'invitado_%' then
      'invitó a ' || v_correo || ' como ' || case v_nuevo when 'invitado_admin' then 'administrador' else 'recaudador' end
    when tg_op = 'INSERT' then
      'agregó a ' || v_nombre || ' al personal como ' || case v_nuevo when 'admin_institucion' then 'administrador' else 'recaudador' end
    when tg_op = 'DELETE' and v_viejo like 'invitado_%' then
      case when auth.uid() = v_fila.persona_id then v_correo || ' rechazó la invitación'
           else 'canceló la invitación de ' || v_correo end
    when tg_op = 'DELETE' then
      'quitó a ' || v_nombre || ' del personal'
    when v_viejo like 'invitado_%' and v_nuevo in ('admin_institucion', 'recaudador') then
      v_nombre || ' aceptó la invitación y entró al personal como '
        || case v_nuevo when 'admin_institucion' then 'administrador' else 'recaudador' end
    when v_nuevo like 'invitado_%' then
      'invitó a ' || v_correo || ' como ' || case v_nuevo when 'invitado_admin' then 'administrador' else 'recaudador' end
    when v_nuevo = 'retirado' then
      'quitó a ' || v_nombre || ' del personal'
    else
      'cambió el rol de ' || v_nombre || ' a ' || case v_nuevo when 'admin_institucion' then 'administrador' else 'recaudador' end
  end;

  perform public.actividad_anotar(v_fila.institucion_id, 'personal', v_accion, v_texto);
  return null;
exception when others then
  raise warning 'actividad: no se pudo anotar el cambio en membresias: %', sqlerrm;
  return null;
end;
$$;

revoke execute on function public.actividad_registrar_membresia() from public, anon, authenticated;

drop trigger if exists actividad_membresias on public.membresias;
create trigger actividad_membresias after insert or update or delete on public.membresias
  for each row execute function public.actividad_registrar_membresia();


-- 6. Ajustes menores ---------------------------------------------------------------------

-- Precio siempre mayor que cero (antes solo lo revisaba la app).
alter table public.productos drop constraint if exists productos_precio_positivo;
alter table public.productos add constraint productos_precio_positivo check (precio_unitario > 0) not valid;
do $$
begin
  alter table public.productos validate constraint productos_precio_positivo;
exception when check_violation then
  raise notice 'Hay productos con precio 0 o negativo: la regla aplica desde ahora para los nuevos cambios.';
end;
$$;

-- Imágenes de eventos solo por https.
alter table public.eventos drop constraint if exists eventos_imagen_https;
alter table public.eventos add constraint eventos_imagen_https
  check (imagen_url is null or imagen_url ~* '^https://') not valid;

-- Funciones que quedaron con permiso para PUBLIC.
revoke execute on function public.es_personal_de(uuid, text[]) from public, anon;
grant execute on function public.es_personal_de(uuid, text[]) to authenticated;
revoke execute on function public.evento_acepta_pagos(uuid) from public, anon;
grant execute on function public.evento_acepta_pagos(uuid) to authenticated;
