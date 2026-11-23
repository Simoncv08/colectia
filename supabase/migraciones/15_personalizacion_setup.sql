-- Colectia: Personalización de colores de cada institución
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Agrega a cada institución:
--   - paleta: la paleta de colores elegida (azul, verde, turquesa,
--     morado, fucsia, vino, naranja o pizarra, ver src/lib/paletas.ts).
--   - fondo: el color de fondo de las pantallas (gris, blanco o tinte
--     suave de la paleta).
--
-- El personal ve el panel de la institución con esos colores, y los
-- acudientes ven con esos colores los eventos de esa institución.
--
-- Los colores solo los puede cambiar el administrador de la institución,
-- a través de la función actualizar_apariencia_institucion (no tiene
-- permiso para cambiar ninguna otra cosa de la institución, como su
-- estado o su plan). Cada cambio queda anotado en el registro de
-- actividad.
--
-- Se puede volver a correr sin problema.

alter table public.instituciones
  add column if not exists paleta text not null default 'azul',
  add column if not exists fondo text not null default 'gris';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'instituciones_paleta_valida') then
    alter table public.instituciones
      add constraint instituciones_paleta_valida
      check (paleta in ('azul', 'verde', 'turquesa', 'morado', 'fucsia', 'vino', 'naranja', 'pizarra'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'instituciones_fondo_valido') then
    alter table public.instituciones
      add constraint instituciones_fondo_valido
      check (fondo in ('gris', 'blanco', 'tinte'));
  end if;
end;
$$;

create or replace function public.actualizar_apariencia_institucion(
  p_institucion_id uuid,
  p_paleta text,
  p_fondo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes record;
begin
  if not public.tiene_rol_en_institucion(p_institucion_id, array['admin_institucion']) then
    raise exception 'Solo el administrador de la institución puede cambiar sus colores.';
  end if;

  select paleta, fondo into v_antes from public.instituciones where id = p_institucion_id;

  update public.instituciones
    set paleta = p_paleta,
        fondo = p_fondo
    where id = p_institucion_id;

  if v_antes.paleta is distinct from p_paleta or v_antes.fondo is distinct from p_fondo then
    begin
      perform public.actividad_anotar(
        p_institucion_id, 'personal', 'editar',
        'cambió los colores de la institución (paleta: ' || p_paleta || ', fondo: ' || p_fondo || ')'
      );
    exception when others then
      null; -- si el registro de actividad no está instalado, no pasa nada
    end;
  end if;
end;
$$;

revoke execute on function public.actualizar_apariencia_institucion(uuid, text, text) from public, anon;
grant execute on function public.actualizar_apariencia_institucion(uuid, text, text) to authenticated;
