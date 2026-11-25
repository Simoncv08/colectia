import type { createClient } from '@/lib/supabase/server'
import { mensajeBD } from '@/lib/resultado'

type Supabase = Awaited<ReturnType<typeof createClient>>

export const ROLES_PERSONAL = { admin_institucion: 'administrador', recaudador: 'recaudador' } as const
export type RolPersonal = keyof typeof ROLES_PERSONAL

// Invitación pendiente: no da permisos hasta que la persona la acepta (24_seguridad_fase3.sql).
export const ROL_INVITACION = { admin_institucion: 'invitado_admin', recaudador: 'invitado_recaudador' } as const
export const ROLES_INVITACION: string[] = Object.values(ROL_INVITACION)

export function esRolPersonal(rol: string): rol is RolPersonal {
  return Object.keys(ROLES_PERSONAL).includes(rol)
}

// Rol al que lleva una invitación ('invitado_admin' → 'admin_institucion'), o null.
export function rolDeInvitacion(rol: string): RolPersonal | null {
  if (rol === ROL_INVITACION.admin_institucion) return 'admin_institucion'
  if (rol === ROL_INVITACION.recaudador) return 'recaudador'
  return null
}

// Lo usan el panel Personal de cada institución y el panel de super admin. Solo sirve para quien
// ya entró una vez a Colectia con su correo confirmado.
// - Si no está en la institución (o ya salió de ella), queda una invitación que la persona acepta.
// - Si ya está en el personal con otro rol, se le cambia el rol en la misma fila (así los
//   eventos y pagos que registró siguen a su nombre).
export async function darRolEnInstitucion(
  supabase: Supabase,
  institucionId: string,
  correoEscrito: string,
  rol: RolPersonal
) {
  const correo = correoEscrito.trim().toLowerCase()
  if (!correo) throw new Error('El correo es obligatorio.')

  const { data: personaId, error: errorBusqueda } = await supabase.rpc('buscar_persona_id_por_correo', {
    p_correo: correo,
  })
  if (errorBusqueda) throw new Error(mensajeBD(errorBusqueda))
  if (!personaId) {
    throw new Error(
      'Esa persona todavía no tiene cuenta en Colectia, o no ha confirmado su correo. Pídele que entre una vez y vuelve a intentar.'
    )
  }

  const { data: actual, error: errorActual } = await supabase
    .from('membresias')
    .select('id, rol')
    .eq('persona_id', personaId)
    .eq('institucion_id', institucionId)
    .neq('rol', 'super_admin')
    .maybeSingle()
  if (errorActual) throw new Error(mensajeBD(errorActual))

  const nombreRol = ROLES_PERSONAL[rol]
  const textoInvitacion = `Se invitó a ${correo} como ${nombreRol}. Avísale que entre a Colectia para aceptar la invitación.`

  if (!actual) {
    const { error } = await supabase.from('membresias').insert({
      persona_id: personaId,
      institucion_id: institucionId,
      rol: ROL_INVITACION[rol],
      correo_invitacion: correo,
    })
    if (error) throw new Error(mensajeBD(error, { duplicado: 'Esa persona ya tiene una invitación o un rol aquí.' }))
    return textoInvitacion
  }

  if (actual.rol === rol) {
    throw new Error('Esa persona ya tiene ese rol en la institución.')
  }

  const yaEstaEnElPersonal = esRolPersonal(actual.rol)
  const { data: cambiadas, error } = await supabase
    .from('membresias')
    .update(yaEstaEnElPersonal ? { rol } : { rol: ROL_INVITACION[rol], correo_invitacion: correo })
    .eq('id', actual.id)
    .select('id')
  if (error) throw new Error(mensajeBD(error))
  if (!cambiadas?.length) throw new Error('No se pudo cambiar el rol de esa persona.')

  return yaEstaEnElPersonal ? `Ahora ${correo} es ${nombreRol}.` : textoInvitacion
}
