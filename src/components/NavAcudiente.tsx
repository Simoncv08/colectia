'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PESTANAS = [
  { href: '/acudiente', etiqueta: 'Inicio' },
  { href: '/acudiente/cuenta', etiqueta: 'Mi cuenta' },
]

export default function NavAcudiente() {
  const ruta = usePathname()

  return (
    <nav aria-label="Secciones" className="-mb-px flex gap-1">
      {PESTANAS.map((p) => {
        const activa =
          p.href === '/acudiente' ? ruta === p.href : ruta === p.href || ruta.startsWith(`${p.href}/`)
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={activa ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm ${
              activa
                ? 'border-primario font-semibold text-primario'
                : 'border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900'
            }`}
          >
            {p.etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}
