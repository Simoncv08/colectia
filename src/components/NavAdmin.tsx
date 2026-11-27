'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, FileText } from 'lucide-react'
import { iconoGrande } from '@/lib/iconos'
import { ui } from '@/lib/ui'

const PESTANAS = [
  { href: '/inicio', etiqueta: 'Instituciones', Icono: Building2 },
  { href: '/legal', etiqueta: 'Términos y privacidad', Icono: FileText },
]

// Pestañas del super administrador, debajo de la barra superior.
export default function NavAdmin() {
  const ruta = usePathname()
  return (
    <nav aria-label="Secciones" className={`${ui.pestanas} border-b-0`}>
      {PESTANAS.map(({ href, etiqueta, Icono }) => {
        const activa = ruta === href || ruta.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? 'page' : undefined}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm ${
              activa ? 'border-primario font-semibold text-primario' : 'border-transparent text-gray-700 hover:text-gray-900'
            }`}
          >
            <Icono {...iconoGrande} />
            {etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}
