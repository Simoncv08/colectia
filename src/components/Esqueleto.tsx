import type { ReactNode } from 'react'
import { ui } from '@/lib/ui'

// Piezas para armar el esqueleto de cada página (su loading.tsx) con las mismas formas que el
// contenido real: tarjetas blancas con borde, filas de lista, campos y botones. Cada página tiene el
// suyo; si cambias una página, ajusta también su esqueleto (DESIGN.md).

const pulso = 'motion-safe:animate-pulse'

// Una línea de texto o un número. El ancho y el alto se pasan con clases.
export function Barra({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block max-w-full rounded bg-gray-200 ${pulso} ${className}`} />
}

export function Cargando({
  texto,
  children,
  className = 'flex flex-col gap-6',
}: {
  texto: string
  children: ReactNode
  className?: string
}) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{texto}</span>
      {children}
    </div>
  )
}

// Un botón normal (44 px). En celular ocupa todo el ancho si está en la cabecera.
export function BotonEsqueleto({ className = 'w-full sm:w-40' }: { className?: string }) {
  return <span aria-hidden="true" className={`block h-11 rounded-lg bg-gray-200 ${pulso} ${className}`} />
}

// Un campo con su etiqueta encima.
export function CampoEsqueleto({ className = '', etiqueta = 'w-20' }: { className?: string; etiqueta?: string }) {
  return (
    <div aria-hidden="true" className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <Barra className={`h-3 ${etiqueta}`} />
      <span className="block h-11 w-full rounded-md border border-gray-200 bg-white" />
    </div>
  )
}

// Título de la página, con el enlace de volver, la descripción y los botones de la derecha.
export function CabeceraEsqueleto({
  volver = false,
  subtitulo = true,
  botones = 0,
}: {
  volver?: boolean
  subtitulo?: boolean
  botones?: number
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        {volver && <Barra className="h-4 w-20" />}
        <Barra className="h-7 w-44 sm:w-56" />
        {subtitulo && <Barra className="h-4 w-64" />}
      </div>
      {botones > 0 && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {Array.from({ length: botones }, (_, i) => (
            <BotonEsqueleto key={i} />
          ))}
        </div>
      )}
    </div>
  )
}

// Igual a TarjetaDato: etiqueta y cifra grande.
export function TarjetaDatoEsqueleto({ ancho = false }: { ancho?: boolean }) {
  return (
    <div className={`${ui.tarjeta} flex flex-col gap-3 ${ancho ? 'col-span-2 sm:col-span-1' : ''}`}>
      <Barra className="h-3.5 w-24" />
      <Barra className="h-8 w-28" />
    </div>
  )
}

// Igual a las listas de personas (ui.filaLista): nombre, detalle en celular y la acción a la
// derecha; con casilla, como el cobro por salón.
export function ListaEsqueleto({
  filas = 6,
  accion = false,
  casilla = false,
  estado = false,
}: {
  filas?: number
  accion?: boolean
  casilla?: boolean
  estado?: boolean
}) {
  return (
    <div className={`${ui.contenedorTabla} overflow-hidden`}>
      <div className="hidden h-11 border-b border-gray-200 bg-gray-100 sm:block" />
      <div className="divide-y divide-gray-200">
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            {casilla && <Barra className="h-5 w-5 shrink-0 rounded-md" />}
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
              <Barra className={`h-4 ${i % 3 === 0 ? 'w-52' : i % 3 === 1 ? 'w-40' : 'w-44'}`} />
              {estado ? (
                <Barra className="h-6 w-24 rounded-full" />
              ) : (
                <>
                  <Barra className="h-3 w-28 sm:hidden" />
                  <Barra className="hidden h-4 w-16 sm:block" />
                  <Barra className="hidden h-4 w-10 sm:block" />
                </>
              )}
            </div>
            {accion && <Barra className="h-4 w-12 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  )
}

// Una tarjeta blanca con borde, como ui.tarjeta.
export function TarjetaEsqueleto({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${ui.tarjeta} ${className}`}>{children}</div>
}
