import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { nombrePersona } from '@/lib/formato'

export type SesionInstitucion = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  correo: string
  nombre: string
  persona: { nombres: string | null; apellidos: string | null; telefono: string | null } | null
  membresiaId: string
  institucionId: string
  rol: 'admin_institucion' | 'recaudador'
  esAdmin: boolean
  institucion: {
    nombre: string
    estado: string
    paleta: string | null
    fondo: string | null
  }
}

// Sin sesión manda a /login; sin membresía de personal devuelve null. cache() evita repetir la
// consulta en la misma visita. Si la persona es personal de varias instituciones, usa la más antigua.
export const obtenerSesionInstitucion = cache(async (): Promise<SesionInstitucion | null> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: membresias }, { data: persona }] = await Promise.all([
    supabase
      .from('membresias')
      .select('id, institucion_id, rol, instituciones(nombre, estado, paleta, fondo)')
      .eq('persona_id', user.id)
      .in('rol', ['admin_institucion', 'recaudador'])
      .order('created_at', { ascending: true }),
    supabase.from('personas').select('nombres, apellidos, correo, telefono').eq('id', user.id).maybeSingle(),
  ])

  // La consulta ya filtra por esos dos roles.
  const todas = (membresias ?? []).map((x) => ({ ...x, rol: x.rol as 'admin_institucion' | 'recaudador' }))
  // En la institución más antigua, el rol de administrador gana si la persona tiene los dos.
  const m =
    todas.find((x) => x.institucion_id === todas[0]?.institucion_id && x.rol === 'admin_institucion') ??
    todas[0]

  if (!m?.institucion_id) return null

  return {
    supabase,
    userId: user.id,
    correo: user.email ?? '',
    nombre: nombrePersona(persona, user.email ?? ''),
    persona,
    membresiaId: m.id,
    institucionId: m.institucion_id,
    rol: m.rol,
    esAdmin: m.rol === 'admin_institucion',
    institucion: {
      nombre: m.instituciones?.nombre ?? 'Tu institución',
      estado: m.instituciones?.estado ?? '',
      paleta: m.instituciones?.paleta ?? null,
      fondo: m.instituciones?.fondo ?? null,
    },
  }
})

// Para las acciones del personal: la institución sale de la sesión, nunca del formulario.
export async function requerirPersonal({
  soloAdmin = false,
  // Toda acción del personal cambia datos; con la institución suspendida o cancelada solo se consulta.
  institucionActiva = true,
}: { soloAdmin?: boolean; institucionActiva?: boolean } = {}): Promise<SesionInstitucion> {
  const sesion = await obtenerSesionInstitucion()
  if (!sesion) {
    throw new Error('Tu cuenta no es parte del personal de ninguna institución.')
  }
  if (soloAdmin && !sesion.esAdmin) {
    throw new Error('Solo el administrador de la institución puede hacer esto.')
  }
  if (institucionActiva && sesion.institucion.estado !== 'activa') {
    throw new Error('Tu institución no está activa, así que no puedes hacer cambios.')
  }
  return sesion
}

// Confirma que el evento es de la institución de la sesión antes de tocar sus productos o grupos.
export async function exigirEventoPropio(sesion: SesionInstitucion, eventoId: string) {
  const { data } = await sesion.supabase
    .from('eventos')
    .select('id')
    .eq('id', eventoId)
    .eq('institucion_id', sesion.institucionId)
    .maybeSingle()
  if (!data) {
    throw new Error('Ese evento ya no existe o no es de tu institución.')
  }
}
