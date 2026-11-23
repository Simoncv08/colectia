-- Colectia: Grupos de cursos (para dirigir un evento a varios
-- cursos/grados de una sola vez, ej.: "Primaria" = 1A,1B,2A,2B...5A,5B,
-- o "1" = 1A,1B)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Un curso/grado puede estar en más de un grupo a la vez (1A puede
-- pertenecer al grupo "1" y también al grupo "Primaria"). Esto es
-- puramente una ayuda para dirigir eventos más rápido: al elegir un
-- grupo de cursos para un evento, por dentro se agregan filas normales
-- a evento_grupos (una por cada curso/grado del grupo), no se toca ni
-- se necesita cambiar la tabla evento_grupos ni sus políticas de RLS
-- (las que causaban la recursión infinita corregida en
-- fix_recursion_eventos.sql), así que este script no puede reintroducir
-- ese problema.

create table public.grupos_curso (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references public.instituciones (id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (institucion_id, nombre)
);

create index grupos_curso_institucion_id_idx on public.grupos_curso (institucion_id);

alter table public.grupos_curso enable row level security;

drop policy if exists "staff ve grupos de curso de su institucion" on public.grupos_curso;
create policy "staff ve grupos de curso de su institucion"
  on public.grupos_curso for select
  to authenticated
  using (public.tiene_rol_en_institucion(institucion_id, array['admin_institucion','recaudador']));

drop policy if exists "admin_institucion crea grupos de curso" on public.grupos_curso;
create policy "admin_institucion crea grupos de curso"
  on public.grupos_curso for insert
  to authenticated
  with check (
    public.tiene_rol_en_institucion(institucion_id, array['admin_institucion'])
    and public.institucion_esta_activa(institucion_id)
  );

drop policy if exists "admin_institucion elimina grupos de curso" on public.grupos_curso;
create policy "admin_institucion elimina grupos de curso"
  on public.grupos_curso for delete
  to authenticated
  using (public.tiene_rol_en_institucion(institucion_id, array['admin_institucion']));

-- Qué cursos/grados pertenecen a cada grupo.
create table public.grupo_curso_grados (
  id uuid primary key default gen_random_uuid(),
  grupo_curso_id uuid not null references public.grupos_curso (id) on delete cascade,
  grado_id uuid not null references public.grados (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (grupo_curso_id, grado_id)
);

create index grupo_curso_grados_grupo_idx on public.grupo_curso_grados (grupo_curso_id);
create index grupo_curso_grados_grado_idx on public.grupo_curso_grados (grado_id);

alter table public.grupo_curso_grados enable row level security;

drop policy if exists "staff ve los cursos de cada grupo" on public.grupo_curso_grados;
create policy "staff ve los cursos de cada grupo"
  on public.grupo_curso_grados for select
  to authenticated
  using (
    exists (
      select 1 from public.grupos_curso gc
      where gc.id = grupo_curso_grados.grupo_curso_id
        and public.tiene_rol_en_institucion(gc.institucion_id, array['admin_institucion','recaudador'])
    )
  );

drop policy if exists "admin_institucion agrega cursos a un grupo" on public.grupo_curso_grados;
create policy "admin_institucion agrega cursos a un grupo"
  on public.grupo_curso_grados for insert
  to authenticated
  with check (
    exists (
      select 1 from public.grupos_curso gc
      where gc.id = grupo_curso_id
        and public.tiene_rol_en_institucion(gc.institucion_id, array['admin_institucion'])
        and public.institucion_esta_activa(gc.institucion_id)
    )
  );

drop policy if exists "admin_institucion quita cursos de un grupo" on public.grupo_curso_grados;
create policy "admin_institucion quita cursos de un grupo"
  on public.grupo_curso_grados for delete
  to authenticated
  using (
    exists (
      select 1 from public.grupos_curso gc
      where gc.id = grupo_curso_grados.grupo_curso_id
        and public.tiene_rol_en_institucion(gc.institucion_id, array['admin_institucion'])
    )
  );

-- Para poder agregar de una sola vez todos los cursos de un grupo a un
-- evento sin crear filas duplicadas si alguno ya se había agregado a
-- mano antes. Son índices únicos normales (no parciales): en Postgres
-- dos valores NULL nunca se consideran "iguales", así que las filas que
-- solo tienen estudiante_id (con curso_grado en null), o viceversa, no
-- chocan entre ellas de todas formas, y al no ser parciales, Postgres
-- sí los puede usar para resolver un "ON CONFLICT" desde la app. (Si
-- este paso falla diciendo que ya existen valores duplicados, es porque
-- en algún evento de prueba ya quedó el mismo curso/grado o el mismo
-- estudiante agregado dos veces, hay que borrar el duplicado en
-- evento_grupos desde Table Editor y volver a correr este script.)
create unique index if not exists evento_grupos_evento_curso_uidx
  on public.evento_grupos (evento_id, curso_grado);

create unique index if not exists evento_grupos_evento_estudiante_uidx
  on public.evento_grupos (evento_id, estudiante_id);
