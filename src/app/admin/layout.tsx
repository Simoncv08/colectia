import Link from 'next/link'
import { cerrarSesion } from '@/app/actions'
import { obtenerSesionSuperAdmin } from '@/lib/sesionSuperAdmin'
import Marca from '@/components/Marca'
import MenuCuenta from '@/components/MenuCuenta'
import NavAdmin from '@/components/NavAdmin'
import PuertaLegal from '@/components/PuertaLegal'
import { ui } from '@/lib/ui'
import type { Metadata } from 'next'
import { SIN_INDEXAR } from '@/lib/sitio'

export const metadata: Metadata = { robots: SIN_INDEXAR }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesionSuperAdmin()

  if (!sesion) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className={ui.subtitulo}>No tienes permiso para ver esta página</h1>
        <p className={ui.textoSecundario}>Esta sección es solo para la administración de la plataforma.</p>
        <form action={cerrarSesion}>
          <button type="submit" className={ui.botonSecundario}>
            Cerrar sesión
          </button>
        </form>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-fondo">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link href="/admin/instituciones" className="flex items-center gap-3 py-2">
            <Marca />
            <span className="hidden text-[13px] text-gray-600 sm:inline">Administración de la plataforma</span>
          </Link>
          <MenuCuenta nombre={sesion.nombre} correo={sesion.correo} hrefCuenta="/admin/cuenta" soloIcono />
        </div>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <NavAdmin />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 text-gray-900 sm:px-6 lg:py-8">
        <PuertaLegal>{children}</PuertaLegal>
      </main>
    </div>
  )
}
