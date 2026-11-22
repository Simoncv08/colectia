-- Colectia: Corrige "infinite recursion detected in policy for
-- relation eventos"
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Causa: la política de "eventos" que decide qué evento puede ver un
-- acudiente consultaba directamente la tabla evento_grupos, y las
-- políticas de evento_grupos a su vez consultan eventos, como las dos
-- tablas tienen RLS activado, Postgres vuelve a evaluar las políticas
-- de la otra tabla en cada consulta anidada, y termina en un ciclo
-- infinito (eventos → evento_grupos → eventos → ...). Esto pasaba para
-- cualquier persona que consultara eventos o evento_grupos, no solo
-- para acudientes, por eso tampoco le aparecían los eventos a Laura
-- como admin_institucion.
--
-- La solución es el mismo patrón que ya se usa en
-- institucion_esta_activa y es_acudiente_de: mover la lógica a una
-- función "security definer", que por dentro consulta las tablas sin
-- volver a pasar por sus propias políticas de RLS, rompiendo el ciclo.

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
    join public.acudiente_estudiante ae on ae.estudiante_id = eg.estudiante_id
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

revoke execute on function public.evento_visible_para_acudiente(uuid) from public;
grant execute on function public.evento_visible_para_acudiente(uuid) to authenticated;

drop policy if exists "acudiente ve eventos dirigidos a sus estudiantes" on public.eventos;
create policy "acudiente ve eventos dirigidos a sus estudiantes"
  on public.eventos for select
  to authenticated
  using (public.evento_visible_para_acudiente(id));
