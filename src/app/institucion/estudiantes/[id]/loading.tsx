import {
  BotonEsqueleto,
  Barra,
  CabeceraEsqueleto,
  Cargando,
  CampoEsqueleto,
  TarjetaEsqueleto,
} from '@/components/Esqueleto'

// Ficha de un estudiante: el formulario y la zona para eliminarlo.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando el estudiante…" className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <CabeceraEsqueleto volver subtitulo={false} />
      <TarjetaEsqueleto className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <CampoEsqueleto key={i} etiqueta={i % 2 ? 'w-20' : 'w-28'} />
        ))}
        <BotonEsqueleto className="w-40 sm:col-span-2" />
      </TarjetaEsqueleto>
      <TarjetaEsqueleto className="flex flex-col gap-3">
        <Barra className="h-5 w-40" />
        <Barra className="h-4 w-full sm:w-96" />
        <BotonEsqueleto className="w-44" />
      </TarjetaEsqueleto>
    </Cargando>
  )
}
