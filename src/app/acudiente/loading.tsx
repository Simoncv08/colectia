import {
  BotonEsqueleto,
  Barra,
  Cargando,
  TarjetaEsqueleto,
} from '@/components/Esqueleto'

// Inicio del acudiente: saludo de color, tarjetas de actividad y "Mis estudiantes".
export default function CargandoPagina() {
  return (
    <Cargando texto="Cargando tus estudiantes y actividades…">
      <div className="flex flex-col gap-2.5 rounded-xl bg-primario px-5 py-5 shadow-xs sm:px-6">
        <span className="block h-7 w-36 rounded bg-white/30 motion-safe:animate-pulse" />
        <span className="block h-4 w-64 max-w-full rounded bg-white/25 motion-safe:animate-pulse" />
      </div>
      <div className="flex flex-col gap-4">
        <Barra className="h-5 w-28" />
        {[0, 1].map((i) => (
          <TarjetaEsqueleto key={i} className="flex flex-col gap-4 overflow-hidden">
            <div className="-mx-4 -mt-4 h-1.5 bg-primario sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6" />
            <div className="flex items-start gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Barra className="h-5 w-44" />
                <Barra className="h-3.5 w-36" />
              </div>
              <span className="block h-12 w-24 shrink-0 rounded-lg bg-primario-suave motion-safe:animate-pulse" />
            </div>
            <Barra className="h-4 w-60" />
            <BotonEsqueleto className="w-full" />
          </TarjetaEsqueleto>
        ))}
      </div>
      <TarjetaEsqueleto className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Barra className="h-5 w-36" />
          <BotonEsqueleto className="w-28 sm:w-48" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="block h-10 w-10 shrink-0 rounded-full bg-primario-suave motion-safe:animate-pulse" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Barra className="h-4 w-40" />
              <Barra className="h-3 w-52" />
            </div>
          </div>
        ))}
      </TarjetaEsqueleto>
    </Cargando>
  )
}
