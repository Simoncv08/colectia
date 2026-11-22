-- Colectia: Crear el primer super_admin (se corre una sola vez)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Por diseño, nadie puede auto-asignarse el rol super_admin desde la app
-- (ver rls_policies.sql), por eso el primer super_admin se crea a mano,
-- una única vez, desde aquí. El SQL Editor de Supabase corre con
-- privilegios de administrador de la base de datos, así que no le
-- aplican las políticas de RLS.

-- Paso 1: confirma tu correo (el mismo con el que entras con Google) y
-- copia el resultado para asegurarte de que ya existe tu persona:
select id, correo, nombres from public.personas where correo = 'TU-CORREO-AQUI';

-- Paso 2: reemplaza 'TU-CORREO-AQUI' (aquí abajo también) por tu correo
-- real y corre este bloque:
insert into public.membresias (persona_id, institucion_id, rol)
select id, null, 'super_admin'
from public.personas
where correo = 'TU-CORREO-AQUI';

-- Paso 3: verifica que quedó creada:
select * from public.membresias where rol = 'super_admin';

-- Importante: tu sesión ya iniciada tiene un token (JWT) viejo, generado
-- ANTES de tener este rol, así que no lo va a incluir todavía. Después de
-- correr este script, cierra sesión en la app y vuelve a iniciar sesión
-- con Google para que el token se genere de nuevo, esta vez sí con tu
-- rol de super_admin adentro.
