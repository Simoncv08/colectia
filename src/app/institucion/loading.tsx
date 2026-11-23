import {
  BotonEsqueleto,
  Barra,
  CabeceraEsqueleto,
  Cargando,
  TarjetaDatoEsqueleto,
  TarjetaEsqueleto,
} from '@/components/Esqueleto'

// Inicio del personal.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando el inicio…" className="flex flex-col gap-8">
      <CabeceraEsqueleto botones={2} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaDatoEsqueleto ancho />
        <TarjetaDatoEsqueleto />
        <TarjetaDatoEsqueleto />
        <TarjetaDatoEsqueleto ancho />
      </div>
      <div className="flex flex-col gap-4">
        <Barra className="h-5 w-36" />
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <TarjetaEsqueleto key={i} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Barra className="h-5 w-48" />
                <Barra className="h-3.5 w-40" />
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <Barra className="h-3.5 w-20" />
                  <Barra className="h-7 w-32" />
                </div>
                <Barra className="h-4 w-28" />
              </div>
              <Barra className="h-2 w-full" />
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <BotonEsqueleto className="sm:w-28" />
                <BotonEsqueleto className="sm:w-36" />
              </div>
            </TarjetaEsqueleto>
          ))}
        </div>
      </div>
    </Cargando>
  )
}
