import {
  BotonEsqueleto,
  Barra,
  Cargando,
  CampoEsqueleto,
  TarjetaDatoEsqueleto,
  TarjetaEsqueleto,
} from '@/components/Esqueleto'
import { ui } from '@/lib/ui'

// Reportes: pestañas, filtros, resumen y un bloque por evento.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando los reportes…" className="flex flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <Barra className="h-7 w-32" />
        <BotonEsqueleto className="w-44" />
      </div>
      <div className="-mx-4 mb-4 flex gap-6 overflow-hidden border-b border-gray-200 px-4 pb-3 pt-2 sm:mx-0 sm:px-4">
        <Barra className="h-4 w-36 shrink-0" />
        <Barra className="h-4 w-36 shrink-0" />
        <Barra className="h-4 w-32 shrink-0" />
      </div>
      <Barra className="mb-4 h-4 w-full max-w-md" />
      <TarjetaEsqueleto className={`${ui.filtros} mb-6 md:p-4`}>
        <CampoEsqueleto className="col-span-2 sm:w-56" etiqueta="w-12" />
        <CampoEsqueleto className="sm:w-36" etiqueta="w-10" />
        <CampoEsqueleto className="sm:w-40" etiqueta="w-20" />
        <CampoEsqueleto className="sm:w-40" etiqueta="w-20" />
        <CampoEsqueleto className="sm:w-44" etiqueta="w-14" />
        <BotonEsqueleto className="col-span-2 w-full sm:w-32" />
      </TarjetaEsqueleto>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TarjetaDatoEsqueleto />
        <TarjetaDatoEsqueleto />
        <TarjetaDatoEsqueleto />
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1].map((i) => (
          <TarjetaEsqueleto key={i} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Barra className="h-4 w-44" />
              <Barra className="h-6 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="flex flex-col gap-1.5">
                  <Barra className="h-3 w-16" />
                  <Barra className="h-4 w-24" />
                </div>
              ))}
            </div>
            <Barra className="h-2 w-full" />
          </TarjetaEsqueleto>
        ))}
      </div>
    </Cargando>
  )
}
