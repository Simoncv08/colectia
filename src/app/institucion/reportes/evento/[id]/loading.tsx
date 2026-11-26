import {
  Barra,
  BotonEsqueleto,
  Cargando,
  TarjetaDatoEsqueleto,
  TarjetaEsqueleto,
} from '@/components/Esqueleto'

function TituloSeccion() {
  return (
    <div className="flex flex-col gap-2">
      <Barra className="h-5 w-40" />
      <Barra className="h-3.5 w-full max-w-sm" />
    </div>
  )
}

function FilasConBarra({ filas }: { filas: number }) {
  return (
    <TarjetaEsqueleto className="flex flex-col divide-y divide-gray-200">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 py-3 sm:grid-cols-[11rem_1fr_7rem] sm:items-center">
          <Barra className={`h-4 ${i % 2 ? 'w-20' : 'w-28'}`} />
          <Barra className="h-4 w-20 justify-self-end sm:order-last" />
          <Barra className="col-span-2 h-2 w-full sm:col-span-1" />
        </div>
      ))}
    </TarjetaEsqueleto>
  )
}

// Informe de un evento: cabecera, cuatro indicadores, la gráfica y los bloques con barras.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando el informe del evento…" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Barra className="h-4 w-20" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <Barra className="h-7 w-56 sm:w-72" />
            <div className="flex items-center gap-3">
              <Barra className="h-6 w-24 rounded-full" />
              <Barra className="h-4 w-36" />
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <BotonEsqueleto className="w-full sm:w-44" />
            <BotonEsqueleto className="w-full sm:w-44" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaDatoEsqueleto ancho />
        <TarjetaDatoEsqueleto ancho />
        <TarjetaDatoEsqueleto />
        <TarjetaDatoEsqueleto />
      </div>
      <div className="flex flex-col gap-3">
        <TituloSeccion />
        <TarjetaEsqueleto className="flex flex-col gap-4">
          <Barra className="h-36 w-full" />
          <Barra className="h-20 w-full" />
          <Barra className="h-4 w-28" />
        </TarjetaEsqueleto>
      </div>
      <div className="flex flex-col gap-3">
        <TituloSeccion />
        <FilasConBarra filas={2} />
      </div>
      <div className="flex flex-col gap-3">
        <TituloSeccion />
        <FilasConBarra filas={4} />
      </div>
    </Cargando>
  )
}
