import {
  Barra,
  CabeceraEsqueleto,
  Cargando,
  CampoEsqueleto,
  ListaEsqueleto,
} from '@/components/Esqueleto'

// Cobro por salón: filtros, lista con casillas y la barra de abajo.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando el cobro por salón…" className="flex flex-col gap-5">
      <CabeceraEsqueleto volver />
      <div className="flex flex-wrap items-end gap-3">
        <CampoEsqueleto className="w-32" etiqueta="w-10" />
        <CampoEsqueleto className="w-64" etiqueta="w-40" />
        <Barra className="mb-3 h-4 w-48" />
      </div>
      <Barra className="h-4 w-44" />
      <ListaEsqueleto filas={7} casilla estado />
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Barra className="h-4 w-44" />
          <Barra className="h-3 w-36" />
        </div>
        <Barra className="h-11 w-full rounded-lg sm:w-44" />
      </div>
    </Cargando>
  )
}
