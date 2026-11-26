'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DESTINOS_ENLACE, esTipoEnlace, esTokenValido } from '@/lib/enlacesCorreo'

// Se llama solo cuando la persona toca el botón. Los escáneres de correo abren la página
// pero no envían el formulario, así el enlace no se gasta antes de tiempo.
export async function confirmarEnlace(formData: FormData) {
  const tokenHash = String(formData.get('token_hash') ?? '')
  const tipo = String(formData.get('type') ?? '')
  if (!esTokenValido(tokenHash) || !esTipoEnlace(tipo)) {
    redirect('/auth/auth-code-error')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
  if (error) {
    redirect('/auth/auth-code-error')
  }
  redirect(DESTINOS_ENLACE[tipo] ?? '/')
}
