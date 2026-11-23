import Link from 'next/link'
import { ChevronDown, House, LogOut, UserRound } from 'lucide-react'
import { obtenerSesionAcudiente } from '@/lib/sesionAcudiente'
import { estiloPaleta } from '@/lib/paletas'
import { cerrarSesion } from '@/app/actions'
import MenuDesplegable from '@/components/MenuDesplegable'
import Marca from '@/components/Marca'
import { icono, iconoGrande } from '@/lib/iconos'
import { ui } from '@/lib/ui'

const enlaceMenu =
  'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900'

export default async function AcudienteLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesionAcudiente()
  const apariencia = sesion.aparienciaPrincipal
  const primerNombre = sesion.persona.nombres.split(' ')[0] || 'Mi cuenta'

  return (
    <div className="min-h-screen bg-fondo" style={estiloPaleta(apariencia?.paleta, apariencia?.fondo)}>
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[640px] items-center justify-between gap-4 px-4 py-2">
          <Link href="/acudiente" className="py-2">
            <Marca />
          </Link>
          <MenuDesplegable
            etiqueta={`Menú de ${sesion.nombre}`}
            className="w-60"
            boton={
              <>
                <UserRound {...iconoGrande} />
                <span className="max-w-[9rem] truncate">{primerNombre}</span>
                <ChevronDown {...icono} />
              </>
            }
          >
            <p className="truncate px-3 pb-2 pt-1 text-[13px] text-gray-600">{sesion.correo}</p>
            <Link href="/acudiente" className={enlaceMenu}>
              <House {...iconoGrande} />
              Inicio
            </Link>
            <Link href="/acudiente/cuenta" className={enlaceMenu}>
              <UserRound {...iconoGrande} />
              Mi cuenta
            </Link>
            <form action={cerrarSesion} className="mt-1 border-t border-gray-200 pt-1">
              <button type="submit" className={`${ui.botonFantasma} w-full justify-start text-gray-700`}>
                <LogOut {...iconoGrande} />
                Cerrar sesión
              </button>
            </form>
          </MenuDesplegable>
        </div>
      </header>
      <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 py-6">{children}</main>
    </div>
  )
}
