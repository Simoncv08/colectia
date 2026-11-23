import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { icono } from '@/lib/iconos'
import { ui } from '@/lib/ui'

// "1–50 de 312" con anterior y siguiente. hrefPagina arma el enlace conservando los filtros.
export default function Paginacion({
  total,
  pagina,
  porPagina,
  hrefPagina,
}: {
  total: number
  pagina: number
  porPagina: number
  hrefPagina: (pagina: number) => string
}) {
  if (total <= porPagina) return null
  const desde = (pagina - 1) * porPagina + 1
  const hasta = Math.min(pagina * porPagina, total)
  const ultima = Math.ceil(total / porPagina)

  return (
    <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
      <p>
        <span className="font-semibold text-gray-900">
          {desde}–{hasta}
        </span>{' '}
        de {total}
      </p>
      <div className="flex gap-2">
        {pagina > 1 ? (
          <Link href={hrefPagina(pagina - 1)} className={ui.botonCompacto}>
            <ChevronLeft {...icono} />
            Anterior
          </Link>
        ) : (
          <span aria-disabled="true" className={`${ui.botonCompacto} opacity-50`}>
            <ChevronLeft {...icono} />
            Anterior
          </span>
        )}
        {pagina < ultima ? (
          <Link href={hrefPagina(pagina + 1)} className={ui.botonCompacto}>
            Siguiente
            <ChevronRight {...icono} />
          </Link>
        ) : (
          <span aria-disabled="true" className={`${ui.botonCompacto} opacity-50`}>
            Siguiente
            <ChevronRight {...icono} />
          </span>
        )}
      </div>
    </nav>
  )
}
