-- Colectia: "Avísame cuando esté listo" en los módulos próximos (Fase A, paquete A6)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema. Requiere 28_modulos.sql.
--
-- El administrador de un colegio pide que le avisen de un módulo "Disponible pronto"; el super
-- administrador ve cuántos colegios pidieron cada uno (y cuáles, para avisarles).

create table if not exists public.modulo_interes (
  institucion_id uuid not null references public.instituciones (id) on delete cascade,
  modulo text not null references public.modulos (clave) on delete cascade,
  pedido_por uuid references public.personas (id) on delete set null,
  creado_en timestamptz not null default now(),
  primary key (institucion_id, modulo)
);

alter table public.modulo_interes enable row level security;

drop policy if exists "personal y super admin ven el interes en modulos" on public.modulo_interes;
create policy "personal y super admin ven el interes en modulos"
  on public.modulo_interes for select
  to authenticated
  using (
    public.es_super_admin()
    or public.tiene_rol_en_institucion(institucion_id, array['admin_institucion', 'recaudador'])
  );

create or replace function public.pedir_aviso_modulo(p_institucion_id uuid, p_modulo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
begin
  if not public.tiene_rol_en_institucion(p_institucion_id, array['admin_institucion']) then
    raise exception 'Solo el administrador del colegio puede pedir el aviso.' using errcode = '42501';
  end if;

  select nombre into v_nombre from public.modulos where clave = p_modulo and estado = 'proximamente';
  if v_nombre is null then
    raise exception 'Ese módulo no está en la lista de próximos.';
  end if;

  insert into public.modulo_interes (institucion_id, modulo, pedido_por)
  values (p_institucion_id, p_modulo, auth.uid())
  on conflict (institucion_id, modulo) do nothing;

  if found then
    perform public.actividad_anotar(p_institucion_id, 'institucion', 'pedir_aviso_modulo',
      format('Pidió aviso del módulo %s', v_nombre), jsonb_build_object('modulo', p_modulo));
  end if;
end;
$$;

revoke execute on function public.pedir_aviso_modulo(uuid, text) from public, anon;
grant execute on function public.pedir_aviso_modulo(uuid, text) to authenticated;
