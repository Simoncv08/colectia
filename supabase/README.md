# Base de datos de Colectia

Los scripts de `migraciones/` se corren en el SQL Editor de Supabase (New query → pegar → Run),
uno por uno y en el orden del número. Ese orden se probó completo sobre una base vacía.

## Proyecto nuevo (por ejemplo, el de producción)

1. Corre todos los scripts de `migraciones/`, desde `01_schema.sql` hasta el último, en orden.
2. Después de `02_hook_membresias.sql`, activa el hook en Authentication → Hooks →
   Custom Access Token y elige la función `public.custom_access_token_hook`.
   Sin eso, las políticas de `03_rls_policies.sql` no dejan ver nada.
3. Crea la cuenta del super administrador desde la app y luego corre
   `bootstrap_super_admin.sql` una sola vez, con tu correo.

## Proyecto que ya existe

Solo hay que correr los scripts nuevos que aparezcan, con número mayor al último que corriste.
Los que dicen "Se puede correr más de una vez sin problema" se pueden repetir sin riesgo.

## Para cambiar la base de datos

Un cambio nuevo va en un archivo nuevo con el número siguiente. Los archivos ya
corridos no se editan: si algo quedó mal, el arreglo va en un script nuevo.

## Correos

Las plantillas de correo en español y los pasos para el servicio de correo propio están en `correos/README.md`.
