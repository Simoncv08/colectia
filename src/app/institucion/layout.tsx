import Link from 'next/link'
import { obtenerSesionInstitucion } from '@/lib/sesionInstitucion'
import { estiloPaleta } from '@/lib/paletas'
import NavInstitucion from '@/components/NavInstitucion'
import { cerrarSesion } from '@/app/actions'
import { ui } from '@/lib/ui'
import Marca from '@/components/Marca'

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

  return (
    <div
      className="min-h-screen bg-fondo"
      style={estiloPaleta(sesion.institucion.paleta, sesion.institucion.fondo)}
    >
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex min-w-0 items-baseline gap-2 text-lg">
                <Marca />
                <span aria-hidden="true" className="text-gray-300">
                  /
                </span>
                <span className="truncate font-semibold text-gray-900">{sesion.institucion.nombre}</span>
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="truncate">
                  {sesion.esAdmin ? 'Administrador' : 'Recaudador'} · {sesion.correo}
                </span>
                {sesion.institucion.estado && sesion.institucion.estado !== 'activa' && (
                  <span className={`${ui.pildora} ${ui.estadoPendiente}`}>
                    Institución {sesion.institucion.estado.replace('_', ' ')}
                  </span>
                )}
              </p>
            </div>
            <form action={cerrarSesion}>
              <button type="submit" className={ui.botonSecundario}>
                Cerrar sesión
              </button>
            </form>
          </div>
          <div className="mt-3">
            <NavInstitucion esAdmin={sesion.esAdmin} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
