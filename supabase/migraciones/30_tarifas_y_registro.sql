-- Colectia: tarifas, registro de colegios y prueba gratis (Fase A, paquetes A9 y A10)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema. Requiere 26, 27 y 28.
--
-- 1. Tramos de estudiantes, precios anuales (siempre con IVA incluido) y descuentos por número
--    de módulos. Son públicos; solo el super administrador los cambia. Los precios no se
--    muestran hasta que él los publique (configuracion_plataforma.precios_publicados).
-- 2. calcular_plan(): el precio sale siempre de la base.
-- 3. Datos del colegio para el registro: NIT (con dígito de verificación, único), ciudad,
--    tramo, contacto, prueba_hasta y pagado_hasta.
-- 4. revisar_registro() (antes de crear la cuenta) y registrar_colegio() (la cuenta ya creada y
--    confirmada queda como administradora; el colegio queda en revisión).
-- 5. Al aprobar la dirección empieza la prueba gratis (7 días por defecto, 3 a 7 por colegio).


-- 1. Tarifas ------------------------------------------------------------------------------

create table if not exists public.tarifa_tramos (
  id smallint primary key,
  desde integer not null check (desde >= 0),
  hasta integer check (hasta is null or hasta >= desde),
  etiqueta text not null
);

insert into public.tarifa_tramos (id, desde, hasta, etiqueta) values
  (1, 0, 300, 'Hasta 300 estudiantes'),
  (2, 301, 500, 'De 301 a 500 estudiantes'),
  (3, 501, 1000, 'De 501 a 1.000 estudiantes'),
  (4, 1001, 1500, 'De 1.001 a 1.500 estudiantes'),
  (5, 1501, null, 'Más de 1.500 estudiantes')
on conflict (id) do nothing;

-- Valor anual con IVA incluido. concepto: 'base' (incluye los módulos siempre activos) o la
-- clave de un módulo opcional.
create table if not exists public.tarifas (
  tramo_id smallint not null references public.tarifa_tramos (id) on delete cascade,
  concepto text not null check (concepto = 'base' or concepto ~ '^[a-z_]{3,40}$'),
  valor_anual numeric(14, 0) not null check (valor_anual >= 0),
  primary key (tramo_id, concepto)
);

insert into public.tarifas (tramo_id, concepto, valor_anual)
select id, 'base', 0 from public.tarifa_tramos
on conflict (tramo_id, concepto) do nothing;

-- Descuento sobre los módulos opcionales según cuántos se elijan.
create table if not exists public.tarifa_descuentos (
  modulos_minimos smallint primary key check (modulos_minimos >= 2),
  porcentaje numeric(5, 2) not null check (porcentaje > 0 and porcentaje <= 90)
);

create table if not exists public.configuracion_plataforma (
  id boolean primary key default true check (id),
  dias_prueba smallint not null default 7 check (dias_prueba between 3 and 7),
  precios_publicados boolean not null default false
);

insert into public.configuracion_plataforma (id) values (true) on conflict (id) do nothing;

do $$
declare
  t text;
begin
  foreach t in array array['tarifa_tramos', 'tarifas', 'tarifa_descuentos', 'configuracion_plataforma'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "todos ven %s" on public.%I', t, t);
    execute format('create policy "todos ven %s" on public.%I for select to anon, authenticated using (true)', t, t);
    execute format('drop policy if exists "super_admin cambia %s" on public.%I', t, t);
    execute format(
      'create policy "super_admin cambia %s" on public.%I for all to authenticated '
      'using (public.es_super_admin()) with check (public.es_super_admin())', t, t);
  end loop;
end;
$$;

-- El catálogo de módulos también es público (para la página de precios y el registro).
drop policy if exists "todos ven el catalogo de modulos" on public.modulos;
create policy "todos ven el catalogo de modulos"
  on public.modulos for select
  to anon
  using (true);


-- 2. Precio del plan ----------------------------------------------------------------------

create or replace function public.calcular_plan(p_tramo smallint, p_modulos text[] default '{}')
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  v_base numeric;
  v_modulos numeric;
  v_cantidad integer;
  v_descuento numeric;
begin
  select valor_anual into v_base from public.tarifas where tramo_id = p_tramo and concepto = 'base';
  if v_base is null then
    raise exception 'Ese tramo de estudiantes no existe.';
  end if;

  -- Solo cuentan los módulos opcionales que ya se pueden usar.
  select coalesce(sum(t.valor_anual), 0), count(*)
  into v_modulos, v_cantidad
  from public.modulos m
  join public.tarifas t on t.concepto = m.clave and t.tramo_id = p_tramo
  where m.clave = any (coalesce(p_modulos, '{}'))
    and m.estado = 'disponible'
    and not m.siempre_activo;

  select coalesce(max(porcentaje), 0) into v_descuento
  from public.tarifa_descuentos where modulos_minimos <= v_cantidad;

  return round(v_base + v_modulos * (1 - v_descuento / 100));
end;
$$;

grant execute on function public.calcular_plan(smallint, text[]) to anon, authenticated;


-- 3. Datos del colegio --------------------------------------------------------------------

-- NIT colombiano: número de 6 a 15 dígitos y dígito de verificación de la DIAN.
create or replace function public.nit_valido(p_nit text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_numero text;
  v_dv integer;
  v_pesos integer[] := array[3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  v_suma integer := 0;
  v_resto integer;
  i integer;
begin
  if p_nit is null or p_nit !~ '^[0-9]{6,15}-[0-9]$' then
    return false;
  end if;
  v_numero := split_part(p_nit, '-', 1);
  v_dv := split_part(p_nit, '-', 2)::integer;
  for i in 1 .. length(v_numero) loop
    v_suma := v_suma + substr(v_numero, length(v_numero) - i + 1, 1)::integer * v_pesos[i];
  end loop;
  v_resto := v_suma % 11;
  return v_dv = case when v_resto >= 2 then 11 - v_resto else v_resto end;
end;
$$;

-- "900.123.456-7", "900123456 7" → "900123456-7"; lo que no se pueda leer queda tal cual.
create or replace function public.normalizar_nit(p_nit text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when regexp_replace(coalesce(p_nit, ''), '[^0-9]', '', 'g') ~ '^[0-9]{7,16}$'
      then left(regexp_replace(p_nit, '[^0-9]', '', 'g'), -1) || '-' || right(regexp_replace(p_nit, '[^0-9]', '', 'g'), 1)
    else btrim(coalesce(p_nit, ''))
  end;
$$;

alter table public.instituciones
  add column if not exists nit text,
  add column if not exists ciudad text,
  add column if not exists tramo_id smallint references public.tarifa_tramos (id),
  add column if not exists contacto_cargo text,
  add column if not exists contacto_telefono text,
  add column if not exists prueba_hasta date,
  add column if not exists pagado_hasta date;

alter table public.instituciones drop constraint if exists instituciones_nit_valido;
alter table public.instituciones add constraint instituciones_nit_valido check (nit is null or public.nit_valido(nit));

create unique index if not exists instituciones_nit_uidx on public.instituciones (nit) where nit is not null;


-- 4. Registro de colegios -----------------------------------------------------------------

-- Antes de crear la cuenta: el formulario avisa de una vez si el NIT o la dirección no sirven.
create or replace function public.revisar_registro(p_nit text, p_subdominio text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_nit text := public.normalizar_nit(p_nit);
  v_sub text := public.normalizar_subdominio(p_subdominio);
begin
  if not public.nit_valido(v_nit) then
    return 'nit_invalido';
  end if;
  if exists (select 1 from public.instituciones where nit = v_nit) then
    return 'nit_registrado';
  end if;
  begin
    perform public.revisar_subdominio(v_sub, null);
  exception when others then
    return 'subdominio_no_disponible';
  end;
  return 'ok';
end;
$$;

revoke execute on function public.revisar_registro(text, text) from public;
grant execute on function public.revisar_registro(text, text) to anon, authenticated;

-- La cuenta que llama (con el correo confirmado y sin colegio) queda como administradora del
-- colegio nuevo, que queda "en prueba" con la dirección propuesta. La prueba empieza al aprobar.
create or replace function public.registrar_colegio(
  p_nombre text,
  p_nit text,
  p_ciudad text,
  p_tramo smallint,
  p_subdominio text,
  p_nombres text,
  p_apellidos text,
  p_cargo text,
  p_telefono text,
  p_modulos text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_persona uuid := auth.uid();
  v_nombre text := nullif(btrim(coalesce(p_nombre, '')), '');
  v_nit text := public.normalizar_nit(p_nit);
  v_sub text := public.normalizar_subdominio(p_subdominio);
  v_prefijo text;
  v_institucion uuid;
  i integer := 1;
begin
  if v_persona is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if not exists (select 1 from auth.users where id = v_persona and email_confirmed_at is not null) then
    raise exception 'Primero confirma tu correo con el enlace que te enviamos.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('registrar_colegio:' || v_persona::text, 0));

  if exists (select 1 from public.membresias where persona_id = v_persona)
     or exists (select 1 from public.personas where id = v_persona and institucion_id is not null) then
    raise exception 'Tu cuenta ya es de un colegio en Colectia. Para registrar otro, usa otro correo.';
  end if;

  if v_nombre is null or length(v_nombre) > 150 then
    raise exception 'Escribe el nombre del colegio.';
  end if;
  if nullif(btrim(coalesce(p_ciudad, '')), '') is null then
    raise exception 'Escribe la ciudad del colegio.';
  end if;
  if not exists (select 1 from public.tarifa_tramos where id = p_tramo) then
    raise exception 'Elige el número de estudiantes del colegio.';
  end if;
  if not public.nit_valido(v_nit) then
    raise exception 'Revisa el NIT: debe tener el número y el dígito de verificación (ej.: 900123456-8).';
  end if;
  if exists (select 1 from public.instituciones where nit = v_nit) then
    raise exception 'Ese colegio ya está en Colectia; escríbenos si es un error.';
  end if;
  perform public.revisar_subdominio(v_sub, null);

  -- prefijo_codigo es obligatorio y único: sale de la dirección.
  v_prefijo := upper(left(replace(v_sub, '-', ''), 10));
  while exists (select 1 from public.instituciones where prefijo_codigo = v_prefijo) loop
    i := i + 1;
    v_prefijo := upper(left(replace(v_sub, '-', ''), 8)) || i;
  end loop;

  insert into public.instituciones
    (nombre, prefijo_codigo, estado, nit, ciudad, tramo_id, contacto_cargo, contacto_telefono,
     subdominio, subdominio_estado)
  values
    (v_nombre, v_prefijo, 'en_prueba', v_nit, btrim(p_ciudad), p_tramo,
     nullif(btrim(coalesce(p_cargo, '')), ''), nullif(btrim(coalesce(p_telefono, '')), ''),
     v_sub, 'propuesto')
  returning id into v_institucion;

  update public.personas
  set nombres = coalesce(nullif(btrim(coalesce(p_nombres, '')), ''), nombres),
      apellidos = coalesce(nullif(btrim(coalesce(p_apellidos, '')), ''), apellidos),
      telefono = coalesce(nullif(btrim(coalesce(p_telefono, '')), ''), telefono)
  where id = v_persona;

  -- La membresía de administrador une la cuenta al colegio (membresias_una_institucion).
  insert into public.membresias (persona_id, institucion_id, rol)
  values (v_persona, v_institucion, 'admin_institucion');

  insert into public.institucion_modulos (institucion_id, modulo, activo)
  select v_institucion, m.clave, true
  from public.modulos m
  where m.clave = any (coalesce(p_modulos, '{}')) and m.estado = 'disponible' and not m.siempre_activo
  on conflict do nothing;

  insert into public.modulo_interes (institucion_id, modulo, pedido_por)
  select v_institucion, m.clave, v_persona
  from public.modulos m
  where m.clave = any (coalesce(p_modulos, '{}')) and m.estado = 'proximamente'
  on conflict do nothing;

  perform public.actividad_anotar(v_institucion, 'institucion', 'registrar_colegio',
    format('Registró el colegio %s', v_nombre), jsonb_build_object('nit', v_nit, 'subdominio', v_sub));

  return v_institucion;
end;
$$;

revoke execute on function public.registrar_colegio(text, text, text, smallint, text, text, text, text, text, text[]) from public, anon;
grant execute on function public.registrar_colegio(text, text, text, smallint, text, text, text, text, text, text[]) to authenticated;

-- revisar_subdominio ahora acepta una institución nula (colegio que todavía no existe).
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
  if exists (
       select 1 from public.instituciones
       where subdominio = p_subdominio and id is distinct from p_institucion_id
     )
     or exists (
       select 1 from public.subdominios_reservados r
       where r.subdominio = p_subdominio
         and not (r.motivo = 'anterior' and r.institucion_id is not distinct from p_institucion_id)
     ) then
    raise exception 'Ese subdominio no está disponible. Prueba con otro.';
  end if;
end;
$$;

revoke execute on function public.revisar_subdominio(text, uuid) from public, anon, authenticated;


-- 5. Prueba gratis ------------------------------------------------------------------------

-- Igual que en la migración 26, y además: al aprobar la primera vez un colegio en prueba,
-- empieza su prueba gratis.
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
      subdominio_decidido_en = now(),
      prueba_hasta = case
        when estado = 'en_prueba' and prueba_hasta is null
          then current_date + (select dias_prueba from public.configuracion_plataforma)
        else prueba_hasta
      end
  where id = p_institucion_id;

  perform public.actividad_anotar(p_institucion_id, 'institucion', 'aprobar_subdominio',
    format('Se aprobó el subdominio %s', v_nuevo), jsonb_build_object('subdominio', v_nuevo));
end;
$$;

revoke execute on function public.aprobar_subdominio(uuid, text) from public, anon;
grant execute on function public.aprobar_subdominio(uuid, text) to authenticated;

-- El super administrador cambia la prueba de un colegio entre 3 y 7 días, contados desde la
-- aprobación de su dirección.
create or replace function public.ajustar_prueba(p_institucion_id uuid, p_dias smallint)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst public.instituciones%rowtype;
  v_hasta date;
begin
  if not public.es_super_admin() then
    raise exception 'Solo el super administrador puede cambiar la prueba.' using errcode = '42501';
  end if;
  if p_dias is null or p_dias not between 3 and 7 then
    raise exception 'La prueba debe ser de 3 a 7 días.';
  end if;

  select * into v_inst from public.instituciones where id = p_institucion_id for update;
  if v_inst.estado <> 'en_prueba' or v_inst.subdominio_estado <> 'aprobado' then
    raise exception 'Solo se ajusta la prueba de un colegio en prueba con la dirección aprobada.';
  end if;

  v_hasta := v_inst.subdominio_decidido_en::date + p_dias;
  update public.instituciones set prueba_hasta = v_hasta where id = p_institucion_id;
  return v_hasta;
end;
$$;

revoke execute on function public.ajustar_prueba(uuid, smallint) from public, anon;
grant execute on function public.ajustar_prueba(uuid, smallint) to authenticated;
