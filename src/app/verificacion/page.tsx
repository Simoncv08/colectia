import { redirect } from 'next/navigation'
import { cerrarSesion } from '@/app/actions'
import Marca from '@/components/Marca'
import DosPasosCodigo from '@/components/DosPasosCodigo'
import DosPasosConfigurar from '@/components/DosPasosConfigurar'
import DosPasosRecuperacion from '@/components/DosPasosRecuperacion'
import { obtenerAccesoSuperAdmin } from '@/lib/sesionSuperAdmin'
import { ui } from '@/lib/ui'
import type { Metadata } from 'next'
import { SIN_INDEXAR } from '@/lib/sitio'

export const metadata: Metadata = { title: 'Verificación en dos pasos', robots: SIN_INDEXAR }

// Fuera del layout de /admin: ese layout manda aquí al super administrador sin el segundo paso.
export default async function VerificacionPage() {
  const { esSuperAdmin, dosPasos } = await obtenerAccesoSuperAdmin()
  if (!esSuperAdmin) redirect('/')
  if (dosPasos.paso === 'listo') redirect('/inicio')

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex justify-center">
          <Marca tamano="grande" />
        </div>
        <div className={`${ui.tarjeta} flex flex-col gap-4`}>
          {dosPasos.paso === 'configurar' ? (
            <DosPasosConfigurar />
          ) : (
            <>
              <h1 className={ui.subtitulo}>Escribe tu código de verificación</h1>
              <p className={ui.textoSecundario}>Abre tu app de verificación y escribe el código de Colectia.</p>
              <DosPasosCodigo factorId={dosPasos.factor.id} textoBoton="Verificar y entrar" autoFocus />
            </>
          )}
        </div>
        <div className="mt-4 flex flex-col items-center gap-2 text-center">
          {dosPasos.paso === 'verificar' && <DosPasosRecuperacion />}
          <form action={cerrarSesion}>
            <button type="submit" className={ui.botonFantasma}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
