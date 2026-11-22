-- Colectia: Todos los campos de estudiantes pasan a ser obligatorios
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Antes de correr esto: si ya tienes estudiantes cargados sin curso/grado,
-- número de documento o fecha de nacimiento, complétalos primero (en el
-- panel de institución, o directo en Table Editor → estudiantes). Si
-- queda alguna fila con un dato faltante, este script va a fallar y el
-- mensaje de error te va a decir cuál columna tiene el problema, en ese
-- caso, completa esa fila y vuelve a correr el script.

alter table public.estudiantes
  alter column curso_grado set not null,
  alter column numero_documento set not null,
  alter column fecha_nacimiento set not null;
