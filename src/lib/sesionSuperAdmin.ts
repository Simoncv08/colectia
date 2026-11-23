import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { nombrePersona } from '@/lib/formato'

// Sin sesión manda a /login; si la persona no es super administradora devuelve null.
export const obtenerSesionSuperAdmin = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: membresia }, { data: persona }] = await Promise.all([
    supabase.from('membresias').select('id').eq('persona_id', user.id).eq('rol', 'super_admin').maybeSingle(),
    supabase.from('personas').select('nombres, apellidos, correo, telefono').eq('id', user.id).maybeSingle(),
  ])

  if (!membresia) return null

  return {
    supabase,
    userId: user.id,
    correo: user.email ?? '',
    nombre: nombrePersona(persona, user.email ?? ''),
    persona,
  }
})
