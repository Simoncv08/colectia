-- Colectia: Fechas de los eventos (plazo de pago y fecha del evento)
-- y estado "finalizado"
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Agrega a cada evento:
--   - fecha_limite_pago: último día en que se puede pagar (ej. 28/09/2026).
--   - fecha_evento: día en que se realiza el evento (ej. 01/10/2026).
--   - finalizado_en: momento en que alguien del personal lo marcó como
--     finalizado con el botón "Finalizar" (vacío si no se ha marcado).
--
-- Con eso, cada evento está en uno de tres estados (todo con la fecha de
-- Colombia):
--   - Abierto: se puede pagar.
--   - Pago cerrado: ya pasó la fecha límite de pago, pero el evento
--     todavía no se ha realizado. Los acudientes lo siguen viendo, marcado
--     como "pago no disponible".
--   - Finalizado: desde el día siguiente a la fecha del evento, o desde
--     que alguien lo marcó como finalizado. Los acudientes ya no lo ven.
--
-- Ocultar los eventos finalizados a los acudientes se hace aquí, en la
-- política de seguridad (RLS), no solo en la pantalla.
--
-- Se puede volver a correr sin problema.

alter table public.eventos
  add column if not exists fecha_limite_pago date,
  add column if not exists fecha_evento date,
  add column if not exists finalizado_en timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'eventos_fecha_limite_antes_del_evento'
  ) then
    alter table public.eventos
      add constraint eventos_fecha_limite_antes_del_evento
      check (fecha_limite_pago is null or fecha_evento is null or fecha_limite_pago <= fecha_evento);
  end if;
end;
$$;

-- Fecha de hoy en Colombia (el servidor de la base de datos usa hora
-- UTC, que a partir de las 7 p. m. ya va en el día siguiente).
create or replace function public.hoy_colombia()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Bogota')::date;
$$;

-- ¿Está finalizado? Sí, si se marcó con el botón, o si ya pasó el día
-- del evento (desde el día siguiente).
create or replace function public.evento_finalizado(p_finalizado_en timestamptz, p_fecha_evento date)
returns boolean
language sql
stable
as $$
  select p_finalizado_en is not null
      or (p_fecha_evento is not null and public.hoy_colombia() > p_fecha_evento);
$$;

-- ¿Acepta pagos hoy? (No está finalizado y no ha pasado la fecha límite.)
-- Queda lista para cuando se integre el pago en línea (Fase 2): la
-- función que registre esos pagos deberá revisar esto antes de cobrar.
create or replace function public.evento_acepta_pagos(p_evento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.evento_finalizado(ev.finalizado_en, ev.fecha_evento)
     and (ev.fecha_limite_pago is null or public.hoy_colombia() <= ev.fecha_limite_pago)
  from public.eventos ev
  where ev.id = p_evento_id;
$$;

-- Los acudientes solo ven los eventos dirigidos a sus estudiantes que
-- todavía NO estén finalizados. (Reemplaza la política creada en
-- fix_recursion_eventos.sql, agregándole esa condición.)
drop policy if exists "acudiente ve eventos dirigidos a sus estudiantes" on public.eventos;
create policy "acudiente ve eventos dirigidos a sus estudiantes"
  on public.eventos for select
  to authenticated
  using (
    public.evento_visible_para_acudiente(id)
    and not public.evento_finalizado(finalizado_en, fecha_evento)
  );
