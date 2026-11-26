import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { icono } from '@/lib/iconos'

// Un bloque que se abre y se cierra ("Ver por curso", "Ver como tabla"), con 44 px para tocarlo.
export default function InformeDesplegable({
  titulo,
  abierto = false,
  className = '',
  children,
}: {
  titulo: string
  abierto?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <details className={`group ${className}`} open={abierto}>
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primario">
        <ChevronRight {...icono} className="transition-transform duration-200 group-open:rotate-90" />
        {titulo}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  )
}
