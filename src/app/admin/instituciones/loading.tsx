import { BotonEsqueleto, CabeceraEsqueleto, Cargando, CampoEsqueleto, ListaEsqueleto, TarjetaEsqueleto } from '@/components/Esqueleto'

// Instituciones del super administrador: crear una y la lista.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando las instituciones…">
      <CabeceraEsqueleto />
      <TarjetaEsqueleto className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CampoEsqueleto etiqueta="w-16" />
        <CampoEsqueleto etiqueta="w-28" />
        <CampoEsqueleto etiqueta="w-12" />
        <BotonEsqueleto className="w-44" />
      </TarjetaEsqueleto>
      <ListaEsqueleto filas={4} estado />
    </Cargando>
  )
}
