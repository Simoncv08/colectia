-- Colectia: subdominio de cada colegio (Fase A, paquete A1)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema.
--
-- 1. Cada institución tiene un subdominio (lcp.colectia.co): el administrador del colegio lo
--    propone y el super administrador lo aprueba o lo rechaza con un motivo.
-- 2. Nombres reservados: los del sistema y los que un colegio dejó de usar. Un subdominio
--    anterior nunca se le asigna a otro colegio (evita que alguien se haga pasar por él) y
--    redirige al nuevo durante 90 días.
-- 3. colegio_publico(): lo que el proxy necesita saber de un subdominio antes de iniciar sesión.
--    Es la única función security definer que puede ejecutar anon.


-- 1. Columnas ---------------------------------------------------------------------------

alter table public.instituciones
  add column if not exists subdominio text,
  add column if not exists subdominio_estado text,
  add column if not exists subdominio_motivo text,
  add column if not exists subdominio_decidido_en timestamptz;

alter table public.instituciones drop constraint if exists instituciones_subdominio_formato;
alter table public.instituciones add constraint instituciones_subdominio_formato check (
  subdominio is null
  or (subdominio ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' and position('--' in subdominio) = 0)
);

alter table public.instituciones drop constraint if exists instituciones_subdominio_estado_valido;
alter table public.instituciones add constraint instituciones_subdominio_estado_valido check (
  (subdominio is null and subdominio_estado is null)
  or (subdominio is not null and subdominio_estado in ('propuesto', 'aprobado', 'rechazado'))
);

create unique index if not exists instituciones_subdominio_uidx
  on public.instituciones (subdominio) where subdominio is not null;


-- 2. Reservados ---------------------------------------------------------------------------

create table if not exists public.subdominios_reservados (
  subdominio text primary key,
  motivo text not null check (motivo in ('sistema', 'anterior')),
  -- Solo para 'anterior': de qué colegio era y hasta cuándo redirige al subdominio nuevo.
  institucion_id uuid references public.instituciones (id) on delete cascade,
  redirige_hasta timestamptz,
  creado_en timestamptz not null default now(),
  check ((motivo = 'sistema') = (institucion_id is null))
);

alter table public.subdominios_reservados enable row level security;

drop policy if exists "super_admin ve subdominios reservados" on public.subdominios_reservados;
create policy "super_admin ve subdominios reservados"
  on public.subdominios_reservados for select
  to authenticated
  using (public.es_super_admin());

insert into public.subdominios_reservados (subdominio, motivo)
select s, 'sistema'
from unnest(array[
  'www', 'admin', 'api', 'auth', 'app', 'mail', 'correo', 'smtp', 'soporte', 'ayuda', 'status',
  'estado', 'pagos', 'pago', 'demo', 'docs', 'blog', 'colectia', 'static', 'cdn', 'assets',
  'registro', 'precios', 'login', 'entrar', 'cuenta', 'test', 'staging', 'dev', 'preview',
  'beta', 'wompi', 'billing', 'facturacion'
]) as s
on conflict (subdominio) do nothing;


-- 3. Validación (cualquier escritura, también la del super admin directo en la tabla) -------

create or replace function public.validar_subdominio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.subdominio is not null
     and new.subdominio is distinct from old.subdominio
     and exists (
       select 1 from public.subdominios_reservados r
       where r.subdominio = new.subdominio
         and not (r.motivo = 'anterior' and r.institucion_id = new.id)
     ) then
    raise exception 'Ese subdominio no está disponible. Prueba con otro.';
  end if;
  return new;
end;
$$;

revoke execute on function public.validar_subdominio() from public, anon, authenticated;

drop trigger if exists validar_subdominio on public.instituciones;
create trigger validar_subdominio before insert or update of subdominio on public.instituciones
  for each row execute function public.validar_subdominio();


-- 4. Funciones ----------------------------------------------------------------------------

-- Minúsculas y sin espacios; el formato lo revisa la restricción de la tabla.
create or replace function public.normalizar_subdominio(p_subdominio text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(lower(btrim(coalesce(p_subdominio, ''))), '');
$$;

-- Mensaje claro antes de escribir: formato, reservado o en uso por otro colegio.
create or replace function public.revisar_subdominio(p_subdominio text, p_institucion_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_subdominio is null
     or p_subdominio !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'
     or position('--' in p_subdominio) > 0 then
    raise exception 'El subdominio debe tener de 3 a 30 caracteres: letras sin tildes, números y guiones (sin empezar ni terminar en guion).';
  end if;
  if exists (select 1 from public.instituciones where subdominio = p_subdominio and id <> p_institucion_id)
     or exists (
       select 1 from public.subdominios_reservados r
       where r.subdominio = p_subdominio
         and not (r.motivo = 'anterior' and r.institucion_id = p_institucion_id)
     ) then
    raise exception 'Ese subdominio no está disponible. Prueba con otro.';
  end if;
end;
$$;

revoke execute on function public.revisar_subdominio(text, uuid) from public, anon, authenticated;

-- El administrador del colegio propone (o corrige su propuesta). Uno aprobado solo lo cambia
-- el super administrador.
create or replace function public.proponer_subdominio(p_institucion_id uuid, p_subdominio text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nuevo text := public.normalizar_subdominio(p_subdominio);
  v_inst public.instituciones%rowtype;
begin
  if not public.tiene_rol_en_institucion(p_institucion_id, array['admin_institucion']) then
    raise exception 'Solo el administrador del colegio puede proponer el subdominio.'
      using errcode = '42501';
  end if;

  select * into v_inst from public.instituciones where id = p_institucion_id for update;
  if v_inst.estado = 'cancelada' then
    raise exception 'La institución está cancelada.';
  end if;
  if v_inst.subdominio_estado = 'aprobado' then
    raise exception 'El subdominio ya está aprobado. Para cambiarlo, escribe a soporte.';
  end if;

  perform public.revisar_subdominio(v_nuevo, p_institucion_id);

  update public.instituciones
  set subdominio = v_nuevo,
      subdominio_estado = 'propuesto',
      subdominio_motivo = null,
      subdominio_decidido_en = null
  where id = p_institucion_id;

  perform public.actividad_anotar(p_institucion_id, 'institucion', 'proponer_subdominio',
    format('Propuso el subdominio %s', v_nuevo), jsonb_build_object('subdominio', v_nuevo));
end;
$$;

revoke execute on function public.proponer_subdominio(uuid, text) from public, anon;
grant execute on function public.proponer_subdominio(uuid, text) to authenticated;

-- El super administrador aprueba el propuesto o asigna uno (colegios que ya existían, o un
-- cambio excepcional). Si el colegio ya tenía otro aprobado, ese queda reservado para él y
-- redirige al nuevo durante 90 días.
create or replace function public.aprobar_subdominio(p_institucion_id uuid, p_subdominio text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst public.instituciones%rowtype;
  v_nuevo text;
begin
  if not public.es_super_admin() then
    raise exception 'Solo el super administrador puede aprobar subdominios.' using errcode = '42501';
  end if;

  select * into v_inst from public.instituciones where id = p_institucion_id for update;
  if not found then
    raise exception 'La institución no existe.';
  end if;

  v_nuevo := coalesce(public.normalizar_subdominio(p_subdominio), v_inst.subdominio);
  perform public.revisar_subdominio(v_nuevo, p_institucion_id);

  if v_inst.subdominio_estado = 'aprobado' and v_inst.subdominio <> v_nuevo then
    insert into public.subdominios_reservados (subdominio, motivo, institucion_id, redirige_hasta)
    values (v_inst.subdominio, 'anterior', p_institucion_id, now() + interval '90 days')
    on conflict (subdominio) do update
      set redirige_hasta = excluded.redirige_hasta;
  end if;

  update public.instituciones
  set subdominio = v_nuevo,
      subdominio_estado = 'aprobado',
      subdominio_motivo = null,
      subdominio_decidido_en = now()
  where id = p_institucion_id;

  perform public.actividad_anotar(p_institucion_id, 'institucion', 'aprobar_subdominio',
    format('Se aprobó el subdominio %s', v_nuevo), jsonb_build_object('subdominio', v_nuevo));
end;
$$;

revoke execute on function public.aprobar_subdominio(uuid, text) from public, anon;
grant execute on function public.aprobar_subdominio(uuid, text) to authenticated;

create or replace function public.rechazar_subdominio(p_institucion_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_inst public.instituciones%rowtype;
begin
  if not public.es_super_admin() then
    raise exception 'Solo el super administrador puede rechazar subdominios.' using errcode = '42501';
  end if;
  if v_motivo is null or length(v_motivo) > 300 then
    raise exception 'Escribe el motivo del rechazo (máximo 300 caracteres); el colegio lo verá.';
  end if;

  select * into v_inst from public.instituciones where id = p_institucion_id for update;
  if v_inst.subdominio_estado is distinct from 'propuesto' then
    raise exception 'Solo se puede rechazar un subdominio propuesto.';
  end if;

  update public.instituciones
  set subdominio_estado = 'rechazado',
      subdominio_motivo = v_motivo,
      subdominio_decidido_en = now()
  where id = p_institucion_id;

  perform public.actividad_anotar(p_institucion_id, 'institucion', 'rechazar_subdominio',
    format('Se rechazó el subdominio %s', v_inst.subdominio),
    jsonb_build_object('subdominio', v_inst.subdominio, 'motivo', v_motivo));
end;
$$;

revoke execute on function public.rechazar_subdominio(uuid, text) from public, anon;
grant execute on function public.rechazar_subdominio(uuid, text) to authenticated;

-- Para el proxy, antes de iniciar sesión: el colegio de un subdominio aprobado y no cancelado,
-- o a qué subdominio redirigir si es uno anterior todavía vigente. Sin filas: 404.
-- Solo devuelve lo que se muestra en la página de entrada del colegio.
create or replace function public.colegio_publico(p_subdominio text)
returns table (
  id uuid,
  nombre text,
  subdominio text,
  estado text,
  paleta text,
  fondo text,
  redirigir_a text
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.nombre, i.subdominio, i.estado, i.paleta, i.fondo, null::text
  from public.instituciones i
  where i.subdominio = public.normalizar_subdominio(p_subdominio)
    and i.subdominio_estado = 'aprobado'
    and i.estado <> 'cancelada'
  union all
  select i.id, i.nombre, i.subdominio, i.estado, i.paleta, i.fondo, i.subdominio
  from public.subdominios_reservados r
  join public.instituciones i on i.id = r.institucion_id
  where r.subdominio = public.normalizar_subdominio(p_subdominio)
    and r.motivo = 'anterior'
    and r.redirige_hasta > now()
    and i.subdominio_estado = 'aprobado'
    and i.estado <> 'cancelada'
  limit 1;
$$;

revoke execute on function public.colegio_publico(text) from public;
grant execute on function public.colegio_publico(text) to anon, authenticated;
