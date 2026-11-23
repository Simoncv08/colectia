import {
  BotonEsqueleto,
  Barra,
  CabeceraEsqueleto,
  Cargando,
  TarjetaEsqueleto,
} from '@/components/Esqueleto'

// Configuración de un evento: datos, a quién va dirigido y productos.
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando el evento…">
      <CabeceraEsqueleto volver />
      {[3, 2, 2].map((lineas, i) => (
        <TarjetaEsqueleto key={i} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Barra className="h-5 w-36" />
              {i > 0 && <Barra className="h-3 w-60" />}
            </div>
            <BotonEsqueleto className="w-full sm:w-36" />
          </div>
          <div className="flex flex-col gap-3">
            {Array.from({ length: lineas }, (_, j) => (
              <Barra key={j} className={`h-4 ${j % 2 ? 'w-40' : 'w-64'}`} />
            ))}
          </div>
        </TarjetaEsqueleto>
      ))}
    </Cargando>
  )
}
