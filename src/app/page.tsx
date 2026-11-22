import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Si alguien es personal y super_admin a la vez, entra al panel de institución.
export default async function Inicio() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
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
