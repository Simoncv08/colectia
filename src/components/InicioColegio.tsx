import Link from 'next/link'
import Marca from '@/components/Marca'
import { estiloPaleta } from '@/lib/paletas'
import { ui } from '@/lib/ui'
import type { ColegioDeLaDireccion } from '@/lib/zona'

// La entrada de cada colegio (lcp.colectia.co sin sesión): su nombre y sus colores.
export default function InicioColegio({ colegio }: { colegio: ColegioDeLaDireccion }) {
  const suspendido = colegio.estado === 'suspendida'
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10"
      style={estiloPaleta(colegio.paleta, colegio.fondo)}
    >
      <div className="flex w-full max-w-[420px] flex-col gap-6">
        <div className={`${ui.tarjeta} flex flex-col gap-4 text-center`}>
          <div className="-mx-4 -mt-4 h-1.5 rounded-t-xl bg-primario sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-gray-900">{colegio.nombre}</h1>
            <p className={ui.textoSecundario}>Actividades y pagos escolares</p>
          </div>
          {suspendido && (
            <p className={ui.avisoAmbar}>
              El colegio no tiene Colectia activo en este momento. El personal puede entrar para
              consultar y descargar su información.
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Link href="/login" className={`${ui.botonPrimario} w-full`}>
              Entrar
            </Link>
            {!suspendido && (
              <Link href="/login?modo=registro" className={`${ui.botonSecundario} w-full`}>
                Crear mi cuenta
              </Link>
            )}
          </div>
          <p className="text-[13px] text-gray-600">
            Si eres del personal del colegio, entra con el correo donde recibiste la invitación.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-[13px] text-gray-600">
          Con
          <Marca />
        </div>
      </div>
    </main>
  )
}
