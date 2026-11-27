import type { Metadata } from 'next'
import Marca from '@/components/Marca'
import { cerrarSesion } from '@/app/actions'
import { SIN_INDEXAR } from '@/lib/sitio'
import { ui } from '@/lib/ui'

export const metadata: Metadata = { title: 'Tu cuenta no tiene colegio', robots: SIN_INDEXAR }

// Para una cuenta que todavía no es de ningún colegio y entró por www.colectia.co.
export default function SinColegio() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex justify-center">
          <Marca tamano="grande" />
        </div>
        <div className={`${ui.tarjeta} flex flex-col gap-3 text-center`}>
          <h1 className={ui.subtitulo}>Tu cuenta todavía no es de ningún colegio</h1>
          <p className={ui.textoSecundario}>
            En Colectia cada colegio tiene su propia dirección. Entra con el enlace que te envió tu
            colegio y tu cuenta quedará en él.
          </p>
          <form action={cerrarSesion}>
            <button type="submit" className={`${ui.botonSecundario} w-full`}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
