-- Colectia: Corrige "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification" al agregar un grupo de
-- cursos a un evento.
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Causa: los índices únicos creados en grupos_curso_setup.sql eran
-- "parciales" (solo aplicaban a las filas donde curso_grado, o
-- estudiante_id, no es nulo). Postgres solo usa un índice parcial para
-- resolver un "ON CONFLICT" si la instrucción incluye exactamente esa
-- misma condición, y la función que agrega los cursos de un grupo no la
-- incluye, así que Postgres no encontraba ningún índice que le
-- sirviera. La solución es usar índices únicos normales (no
-- parciales): funcionan igual de bien para evitar duplicados, porque
-- en Postgres dos valores NULL nunca se consideran "iguales" entre sí,
-- así que las filas que solo tienen estudiante_id (con curso_grado en
-- null) no chocan entre ellas de todas formas.
--
-- Si este script falla diciendo que ya existen valores duplicados, es
-- porque en algún evento de prueba quedó el mismo curso/grado (o el
-- mismo estudiante) agregado dos veces, hay que borrar la fila
-- duplicada en evento_grupos desde Table Editor y volver a correr este
-- script.

drop index if exists public.evento_grupos_evento_curso_uidx;
drop index if exists public.evento_grupos_evento_estudiante_uidx;

create unique index evento_grupos_evento_curso_uidx
  on public.evento_grupos (evento_id, curso_grado);

create unique index evento_grupos_evento_estudiante_uidx
  on public.evento_grupos (evento_id, estudiante_id);
