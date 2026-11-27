-- Colectia: correos del sistema, tarea diaria y pago anual manual (Fase A, paquete A10)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema. Requiere 30_tarifas_y_registro.sql.
--
-- ANTES, una sola vez y solo tú (nunca en el chat): crea en Resend una API key con permiso
-- "Sending access" limitada al dominio colectia.co y guárdala en el Vault de Supabase:
--   select vault.create_secret('re_…tu_llave…', 'resend_api_key', 'Envío de correos de Colectia');
-- Sin esa llave, los correos se anotan en correos_enviados como "sin_llave" y no salen.
--
-- 1. enviar_correo(): envía con la API de Resend desde la base (pg_net), con la llave del Vault.
-- 2. Aviso a soporte@colectia.co cuando un colegio propone su dirección (registro nuevo o cambio).
-- 3. registrar_pago_anual(): el super admin deja un colegio activo un año (mientras llega Wompi).
-- 4. tarea_diaria() a las 6:00 a. m. de Colombia: avisos de fin de prueba, suspensión al terminar
--    la prueba o el año pagado, aviso del borrado y borrado (3 días después de la prueba, 30 si
--    ya había pagado). Una suspensión hecha a mano por el super admin nunca se borra sola.
-- 5. Un colegio en prueba usa todo como uno activo (antes "en_prueba" era solo lectura).

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;


-- 1. Envío ---------------------------------------------------------------------------------

create table if not exists public.correos_enviados (
  id bigint generated always as identity primary key,
  institucion_id uuid references public.instituciones (id) on delete set null,
  tipo text not null,
  para text[] not null,
  asunto text not null,
  estado text not null check (estado in ('enviado', 'sin_llave')),
  solicitud_id bigint,
  creado_en timestamptz not null default now()
);

alter table public.correos_enviados enable row level security;

drop policy if exists "super_admin ve los correos enviados" on public.correos_enviados;
create policy "super_admin ve los correos enviados"
  on public.correos_enviados for select
  to authenticated
  using (public.es_super_admin());

create index if not exists correos_enviados_institucion_tipo_idx
  on public.correos_enviados (institucion_id, tipo, creado_en);

create or replace function public.escapar_html(p_texto text)
returns text
language sql
immutable
set search_path = public
as $$
  select replace(replace(replace(replace(replace(coalesce(p_texto, ''),
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;

-- El mismo marco de las plantillas de Supabase (supabase/correos). p_parrafos ya viene escapado.
create or replace function public.plantilla_correo(
  p_titulo text,
  p_parrafos text[],
  p_boton text default null,
  p_url text default null
)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_cuerpo text := '';
  p text;
begin
  foreach p in array p_parrafos loop
    v_cuerpo := v_cuerpo || '<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#344054;">' || p || '</p>';
  end loop;
  if p_boton is not null and p_url is not null then
    v_cuerpo := v_cuerpo
      || '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr>'
      || '<td style="border-radius:10px;background:#14213d;"><a href="' || public.escapar_html(p_url)
      || '" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;'
      || 'text-decoration:none;border-radius:10px;">' || public.escapar_html(p_boton) || '</a></td></tr></table>';
  end if;
  return '<!DOCTYPE html><html lang="es-CO"><head><meta charset="utf-8"></head>'
    || '<body style="margin:0;padding:0;background:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;"><tr>'
    || '<td align="center" style="padding:32px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">'
    || '<tr><td style="padding:0 0 16px;"><img src="https://www.colectia.co/colectia-abeja-correo.png" width="28" height="28" alt="" '
    || 'style="display:inline-block;width:28px;height:28px;border:0;vertical-align:middle;">'
    || '<span style="font-size:18px;font-weight:700;color:#0f172a;vertical-align:middle;">&nbsp;Colectia</span></td></tr>'
    || '<tr><td style="background:#ffffff;border:1px solid #e4e7ec;border-radius:16px;padding:32px 24px;">'
    || '<h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:700;color:#0f172a;">' || public.escapar_html(p_titulo) || '</h1>'
    || v_cuerpo
    || '<p style="margin:0;font-size:13px;line-height:20px;color:#475467;">¿Necesitas ayuda? Escríbenos a '
    || '<a href="mailto:soporte@colectia.co" style="color:#1d4ed8;">soporte@colectia.co</a>.</p>'
    || '</td></tr></table></td></tr></table></body></html>';
end;
$$;

-- Hasta 100 destinatarios por envío, cada uno en su propio correo (Resend /emails/batch).
create or replace function public.enviar_correo(
  p_institucion_id uuid,
  p_tipo text,
  p_para text[],
  p_asunto text,
  p_html text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_llave text;
  v_lote text[];
  v_solicitud bigint;
  i integer := 1;
begin
  if p_para is null or cardinality(p_para) = 0 then
    return;
  end if;

  select decrypted_secret into v_llave from vault.decrypted_secrets where name = 'resend_api_key' limit 1;

  while i <= cardinality(p_para) loop
    v_lote := p_para[i:i + 99];
    v_solicitud := null;
    if v_llave is not null then
      select net.http_post(
        url := 'https://api.resend.com/emails/batch',
        headers := jsonb_build_object('Authorization', 'Bearer ' || v_llave, 'Content-Type', 'application/json'),
        body := (
          select jsonb_agg(jsonb_build_object(
            'from', 'Colectia <no-responder@colectia.co>',
            'reply_to', 'soporte@colectia.co',
            'to', jsonb_build_array(d),
            'subject', p_asunto,
            'html', p_html))
          from unnest(v_lote) as d
        )
      ) into v_solicitud;
    end if;
    insert into public.correos_enviados (institucion_id, tipo, para, asunto, estado, solicitud_id)
    values (p_institucion_id, p_tipo, v_lote, p_asunto,
            case when v_llave is null then 'sin_llave' else 'enviado' end, v_solicitud);
    i := i + 100;
  end loop;
end;
$$;

revoke execute on function public.enviar_correo(uuid, text, text[], text, text) from public, anon, authenticated;

-- Correos de los administradores de un colegio.
create or replace function public.correos_administradores(p_institucion_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct lower(u.email)), '{}')
  from public.membresias m
  join auth.users u on u.id = m.persona_id
  where m.institucion_id = p_institucion_id and m.rol = 'admin_institucion' and u.email is not null;
$$;

revoke execute on function public.correos_administradores(uuid) from public, anon, authenticated;


-- 2. Aviso de direcciones propuestas -----------------------------------------------------

create or replace function public.avisar_direccion_propuesta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.subdominio_estado = 'propuesto'
     and (tg_op = 'INSERT' or old.subdominio is distinct from new.subdominio
          or old.subdominio_estado is distinct from 'propuesto') then
    perform public.enviar_correo(new.id, 'direccion_propuesta', array['soporte@colectia.co'],
      format('Colegio por aprobar: %s', new.nombre),
      public.plantilla_correo(
        'Hay una dirección por aprobar',
        array[
          format('<strong>%s</strong> (NIT %s, %s) propone la dirección <strong>%s.colectia.co</strong>.',
                 public.escapar_html(new.nombre), public.escapar_html(coalesce(new.nit, 'sin NIT')),
                 public.escapar_html(coalesce(new.ciudad, 'sin ciudad')), public.escapar_html(new.subdominio)),
          'Apruébala o recházala con un motivo desde tu panel.'
        ],
        'Ir al panel', 'https://admin.colectia.co/inicio'));
  end if;
  return new;
end;
$$;

revoke execute on function public.avisar_direccion_propuesta() from public, anon, authenticated;

drop trigger if exists avisar_direccion_propuesta on public.instituciones;
create trigger avisar_direccion_propuesta after insert or update of subdominio, subdominio_estado on public.instituciones
  for each row execute function public.avisar_direccion_propuesta();


-- 3. Suspensión automática y pago anual -------------------------------------------------

-- borrar_el solo lo pone la tarea diaria; cualquier otro estado lo quita.
alter table public.instituciones
  add column if not exists suspendida_desde date,
  add column if not exists borrar_el date;

create or replace function public.limpiar_borrado_programado()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.estado <> 'suspendida' then
    new.borrar_el := null;
    new.suspendida_desde := null;
  end if;
  return new;
end;
$$;

drop trigger if exists limpiar_borrado_programado on public.instituciones;
create trigger limpiar_borrado_programado before update of estado on public.instituciones
  for each row execute function public.limpiar_borrado_programado();

create or replace function public.registrar_pago_anual(p_institucion_id uuid)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hasta date;
begin
  if not public.es_super_admin() then
    raise exception 'Solo el super administrador puede registrar pagos.' using errcode = '42501';
  end if;

  update public.instituciones
  set pagado_hasta = greatest(coalesce(pagado_hasta, current_date), current_date) + interval '1 year',
      estado = 'activa'
  where id = p_institucion_id and estado <> 'cancelada'
  returning pagado_hasta into v_hasta;

  if v_hasta is null then
    raise exception 'Esa institución no existe o está cancelada.';
  end if;

  perform public.actividad_anotar(p_institucion_id, 'institucion', 'registrar_pago_anual',
    format('Se registró el pago anual; activa hasta el %s', to_char(v_hasta, 'DD/MM/YYYY')),
    jsonb_build_object('pagado_hasta', v_hasta));
  return v_hasta;
end;
$$;

revoke execute on function public.registrar_pago_anual(uuid) from public, anon;
grant execute on function public.registrar_pago_anual(uuid) to authenticated;


-- 4. Tarea diaria --------------------------------------------------------------------------

-- Una vez por colegio, tipo y día (si la tarea se corre dos veces, no repite correos).
create or replace function public.avisar_una_vez(
  p_institucion_id uuid,
  p_tipo text,
  p_asunto text,
  p_titulo text,
  p_parrafos text[],
  p_boton text,
  p_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.correos_enviados
    where institucion_id = p_institucion_id and tipo = p_tipo and creado_en::date = current_date
  ) then
    return;
  end if;
  perform public.enviar_correo(p_institucion_id, p_tipo, public.correos_administradores(p_institucion_id),
    p_asunto, public.plantilla_correo(p_titulo, p_parrafos, p_boton, p_url));
end;
$$;

revoke execute on function public.avisar_una_vez(uuid, text, text, text, text[], text, text) from public, anon, authenticated;

-- Borra un colegio y las cuentas que eran solo de él (no las de super administrador).
create or replace function public.borrar_colegio(p_institucion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_cuentas uuid[];
  v_correos text[];
begin
  select nombre into v_nombre from public.instituciones where id = p_institucion_id;
  if v_nombre is null then
    return;
  end if;

  select coalesce(array_agg(p.id), '{}'), coalesce(array_agg(lower(u.email)) filter (where u.email is not null), '{}')
  into v_cuentas, v_correos
  from public.personas p
  join auth.users u on u.id = p.id
  where p.institucion_id = p_institucion_id
    and not exists (select 1 from public.membresias m where m.persona_id = p.id and m.rol = 'super_admin');

  perform public.enviar_correo(p_institucion_id, 'cuenta_cerrada', v_correos,
    'Tu cuenta de Colectia se cerró',
    public.plantilla_correo('Tu cuenta de Colectia se cerró',
      array[format('%s dejó de usar Colectia, así que borramos su información y tu cuenta, como dice nuestra política de privacidad.',
                   public.escapar_html(v_nombre)),
            'Si tienes preguntas, responde a este correo.'],
      null, null));

  -- Los pagos protegen sus actividades y estudiantes (on delete restrict): van primero.
  delete from public.registros_pago
  where evento_id in (select id from public.eventos where institucion_id = p_institucion_id);
  delete from public.instituciones where id = p_institucion_id;
  delete from auth.users where id = any (v_cuentas);
end;
$$;

revoke execute on function public.borrar_colegio(uuid) from public, anon, authenticated;

create or replace function public.tarea_diaria()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_url text;
begin
  -- Avisos de fin de la prueba (2 días antes y el último día).
  for r in
    select id, nombre, subdominio, prueba_hasta from public.instituciones
    where estado = 'en_prueba' and prueba_hasta - current_date in (0, 2)
      and (pagado_hasta is null or pagado_hasta < current_date)
  loop
    v_url := format('https://%s.colectia.co/admin', r.subdominio);
    perform public.avisar_una_vez(r.id,
      case when r.prueba_hasta = current_date then 'prueba_ultimo_dia' else 'prueba_2_dias' end,
      case when r.prueba_hasta = current_date then 'Hoy termina tu prueba de Colectia'
           else 'Tu prueba de Colectia termina en 2 días' end,
      case when r.prueba_hasta = current_date then 'Hoy termina tu prueba' else 'Tu prueba termina en 2 días' end,
      array[format('La prueba gratis de <strong>%s</strong> termina el %s. Para seguir usando Colectia, '
                   || 'escríbenos y te contamos cómo pagar la suscripción.',
                   public.escapar_html(r.nombre), to_char(r.prueba_hasta, 'DD/MM/YYYY'))],
      'Entrar a Colectia', v_url);
  end loop;

  -- Suspender: prueba terminada sin pago (3 días para borrar) o año pagado vencido (30 días).
  for r in
    update public.instituciones
    set estado = 'suspendida',
        suspendida_desde = current_date,
        borrar_el = current_date + case when pagado_hasta is null then 3 else 30 end
    where (estado = 'en_prueba' and prueba_hasta < current_date and (pagado_hasta is null or pagado_hasta < current_date))
       or (estado = 'activa' and pagado_hasta < current_date)
    returning id, nombre, subdominio, borrar_el
  loop
    v_url := format('https://%s.colectia.co/admin/reportes', r.subdominio);
    perform public.avisar_una_vez(r.id, 'suspendida', 'Colectia quedó en solo lectura para tu colegio',
      'Tu colegio quedó en solo lectura',
      array[format('<strong>%s</strong> no tiene una suscripción vigente, así que Colectia quedó en solo lectura.',
                   public.escapar_html(r.nombre)),
            format('El %s borraremos toda su información. Antes de esa fecha, descarga en Reportes el Excel con '
                   || 'estudiantes, actividades y pagos, o escríbenos para renovar.', to_char(r.borrar_el, 'DD/MM/YYYY'))],
      'Descargar reportes', v_url);
  end loop;

  -- Aviso 1 día antes del borrado.
  for r in
    select id, nombre, subdominio, borrar_el from public.instituciones
    where estado = 'suspendida' and borrar_el = current_date + 1
  loop
    v_url := format('https://%s.colectia.co/admin/reportes', r.subdominio);
    perform public.avisar_una_vez(r.id, 'borrado_manana', 'Mañana borramos la información de tu colegio en Colectia',
      'Mañana borramos la información',
      array[format('Mañana, %s, borraremos toda la información de <strong>%s</strong> en Colectia y las cuentas de su '
                   || 'personal y sus familias. Hoy todavía puedes descargar el Excel en Reportes.',
                   to_char(r.borrar_el, 'DD/MM/YYYY'), public.escapar_html(r.nombre))],
      'Descargar reportes', v_url);
  end loop;

  -- Borrado.
  for r in select id from public.instituciones where estado = 'suspendida' and borrar_el <= current_date loop
    perform public.borrar_colegio(r.id);
  end loop;
end;
$$;

revoke execute on function public.tarea_diaria() from public, anon, authenticated;

-- 6:00 a. m. en Colombia = 11:00 UTC. Si ya existe con este nombre, se reemplaza.
select cron.schedule('colectia-tarea-diaria', '0 11 * * *', 'select public.tarea_diaria()');


-- 5. En prueba = activo -------------------------------------------------------------------

create or replace function public.institucion_esta_activa(p_institucion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.instituciones i
    where i.id = p_institucion_id and i.estado in ('activa', 'en_prueba')
  );
$$;

create or replace function public.puede_gestionar_imagen_evento(p_nombre text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.membresias m
    join public.instituciones i on i.id = m.institucion_id
    where m.persona_id = auth.uid()
      and m.institucion_id::text = (storage.foldername(p_nombre))[1]
      and m.rol in ('admin_institucion', 'recaudador')
      and i.estado in ('activa', 'en_prueba')
  );
$$;
