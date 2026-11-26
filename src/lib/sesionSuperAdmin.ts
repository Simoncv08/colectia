import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { estadoDosPasos } from '@/lib/dosPasos'
import { nombrePersona } from '@/lib/formato'

// getUser valida la sesión con Supabase y trae los factores al día. Sin sesión manda a /login.
const obtenerUsuario = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }
  return { supabase, user }
})

// El nivel (aal) sale del mismo token que getUser acaba de validar.
export const obtenerAccesoSuperAdmin = cache(async () => {
  const { supabase, user } = await obtenerUsuario()
  const [{ data: membresia }, { data: nivel }] = await Promise.all([
    supabase.from('membresias').select('id').eq('persona_id', user.id).eq('rol', 'super_admin').maybeSingle(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ])

  return {
    supabase,
    user,
    esSuperAdmin: Boolean(membresia),
    dosPasos: estadoDosPasos(user.factors, nivel?.currentLevel ?? null),
  }
})

// Si la persona no es super administradora devuelve null; si le falta el segundo paso, la manda
// a /verificacion (fuera del layout de /admin, para no dar vueltas).
export const obtenerSesionSuperAdmin = cache(async () => {
  const { supabase, user } = await obtenerUsuario()
  const [{ esSuperAdmin, dosPasos }, { data: persona }] = await Promise.all([
    obtenerAccesoSuperAdmin(),
    supabase.from('personas').select('nombres, apellidos, correo, telefono').eq('id', user.id).maybeSingle(),
  ])

  if (!esSuperAdmin) return null
  if (dosPasos.paso !== 'listo') redirect('/verificacion')

  return {
    supabase,
    userId: user.id,
    correo: user.email ?? '',
    nombre: nombrePersona(persona, user.email ?? ''),
    persona,
  }
})

// Para las acciones del panel, dentro de accion(): la base igual lo exige, esto da el mensaje claro.
export async function requerirSuperAdmin() {
  const { supabase, esSuperAdmin, dosPasos } = await obtenerAccesoSuperAdmin()
  if (!esSuperAdmin) throw new Error('Solo el administrador de la plataforma puede hacer esto.')
  if (dosPasos.paso !== 'listo') {
    throw new Error('Por seguridad, confirma tu verificación en dos pasos. Recarga la página para escribir el código.')
  }
  return { supabase, factor: dosPasos.factor }
}
