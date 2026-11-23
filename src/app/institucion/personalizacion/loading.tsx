import {
  BotonEsqueleto,
  Barra,
  CabeceraEsqueleto,
  Cargando,
  TarjetaEsqueleto,
} from '@/components/Esqueleto'

// Personalización: paletas, color de fondo y la vista previa.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando la personalización…">
      <CabeceraEsqueleto />
      <TarjetaEsqueleto className="flex flex-col gap-3">
        <Barra className="h-4 w-32" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border-2 border-gray-200 bg-white p-3">
              <Barra className="h-8 w-full" />
              <Barra className="h-3.5 w-16" />
            </div>
          ))}
        </div>
      </TarjetaEsqueleto>
      <TarjetaEsqueleto className="flex flex-col gap-3">
        <Barra className="h-4 w-28" />
        <div className="flex flex-wrap gap-3">
          {[0, 1, 2].map((i) => (
            <Barra key={i} className="h-11 w-28 rounded-lg" />
          ))}
        </div>
      </TarjetaEsqueleto>
      <BotonEsqueleto className="w-40" />
    </Cargando>
  )
}
