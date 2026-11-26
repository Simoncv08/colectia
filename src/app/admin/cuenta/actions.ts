'use server'

import { redirect } from 'next/navigation'
import { accion } from '@/lib/resultado'
import { requerirSuperAdmin } from '@/lib/sesionSuperAdmin'

// Supabase solo deja quitar un factor verificado con la sesión en aal2. Sin factor, /verificacion
// muestra un QR nuevo y el panel queda cerrado hasta escanearlo.
export async function cambiarAppDosPasos() {
  return accion(async () => {
    const { supabase, factor } = await requerirSuperAdmin()
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    if (error) throw new Error('No se pudo quitar la app actual. Intenta de nuevo en un momento.')
    redirect('/verificacion')
  })
}
