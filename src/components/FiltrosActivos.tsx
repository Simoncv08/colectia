import Link from 'next/link'
import { X } from 'lucide-react'
import { icono } from '@/lib/iconos'
import { ui } from '@/lib/ui'

export type FiltroActivo = { etiqueta: string; hrefQuitar: string }

// Los filtros aplicados como chips que se pueden quitar uno por uno (DESIGN.md 4.6).
export default function FiltrosActivos({ filtros, hrefLimpiar }: { filtros: FiltroActivo[]; hrefLimpiar: string }) {
  if (!filtros.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] font-medium text-gray-600">Filtros:</span>
      {filtros.map((f) => (
        <Link
          key={f.etiqueta}
          href={f.hrefQuitar}
          scroll={false}
          aria-label={`Quitar el filtro ${f.etiqueta}`}
          className={`${ui.chip} min-h-9 hover:bg-white`}
        >
          {f.etiqueta}
          <X {...icono} />
        </Link>
      ))}
      {filtros.length > 1 && (
        <Link href={hrefLimpiar} scroll={false} className={`${ui.enlace} text-sm`}>
          Limpiar filtros
        </Link>
      )}
    </div>
  )
}
