import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PaginaInicio from '@/components/PaginaInicio'
import { DESCRIPCION_SITIO, OPEN_GRAPH_BASE, SIN_INDEXAR, TITULO_SITIO } from '@/lib/sitio'
import { asegurarCuentaDelColegio, irAMiZona, zonaActual } from '@/lib/zonaServidor'

// La entrada de un colegio no se indexa: cada colegio difunde su propia dirección.
export async function generateMetadata(): Promise<Metadata> {
  const { tipo, colegio } = await zonaActual()
  if (colegio) return { title: { absolute: `${colegio.nombre} · Colectia` }, robots: SIN_INDEXAR }
  if (tipo === 'admin') return { title: { absolute: 'Administración · Colectia' }, robots: SIN_INDEXAR }
  return {
    title: { absolute: TITULO_SITIO },
    description: DESCRIPCION_SITIO,
    alternates: { canonical: '/' },
    openGraph: { ...OPEN_GRAPH_BASE, url: '/', title: TITULO_SITIO, description: DESCRIPCION_SITIO },
  }
}

// www: la página para colegios; con sesión, cada cuenta va a su colegio (o el super admin a
// admin.colectia.co). Dirección de un colegio: sin sesión, a entrar; con sesión, el personal a
// /admin y las familias a /inicio.
export default async function Inicio() {
  const { tipo, colegio } = await zonaActual()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (tipo === 'admin') {
    redirect(user ? '/inicio' : '/login')
  }

  if (!colegio) {
    if (!user) {
      const { data: config } = await supabase
        .from('configuracion_plataforma')
        .select('dias_prueba, precios_publicados')
        .maybeSingle()
      return <PaginaInicio diasPrueba={config?.dias_prueba ?? 7} preciosPublicados={Boolean(config?.precios_publicados)} />
    }
    return irAMiZona(supabase, user.id)
  }

  if (!user) redirect('/login')

  await asegurarCuentaDelColegio(supabase, user.id, colegio)
  const { data: personal } = await supabase
    .from('membresias')
    .select('id')
    .eq('persona_id', user.id)
    .eq('institucion_id', colegio.id)
    .in('rol', ['admin_institucion', 'recaudador'])
    .limit(1)

  redirect(personal?.length ? '/admin' : '/inicio')
}
