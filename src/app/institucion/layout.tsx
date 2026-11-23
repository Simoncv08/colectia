import Link from 'next/link'
import { LogOut, Menu } from 'lucide-react'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { estiloPaleta } from '@/lib/paletas'
import { cerrarSesion } from '@/app/actions'
import NavInstitucion from '@/components/NavInstitucion'
import MenuDesplegable from '@/components/MenuDesplegable'
import Marca from '@/components/Marca'
import EstadoInstitucion from '@/components/EstadoInstitucion'
import { iconoGrande } from '@/lib/iconos'
import { ProveedorSoloLectura } from '@/components/SoloLectura'
import { ui } from '@/lib/ui'

function BotonCerrarSesion() {
  return (
    <form action={cerrarSesion}>
      <button type="submit" className={`${ui.botonFantasma} w-full justify-start text-gray-700`}>
        <LogOut {...iconoGrande} />
        Cerrar sesión
      </button>
    </form>
  )
}

export default async function InstitucionLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesionInstitucion()

  if (!sesion) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className={ui.subtitulo}>No tienes permiso para ver el panel de institución</h1>
        <p className={ui.textoSecundario}>
          Esta cuenta no es parte del personal de ninguna institución. Si eres acudiente,{' '}
          <Link href="/acudiente" className={ui.enlace}>
            ve a tus estudiantes
          </Link>
          .
        </p>
        <form action={cerrarSesion}>
          <button type="submit" className={ui.botonSecundario}>
            Cerrar sesión
          </button>
        </form>
      </main>
    )
  }

  const rol = sesion.esAdmin ? 'Administrador' : 'Recaudador'
  const { nombre, estado } = sesion.institucion

  return (
    <div
      className="min-h-screen bg-fondo lg:flex"
      style={estiloPaleta(sesion.institucion.paleta, sesion.institucion.fondo)}
    >
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
        <Link href="/institucion" className="px-5 py-5">
          <Marca />
        </Link>
        <div className="flex-1 overflow-y-auto px-3">
          <NavInstitucion esAdmin={sesion.esAdmin} />
        </div>
        <div className="border-t border-gray-200 p-3">
          <p className="truncate px-3 pb-1 text-[13px] text-gray-600">{sesion.correo}</p>
          <BotonCerrarSesion />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 lg:hidden">
          <Link href="/institucion" className="py-2">
            <Marca />
          </Link>
          <MenuDesplegable
            boton={
              <>
                <Menu {...iconoGrande} />
                Menú
              </>
            }
            etiqueta="Abrir menú"
            className="w-64"
          >
            <NavInstitucion esAdmin={sesion.esAdmin} />
            <div className="mt-2 border-t border-gray-200 pt-2">
              <p className="truncate px-3 pb-1 text-[13px] text-gray-600">{sesion.correo}</p>
              <BotonCerrarSesion />
            </div>
          </MenuDesplegable>
        </header>

        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:py-8">
          <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-[15px] font-semibold text-gray-900">{nombre}</p>
            <EstadoInstitucion estado={estado} />
            <p className="text-[13px] text-gray-600">{rol}</p>
          </div>
          {(estado === 'suspendida' || estado === 'cancelada') && (
            <p className={`${ui.avisoRojo} mb-6`}>
              Esta institución está {estado}. Puedes consultar la información, pero no crear ni
              modificar registros.
            </p>
          )}
          <main>
            <ProveedorSoloLectura activo={estado === 'suspendida' || estado === 'cancelada'}>
              {children}
            </ProveedorSoloLectura>
          </main>
        </div>
      </div>
    </div>
  )
}
