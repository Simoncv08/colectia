-- Colectia: Políticas de RLS (Fase 0, paso 4 del plan de acción)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Requisito: haber ejecutado antes "hook_membresias.sql" y haber activado
-- el Custom Access Token Hook en Authentication → Hooks. Estas políticas
-- leen la lista de instituciones/roles directamente del token (JWT), que
-- es lo que ese hook agrega a cada sesión.
--
-- Cómo está organizado este archivo:
--   1. Funciones auxiliares (para no repetir la misma lógica en cada
--      política, más corto y más fácil de revisar).
--   2. Políticas por tabla, en el mismo orden del documento de
--      arquitectura (instituciones, personas, membresias, estudiantes,
--      acudiente_estudiante, eventos, evento_grupos, productos,
--      registros_pago).
--
-- Nota sobre pagos en línea: la tabla registros_pago solo tiene aquí
-- políticas para que el personal de la institución registre pagos en
-- efectivo. El registro de pagos en línea (cuando se integre la pasarela,
-- en la Fase 2) se hará desde una función segura del servidor, no desde
-- el navegador, así que no necesita una política de "insert" para el rol
-- acudiente.


-- 1. Funciones auxiliares

-- Devuelve la lista de membresías (institución + rol) que el hook agregó
-- al token de la persona que está haciendo la consulta ahora mismo.
create or replace function public.jwt_membresias()
returns jsonb
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'membresias', '[]'::jsonb);
$$;

-- ¿Es la persona actual super_admin de la plataforma?
create or replace function public.es_super_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from jsonb_array_elements(public.jwt_membresias()) m
    where m ->> 'rol' = 'super_admin'
  );
$$;

-- ¿Tiene la persona actual alguno de los roles indicados en esa institución?
-- Ejemplo de uso: tiene_rol_en_institucion(institucion_id, array['admin_institucion'])
create or replace function public.tiene_rol_en_institucion(p_institucion_id uuid, p_roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from jsonb_array_elements(public.jwt_membresias()) m
    where (m ->> 'institucion_id')::uuid = p_institucion_id
      and (m ->> 'rol') = any(p_roles)
  );
$$;

-- ¿Está esa institución activa? "security definer" es necesario aquí:
-- esta función se usa dentro de otras políticas (por ejemplo, para que un
-- acudiente pueda vincular su primer estudiante), y en ese momento la
-- persona todavía no tiene ninguna fila propia que le dé permiso de leer
-- la tabla "instituciones" directamente. Por eso esta función "se salta"
-- RLS únicamente para esta comprobación puntual (activa/no activa), sin
-- exponer ninguna otra columna ni fila.
create or replace function public.institucion_esta_activa(p_institucion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.instituciones i
    where i.id = p_institucion_id and i.estado = 'activa'
  );
$$;

-- ¿Es la persona actual acudiente de este estudiante? Mismo motivo de
-- "security definer" que la función anterior.
create or replace function public.es_acudiente_de(p_estudiante_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.acudiente_estudiante ae
    where ae.estudiante_id = p_estudiante_id
      and ae.persona_id = auth.uid()
  );
$$;

revoke execute on function public.jwt_membresias() from public;
revoke execute on function public.es_super_admin() from public;
revoke execute on function public.tiene_rol_en_institucion(uuid, text[]) from public;
revoke execute on function public.institucion_esta_activa(uuid) from public;
revoke execute on function public.es_acudiente_de(uuid) from public;

grant execute on function public.jwt_membresias() to authenticated;
grant execute on function public.es_super_admin() to authenticated;
grant execute on function public.tiene_rol_en_institucion(uuid, text[]) to authenticated;
grant execute on function public.institucion_esta_activa(uuid) to authenticated;
grant execute on function public.es_acudiente_de(uuid) to authenticated;


-- 2. instituciones

create policy "super_admin ve todas las instituciones"
  on public.instituciones for select
  to authenticated
  using (public.es_super_admin());

create policy "miembros ven su propia institucion"
  on public.instituciones for select
  to authenticated
  using (public.tiene_rol_en_institucion(id, array['admin_institucion','recaudador']));

create policy "acudientes ven instituciones de sus estudiantes"
  on public.instituciones for select
  to authenticated
  using (
    exists (
      select 1
      from public.estudiantes e
      join public.acudiente_estudiante ae on ae.estudiante_id = e.id
      where e.institucion_id = instituciones.id
        and ae.persona_id = auth.uid()
    )
  );

create policy "super_admin crea instituciones"
  on public.instituciones for insert
  to authenticated
  with check (public.es_super_admin());

create policy "super_admin actualiza instituciones"
  on public.instituciones for update
  to authenticated
  using (public.es_super_admin())
  with check (public.es_super_admin());

create policy "super_admin elimina instituciones"
  on public.instituciones for delete
  to authenticated
  using (public.es_super_admin());


-- 3. personas

create policy "cada quien ve su propia persona"
  on public.personas for select
  to authenticated
  using (id = auth.uid());

create policy "staff ve personas de su institucion"
  on public.personas for select
  to authenticated
  using (
    exists (
      select 1 from public.membresias m
      where m.persona_id = personas.id
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

create policy "cada quien actualiza su propia persona"
  on public.personas for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No hace falta una política de "insert": la fila en personas la crea
-- automáticamente el trigger handle_new_user cuando alguien inicia sesión
-- por primera vez (corre con privilegios elevados, no pasa por RLS).


-- 4. membresias

create policy "cada quien ve sus propias membresias"
  on public.membresias for select
  to authenticated
  using (persona_id = auth.uid());

create policy "admin_institucion ve membresias de su institucion"
  on public.membresias for select
  to authenticated
  using (public.tiene_rol_en_institucion(institucion_id, array['admin_institucion']));

create policy "super_admin ve membresias de admin_institucion"
  on public.membresias for select
  to authenticated
  using (public.es_super_admin() and rol = 'admin_institucion');

-- Solo super_admin puede otorgar el rol admin_institucion (así arranca
-- cada institución nueva). admin_institucion, dentro de su propia
-- institución activa, puede crear tanto más admin_institucion como
-- recaudador (ver punto 6 del plan de acción).
create policy "super_admin crea membresias de admin_institucion"
  on public.membresias for insert
  to authenticated
  with check (public.es_super_admin() and rol = 'admin_institucion');

create policy "admin_institucion crea membresias en su institucion"
  on public.membresias for insert
  to authenticated
  with check (
    rol in ('admin_institucion', 'recaudador')
    and public.tiene_rol_en_institucion(institucion_id, array['admin_institucion'])
    and public.institucion_esta_activa(institucion_id)
  );

create policy "super_admin actualiza membresias de admin_institucion"
  on public.membresias for update
  to authenticated
  using (public.es_super_admin() and rol = 'admin_institucion')
  with check (public.es_super_admin() and rol = 'admin_institucion');

create policy "admin_institucion actualiza membresias de su institucion"
  on public.membresias for update
  to authenticated
  using (
    rol in ('admin_institucion', 'recaudador')
    and public.tiene_rol_en_institucion(institucion_id, array['admin_institucion'])
  )
  with check (
    rol in ('admin_institucion', 'recaudador')
    and public.tiene_rol_en_institucion(institucion_id, array['admin_institucion'])
  );

create policy "super_admin elimina membresias de admin_institucion"
  on public.membresias for delete
  to authenticated
  using (public.es_super_admin() and rol = 'admin_institucion');

create policy "admin_institucion elimina membresias de su institucion"
  on public.membresias for delete
  to authenticated
  using (
    rol in ('admin_institucion', 'recaudador')
    and public.tiene_rol_en_institucion(institucion_id, array['admin_institucion'])
  );


-- 5. estudiantes

create policy "staff ve estudiantes de su institucion"
  on public.estudiantes for select
  to authenticated
  using (public.tiene_rol_en_institucion(institucion_id, array['admin_institucion','recaudador']));

create policy "acudiente ve sus estudiantes vinculados"
  on public.estudiantes for select
  to authenticated
  using (public.es_acudiente_de(id));

-- Solo admin_institucion puede crear/editar/eliminar estudiantes
-- (recaudador solo puede consultarlos, según el documento de bases).
create policy "admin_institucion crea estudiantes"
  on public.estudiantes for insert
  to authenticated
  with check (
    public.tiene_rol_en_institucion(institucion_id, array['admin_institucion'])
    and public.institucion_esta_activa(institucion_id)
  );

create policy "admin_institucion actualiza estudiantes"
  on public.estudiantes for update
  to authenticated
  using (public.tiene_rol_en_institucion(institucion_id, array['admin_institucion']))
  with check (public.tiene_rol_en_institucion(institucion_id, array['admin_institucion']));

create policy "admin_institucion elimina estudiantes"
  on public.estudiantes for delete
  to authenticated
  using (public.tiene_rol_en_institucion(institucion_id, array['admin_institucion']));


-- 6. acudiente_estudiante

create policy "acudiente ve sus propios vinculos"
  on public.acudiente_estudiante for select
  to authenticated
  using (persona_id = auth.uid());

create policy "staff ve vinculos de estudiantes de su institucion"
  on public.acudiente_estudiante for select
  to authenticated
  using (
    exists (
      select 1 from public.estudiantes e
      where e.id = acudiente_estudiante.estudiante_id
        and public.tiene_rol_en_institucion(e.institucion_id, array['admin_institucion','recaudador'])
    )
  );

-- El acudiente solo puede crear vínculos a su propia cuenta (persona_id
-- = auth.uid()), y solo hacia estudiantes de una institución activa. La
-- verificación real de identidad (código del estudiante, o número de
-- documento + fecha de nacimiento) se hace en la pantalla/función de la
-- app antes de este insert, esta política es la última línea de
-- defensa, no el mecanismo de verificación en sí.
create policy "acudiente vincula estudiantes a su propia cuenta"
  on public.acudiente_estudiante for insert
  to authenticated
  with check (
    persona_id = auth.uid()
    and exists (
      select 1 from public.estudiantes e
      where e.id = estudiante_id
        and public.institucion_esta_activa(e.institucion_id)
    )
  );

create policy "acudiente elimina sus propios vinculos"
  on public.acudiente_estudiante for delete
  to authenticated
  using (persona_id = auth.uid());

create policy "admin_institucion elimina vinculos de su institucion"
  on public.acudiente_estudiante for delete
  to authenticated
  using (
    exists (
      select 1 from public.estudiantes e
      where e.id = acudiente_estudiante.estudiante_id
        and public.tiene_rol_en_institucion(e.institucion_id, array['admin_institucion'])
    )
  );


-- 7. eventos

create policy "staff ve eventos de su institucion"
  on public.eventos for select
  to authenticated
  using (public.tiene_rol_en_institucion(institucion_id, array['admin_institucion','recaudador']));

-- El acudiente ve un evento si alguno de sus estudiantes vinculados está
-- incluido en evento_grupos, ya sea de forma puntual (estudiante_id) o
-- porque el evento aplica a todo el curso/grado de ese estudiante.
create policy "acudiente ve eventos dirigidos a sus estudiantes"
  on public.eventos for select
  to authenticated
  using (
    exists (
      select 1
      from public.evento_grupos eg
      join public.acudiente_estudiante ae on ae.estudiante_id = eg.estudiante_id
      where eg.evento_id = eventos.id
        and ae.persona_id = auth.uid()
    )
    or exists (
      select 1
      from public.evento_grupos eg
      join public.estudiantes e
        on e.institucion_id = eventos.institucion_id
        and e.curso_grado = eg.curso_grado
      join public.acudiente_estudiante ae on ae.estudiante_id = e.id
      where eg.evento_id = eventos.id
        and ae.persona_id = auth.uid()
    )
  );

-- Tanto admin_institucion como recaudador pueden crear eventos (según el
-- documento de bases), siempre que la institución esté activa.
create policy "staff crea eventos en su institucion"
  on public.eventos for insert
  to authenticated
  with check (
    public.tiene_rol_en_institucion(institucion_id, array['admin_institucion','recaudador'])
    and public.institucion_esta_activa(institucion_id)
  );

create policy "staff actualiza eventos de su institucion"
  on public.eventos for update
  to authenticated
  using (public.tiene_rol_en_institucion(institucion_id, array['admin_institucion','recaudador']))
  with check (public.tiene_rol_en_institucion(institucion_id, array['admin_institucion','recaudador']));

create policy "staff elimina eventos de su institucion"
  on public.eventos for delete
  to authenticated
  using (public.tiene_rol_en_institucion(institucion_id, array['admin_institucion','recaudador']));


-- 8. evento_grupos

create policy "staff ve grupos de eventos de su institucion"
  on public.evento_grupos for select
  to authenticated
  using (
    exists (
      select 1 from public.eventos ev
      where ev.id = evento_grupos.evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
    )
  );

create policy "acudiente ve grupos que aplican a sus estudiantes"
  on public.evento_grupos for select
  to authenticated
  using (
    (evento_grupos.estudiante_id is not null and public.es_acudiente_de(evento_grupos.estudiante_id))
    or (
      evento_grupos.curso_grado is not null
      and exists (
        select 1
        from public.eventos ev
        join public.estudiantes e
          on e.institucion_id = ev.institucion_id
          and e.curso_grado = evento_grupos.curso_grado
        join public.acudiente_estudiante ae on ae.estudiante_id = e.id
        where ev.id = evento_grupos.evento_id
          and ae.persona_id = auth.uid()
      )
    )
  );

create policy "staff crea grupos de eventos de su institucion"
  on public.evento_grupos for insert
  to authenticated
  with check (
    exists (
      select 1 from public.eventos ev
      where ev.id = evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
        and public.institucion_esta_activa(ev.institucion_id)
    )
  );

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
    )
  );

create policy "staff elimina grupos de eventos de su institucion"
  on public.evento_grupos for delete
  to authenticated
  using (
    exists (
      select 1 from public.eventos ev
      where ev.id = evento_grupos.evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
    )
  );


-- 9. productos

create policy "staff ve productos de eventos de su institucion"
  on public.productos for select
  to authenticated
  using (
    exists (
      select 1 from public.eventos ev
      where ev.id = productos.evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
    )
  );

create policy "acudiente ve productos de eventos visibles para sus estudiantes"
  on public.productos for select
  to authenticated
  using (
    exists (
      select 1 from public.evento_grupos eg
      where eg.evento_id = productos.evento_id
        and (
          (eg.estudiante_id is not null and public.es_acudiente_de(eg.estudiante_id))
          or (
            eg.curso_grado is not null
            and exists (
              select 1
              from public.eventos ev
              join public.estudiantes e
                on e.institucion_id = ev.institucion_id
                and e.curso_grado = eg.curso_grado
              join public.acudiente_estudiante ae on ae.estudiante_id = e.id
              where ev.id = eg.evento_id
                and ae.persona_id = auth.uid()
            )
          )
        )
    )
  );

create policy "staff crea productos en eventos de su institucion"
  on public.productos for insert
  to authenticated
  with check (
    exists (
      select 1 from public.eventos ev
      where ev.id = evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
        and public.institucion_esta_activa(ev.institucion_id)
    )
  );

create policy "staff actualiza productos de su institucion"
  on public.productos for update
  to authenticated
  using (
    exists (
      select 1 from public.eventos ev
      where ev.id = productos.evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
    )
  )
  with check (
    exists (
      select 1 from public.eventos ev
      where ev.id = evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
    )
  );

create policy "staff elimina productos de su institucion"
  on public.productos for delete
  to authenticated
  using (
    exists (
      select 1 from public.eventos ev
      where ev.id = productos.evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
    )
  );


-- 10. registros_pago

create policy "staff ve pagos de su institucion"
  on public.registros_pago for select
  to authenticated
  using (
    exists (
      select 1 from public.eventos ev
      where ev.id = registros_pago.evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
    )
  );

create policy "acudiente ve pagos de sus estudiantes"
  on public.registros_pago for select
  to authenticated
  using (public.es_acudiente_de(estudiante_id));

-- Por ahora, solo pagos en efectivo registrados manualmente por el staff.
-- Los pagos en línea (Fase 2) los insertará una función segura del
-- servidor cuando se integre la pasarela, no directamente el navegador.
create policy "staff registra pagos en su institucion"
  on public.registros_pago for insert
  to authenticated
  with check (
    metodo = 'efectivo'
    and exists (
      select 1 from public.eventos ev
      where ev.id = evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
        and public.institucion_esta_activa(ev.institucion_id)
    )
  );

create policy "staff actualiza pagos de su institucion"
  on public.registros_pago for update
  to authenticated
  using (
    exists (
      select 1 from public.eventos ev
      where ev.id = registros_pago.evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
    )
  )
  with check (
    exists (
      select 1 from public.eventos ev
      where ev.id = evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
    )
  );

create policy "staff elimina pagos de su institucion"
  on public.registros_pago for delete
  to authenticated
  using (
    exists (
      select 1 from public.eventos ev
      where ev.id = registros_pago.evento_id
        and public.tiene_rol_en_institucion(ev.institucion_id, array['admin_institucion','recaudador'])
    )
  );
