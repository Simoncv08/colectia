import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FormularioLogin from './FormularioLogin'
import Marca from '@/components/Marca'
import { ui } from '@/lib/ui'
import { CORREO_CONTACTO } from '@/lib/contacto'
import { estiloPaleta } from '@/lib/paletas'
import { zonaActual } from '@/lib/zonaServidor'
import { SIN_INDEXAR } from '@/lib/sitio'

// Se entra por la dirección de cada colegio; esta página no va a buscadores.
export const metadata: Metadata = { title: 'Entrar', robots: SIN_INDEXAR }

// /login?modo=registro abre directamente "Crear cuenta" (lo usa la página de inicio).
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ modo?: string }> }) {
  const { modo } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  // En la dirección de un colegio se ve su nombre y sus colores, y ahí se crean las cuentas.
  const { tipo, colegio } = await zonaActual()
  const subtitulo = colegio
    ? `Pagos escolares de ${colegio.nombre}`
    : tipo === 'admin'
      ? 'Administración de Colectia'
      : 'Pagos escolares claros para familias y colegios.'

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10"
      style={colegio ? estiloPaleta(colegio.paleta, colegio.fondo) : undefined}
    >
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <h1>
            <Link href="/" aria-label="Colectia, ir a la página de inicio">
              <Marca tamano="grande" />
            </Link>
          </h1>
          <p className={ui.textoSecundario}>{subtitulo}</p>
        </div>
        <div className={ui.tarjeta}>
          <FormularioLogin
            modoInicial={modo === 'registro' ? 'registro' : 'entrar'}
            permitirRegistro={Boolean(colegio)}
          />
        </div>
        <p className="mt-4 text-center text-[13px] text-gray-600">
          Al usar Colectia aceptas los{' '}
          <Link href="/terminos" className={ui.enlace}>
            términos y condiciones
          </Link>{' '}
          y la{' '}
          <Link href="/privacidad" className={ui.enlace}>
            política de privacidad
          </Link>
          .
        </p>
        <p className="mt-2 text-center text-[13px] text-gray-600">
          ¿Problemas para entrar? Escríbenos a{' '}
          <a href={`mailto:${CORREO_CONTACTO}`} className={ui.enlace}>
            {CORREO_CONTACTO}
          </a>
          .
        </p>
      </div>
    </main>
  )
}
