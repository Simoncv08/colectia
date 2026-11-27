import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import Marca from '@/components/Marca'
import { createClient } from '@/lib/supabase/server'
import { ui } from '@/lib/ui'
import FormularioRegistro from './FormularioRegistro'

export const metadata: Metadata = {
  title: 'Registra tu colegio',
  description:
    'Registra tu colegio en Colectia y pruébalo gratis: actividades, cobro por salón y reportes del recaudo, con la dirección propia de tu colegio.',
  alternates: { canonical: '/registro' },
}

export default async function RegistroPage() {
  const supabase = await createClient()
  const [{ data: auth }, { data: tramos }, { data: modulos }, { data: config }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('tarifa_tramos').select('id, etiqueta').order('id'),
    supabase.from('modulos').select('clave, nombre, estado, siempre_activo').order('orden'),
    supabase.from('configuracion_plataforma').select('dias_prueba').maybeSingle(),
  ])
  if (auth.user) redirect('/')

  return (
    <main className="min-h-screen bg-fondo px-4 py-10">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" aria-label="Colectia, ir a la página de inicio">
            <Marca tamano="grande" />
          </Link>
          <h1 className={ui.titulo}>Registra tu colegio</h1>
          <p className={ui.textoSecundario}>
            Pruébalo gratis {config?.dias_prueba ?? 7} días desde que aprobemos la dirección de tu colegio.
          </p>
        </div>
        <FormularioRegistro
          tramos={tramos ?? []}
          modulos={(modulos ?? []).filter((m) => !m.siempre_activo)}
        />
      </div>
    </main>
  )
}
