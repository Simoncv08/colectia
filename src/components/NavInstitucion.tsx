'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Pestana = { href: string; etiqueta: string; soloAdmin?: boolean }

const PESTANAS: Pestana[] = [
  { href: '/institucion', etiqueta: 'Inicio' },
  { href: '/institucion/eventos', etiqueta: 'Eventos' },
  { href: '/institucion/estudiantes', etiqueta: 'Estudiantes' },
  { href: '/institucion/grados', etiqueta: 'Cursos' },
  { href: '/institucion/personal', etiqueta: 'Personal', soloAdmin: true },
  { href: '/institucion/reportes', etiqueta: 'Reportes', soloAdmin: true },
  { href: '/institucion/actividad', etiqueta: 'Actividad', soloAdmin: true },
  { href: '/institucion/personalizacion', etiqueta: 'Personalización', soloAdmin: true },
]

export default function NavInstitucion({ esAdmin }: { esAdmin: boolean }) {
  const ruta = usePathname()

  function activa(href: string) {
    return href === '/institucion' ? ruta === href : ruta === href || ruta.startsWith(`${href}/`)
  }

  return (
    <nav aria-label="Secciones" className="-mb-px flex gap-1 overflow-x-auto">
      {PESTANAS.filter((p) => esAdmin || !p.soloAdmin).map((p) => (
        <Link
          key={p.href}
          href={p.href}
          aria-current={activa(p.href) ? 'page' : undefined}
          className={`inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm ${
            activa(p.href)
              ? 'border-primario font-semibold text-primario'
              : 'border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900'
          }`}
        >
          {p.etiqueta}
        </Link>
      ))}
    </nav>
  )
}
