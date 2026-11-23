import {
  BotonEsqueleto,
  Barra,
  CabeceraEsqueleto,
  Cargando,
} from '@/components/Esqueleto'

// Lista de eventos.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando los eventos…">
      <CabeceraEsqueleto botones={1} />
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Barra className="h-5 w-44" />
                <Barra className="h-6 w-16 rounded-full" />
              </div>
              <Barra className="h-3.5 w-64" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <BotonEsqueleto className="sm:w-28" />
              <BotonEsqueleto className="sm:w-28" />
            </div>
          </div>
        ))}
      </div>
    </Cargando>
  )
}
