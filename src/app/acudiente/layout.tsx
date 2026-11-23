import { obtenerSesionAcudiente } from '@/lib/sesionAcudiente'
import { estiloPaleta } from '@/lib/paletas'
import NavAcudiente from '@/components/NavAcudiente'
import { cerrarSesion } from '@/app/actions'
import { ui } from '@/lib/ui'
import Marca from '@/components/Marca'

export default async function AcudienteLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesionAcudiente()
  const apariencia = sesion.aparienciaPrincipal

  return (
    <div
      className="min-h-screen bg-fondo"
      style={estiloPaleta(apariencia?.paleta, apariencia?.fondo)}
    >
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Marca className="text-xl" />
              <p className="truncate text-xs text-gray-600">{sesion.nombre}</p>
            </div>
            <form action={cerrarSesion}>
              <button type="submit" className={ui.botonSecundario}>
                Cerrar sesión
              </button>
            </form>
          </div>
          <div className="mt-3">
            <NavAcudiente />
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
