import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PaginaInicio from '@/components/PaginaInicio'

export const metadata = {
  title: { absolute: 'Colectia · Pagos escolares claros para familias y colegios' },
  description:
    'Colectia organiza el recaudo de las actividades escolares: el colegio sabe quién ya pagó y las familias ven sus actividades y pagos.',
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
