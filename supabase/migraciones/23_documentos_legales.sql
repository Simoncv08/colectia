-- Colectia: términos y condiciones y política de privacidad
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema.
--
-- El super administrador publica versiones nuevas desde /admin/legal. Cada versión queda
-- guardada (no se edita ni se borra) y dice si los usuarios deben aceptarla para seguir
-- usando Colectia. Cada aceptación queda registrada con la persona, la versión y la fecha,
-- que es la prueba de la autorización que pide la Ley 1581.


-- 1. Tablas

create table if not exists public.documentos_legales (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('terminos', 'privacidad')),
  version integer not null check (version > 0),
  contenido text not null check (char_length(contenido) between 1 and 200000),
  resumen_cambios text check (resumen_cambios is null or char_length(resumen_cambios) <= 500),
  requiere_aceptacion boolean not null default true,
  publicado_por uuid references public.personas (id) on delete set null,
  publicado_en timestamptz not null default now(),
  unique (tipo, version)
);

-- "aceptado" también guarda el "Entendido" de un cambio menor: en los dos casos la persona ya
-- vio esa versión.
create table if not exists public.aceptaciones_legales (
  persona_id uuid not null references public.personas (id) on delete cascade,
  documento_id uuid not null references public.documentos_legales (id) on delete restrict,
  aceptado_en timestamptz not null default now(),
  primary key (persona_id, documento_id)
);

alter table public.documentos_legales enable row level security;
alter table public.aceptaciones_legales enable row level security;


-- 2. Quién puede ver qué. Nadie escribe directo en las tablas: solo con las funciones de abajo.

-- Los documentos son públicos: se leen en /terminos y /privacidad sin iniciar sesión.
drop policy if exists "documentos legales públicos" on public.documentos_legales;
create policy "documentos legales públicos"
  on public.documentos_legales for select
  to anon, authenticated
  using (true);

drop policy if exists "ver mis aceptaciones" on public.aceptaciones_legales;
create policy "ver mis aceptaciones"
  on public.aceptaciones_legales for select
  to authenticated
  using (persona_id = auth.uid() or public.es_super_admin());

revoke insert, update, delete on public.documentos_legales from anon, authenticated;
revoke insert, update, delete on public.aceptaciones_legales from anon, authenticated;


-- 3. Publicar una versión nueva (solo el super administrador)

create or replace function public.publicar_documento_legal(
  p_tipo text,
  p_contenido text,
  p_resumen text,
  p_requiere_aceptacion boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version integer;
  v_contenido text := btrim(coalesce(p_contenido, ''));
  v_resumen text := nullif(btrim(coalesce(p_resumen, '')), '');
begin
  if not public.es_super_admin() then
    raise exception 'Solo el super administrador puede publicar documentos legales'
      using errcode = '42501';
  end if;
  if p_tipo not in ('terminos', 'privacidad') then
    raise exception 'Tipo de documento no válido' using errcode = '22023';
  end if;
  if v_contenido = '' then
    raise exception 'El documento está vacío' using errcode = '22023';
  end if;

  -- Una sola publicación a la vez por tipo, para que no se repita el número de versión.
  perform pg_advisory_xact_lock(hashtext('documentos_legales:' || p_tipo));

  select coalesce(max(version), 0) + 1 into v_version
  from public.documentos_legales
  where tipo = p_tipo;

  insert into public.documentos_legales (tipo, version, contenido, resumen_cambios, requiere_aceptacion, publicado_por)
  -- La primera versión siempre se acepta: nadie ha aceptado nada todavía.
  values (p_tipo, v_version, v_contenido, v_resumen, coalesce(p_requiere_aceptacion, true) or v_version = 1, auth.uid());

  return v_version;
end;
$$;

revoke all on function public.publicar_documento_legal(text, text, text, boolean) from public, anon;
grant execute on function public.publicar_documento_legal(text, text, text, boolean) to authenticated;


-- 4. Estado de la persona conectada, por tipo de documento
--    bloquea: hay una versión que exige aceptación y la persona no ha aceptado esa ni una más nueva.
--    avisar: hay un cambio menor que la persona todavía no ha visto.

create or replace function public.estado_legal()
returns table (
  tipo text,
  version integer,
  documento_id uuid,
  bloquea boolean,
  avisar boolean,
  resumen_cambios text,
  publicado_en timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with ultimas as (
    select distinct on (d.tipo) d.tipo, d.version, d.id, d.resumen_cambios, d.publicado_en
    from public.documentos_legales d
    order by d.tipo, d.version desc
  ),
  vinculantes as (
    select d.tipo, max(d.version) as version
    from public.documentos_legales d
    where d.requiere_aceptacion
    group by d.tipo
  ),
  aceptadas as (
    select d.tipo, max(d.version) as version
    from public.aceptaciones_legales a
    join public.documentos_legales d on d.id = a.documento_id
    where a.persona_id = auth.uid()
    group by d.tipo
  )
  select
    u.tipo,
    u.version,
    u.id,
    coalesce(v.version > coalesce(a.version, 0), false) as bloquea,
    not coalesce(v.version > coalesce(a.version, 0), false) and u.version > coalesce(a.version, 0) as avisar,
    u.resumen_cambios,
    u.publicado_en
  from ultimas u
  left join vinculantes v on v.tipo = u.tipo
  left join aceptadas a on a.tipo = u.tipo
  where auth.uid() is not null;
$$;

revoke all on function public.estado_legal() from public, anon;
grant execute on function public.estado_legal() to authenticated;


-- 5. Aceptar (o marcar como visto) la versión vigente de cada tipo

create or replace function public.aceptar_documentos_legales(p_tipos text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión' using errcode = '42501';
  end if;

  insert into public.aceptaciones_legales (persona_id, documento_id)
  select auth.uid(), u.id
  from (
    select distinct on (d.tipo) d.id
    from public.documentos_legales d
    where d.tipo = any(p_tipos)
    order by d.tipo, d.version desc
  ) u
  on conflict (persona_id, documento_id) do nothing;
end;
$$;

revoke all on function public.aceptar_documentos_legales(text[]) from public, anon;
grant execute on function public.aceptar_documentos_legales(text[]) to authenticated;
