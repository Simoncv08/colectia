import type { createClient } from '@/lib/supabase/server'
import { mensajeBD } from '@/lib/resultado'

type Supabase = Awaited<ReturnType<typeof createClient>>

export const ROLES_PERSONAL = { admin_institucion: 'administrador', recaudador: 'recaudador' } as const
export type RolPersonal = keyof typeof ROLES_PERSONAL

export function esRolPersonal(rol: string): rol is RolPersonal {
  return Object.keys(ROLES_PERSONAL).includes(rol)
}

// Lo usan el panel Personal de cada institución y el panel de super admin. Solo sirve para quien
// ya entró una vez a Colectia con su correo confirmado. Si ya tenía otro rol ahí, se le cambia.
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
  if (errorBusqueda) throw new Error(errorBusqueda.message)
  if (!personaId) {
    throw new Error(
      'Esa persona todavía no tiene cuenta en Colectia, o no ha confirmado su correo. Pídele que entre una vez y vuelve a intentar.'
    )
  }

  const { data: actuales } = await supabase
    .from('membresias')
    .select('id, rol')
    .eq('persona_id', personaId)
    .eq('institucion_id', institucionId)
    .in('rol', Object.keys(ROLES_PERSONAL))
  if (actuales?.some((m) => m.rol === rol)) {
    throw new Error('Esa persona ya tiene ese rol en la institución.')
  }

  const { error } = await supabase
    .from('membresias')
    .insert({ persona_id: personaId, institucion_id: institucionId, rol })
  if (error) throw new Error(mensajeBD(error))

  // El rol nuevo se crea antes de quitar el anterior, para no dejarla sin acceso. Si el rol
  // anterior ya recibió pagos, la base de datos no deja borrarlo y se conserva.
  for (const anterior of actuales ?? []) {
    await supabase.from('membresias').delete().eq('id', anterior.id)
  }

  const nombreRol = ROLES_PERSONAL[rol]
  return actuales?.length ? `Ahora ${correo} es ${nombreRol}.` : `${correo} quedó como ${nombreRol}.`
}
