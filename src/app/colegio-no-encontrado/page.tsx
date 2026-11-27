import type { Metadata } from 'next'
import Marca from '@/components/Marca'
import { CORREO_CONTACTO } from '@/lib/contacto'
import { SIN_INDEXAR, URL_SITIO } from '@/lib/sitio'
import { ui } from '@/lib/ui'

export const metadata: Metadata = { title: 'Colegio no encontrado', robots: SIN_INDEXAR }

// El proxy muestra esta página (con estado 404) cuando la dirección no es de un colegio activo.
// No dice si la dirección está en revisión o fue rechazada.
export default function ColegioNoEncontrado() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex justify-center">
          <a href={URL_SITIO} aria-label="Colectia, ir a la página de inicio">
            <Marca tamano="grande" />
          </a>
        </div>
        <div className={`${ui.tarjeta} flex flex-col gap-3 text-center`}>
          <h1 className={ui.subtitulo}>No encontramos este colegio</h1>
          <p className={ui.textoSecundario}>
            Revisa que la dirección esté bien escrita. Si eres familia, usa el enlace que te envió tu
            colegio.
          </p>
          <a href={`mailto:${CORREO_CONTACTO}`} className={`${ui.enlace} text-sm`}>
            {CORREO_CONTACTO}
          </a>
        </div>
      </div>
    </main>
  )
}
