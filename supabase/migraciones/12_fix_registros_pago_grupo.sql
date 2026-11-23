-- Colectia: Permite que un solo pago en efectivo cubra varios
-- productos del mismo evento a la vez (ej.: el estudiante paga junto la
-- entrada y la camiseta en un solo pago).
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Cada producto pagado sigue quedando como su propia fila en
-- registros_pago (así los reportes por producto, y el máximo por
-- estudiante, siguen funcionando igual), lo nuevo es "grupo_pago_id":
-- un identificador compartido entre todas las filas que se registraron
-- juntas en un mismo pago, para que la pantalla las muestre agrupadas.

alter table public.registros_pago
  add column if not exists grupo_pago_id uuid;

-- A los pagos que ya existían (de antes de este cambio) se les asigna un
-- grupo propio cada uno, ya que en ese momento cada pago cubría un solo
-- producto.
update public.registros_pago
  set grupo_pago_id = gen_random_uuid()
  where grupo_pago_id is null;

alter table public.registros_pago
  alter column grupo_pago_id set default gen_random_uuid(),
  alter column grupo_pago_id set not null;

create index if not exists registros_pago_grupo_pago_id_idx
  on public.registros_pago (grupo_pago_id);
