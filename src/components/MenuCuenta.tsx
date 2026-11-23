import Link from 'next/link'
import { ChevronDown, FileText, House, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { cerrarSesion } from '@/app/actions'
import MenuDesplegable from '@/components/MenuDesplegable'
import { DOCUMENTOS_LEGALES } from '@/lib/legal'
import { icono, iconoGrande } from '@/lib/iconos'
import { ui } from '@/lib/ui'

const enlaceMenu =
  'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900'

// Menú de cuenta de la barra superior, igual para todos los roles: Mi cuenta, términos,
// privacidad y cerrar sesión. Con soloIcono, en celular el botón muestra solo el ícono.
export default function MenuCuenta({
  nombre,
  correo,
  hrefCuenta,
  hrefInicio,
  soloIcono = false,
}: {
  nombre: string
  correo: string
  hrefCuenta: string
  hrefInicio?: string
  soloIcono?: boolean
}) {
  const primerNombre = nombre.split(' ')[0] || 'Mi cuenta'
  return (
    <MenuDesplegable
      etiqueta={`Menú de la cuenta de ${nombre}`}
      className="w-64"
      boton={
        <>
          <UserRound {...iconoGrande} />
          <span className={`max-w-[9rem] truncate ${soloIcono ? 'hidden sm:inline' : ''}`}>{primerNombre}</span>
          <ChevronDown {...icono} className={soloIcono ? 'hidden sm:block' : ''} />
        </>
      }
    >
      <p className="truncate px-3 pb-2 pt-1 text-[13px] text-gray-600">{correo}</p>
      {hrefInicio && (
        <Link href={hrefInicio} className={enlaceMenu}>
          <House {...iconoGrande} />
          Inicio
        </Link>
      )}
      <Link href={hrefCuenta} className={enlaceMenu}>
        <UserRound {...iconoGrande} />
        Mi cuenta
      </Link>
      <div className="mt-1 border-t border-gray-200 pt-1">
        <Link href={DOCUMENTOS_LEGALES.terminos.ruta} className={enlaceMenu}>
          <FileText {...iconoGrande} />
          {DOCUMENTOS_LEGALES.terminos.titulo}
        </Link>
        <Link href={DOCUMENTOS_LEGALES.privacidad.ruta} className={enlaceMenu}>
          <ShieldCheck {...iconoGrande} />
          {DOCUMENTOS_LEGALES.privacidad.titulo}
        </Link>
      </div>
      <form action={cerrarSesion} className="mt-1 border-t border-gray-200 pt-1">
        <button type="submit" className={`${ui.botonFantasma} w-full justify-start text-gray-700`}>
          <LogOut {...iconoGrande} />
          Cerrar sesión
        </button>
      </form>
    </MenuDesplegable>
  )
}
