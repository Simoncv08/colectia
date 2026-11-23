import {
  BotonEsqueleto,
  Barra,
  CabeceraEsqueleto,
  Cargando,
  CampoEsqueleto,
} from '@/components/Esqueleto'
import { ui } from '@/lib/ui'

// Actividad: filtros y los registros agrupados por día.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando la actividad…">
      <CabeceraEsqueleto />
      <div className={ui.filtros}>
        <CampoEsqueleto className="sm:w-44" etiqueta="w-16" />
        <CampoEsqueleto className="sm:w-44" etiqueta="w-14" />
        <BotonEsqueleto className="col-span-2 w-full sm:w-32" />
      </div>
      <div className="flex flex-col gap-3">
        <Barra className="h-4 w-40" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <Barra className="h-3.5 w-12 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <Barra className="h-6 w-20 rounded-full" />
                <Barra className="h-4 w-28" />
              </div>
              <Barra className={`h-3.5 ${i % 2 ? 'w-48' : 'w-64'}`} />
            </div>
          </div>
        ))}
      </div>
    </Cargando>
  )
}
