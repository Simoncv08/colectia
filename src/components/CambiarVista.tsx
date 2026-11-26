import Link from 'next/link'
import { School, UsersRound } from 'lucide-react'
import { iconoGrande } from '@/lib/iconos'
import { ui } from '@/lib/ui'

const VISTAS = {
  acudiente: { href: '/acudiente', texto: 'Mis estudiantes', corto: 'Estudiantes', Icono: UsersRound },
  institucion: { href: '/institucion', texto: 'Panel del colegio', corto: 'Colegio', Icono: School },
} as const

// Para quien es personal de un colegio y además acudiente: pasa de un panel al otro.
export default function CambiarVista({ a }: { a: keyof typeof VISTAS }) {
  const { href, texto, corto, Icono } = VISTAS[a]
  return (
    <Link href={href} className={`${ui.botonCompacto} shrink-0`}>
      <Icono {...iconoGrande} />
      <span className="sm:hidden">{corto}</span>
      <span className="hidden sm:inline">{texto}</span>
    </Link>
  )
}
