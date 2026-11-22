-- Colectia: Catálogo de cursos/grados por institución
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Hasta ahora, cada institución escribía el curso/grado de cada
-- estudiante como texto libre (por ejemplo "5A"), lo cual permite errores
-- de tipeo que hacen que un evento dirigido a "5A" no le llegue a un
-- estudiante guardado como "5 A" o "5a" (son valores distintos para la
-- base de datos). Esta tabla resuelve eso: cada institución arma su
-- propia lista de cursos/grados, y tanto los estudiantes como los
-- eventos eligen de esa misma lista en vez de escribirla a mano.

create table public.grados (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references public.instituciones (id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (institucion_id, nombre)
);

create index grados_institucion_id_idx on public.grados (institucion_id);

alter table public.grados enable row level security;

-- El personal (admin_institucion y recaudador) puede ver los cursos/grados
-- de su institución, los necesitan tanto para agregar estudiantes como
-- para dirigir eventos a un curso completo.
drop policy if exists "staff ve grados de su institucion" on public.grados;
create policy "staff ve grados de su institucion"
  on public.grados for select
  to authenticated
  using (public.tiene_rol_en_institucion(institucion_id, array['admin_institucion','recaudador']));

-- Solo admin_institucion puede crear o eliminar cursos/grados (mismo
-- criterio que para manejar estudiantes), y solo si la institución está
-- activa.
drop policy if exists "admin_institucion crea grados" on public.grados;
create policy "admin_institucion crea grados"
  on public.grados for insert
  to authenticated
  with check (
    public.tiene_rol_en_institucion(institucion_id, array['admin_institucion'])
    and public.institucion_esta_activa(institucion_id)
  );

drop policy if exists "admin_institucion elimina grados" on public.grados;
create policy "admin_institucion elimina grados"
  on public.grados for delete
  to authenticated
  using (public.tiene_rol_en_institucion(institucion_id, array['admin_institucion']));

-- Para que los estudiantes que ya tenías cargados (con curso/grado en
-- texto libre) sigan funcionando sin tener que volver a escribirlos, se
-- crea automáticamente un curso/grado en el catálogo por cada valor
-- distinto que ya estén usando tus estudiantes actuales.
insert into public.grados (institucion_id, nombre)
select distinct institucion_id, curso_grado
from public.estudiantes
where curso_grado is not null and curso_grado <> ''
on conflict (institucion_id, nombre) do nothing;
