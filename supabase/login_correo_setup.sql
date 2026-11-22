-- Colectia: Inicio de sesión con correo (contraseña o enlace)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Se puede correr más de una vez sin problema.
--
-- 1. Al crear una cuenta con correo, la pantalla de registro manda
--    "nombres" y "apellidos" por separado. Aquí se guardan así en
--    "personas" (con Google se sigue usando el nombre completo).
--
-- 2. Seguridad: con registro por correo, alguien podría crear una cuenta
--    con un correo ajeno (sin confirmarlo). Para que eso no le sirva de
--    nada, la búsqueda de personas al invitar personal solo encuentra
--    cuentas cuyo correo ya fue CONFIRMADO. Sigue devolviendo únicamente
--    el id (nada de nombre, teléfono, etc.).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.personas (id, nombres, apellidos, correo)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nombres'), ''),
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ),
    nullif(trim(new.raw_user_meta_data ->> 'apellidos'), ''),
    lower(new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.buscar_persona_id_por_correo(p_correo text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.personas p
  join auth.users u on u.id = p.id
  where lower(p.correo) = lower(trim(p_correo))
    and u.email_confirmed_at is not null
  limit 1;
$$;

revoke execute on function public.buscar_persona_id_por_correo(text) from public;
grant execute on function public.buscar_persona_id_por_correo(text) to authenticated;
