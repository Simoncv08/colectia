'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  ChartColumn,
  GraduationCap,
  History,
  House,
  Layers,
  LayoutGrid,
  Palette,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { iconoGrande } from '@/lib/iconos'

type Pestana = { href: string; etiqueta: string; Icono: LucideIcon; soloAdmin?: boolean }

const PESTANAS: Pestana[] = [
  { href: '/admin', etiqueta: 'Inicio', Icono: House },
  { href: '/admin/eventos', etiqueta: 'Eventos', Icono: CalendarDays },
  { href: '/admin/estudiantes', etiqueta: 'Estudiantes', Icono: GraduationCap },
  { href: '/admin/grados', etiqueta: 'Cursos', Icono: Layers },
  { href: '/admin/reportes', etiqueta: 'Reportes', Icono: ChartColumn, soloAdmin: true },
  { href: '/admin/personal', etiqueta: 'Personal', Icono: Users, soloAdmin: true },
  { href: '/admin/actividad', etiqueta: 'Actividad', Icono: History, soloAdmin: true },
  { href: '/admin/personalizacion', etiqueta: 'Personalización', Icono: Palette, soloAdmin: true },
  { href: '/admin/modulos', etiqueta: 'Módulos', Icono: LayoutGrid, soloAdmin: true },
]

// Navegación del personal, en columna: en la barra lateral y en el menú del celular.
export default function NavInstitucion({ esAdmin }: { esAdmin: boolean }) {
  const ruta = usePathname()

  function activa(href: string) {
    return href === '/admin' ? ruta === href : ruta === href || ruta.startsWith(`${href}/`)
  }

  return (
    <nav aria-label="Secciones">
      <ul className="flex flex-col gap-1">
        {PESTANAS.filter((p) => esAdmin || !p.soloAdmin).map(({ href, etiqueta, Icono }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={activa(href) ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-[120ms] ${
                activa(href)
                  ? 'bg-primario-suave font-semibold text-primario'
                  : 'font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icono {...iconoGrande} />
              {etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
