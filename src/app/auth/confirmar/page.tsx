import Link from 'next/link'
import Marca from '@/components/Marca'
import { ui } from '@/lib/ui'
import { confirmarEnlace } from './actions'
import { esTipoEnlace, esTokenValido } from '@/lib/enlacesCorreo'
import type { Metadata } from 'next'
import { SIN_INDEXAR } from '@/lib/sitio'

export const metadata: Metadata = { title: 'Confirmar', robots: SIN_INDEXAR }

const TEXTOS: Record<string, { titulo: string; boton: string }> = {
  email: { titulo: 'Confirma para entrar a Colectia', boton: 'Confirmar y entrar' },
  signup: { titulo: 'Confirma tu correo', boton: 'Confirmar mi correo' },
  magiclink: { titulo: 'Confirma para entrar a Colectia', boton: 'Confirmar y entrar' },
  email_change: { titulo: 'Confirma tu nuevo correo', boton: 'Confirmar el cambio' },
  invite: { titulo: 'Acepta la invitación a Colectia', boton: 'Aceptar y crear contraseña' },
  recovery: { titulo: 'Crea una contraseña nueva', boton: 'Continuar' },
}

// Los enlaces de los correos llegan aquí ({{ .TokenHash }} en las plantillas de
// supabase/correos). Abrir la página no hace nada: el enlace se usa al tocar el botón.
export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>
}) {
  const { token_hash: tokenHash = '', type: tipo = '' } = await searchParams
  const valido = esTokenValido(tokenHash) && esTipoEnlace(tipo)
  const textos = TEXTOS[tipo] ?? TEXTOS.email

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex justify-center">
          <Link href="/" aria-label="Colectia, ir a la página de inicio">
            <Marca tamano="grande" />
          </Link>
        </div>
        <div className={`${ui.tarjeta} flex flex-col gap-4 text-center`}>
          {valido ? (
            <>
              <h1 className={ui.subtitulo}>{textos.titulo}</h1>
              <p className={ui.textoSecundario}>Toca el botón para continuar. El enlace sirve una sola vez.</p>
              <form action={confirmarEnlace}>
                <input type="hidden" name="token_hash" value={tokenHash} />
                <input type="hidden" name="type" value={tipo} />
                <button type="submit" className={`${ui.botonPrimario} w-full`}>
                  {textos.boton}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className={ui.subtitulo}>Este enlace no es válido</h1>
              <p className={ui.textoSecundario}>
                Puede que esté incompleto. Copia el enlace completo del correo o pide uno nuevo.
              </p>
              <Link href="/login" className={`${ui.botonPrimario} w-full`}>
                Ir a iniciar sesión
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
