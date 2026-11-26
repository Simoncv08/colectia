import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import PaginaInicio from '@/components/PaginaInicio'
import { DESCRIPCION_SITIO, OPEN_GRAPH_BASE, TITULO_SITIO } from '@/lib/sitio'

export const metadata: Metadata = {
  title: { absolute: TITULO_SITIO },
  description: DESCRIPCION_SITIO,
  alternates: { canonical: '/' },
  openGraph: { ...OPEN_GRAPH_BASE, url: '/', title: TITULO_SITIO, description: DESCRIPCION_SITIO },
}

// Sin sesión: la página de inicio pública. Con sesión: el panel de cada rol. Si alguien es
// personal y super_admin a la vez, entra al panel de institución.
export default async function Inicio() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <PaginaInicio />
  }

  const { data: membresias } = await supabase
    .from('membresias')
    .select('rol')
    .eq('persona_id', user.id)

  const roles = new Set((membresias ?? []).map((m) => m.rol))

  if (roles.has('admin_institucion') || roles.has('recaudador')) {
    redirect('/institucion')
  }
  if (roles.has('super_admin')) {
    redirect('/admin/instituciones')
  }
  redirect('/acudiente')
}
