-- Colectia: Agrega el manejo de "devuelta" a los pagos en efectivo.
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Antes, el formulario de pago en efectivo solo pedía un "monto" que se
-- podía editar libremente. Ahora el valor del pago (monto) queda fijo
-- según el producto y la cantidad, y se agregan dos columnas nuevas para
-- cuando el estudiante paga con más dinero del valor exacto:
--   - dinero_recibido: el efectivo físico que entregó (ej.: pagó con
--     $30.000 un producto de $25.000). Si queda en null, es porque el
--     pago fue exacto (sin devuelta).
--   - devuelta_pendiente: true si la devuelta (dinero_recibido - monto)
--     todavía no se le ha entregado al estudiante/acudiente.

alter table public.registros_pago
  add column if not exists dinero_recibido numeric(12, 2),
  add column if not exists devuelta_pendiente boolean not null default false;

comment on column public.registros_pago.dinero_recibido is
  'Efectivo físico que entregó la persona (puede ser mayor a "monto" si no había cambio exacto). Si es null, se asume igual a "monto" (pago exacto, sin devuelta).';
comment on column public.registros_pago.devuelta_pendiente is
  'true si "dinero_recibido" es mayor que "monto" y esa devuelta todavía no se le ha entregado al estudiante/acudiente.';
