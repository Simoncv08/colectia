import Link from 'next/link'
import { Menu } from 'lucide-react'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { estiloPaleta } from '@/lib/paletas'
import { cerrarSesion } from '@/app/actions'
import NavInstitucion from '@/components/NavInstitucion'
import MenuDesplegable from '@/components/MenuDesplegable'
import Marca from '@/components/Marca'
import EstadoInstitucion from '@/components/EstadoInstitucion'
import { iconoGrande } from '@/lib/iconos'
import { ProveedorSoloLectura } from '@/components/SoloLectura'
import MenuCuenta from '@/components/MenuCuenta'
import CambiarVista from '@/components/CambiarVista'
import PuertaLegal from '@/components/PuertaLegal'
import InvitacionesPendientes from '@/components/InvitacionesPendientes'
import { ui } from '@/lib/ui'
import type { Metadata } from 'next'
import { SIN_INDEXAR } from '@/lib/sitio'

export const metadata: Metadata = { robots: SIN_INDEXAR }

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
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <NavInstitucion esAdmin={sesion.esAdmin} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Barra superior: en celular, la marca, la cuenta y el menú de secciones; en computador,
            la institución con su estado y rol, y la cuenta. */}
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between gap-2 px-4 py-2 sm:px-6">
            <Link href="/institucion" className="py-2 lg:hidden">
              <Marca />
            </Link>
            <div className="hidden min-w-0 flex-wrap items-center gap-x-3 gap-y-1 lg:flex">
              <p className="truncate text-[15px] font-semibold text-gray-900">{nombre}</p>
              <EstadoInstitucion estado={estado} />
              <p className="text-[13px] text-gray-600">{rol}</p>
            </div>
            <div className="flex items-center gap-1">
              <CambiarVista a="acudiente" />
              <MenuCuenta nombre={sesion.nombre} correo={sesion.correo} hrefCuenta="/institucion/cuenta" soloIcono />
              <div className="lg:hidden">
                <MenuDesplegable
                  boton={
                    <>
                      <Menu {...iconoGrande} />
                      Menú
                    </>
                  }
                  etiqueta="Abrir el menú de secciones"
                  className="w-64"
                >
                  <NavInstitucion esAdmin={sesion.esAdmin} />
                </MenuDesplegable>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:py-8">
          <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 lg:hidden">
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
          <main className="flex flex-col gap-6">
            <ProveedorSoloLectura activo={estado === 'suspendida' || estado === 'cancelada'}>
              <PuertaLegal>
                <InvitacionesPendientes />
                {children}
              </PuertaLegal>
            </ProveedorSoloLectura>
          </main>
        </div>
      </div>
    </div>
  )
}
