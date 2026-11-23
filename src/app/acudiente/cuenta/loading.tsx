import {
  BotonEsqueleto,
  Barra,
  Cargando,
  CampoEsqueleto,
  TarjetaEsqueleto,
} from '@/components/Esqueleto'

// Mi cuenta: datos, estudiantes vinculados y contraseña.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando tu cuenta…">
      <Barra className="h-7 w-36" />
      <TarjetaEsqueleto className="flex flex-col gap-4">
        <Barra className="h-5 w-28" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoEsqueleto etiqueta="w-16" />
          <CampoEsqueleto etiqueta="w-16" />
          <CampoEsqueleto etiqueta="w-20" />
        </div>
        <BotonEsqueleto className="w-40" />
      </TarjetaEsqueleto>
      <TarjetaEsqueleto className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Barra className="h-5 w-48" />
            <Barra className="h-3.5 w-60" />
          </div>
          <BotonEsqueleto className="w-full sm:w-44" />
        </div>
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2">
                <Barra className="h-4 w-44" />
                <Barra className="h-3.5 w-52" />
              </div>
              <BotonEsqueleto className="w-full sm:w-44" />
            </div>
          ))}
        </div>
      </TarjetaEsqueleto>
      <TarjetaEsqueleto className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Barra className="h-5 w-28" />
          <Barra className="h-3.5 w-56" />
        </div>
        <BotonEsqueleto className="w-full sm:w-44" />
      </TarjetaEsqueleto>
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
