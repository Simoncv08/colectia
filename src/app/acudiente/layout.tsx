import Link from 'next/link'
import { obtenerSesionAcudiente } from '@/lib/sesionAcudiente'
import { estiloPaleta } from '@/lib/paletas'
import Marca from '@/components/Marca'
import MenuCuenta from '@/components/MenuCuenta'
import CambiarVista from '@/components/CambiarVista'
import PuertaLegal from '@/components/PuertaLegal'
import InvitacionesPendientes from '@/components/InvitacionesPendientes'
import type { Metadata } from 'next'
import { SIN_INDEXAR } from '@/lib/sitio'

export const metadata: Metadata = { robots: SIN_INDEXAR }

export default async function AcudienteLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesionAcudiente()
  const apariencia = sesion.aparienciaPrincipal

  return (
    <div className="min-h-screen bg-fondo" style={estiloPaleta(apariencia?.paleta, apariencia?.fondo)}>
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[640px] items-center justify-between gap-4 px-4 py-2">
          <Link href="/acudiente" className="py-2">
            <Marca />
          </Link>
          <div className="flex items-center gap-1">
            {sesion.personal.length > 0 && <CambiarVista a="institucion" />}
            <MenuCuenta nombre={sesion.nombre} correo={sesion.correo} hrefCuenta="/acudiente/cuenta" hrefInicio="/acudiente" soloIcono={sesion.personal.length > 0} />
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 py-6">
        <PuertaLegal>
          <InvitacionesPendientes />
          {children}
        </PuertaLegal>
      </main>
    </div>
  )
}
