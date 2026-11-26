import Link from 'next/link'
import Marca from '@/components/Marca'
import { CORREO_CONTACTO } from '@/lib/contacto'
import { ui } from '@/lib/ui'

export const metadata = { title: 'Página no encontrada' }

export default function NoEncontrada() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex justify-center">
          <Link href="/" aria-label="Colectia, ir a la página de inicio">
            <Marca tamano="grande" />
          </Link>
        </div>
        <div className={`${ui.tarjeta} flex flex-col gap-3 text-center`}>
          <p className="text-sm font-semibold text-gray-600">Error 404</p>
          <h1 className={ui.subtitulo}>No encontramos esta página</h1>
          <p className={ui.textoSecundario}>
            Puede que el enlace esté incompleto o que la página ya no exista. Si llegaste aquí desde un
            botón de Colectia, cuéntanos para revisarlo.
          </p>
          <Link href="/" className={`${ui.botonPrimario} mt-2 w-full`}>
            Ir al inicio
          </Link>
          <a href={`mailto:${CORREO_CONTACTO}`} className={`${ui.enlace} text-sm`}>
            {CORREO_CONTACTO}
          </a>
        </div>
      </div>
    </main>
  )
}
