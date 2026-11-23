import { BotonEsqueleto, Barra, CabeceraEsqueleto, Cargando, TarjetaEsqueleto } from '@/components/Esqueleto'

// Términos y privacidad del super administrador: pestañas, versión vigente, editor e historial.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando los documentos…">
      <CabeceraEsqueleto />
      <div className="flex gap-6 border-b border-gray-200 pb-3 pt-2">
        <Barra className="h-4 w-40" />
        <Barra className="h-4 w-36" />
      </div>
      <TarjetaEsqueleto className="flex flex-col gap-3">
        <Barra className="h-5 w-32" />
        <Barra className="h-4 w-64" />
        <Barra className="h-3.5 w-52" />
      </TarjetaEsqueleto>
      <TarjetaEsqueleto className="flex flex-col gap-4">
        <Barra className="h-5 w-56" />
        <span className="block h-80 rounded-md border border-gray-200 bg-white" />
        <BotonEsqueleto className="w-full sm:w-44" />
      </TarjetaEsqueleto>
    </Cargando>
  )
}
