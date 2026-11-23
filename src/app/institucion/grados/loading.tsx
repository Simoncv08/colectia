import {
  Barra,
  CabeceraEsqueleto,
  Cargando,
} from '@/components/Esqueleto'

// Cursos (chips) y grupos de cursos.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando los cursos…" className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <CabeceraEsqueleto botones={1} />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }, (_, i) => (
            <Barra key={i} className="h-8 w-16 rounded-full" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <CabeceraEsqueleto botones={1} />
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xs sm:px-5"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Barra className="h-4 w-28" />
                <Barra className="h-3.5 w-full max-w-sm" />
              </div>
              <Barra className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </Cargando>
  )
}
