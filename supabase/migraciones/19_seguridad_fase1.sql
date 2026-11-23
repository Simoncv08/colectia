-- Colectia: Fase 1 de seguridad (hallazgos de la revisión Thermos)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema.
--
-- 1. Invitaciones: se busca por el correo real de la cuenta (auth.users), no por
--    personas.correo, y nadie puede cambiar su correo guardado.
-- 2. Las funciones seguras dejan de estar abiertas a visitantes sin sesión (anon).
-- 3. Vincular estudiantes: máximo 8 intentos fallidos por hora y 10 estudiantes por cuenta.
-- 4. Pagos: se registran y se marcan solo con funciones que calculan el valor y el
--    receptor en la base de datos; borrar pagos queda solo para el administrador.
-- 5. Borrar un evento, estudiante o producto con pagos ya no borra los pagos: se impide.
-- 6. Un evento solo se puede dirigir a estudiantes de su misma institución.


-- 1. Correo e invitaciones

-- Corrige cualquier correo guardado que no coincida con el de la cuenta.
update public.personas p
set correo = lower(u.email)
from auth.users u
where u.id = p.id
  and p.correo is distinct from lower(u.email);

create or replace function public.personas_proteger_correo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.correo is distinct from old.correo then
    new.correo := (select lower(u.email) from auth.users u where u.id = new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists personas_proteger_correo on public.personas;
create trigger personas_proteger_correo
  before update on public.personas
  for each row execute function public.personas_proteger_correo();

-- Si alguien cambia el correo de su cuenta en Supabase, se copia a personas.
create or replace function public.sincronizar_correo_persona()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.personas set correo = lower(new.email) where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sincronizar_correo_persona();

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
  order by u.created_at
  limit 1;
$$;

revoke execute on function public.buscar_persona_id_por_correo(text) from public;
grant execute on function public.buscar_persona_id_por_correo(text) to authenticated;


-- 2. Funciones viejas y permisos de visitantes sin sesión

drop function if exists public.buscar_estudiante_por_codigo(uuid, text, date);
drop function if exists public.buscar_estudiante_por_documento(uuid, text, date);
drop function if exists public.buscar_estudiante_por_codigo(uuid, text);

-- ¿Es la persona actual personal de esa institución? Lee la tabla membresias y no el
-- token, así quien sale del personal pierde el acceso de inmediato.
create or replace function public.es_personal_de(p_institucion_id uuid, p_roles text[])
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

grant execute on function public.es_personal_de(uuid, text[]) to authenticated;


-- 3. Vincular estudiantes con límite de intentos

create table if not exists public.vinculo_intentos (
  id bigint generated always as identity primary key,
  persona_id uuid not null references public.personas (id) on delete cascade,
  creado_en timestamptz not null default now()
);
create index if not exists vinculo_intentos_persona_idx
  on public.vinculo_intentos (persona_id, creado_en);
-- Sin políticas: solo la función de abajo la lee y la escribe.
alter table public.vinculo_intentos enable row level security;

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


-- 4. Pagos en efectivo

-- p_filas: [{"estudianteId": uuid, "cantidad": entero, "devueltaPendiente": número o null}]
-- Bloquea el producto mientras registra, así dos personas cobrando el mismo salón a la vez
-- no le cobran dos veces al mismo estudiante.
create or replace function public.registrar_pagos_efectivo(
  p_evento_id uuid,
  p_producto_id uuid,
  p_filas jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_persona uuid := auth.uid();
  v_institucion uuid;
  v_membresia uuid;
  v_precio numeric;
  v_maximo int;
  v_fila jsonb;
  v_estudiante uuid;
  v_cantidad int;
  v_devuelta numeric;
  v_registrados int := 0;
  v_omitidos int := 0;
begin
  if v_persona is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select ev.institucion_id into v_institucion from public.eventos ev where ev.id = p_evento_id;
  if v_institucion is null then
    raise exception 'El evento ya no existe.';
  end if;
  if not public.institucion_esta_activa(v_institucion) then
    raise exception 'La institución no está activa, así que no se pueden registrar pagos.';
  end if;

  select m.id into v_membresia
  from public.membresias m
  where m.persona_id = v_persona
    and m.institucion_id = v_institucion
    and m.rol in ('admin_institucion', 'recaudador')
  order by (m.rol = 'admin_institucion') desc, m.created_at
  limit 1;
  if v_membresia is null then
    raise exception 'No eres parte del personal de esta institución.';
  end if;

  select pr.precio_unitario, pr.cantidad_maxima_por_estudiante
    into v_precio, v_maximo
  from public.productos pr
  where pr.id = p_producto_id and pr.evento_id = p_evento_id
  for update;
  if not found then
    raise exception 'Ese producto ya no existe en este evento.';
  end if;

  if jsonb_typeof(p_filas) is distinct from 'array' or jsonb_array_length(p_filas) = 0 then
    raise exception 'Marca al menos un estudiante.';
  end if;

  for v_fila in select * from jsonb_array_elements(p_filas) loop
    begin
      v_estudiante := (v_fila ->> 'estudianteId')::uuid;
      v_cantidad := (v_fila ->> 'cantidad')::int;
      v_devuelta := nullif(v_fila ->> 'devueltaPendiente', '')::numeric;
    exception when others then
      raise exception 'Uno de los estudiantes marcados tiene datos inválidos.';
    end;

    if v_estudiante is null or v_cantidad is null or v_cantidad <= 0 then
      raise exception 'La cantidad de cada estudiante debe ser un número entero mayor a cero.';
    end if;
    if v_maximo is not null and v_cantidad > v_maximo then
      raise exception 'La cantidad máxima de este producto por estudiante es %.', v_maximo;
    end if;
    if v_devuelta is not null and v_devuelta <= 0 then
      raise exception 'La devuelta pendiente debe ser un valor mayor a cero.';
    end if;
    if not exists (
      select 1 from public.estudiantes e
      where e.id = v_estudiante and e.institucion_id = v_institucion
    ) then
      raise exception 'Alguno de los estudiantes marcados no pertenece a esta institución.';
    end if;

    if exists (
      select 1 from public.registros_pago rp
      where rp.producto_id = p_producto_id and rp.estudiante_id = v_estudiante
    ) then
      v_omitidos := v_omitidos + 1;
      continue;
    end if;

    insert into public.registros_pago (
      evento_id, estudiante_id, producto_id, cantidad, monto, metodo,
      registrado_por, dinero_recibido, devuelta_pendiente, grupo_pago_id
    ) values (
      p_evento_id, v_estudiante, p_producto_id, v_cantidad, v_precio * v_cantidad, 'efectivo',
      v_membresia,
      case when v_devuelta is not null then v_precio * v_cantidad + v_devuelta end,
      v_devuelta is not null,
      gen_random_uuid()
    );
    v_registrados := v_registrados + 1;
  end loop;

  return jsonb_build_object('registrados', v_registrados, 'omitidos', v_omitidos);
end;
$$;

revoke execute on function public.registrar_pagos_efectivo(uuid, uuid, jsonb) from public;
grant execute on function public.registrar_pagos_efectivo(uuid, uuid, jsonb) to authenticated;

create or replace function public.marcar_devuelta_entregada(p_grupo_pago_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_institucion uuid;
begin
  select ev.institucion_id into v_institucion
  from public.registros_pago rp
  join public.eventos ev on ev.id = rp.evento_id
  where rp.grupo_pago_id = p_grupo_pago_id
  limit 1;

  if v_institucion is null then
    raise exception 'Ese pago ya no existe.';
  end if;
  if not public.es_personal_de(v_institucion, array['admin_institucion', 'recaudador']) then
    raise exception 'No eres parte del personal de esta institución.';
  end if;

  update public.registros_pago
  set devuelta_pendiente = false
  where grupo_pago_id = p_grupo_pago_id;
end;
$$;

revoke execute on function public.marcar_devuelta_entregada(uuid) from public;
grant execute on function public.marcar_devuelta_entregada(uuid) to authenticated;

-- Ya no se escriben pagos directamente desde la app: solo con las funciones de arriba.
drop policy if exists "staff registra pagos en su institucion" on public.registros_pago;
drop policy if exists "staff actualiza pagos de su institucion" on public.registros_pago;

drop policy if exists "staff elimina pagos de su institucion" on public.registros_pago;
drop policy if exists "admin_institucion elimina pagos de su institucion" on public.registros_pago;
create policy "admin_institucion elimina pagos de su institucion"
  on public.registros_pago for delete
  to authenticated
  using (
    exists (
      select 1 from public.eventos ev
      where ev.id = registros_pago.evento_id
        and public.es_personal_de(ev.institucion_id, array['admin_institucion'])
    )
  );


-- 5. Borrar algo que tiene pagos se impide en vez de borrar los pagos

do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any (con.conkey)
    where con.conrelid = 'public.registros_pago'::regclass
      and con.contype = 'f'
      and a.attname in ('evento_id', 'estudiante_id', 'producto_id')
  loop
    execute format('alter table public.registros_pago drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.registros_pago
  add constraint registros_pago_evento_id_fkey
    foreign key (evento_id) references public.eventos (id) on delete restrict,
  add constraint registros_pago_estudiante_id_fkey
    foreign key (estudiante_id) references public.estudiantes (id) on delete restrict,
  add constraint registros_pago_producto_id_fkey
    foreign key (producto_id) references public.productos (id) on delete restrict;


-- 6. Eventos dirigidos solo a estudiantes de la misma institución

drop policy if exists "staff crea grupos de eventos de su institucion" on public.evento_grupos;
create policy "staff crea grupos de eventos de su institucion"
  on public.evento_grupos for insert
  to authenticated
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

create or replace function public.evento_visible_para_acudiente(p_evento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.evento_grupos eg
    join public.eventos ev on ev.id = eg.evento_id
    join public.estudiantes e on e.id = eg.estudiante_id and e.institucion_id = ev.institucion_id
    join public.acudiente_estudiante ae on ae.estudiante_id = e.id
    where eg.evento_id = p_evento_id
      and ae.persona_id = auth.uid()
  )
  or exists (
    select 1
    from public.evento_grupos eg
    join public.eventos ev on ev.id = eg.evento_id
    join public.estudiantes e
      on e.institucion_id = ev.institucion_id
      and e.curso_grado = eg.curso_grado
    join public.acudiente_estudiante ae on ae.estudiante_id = e.id
    where eg.evento_id = p_evento_id
      and ae.persona_id = auth.uid()
  );
$$;


-- 2 (final). Ninguna función segura queda abierta a visitantes sin sesión, incluidas
-- las que se creen después en este esquema.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as firma
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from anon', f.firma);
  end loop;
end;
$$;

alter default privileges in schema public revoke execute on functions from anon;
