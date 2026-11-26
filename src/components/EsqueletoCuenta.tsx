import { BotonEsqueleto, Barra, CabeceraEsqueleto, Cargando, CampoEsqueleto, TarjetaEsqueleto } from '@/components/Esqueleto'

// Esqueleto de "Mi cuenta" del personal y del super administrador. tarjetasExtra: tarjetas de
// un botón que solo tienen algunas cuentas (por ejemplo, la verificación en dos pasos).
export default function EsqueletoCuenta({ tarjetasExtra = 0 }: { tarjetasExtra?: number }) {
  return (
    <Cargando texto="Cargando tu cuenta…" className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <CabeceraEsqueleto />
      <TarjetaEsqueleto className="flex flex-col gap-4">
        <Barra className="h-5 w-28" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoEsqueleto etiqueta="w-16" />
          <CampoEsqueleto etiqueta="w-16" />
          <CampoEsqueleto etiqueta="w-28" />
          <CampoEsqueleto etiqueta="w-14" />
        </div>
        <BotonEsqueleto className="w-40" />
      </TarjetaEsqueleto>
      {Array.from({ length: 1 + tarjetasExtra }, (_, i) => (
        <TarjetaEsqueleto key={i} className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Barra className="h-5 w-28" />
            <Barra className="h-3.5 w-64" />
          </div>
          <BotonEsqueleto className="w-full sm:w-44" />
        </TarjetaEsqueleto>
      ))}
      <TarjetaEsqueleto className="flex flex-col gap-3">
        <Barra className="h-5 w-44" />
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {[0, 1].map((i) => (
            <div key={i} className="flex min-h-14 flex-col justify-center gap-2 px-4 py-3">
              <Barra className="h-4 w-44" />
              <Barra className="h-3 w-56" />
            </div>
          ))}
        </div>
      </TarjetaEsqueleto>
    </Cargando>
  )
}
