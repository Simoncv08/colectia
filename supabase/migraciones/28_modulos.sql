-- Colectia: módulos por colegio (Fase A, paquete A6)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema.
--
-- 1. modulos: el catálogo. 'disponible' se puede usar; 'proximamente' solo se anuncia.
--    Eventos está siempre activo (por ahora es el único módulo).
-- 2. institucion_modulos: qué módulos opcionales encendió cada colegio. Apagar uno oculta su
--    información; desactivado_en queda para borrarla pasado un plazo (se definirá cuando haya
--    un segundo módulo).
-- 3. modulo_activo(): para RLS y el servidor. cambiar_modulo(): solo el administrador del colegio.


-- 1. Catálogo -----------------------------------------------------------------------------

create table if not exists public.modulos (
  clave text primary key check (clave ~ '^[a-z_]{3,40}$'),
  nombre text not null,
  descripcion text not null,
  estado text not null check (estado in ('disponible', 'proximamente')),
  siempre_activo boolean not null default false,
  orden integer not null default 0
);

alter table public.modulos enable row level security;

drop policy if exists "cualquier cuenta ve el catalogo de modulos" on public.modulos;
create policy "cualquier cuenta ve el catalogo de modulos"
  on public.modulos for select
  to authenticated
  using (true);

insert into public.modulos (clave, nombre, descripcion, estado, siempre_activo, orden) values
  ('eventos', 'Eventos y pagos',
   'Salidas, eventos y celebraciones con sus productos, cobro por salón, pagos en efectivo y reportes.',
   'disponible', true, 1),
  ('extracurriculares', 'Inscripción a extracurriculares',
   'Las familias inscriben a sus estudiantes en cursos y actividades extracurriculares, con cupos.',
   'proximamente', false, 2),
  ('tienda', 'Tienda escolar',
   'Uniformes, útiles y otros productos del colegio, con pedidos de las familias.',
   'proximamente', false, 3),
  ('comunicados', 'Comunicados y circulares',
   'Mensajes del colegio a las familias por curso, con confirmación de lectura.',
   'proximamente', false, 4)
-- Si se vuelve a correr, no pisa cambios posteriores del catálogo (un módulo que ya salió).
on conflict (clave) do nothing;


-- 2. Módulos de cada colegio ---------------------------------------------------------------

create table if not exists public.institucion_modulos (
  institucion_id uuid not null references public.instituciones (id) on delete cascade,
  modulo text not null references public.modulos (clave) on delete cascade,
  activo boolean not null default true,
  cambiado_en timestamptz not null default now(),
  desactivado_en timestamptz,
  primary key (institucion_id, modulo)
);

alter table public.institucion_modulos enable row level security;

drop policy if exists "personal ve los modulos de su colegio" on public.institucion_modulos;
create policy "personal ve los modulos de su colegio"
  on public.institucion_modulos for select
  to authenticated
  using (
    public.es_super_admin()
    or public.tiene_rol_en_institucion(institucion_id, array['admin_institucion', 'recaudador'])
  );


-- 3. Funciones ----------------------------------------------------------------------------

create or replace function public.modulo_activo(p_institucion_id uuid, p_modulo text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.modulos m
    where m.clave = p_modulo
      and m.estado = 'disponible'
      and (
        m.siempre_activo
        or exists (
          select 1 from public.institucion_modulos im
          where im.institucion_id = p_institucion_id and im.modulo = p_modulo and im.activo
        )
      )
  );
$$;

revoke execute on function public.modulo_activo(uuid, text) from public, anon;
grant execute on function public.modulo_activo(uuid, text) to authenticated;

create or replace function public.cambiar_modulo(p_institucion_id uuid, p_modulo text, p_activo boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_modulo public.modulos%rowtype;
begin
  if not public.tiene_rol_en_institucion(p_institucion_id, array['admin_institucion']) then
    raise exception 'Solo el administrador del colegio puede cambiar los módulos.' using errcode = '42501';
  end if;
  if not public.institucion_esta_activa(p_institucion_id) then
    raise exception 'La institución no está activa: solo se puede consultar la información.';
  end if;

  select * into v_modulo from public.modulos where clave = p_modulo;
  if not found or v_modulo.estado <> 'disponible' then
    raise exception 'Ese módulo todavía no está disponible.';
  end if;
  if v_modulo.siempre_activo then
    raise exception 'El módulo % viene incluido y no se puede apagar.', v_modulo.nombre;
  end if;

  insert into public.institucion_modulos (institucion_id, modulo, activo, cambiado_en, desactivado_en)
  values (p_institucion_id, p_modulo, p_activo, now(), case when p_activo then null else now() end)
  on conflict (institucion_id, modulo) do update
    set activo = excluded.activo,
        cambiado_en = excluded.cambiado_en,
        desactivado_en = excluded.desactivado_en;

  perform public.actividad_anotar(p_institucion_id, 'institucion',
    case when p_activo then 'activar_modulo' else 'desactivar_modulo' end,
    format('%s el módulo %s', case when p_activo then 'Activó' else 'Desactivó' end, v_modulo.nombre),
    jsonb_build_object('modulo', p_modulo));
end;
$$;

revoke execute on function public.cambiar_modulo(uuid, text, boolean) from public, anon;
grant execute on function public.cambiar_modulo(uuid, text, boolean) to authenticated;
