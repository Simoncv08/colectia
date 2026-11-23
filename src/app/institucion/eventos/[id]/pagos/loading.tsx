import {
  Barra,
  CabeceraEsqueleto,
  Cargando,
  TarjetaDatoEsqueleto,
} from '@/components/Esqueleto'

// Pagos de un evento: resumen y un bloque por salón.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando los pagos…">
      <CabeceraEsqueleto volver botones={1} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TarjetaDatoEsqueleto ancho />
        <TarjetaDatoEsqueleto />
        <TarjetaDatoEsqueleto />
        <TarjetaDatoEsqueleto ancho />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Barra className="h-5 w-24" />
          <div className="flex flex-wrap gap-2">
            <Barra className="h-11 w-56 rounded-full sm:h-9" />
            <Barra className="h-11 w-60 rounded-full sm:h-9" />
          </div>
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xs sm:px-5"
          >
            <Barra className="h-4 w-12" />
            <div className="flex items-center gap-3">
              <Barra className="h-4 w-28" />
              <Barra className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </Cargando>
  )
}
