-- Colectia: el super admin puede pasar a administrador a quien ya es recaudador
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema.
--
-- Al asignar el administrador de una institución desde el panel de super admin,
-- si esa persona ya era recaudadora ahí, se le cambia el rol en vez de dejarla
-- con los dos. Para eso el super admin necesita ver y borrar membresías de
-- recaudador. Las de super_admin siguen sin poder tocarse desde la app.

drop policy if exists "super_admin ve membresias de admin_institucion" on public.membresias;
drop policy if exists "super_admin ve membresias del personal" on public.membresias;
create policy "super_admin ve membresias del personal"
  on public.membresias for select
  to authenticated
  using (public.es_super_admin() and rol in ('admin_institucion', 'recaudador'));

drop policy if exists "super_admin elimina membresias de admin_institucion" on public.membresias;
drop policy if exists "super_admin elimina membresias del personal" on public.membresias;
create policy "super_admin elimina membresias del personal"
  on public.membresias for delete
  to authenticated
  using (public.es_super_admin() and rol in ('admin_institucion', 'recaudador'));
