-- Colectia: Registro de actividad de cada institución
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Crea la tabla "actividad", donde queda anotado automáticamente cada
-- cambio que se hace dentro de una institución: estudiantes agregados,
-- editados o eliminados; eventos, productos y a quién va dirigido cada
-- evento; pagos registrados, eliminados y devueltas entregadas; cambios
-- de personal; cursos y grupos de cursos; y acudientes que se vinculan a
-- un estudiante.
--
-- - Lo anota la propia base de datos (con "triggers"), así que queda
--   registrado sin importar desde dónde se hizo el cambio: formularios,
--   carga desde Excel, cobro rápido, o incluso cambios hechos a mano en
--   Supabase.
-- - Cada anotación guarda quién lo hizo, cuándo, y una descripción en
--   lenguaje sencillo. Los números de documento y fechas de nacimiento
--   NO se copian al registro (solo se anota que "cambió").
-- - Solo el admin_institucion de cada institución puede ver su registro.
--   Nadie puede editarlo ni borrarlo desde la aplicación.
-- - Si por alguna razón no se pudiera anotar un cambio, el cambio igual
--   se guarda normalmente (la anotación nunca bloquea la operación).
-- - El registro empieza desde el momento en que se corre este script;
--   los cambios anteriores no aparecen.
--
-- Se puede volver a correr sin problema.

create table if not exists public.actividad (
  id bigint generated always as identity primary key,
  institucion_id uuid not null references public.instituciones (id) on delete cascade,
  persona_id uuid references public.personas (id) on delete set null,
  -- Nombre de quien hizo el cambio, tal como era en ese momento.
  actor_nombre text not null,
  -- estudiantes | eventos | pagos | personal | cursos | acudientes
  categoria text not null,
  -- crear | editar | eliminar
  accion text not null,
  descripcion text not null,
  -- Datos extra para agrupar y resumir (por ejemplo, el valor de un pago).
  detalle jsonb not null default '{}'::jsonb,
  -- Identificador de la operación: los cambios hechos en una misma
  -- operación (por ejemplo, subir un Excel con 300 estudiantes, o un pago
  -- con varios productos) comparten este número y se muestran juntos.
  transaccion bigint not null default txid_current(),
  created_at timestamptz not null default now()
);

create index if not exists actividad_institucion_fecha_idx
  on public.actividad (institucion_id, created_at desc, id desc);

alter table public.actividad enable row level security;

drop policy if exists "admin_institucion ve la actividad de su institucion" on public.actividad;
create policy "admin_institucion ve la actividad de su institucion"
  on public.actividad for select
  to authenticated
  using (public.tiene_rol_en_institucion(institucion_id, array['admin_institucion']));

-- Funciones de apoyo

-- $25000 → "$25.000"
create or replace function public.actividad_pesos(p_valor numeric)
returns text
language sql
immutable
as $$
  select '$' || replace(to_char(round(coalesce(p_valor, 0)), 'FM999,999,999,990'), ',', '.');
$$;

create or replace function public.actividad_nombre_persona(p_persona_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(trim(coalesce(p.nombres, '') || ' ' || coalesce(p.apellidos, '')), ''),
    p.correo,
    'Alguien'
  )
  from public.personas p
  where p.id = p_persona_id;
$$;

create or replace function public.actividad_nombre_estudiante(p_estudiante_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select e.nombres || ' ' || e.apellidos
         || coalesce(' (' || e.curso_grado || ')', '')
  from public.estudiantes e
  where e.id = p_estudiante_id;
$$;

create or replace function public.actividad_anotar(
  p_institucion_id uuid,
  p_categoria text,
  p_accion text,
  p_descripcion text,
  p_detalle jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_persona uuid := auth.uid();
begin
  if p_institucion_id is null or p_descripcion is null then
    return;
  end if;

  insert into public.actividad
    (institucion_id, persona_id, actor_nombre, categoria, accion, descripcion, detalle)
  values (
    p_institucion_id,
    v_persona,
    case
      when v_persona is null then 'Sistema (cambio hecho directamente en Supabase)'
      else coalesce(public.actividad_nombre_persona(v_persona), 'Alguien')
    end,
    p_categoria,
    p_accion,
    p_descripcion,
    coalesce(p_detalle, '{}'::jsonb)
  );
end;
$$;

-- Función que anota cada cambio (una sola, para todas las tablas)

create or replace function public.actividad_registrar_cambio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nuevo jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_viejo jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_fila jsonb := coalesce(v_nuevo, v_viejo);
  v_accion text := case tg_op when 'INSERT' then 'crear' when 'UPDATE' then 'editar' else 'eliminar' end;
  v_institucion uuid;
  v_evento text;
  v_texto text;
  v_cambios text[] := array[]::text[];
  v_detalle jsonb := '{}'::jsonb;
  v_producto text;
  v_devuelta numeric;
  v_primera_linea boolean;
begin
  -- estudiantes
  if tg_table_name = 'estudiantes' then
    v_institucion := (v_fila ->> 'institucion_id')::uuid;
    v_texto := (v_fila ->> 'nombres') || ' ' || (v_fila ->> 'apellidos')
               || coalesce(' (' || (v_fila ->> 'curso_grado') || ')', '');
    if tg_op = 'INSERT' then
      perform public.actividad_anotar(v_institucion, 'estudiantes', v_accion,
        'agregó al estudiante ' || v_texto);
    elsif tg_op = 'DELETE' then
      perform public.actividad_anotar(v_institucion, 'estudiantes', v_accion,
        'eliminó al estudiante ' || v_texto);
    else
      if (v_viejo ->> 'nombres') is distinct from (v_nuevo ->> 'nombres')
         or (v_viejo ->> 'apellidos') is distinct from (v_nuevo ->> 'apellidos') then
        v_cambios := v_cambios || ('nombre: ' || (v_viejo ->> 'nombres') || ' ' || (v_viejo ->> 'apellidos')
                                   || ' → ' || (v_nuevo ->> 'nombres') || ' ' || (v_nuevo ->> 'apellidos'));
      end if;
      if (v_viejo ->> 'curso_grado') is distinct from (v_nuevo ->> 'curso_grado') then
        v_cambios := v_cambios || ('curso: ' || coalesce(v_viejo ->> 'curso_grado', 'ninguno')
                                   || ' → ' || coalesce(v_nuevo ->> 'curso_grado', 'ninguno'));
      end if;
      if (v_viejo ->> 'codigo_institucional') is distinct from (v_nuevo ->> 'codigo_institucional') then
        v_cambios := v_cambios || ('código: ' || (v_viejo ->> 'codigo_institucional')
                                   || ' → ' || (v_nuevo ->> 'codigo_institucional'));
      end if;
      if (v_viejo ->> 'numero_documento') is distinct from (v_nuevo ->> 'numero_documento') then
        v_cambios := v_cambios || 'cambió el número de documento'::text;
      end if;
      if (v_viejo ->> 'fecha_nacimiento') is distinct from (v_nuevo ->> 'fecha_nacimiento') then
        v_cambios := v_cambios || 'cambió la fecha de nacimiento'::text;
      end if;
      if array_length(v_cambios, 1) > 0 then
        perform public.actividad_anotar(v_institucion, 'estudiantes', v_accion,
          'editó al estudiante ' || v_texto || ': ' || array_to_string(v_cambios, '; '));
      end if;
    end if;

  -- eventos
  elsif tg_table_name = 'eventos' then
    v_institucion := (v_fila ->> 'institucion_id')::uuid;
    if tg_op = 'INSERT' then
      perform public.actividad_anotar(v_institucion, 'eventos', v_accion,
        'creó el evento "' || (v_nuevo ->> 'nombre') || '"'
        || coalesce(', pago hasta el ' || to_char((v_nuevo ->> 'fecha_limite_pago')::date, 'DD/MM/YYYY'), '')
        || coalesce(', se realiza el ' || to_char((v_nuevo ->> 'fecha_evento')::date, 'DD/MM/YYYY'), ''));
    elsif tg_op = 'DELETE' then
      perform public.actividad_anotar(v_institucion, 'eventos', v_accion,
        'eliminó el evento "' || (v_viejo ->> 'nombre') || '"');
    else
      -- Finalizar / reabrir se anota aparte, porque es una acción en sí.
      if (v_viejo ->> 'finalizado_en') is null and (v_nuevo ->> 'finalizado_en') is not null then
        perform public.actividad_anotar(v_institucion, 'eventos', v_accion,
          'marcó como finalizado el evento "' || (v_nuevo ->> 'nombre') || '"');
      elsif (v_viejo ->> 'finalizado_en') is not null and (v_nuevo ->> 'finalizado_en') is null then
        perform public.actividad_anotar(v_institucion, 'eventos', v_accion,
          'reabrió el evento "' || (v_nuevo ->> 'nombre') || '"');
      end if;
      if (v_viejo ->> 'fecha_limite_pago') is distinct from (v_nuevo ->> 'fecha_limite_pago') then
        v_cambios := v_cambios || ('fecha límite de pago: '
          || coalesce(to_char((v_viejo ->> 'fecha_limite_pago')::date, 'DD/MM/YYYY'), 'sin fecha') || ' → '
          || coalesce(to_char((v_nuevo ->> 'fecha_limite_pago')::date, 'DD/MM/YYYY'), 'sin fecha'));
      end if;
      if (v_viejo ->> 'fecha_evento') is distinct from (v_nuevo ->> 'fecha_evento') then
        v_cambios := v_cambios || ('fecha del evento: '
          || coalesce(to_char((v_viejo ->> 'fecha_evento')::date, 'DD/MM/YYYY'), 'sin fecha') || ' → '
          || coalesce(to_char((v_nuevo ->> 'fecha_evento')::date, 'DD/MM/YYYY'), 'sin fecha'));
      end if;
      if (v_viejo ->> 'nombre') is distinct from (v_nuevo ->> 'nombre') then
        v_cambios := v_cambios || ('nombre: "' || (v_viejo ->> 'nombre') || '" → "' || (v_nuevo ->> 'nombre') || '"');
      end if;
      if (v_viejo ->> 'descripcion') is distinct from (v_nuevo ->> 'descripcion') then
        v_cambios := v_cambios || 'cambió la descripción'::text;
      end if;
      if (v_viejo ->> 'imagen_url') is distinct from (v_nuevo ->> 'imagen_url') then
        v_cambios := v_cambios || (case
          when v_nuevo ->> 'imagen_url' is null then 'quitó la imagen'
          when v_viejo ->> 'imagen_url' is null then 'agregó una imagen'
          else 'cambió la imagen' end);
      end if;
      if array_length(v_cambios, 1) > 0 then
        perform public.actividad_anotar(v_institucion, 'eventos', v_accion,
          'editó el evento "' || (v_nuevo ->> 'nombre') || '": ' || array_to_string(v_cambios, '; '));
      end if;
    end if;

  -- productos, evento_grupos, registros_pago
  -- (su institución se saca del evento; si el evento ya no existe porque
  -- se está borrando entero, no se anota cada parte por separado: basta
  -- con "eliminó el evento")
  elsif tg_table_name in ('productos', 'evento_grupos', 'registros_pago') then
    select ev.institucion_id, ev.nombre into v_institucion, v_evento
    from public.eventos ev
    where ev.id = (v_fila ->> 'evento_id')::uuid;

    if v_institucion is null then
      return null;
    end if;

    if tg_table_name = 'productos' then
      if tg_op = 'INSERT' then
        perform public.actividad_anotar(v_institucion, 'eventos', v_accion,
          'agregó el producto "' || (v_nuevo ->> 'nombre') || '" ('
          || public.actividad_pesos((v_nuevo ->> 'precio_unitario')::numeric)
          || ') al evento "' || v_evento || '"');
      elsif tg_op = 'DELETE' then
        perform public.actividad_anotar(v_institucion, 'eventos', v_accion,
          'eliminó el producto "' || (v_viejo ->> 'nombre') || '" del evento "' || v_evento || '"');
      else
        perform public.actividad_anotar(v_institucion, 'eventos', v_accion,
          'editó el producto "' || (v_nuevo ->> 'nombre') || '" del evento "' || v_evento || '"');
      end if;

    elsif tg_table_name = 'evento_grupos' then
      v_texto := case
        when v_fila ->> 'curso_grado' is not null then 'curso ' || (v_fila ->> 'curso_grado')
        else 'estudiante ' || coalesce(public.actividad_nombre_estudiante((v_fila ->> 'estudiante_id')::uuid), '(eliminado)')
      end;
      if tg_op = 'INSERT' then
        perform public.actividad_anotar(v_institucion, 'eventos', v_accion,
          'dirigió el evento "' || v_evento || '" al ' || v_texto);
      elsif tg_op = 'DELETE' then
        perform public.actividad_anotar(v_institucion, 'eventos', v_accion,
          'quitó al ' || v_texto || ' del evento "' || v_evento || '"');
      end if;

    else -- registros_pago
      select p.nombre into v_producto from public.productos p
      where p.id = (v_fila ->> 'producto_id')::uuid;
      v_texto := coalesce(public.actividad_nombre_estudiante((v_fila ->> 'estudiante_id')::uuid), 'un estudiante');
      -- Un pago puede tener varias líneas (una por producto) que comparten
      -- grupo_pago_id; el dinero recibido es del pago completo, así que la
      -- devuelta se calcula contra la suma de todas sus líneas, y se
      -- menciona una sola vez (en la "primera" línea del pago).
      select coalesce((v_fila ->> 'dinero_recibido')::numeric, 0) - coalesce(sum(rp.monto), 0),
             (v_fila ->> 'id') = min(rp.id::text)
        into v_devuelta, v_primera_linea
      from public.registros_pago rp
      where rp.grupo_pago_id = (v_fila ->> 'grupo_pago_id')::uuid;
      v_detalle := jsonb_build_object(
        'grupo', v_fila ->> 'grupo_pago_id',
        'monto', (v_fila ->> 'monto')::numeric
      );

      if tg_op = 'INSERT' then
        perform public.actividad_anotar(v_institucion, 'pagos', v_accion,
          'registró un pago en efectivo de ' || v_texto || ': '
          || (v_fila ->> 'cantidad') || ' × ' || coalesce(v_producto, 'producto') || ' por '
          || public.actividad_pesos((v_fila ->> 'monto')::numeric)
          || ' (evento "' || v_evento || '")'
          || case when (v_fila ->> 'devuelta_pendiente')::boolean and v_devuelta > 0
                    and coalesce(v_primera_linea, true)
               then ' · queda debiendo una devuelta de ' || public.actividad_pesos(v_devuelta)
               else '' end,
          v_detalle);
      elsif tg_op = 'DELETE' then
        perform public.actividad_anotar(v_institucion, 'pagos', v_accion,
          'eliminó un pago de ' || v_texto || ': '
          || (v_fila ->> 'cantidad') || ' × ' || coalesce(v_producto, 'producto') || ' por '
          || public.actividad_pesos((v_fila ->> 'monto')::numeric)
          || ' (evento "' || v_evento || '")',
          v_detalle);
      else
        if (v_viejo ->> 'devuelta_pendiente')::boolean and not (v_nuevo ->> 'devuelta_pendiente')::boolean then
          if not coalesce(v_primera_linea, true) then
            return null;  -- ya se anotó con la primera línea del pago
          end if;
          perform public.actividad_anotar(v_institucion, 'pagos', v_accion,
            'marcó como entregada la devuelta de ' || public.actividad_pesos(v_devuelta)
            || ' a ' || v_texto || ' (evento "' || v_evento || '")',
            v_detalle);
        elsif v_viejo is distinct from v_nuevo then
          perform public.actividad_anotar(v_institucion, 'pagos', v_accion,
            'editó un pago de ' || v_texto || ' (evento "' || v_evento || '")',
            v_detalle);
        end if;
      end if;
    end if;

  -- membresias (personal)
  elsif tg_table_name = 'membresias' then
    v_institucion := (v_fila ->> 'institucion_id')::uuid;
    if v_institucion is null then
      return null;
    end if;
    v_texto := coalesce(public.actividad_nombre_persona((v_fila ->> 'persona_id')::uuid), 'una persona');
    if tg_op = 'INSERT' then
      perform public.actividad_anotar(v_institucion, 'personal', v_accion,
        'agregó a ' || v_texto || ' al personal como '
        || case v_nuevo ->> 'rol' when 'admin_institucion' then 'administrador' else 'recaudador' end);
    elsif tg_op = 'DELETE' then
      perform public.actividad_anotar(v_institucion, 'personal', v_accion,
        'quitó a ' || v_texto || ' del personal');
    elsif (v_viejo ->> 'rol') is distinct from (v_nuevo ->> 'rol') then
      perform public.actividad_anotar(v_institucion, 'personal', v_accion,
        'cambió el rol de ' || v_texto || ' a '
        || case v_nuevo ->> 'rol' when 'admin_institucion' then 'administrador' else 'recaudador' end);
    end if;

  -- grados (cursos)
  elsif tg_table_name = 'grados' then
    v_institucion := (v_fila ->> 'institucion_id')::uuid;
    if tg_op = 'INSERT' then
      perform public.actividad_anotar(v_institucion, 'cursos', v_accion,
        'creó el curso ' || (v_nuevo ->> 'nombre'));
    elsif tg_op = 'DELETE' then
      perform public.actividad_anotar(v_institucion, 'cursos', v_accion,
        'eliminó el curso ' || (v_viejo ->> 'nombre'));
    end if;

  -- grupos_curso
  elsif tg_table_name = 'grupos_curso' then
    v_institucion := (v_fila ->> 'institucion_id')::uuid;
    if tg_op = 'INSERT' then
      perform public.actividad_anotar(v_institucion, 'cursos', v_accion,
        'creó el grupo de cursos "' || (v_nuevo ->> 'nombre') || '"');
    elsif tg_op = 'DELETE' then
      perform public.actividad_anotar(v_institucion, 'cursos', v_accion,
        'eliminó el grupo de cursos "' || (v_viejo ->> 'nombre') || '"');
    end if;

  -- grupo_curso_grados
  elsif tg_table_name = 'grupo_curso_grados' then
    select gc.institucion_id, gc.nombre into v_institucion, v_evento
    from public.grupos_curso gc
    where gc.id = (v_fila ->> 'grupo_curso_id')::uuid;
    select g.nombre into v_texto from public.grados g
    where g.id = (v_fila ->> 'grado_id')::uuid;
    if v_institucion is null or v_texto is null then
      return null;
    end if;
    if tg_op = 'INSERT' then
      perform public.actividad_anotar(v_institucion, 'cursos', v_accion,
        'agregó el curso ' || v_texto || ' al grupo "' || v_evento || '"');
    elsif tg_op = 'DELETE' then
      perform public.actividad_anotar(v_institucion, 'cursos', v_accion,
        'quitó el curso ' || v_texto || ' del grupo "' || v_evento || '"');
    end if;

  -- acudiente_estudiante
  elsif tg_table_name = 'acudiente_estudiante' then
    select e.institucion_id into v_institucion
    from public.estudiantes e
    where e.id = (v_fila ->> 'estudiante_id')::uuid;
    if v_institucion is null then
      return null;
    end if;
    v_texto := coalesce(public.actividad_nombre_estudiante((v_fila ->> 'estudiante_id')::uuid), 'un estudiante');
    if tg_op = 'INSERT' then
      perform public.actividad_anotar(v_institucion, 'acudientes', v_accion,
        'el acudiente ' || coalesce(public.actividad_nombre_persona((v_fila ->> 'persona_id')::uuid), '(sin nombre)')
        || ' se vinculó con ' || v_texto);
    elsif tg_op = 'DELETE' then
      perform public.actividad_anotar(v_institucion, 'acudientes', v_accion,
        'se desvinculó el acudiente ' || coalesce(public.actividad_nombre_persona((v_fila ->> 'persona_id')::uuid), '(sin nombre)')
        || ' de ' || v_texto);
    end if;
  end if;

  return null;
exception when others then
  -- Nunca bloquear el cambio real por un problema al anotarlo.
  raise warning 'actividad: no se pudo anotar el cambio en %: %', tg_table_name, sqlerrm;
  return null;
end;
$$;

-- Estas funciones solo las usa la propia base de datos al anotar cambios.
-- Se les quita el permiso a los usuarios de la aplicación para que nadie
-- pueda llamarlas directamente (por ejemplo, para inventar anotaciones o
-- consultar nombres de otras instituciones).
revoke execute on function public.actividad_anotar(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.actividad_nombre_persona(uuid) from public, anon, authenticated;
revoke execute on function public.actividad_nombre_estudiante(uuid) from public, anon, authenticated;
revoke execute on function public.actividad_registrar_cambio() from public, anon, authenticated;

-- Conectar la función a cada tabla

do $$
declare
  t text;
begin
  foreach t in array array[
    'estudiantes', 'eventos', 'productos', 'evento_grupos', 'registros_pago',
    'membresias', 'grados', 'grupos_curso', 'grupo_curso_grados', 'acudiente_estudiante'
  ]
  loop
    execute format('drop trigger if exists actividad_%1$s on public.%1$I', t);
    execute format(
      'create trigger actividad_%1$s after insert or update or delete on public.%1$I
         for each row execute function public.actividad_registrar_cambio()',
      t
    );
  end loop;
end;
$$;
