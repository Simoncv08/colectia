import {
  Barra,
  CabeceraEsqueleto,
  Cargando,
} from '@/components/Esqueleto'
import { ui } from '@/lib/ui'

// Personal: una fila por persona, con su rol y "Quitar" a la derecha.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando el personal…">
      <CabeceraEsqueleto botones={1} />
      <div className={`${ui.tarjeta} divide-y divide-gray-100 p-0 sm:p-0 md:p-0`}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Barra className="h-4 w-40" />
              <Barra className="h-3.5 w-52" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Barra className="h-6 w-24 rounded-full" />
              <Barra className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    </Cargando>
  )
}
