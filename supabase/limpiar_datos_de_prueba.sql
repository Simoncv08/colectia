-- Colectia: borrar los datos de prueba antes del lanzamiento (decisión del 27/11/2026)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
--
-- BORRA PARA SIEMPRE, sin forma de recuperarlo:
--   - todos los colegios, con sus estudiantes, cursos, actividades, productos, pagos,
--     personal, invitaciones, direcciones (subdominios) y registro de actividad;
--   - todas las cuentas que no son de super administrador (familias y personal), con sus
--     estudiantes vinculados y aceptaciones de términos.
-- CONSERVA: las cuentas de super administrador (sin colegio, como debe ser), los términos y la
-- política de privacidad publicados y los subdominios reservados del sistema.
-- Las imágenes de las actividades se borran aparte: Storage → eventos → seleccionar todo → Delete.
--
-- Si algo falla, no se borra nada (todo va en una sola transacción).

begin;

do $$
begin
  if not exists (select 1 from public.membresias where rol = 'super_admin') then
    raise exception 'No hay ninguna cuenta de super administrador: no se borra nada.';
  end if;
end;
$$;

-- El super administrador no pertenece a ningún colegio.
update public.personas set institucion_id = null
where id in (select persona_id from public.membresias where rol = 'super_admin');
delete from public.membresias
where rol <> 'super_admin'
  and persona_id in (select persona_id from public.membresias where rol = 'super_admin');

-- Los pagos protegen sus actividades y estudiantes (on delete restrict): van primero.
delete from public.registros_pago;
delete from public.instituciones;

delete from auth.users u
where not exists (select 1 from public.membresias m where m.persona_id = u.id and m.rol = 'super_admin');

delete from public.vinculo_intentos;

commit;

-- Lo que quedó
select 'colegios' as que, count(*) from public.instituciones
union all select 'cuentas', count(*) from auth.users
union all select 'cuentas de super administrador', count(*) from public.membresias where rol = 'super_admin'
union all select 'documentos legales', count(*) from public.documentos_legales;
